import PersonaForm from '@/components/PersonaForm'
import PersonaTable from '@/components/PersonaTable'

export default function Home() {
  return (
    <main className="min-h-screen bg-gray-50 py-10 px-4">
      <div className="max-w-3xl mx-auto space-y-10">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Registro de Personas</h1>
          <p className="text-gray-500 mt-1">POC — Next.js + Go + MongoDB</p>
        </div>
        <PersonaForm />
        <PersonaTable />
      </div>
    </main>
  )
}
