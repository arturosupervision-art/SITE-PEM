'use client';

import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase'; // Ruta correcta para Vercel

export default function CajaOperativa() {
  const [matricula, setMatricula] = useState('');
  const [alumno, setAlumno] = useState<any>(null);
  const [montoVenta, setMontoVenta] = useState<number | ''>('');
  const [mensaje, setMensaje] = useState('');
  
  // Estados para Historial en Caja
  const [mostrarModalHistorial, setMostrarModalHistorial] = useState(false);
  const [historialCaja, setHistorialCaja] = useState<any[]>([]);
  const [fechaHistorial, setFechaHistorial] = useState(new Date().toISOString().split('T')[0]);
  
  // Estados del Calendario Desplegable
  const [mostrarCalendario, setMostrarCalendario] = useState(false);
  const [fechaNavegacion, setFechaNavegacion] = useState(new Date());
  
  const meses = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
  const diasEnMes = new Date(fechaNavegacion.getFullYear(), fechaNavegacion.getMonth() + 1, 0).getDate();
  const primerDiaDelMes = new Date(fechaNavegacion.getFullYear(), fechaNavegacion.getMonth(), 1).getDay();

  const cambiarMes = (direccion: number) => setFechaNavegacion(new Date(fechaNavegacion.getFullYear(), fechaNavegacion.getMonth() + direccion, 1));
  const seleccionarDia = (dia: number) => {
    setFechaHistorial(`${fechaNavegacion.getFullYear()}-${String(fechaNavegacion.getMonth() + 1).padStart(2, '0')}-${String(dia).padStart(2, '0')}`);
    setMostrarCalendario(false);
  };

  const buscarAlumno = async (e: React.FormEvent) => {
    e.preventDefault();
    setMensaje('');
    const { data } = await supabase.from('alumnos').select('*').eq('matricula', matricula).single();
    if (data) { setAlumno(data); } else { setAlumno(null); setMensaje('❌ Alumno no encontrado'); }
  };

  const registrarVenta = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!alumno || !montoVenta) return;
    
    const nuevosBoletos = alumno.boletos_disponibles + (Number(montoVenta) / 30);
    const { error: errorAlumno } = await supabase.from('alumnos')
      .update({ boletos_disponibles: nuevosBoletos }).eq('id', alumno.id);

    const { error: errorCaja } = await supabase.from('movimientos_caja').insert([{
      tipo: 'venta',
      monto: Number(montoVenta),
      concepto: `Recarga Matrícula: ${alumno.matricula}`
    }]);

    if (!errorAlumno && !errorCaja) {
      setMensaje(`✅ Venta Exitosa. Nuevo saldo: ${nuevosBoletos} boletos.`);
      setMontoVenta('');
      setMatricula('');
      setAlumno(null);
    } else {
      setMensaje('❌ Error al procesar la venta.');
    }
  };

  const cargarHistorialCaja = async () => {
    const [y, m, d] = fechaHistorial.split('-').map(Number);
    const inicioDia = new Date(y, m - 1, d, 0, 0, 0).toISOString();
    const finDia = new Date(y, m - 1, d, 23, 59, 59).toISOString();

    const { data } = await supabase.from('movimientos_caja').select('*')
      .gte('created_at', inicioDia).lte('created_at', finDia).order('created_at', { ascending: false });
    
    if (data) setHistorialCaja(data);
  };

  useEffect(() => {
    if (mostrarModalHistorial) cargarHistorialCaja();
  }, [fechaHistorial, mostrarModalHistorial]);

  return (
    <div className="min-h-screen bg-[#030712] p-6 flex flex-col items-center justify-center font-sans">
      {/* TU DISEÑO ORIGINAL RESTAURADO AQUÍ */}
      <div className="bg-[#0f172a] p-8 rounded-2xl w-full max-w-[450px]">
        <h2 className="text-2xl font-bold text-white text-center mb-8">Caja Operativa</h2>
        
        {mensaje && <div className="mb-4 p-3 rounded-lg text-center font-bold bg-slate-800 text-white">{mensaje}</div>}

        <form onSubmit={buscarAlumno} className="mb-8">
          <label className="text-slate-300 text-sm font-medium mb-2 block">Matrícula o QR del Alumno:</label>
          <div className="flex gap-3">
            <input 
              type="text" 
              value={matricula} 
              onChange={(e) => setMatricula(e.target.value)} 
              className="flex-1 bg-[#020617] border border-slate-800 rounded-lg px-4 py-3 text-white outline-none focus:border-blue-500 transition-colors" 
              placeholder="Ej: 2024001" 
            />
            <button type="submit" className="bg-[#2563eb] hover:bg-blue-600 text-white font-medium px-6 py-3 rounded-lg transition-colors">
              Buscar
            </button>
          </div>
        </form>

        {alumno && (
          <form onSubmit={registrarVenta} className="bg-[#1e293b]/50 p-5 rounded-xl border border-slate-700/50 mb-8 space-y-4">
            <div className="flex justify-between border-b border-slate-700/50 pb-3">
              <span className="text-slate-400">Alumno:</span>
              <span className="text-white font-bold">{alumno.nombre_completo}</span>
            </div>
            <div className="flex justify-between border-b border-slate-700/50 pb-3">
              <span className="text-slate-400">Saldo:</span>
              <span className="text-emerald-400 font-bold">{alumno.boletos_disponibles} Boletos</span>
            </div>
            <div className="pt-2">
              <label className="text-slate-300 text-sm font-medium block mb-2">Monto a Recargar ($):</label>
              <input 
                type="number" 
                value={montoVenta} 
                onChange={(e) => setMontoVenta(Number(e.target.value))} 
                className="w-full bg-[#020617] border border-slate-700 rounded-lg px-4 py-3 text-white outline-none focus:border-emerald-500 mb-4" 
                placeholder="Ej: 150" 
                required 
              />
              <button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 rounded-lg transition-colors">
                Procesar Recarga
              </button>
            </div>
          </form>
        )}

        <button 
          onClick={() => { 
            setFechaHistorial(new Date().toISOString().split('T')[0]); 
            setFechaNavegacion(new Date()); 
            setMostrarModalHistorial(true); 
          }} 
          className="w-full bg-[#1e293b] hover:bg-slate-700 text-white font-medium py-3 rounded-lg transition-colors"
        >
          Ver Historial de Caja
        </button>
      </div>

      {/* MODAL DE HISTORIAL */}
      {mostrarModalHistorial && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-[#0f172a] border border-slate-800 p-6 rounded-2xl w-full max-w-2xl max-h-[80vh] flex flex-col shadow-2xl">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-white">Historial de Operaciones</h2>
              <div className="flex items-center gap-2">
                <div className="relative">
                  <button onClick={() => setMostrarCalendario(!mostrarCalendario)} className="flex items-center gap-2 bg-[#0a0f1d] border border-slate-800 rounded-xl px-4 py-2 hover:bg-slate-800 transition-colors">
                    <span className="text-sm font-bold text-slate-400">Día:</span>
                    <span className="text-sm text-slate-200 font-medium tracking-wide">{fechaHistorial.split('-').reverse().join('/')}</span>
                    <span className="text-slate-400 ml-1">📅</span>
                  </button>
                  {mostrarCalendario && (
                    <div className="absolute right-0 mt-2 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl p-4 w-64 z-50">
                      <div className="flex justify-between items-center mb-4">
                        <button onClick={() => cambiarMes(-1)} className="text-slate-400 hover:text-white p-1">◀</button>
                        <span className="text-white font-bold text-sm">{meses[fechaNavegacion.getMonth()]} {fechaNavegacion.getFullYear()}</span>
                        <button onClick={() => cambiarMes(1)} className="text-slate-400 hover:text-white p-1">▶</button>
                      </div>
                      <div className="grid grid-cols-7 gap-1 text-center text-xs font-bold text-slate-500 mb-2">
                        <span>Do</span><span>Lu</span><span>Ma</span><span>Mi</span><span>Ju</span><span>Vi</span><span>Sa</span>
                      </div>
                      <div className="grid grid-cols-7 gap-1 text-center">
                        {Array.from({ length: primerDiaDelMes }).map((_, i) => (<div key={`empty-${i}`} className="p-2"></div>))}
                        {Array.from({ length: diasEnMes }).map((_, i) => {
                          const dia = i + 1;
                          const m = String(fechaNavegacion.getMonth() + 1).padStart(2, '0');
                          const dStr = String(dia).padStart(2, '0');
                          const estaSeleccionado = `${fechaNavegacion.getFullYear()}-${m}-${dStr}` === fechaHistorial;
                          return (
                            <button key={dia} onClick={() => seleccionarDia(dia)} className={`p-1.5 text-sm rounded-lg transition-colors ${estaSeleccionado ? 'bg-blue-600 text-white' : 'text-slate-300 hover:bg-slate-700'}`}>
                              {dia}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
                <button onClick={() => setMostrarModalHistorial(false)} className="text-white bg-slate-800 px-3 py-1 rounded-lg hover:bg-red-600 font-bold">&times;</button>
              </div>
            </div>

            <div className="overflow-y-auto flex-1 bg-slate-950 rounded-xl border border-slate-800">
              <table className="w-full text-left text-sm text-slate-300">
                <thead className="bg-[#0f172a] text-slate-400 uppercase text-xs sticky top-0">
                  <tr>
                    <th className="px-6 py-4 font-bold border-b border-slate-800">Hora</th>
                    <th className="px-6 py-4 font-bold border-b border-slate-800">Tipo</th>
                    <th className="px-6 py-4 font-bold text-right border-b border-slate-800">Monto</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/50">
                  {historialCaja.map((mov) => (
                    <tr key={mov.id}>
                      <td className="px-6 py-4">{new Date(mov.created_at).toLocaleTimeString('es-MX')}</td>
                      <td className="px-6 py-4 font-bold">{mov.tipo.toUpperCase()}</td>
                      <td className={`px-6 py-4 font-bold text-right ${mov.tipo === 'retiro' ? 'text-[#ff5c5c]' : 'text-emerald-400'}`}>
                        {mov.tipo === 'retiro' ? '-' : '+'}${mov.monto.toFixed(2)}
                      </td>
                    </tr>
                  ))}
                  {historialCaja.length === 0 && (
                     <tr><td colSpan={3} className="px-6 py-8 text-center text-slate-500">No hay movimientos en esta fecha.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
