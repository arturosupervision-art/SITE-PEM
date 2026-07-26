'use client';

import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase'; // CORRECCIÓN PARA VERCEL: Un solo nivel atrás

export default function CajaPrincipal() {
  const [busqueda, setBusqueda] = useState('');
  const [alumnos, setAlumnos] = useState<any[]>([]);
  const [cargando, setCargando] = useState(false);
  
  // Estado para manejar la cantidad manual por alumno (ID -> Cantidad)
  const [cantidades, setCantidades] = useState<{ [key: string]: number }>({});

  const tarifaBoletaje = 20;

  // Función para buscar alumnos (simulando los "primeros 15" o por búsqueda)
  const buscarAlumnos = async (termino: string) => {
    setCargando(true);
    let query = supabase.from('alumnos').select('*').limit(15);
    
    if (termino) {
      query = query.or(`nombre_completo.ilike.%${termino}%,matricula.ilike.%${termino}%`);
    }
    
    const { data } = await query;
    if (data) {
      setAlumnos(data);
      // Inicializar cantidades manuales en 1
      const instCantidades: { [key: string]: number } = {};
      data.forEach(a => instCantidades[a.id] = 1);
      setCantidades(instCantidades);
    }
    setCargando(false);
  };

  useEffect(() => {
    buscarAlumnos('');
  }, []);

  const handleCobrar = async (alumno: any, cantidadBoletos: number) => {
    const montoTotal = cantidadBoletos * tarifaBoletaje;
    const nuevosBoletos = (alumno.boletos_disponibles || 0) + cantidadBoletos;

    // 1. Actualizar saldo del alumno
    const { error: errorAlumno } = await supabase.from('alumnos')
      .update({ boletos_disponibles: nuevosBoletos })
      .eq('id', alumno.id);

    // 2. Registrar la venta en caja
    const { error: errorCaja } = await supabase.from('movimientos_caja').insert([{
      tipo: 'venta',
      monto: montoTotal,
      concepto: `Venta ${cantidadBoletos} boletos - Matrícula: ${alumno.matricula}`
    }]);

    if (!errorAlumno && !errorCaja) {
      alert(`✅ Venta de $${montoTotal} registrada con éxito.`);
      buscarAlumnos(busqueda); // Refrescar lista
    } else {
      alert('❌ Error al procesar la venta.');
    }
  };

  return (
    <div className="min-h-screen bg-[#020617] p-4 font-sans flex justify-center">
      <div className="w-full max-w-3xl">
        
        {/* HEADER */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4 bg-white/5 p-3 rounded-2xl border border-slate-800">
            {/* Logo Placeholder (Puedes cambiar el src por tu logo real) */}
            <div className="bg-white p-1.5 rounded-lg">
              <img src="/logo.png" alt="Logo" className="h-10 w-auto object-contain" onError={(e) => e.currentTarget.style.display = 'none'} />
            </div>
            <div>
              <h1 className="text-[#fbbf24] font-black text-2xl tracking-wide">SITE - PEM</h1>
              <p className="text-emerald-400 text-sm font-bold flex items-center gap-1">
                ✅ Caja Abierta
              </p>
            </div>
          </div>
        </div>

        {/* BOTONES SUPERIORES */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <button className="bg-[#6366f1] hover:bg-indigo-500 text-white font-bold py-4 px-2 rounded-2xl shadow-lg transition-colors flex flex-col items-center justify-center gap-1 border border-indigo-500/50">
            <span className="text-2xl">📜</span>
            <span className="tracking-wide">Historial</span>
          </button>
          
          <button className="bg-[#f59e0b] hover:bg-amber-400 text-white font-bold py-4 px-2 rounded-2xl shadow-lg transition-colors flex flex-col items-center justify-center gap-1 border border-amber-500/50">
            <span className="text-2xl">💸</span>
            <span className="tracking-wide text-center leading-tight">Retirar<br/>Efectivo</span>
          </button>
          
          <button className="bg-[#ef4444] hover:bg-red-400 text-white font-bold py-4 px-2 rounded-2xl shadow-lg transition-colors flex flex-col items-center justify-center gap-1 border border-red-500/50">
            <span className="text-2xl">🔒</span>
            <span className="tracking-wide text-center leading-tight">Cerrar<br/>Caja</span>
          </button>
        </div>

        {/* BUSCADOR Y TARIFA */}
        <div className="bg-[#0f172a] p-6 rounded-3xl mb-6 shadow-xl border border-slate-800">
          <div className="relative mb-6">
            <span className="absolute left-4 top-3.5 text-slate-400 text-lg">🔍</span>
            <input 
              type="text" 
              value={busqueda}
              onChange={(e) => {
                setBusqueda(e.target.value);
                buscarAlumnos(e.target.value);
              }}
              placeholder="Buscar por nombre o matrícula..." 
              className="w-full bg-[#020617] text-slate-200 rounded-xl py-4 pl-12 pr-4 border border-slate-800 outline-none focus:border-indigo-500 transition-colors shadow-inner" 
            />
          </div>
          <div className="flex justify-center items-center gap-4 text-slate-400 font-medium">
            <span>Tarifa Boletaje:</span>
            <span className="bg-[#020617] px-8 py-2 rounded-xl border border-slate-800 font-black text-[#fbbf24] text-lg shadow-inner">
              {tarifaBoletaje}
            </span>
          </div>
        </div>

        {/* LISTA DE ALUMNOS */}
        <div className="bg-[#0f172a] p-6 rounded-3xl shadow-xl border border-slate-800">
          <h2 className="text-white font-bold text-lg mb-6">Alumnos (Mostrando primeros 15)</h2>
          
          {cargando ? (
            <p className="text-slate-400 text-center py-8">Cargando alumnos...</p>
          ) : alumnos.length === 0 ? (
            <p className="text-slate-500 text-center py-8">No se encontraron alumnos.</p>
          ) : (
            alumnos.map((alumno) => (
              <div key={alumno.id} className="bg-[#020617] rounded-2xl p-6 border border-slate-800 mb-4 shadow-sm hover:border-slate-700 transition-colors">
                
                {/* Info Alumno */}
                <h3 className="text-white font-bold text-xl uppercase mb-2 tracking-wide">{alumno.nombre_completo || 'CARLOS SÁNCHEZ RUIZ'}</h3>
                <div className="flex items-center gap-4 mb-5">
                  <span className="text-slate-400 text-sm font-medium">Matrícula: {alumno.matricula || 'MAT-003'}</span>
                  <button className="bg-[#1e293b] text-slate-300 text-xs px-4 py-1.5 rounded-full border border-slate-700 hover:bg-slate-700 transition-colors font-medium">
                    Vincular QR Alumno
                  </button>
                </div>
                
                {/* Saldo */}
                <div className="bg-emerald-950/40 text-emerald-400 w-fit px-4 py-2 rounded-xl text-sm font-bold border border-emerald-900/50 mb-5 flex items-center gap-2">
                  <span className="text-base">🎟️</span> Saldo: {alumno.boletos_disponibles || 0} Boletos
                </div>
                
                {/* Botones de Venta */}
                <div className="flex items-center gap-3 flex-wrap bg-[#0f172a] p-2 rounded-xl border border-slate-800/50">
                  <button onClick={() => handleCobrar(alumno, 1)} className="bg-[#1e293b] text-slate-200 px-5 py-2.5 rounded-lg border border-slate-700 hover:bg-slate-700 hover:text-white transition-all font-medium whitespace-nowrap">
                    1 Boleto (${tarifaBoletaje})
                  </button>
                  <button onClick={() => handleCobrar(alumno, 5)} className="bg-[#1e293b] text-slate-200 px-5 py-2.5 rounded-lg border border-slate-700 hover:bg-slate-700 hover:text-white transition-all font-medium flex items-center gap-2 whitespace-nowrap">
                    <span>📦</span> 5 pz
                  </button>
                  
                  <div className="flex-1 flex justify-end gap-3 min-w-[200px]">
                    <input 
                      type="number" 
                      min="1"
                      value={cantidades[alumno.id] || 1}
                      onChange={(e) => setCantidades({...cantidades, [alumno.id]: Number(e.target.value)})}
                      className="w-20 bg-[#1e293b] border border-slate-700 rounded-lg text-center text-white font-bold outline-none focus:border-emerald-500 transition-colors" 
                    />
                    <button 
                      onClick={() => handleCobrar(alumno, cantidades[alumno.id] || 1)}
                      className="bg-[#10b981] hover:bg-emerald-500 text-white font-bold px-6 py-2.5 rounded-lg transition-colors shadow-lg shadow-emerald-900/20 whitespace-nowrap"
                    >
                      Cobrar ${(cantidades[alumno.id] || 1) * tarifaBoletaje}
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
