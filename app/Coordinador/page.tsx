'use client';

import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';

export default function Coordinador() {
  // ==========================================
  // ESTADOS Y LÓGICA DE AUTENTICACIÓN / LOGIN
  // ==========================================
  const [usuarioLogueado, setUsuarioLogueado] = useState(false);
  const [correo, setCorreo] = useState('');
  const [contrasena, setContrasena] = useState('');
  const [errorLogin, setErrorLogin] = useState('');
  const [cargandoLogin, setCargandoLogin] = useState(false);
  const [coordinadorInfo, setCoordinadorInfo] = useState<any>(null);

  // Mantener la sesión activa en el navegador al recargar
  useEffect(() => {
    const sesionGuardada = sessionStorage.getItem('sesion_coordinacion');
    if (sesionGuardada) {
      setCoordinadorInfo(JSON.parse(sesionGuardada));
      setUsuarioLogueado(true);
    }
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorLogin('');
    setCargandoLogin(true);

    try {
      const { data, error } = await supabase
        .from('usuarios')
        .select('*')
        .eq('correo', correo.trim())
        .eq('contrasena', contrasena.trim())
        .maybeSingle();

      if (error || !data) {
        setErrorLogin('Credenciales incorrectas.');
        setCargandoLogin(false);
        return;
      }

      // Validación de Rol (Debe ser "coordinacion")
      const rolUsuario = data.rol ? data.rol.toLowerCase().trim() : '';
      if (rolUsuario !== 'coordinacion') {
        setErrorLogin('Acceso denegado (Solo personal con rol Coordinación).');
        setCargandoLogin(false);
        return;
      }

      // Login Exitoso
      setCoordinadorInfo(data);
      setUsuarioLogueado(true);
      sessionStorage.setItem('sesion_coordinacion', JSON.stringify(data));
    } catch (err) {
      setErrorLogin('Error de conexión al verificar el usuario.');
    } finally {
      setCargandoLogin(false);
    }
  };

  const handleCerrarSesion = () => {
    sessionStorage.removeItem('sesion_coordinacion');
    setUsuarioLogueado(false);
    setCoordinadorInfo(null);
  };

  // ==========================================
  // CÓDIGO ORIGINAL DEL MÓDULO COORDINADOR
  // ==========================================
  const [registros, setRegistros] = useState<any[]>([]);

  const cargarRegistros = async () => {
    const { data, error } = await supabase
      .from('registros_transporte')
      .select('*')
      .order('fecha_hora', { ascending: false })
      .limit(50);

    if (error) {
      console.error("Error al cargar registros:", error);
    } else if (data) {
      setRegistros(data);
    }
  };

  useEffect(() => {
    if (!usuarioLogueado) return;

    cargarRegistros();

    const canal = supabase
      .channel('tabla-registros')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'registros_transporte' },
        (payload) => {
          setRegistros((prev) => [payload.new, ...prev]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(canal);
    };
  }, [usuarioLogueado]);

  // Función MEJORADA para WhatsApp
  const notificarWhatsApp = (registro: any) => {
    const fecha = new Date(registro.fecha_hora).toLocaleDateString('es-MX');
    const hora = new Date(registro.fecha_hora).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });
    
    const unidad = registro.unidad_transporte || '1';
    const ubicacion = registro.ubicacion_gps || 'No disponible';
    const movimiento = registro.tipo_movimiento ? registro.tipo_movimiento.toUpperCase() : 'MOVIMIENTO';
    const nombre = registro.alumno_nombre || 'Sin Nombre';
    
    const mensaje = `*SITE-PEM: Aviso de Transporte*\n\nEstimado tutor, le informamos que el alumno *${nombre}* ha registrado un *${movimiento}*.\n\n*Detalles del movimiento:*\n- *Hora:* ${hora}\n- *Fecha:* ${fecha}\n- *Unidad:* Autobús ${unidad}\n- *Ubicación:* ${ubicacion}\n\n_Mensaje automático del Sistema de Control SITE-PEM._`;

    const numeroLimpio = registro.telefono_tutor ? registro.telefono_tutor.replace(/\D/g, '') : '';
    
    const url = numeroLimpio 
      ? `https://wa.me/${numeroLimpio}?text=${encodeURIComponent(mensaje)}`
      : `https://wa.me/?text=${encodeURIComponent(mensaje)}`;
      
    window.open(url, '_blank');
  };

  // ==========================================
  // VISTA 1: FORMULARIO DE LOGIN (SI NO ESTÁ LOGUEADO)
  // ==========================================
  if (!usuarioLogueado) {
    return (
      <main className="min-h-screen bg-slate-950 text-slate-200 flex flex-col justify-center items-center p-6 select-none font-sans">
        <div className="w-full max-w-md bg-slate-900 p-8 rounded-3xl border border-slate-800 shadow-2xl space-y-6">
          
          <div className="text-center space-y-3">
            <div className="bg-white p-3 rounded-2xl inline-block shadow-md">
              <img
                src="/logo negro.png"
                alt="Logo PEM"
                className="h-12 w-auto object-contain mx-auto"
              />
            </div>
            <div>
              <p className="text-xs text-blue-400 font-bold uppercase tracking-wider">
                SITE-PEM
              </p>
              <h1 className="text-2xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-400">
                Módulo Coordinador
              </h1>
            </div>
            <p className="text-xs text-slate-400">
              Ingresa tus credenciales para acceder al panel
            </p>
          </div>

          {errorLogin && (
            <div className="bg-red-950/80 border border-red-500/50 p-4 rounded-xl text-center">
              <p className="text-red-300 text-sm font-semibold">{errorLogin}</p>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Correo Electrónico:
              </label>
              <input
                type="email"
                required
                value={correo}
                onChange={(e) => setCorreo(e.target.value)}
                placeholder="ejemplo@pem.edu.mx"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-sm text-white focus:border-blue-500 outline-none transition-colors"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Contraseña:
              </label>
              <input
                type="password"
                required
                value={contrasena}
                onChange={(e) => setContrasena(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-sm text-white focus:border-blue-500 outline-none transition-colors"
              />
            </div>

            <button
              type="submit"
              disabled={cargandoLogin}
              className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 disabled:bg-slate-800 text-white font-bold py-3.5 rounded-xl transition-all shadow-lg mt-2 flex items-center justify-center gap-2"
            >
              {cargandoLogin ? 'Verificando...' : '🔐 Iniciar Sesión'}
            </button>
          </form>

          <footer className="text-center pt-2">
            <p className="text-[11px] text-slate-500 font-medium">
              SITE-PEM System by <span className="text-slate-400">Arturo Díaz</span>
            </p>
          </footer>
        </div>
      </main>
    );
  }

  // ==========================================
  // VISTA 2: PANTALLA PRINCIPAL (LOGUEADO)
  // ==========================================
  return (
    <div className="min-h-screen bg-slate-950 p-6 font-sans text-slate-200 flex flex-col justify-between">
      <div className="max-w-6xl mx-auto w-full">
        
        <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-xl flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
          <div className="flex items-center gap-4 flex-wrap justify-center text-center md:text-left">
            <div className="bg-white rounded-xl p-2 shadow-lg shrink-0 h-20 flex items-center justify-center">
              <img
                src="/logo negro.png"
                alt="Logo PEM"
                className="h-full w-auto object-contain"
              />
            </div>
            <div>
              <p className="text-xs text-blue-400 font-bold uppercase tracking-wider mb-1">
                SITE-PEM
              </p>
              <h1 className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-400">
                Módulo Coordinador
              </h1>
              <p className="text-slate-400 mt-1 text-sm">
                Usuario: <span className="text-slate-200 font-semibold">{coordinadorInfo?.nombre || 'Coordinación'}</span>
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="bg-slate-800/50 border border-slate-700 px-5 py-2.5 rounded-xl flex items-center gap-3">
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
              </span>
              <span className="text-slate-300 font-bold text-xs tracking-wide">
                Conexión Activa
              </span>
            </div>
            <button
              onClick={handleCerrarSesion}
              title="Cerrar Sesión"
              className="bg-slate-800 hover:bg-red-900/60 hover:border-red-500 border border-slate-700 text-xs px-3.5 py-2.5 rounded-xl transition-all text-slate-300 font-semibold flex items-center gap-1"
            >
              🚪 Salir
            </button>
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl shadow-md overflow-hidden mb-8">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-950 text-slate-400 uppercase text-xs border-b border-slate-800">
                <tr>
                  <th className="px-6 py-4 font-bold">Fecha y Hora</th>
                  <th className="px-6 py-4 font-bold">Alumno</th>
                  <th className="px-6 py-4 font-bold">Movimiento</th>
                  <th className="px-6 py-4 font-bold">Unidad</th>
                  <th className="px-6 py-4 font-bold text-center">GPS</th>
                  <th className="px-6 py-4 font-bold text-center">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/50">
                {registros.length === 0 ? (
                  <tr>
                    <td
                      colSpan={6}
                      className="px-6 py-8 text-center text-slate-500 animate-pulse"
                    >
                      Esperando registros en tiempo real o no hay datos...
                    </td>
                  </tr>
                ) : (
                  registros.map((registro) => (
                    <tr
                      key={registro.id || registro.fecha_hora}
                      className="hover:bg-slate-800/30 transition-colors"
                    >
                      <td className="px-6 py-4 text-slate-300">
                        {new Date(registro.fecha_hora).toLocaleString('es-MX')}
                      </td>
                      <td className="px-6 py-4">
                        <div className="font-bold text-blue-300">
                          {registro.alumno_nombre || 'Desconocido'}
                        </div>
                        <div className="text-xs text-slate-500 font-mono mt-1">
                          {registro.matricula}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-bold border ${
                            registro.tipo_movimiento === 'Ascenso'
                              ? 'bg-emerald-900/30 text-emerald-400 border-emerald-800'
                              : 'bg-amber-900/30 text-amber-400 border-amber-800'
                          }`}
                        >
                          {registro.tipo_movimiento}
                        </span>
                      </td>
                      <td className="px-6 py-4 font-bold text-slate-400">
                        Autobús {registro.unidad_transporte || '1'}
                      </td>
                      <td className="px-6 py-4 text-center">
                        {registro.ubicacion_gps ? (
                          <a
                            href={registro.ubicacion_gps}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-400 hover:text-blue-300 underline font-medium text-xs flex items-center justify-center gap-1"
                          >
                            📍 Ver Mapa
                          </a>
                        ) : (
                          <span className="text-slate-600 text-xs">
                            Sin ubicación
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <button
                          onClick={() => notificarWhatsApp(registro)}
                          className="bg-emerald-600 hover:bg-emerald-500 text-white px-3 py-1.5 rounded-lg text-xs font-bold flex items-center justify-center gap-2 transition-colors w-full border border-emerald-500/50 shadow-sm"
                        >
                          💬 Notificar
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <footer className="text-center py-6 mt-auto">
        <p className="text-xs text-slate-500 font-medium tracking-wide">
          SITE-PEM System by <span className="text-slate-400">Arturo Diaz</span>
        </p>
      </footer>
    </div>
  );
}
