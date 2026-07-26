import Link from 'next/link'

export default function Home() {
  return (
    <div className="min-h-screen bg-[#020617] text-white flex flex-col justify-center items-center p-6">
      <div className="max-w-md w-full bg-[#0f172a] p-8 rounded-3xl border border-slate-800 text-center shadow-2xl">
        <div className="bg-white p-3 rounded-2xl inline-block mb-6">
          <img src="/logo negro.png" alt="Logo SITE" className="h-16 object-contain" onError={(e) => e.currentTarget.style.display = 'none'} />
        </div>
        <h1 className="text-3xl font-black text-[#fbbf24] mb-2">SITE - Sistema</h1>
        <p className="text-slate-400 text-sm mb-8">Sistema de Transporte Escolar Activo 🚌</p>

        <div className="space-y-4">
          <Link 
            href="/caja" 
            className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-4 px-6 rounded-2xl transition-all shadow-lg flex items-center justify-between group"
          >
            <span className="text-lg">🚌 Ir al Módulo de Caja</span>
            <span className="group-hover:translate-x-1 transition-transform">➔</span>
          </Link>
        </div>
      </div>

      <div className="mt-12 text-slate-600 text-xs">
        System by <span className="font-bold text-slate-500">Arturo Díaz</span>
      </div>
    </div>
  )
}
