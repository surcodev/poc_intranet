'use client'

import { useEffect, useState, useCallback } from 'react'

interface Persona {
  id: number
  nombre: string
  apellidos: string
  dni: string
  profesion: string
  email: string
  telefono: string
}

export default function PersonaTable() {
  const [personas, setPersonas] = useState<Persona[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const fetchPersonas = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const res = await fetch('http://localhost:9090/api/personas')
      if (!res.ok) throw new Error('Error al cargar datos')
      const data = await res.json()
      setPersonas(data ?? [])
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error desconocido')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchPersonas()
    window.addEventListener('persona-created', fetchPersonas)
    return () => window.removeEventListener('persona-created', fetchPersonas)
  }, [fetchPersonas])

  return (
    <div className="bg-white rounded-2xl shadow p-8">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold text-gray-800">Personas registradas</h2>
        <button
          onClick={fetchPersonas}
          className="text-sm text-blue-600 hover:underline"
        >
          Actualizar
        </button>
      </div>

      {loading && <p className="text-gray-500 text-sm">Cargando...</p>}
      {error && <p className="text-red-600 text-sm">Error: {error}</p>}

      {!loading && !error && personas.length === 0 && (
        <p className="text-gray-400 text-sm">Sin registros aún.</p>
      )}

      {!loading && personas.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left border-collapse">
            <thead>
              <tr className="border-b text-gray-500 uppercase text-xs">
                <th className="py-2 pr-4">ID</th>
                <th className="py-2 pr-4">Nombre</th>
                <th className="py-2 pr-4">Apellidos</th>
                <th className="py-2 pr-4">DNI</th>
                <th className="py-2 pr-4">Profesión</th>
                <th className="py-2 pr-4">Email</th>
                <th className="py-2 pr-4">Teléfono</th>
              </tr>
            </thead>
            <tbody>
              {personas.map((p) => (
                <tr key={p.id} className="border-b hover:bg-gray-50">
                  <td className="py-2 pr-4 text-black">{p.id}</td>
                  <td className="py-2 pr-4 font-medium text-black">{p.nombre}</td>
                  <td className="py-2 pr-4 text-black">{p.apellidos}</td>
                  <td className="py-2 pr-4 text-black">{p.dni}</td>
                  <td className="py-2 pr-4 text-black">{p.profesion}</td>
                  <td className="py-2 pr-4 text-black">{p.email}</td>
                  <td className="py-2 pr-4 text-black">{p.telefono}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
