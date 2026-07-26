'use client';

import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';

export default function CajaOperativa() {
  const [matricula, setMatricula] = useState('');
  const [alumno, setAlumno] = useState<any>(null);
  const [montoVenta, setMontoVenta] = useState<number | ''>('');
  const [mensaje, setMensaje] = useState('');
  
  // Estados para Historial en Caja
  const [mostrarModalHistorial, setMostrarModalHistorial] = useState(false);
  const [historialCaja, setHistorialCaja] = useState<any[]>([]);
  const [fechaHistorial, setFechaHistorial] = useState(new Date().toISOString().split('T')[0]);
  
  // Estados del Calendario Desplegable (Caja)
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
    const { data, error } = await supabase.from('alumnos').select('*').eq('matricula', matricula).single();
    if (data) { setAlumno(data); } else { setAlumno(null); setMensaje('❌ Alumno no encontrado'); }
  };

  const registrarVenta = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!alumno || !montoVenta) return;
    
    // 1. Actualizar los boletos del alumno
    const nuevosBoletos = alumno.boletos_disponibles + (Number(montoVenta) / 30); // Ejemplo: 1 boleto = 30 pesos
    const { error: errorAlumno } = await supabase.from('alumnos')
      .update({ boletos_disponibles: nuevosBoletos }).eq('id', alumno.id);

    // 2. ¡MUY IMPORTANTE! Registrar la venta en movimientos_caja para que el SuperAdmin lo vea
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

  // Función corregida por Zona Horaria
  const cargarHistorialCaja = async () => {
    const [y, m, d] = fechaHistorial.split('-').map(Number);
    // Armamos la hora exacta basándonos en la hora LOCAL, no UTC
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
    <div className="min-h-screen bg-slate-950 p-6 flex flex-col items-center justify-center">
      <div className="bg-slate-900 border border-slate-800 p-8 rounded-3xl shadow-2xl max-w-lg w-full">
        <h2 className="text-2xl font-black text-white text-center mb-6">Caja Operativa</h2>
        
        {mensaje && <div className="mb-4 p-3 rounded-lg text-center font-bold bg-slate-800 text-white">{mensaje}</div>}

        <form onSubmit={buscarAlumno} className="mb-6">
          <label className="text-slate-400 text-sm font-bold">Matrícula o QR del Alumno:</label>
          <div className="flex gap-2 mt-2">
            <input type="text" value={matricula} onChange={(e) => setMatricula(e.target.value)} className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2 text-white outline-none focus:border-blue-500" placeholder="Ej: 2024001" />
            <button type="submit" className="bg-blue-600 hover:bg-blue-500 text-white font-bold px-4 py-2 rounded-xl">Buscar</button>
          </div>
        </form>

        {alumno && (
          <form onSubmit={registrarVenta} className="bg-slate-800 p-4 rounded-xl border border-slate-700 space-y-4">
            <p className="text-white font-bold">Alumno: <span className="text-blue-400">{alumno.nombre_completo}</span></p>
            <p className="text-white font-bold">Saldo Actual: <span className="text-emerald-400">{alumno.boletos_disponibles} Boletos</span></p>
            <div>
              <label className="text-slate-400 text-sm font-bold">Monto a Recargar ($):</label>
              <input type="number" value={montoVenta} onChange={(e) => setMontoVenta(Number(e.target.value))} className="w-full mt-1 bg-slate-950 border border-slate-600 rounded-lg px-4 py-2 text-white" placeholder="Ej: 150" required />
            </div>
            <button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 rounded-xl shadow-[0_0_15px_rgba(16,185,129,0.3)]">Procesar Recarga</button>
          </form>
        )}

        <button onClick={() => { 
          setFechaHistorial(new Date().toISOString().split('T')[0]); 
          setFechaNavegacion(new Date()); 
          setMostrarModalHistorial(true); 
        }} className="mt-8 w-full bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold py-3 rounded-xl border border-slate-700">
          Ver Historial de Caja
        </button>
      </div>

      {/* MODAL DE HISTORIAL EN CAJA (CON CALENDARIO) */}
      {mostrarModalHistorial && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-[#0f172a] border border-slate-800 p-6 rounded-2xl w-full max-w-2xl max-h-[80vh] flex flex-col shadow-2xl">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-white">Historial de Operaciones</h2>
              
              <div className="flex items-center gap-2">
                {/* CALENDARIO */}
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
                          const esHoy = dia === new Date().getDate() && fechaNavegacion.getMonth() === new Date().getMonth() && fechaNavegacion.getFullYear() === new Date().getFullYear();
                          const m = String(fechaNavegacion.getMonth() + 1).padStart(2, '0');
                          const dStr = String(dia).padStart(2, '0');
                          return (
                            <button key={dia} onClick={() => seleccionarDia(dia)} className={`p-1.5 text-sm rounded-lg transition-colors ${`${fechaNavegacion.getFullYear()}-${m}-${dStr}` === fechaHistorial ? 'bg-blue-600 text-white' : esHoy ? 'bg-slate-800 text-blue-400' : 'text-slate-300 hover:bg-slate-700'}`}>
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
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
