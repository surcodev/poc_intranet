'use client'

import { useState } from 'react'

const PROFESIONES = [
  'Médico',
  'Enfermero/a',
  'Ingeniero/a',
  'Abogado/a',
  'Docente',
  'Economista',
  'Contador/a',
  'Otro',
]

interface FormState {
  nombre: string
  apellidos: string
  dni: string
  profesion: string
  email: string
  telefono: string
}

const EMPTY: FormState = {
  nombre: '',
  apellidos: '',
  dni: '',
  profesion: '',
  email: '',
  telefono: '',
}

export default function PersonaForm() {
  const [form, setForm] = useState<FormState>(EMPTY)
  const [status, setStatus] = useState<'idle' | 'loading' | 'ok' | 'error'>('idle')
  const [errMsg, setErrMsg] = useState('')

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setStatus('loading')
    setErrMsg('')
    try {
      const res = await fetch('http://localhost:9090/api/personas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error ?? 'Error del servidor')
      }
      setForm(EMPTY)
      setStatus('ok')
      window.dispatchEvent(new Event('persona-created'))
    } catch (err: unknown) {
      setErrMsg(err instanceof Error ? err.message : 'Error desconocido')
      setStatus('error')
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-white rounded-2xl shadow p-8 space-y-6"
    >
      <h2 className="text-xl font-semibold text-gray-800">Nueva persona</h2>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field label="Nombre" name="nombre" value={form.nombre} onChange={handleChange} />
        <Field label="Apellidos" name="apellidos" value={form.apellidos} onChange={handleChange} />
        <Field label="DNI" name="dni" value={form.dni} onChange={handleChange} />

        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-gray-700">Profesión</label>
          <select
            name="profesion"
            value={form.profesion}
            onChange={handleChange}
            required
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm text-black focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Seleccionar...</option>
            {PROFESIONES.map((p) => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
        </div>

        <Field label="Email" name="email" type="email" value={form.email} onChange={handleChange} />
        <Field label="Teléfono" name="telefono" type="tel" value={form.telefono} onChange={handleChange} />
      </div>

      {status === 'ok' && (
        <p className="text-green-600 text-sm font-medium">Persona registrada correctamente.</p>
      )}
      {status === 'error' && (
        <p className="text-red-600 text-sm font-medium">Error: {errMsg}</p>
      )}

      <button
        type="submit"
        disabled={status === 'loading'}
        className="w-full sm:w-auto bg-blue-600 text-white px-6 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
      >
        {status === 'loading' ? 'Guardando...' : 'Registrar'}
      </button>
    </form>
  )
}

function Field({
  label,
  name,
  value,
  onChange,
  type = 'text',
}: {
  label: string
  name: string
  value: string
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void
  type?: string
}) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-sm font-medium text-gray-700">{label}</label>
      <input
        type={type}
        name={name}
        value={value}
        onChange={onChange}
        required
        className="border border-gray-300 rounded-lg px-3 py-2 text-sm text-black focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
    </div>
  )
}
