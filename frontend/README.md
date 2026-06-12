# Frontend — Registro de Personas

Next.js 16 + TypeScript + Tailwind CSS

## Requisitos

- Node.js 18+
- Backend corriendo en `http://localhost:9090`

## Arrancar

```powershell
npm run dev
```

Abre: http://localhost:3000

## Estructura

```
src/
├── app/
│   ├── page.tsx          → página principal
│   ├── layout.tsx        → layout raíz
│   └── globals.css       → estilos globales
└── components/
    ├── PersonaForm.tsx   → formulario de registro
    └── PersonaTable.tsx  → tabla de personas registradas
```

## Componentes

### PersonaForm
Formulario con 6 campos:

| Campo | Tipo |
|-------|------|
| Nombre | text |
| Apellidos | text |
| DNI | text |
| Profesión | select (8 opciones) |
| Email | email |
| Teléfono | tel |

POST a `http://localhost:9090/api/personas` al enviar.
Dispara evento `persona-created` para refrescar la tabla automáticamente.

### PersonaTable
Lista todas las personas registradas.
GET a `http://localhost:9090/api/personas`.
Se actualiza al recibir el evento `persona-created` o al pulsar "Actualizar".

## Scripts

```powershell
npm run dev      # desarrollo con hot reload
npm run build    # build de producción
npm run start    # servidor de producción
npm run lint     # linter
```
