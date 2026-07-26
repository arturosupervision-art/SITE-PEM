'use client';

import { useState, useEffect, useRef } from 'react';
import { supabase } from '../../lib/supabase';

export default function SuperAdministrador() {
  // SISTEMA DE ROLES
  const [rolActivo, setRolActivo] = useState<
    'superadmin' | 'admin_finanzas' | null
  >(null);
  const [pinIngresado, setPinIngresado] = useState('');
  const [pestaña, setPestaña] = useState<'alumnos' | 'finanzas'>('alumnos');

  // Estados de Alumnos
  const [alumnos, setAlumnos] = useState<any[]>([]);
  const [cargando, setCargando] = useState(false);
  const [mostrarModal, setMostrarModal] = useState(false);
  const [nombre, setNombre] = useState('');
  const [matricula, setMatricula] = useState('');
  const [qr, setQr] = useState('');
  const [mostrarModalQR, setMostrarModalQR] = useState(false);
  const [alumnoSeleccionado, setAlumnoSeleccionado] = useState<any>(null);
  const [nuevoQR, setNuevoQR] = useState('');

  // ESTADOS DE FINANZAS
  const [historialRetiros, setHistorialRetiros] = useState<any[]>([]);
  const [cargandoRetiros, setCargandoRetiros] = useState(false);

  // NUEVOS ESTADOS: Historial Completo y Corte Z
  const [mostrarModalHistorial, setMostrarModalHistorial] = useState(false);
  const [historialCompleto, setHistorialCompleto] = useState<any[]>([]);
  
  const [mostrarModalCorte, setMostrarModalCorte] = useState(false);
  const [fechaCorte, setFechaCorte] = useState(new Date().toISOString().split('T')[0]);
  const [datosCorte, setDatosCorte] = useState<any[] | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const qrInputRef = useRef<HTMLInputElement>(null);
  const nuevoQrInputRef = useRef<HTMLInputElement>(null);

  // Función de Login
  const iniciarSesion = (e: React.FormEvent) => {
    e.preventDefault();
    if (pinIngresado === '7777') {
      setRolActivo('superadmin');
      setPestaña('alumnos');
      cargarAlumnos();
    } else if (pinIngresado === '8888') {
      setRolActivo('admin_finanzas');
      setPestaña('finanzas');
    } else {
      alert('PIN Incorrecto. Acceso Denegado.');
      setPinIngresado('');
    }
  };

  const cerrarSesion = () => {
    setRolActivo(null);
    setPinIngresado('');
  };

  const cargarAlumnos = async () => {
    setCargando(true);
    const { data, error } = await supabase
      .from('alumnos')
      .select('*')
      .order('id', { ascending: false });
    if (!error && data) setAlumnos(data);
    setCargando(false);
  };

  // Cargar retiros para la tabla principal de Finanzas
  const cargarRetiros = async () => {
    setCargandoRetiros(true);
    const { data, error } = await supabase
      .from('movimientos_caja')
      .select('*')
      .eq('tipo', 'retiro')
      .order('created_at', { ascending: false });
    
    if (!error && data) setHistorialRetiros(data);
    setCargandoRetiros(false);
  };

  // NUEVO: Cargar TODO el historial
  const cargarHistorialCompleto = async () => {
    const { data, error } = await supabase
      .from('movimientos_caja')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (!error && data) {
      setHistorialCompleto(data);
      setMostrarModalHistorial(true);
    }
  };

  // NUEVO: Generar datos para el Corte Z del día seleccionado
  const generarCorteZ = async (e: React.FormEvent) => {
    e.preventDefault();
    // Consultamos los movimientos de ese día en específico
    const { data, error } = await supabase
      .from('movimientos_caja')
      .select('*')
      .gte('created_at', `${fechaCorte}T00:00:00`)
      .lte('created_at', `${fechaCorte}T23:59:59`);

    if (!error && data) {
      setDatosCorte(data);
    }
  };

  // Imprimir el corte (llama a la función nativa del navegador)
  const imprimirCorte = () => {
    window.print();
  };

  useEffect(() => {
    if (pestaña === 'finanzas') {
      cargarRetiros();
    }
  }, [pestaña]);

  useEffect(() => {
    if (mostrarModalQR && qrInputRef.current) qrInputRef.current.focus();
  }, [mostrarModalQR]);

  const descargarPlantilla = () => {
    const csvContent =
      'data:text/csv;charset=utf-8,nombre_completo,matricula,codigo_qr_vinculado\nJuan Perez,2024001,QR12345';
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', 'plantilla_alumnos.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const procesarCSV = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (evento) => {
      const texto = evento.target?.result as string;
      const lineas = texto.split('\n').slice(1);
      const nuevosAlumnos = lineas
        .map((linea) => {
          const [nombre_completo, matricula, codigo_qr_vinculado] = linea.split(',');
          if (nombre_completo && matricula) {
            return {
              nombre_completo: nombre_completo.trim(),
              matricula: matricula.trim(),
              codigo_qr_vinculado: codigo_qr_vinculado ? codigo_qr_vinculado.trim() : null,
              boletos_disponibles: 0,
            };
          }
          return null;
        })
        .filter(Boolean);

      if (nuevosAlumnos.length > 0) {
        setCargando(true);
        const { error } = await supabase.from('alumnos').insert(nuevosAlumnos);
        if (!error) {
          alert(`¡Se cargaron ${nuevosAlumnos.length} alumnos!`);
          cargarAlumnos();
        }
      }
      if (fileInputRef.current) fileInputRef.current.value = '';
    };
    reader.readAsText(file);
  };

  const guardarAlumno = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nombre || !matricula) return;
    const { error } = await supabase
      .from('alumnos')
      .insert([
        {
          nombre_completo: nombre,
          matricula: matricula,
          codigo_qr_vinculado: qr || null,
          boletos_disponibles: 0,
        },
      ]);
    if (!error) {
      setMostrarModal(false);
      setNombre('');
      setMatricula('');
      setQr('');
      cargarAlumnos();
    }
  };

  const guardarVinculacionQR = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nuevoQR || !alumnoSeleccionado) return;
    const { error } = await supabase
      .from('alumnos')
      .update({ codigo_qr_vinculado: nuevoQR })
      .eq('id', alumnoSeleccionado.id);
    if (!error) {
      setMostrarModalQR(false);
      setNuevoQR('');
      cargarAlumnos();
    }
  };

  const eliminarAlumno = async (id: number, nombreAlumno: string) => {
    if (window.confirm(`¿Eliminar a ${nombreAlumno}?`)) {
      await supabase.from('alumnos').delete().eq('id', id);
      cargarAlumnos();
    }
  };

  // --- PANTALLA DE LOGIN ---
  if (!rolActivo) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col justify-between items-center p-6">
        <div className="w-full"></div>
        <div className="bg-slate-900 border border-slate-800 p-8 rounded-3xl shadow-2xl max-w-sm w-full text-center">
          <div className="h-20 bg-white rounded-xl flex items-center justify-center mx-auto mb-6 shadow-[0_0_20px_rgba(147,51,234,0.3)] p-2">
            <img src="/logo%20negro.png" alt="Escudo PEM" className="h-full w-auto object-contain" />
          </div>
          <h2 className="text-2xl font-black text-white mb-1">SITE-PEM</h2>
          <p className="text-purple-400 text-xs font-bold uppercase tracking-widest mb-6">Acceso Restringido</p>

          <form onSubmit={iniciarSesion}>
            <input
              type="password"
              value={pinIngresado}
              onChange={(e) => setPinIngresado(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-center text-white text-2xl tracking-[0.5em] outline-none focus:border-purple-500 mb-6"
              placeholder="••••"
              maxLength={4}
            />
            <button
              type="submit"
              className="w-full bg-purple-600 hover:bg-purple-500 text-white font-bold py-3 rounded-xl transition-all shadow-[0_0_15px_rgba(147,51,234,0.3)]"
            >
              Entrar al Panel
            </button>
          </form>
        </div>
        <footer className="text-center py-4 w-full">
          <p className="text-xs text-slate-500 font-medium tracking-wide">
            SITE-PEM System by <span className="text-slate-400 font-bold">Arturo Diaz</span>
          </p>
        </footer>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 p-6 font-sans text-slate-200 flex flex-col justify-between print:bg-white print:p-0">
      {/* Añadimos print:hidden al contenedor principal para que no salga al imprimir */}
      <div className="max-w-6xl mx-auto w-full print:hidden">
        {/* ENCABEZADO SUPER ADMIN */}
        <div className="bg-slate-900 border border-purple-900/50 p-6 rounded-2xl shadow-[0_0_30px_rgba(147,51,234,0.15)] flex flex-col md:flex-row justify-between items-center mb-6 gap-4 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-purple-600 to-fuchsia-500"></div>

          <div className="flex items-center gap-4 flex-wrap">
            <div className="h-16 bg-white rounded-xl p-2 shadow-lg shrink-0 flex items-center justify-center">
              <img src="/logo%20negro.png" alt="Escudo PEM" className="h-full w-auto object-contain" />
            </div>
            <div>
              <p className="text-xs text-purple-400 font-bold uppercase tracking-wider mb-1">
                SITE-PEM • {rolActivo === 'superadmin' ? 'Super Administrador' : 'Finanzas'}
              </p>
              <h1 className="text-2xl md:text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-fuchsia-400">
                Panel Central
              </h1>
              <p className="text-slate-400 mt-1 text-sm">
                Sesión: <span className="font-bold text-white">{rolActivo === 'superadmin' ? 'Arturo Diaz (Dueño)' : 'Administradora de Caja'}</span>
              </p>
            </div>
          </div>

          <button
            onClick={cerrarSesion}
            className="bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-bold py-2 px-4 rounded-lg border border-slate-700 transition-colors"
          >
            Cerrar Sesión
          </button>
        </div>

        {/* NAVEGACIÓN DE PESTAÑAS */}
        {rolActivo === 'superadmin' && (
          <div className="flex gap-2 mb-6 bg-slate-900/50 p-2 rounded-xl w-fit border border-slate-800">
            <button
              onClick={() => setPestaña('alumnos')}
              className={`px-6 py-2 rounded-lg text-sm font-bold transition-all ${
                pestaña === 'alumnos' ? 'bg-purple-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'
              }`}
            >
              👥 Gestión de Alumnos
            </button>
            <button
              onClick={() => setPestaña('finanzas')}
              className={`px-6 py-2 rounded-lg text-sm font-bold transition-all ${
                pestaña === 'finanzas' ? 'bg-purple-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'
              }`}
            >
              💰 Reportes y Finanzas
            </button>
          </div>
        )}

        {/* PESTAÑA: ALUMNOS */}
        {pestaña === 'alumnos' && rolActivo === 'superadmin' && (
           <>
           <div className="flex flex-wrap gap-3 items-center justify-end mb-4">
             <button onClick={descargarPlantilla} className="bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold py-2 px-4 rounded-lg border border-slate-600 transition-colors">
               📥 Bajar Plantilla CSV
             </button>
             <input type="file" accept=".csv" ref={fileInputRef} onChange={procesarCSV} className="hidden" />
             <button onClick={() => fileInputRef.current?.click()} className="bg-slate-800 hover:bg-slate-700 text-purple-400 text-xs font-bold py-2 px-4 rounded-lg border border-purple-900/50 transition-colors flex items-center gap-2">
               <span>⬆️</span> Cargar CSV
             </button>
             <button onClick={() => { setMostrarModal(true); setTimeout(() => nuevoQrInputRef.current?.focus(), 100); }} className="bg-purple-600 hover:bg-purple-500 text-white font-bold py-2 px-6 rounded-xl transition-all shadow-[0_0_15px_rgba(147,51,234,0.4)]">
               + Manual
             </button>
           </div>
           <div className="bg-slate-900 border border-slate-800 rounded-xl shadow-md overflow-hidden mb-8">
             <div className="overflow-x-auto">
               <table className="w-full text-left text-sm">
                 <thead className="bg-slate-950 text-slate-400 uppercase text-xs border-b border-slate-800">
                   <tr>
                     <th className="px-6 py-4 font-bold">Matrícula</th>
                     <th className="px-6 py-4 font-bold">Nombre Completo</th>
                     <th className="px-6 py-4 font-bold text-center">Saldo</th>
                     <th className="px-6 py-4 font-bold text-center">Acciones</th>
                   </tr>
                 </thead>
                 <tbody className="divide-y divide-slate-800/50">
                   {alumnos.map((alum) => (
                     <tr key={alum.id} className="hover:bg-slate-800/30 transition-colors">
                       <td className="px-6 py-4 font-mono text-purple-300">{alum.matricula}</td>
                       <td className="px-6 py-4 font-bold text-slate-200">{alum.nombre_completo}</td>
                       <td className="px-6 py-4 text-center">
                         <span className={`px-3 py-1 rounded-full text-xs font-bold border ${alum.boletos_disponibles > 0 ? 'bg-emerald-900/30 text-emerald-400 border-emerald-800' : 'bg-red-900/30 text-red-400 border-red-800'}`}>
                           {alum.boletos_disponibles}
                         </span>
                       </td>
                       <td className="px-6 py-4 text-center flex justify-center gap-2">
                         <button onClick={() => { setAlumnoSeleccionado(alum); setNuevoQR(alum.codigo_qr_vinculado || ''); setMostrarModalQR(true); }} className="bg-indigo-900/40 text-indigo-300 hover:text-white px-3 py-1.5 rounded-lg text-xs font-bold transition-all border border-indigo-800/50">
                           🔗 Vincular QR
                         </button>
                         <button onClick={() => eliminarAlumno(alum.id, alum.nombre_completo)} className="bg-red-900/40 text-red-400 hover:text-white px-3 py-1.5 rounded-lg text-xs font-bold transition-all border border-red-800/50">
                           Eliminar
                         </button>
                       </td>
                     </tr>
                   ))}
                 </tbody>
               </table>
             </div>
           </div>
         </>
        )}

        {/* PESTAÑA: FINANZAS */}
        {pestaña === 'finanzas' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="bg-slate-900 border border-emerald-900/50 p-6 rounded-2xl flex flex-col justify-center items-center text-center shadow-lg relative overflow-hidden">
              <div className="absolute top-0 w-full h-1 bg-emerald-500"></div>
              <span className="text-emerald-500 mb-2 text-3xl">💵</span>
              <p className="text-slate-400 text-sm font-bold uppercase mb-1">Corte del Día y Reportes</p>
              <h2 className="text-2xl font-black text-white mb-2">Impresión</h2>
              <button 
                onClick={() => { setDatosCorte(null); setMostrarModalCorte(true); }}
                className="mt-2 bg-emerald-900/40 border border-emerald-800 text-emerald-400 text-xs py-2 px-4 rounded-lg font-bold hover:bg-emerald-600 hover:text-white transition-all w-full"
              >
                🖨️ Generar y Imprimir Corte Z
              </button>
            </div>

            <div className="bg-slate-900 border border-blue-900/50 p-6 rounded-2xl flex flex-col justify-center items-center text-center shadow-lg relative overflow-hidden">
              <div className="absolute top-0 w-full h-1 bg-blue-500"></div>
              <span className="text-blue-500 mb-2 text-3xl">🎟️</span>
              <p className="text-slate-400 text-sm font-bold uppercase mb-1">Boletos Recargados</p>
              <h2 className="text-4xl font-black text-white">Activos</h2>
            </div>

            <div className="bg-slate-900 border border-amber-900/50 p-6 rounded-2xl flex flex-col justify-center items-center text-center shadow-lg relative overflow-hidden">
              <div className="absolute top-0 w-full h-1 bg-amber-500"></div>
              <span className="text-amber-500 mb-2 text-3xl">📊</span>
              <p className="text-slate-400 text-sm font-bold uppercase mb-1">Flujo Histórico</p>
              <h2 className="text-2xl font-black text-white mb-2">Auditoría Total</h2>
              <button 
                onClick={cargarHistorialCompleto}
                className="mt-2 bg-slate-800 border border-slate-700 text-slate-300 text-xs py-2 px-4 rounded-lg font-bold hover:bg-slate-700 transition-all w-full"
              >
                👀 Ver Historial Completo
              </button>
            </div>

            {/* TABLA DE AUDITORÍA DE RETIROS */}
            <div className="md:col-span-3 bg-slate-900 border border-slate-800 rounded-xl shadow-md overflow-hidden">
              <div className="flex justify-between items-center p-6 border-b border-slate-800">
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                  💳 Auditoría de Retiros de Caja (Alertas)
                </h2>
                <button onClick={cargarRetiros} className="bg-slate-800 hover:bg-slate-700 text-slate-300 px-4 py-2 rounded-lg text-sm transition-colors border border-slate-700">
                  🔄 Actualizar
                </button>
              </div>

              {cargandoRetiros ? (
                <p className="text-slate-400 p-8 animate-pulse text-center font-medium">Cargando movimientos encriptados...</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm text-slate-300">
                    <thead className="bg-slate-950 text-slate-400 uppercase text-xs">
                      <tr>
                        <th className="px-6 py-4 font-bold">Fecha y Hora</th>
                        <th className="px-6 py-4 font-bold">Concepto / Autorización</th>
                        <th className="px-6 py-4 font-bold text-right">Monto Extraído</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/50">
                      {historialRetiros.length > 0 ? (
                        historialRetiros.map((retiro) => (
                          <tr key={retiro.id} className="hover:bg-slate-800/30 transition-colors">
                            <td className="px-6 py-4 whitespace-nowrap text-slate-400">
                              {new Date(retiro.created_at).toLocaleString('es-MX', { dateStyle: 'short', timeStyle: 'short' })}
                            </td>
                            <td className="px-6 py-4 font-medium text-slate-200">{retiro.concepto}</td>
                            <td className="px-6 py-4 text-red-400 font-bold text-right">- ${retiro.monto.toFixed(2)} MXN</td>
                          </tr>
                        ))
                      ) : (
                        <tr><td colSpan={3} className="px-6 py-8 text-center text-slate-500 italic">No hay retiros registrados. La caja está intacta.</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* --- NUEVO MODAL: HISTORIAL COMPLETO --- */}
      {mostrarModalHistorial && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-sm flex items-center justify-center p-4 z-50 print:hidden">
          <div className="bg-slate-900 border border-slate-700 p-6 rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-white flex items-center gap-2">📊 Historial Completo de Caja</h2>
              <button onClick={() => setMostrarModalHistorial(false)} className="text-slate-400 hover:text-white font-bold text-xl">&times;</button>
            </div>
            
            <div className="overflow-y-auto flex-1 bg-slate-950 rounded-xl border border-slate-800">
              <table className="w-full text-left text-sm text-slate-300">
                <thead className="bg-slate-900 text-slate-400 uppercase text-xs sticky top-0 shadow-md">
                  <tr>
                    <th className="px-4 py-3 font-bold">Fecha / Hora</th>
                    <th className="px-4 py-3 font-bold">Tipo</th>
                    <th className="px-4 py-3 font-bold">Concepto</th>
                    <th className="px-4 py-3 font-bold text-right">Monto</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/50">
                  {historialCompleto.map((mov) => (
                    <tr key={mov.id} className="hover:bg-slate-800/50">
                      <td className="px-4 py-3 whitespace-nowrap text-slate-400">
                        {new Date(mov.created_at).toLocaleString('es-MX', { dateStyle: 'short', timeStyle: 'short' })}
                      </td>
                      <td className="px-4 py-3 font-bold">
                        {mov.tipo === 'retiro' ? (
                           <span className="text-red-400 bg-red-900/30 px-2 py-1 rounded text-xs uppercase">Retiro</span>
                        ) : mov.tipo === 'ingreso' || mov.tipo === 'recarga' ? (
                           <span className="text-emerald-400 bg-emerald-900/30 px-2 py-1 rounded text-xs uppercase">Ingreso</span>
                        ) : (
                           <span className="text-blue-400 bg-blue-900/30 px-2 py-1 rounded text-xs uppercase">{mov.tipo}</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-slate-200">{mov.concepto}</td>
                      <td className={`px-4 py-3 font-bold text-right ${mov.tipo === 'retiro' ? 'text-red-400' : 'text-emerald-400'}`}>
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

      {/* --- NUEVO MODAL: GENERADOR DE CORTE Z --- */}
      {mostrarModalCorte && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-sm flex items-center justify-center p-4 z-50 print:hidden">
          <div className="bg-slate-900 border border-emerald-800 p-6 rounded-2xl w-full max-w-md shadow-2xl">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-white">🖨️ Generar Corte Z</h2>
              <button onClick={() => setMostrarModalCorte(false)} className="text-slate-400 hover:text-white font-bold">&times;</button>
            </div>
            
            <form onSubmit={generarCorteZ} className="space-y-4">
              <div>
                <label className="block text-sm text-slate-400 mb-1">Selecciona la fecha del corte:</label>
                <input
                  type="date"
                  value={fechaCorte}
                  onChange={(e) => setFechaCorte(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-2 text-white outline-none focus:border-emerald-500"
                  required
                />
              </div>
              <button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-2 rounded-lg transition-all shadow-[0_0_15px_rgba(16,185,129,0.3)]">
                Procesar Datos
              </button>
            </form>

            {datosCorte && (
              <div className="mt-6 border-t border-slate-700 pt-4 text-center">
                <p className="text-emerald-400 text-sm mb-4 font-bold">✅ Corte calculado exitosamente.</p>
                <button onClick={imprimirCorte} className="bg-white text-black font-black py-3 px-6 rounded-xl hover:bg-gray-200 transition-all flex items-center justify-center gap-2 w-full">
                  🖨️ Imprimir Ticket de Corte
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* --- TICKET DE IMPRESIÓN (Solo visible al presionar Ctrl+P o Imprimir) --- */}
      {datosCorte && (
        <div className="hidden print:block text-black bg-white p-4 font-mono text-sm w-full max-w-xs mx-auto">
          <div className="text-center border-b border-black pb-4 mb-4">
            <h1 className="font-black text-xl">SITE-PEM</h1>
            <p>CORTE Z CAJA</p>
            <p>Fecha: {fechaCorte}</p>
          </div>
          
          <div className="mb-4">
            <h2 className="font-bold border-b border-black mb-2">MOVIMIENTOS DEL DÍA</h2>
            {datosCorte.length === 0 ? (
              <p className="text-center italic text-gray-500 my-4">Sin movimientos en esta fecha.</p>
            ) : (
              datosCorte.map((mov) => (
                <div key={mov.id} className="flex justify-between mb-1 text-xs">
                  <span className="truncate w-3/4">{mov.tipo === 'retiro' ? 'RETIRO:' : 'INGRESO:'} {mov.concepto.substring(0, 15)}</span>
                  <span className="font-bold">{mov.tipo === 'retiro' ? '-' : ''}${mov.monto.toFixed(2)}</span>
                </div>
              ))
            )}
          </div>

          <div className="border-t-2 border-black pt-2 mt-4 text-right font-black">
            <p>TOTAL INGRESOS: ${datosCorte.filter(m => m.tipo !== 'retiro').reduce((acc, curr) => acc + curr.monto, 0).toFixed(2)}</p>
            <p>TOTAL RETIROS: ${datosCorte.filter(m => m.tipo === 'retiro').reduce((acc, curr) => acc + curr.monto, 0).toFixed(2)}</p>
            <p className="mt-2 text-lg">SALDO FINAL: ${(datosCorte.filter(m => m.tipo !== 'retiro').reduce((acc, curr) => acc + curr.monto, 0) - datosCorte.filter(m => m.tipo === 'retiro').reduce((acc, curr) => acc + curr.monto, 0)).toFixed(2)}</p>
          </div>
          
          <div className="text-center mt-8 text-xs">
            <p>Firma Administrador</p>
            <p className="mt-8 border-t border-black w-3/4 mx-auto"></p>
            <p className="mt-2">FIN DEL TICKET</p>
          </div>
        </div>
      )}

      {/* MODALES MANUALES (Alumnos) */}
      {mostrarModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 print:hidden">
          <div className="bg-slate-900 border border-purple-800 p-6 rounded-2xl w-full max-w-md shadow-2xl">
            <h2 className="text-2xl font-bold text-white mb-4">👤 Agregar Alumno</h2>
            <form onSubmit={guardarAlumno} className="space-y-4">
              <input type="text" value={nombre} onChange={(e) => setNombre(e.target.value)} className="w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-2 text-white outline-none" placeholder="Nombre Completo" required />
              <input type="text" value={matricula} onChange={(e) => setMatricula(e.target.value)} className="w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-2 text-white outline-none" placeholder="Matrícula" required />
              <input type="text" value={qr} onChange={(e) => setQr(e.target.value)} className="w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-2 text-white outline-none font-mono" placeholder="QR (Opcional)" />
              <div className="flex justify-end gap-3 mt-6">
                <button type="button" onClick={() => setMostrarModal(false)} className="text-slate-400 font-bold">Cancelar</button>
                <button type="submit" className="bg-purple-600 text-white px-6 py-2 rounded-lg font-bold">Guardar</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {mostrarModalQR && alumnoSeleccionado && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 print:hidden">
          <div className="bg-slate-900 border border-indigo-500 p-6 rounded-2xl w-full max-w-md">
            <h2 className="text-xl font-bold text-white mb-4">🔗 Vincular QR a {alumnoSeleccionado.nombre_completo}</h2>
            <form onSubmit={guardarVinculacionQR} className="space-y-4">
              <input ref={qrInputRef} type="text" value={nuevoQR} onChange={(e) => setNuevoQR(e.target.value)} className="w-full bg-slate-950 border border-indigo-500/50 rounded-lg px-4 py-3 text-white text-center font-mono outline-none" placeholder="Lectura láser..." />
              <div className="flex justify-end gap-3 mt-4">
                <button type="button" onClick={() => setMostrarModalQR(false)} className="text-slate-400 font-bold">Cancelar</button>
                <button type="submit" className="bg-indigo-600 text-white px-6 py-2 rounded-lg font-bold">Guardar</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <footer className="text-center py-6 mt-auto print:hidden">
        <p className="text-xs text-slate-500 font-medium tracking-wide">
          SITE-PEM System by <span className="text-slate-400 font-bold">Arturo Diaz</span>
        </p>
      </footer>
    </div>
  );
}
