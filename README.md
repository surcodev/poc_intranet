# POC — Registro de Personas

Next.js + Go (Gin) + PostgreSQL

## Estructura

```
intranet_test/
├── backend/    → API REST en Go + Gin
└── frontend/   → Formulario en Next.js + Tailwind
```

## Base de datos

| Parámetro | Valor |
|-----------|-------|
| Host | 162.0.227.164 |
| Puerto | 5500 |
| DB | 02032026 |
| Usuario | usr_desarrollo |
| Schema | intranet |
| Tabla | intranet.personas |

La tabla se crea automáticamente al arrancar el backend.

## Arrancar

**Terminal 1 — backend (puerto 9090):**
```powershell
cd backend
go run .
```

**Terminal 2 — frontend (puerto 3000):**
```powershell
cd frontend
npm run dev
```

Abrir: http://localhost:3000

---

## Rate Limiting

### Qué es
Límite de peticiones por IP para proteger la API y la base de datos de sobrecargas o ataques.

### Algoritmo: Token Bucket
Cada IP tiene un cubo de tokens:
- **Burst (ráfaga):** 20 tokens al inicio
- **Recarga:** 10 tokens por segundo
- Cada request consume 1 token
- Sin tokens disponibles → respuesta `429 Too Many Requests`

```
IP normal:   ██████████  (10 req/s sostenido) → siempre pasa
IP atacante: ████████████████████ burst → vacío → 429 → 429 → 429
```

### Dónde se configura
`backend/main.go`, función `getLimiter`:
```go
rate.NewLimiter(10, 20)
//              ↑    ↑
//         req/seg  burst
```

Para ajustar capacidad cambia esos dos números.

### Por qué es necesario con 20k usuarios simultáneos
| Escenario | Sin rate limit | Con rate limit |
|-----------|---------------|----------------|
| 20k usuarios distintos | OK (cada uno < 10 req/s) | OK igual |
| 1 bot mandando 20k req/s | DB colapsa | 429 desde request 21 |
| DDoS desde pocas IPs | Servidor caído | Bloqueado por IP |

### Cleanup automático
Goroutine en background limpia del mapa las IPs que lleven más de 10 minutos inactivas, evitando memory leak en producción con millones de IPs únicas.

---

## Campos del formulario

| Campo | Tipo | Validación |
|-------|------|-----------|
| Nombre | texto | requerido |
| Apellidos | texto | requerido |
| DNI | texto | requerido, único en DB |
| Profesión | selector | requerido |
| Email | email | requerido |
| Teléfono | tel | requerido |

## Endpoints API

| Método | Ruta | Descripción |
|--------|------|-------------|
| POST | /api/personas | Crear persona |
| GET | /api/personas | Listar todas |

### Ejemplo POST
```bash
curl -X POST http://localhost:9090/api/personas \
  -H "Content-Type: application/json" \
  -d '{"nombre":"Ana","apellidos":"Torres","dni":"12345678","profesion":"Docente","email":"ana@test.com","telefono":"600111222"}'
```

### Respuesta 429 (rate limit)
```json
{ "error": "demasiadas peticiones, intente más tarde" }
```

---

## Para producción (20k simultáneos)

1. **Rate limiting** — ya implementado (Token Bucket por IP)
2. **Pool de conexiones DB** — agregar en `connectDB()`:
   ```go
   conn.SetMaxOpenConns(25)
   conn.SetMaxIdleConns(10)
   conn.SetConnMaxLifetime(5 * time.Minute)
   ```
3. **PgBouncer** — proxy entre Go y PostgreSQL, mantiene 20-50 conexiones reales contra PostgreSQL mientras acepta miles desde la app:
   ```
   [Go x20k] → [PgBouncer :5432] → [PostgreSQL :5500]
                pool_mode=transaction
                max_client_conn=25000
                default_pool_size=50
   ```
   Arrancar con Docker:
   ```bash
   docker run -d --name pgbouncer \
     -e POSTGRESQL_HOST=162.0.227.164 \
     -e POSTGRESQL_PORT=5500 \
     -e POSTGRESQL_DATABASE=02032026 \
     -e POSTGRESQL_USERNAME=usr_desarrollo \
     -e POSTGRESQL_PASSWORD=Saco1357$ \
     -e PGBOUNCER_POOL_MODE=transaction \
     -e PGBOUNCER_MAX_CLIENT_CONN=25000 \
     -e PGBOUNCER_DEFAULT_POOL_SIZE=50 \
     -p 5432:5432 \
     bitnami/pgbouncer:latest
   ```
   Luego cambiar `POSTGRESQL_DB_PORT=5432` en el backend para apuntar a PgBouncer.
