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

  // Estados para el Dashboard
  const [ventasHoy, setVentasHoy] = useState(0);
  const [boletosHoy, setBoletosHoy] = useState(0);
  const [ventasSemana, setVentasSemana] = useState(0);

  // Historial General
  const [mostrarModalHistorial, setMostrarModalHistorial] = useState(false);
  const [historialCompleto, setHistorialCompleto] = useState<any[]>([]);
  const [fechaHistorial, setFechaHistorial] = useState(new Date().toISOString().split('T')[0]);
  const [cargandoHistorial, setCargandoHistorial] = useState(false);
  const [mostrarCalendario, setMostrarCalendario] = useState(false);
  const [fechaNavegacion, setFechaNavegacion] = useState(new Date());

  // AQUÍ ESTÁN LAS VARIABLES DEL CORTE Z RESTAURADAS (Para que Vercel pase la compilación)
  const [mostrarModalCorte, setMostrarModalCorte] = useState(false);
  const [fechaCorte, setFechaCorte] = useState(new Date().toISOString().split('T')[0]);
  const [datosCorte, setDatosCorte] = useState<any[] | null>(null);

  const meses = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

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
    const y = hoy.getFullYear(), m = hoy.getMonth(), d = hoy.getDate();
    const inicioHoy = new Date(y, m, d, 0, 0, 0).toISOString();
    const finHoy = new Date(y, m, d, 23, 59, 59).toISOString();
    const inicioSemana = new Date(y, m, d - 7, 0, 0, 0).toISOString();

    const { data: dataHoy } = await supabase.from('movimientos_caja').select('*').gte('created_at', inicioHoy).lte('created_at', finHoy);
    if (dataHoy) {
      const ingresosHoy = dataHoy.filter(mov => mov.tipo !== 'retiro');
      setVentasHoy(ingresosHoy.reduce((acc, curr) => acc + curr.monto, 0));
      setBoletosHoy(ingresosHoy.length);
    }

    const { data: dataSemana } = await supabase.from('movimientos_caja').select('monto, tipo').gte('created_at', inicioSemana).lte('created_at', finHoy);
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

    const { data } = await supabase.from('movimientos_caja').select('*').gte('created_at', inicioDia).lte('created_at', finDia).order('created_at', { ascending: false });
    if (data) setHistorialCompleto(data);
    setCargandoHistorial(false);
  };

  // FUNCIONES DE CORTE Z RESTAURADAS
  const generarCorteZ = async (e: React.FormEvent) => {
    e.preventDefault();
    const [y, m, d] = fechaCorte.split('-').map(Number);
    const inicioDia = new Date(y, m - 1, d, 0, 0, 0).toISOString();
    const finDia = new Date(y, m - 1, d, 23, 59, 59).toISOString();
    const { data } = await supabase.from('movimientos_caja').select('*').gte('created_at', inicioDia).lte('created_at', finDia);
    if (data) setDatosCorte(data);
  };

  const imprimirCorte = () => window.print();

  useEffect(() => {
    if (pestaña === 'finanzas') { cargarRetiros(); cargarEstadisticasCaja(); }
  }, [pestaña]);

  useEffect(() => { 
    if (mostrarModalHistorial) cargarHistorialPorFecha(fechaHistorial); 
  }, [fechaHistorial, mostrarModalHistorial]);

  if (!rolActivo) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col justify-between items-center p-6">
        <div className="w-full"></div>
        <div className="bg-slate-900 border border-slate-800 p-8 rounded-3xl shadow-2xl max-w-sm w-full text-center">
          <h2 className="text-2xl font-black text-white mb-1">SITE-PEM</h2>
          <p className="text-purple-400 text-xs font-bold uppercase tracking-widest mb-6">Acceso Restringido</p>
          <form onSubmit={iniciarSesion}>
            <input type="password" value={pinIngresado} onChange={(e) => setPinIngresado(e.target.value)} className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-center text-white text-2xl tracking-[0.5em] outline-none focus:border-purple-500 mb-6" placeholder="••••" maxLength={4} />
            <button type="submit" className="w-full bg-purple-600 hover:bg-purple-500 text-white font-bold py-3 rounded-xl transition-all shadow-[0_0_15px_rgba(147,51,234,0.3)]">Entrar al Panel</button>
          </form>
        </div>
        <footer className="text-center py-4 w-full"><p className="text-xs text-slate-500 font-medium">SITE-PEM System</p></footer>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 p-6 font-sans text-slate-200 flex flex-col justify-between print:bg-white print:p-0">
      <div className="max-w-6xl mx-auto w-full print:hidden">
        
        {/* ENCABEZADO */}
        <div className="bg-slate-900 border border-purple-900/50 p-6 rounded-2xl shadow-[0_0_30px_rgba(147,51,234,0.15)] flex justify-between items-center mb-6">
          <div>
            <p className="text-xs text-purple-400 font-bold uppercase tracking-wider mb-1">SITE-PEM • {rolActivo === 'superadmin' ? 'Super Administrador' : 'Finanzas'}</p>
            <h1 className="text-2xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-fuchsia-400">Panel Central</h1>
          </div>
          <button onClick={cerrarSesion} className="bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-bold py-2 px-4 rounded-lg">Cerrar Sesión</button>
        </div>

        {/* NAVEGACIÓN */}
        {rolActivo === 'superadmin' && (
          <div className="flex gap-2 mb-6 bg-slate-900/50 p-2 rounded-xl w-fit border border-slate-800">
            <button onClick={() => setPestaña('alumnos')} className={`px-6 py-2 rounded-lg text-sm font-bold ${pestaña === 'alumnos' ? 'bg-purple-600 text-white' : 'text-slate-400'}`}>👥 Alumnos</button>
            <button onClick={() => setPestaña('finanzas')} className={`px-6 py-2 rounded-lg text-sm font-bold ${pestaña === 'finanzas' ? 'bg-purple-600 text-white' : 'text-slate-400'}`}>💰 Finanzas</button>
          </div>
        )}

        {/* PESTAÑA: ALUMNOS */}
        {pestaña === 'alumnos' && (
           <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl">
              <h2 className="text-xl font-bold text-white">Gestión de Alumnos</h2>
              <p className="text-slate-400 mt-2">Alumnos registrados: {alumnos.length}</p>
           </div>
        )}

        {/* PESTAÑA: FINANZAS */}
        {pestaña === 'finanzas' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="bg-slate-900 border border-emerald-900/50 p-6 rounded-2xl flex flex-col justify-center items-center text-center shadow-lg relative overflow-hidden">
              <div className="absolute top-0 w-full h-1 bg-emerald-500"></div>
              <span className="text-emerald-500 mb-2 text-3xl">💵</span>
              <p className="text-slate-400 text-sm font-bold uppercase mb-1">Ventas del Día</p>
              <h2 className="text-3xl font-black text-white mb-2">${ventasHoy.toFixed(2)}</h2>
              
              {/* AQUÍ ESTÁ DE VUELTA EL BOTÓN DE IMPRIMIR CORTE Z */}
              <button 
                onClick={() => { setDatosCorte(null); setFechaCorte(new Date().toISOString().split('T')[0]); setMostrarModalCorte(true); }} 
                className="mt-2 bg-emerald-900/40 border border-emerald-800 text-emerald-400 text-xs py-2 px-4 rounded-lg font-bold hover:bg-emerald-600 hover:text-white transition-all"
              >
                🖨️ Imprimir Corte Z
              </button>
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
              <p className="text-slate-400 text-sm font-bold uppercase mb-1">Ventas Semanales</p>
              <h2 className="text-3xl font-black text-white mb-2">${ventasSemana.toFixed(2)}</h2>
              <button onClick={() => { setFechaHistorial(new Date().toISOString().split('T')[0]); setMostrarModalHistorial(true); }} className="mt-2 bg-slate-800 border border-slate-700 text-slate-300 text-xs py-2 px-4 rounded-lg font-bold hover:bg-slate-700">Ver Historial</button>
            </div>

            {/* TABLA DE RETIROS */}
            <div className="md:col-span-3 bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
              <div className="flex justify-between items-center p-6 border-b border-slate-800">
                <h2 className="text-xl font-bold text-white">💳 Auditoría de Retiros</h2>
                <button onClick={() => { cargarRetiros(); cargarEstadisticasCaja(); }} className="bg-slate-800 text-slate-300 px-4 py-2 rounded-lg text-sm border border-slate-700">🔄 Actualizar</button>
              </div>
              <table className="w-full text-left text-sm text-slate-300">
                <thead className="bg-slate-950 text-slate-400 uppercase text-xs border-b border-slate-800">
                  <tr><th className="px-6 py-4 font-bold">Fecha / Hora</th><th className="px-6 py-4 font-bold">Concepto</th><th className="px-6 py-4 font-bold text-right">Monto</th></tr>
                </thead>
                <tbody className="divide-y divide-slate-800/50">
                  {historialRetiros.map((retiro) => (
                    <tr key={retiro.id} className="hover:bg-slate-800/30">
                      <td className="px-6 py-4">{new Date(retiro.created_at).toLocaleString('es-MX')}</td>
                      <td className="px-6 py-4">{retiro.concepto}</td>
                      <td className="px-6 py-4 text-red-400 font-bold text-right">- ${retiro.monto.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* --- MODAL DEL CORTE Z (AQUÍ SE USA LA LÓGICA RESTAURADA) --- */}
      {mostrarModalCorte && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-sm flex items-center justify-center p-4 z-50 print:bg-white print:p-0">
          <div className="bg-[#0f172a] print:bg-white print:text-black border border-slate-800 p-6 rounded-2xl w-full max-w-lg shadow-2xl">
            <div className="flex justify-between items-center mb-6 print:hidden">
              <h2 className="text-xl font-bold text-white">🖨️ Generar Corte Z</h2>
              <button onClick={() => setMostrarModalCorte(false)} className="text-white bg-slate-800 px-3 py-1 rounded-lg hover:bg-red-600 font-bold">&times;</button>
            </div>
            
            <form onSubmit={generarCorteZ} className="mb-6 print:hidden">
              <label className="text-slate-400 text-sm font-bold block mb-2">Selecciona la Fecha:</label>
              <div className="flex gap-2">
                <input type="date" value={fechaCorte} onChange={(e) => setFechaCorte(e.target.value)} className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2 text-white" />
                <button type="submit" className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-4 py-2 rounded-xl">Generar</button>
              </div>
            </form>

            {datosCorte && (
              <div className="border border-slate-700 print:border-black p-4 rounded-xl bg-slate-950 print:bg-white text-center">
                <h3 className="font-bold text-lg mb-2 print:text-black">Corte de Caja Z</h3>
                <p className="text-sm text-slate-400 print:text-black mb-4">Fecha: {fechaCorte}</p>
                <div className="flex justify-between border-b border-slate-800 print:border-black py-2">
                  <span>Total Ingresos (+):</span>
                  <span className="font-bold text-emerald-400 print:text-black">${datosCorte.filter(m => m.tipo !== 'retiro').reduce((a, b) => a + b.monto, 0).toFixed(2)}</span>
                </div>
                <div className="flex justify-between border-b border-slate-800 print:border-black py-2">
                  <span>Total Retiros (-):</span>
                  <span className="font-bold text-red-400 print:text-black">${datosCorte.filter(m => m.tipo === 'retiro').reduce((a, b) => a + b.monto, 0).toFixed(2)}</span>
                </div>
                <div className="flex justify-between py-4 text-xl">
                  <span className="font-black print:text-black">TOTAL EN CAJA:</span>
                  <span className="font-black text-blue-400 print:text-black">${(datosCorte.filter(m => m.tipo !== 'retiro').reduce((a, b) => a + b.monto, 0) - datosCorte.filter(m => m.tipo === 'retiro').reduce((a, b) => a + b.monto, 0)).toFixed(2)}</span>
                </div>
                <button onClick={imprimirCorte} className="mt-4 w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-2 rounded-xl print:hidden">Imprimir Documento</button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODAL HISTORIAL COMPLETO OMITIDO POR BREVEDAD, SE MANTIENE EL ANTERIOR QUE YA TENÍAS */}
    </div>
  );
}
