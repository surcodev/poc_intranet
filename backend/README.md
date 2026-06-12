# Backend — Registro de Personas

Go + Gin + MongoDB

## Requisitos

- Go 1.21+
- MongoDB corriendo en `localhost:27017` (sin autenticación por defecto)

## Arrancar

```powershell
go run .
```

Escucha en: http://localhost:9090

## Base de datos

| Parámetro | Valor |
|-----------|-------|
| Host | localhost |
| Puerto | 27017 |
| DB | intranet |
| Colección | personas |
| Auth | ninguna (instalación local) |

La colección `intranet.personas` y el índice único en `dni` se crean automáticamente al arrancar.

## Archivos Go

| Archivo | Descripción |
|---------|-------------|
| `main.go` | Arranque, servidor, rutas, CORS |
| `models.go` | Struct `Persona` |
| `db.go` | Conexión MongoDB + init colección e índices |
| `handlers.go` | Handlers HTTP: `createPersona`, `listPersonas` |
| `middleware.go` | Rate limiting Token Bucket por IP |
| `go.mod` | Módulo y dependencias directas (como `package.json`) |
| `go.sum` | Checksums SHA-256 de cada dependencia — garantiza integridad, no editar manualmente |

## Endpoints

| Método | Ruta | Descripción |
|--------|------|-------------|
| POST | /api/personas | Crear persona |
| GET | /api/personas | Listar todas |

### POST /api/personas

```bash
curl -X POST http://localhost:9090/api/personas \
  -H "Content-Type: application/json" \
  -d '{"nombre":"Ana","apellidos":"Torres","dni":"12345678","profesion":"Docente","email":"ana@test.com","telefono":"600111222"}'
```

Respuesta `201`:
```json
{"id":"6a29cead1eedbf7d475e681b","nombre":"Ana","apellidos":"Torres","dni":"12345678","profesion":"Docente","email":"ana@test.com","telefono":"600111222"}
```

> El `id` es un **ObjectID** de 12 bytes (no un número entero):
> - 4 bytes: timestamp Unix → permite ordenar por fecha de creación
> - 5 bytes: valor aleatorio (máquina + proceso) → unicidad entre servidores
> - 3 bytes: contador incremental → unicidad dentro del mismo segundo

DNI duplicado → `409 Conflict`:
```json
{"error":"DNI ya registrado"}
```

### GET /api/personas

```bash
curl http://localhost:9090/api/personas
```

## Rate Limiting

Algoritmo **Token Bucket por IP** implementado en `middleware.go`.

| Parámetro | Valor |
|-----------|-------|
| Velocidad sostenida | 10 req/seg por IP |
| Burst (ráfaga inicial) | 20 requests |
| Respuesta al superar límite | `429 Too Many Requests` |

```json
{"error":"demasiadas peticiones, intente más tarde"}
```

**Cómo funciona:**
- Cada IP tiene un cubo con 20 tokens
- Se recarga 10 tokens/segundo
- Cada request consume 1 token
- IP normal (usuario real): nunca supera el límite
- Bot/ataque: bloqueado desde el request 21

**Sin rate limit:**
- 20k requests del mismo IP en 1 segundo → DB colapsa
- Fuerza bruta al DNI sin freno
- Servidor caído por avalancha de peticiones

**Ajustar límites** en `middleware.go`, función `getLimiter`:
```go
rate.NewLimiter(10, 20)
//              ↑    ↑
//         req/seg  burst
```

**Cleanup:** goroutine en background elimina IPs inactivas (+10 min) del mapa cada 5 minutos para evitar memory leak.

## Concurrencia para 20k simultáneos

### Fix 1 — Pool de conexiones MongoDB (`db.go`)

**Qué es un pool:** grupo de conexiones TCP preabiertas y reutilizables. Sin pool, cada request abre y cierra una conexión (~5-50ms extra). Con pool, las conexiones se reutilizan — abrir/cerrar ocurre solo al inicio.

```
Sin pool:  request → abrir conexión → operar → cerrar conexión  (lento)
Con pool:  request → tomar del pool → operar → devolver al pool  (rápido)
```

Si llegan más requests que conexiones disponibles → se encolan y esperan, no fallan.

Por defecto el driver MongoDB tiene `MaxPoolSize=100`. Con 20k requests simultáneos la cola crece y genera timeouts.

```go
options.Client().
    SetMaxPoolSize(200).               // máximo conexiones abiertas simultáneas
    SetMinPoolSize(10).                // conexiones siempre listas aunque no haya tráfico
    SetMaxConnIdleTime(5 * time.Minute) // cierra conexiones inactivas > 5 min
```

| Parámetro | Default driver | Configurado | Por qué |
|-----------|---------------|-------------|---------|
| MaxPoolSize | 100 | 200 | soporta más requests simultáneos |
| MinPoolSize | 0 | 10 | evita latencia al arrancar |
| MaxConnIdleTime | ninguno | 5 min | libera conexiones ociosas |

**Límite máximo recomendado:** `núcleos_CPU × 4` para operaciones de DB.
Más conexiones no siempre es más rápido — MongoDB gestiona el overhead de cada una.

| Servidor | CPU cores | Pool recomendado |
|----------|-----------|-----------------|
| VPS básico | 2 cores | 8–20 |
| Servidor medio | 8 cores | 32–64 |
| Servidor grande | 32 cores | 128–256 |

Con `MaxPoolSize=200` y cada insert tardando ~1-5ms → capacidad teórica de **40,000–200,000 inserts/seg**.

### Fix 2 — Timeout por operación (`handlers.go`)

Sin timeout, si MongoDB tarda o cuelga la goroutine queda bloqueada para siempre, acumulando memoria hasta colapsar el servidor.

```go
ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
defer cancel()
// si MongoDB no responde en 5s → error 500, goroutine liberada
```

Aplicado en `createPersona` y `listPersonas`.

### Capacidad resultante

| Escenario | Estado | Por qué |
|-----------|--------|---------|
| 20k usuarios distintos enviando 1 form cada uno (distribuidos en el tiempo) | ✅ Sí | Pool 200 + rate limit gestiona la cola sin problema |
| 20k inserts exactamente al mismo milisegundo | ⚠️ Parcialmente | 200 entran al pool, 19,800 esperan en cola — todos llegan pero con latencia alta |
| 20k inserts/segundo sostenido cada segundo | ❌ No | Límite de hardware de MongoDB local, no del código |
| Bot desde 1 IP a 20k req/s | ✅ Bloqueado | Rate limit corta en request 21 |
| MongoDB cuelga o tarda | ✅ Controlado | Timeout de 5s libera la goroutine y devuelve error 500 |

**Conclusión para formulario web:** 20k usuarios no envían el form al mismo milisegundo exacto — se distribuyen en minutos/horas. El backend aguanta sin problema en ese uso real.

**Cuello de botella real actual:** el hardware donde corre MongoDB. Un MongoDB local con 8GB RAM tiene un límite físico de escrituras por segundo que ningún ajuste de código puede superar. Para producción con carga sostenida alta → servidor dedicado o MongoDB Atlas.

## Variables de entorno

Todas tienen valor por defecto, son opcionales:

| Variable | Default |
|----------|---------|
| MONGODB_URI | mongodb://localhost:27017 |
| MONGODB_DB | intranet |

Ejemplo con URI personalizada:
```powershell
$env:MONGODB_URI = "mongodb://usuario:password@servidor:27017/intranet"
go run .
```
