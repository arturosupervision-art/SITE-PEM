'use client';

import { useState } from 'react';
import { supabase } from '../../lib/supabase';

export default function ModuloTutor() {
  const [matricula, setMatricula] = useState('');
  const [alumno, setAlumno] = useState<any>(null);
  const [historial, setHistorial] = useState<any[]>([]);
  const [cargando, setCargando] = useState(false);
  const [mensaje, setMensaje] = useState('');

  const buscarAlumno = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!matricula) return;

    setCargando(true);
    setMensaje('');
    setAlumno(null);
    setHistorial([]);

    // 1. Buscar datos del alumno
    const { data: alumnoData, error: alumnoError } = await supabase
      .from('alumnos')
      .select('*')
      .eq('matricula', matricula)
      .single();

    if (alumnoError || !alumnoData) {
      setMensaje('No se encontró ningún alumno con esta matrícula.');
      setCargando(false);
      return;
    }

    setAlumno(alumnoData);

    // 2. Buscar historial de viajes del alumno (Los más recientes primero, ordenado por fecha_hora)
    const { data: viajesData } = await supabase
      .from('registros_transporte')
      .select('*')
      .eq('matricula', matricula)
      .order('fecha_hora', { ascending: false }) // ORDENAMIENTO POR FECHA CORREGIDO
      .limit(10); // Muestra los últimos 10 movimientos

    if (viajesData) {
      setHistorial(viajesData);
    }

    setCargando(false);
  };

  return (
    <div className="min-h-screen bg-slate-100 p-4 md:p-6 font-sans flex flex-col justify-between">
      <div className="max-w-md mx-auto w-full mt-6">
        {/* ENCABEZADO SITE-PEM */}
        <div className="text-center mb-8">
          {/* LOGO RECTANGULAR BLANCO */}
          <div className="h-24 bg-white rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg p-3 max-w-[280px]">
            <img
              src="/logo%20negro.png"
              alt="Escudo PEM"
              className="w-full h-full object-contain"
            />
          </div>
          <h1 className="text-3xl font-extrabold text-blue-900 tracking-tight">
            SITE-PEM
          </h1>
          <p className="text-slate-500 mt-1 font-bold text-sm">
            Sistema Inteligente de Transporte Escolar
          </p>
          <p className="text-slate-400 text-xs">
            Preparatoria Estado de México
          </p>
          <p className="text-blue-600 mt-3 font-medium bg-blue-100 inline-block px-4 py-1 rounded-full text-sm">
            Portal para Padres
          </p>
        </div>

        {/* BUSCADOR */}
        <div className="bg-white p-6 rounded-3xl shadow-xl shadow-slate-200/50 border border-slate-100">
          <form onSubmit={buscarAlumno} className="space-y-4">
            <div>
              <input
                type="text"
                value={matricula}
                onChange={(e) => setMatricula(e.target.value)}
                className="w-full bg-slate-50 border-2 border-slate-200 rounded-xl px-4 py-4 text-slate-800 outline-none focus:border-blue-500 focus:bg-white transition-all text-center text-lg font-bold tracking-widest placeholder:text-slate-400 placeholder:font-normal placeholder:tracking-normal"
                placeholder="Ingresa la Matrícula"
              />
            </div>
            <button
              type="submit"
              disabled={cargando}
              className="w-full bg-blue-700 hover:bg-blue-800 text-white font-bold py-4 rounded-xl shadow-lg shadow-blue-600/30 transition-all text-lg flex justify-center items-center gap-2 disabled:bg-blue-400"
            >
              {cargando ? 'Buscando...' : '🔍 Consultar Alumno'}
            </button>
          </form>

          {mensaje && (
            <div className="mt-6 p-4 bg-red-50 text-red-600 rounded-xl text-sm font-medium text-center border border-red-100">
              {mensaje}
            </div>
          )}
        </div>

        {/* RESULTADO (SALDO + HISTORIAL) */}
        {alumno && (
          <div className="mt-8 transform animate-[fadeIn_0.3s_ease-out] space-y-6">
            {/* TARJETA DE SALDO */}
            <div className="bg-white p-6 rounded-3xl shadow-xl shadow-slate-200/50 border border-slate-100">
              <h3 className="text-xl font-extrabold text-slate-800 text-center mb-4">
                {alumno.nombre_completo}
              </h3>
              <div className="bg-slate-50 p-6 rounded-2xl border-2 border-slate-100 flex flex-col items-center justify-center">
                <span className="text-sm text-slate-500 font-bold uppercase mb-2">
                  Boletos Disponibles
                </span>
                <span
                  className={`text-6xl font-black ${
                    alumno.boletos_disponibles > 0
                      ? 'text-emerald-500'
                      : 'text-red-500'
                  }`}
                >
                  {alumno.boletos_disponibles}
                </span>
                {alumno.boletos_disponibles === 0 && (
                  <span className="mt-3 text-xs bg-red-100 text-red-600 font-bold px-3 py-1 rounded-full">
                    ⚠️ Requiere Recarga
                  </span>
                )}
              </div>
            </div>

            {/* HISTORIAL DE VIAJES */}
            <div>
              <h4 className="text-slate-600 font-bold mb-3 px-2 flex items-center gap-2">
                <span>📍</span> Últimos Movimientos
              </h4>

              {historial.length === 0 ? (
                <div className="bg-white p-6 rounded-2xl text-center text-slate-400 text-sm border border-slate-100">
                  No hay viajes registrados aún.
                </div>
              ) : (
                <div className="space-y-3">
                  {historial.map((viaje) => (
                    <div
                      key={viaje.id}
                      className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex flex-col gap-2"
                    >
                      <div className="flex justify-between items-center border-b border-slate-50 pb-2">
                        <span className="text-xs text-slate-400 font-medium">
                          {/* APLICACIÓN DE ZONA HORARIA MEXICO CITY */}
                          {new Date(viaje.fecha_hora).toLocaleString('es-MX', { timeZone: 'America/Mexico_City' })}
                        </span>
                        <span
                          className={`text-xs font-bold px-2 py-1 rounded-md ${
                            viaje.tipo_movimiento === 'Ascenso'
                              ? 'bg-emerald-100 text-emerald-700'
                              : 'bg-amber-100 text-amber-700'
                          }`}
                        >
                          {viaje.tipo_movimiento}
                        </span>
                      </div>
                      <div className="flex justify-between items-center pt-1">
                        <span className="text-sm font-bold text-slate-700">
                          Autobús {viaje.unidad_transporte}
                        </span>
                        {viaje.ubicacion_gps && (
                          <a
                            href={viaje.ubicacion_gps}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs bg-blue-50 text-blue-600 font-bold px-3 py-1.5 rounded-lg hover:bg-blue-100 transition-colors flex items-center gap-1"
                          >
                            🗺️ Ver Mapa
                          </a>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* FIRMA DE AUTOR */}
      <footer className="text-center py-6 mt-10">
        <p className="text-xs text-slate-400 font-medium tracking-wide">
          SITE-PEM System by{' '}
          <span className="text-slate-500 font-bold">Arturo Diaz</span>
        </p>
      </footer>
    </div>
  );
}
