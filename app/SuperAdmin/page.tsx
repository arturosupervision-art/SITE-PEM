'use client'
import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'

export default function ModuloFinanzasSuperAdmin() {
  // ================= ESTADOS DEL DASHBOARD =================
  const [cargando, setCargando] = useState(true)
  const [ventasDia, setVentasDia] = useState(0)
  const [boletosDia, setBoletosDia] = useState(0)
  const [ventasSemana, setVentasSemana] = useState(0)
  const [retiros, setRetiros] = useState<any[]>([])

  // ================= ESTADOS DE MODALES =================
  const [mostrarCorte, setMostrarCorte] = useState(false)
  const [fechaCorte, setFechaCorte] = useState(new Date().toLocaleDateString('en-CA')) // YYYY-MM-DD
  
  const [mostrarHistorial, setMostrarHistorial] = useState(false)
  const [fechaHistorial, setFechaHistorial] = useState(new Date().toLocaleDateString('en-CA'))
  const [historialUnificado, setHistorialUnificado] = useState<any[]>([])
  const [statsHistorial, setStatsHistorial] = useState({ ventas: 0, retiros: 0, total: 0 })

  // ================= ESTADO DEL TICKET =================
  const [ticketActual, setTicketActual] = useState<any>(null)

  useEffect(() => {
    cargarDatosDashboard()
  }, [])

  useEffect(() => {
    if (mostrarHistorial) cargarHistorialCompleto()
  }, [fechaHistorial, mostrarHistorial])

  // ================= FUNCIONES DE CARGA (CON ZONA HORARIA REPARADA) =================
  const obtenerLimitesDia = (fechaLocal: string) => {
    return {
      inicio: new Date(`${fechaLocal}T00:00:00.000`).toISOString(),
      fin: new Date(`${fechaLocal}T23:59:59.999`).toISOString()
    }
  }

  const cargarDatosDashboard = async () => {
    setCargando(true)
    const hoyLocal = new Date().toLocaleDateString('en-CA')
    const limitesHoy = obtenerLimitesDia(hoyLocal)

    // Limites semana (hace 7 días)
    const fechaSemana = new Date()
    fechaSemana.setDate(fechaSemana.getDate() - 7)
    const limitesSemana = obtenerLimitesDia(fechaSemana.toLocaleDateString('en-CA'))

    try {
      // 1. Ventas de Hoy
      const { data: vHoy } = await supabase.from('ventas_boletos').select('monto_total, cantidad_boletos').gte('created_at', limitesHoy.inicio).lte('created_at', limitesHoy.fin)
      const totalVentasHoy = (vHoy || []).reduce((acc, v) => acc + v.monto_total, 0)
      const totalBoletosHoy = (vHoy || []).reduce((acc, v) => acc + v.cantidad_boletos, 0)
      
      // 2. Ventas de la Semana
      const { data: vSemana } = await supabase.from('ventas_boletos').select('monto_total').gte('created_at', limitesSemana.inicio).lte('created_at', limitesHoy.fin)
      const totalVentasSemana = (vSemana || []).reduce((acc, v) => acc + v.monto_total, 0)

      // 3. Retiros de Hoy
      const { data: rHoy } = await supabase.from('movimientos_caja').select('*').gte('created_at', limitesHoy.inicio).lte('created_at', limitesHoy.fin).order('created_at', { ascending: false })

      setVentasDia(totalVentasHoy)
      setBoletosDia(totalBoletosHoy)
      setVentasSemana(totalVentasSemana)
      setRetiros(rHoy || [])
    } catch (error) {
      console.error(error)
    } finally {
      setCargando(false)
    }
  }

  const cargarHistorialCompleto = async () => {
    const limites = obtenerLimitesDia(fechaHistorial)

    const { data: ventas } = await supabase.from('ventas_boletos').select(`id, created_at, monto_total, cantidad_boletos, folio_secuencial, alumnos ( nombre_completo )`).gte('created_at', limites.inicio).lte('created_at', limites.fin)
    const { data: retirosDb } = await supabase.from('movimientos_caja').select('*').gte('created_at', limites.inicio).lte('created_at', limites.fin)

    // Unificar y ordenar por fecha
    let unificado: any[] = []
    let tVentas = 0
    let tRetiros = 0

    if (ventas) {
      ventas.forEach(v => {
        tVentas += v.monto_total
        unificado.push({ tipo: 'VENTA', id: v.id, fecha: v.created_at, folio: `SITE-${String(v.folio_secuencial).padStart(5,'0')}`, descripcion: `Venta: ${v.alumnos?.nombre_completo} (${v.cantidad_boletos} bts)`, monto: v.monto_total })
      })
    }

    if (retirosDb) {
      retirosDb.forEach(r => {
        tRetiros += r.monto
        unificado.push({ tipo: 'RETIRO', id: r.id, fecha: r.created_at, folio: `RET-${r.id.substring(0,5)}`, descripcion: `Retiro: ${r.concepto}`, monto: r.monto })
      })
    }

    unificado.sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime())
    
    setHistorialUnificado(unificado)
    setStatsHistorial({ ventas: tVentas, retiros: tRetiros, total: tVentas - tRetiros })
  }

  const generarCorteZ = async () => {
    const limites = obtenerLimitesDia(fechaCorte)
    const { data: ventas } = await supabase.from('ventas_boletos').select('monto_total, cantidad_boletos').gte('created_at', limites.inicio).lte('created_at', limites.fin)
    const { data: retirosDb } = await supabase.from('movimientos_caja').select('monto').gte('created_at', limites.inicio).lte('created_at', limites.fin)

    const vTotales = (ventas || []).reduce((acc, v) => acc + v.monto_total, 0)
    const bTotales = (ventas || []).reduce((acc, v) => acc + v.cantidad_boletos, 0)
    const rTotales = (retirosDb || []).reduce((acc, r) => acc + r.monto, 0)

    setTicketActual({
      tipo: 'CORTE_Z', fechaCorte: fechaCorte, fechaImpresion: new Date().toLocaleString('es-MX'), ventas: vTotales, boletos: bTotales, retiros: rTotales, totalNeto: vTotales - rTotales
    })
    setMostrarCorte(false)
  }

  if (cargando) return <div className="min-h-screen bg-[#020617] flex justify-center items-center text-white font-bold text-xl">Cargando Finanzas...</div>

  return (
    <div className="min-h-screen bg-[#020617] text-slate-200 font-sans p-4 md:p-8">
      
      {/* HEADER */}
      <div className="max-w-6xl mx-auto flex justify-between items-center mb-8 border-b border-slate-800 pb-4">
        <div>
          <h3 className="text-indigo-400 font-bold text-sm tracking-widest uppercase">SITE-PEM • FINANZAS</h3>
          <h1 className="text-white font-black text-3xl">Panel Central</h1>
        </div>
        <button className="bg-slate-800 hover:bg-slate-700 text-white px-5 py-2.5 rounded-xl font-bold transition-colors border border-slate-700 text-sm">
          Cerrar Sesión
        </button>
      </div>

      {/* DASHBOARD CARDS */}
      <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        
        {/* Card Ventas Día */}
        <div className="bg-[#0f172a] rounded-2xl border border-emerald-900/50 p-6 flex flex-col items-center justify-center relative overflow-hidden shadow-lg">
          <div className="absolute top-0 left-0 w-full h-1 bg-emerald-500"></div>
          <span className="text-3xl mb-2">💵</span>
          <p className="text-slate-400 font-bold text-xs uppercase tracking-widest mb-1">Ventas del Día</p>
          <p className="text-white font-black text-4xl mb-4">${ventasDia.toFixed(2)}</p>
          <button onClick={() => setMostrarCorte(true)} className="bg-emerald-900/40 hover:bg-emerald-800/60 text-emerald-400 border border-emerald-800/50 px-4 py-2 rounded-lg font-bold text-sm flex items-center gap-2 transition-colors">
            🖨️ Imprimir Corte Z
          </button>
        </div>

        {/* Card Recargas (Boletos) */}
        <div className="bg-[#0f172a] rounded-2xl border border-pink-900/50 p-6 flex flex-col items-center justify-center relative overflow-hidden shadow-lg">
          <div className="absolute top-0 left-0 w-full h-1 bg-pink-500"></div>
          <span className="text-3xl mb-2">🎟️</span>
          <p className="text-slate-400 font-bold text-xs uppercase tracking-widest mb-1">Recargas Hoy (Viajes)</p>
          <p className="text-white font-black text-4xl">{boletosDia}</p>
        </div>

        {/* Card Ventas Semanales */}
        <div className="bg-[#0f172a] rounded-2xl border border-indigo-900/50 p-6 flex flex-col items-center justify-center relative overflow-hidden shadow-lg">
          <div className="absolute top-0 left-0 w-full h-1 bg-indigo-500"></div>
          <span className="text-3xl mb-2">📊</span>
          <p className="text-slate-400 font-bold text-xs uppercase tracking-widest mb-1">Ventas Semanales</p>
          <p className="text-white font-black text-4xl mb-4">${ventasSemana.toFixed(2)}</p>
          <button onClick={() => setMostrarHistorial(true)} className="bg-slate-800 hover:bg-slate-700 text-white border border-slate-600 px-4 py-2 rounded-lg font-bold text-sm transition-colors">
            Ver Historial
          </button>
        </div>

      </div>

      {/* TABLA: AUDITORÍA DE RETIROS */}
      <div className="max-w-6xl mx-auto bg-[#0f172a] rounded-2xl border border-slate-800 shadow-xl overflow-hidden">
        <div className="p-6 border-b border-slate-800 flex justify-between items-center bg-slate-900/50">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">💳 Auditoría de Retiros (Hoy)</h2>
          <button onClick={cargarDatosDashboard} className="bg-slate-800 hover:bg-slate-700 text-slate-300 px-4 py-2 rounded-lg text-sm font-bold transition-colors border border-slate-700">
            🔄 Actualizar
          </button>
        </div>
        <div className="overflow-x-auto p-2">
          {retiros.length === 0 ? (
            <p className="text-center text-slate-500 py-10 font-bold">No se han registrado retiros hoy.</p>
          ) : (
            <table className="w-full text-left text-sm">
              <thead className="text-slate-400 border-b border-slate-800 uppercase text-xs">
                <tr>
                  <th className="px-6 py-4 font-bold">Fecha / Hora</th>
                  <th className="px-6 py-4 font-bold">Concepto</th>
                  <th className="px-6 py-4 font-bold text-right">Monto</th>
                </tr>
              </thead>
              <tbody>
                {retiros.map((r) => (
                  <tr key={r.id} className="border-b border-slate-800/50 hover:bg-slate-800/20">
                    <td className="px-6 py-4 text-slate-300">{new Date(r.created_at).toLocaleString('es-MX')}</td>
                    <td className="px-6 py-4 text-white font-medium">{r.concepto}</td>
                    <td className="px-6 py-4 text-right font-black text-red-400">- ${r.monto.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      <div className="text-center mt-10 pb-4 text-slate-600 text-sm">
        System by <span className="font-bold text-slate-500">Arturo Díaz</span>
      </div>

      {/* ================= MODAL: GENERAR CORTE Z ================= */}
      {mostrarCorte && (
        <div className="fixed inset-0 bg-black/90 flex justify-center items-center z-50 p-4">
          <div className="bg-[#0f172a] border border-slate-700 p-8 rounded-2xl w-full max-w-md shadow-2xl">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">🖨️ Generar Corte Z</h2>
              <button onClick={() => setMostrarCorte(false)} className="text-slate-400 hover:text-white bg-slate-800 px-3 py-1 rounded-lg">✕</button>
            </div>
            
            <label className="block text-sm font-bold text-slate-400 mb-2">Selecciona la Fecha:</label>
            <div className="relative mb-6">
              <input 
                type="date" 
                value={fechaCorte} 
                onChange={(e) => setFechaCorte(e.target.value)} 
                style={{ colorScheme: 'dark' }}
                className="w-full bg-[#020617] border border-indigo-500/50 rounded-xl p-4 text-white font-bold outline-none focus:border-indigo-400 cursor-pointer" 
              />
            </div>

            <button onClick={generarCorteZ} className="w-full bg-[#10b981] hover:bg-[#059669] text-white font-bold py-4 rounded-xl transition-colors shadow-lg">
              Generar y Ver Ticket
            </button>
          </div>
        </div>
      )}

      {/* ================= MODAL: HISTORIAL COMPLETO ================= */}
      {mostrarHistorial && (
        <div className="fixed inset-0 bg-black/90 flex justify-center items-center p-4 z-40">
          <div className="bg-[#0f172a] rounded-3xl shadow-2xl w-full max-w-5xl overflow-hidden border border-slate-700 flex flex-col max-h-[90vh]">
            
            {/* Header del Historial */}
            <div className="bg-slate-900 p-6 border-b border-slate-800 flex flex-col md:flex-row justify-between items-center gap-4">
              <div>
                <h2 className="text-2xl font-black text-white">Historial Financiero</h2>
                <div className="mt-2 flex items-center gap-3">
                  <label className="text-sm font-bold text-slate-400">Consultar fecha:</label>
                  <input 
                    type="date" 
                    value={fechaHistorial} 
                    onChange={(e) => setFechaHistorial(e.target.value)}
                    style={{ colorScheme: 'dark' }} 
                    className="bg-[#020617] border border-indigo-500/50 rounded-lg p-2.5 text-sm text-white font-bold outline-none cursor-pointer" 
                  />
                </div>
              </div>
              <button onClick={() => setMostrarHistorial(false)} className="bg-slate-800 hover:bg-slate-700 border border-slate-600 text-white px-6 py-3 rounded-xl font-bold w-full md:w-auto">Cerrar Historial</button>
            </div>

            <div className="p-4 md:p-6 overflow-y-auto flex-grow bg-[#0f172a]">
              
              {/* Dashboard interno de colores */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className="bg-emerald-900/20 border border-emerald-900/50 p-4 rounded-xl text-center">
                  <p className="text-emerald-400/80 text-xs font-bold uppercase mb-1">Total Ingresos</p>
                  <p className="text-emerald-400 font-black text-2xl">+ ${statsHistorial.ventas.toFixed(2)}</p>
                </div>
                <div className="bg-red-900/20 border border-red-900/50 p-4 rounded-xl text-center">
                  <p className="text-red-400/80 text-xs font-bold uppercase mb-1">Total Retiros</p>
                  <p className="text-red-400 font-black text-2xl">- ${statsHistorial.retiros.toFixed(2)}</p>
                </div>
                <div className="bg-indigo-900/20 border border-indigo-900/50 p-4 rounded-xl text-center">
                  <p className="text-indigo-400/80 text-xs font-bold uppercase mb-1">Neto en Caja</p>
                  <p className="text-indigo-400 font-black text-2xl">${statsHistorial.total.toFixed(2)}</p>
                </div>
              </div>

              {/* Tabla Unificada */}
              {historialUnificado.length === 0 ? (
                <p className="text-slate-500 text-center py-10 font-bold">No hay movimientos en esta fecha.</p>
              ) : (
                <div className="overflow-x-auto bg-[#020617] rounded-xl border border-slate-800 p-2">
                  <table className="w-full text-left text-sm min-w-[700px]">
                    <thead className="text-slate-400 border-b border-slate-800 uppercase text-xs">
                      <tr>
                        <th className="px-4 py-3 font-bold">Hora</th>
                        <th className="px-4 py-3 font-bold">Folio / Tipo</th>
                        <th className="px-4 py-3 font-bold">Descripción</th>
                        <th className="px-4 py-3 font-bold text-right">Monto</th>
                      </tr>
                    </thead>
                    <tbody>
                      {historialUnificado.map((mov, i) => (
                        <tr key={i} className="border-b border-slate-800/50 hover:bg-slate-800/30">
                          <td className="px-4 py-4 text-slate-400">{new Date(mov.fecha).toLocaleTimeString('es-MX', {hour:'2-digit', minute:'2-digit'})}</td>
                          <td className="px-4 py-4">
                            <span className={`px-2 py-1 rounded text-[10px] font-black uppercase ${mov.tipo === 'VENTA' ? 'bg-emerald-900/40 text-emerald-400 border border-emerald-800' : 'bg-red-900/40 text-red-400 border border-red-800'}`}>
                              {mov.folio}
                            </span>
                          </td>
                          <td className="px-4 py-4 text-white">{mov.descripcion}</td>
                          <td className={`px-4 py-4 text-right font-black ${mov.tipo === 'VENTA' ? 'text-emerald-400' : 'text-red-400'}`}>
                            {mov.tipo === 'VENTA' ? '+' : '-'} ${mov.monto.toFixed(2)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ================= TICKET CORTE Z EMERGENTE (80mm) ================= */}
      {ticketActual && ticketActual.tipo === 'CORTE_Z' && (
        <div className="fixed inset-0 bg-black/90 flex justify-center items-center z-[100] p-4 print:p-0 print:bg-white print:block">
          <style>{`
            @media print { 
              @page { margin: 0; size: 80mm auto; } 
              body { background: white; -webkit-print-color-adjust: exact; margin: 0; padding: 0; }
            }
          `}</style>
          
          <div className="bg-white text-black p-5 w-full max-w-[320px] print:w-[80mm] print:max-w-[80mm] print:p-2 print:m-0 font-mono shadow-2xl print:shadow-none text-[12px] md:text-[14px] print:text-[12px] flex flex-col rounded-xl print:rounded-none">
            
            <div className="flex justify-center mb-3">
              <img src="/logo negro.png" alt="Logo" className="h-16 w-auto object-contain grayscale" onError={(e) => e.currentTarget.style.display = 'none'} />
            </div>
            
            <div className="text-center font-bold text-lg mb-1">SITE - FINANZAS</div>
            <div className="text-center mb-4 border-b border-black pb-3 mt-2">
              <p className="font-bold text-xl uppercase">CORTE Z</p>
              <p className="text-[11px] mt-1">Impresión: {ticketActual.fechaImpresion}</p>
            </div>

            <div className="space-y-2 mb-4 border-b border-dashed border-gray-400 pb-3">
              <p><span className="font-bold">Fecha de Corte:</span> {ticketActual.fechaCorte}</p>
            </div>

            <div className="space-y-2 mb-4 border-b border-dashed border-gray-400 pb-3">
              <div className="flex justify-between font-bold"><span>CONCEPTO</span><span>MONTO</span></div>
              <div className="flex justify-between mt-2"><span>(+) Ventas ({ticketActual.boletos} bts):</span><span>${ticketActual.ventas.toFixed(2)}</span></div>
              <div className="flex justify-between"><span>(-) Retiros/Gastos:</span><span>${ticketActual.retiros.toFixed(2)}</span></div>
            </div>

            <div className="space-y-2 mb-8 border-b border-black pb-3">
              <div className="flex justify-between font-black text-lg"><span>TOTAL NETO:</span><span>${ticketActual.totalNeto.toFixed(2)}</span></div>
            </div>

            <div className="mt-8 border-t border-black pt-2 text-center w-4/5 mx-auto">
              <p className="text-[10px] uppercase font-bold">Firma Administración</p>
            </div>
            
            <div className="h-4"></div>
            
            {/* Botones de acción para pantalla */}
            <div className="flex flex-col gap-2 print:hidden mt-6">
              <button onClick={() => window.print()} className="w-full bg-[#10b981] hover:bg-[#059669] text-white py-4 rounded-xl font-sans font-black text-lg transition-colors shadow-lg">🖨️ IMPRIMIR CORTE Z</button>
              <button onClick={() => setTicketActual(null)} className="w-full bg-slate-200 hover:bg-slate-300 text-slate-800 py-3 rounded-xl font-sans font-bold text-sm transition-colors">Cerrar Ticket</button>
            </div>

          </div>
        </div>
      )}

    </div>
  )
}
