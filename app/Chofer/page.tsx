'use client';
import { useState, useEffect, useRef } from 'react';
import { supabase } from '../../lib/supabase';

export default function PantallaChofer() {
  const [busquedaManual, setBusquedaManual] = useState('');
  const [estadoPantalla, setEstadoPantalla] = useState<
    'ESPERANDO' | 'EXITO' | 'ERROR'
  >('ESPERANDO');
  const [mensaje, setMensaje] = useState('');
  const [alumnoActual, setAlumnoActual] = useState<any>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const [modoRuta, setModoRuta] = useState<'ASCENSO' | 'DESCENSO' | null>(null);
  const [ubicacion, setUbicacion] = useState<{
    lat: number;
    lng: number;
  } | null>(null);

  useEffect(() => {
    if (modoRuta && inputRef.current && estadoPantalla === 'ESPERANDO') {
      inputRef.current.focus();
    }
  }, [estadoPantalla, modoRuta]);

  const reproducirSonido = (tipo: 'EXITO' | 'ERROR') => {
    try {
      const AudioContext =
        window.AudioContext || (window as any).webkitAudioContext;
      const audioCtx = new AudioContext();
      const osc = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();

      osc.connect(gainNode);
      gainNode.connect(audioCtx.destination);

      if (tipo === 'EXITO') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(800, audioCtx.currentTime);
        osc.frequency.setValueAtTime(1200, audioCtx.currentTime + 0.1);
        gainNode.gain.setValueAtTime(0.5, audioCtx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(
          0.01,
          audioCtx.currentTime + 0.3
        );
        osc.start();
        osc.stop(audioCtx.currentTime + 0.3);
      } else {
        osc.type = 'square';
        osc.frequency.setValueAtTime(250, audioCtx.currentTime);
        gainNode.gain.setValueAtTime(0.3, audioCtx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(
          0.01,
          audioCtx.currentTime + 0.4
        );
        osc.start();
        osc.stop(audioCtx.currentTime + 0.4);
      }
    } catch (e) {
      console.log('Audio no soportado o bloqueado');
    }
  };

  const iniciarRuta = (tipo: 'ASCENSO' | 'DESCENSO') => {
    if (!navigator.geolocation) {
      alert('Tu navegador no soporta GPS. Se continuará sin ubicación.');
      setModoRuta(tipo);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUbicacion({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setModoRuta(tipo);
      },
      (err) => {
        alert(
          'GPS denegado o no disponible. Se continuará sin ubicación exacta.'
        );
        setModoRuta(tipo);
      }
    );
  };

  const procesarCodigo = async (codigo: string) => {
    if (!codigo.trim()) return;
    const codigoLimpio = codigo.trim();
    setBusquedaManual('');

    try {
      let { data: alumno, error } = await supabase
        .from('alumnos')
        .select('*')
        .or(
          `codigo_qr_vinculado.eq.${codigoLimpio},matricula.eq.${codigoLimpio}`
        )
        .maybeSingle();

      if (error || !alumno) {
        reproducirSonido('ERROR');
        setEstadoPantalla('ERROR');
        setAlumnoActual(null);
        setMensaje('❌ Alumno no encontrado o código inválido');
        return;
      }

      if (alumno.boletos_disponibles <= 0) {
        reproducirSonido('ERROR');
        setEstadoPantalla('ERROR');
        setAlumnoActual(alumno);
        setMensaje('⚠️ Sin boletos disponibles');
        return;
      }

      const nuevoSaldo = alumno.boletos_disponibles - 1;
      const { error: updateError } = await supabase
        .from('alumnos')
        .update({ boletos_disponibles: nuevoSaldo })
        .eq('id', alumno.id);

      if (updateError) {
        reproducirSonido('ERROR');
        setEstadoPantalla('ERROR');
        setMensaje('❌ Error al procesar el pase');
        return;
      }

      const enlaceMaps = ubicacion
        ? `https://maps.google.com/?q=${ubicacion.lat},${ubicacion.lng}`
        : '';

      const { error: errorRegistro } = await supabase.from('registros_transporte').insert([
        {
          alumno_id: alumno.id,
          matricula: alumno.matricula,
          alumno_nombre: alumno.nombre_completo, 
          telefono_tutor: alumno.telefono_tutor, 
          tipo_movimiento: modoRuta === 'ASCENSO' ? 'Ascenso' : 'Descenso',
          ubicacion_gps: enlaceMaps,
          unidad_transporte: '1'
        },
      ]);

      if (errorRegistro) {
        console.error("🚨 Error bloqueando inserción en Supabase:", errorRegistro);
      }

      if (alumno.correo_tutor) {
        const horaActual = new Date().toLocaleTimeString('es-MX', { 
          hour: '2-digit', minute: '2-digit', hour12: true 
        });

        fetch('/api/enviar-correo', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            correoTutor: alumno.correo_tutor,
            nombreAlumno: alumno.nombre_completo,
            tipoMovimiento: modoRuta,
            hora: horaActual,
            ubicacion: enlaceMaps
          })
        }).catch(err => console.error("Error disparando el correo:", err));
      }

      reproducirSonido('EXITO');
      setEstadoPantalla('EXITO');
      setAlumnoActual({ ...alumno, boletos_disponibles: nuevoSaldo });
      setMensaje('✅ ¡Abordaje Permitido!');
    } catch (err) {
      reproducirSonido('ERROR');
      setEstadoPantalla('ERROR');
      setMensaje('❌ Error de conexión');
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    procesarCodigo(busquedaManual);
  };

  return (
    <main className="min-h-screen bg-slate-900 text-white flex flex-col justify-between p-6 select-none">
      <header className="flex justify-between items-center bg-slate-800 p-4 rounded-2xl border border-slate-700 shadow-lg">
        <div className="flex items-center gap-3">
          <div className="bg-white p-2 rounded-xl h-12 flex items-center justify-center">
            <img
              src="/logo negro.png"
              alt="Logo"
              className="h-full w-auto object-contain"
            />
          </div>
          <div>
            <h1 className="text-xl font-bold text-amber-500">
              Módulo Chofer - Escáner
            </h1>
            <p className="text-xs text-slate-400">
              Control de Abordaje Escolar
            </p>
          </div>
        </div>
        <div className="text-right">
          {modoRuta ? (
            <div className="flex flex-col items-end">
              <span className="text-xs bg-indigo-900/50 border border-indigo-700 text-indigo-300 px-3 py-1 rounded-lg font-bold">
                🚌 Unidad Activa
              </span>
              <span className="text-[10px] text-slate-400 mt-1">
                {modoRuta === 'ASCENSO' ? '🟢 Ascenso' : '🔴 Descenso'}{' '}
                {ubicacion ? '📍 GPS' : ''}
              </span>
            </div>
          ) : (
            <span className="text-xs bg-slate-700 border border-slate-600 text-slate-300 px-3 py-1 rounded-lg font-bold">
              ⚠️ Selecciona Ruta
            </span>
          )}
        </div>
      </header>

      <section className="my-auto max-w-xl mx-auto w-full text-center space-y-6 mt-8">
        {!modoRuta && (
          <div className="bg-slate-800 p-8 rounded-3xl border border-slate-700 shadow-2xl space-y-6">
            <div>
              <h2 className="text-2xl font-bold text-white mb-2">
                Iniciar Recorrido
              </h2>
              <p className="text-slate-400 text-sm">
                Selecciona el tipo de ruta. Se solicitará acceso al GPS.
              </p>
            </div>
            <div className="flex flex-col gap-4">
              <button
                onClick={() => iniciarRuta('ASCENSO')}
                className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-4 rounded-xl flex items-center justify-center gap-3 transition-colors shadow-lg"
              >
                <span className="text-2xl">🏫</span> ASCENSO (Rumbo a escuela)
              </button>
              <button
                onClick={() => iniciarRuta('DESCENSO')}
                className="bg-amber-600 hover:bg-amber-500 text-white font-bold py-4 rounded-xl flex items-center justify-center gap-3 transition-colors shadow-lg"
              >
                <span className="text-2xl">🏠</span> DESCENSO (Rumbo a casa)
              </button>
            </div>
          </div>
        )}

        {modoRuta && estadoPantalla === 'ESPERANDO' && (
          <div className="bg-slate-800 p-8 rounded-3xl border border-slate-700 shadow-2xl space-y-6 relative">
            <button
              onClick={() => setModoRuta(null)}
              className="absolute top-4 right-4 text-xs bg-slate-700 hover:bg-slate-600 px-3 py-1 rounded border border-slate-500 transition-colors"
            >
              Cambiar Ruta
            </button>

            <div className="w-24 h-24 bg-slate-900 rounded-full flex items-center justify-center mx-auto border-4 border-amber-500/30 animate-pulse mt-4">
              <span className="text-4xl">📱</span>
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white mb-2">
                Listo para escanear
              </h2>
              <p className="text-slate-400 text-sm">
                Escanea con la cámara de tu celular o ingresa la matrícula del
                alumno.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="flex gap-2">
              <input
                ref={inputRef}
                type="text"
                value={busquedaManual}
                onChange={(e) => setBusquedaManual(e.target.value)}
                placeholder="Escanea o escribe código..."
                className="flex-grow bg-slate-900 border border-slate-600 rounded-xl p-4 text-lg text-white focus:border-amber-500 outline-none font-mono"
                autoFocus
              />
              <button
                type="submit"
                className="bg-amber-600 hover:bg-amber-700 font-bold px-6 rounded-xl text-white transition-colors"
              >
                Validar
              </button>
            </form>
          </div>
        )}

        {modoRuta && estadoPantalla === 'EXITO' && (
          <div className="bg-emerald-950/80 border-4 border-emerald-500 p-8 rounded-3xl shadow-2xl space-y-4">
            <div className="w-24 h-24 bg-emerald-500 rounded-full flex items-center justify-center mx-auto text-slate-950 text-5xl font-bold shadow-lg">
              ✓
            </div>
            <h2 className="text-3xl font-extrabold text-emerald-400">
              ¡ACCESO AUTORIZADO!
            </h2>
            {alumnoActual && (
              <div className="bg-slate-900/80 p-4 rounded-xl border border-emerald-500/40 space-y-1">
                <p className="text-xl font-bold text-white uppercase">
                  {alumnoActual.nombre_completo}
                </p>
                <p className="text-sm text-slate-300">
                  Matrícula: {alumnoActual.matricula}
                </p>
                <div className="mt-3 inline-block bg-emerald-500/20 border border-emerald-500 text-emerald-300 px-4 py-1.5 rounded-full font-bold text-sm">
                  🎟️ Restantes: {alumnoActual.boletos_disponibles} Boletos
                </div>
              </div>
            )}
            <button
              onClick={() => {
                setEstadoPantalla('ESPERANDO');
                setAlumnoActual(null);
              }}
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-4 rounded-xl text-lg shadow-lg mt-4 transition-colors"
            >
              Siguiente Alumno ➡️
            </button>
          </div>
        )}

        {modoRuta && estadoPantalla === 'ERROR' && (
          <div className="bg-red-950/80 border-4 border-red-500 p-8 rounded-3xl shadow-2xl space-y-4">
            <div className="w-24 h-24 bg-red-500 rounded-full flex items-center justify-center mx-auto text-white text-5xl font-bold shadow-lg">
              ✕
            </div>
            <h2 className="text-3xl font-extrabold text-red-400">
              ACCESO DENEGADO
            </h2>
            <p className="text-lg font-bold text-slate-200">{mensaje}</p>
            {alumnoActual && (
              <div className="bg-slate-900/80 p-4 rounded-xl border border-red-500/40 space-y-1">
                <p className="text-lg font-bold text-white uppercase">
                  {alumnoActual.nombre_completo}
                </p>
                <div className="mt-2 inline-block bg-red-500/20 border border-red-500 text-red-300 px-4 py-1.5 rounded-full font-bold text-sm">
                  🎟️ Saldo actual: 0 Boletos
                </div>
              </div>
            )}
            <button
              onClick={() => {
                setEstadoPantalla('ESPERANDO');
                setAlumnoActual(null);
              }}
              className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-4 rounded-xl text-lg shadow-lg mt-4 transition-colors"
            >
              Intentar de Nuevo 🔄
            </button>
          </div>
        )}
      </section>

      <footer className="text-center py-4">
        <p className="text-xs text-slate-500 font-medium">
          System by <span className="text-slate-400">Arturo Diaz</span>
        </p>
      </footer>
    </main>
  );
}
