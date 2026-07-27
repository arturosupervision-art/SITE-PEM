'use client';

import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';

export default function Coordinador() {
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
  }, []);

  // Función MEJORADA para WhatsApp (Sin emojis conflictivos y con valores por defecto)
  const notificarWhatsApp = (registro: any) => {
    const fecha = new Date(registro.fecha_hora).toLocaleDateString('es-MX');
    const hora = new Date(registro.fecha_hora).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });
    
    const unidad = registro.unidad_transporte || '1';
    const ubicacion = registro.ubicacion_gps || 'No disponible';
    const movimiento = registro.tipo_movimiento ? registro.tipo_movimiento.toUpperCase() : 'MOVIMIENTO';
    const nombre = registro.alumno_nombre || 'Sin Nombre';
    
    // Usamos formato de texto limpio para evitar problemas de codificación ()
    const mensaje = `*SITE-PEM: Aviso de Transporte*\n\nEstimado tutor, le informamos que el alumno *${nombre}* ha registrado un *${movimiento}*.\n\n*Detalles del movimiento:*\n- *Hora:* ${hora}\n- *Fecha:* ${fecha}\n- *Unidad:* Autobús ${unidad}\n- *Ubicación:* ${ubicacion}\n\n_Mensaje automático del Sistema de Control SITE-PEM._`;

    const numeroLimpio = registro.telefono_tutor ? registro.telefono_tutor.replace(/\D/g, '') : '';
    
    const url = numeroLimpio 
      ? `https://wa.me/${numeroLimpio}?text=${encodeURIComponent(mensaje)}`
      : `https://wa.me/?text=${encodeURIComponent(mensaje)}`;
      
    window.open(url, '_blank');
  };

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
              <p className="text-slate-400 mt-1">
                Monitor en Tiempo Real - Ascensos y Descensos
              </p>
            </div>
          </div>
          <div className="bg-slate-800/50 border border-slate-700 px-6 py-3 rounded-xl flex items-center gap-3">
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
            </span>
            <span className="text-slate-300 font-bold text-sm tracking-wide">
              Conexión Activa
            </span>
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
