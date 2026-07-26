'use client';

import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';

export default function SuperAdministrador() {
  const [rolActivo, setRolActivo] = useState<'superadmin' | 'admin_finanzas' | null>(null);
  const [pinIngresado, setPinIngresado] = useState('');
  const [pestaña, setPestaña] = useState<'alumnos' | 'finanzas'>('alumnos');

  const [alumnos, setAlumnos] = useState<any[]>([]);
  const [cargando, setCargando] = useState(false);

  const [historialRetiros, setHistorialRetiros] = useState<any[]>([]);
  const [cargandoRetiros, setCargandoRetiros] = useState(false);

  // Estados para el Dashboard dinámico
  const [ventasHoy, setVentasHoy] = useState(0);
  const [boletosHoy, setBoletosHoy] = useState(0);
  const [ventasSemana, setVentasSemana] = useState(0);

  const [mostrarModalHistorial, setMostrarModalHistorial] = useState(false);
  const [historialCompleto, setHistorialCompleto] = useState<any[]>([]);
  const [fechaHistorial, setFechaHistorial] = useState(new Date().toISOString().split('T')[0]);
  const [cargandoHistorial, setCargandoHistorial] = useState(false);
  
  // Estados de Calendario
  const [mostrarCalendario, setMostrarCalendario] = useState(false);
  const [fechaNavegacion, setFechaNavegacion] = useState(new Date());

  const meses = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

  // Lógica del Calendario
  const diasEnMes = new Date(fechaNavegacion.getFullYear(), fechaNavegacion.getMonth() + 1, 0).getDate();
  const primerDiaDelMes = new Date(fechaNavegacion.getFullYear(), fechaNavegacion.getMonth(), 1).getDay();
  const cambiarMes = (d: number) => setFechaNavegacion(new Date(fechaNavegacion.getFullYear(), fechaNavegacion.getMonth() + d, 1));
  const seleccionarDia = (dia: number) => {
    setFechaHistorial(`${fechaNavegacion.getFullYear()}-${String(fechaNavegacion.getMonth() + 1).padStart(2, '0')}-${String(dia).padStart(2, '0')}`);
    setMostrarCalendario(false);
  };

  const iniciarSesion = (e: React.FormEvent) => {
    e.preventDefault();
    if (pinIngresado === '7777') { setRolActivo('superadmin'); setPestaña('alumnos'); cargarAlumnos(); }
    else if (pinIngresado === '8888') { setRolActivo('admin_finanzas'); setPestaña('finanzas'); }
    else { alert('PIN Incorrecto'); setPinIngresado(''); }
  };

  const cerrarSesion = () => { setRolActivo(null); setPinIngresado(''); };

  const cargarAlumnos = async () => {
    setCargando(true);
    const { data } = await supabase.from('alumnos').select('*').order('id', { ascending: false });
    if (data) setAlumnos(data);
    setCargando(false);
  };

  const cargarEstadisticasCaja = async () => {
    const hoy = new Date();
    const y = hoy.getFullYear();
    const m = hoy.getMonth();
    const d = hoy.getDate();
    
    // Inicio y fin de HOY (Hora Local)
    const inicioHoy = new Date(y, m, d, 0, 0, 0).toISOString();
    const finHoy = new Date(y, m, d, 23, 59, 59).toISOString();
    
    // Inicio de la semana (Hace 7 días)
    const inicioSemana = new Date(y, m, d - 7, 0, 0, 0).toISOString();

    const { data: dataHoy } = await supabase.from('movimientos_caja')
      .select('*').gte('created_at', inicioHoy).lte('created_at', finHoy);

    if (dataHoy) {
      const ingresosHoy = dataHoy.filter(mov => mov.tipo !== 'retiro');
      setVentasHoy(ingresosHoy.reduce((acc, curr) => acc + curr.monto, 0));
      setBoletosHoy(ingresosHoy.length);
    }

    const { data: dataSemana } = await supabase.from('movimientos_caja')
      .select('monto, tipo').gte('created_at', inicioSemana).lte('created_at', finHoy);

    if (dataSemana) {
      const ingresosSemana = dataSemana.filter(mov => mov.tipo !== 'retiro');
      setVentasSemana(ingresosSemana.reduce((acc, curr) => acc + curr.monto, 0));
    }
  };

  const cargarRetiros = async () => {
    setCargandoRetiros(true);
    const { data } = await supabase.from('movimientos_caja').select('*').eq('tipo', 'retiro').order('created_at', { ascending: false });
    if (data) setHistorialRetiros(data);
    setCargandoRetiros(false);
  };

  const cargarHistorialPorFecha = async (fechaStr: string) => {
    setCargandoHistorial(true);
    const [y, m, d] = fechaStr.split('-').map(Number);
    const inicioDia = new Date(y, m - 1, d, 0, 0, 0).toISOString();
    const finDia = new Date(y, m - 1, d, 23, 59, 59).toISOString();

    const { data } = await supabase.from('movimientos_caja').select('*')
      .gte('created_at', inicioDia).lte('created_at', finDia).order('created_at', { ascending: false });
    
    if (data) setHistorialCompleto(data);
    setCargandoHistorial(false);
  };

  useEffect(() => {
    if (pestaña === 'finanzas') {
      cargarRetiros();
      cargarEstadisticasCaja();
    }
  }, [pestaña]);

  useEffect(() => { 
    if (mostrarModalHistorial) cargarHistorialPorFecha(fechaHistorial); 
  }, [fechaHistorial, mostrarModalHistorial]);

  const abrirModalHistorial = () => {
    const hoy = new Date();
    setFechaHistorial(`${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}-${String(hoy.getDate()).padStart(2, '0')}`);
    setFechaNavegacion(hoy);
    setMostrarModalHistorial(true);
  };

  if (!rolActivo) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col justify-between items-center p-6">
        <div className="w-full"></div>
        <div className="bg-slate-900 border border-slate-800 p-8 rounded-3xl shadow-2xl max-w-sm w-full text-center">
          <div className="h-20 bg-white rounded-xl flex items-center justify-center mx-auto mb-6 shadow-[0_0_20px_rgba(147,51,234,0.3)] p-2">
            <img src="/logo%20negro.png" alt="Escudo" className="h-full w-auto object-contain" />
          </div>
          <h2 className="text-2xl font-black text-white mb-1">SITE-PEM</h2>
          <p className="text-purple-400 text-xs font-bold uppercase tracking-widest mb-6">Acceso Restringido</p>
          <form onSubmit={iniciarSesion}>
            <input type="password" value={pinIngresado} onChange={(e) => setPinIngresado(e.target.value)} className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-center text-white text-2xl tracking-[0.5em] outline-none focus:border-purple-500 mb-6" placeholder="••••" maxLength={4} />
            <button type="submit" className="w-full bg-purple-600 hover:bg-purple-500 text-white font-bold py-3 rounded-xl transition-all shadow-[0_0_15px_rgba(147,51,234,0.3)]">Entrar al Panel</button>
          </form>
        </div>
        <footer className="text-center py-4 w-full">
          <p className="text-xs text-slate-500 font-medium">SITE-PEM System by <span className="text-slate-400 font-bold">Arturo Diaz</span></p>
        </footer>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 p-6 font-sans text-slate-200 flex flex-col justify-between print:bg-white print:p-0">
      <div className="max-w-6xl mx-auto w-full print:hidden">
        
        {/* ENCABEZADO */}
        <div className="bg-slate-900 border border-purple-900/50 p-6 rounded-2xl shadow-[0_0_30px_rgba(147,51,234,0.15)] flex flex-col md:flex-row justify-between items-center mb-6 gap-4 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-purple-600 to-fuchsia-500"></div>
          <div className="flex items-center gap-4 flex-wrap">
            <div className="h-16 bg-white rounded-xl p-2 shadow-lg shrink-0 flex items-center justify-center">
              <img src="/logo%20negro.png" alt="Escudo" className="h-full w-auto object-contain" />
            </div>
            <div>
              <p className="text-xs text-purple-400 font-bold uppercase tracking-wider mb-1">SITE-PEM • {rolActivo === 'superadmin' ? 'Super Administrador' : 'Finanzas'}</p>
              <h1 className="text-2xl md:text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-fuchsia-400">Panel Central</h1>
            </div>
          </div>
          <button onClick={cerrarSesion} className="bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-bold py-2 px-4 rounded-lg border border-slate-700 transition-colors">Cerrar Sesión</button>
        </div>

        {/* NAVEGACIÓN */}
        {rolActivo === 'superadmin' && (
          <div className="flex gap-2 mb-6 bg-slate-900/50 p-2 rounded-xl w-fit border border-slate-800">
            <button onClick={() => setPestaña('alumnos')} className={`px-6 py-2 rounded-lg text-sm font-bold transition-all ${pestaña === 'alumnos' ? 'bg-purple-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}>👥 Alumnos</button>
            <button onClick={() => setPestaña('finanzas')} className={`px-6 py-2 rounded-lg text-sm font-bold transition-all ${pestaña === 'finanzas' ? 'bg-purple-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}>💰 Finanzas</button>
          </div>
        )}

        {/* PESTAÑA: ALUMNOS (Mensaje Temporal si no está la lógica) */}
        {pestaña === 'alumnos' && (
           <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl text-center shadow-lg">
             {cargando ? (
               <p className="text-slate-400">Cargando alumnos...</p>
             ) : (
               <div>
                  <h2 className="text-xl font-bold text-white mb-4">Gestión de Alumnos</h2>
                  <p className="text-slate-400">Total de alumnos en base de datos: {alumnos.length}</p>
               </div>
             )}
           </div>
        )}

        {/* PESTAÑA: FINANZAS (CON DASHBOARD DINÁMICO) */}
        {pestaña === 'finanzas' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="bg-slate-900 border border-emerald-900/50 p-6 rounded-2xl flex flex-col justify-center items-center text-center shadow-lg relative overflow-hidden">
              <div className="absolute top-0 w-full h-1 bg-emerald-500"></div>
              <span className="text-emerald-500 mb-2 text-3xl">💵</span>
              <p className="text-slate-400 text-sm font-bold uppercase mb-1">Ventas del Día (Ingresos)</p>
              <h2 className="text-3xl font-black text-white mb-2">${ventasHoy.toFixed(2)}</h2>
            </div>

            <div className="bg-slate-900 border border-blue-900/50 p-6 rounded-2xl flex flex-col justify-center items-center text-center shadow-lg relative overflow-hidden">
              <div className="absolute top-0 w-full h-1 bg-blue-500"></div>
              <span className="text-blue-500 mb-2 text-3xl">🎟️</span>
              <p className="text-slate-400 text-sm font-bold uppercase mb-1">Recargas Hoy</p>
              <h2 className="text-4xl font-black text-white">{boletosHoy}</h2>
            </div>

            <div className="bg-slate-900 border border-amber-900/50 p-6 rounded-2xl flex flex-col justify-center items-center text-center shadow-lg relative overflow-hidden">
              <div className="absolute top-0 w-full h-1 bg-amber-500"></div>
              <span className="text-amber-500 mb-2 text-3xl">📊</span>
              <p className="text-slate-400 text-sm font-bold uppercase mb-1">Ventas de la Semana</p>
              <h2 className="text-3xl font-black text-white mb-2">${ventasSemana.toFixed(2)}</h2>
              <button onClick={abrirModalHistorial} className="mt-2 bg-slate-800 border border-slate-700 text-slate-300 text-xs py-2 px-4 rounded-lg font-bold hover:bg-slate-700 transition-all">Ver Historial Completo</button>
            </div>

            {/* TABLA DE RETIROS */}
            <div className="md:col-span-3 bg-slate-900 border border-slate-800 rounded-xl shadow-md overflow-hidden">
              <div className="flex justify-between items-center p-6 border-b border-slate-800">
                <h2 className="text-xl font-bold text-white flex items-center gap-2">💳 Auditoría de Retiros de Caja</h2>
                <button onClick={() => { cargarRetiros(); cargarEstadisticasCaja(); }} className="bg-slate-800 hover:bg-slate-700 text-slate-300 px-4 py-2 rounded-lg text-sm transition-colors border border-slate-700 flex items-center gap-2">
                  {cargandoRetiros ? 'Cargando...' : '🔄 Actualizar'}
                </button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-slate-300">
                  <thead className="bg-slate-950 text-slate-400 uppercase text-xs border-b border-slate-800">
                    <tr>
                      <th className="px-6 py-4 font-bold">Fecha y Hora</th>
                      <th className="px-6 py-4 font-bold">Concepto / Autorización</th>
                      <th className="px-6 py-4 font-bold text-right">Monto Extraído</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/50">
                    {historialRetiros.map((retiro) => (
                      <tr key={retiro.id} className="hover:bg-slate-800/30 transition-colors">
                        <td className="px-6 py-4 text-slate-400">{new Date(retiro.created_at).toLocaleString('es-MX')}</td>
                        <td className="px-6 py-4 font-medium text-slate-200">{retiro.concepto}</td>
                        <td className="px-6 py-4 text-red-400 font-bold text-right">- ${retiro.monto.toFixed(2)} MXN</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* --- MODAL DE HISTORIAL COMPLETO --- */}
      {mostrarModalHistorial && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-sm flex items-center justify-center p-4 z-50 print:hidden">
          <div className="bg-[#0f172a] border border-slate-800 p-6 rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-[0_10px_40px_rgba(0,0,0,0.8)]">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-white flex items-center gap-3">📊 Historial Completo de Caja</h2>
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
                          const fechaCompleta = `${fechaNavegacion.getFullYear()}-${m}-${dStr}`;
                          const estaSeleccionado = fechaCompleta === fechaHistorial;
                          return (
                            <button key={dia} onClick={() => seleccionarDia(dia)} className={`p-1.5 text-sm rounded-lg transition-colors ${estaSeleccionado ? 'bg-blue-600 text-white font-bold shadow-md' : esHoy ? 'bg-slate-800 text-blue-400 font-bold hover:bg-slate-700' : 'text-slate-300 hover:bg-slate-700'}`}>
                              {dia}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
                <button onClick={() => setMostrarModalHistorial(false)} className="bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white rounded-xl w-10 h-10 flex items-center justify-center font-bold">&times;</button>
              </div>
            </div>
            
            {/* TABLA HISTORIAL */}
            <div className="overflow-y-auto flex-1 bg-slate-950 rounded-xl border border-slate-800">
              {cargandoHistorial ? (
                <p className="text-slate-400 p-8 animate-pulse text-center font-medium">Buscando ventas y retiros del día...</p>
              ) : (
                <table className="w-full text-left text-sm text-slate-300">
                  <thead className="bg-[#0f172a] text-slate-400 uppercase text-xs sticky top-0 shadow-md">
                    <tr>
                      <th className="px-6 py-4 font-bold border-b border-slate-800">Fecha / Hora</th>
                      <th className="px-6 py-4 font-bold border-b border-slate-800">Tipo</th>
                      <th className="px-6 py-4 font-bold border-b border-slate-800">Concepto</th>
                      <th className="px-6 py-4 font-bold text-right border-b border-slate-800">Monto</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/50">
                    {historialCompleto.length > 0 ? (
                      historialCompleto.map((mov) => (
                        <tr key={mov.id} className="hover:bg-slate-800/30">
                          <td className="px-6 py-4 whitespace-nowrap text-slate-400">{new Date(mov.created_at).toLocaleString('es-MX', { dateStyle: 'short', timeStyle: 'short' })}</td>
                          <td className="px-6 py-4 font-bold">
                            {mov.tipo === 'retiro' ? (
                               <span className="text-[#ff5c5c] bg-[#3a1a1a] px-2 py-1 rounded text-xs uppercase border border-[#522525]">Retiro</span>
                            ) : (
                               <span className="text-emerald-400 bg-emerald-900/30 px-2 py-1 rounded text-xs uppercase border border-emerald-900/50">Venta/Ingreso</span>
                            )}
                          </td>
                          <td className="px-6 py-4 text-slate-200">{mov.concepto}</td>
                          <td className={`px-6 py-4 font-bold text-right ${mov.tipo === 'retiro' ? 'text-[#ff5c5c]' : 'text-emerald-400'}`}>
                            {mov.tipo === 'retiro' ? '-' : '+'}${mov.monto.toFixed(2)}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr><td colSpan={4} className="px-6 py-8 text-center text-slate-500 italic">No hay ventas ni retiros para este día.</td></tr>
                    )}
                  </tbody>
                </table>
              )}
            </div>

            {/* SUMATORIAS DEL HISTORIAL */}
            {!cargandoHistorial && historialCompleto.length > 0 && (
              <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4 border-t border-slate-800 pt-5">
                <div className="bg-[#0a0f1d] border border-emerald-900/30 p-4 rounded-xl text-center">
                  <p className="text-emerald-500/70 text-xs font-bold uppercase mb-1">Total Ingresos / Ventas</p>
                  <p className="text-emerald-400 font-black text-2xl">+${historialCompleto.filter(m => m.tipo !== 'retiro').reduce((acc, curr) => acc + curr.monto, 0).toFixed(2)}</p>
                </div>
                <div className="bg-[#0a0f1d] border border-[#522525] p-4 rounded-xl text-center">
                  <p className="text-[#ff5c5c]/70 text-xs font-bold uppercase mb-1">Total Retiros</p>
                  <p className="text-[#ff5c5c] font-black text-2xl">-${historialCompleto.filter(m => m.tipo === 'retiro').reduce((acc, curr) => acc + curr.monto, 0).toFixed(2)}</p>
                </div>
                <div className="bg-[#0a0f1d] border border-blue-900/30 p-4 rounded-xl text-center">
                  <p className="text-blue-500/70 text-xs font-bold uppercase mb-1">Balance Neto del Día</p>
                  <p className="text-blue-400 font-black text-2xl">${(historialCompleto.filter(m => m.tipo !== 'retiro').reduce((acc, curr) => acc + curr.monto, 0) - historialCompleto.filter(m => m.tipo === 'retiro').reduce((acc, curr) => acc + curr.monto, 0)).toFixed(2)}</p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
