'use client';
import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

export default function PantallaCajera() {
  const [cargando, setCargando] = useState(true);
  const [alumnos, setAlumnos] = useState<any[]>([]);
  const [busqueda, setBusqueda] = useState('');
  const [precioBoleto, setPrecioBoleto] = useState(20);

  const [turnoActual, setTurnoActual] = useState<any>(null);
  const [fondoApertura, setFondoApertura] = useState(500);

  const [mostrarRetiro, setMostrarRetiro] = useState(false);
  const [montoRetiro, setMontoRetiro] = useState('');
  const [conceptoRetiro, setConceptoRetiro] = useState('');

  const [mostrarCierre, setMostrarCierre] = useState(false);
  const [resumenCierre, setResumenCierre] = useState<any>(null);
  const [efectivoCajon, setEfectivoCajon] = useState('');

  const [mostrarHistorial, setMostrarHistorial] = useState(false);
  const [ventasDia, setVentasDia] = useState<any[]>([]);
  const [fechaFiltro, setFechaFiltro] = useState(
    new Date().toISOString().split('T')[0]
  );
  const [cargandoHistorial, setCargandoHistorial] = useState(false);

  const [ticketActual, setTicketActual] = useState<any>(null);
  const [alumnoAVincular, setAlumnoAVincular] = useState<any>(null);
  const [qrTextoManual, setQrTextoManual] = useState('');

  useEffect(() => {
    verificarTurnoYAlumnos();
  }, []);

  useEffect(() => {
    if (mostrarHistorial) cargarHistorialVentas();
  }, [fechaFiltro, mostrarHistorial]);

  const verificarTurnoYAlumnos = async () => {
    setCargando(true);
    try {
      const { data: turno } = await supabase
        .from('turnos_caja')
        .select('*')
        .eq('estado', 'abierta')
        .maybeSingle();
      if (turno) setTurnoActual(turno);
      const { data: alumnosDb } = await supabase
        .from('alumnos')
        .select('*')
        .order('nombre_completo', { ascending: true });
      if (alumnosDb) setAlumnos(alumnosDb);
    } catch (error) {
      console.error(error);
    } finally {
      setCargando(false);
    }
  };

  const abrirCaja = async (e: React.FormEvent) => {
    e.preventDefault();
    if (fondoApertura < 0) return alert('El fondo no puede ser negativo');
    const { data, error } = await supabase
      .from('turnos_caja')
      .insert([{ fondo_inicial: fondoApertura }])
      .select()
      .single();
    if (error) alert('Error al abrir la caja');
    else setTurnoActual(data);
  };

  const realizarRetiro = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!turnoActual) return;
    const monto = parseFloat(montoRetiro);
    if (monto <= 0 || !conceptoRetiro)
      return alert('Datos inválidos para el retiro');

    const { error } = await supabase
      .from('movimientos_caja')
      .insert([{ turno_id: turnoActual.id, monto, concepto: conceptoRetiro }]);
    if (!error) {
      setTicketActual({
        tipo: 'RETIRO',
        folio: `RET-${Date.now().toString().slice(-5)}`,
        monto: monto,
        concepto: conceptoRetiro,
        fecha: new Date().toLocaleString('es-MX'),
      });
      setMostrarRetiro(false);
      setMontoRetiro('');
      setConceptoRetiro('');
    } else {
      alert('Error al registrar retiro');
    }
  };

  const prepararCierre = async () => {
    if (!turnoActual) return;
    const { data: ventas } = await supabase
      .from('ventas_boletos')
      .select('monto_total')
      .gte('created_at', turnoActual.fecha_apertura);
    const totalVentas = (ventas || []).reduce(
      (acc, v) => acc + v.monto_total,
      0
    );

    const { data: retiros } = await supabase
      .from('movimientos_caja')
      .select('monto')
      .eq('turno_id', turnoActual.id);
    const totalRetiros = (retiros || []).reduce((acc, r) => acc + r.monto, 0);

    setResumenCierre({
      fondo: Number(turnoActual.fondo_inicial),
      ventas: totalVentas,
      retiros: totalRetiros,
      esperado: Number(turnoActual.fondo_inicial) + totalVentas - totalRetiros,
    });
    setMostrarCierre(true);
  };

  const procesarCierre = async (e: React.FormEvent) => {
    e.preventDefault();
    const efectivoReal = parseFloat(efectivoCajon);
    if (isNaN(efectivoReal)) return alert('Ingresa un monto válido');
    const diferencia = efectivoReal - resumenCierre.esperado;

    if (
      !window.confirm(
        `¿Seguro que deseas cerrar la caja?\n\nEfectivo Declarado: $${efectivoReal}\nDiferencia: $${diferencia}`
      )
    )
      return;

    const { error } = await supabase
      .from('turnos_caja')
      .update({
        estado: 'cerrada',
        fecha_cierre: new Date().toISOString(),
        total_ventas: resumenCierre.ventas,
        efectivo_esperado: resumenCierre.esperado,
        efectivo_entregado: efectivoReal,
        diferencia_corte: diferencia,
      })
      .eq('id', turnoActual.id);

    if (!error) {
      setTicketActual({
        tipo: 'CIERRE',
        fechaApertura: new Date(turnoActual.fecha_apertura).toLocaleString(
          'es-MX'
        ),
        fechaCierre: new Date().toLocaleString('es-MX'),
        fondo: resumenCierre.fondo,
        ventas: resumenCierre.ventas,
        retiros: resumenCierre.retiros,
        esperado: resumenCierre.esperado,
        real: efectivoReal,
        diferencia: diferencia,
      });
      setTurnoActual(null);
      setMostrarCierre(false);
      setEfectivoCajon('');
    } else {
      alert('Error al cerrar la caja');
    }
  };

  const cargarHistorialVentas = async () => {
    setCargandoHistorial(true);
    const inicioDia = fechaFiltro + 'T00:00:00';
    const finDia = fechaFiltro + 'T23:59:59';

    const { data, error } = await supabase
      .from('ventas_boletos')
      .select(
        `id, created_at, folio_secuencial, cantidad_boletos, monto_total, alumno_id, alumnos ( nombre_completo, matricula )`
      )
      .gte('created_at', inicioDia)
      .lte('created_at', finDia)
      .order('created_at', { ascending: false });

    if (!error) setVentasDia(data || []);
    setCargandoHistorial(false);
  };

  const cancelarVenta = async (
    ventaId: string,
    alumnoId: string,
    cantidadBoletos: number
  ) => {
    if (
      !window.confirm(
        `⚠️ ¿Seguro de cancelar esta venta?\n\nSe descontarán ${cantidadBoletos} boletos de la cuenta del alumno.`
      )
    )
      return;
    try {
      const { data: alumno } = await supabase
        .from('alumnos')
        .select('boletos_disponibles')
        .eq('id', alumnoId)
        .single();
      const nuevoSaldo = Math.max(
        0,
        (alumno?.boletos_disponibles || 0) - cantidadBoletos
      );

      await supabase
        .from('alumnos')
        .update({ boletos_disponibles: nuevoSaldo })
        .eq('id', alumnoId);
      await supabase.from('ventas_boletos').delete().eq('id', ventaId);

      alert('✅ Venta cancelada.');
      cargarHistorialVentas();
      verificarTurnoYAlumnos();
    } catch (error) {
      alert('❌ Error al cancelar la venta.');
    }
  };

  const venderBoletos = async (
    alumno: any,
    cantidadAgregar: number,
    concepto: string
  ) => {
    if (!turnoActual) return alert('Debes abrir la caja primero');
    if (cantidadAgregar <= 0) return;

    const nuevoSaldo = alumno.boletos_disponibles + cantidadAgregar;
    const totalCobrado = cantidadAgregar * precioBoleto;

    const { error: errAlumno } = await supabase
      .from('alumnos')
      .update({ boletos_disponibles: nuevoSaldo })
      .eq('id', alumno.id);
    const { data: dataVenta, error: errVenta } = await supabase
      .from('ventas_boletos')
      .insert([
        {
          alumno_id: alumno.id,
          cantidad_boletos: cantidadAgregar,
          monto_total: totalCobrado,
        },
      ])
      .select();

    if (errAlumno || errVenta || !dataVenta) {
      alert('❌ Error al procesar la venta.');
    } else {
      setTicketActual({
        tipo: 'VENTA',
        folio: `SITE-${String(dataVenta[0].folio_secuencial).padStart(5, '0')}`,
        nombre: alumno.nombre_completo,
        matricula: alumno.matricula,
        cantidad: cantidadAgregar,
        concepto: concepto,
        total: totalCobrado,
        nuevoSaldo: nuevoSaldo,
        fecha: new Date().toLocaleString('es-MX'),
      });
      setAlumnos(
        alumnos.map((a) =>
          a.id === alumno.id ? { ...a, boletos_disponibles: nuevoSaldo } : a
        )
      );
    }
  };

  const guardarVinculacion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!alumnoAVincular || !qrTextoManual.trim()) return;
    const { error } = await supabase
      .from('alumnos')
      .update({ codigo_qr_vinculado: qrTextoManual.trim() })
      .eq('id', alumnoAVincular.id);

    if (error) {
      alert(
        'Error al vincular el QR. ¿Tal vez ya está asignado a otro alumno?'
      );
    } else {
      alert(
        `✅ QR vinculado exitosamente a ${alumnoAVincular.nombre_completo}`
      );
      setAlumnoAVincular(null);
      setQrTextoManual('');
      verificarTurnoYAlumnos();
    }
  };

  const alumnosFiltrados = alumnos
    .filter(
      (a) =>
        a.nombre_completo.toLowerCase().includes(busqueda.toLowerCase()) ||
        a.matricula.toLowerCase().includes(busqueda.toLowerCase())
    )
    .slice(0, 15);

  if (cargando)
    return (
      <div className="min-h-screen bg-slate-900 flex justify-center items-center text-white">
        Cargando sistema...
      </div>
    );

  if (!turnoActual) {
    return (
      <div className="min-h-screen bg-slate-900 text-white flex flex-col p-4">
        <div className="flex-grow flex justify-center items-center">
          {ticketActual?.tipo === 'CIERRE' ? (
            <RenderTicket
              ticket={ticketActual}
              onClose={() => setTicketActual(null)}
            />
          ) : (
            <div className="bg-slate-800 p-8 rounded-2xl shadow-2xl border border-slate-700 max-w-md w-full text-center">
              <div className="bg-white p-3 rounded-xl inline-block mb-6">
                <img src="/logo negro.png" alt="Logo" className="h-16 w-auto" />
              </div>
              <h1 className="text-2xl font-bold text-amber-500 mb-2">
                Apertura de Caja
              </h1>
              <p className="text-slate-400 text-sm mb-6">
                Para comenzar a operar, declara el fondo inicial de la caja.
              </p>

              <form onSubmit={abrirCaja} className="space-y-4">
                <div className="text-left">
                  <label className="text-sm font-bold text-slate-300">
                    Fondo de Caja (MXN):
                  </label>
                  <input
                    type="number"
                    required
                    min="0"
                    value={fondoApertura}
                    onChange={(e) => setFondoApertura(Number(e.target.value))}
                    className="w-full bg-slate-900 border border-slate-600 rounded-lg p-3 mt-1 text-2xl text-emerald-400 font-bold text-center focus:border-amber-500 outline-none"
                  />
                </div>
                <button
                  type="submit"
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 rounded-lg shadow-lg"
                >
                  🔓 Abrir Caja y Comenzar
                </button>
              </form>
            </div>
          )}
        </div>
        <footer className="text-center py-4 print:hidden">
          <p className="text-xs text-slate-600 font-medium tracking-wide">
            System by <span className="text-slate-400">Arturo Diaz</span>
          </p>
        </footer>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 text-white font-sans flex flex-col justify-between print:bg-white print:text-black">
      <div
        className={`flex-grow flex flex-col ${
          ticketActual ||
          mostrarRetiro ||
          mostrarCierre ||
          mostrarHistorial ||
          alumnoAVincular
            ? 'hidden print:hidden'
            : ''
        }`}
      >
        <nav className="bg-slate-800 border-b border-slate-700 p-4 flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-4">
            <div className="bg-white p-2 rounded-lg h-12 flex items-center justify-center">
              <img
                src="/logo negro.png"
                alt="Logo Preparatoria PEM"
                className="h-full w-auto object-contain"
              />
            </div>
            <div>
              <h1 className="text-xl font-bold text-amber-500">SITE - PEM</h1>
              <p className="text-xs text-emerald-400 font-bold">
                ✅ Caja Abierta
              </p>
            </div>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => setMostrarHistorial(true)}
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-4 py-2 rounded-lg text-sm transition-colors"
            >
              📜 Historial
            </button>
            <button
              onClick={() => setMostrarRetiro(true)}
              className="bg-amber-600 hover:bg-amber-700 text-white font-bold px-4 py-2 rounded-lg text-sm transition-colors"
            >
              💸 Retirar Efectivo
            </button>
            <button
              onClick={prepararCierre}
              className="bg-red-600 hover:bg-red-700 text-white font-bold px-4 py-2 rounded-lg text-sm transition-colors"
            >
              🔒 Cerrar Caja
            </button>
          </div>
        </nav>

        <main className="p-4 max-w-5xl mx-auto w-full space-y-6 flex-grow">
          <div className="bg-slate-800 p-4 rounded-xl border border-slate-700 flex flex-col md:flex-row gap-4 justify-between items-center shadow-lg">
            <input
              type="text"
              placeholder="🔍 Buscar por nombre o matrícula..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              className="w-full md:w-2/3 bg-slate-900 border border-slate-700 rounded-lg p-3 text-sm text-white focus:outline-none focus:border-amber-500"
              autoFocus
            />
            <div className="flex items-center gap-4 text-xs text-slate-400">
              <div className="flex items-center gap-2">
                <span>Tarifa Boletaje:</span>
                <input
                  type="number"
                  value={precioBoleto}
                  onChange={(e) => setPrecioBoleto(Number(e.target.value))}
                  className="w-16 bg-slate-900 border border-slate-700 rounded p-1 text-center font-bold text-amber-500 text-sm"
                  disabled
                />
              </div>
            </div>
          </div>

          <div className="bg-slate-800 p-6 rounded-2xl border border-slate-700 shadow-xl space-y-4">
            <h2 className="text-lg font-bold text-slate-200">
              {busqueda === ''
                ? 'Alumnos (Mostrando primeros 15)'
                : `Resultados de Búsqueda`}
            </h2>
            {alumnosFiltrados.length === 0 ? (
              <p className="text-slate-500 py-4 text-center">
                No se encontraron resultados.
              </p>
            ) : (
              alumnosFiltrados.map((alumno) => (
                <ItemAlumno
                  key={alumno.id}
                  alumno={alumno}
                  onVender={(cant: number, desc: string) =>
                    venderBoletos(alumno, cant, desc)
                  }
                  precioBoleto={precioBoleto}
                  onVincular={setAlumnoAVincular}
                />
              ))
            )}
          </div>
        </main>
      </div>

      {alumnoAVincular && (
        <div className="fixed inset-0 bg-black/90 flex justify-center items-center p-4 z-50">
          <div className="bg-slate-800 p-6 rounded-2xl shadow-2xl w-full max-w-sm border border-slate-700 text-center space-y-4">
            <h2 className="text-xl font-bold text-indigo-400">
              Vincular QR Alumno
            </h2>
            <p className="text-sm text-slate-300">
              Escanea con la pistola lectora o escribe el código del gafete de:
              <br />
              <span className="font-bold text-white text-base">
                {alumnoAVincular.nombre_completo}
              </span>
            </p>

            <form onSubmit={guardarVinculacion} className="space-y-4">
              <input
                type="text"
                required
                autoFocus
                placeholder="Escanea o escribe el código aquí..."
                value={qrTextoManual}
                onChange={(e) => setQrTextoManual(e.target.value)}
                className="w-full bg-slate-900 border border-slate-600 rounded-lg p-3 text-center text-white font-mono focus:border-indigo-500 outline-none"
              />
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setAlumnoAVincular(null);
                    setQrTextoManual('');
                  }}
                  className="w-1/2 bg-slate-700 hover:bg-slate-600 text-white rounded py-2 text-sm font-bold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="w-1/2 bg-indigo-600 hover:bg-indigo-700 text-white rounded py-2 text-sm font-bold"
                >
                  Guardar QR
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {ticketActual && ticketActual.tipo !== 'CIERRE' && (
        <RenderTicket
          ticket={ticketActual}
          onClose={() => setTicketActual(null)}
        />
      )}

      {mostrarHistorial && (
        <div className="fixed inset-0 bg-black/90 flex justify-center items-center p-4 z-50">
          <div className="bg-slate-800 rounded-2xl shadow-2xl w-full max-w-4xl overflow-hidden border border-slate-700 flex flex-col max-h-[95vh]">
            <div className="bg-indigo-900/50 p-6 border-b border-slate-700 flex justify-between items-center">
              <div>
                <h2 className="text-2xl font-bold text-white uppercase">
                  Historial de Ventas
                </h2>
                <div className="mt-2 flex items-center gap-2">
                  <span className="text-sm text-slate-300">
                    Consultar fecha:
                  </span>
                  <input
                    type="date"
                    value={fechaFiltro}
                    onChange={(e) => setFechaFiltro(e.target.value)}
                    className="bg-slate-900 border border-slate-600 rounded p-1 text-sm text-white"
                  />
                </div>
              </div>
              <button
                onClick={() => setMostrarHistorial(false)}
                className="bg-slate-700 hover:bg-slate-600 text-white px-3 py-1 rounded"
              >
                Cerrar
              </button>
            </div>

            <div className="p-6 overflow-y-auto flex-grow bg-slate-800">
              {cargandoHistorial ? (
                <p className="text-center text-slate-400">Cargando...</p>
              ) : ventasDia.length === 0 ? (
                <p className="text-slate-400 text-center">
                  No hay ventas registradas en esta fecha.
                </p>
              ) : (
                <table className="w-full text-left text-sm text-slate-300">
                  <thead className="border-b border-slate-600">
                    <tr>
                      <th className="pb-2">Folio</th>
                      <th className="pb-2">Hora</th>
                      <th className="pb-2">Alumno</th>
                      <th className="pb-2 text-center">Boletos</th>
                      <th className="pb-2 text-right">Monto</th>
                      <th className="pb-2 text-center">Acción</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ventasDia.map((venta) => (
                      <tr
                        key={venta.id}
                        className="border-b border-slate-700 hover:bg-slate-700/50"
                      >
                        <td className="py-3 font-mono text-xs text-amber-400">
                          SITE-
                          {String(venta.folio_secuencial || 0).padStart(5, '0')}
                        </td>
                        <td className="py-3">
                          {new Date(venta.created_at).toLocaleTimeString(
                            'es-MX',
                            { hour: '2-digit', minute: '2-digit' }
                          )}
                        </td>
                        <td className="py-3 font-bold">
                          {venta.alumnos?.nombre_completo}
                        </td>
                        <td className="py-3 text-center text-emerald-400">
                          +{venta.cantidad_boletos}
                        </td>
                        <td className="py-3 text-right font-bold">
                          ${venta.monto_total}
                        </td>
                        <td className="py-3 text-center">
                          <button
                            onClick={() =>
                              cancelarVenta(
                                venta.id,
                                venta.alumno_id,
                                venta.cantidad_boletos
                              )
                            }
                            className="text-xs bg-red-900/50 hover:bg-red-600 text-red-200 px-2 py-1 rounded border border-red-700"
                          >
                            Cancelar Venta
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}

      {mostrarRetiro && (
        <div className="fixed inset-0 bg-black/90 flex justify-center items-center p-4 z-50">
          <div className="bg-slate-800 p-6 rounded-2xl shadow-2xl w-full max-w-sm border border-slate-700">
            <h2 className="text-xl font-bold text-amber-500 mb-4">
              💸 Retiro de Efectivo
            </h2>
            <form onSubmit={realizarRetiro} className="space-y-4">
              <div>
                <label className="text-xs text-slate-400">
                  Monto a retirar:
                </label>
                <input
                  type="number"
                  required
                  min="1"
                  step="0.5"
                  value={montoRetiro}
                  onChange={(e) => setMontoRetiro(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-600 rounded p-2 text-white mt-1"
                  placeholder="$0.00"
                  autoFocus
                />
              </div>
              <div>
                <label className="text-xs text-slate-400">
                  Concepto / Motivo:
                </label>
                <input
                  type="text"
                  required
                  value={conceptoRetiro}
                  onChange={(e) => setConceptoRetiro(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-600 rounded p-2 text-white mt-1"
                  placeholder="Ej. Entrega a Dirección"
                />
              </div>
              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setMostrarRetiro(false)}
                  className="w-full bg-slate-700 text-white rounded py-2 text-sm font-bold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="w-full bg-amber-600 hover:bg-amber-700 text-white rounded py-2 text-sm font-bold"
                >
                  Registrar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {mostrarCierre && resumenCierre && (
        <div className="fixed inset-0 bg-black/90 flex justify-center items-center p-4 z-50">
          <div className="bg-slate-800 p-6 rounded-2xl shadow-2xl w-full max-w-md border border-slate-700">
            <h2 className="text-2xl font-bold text-red-500 mb-4 text-center">
              🔒 Cierre de Caja
            </h2>

            <div className="bg-slate-900 p-4 rounded-lg space-y-2 text-sm mb-6 border border-slate-700">
              <div className="flex justify-between text-slate-300">
                <span>Fondo Inicial:</span>{' '}
                <span>${resumenCierre.fondo.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-emerald-400">
                <span>+ Ingresos por Ventas:</span>{' '}
                <span>${resumenCierre.ventas.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-amber-400">
                <span>- Retiros/Entregas:</span>{' '}
                <span>${resumenCierre.retiros.toFixed(2)}</span>
              </div>
              <div className="border-t border-slate-700 my-2 pt-2 flex justify-between font-bold text-lg text-white">
                <span>Efectivo Esperado:</span>{' '}
                <span>${resumenCierre.esperado.toFixed(2)}</span>
              </div>
            </div>

            <form onSubmit={procesarCierre} className="space-y-4">
              <div className="text-center">
                <label className="text-sm font-bold text-slate-300">
                  ¿Cuánto dinero hay FÍSICAMENTE en caja?
                </label>
                <input
                  type="number"
                  required
                  step="0.5"
                  min="0"
                  value={efectivoCajon}
                  onChange={(e) => setEfectivoCajon(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-500 rounded-lg p-3 mt-2 text-2xl text-center font-bold text-white focus:border-red-500 outline-none"
                  placeholder="$0.00"
                  autoFocus
                />
              </div>
              <div className="flex gap-2 pt-4">
                <button
                  type="button"
                  onClick={() => setMostrarCierre(false)}
                  className="w-1/3 bg-slate-700 text-white rounded py-3 text-sm font-bold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="w-2/3 bg-red-600 hover:bg-red-700 text-white rounded py-3 text-sm font-bold"
                >
                  Confirmar Cierre
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {!ticketActual &&
        !mostrarRetiro &&
        !mostrarCierre &&
        !mostrarHistorial &&
        !alumnoAVincular && (
          <footer className="text-center py-4 print:hidden">
            <p className="text-xs text-slate-600 font-medium tracking-wide">
              System by <span className="text-slate-400">Arturo Diaz</span>
            </p>
          </footer>
        )}
    </div>
  );
}

function ItemAlumno({ alumno, onVender, precioBoleto, onVincular }: any) {
  const [cantidadPersonalizada, setCantidadPersonalizada] = useState(1);
  const saldoCritico = alumno.boletos_disponibles <= 1;

  return (
    <div
      className={`bg-slate-900 p-4 rounded-xl border flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4 ${
        saldoCritico ? 'border-red-500' : 'border-slate-700'
      }`}
    >
      <div>
        <h3 className="font-bold text-slate-200 text-md uppercase">
          {alumno.nombre_completo}
        </h3>
        <div className="flex items-center gap-2 mt-1">
          <p className="text-xs text-slate-400">
            Matrícula: {alumno.matricula}
          </p>
          {alumno.codigo_qr_vinculado ? (
            <span className="text-[10px] bg-indigo-900 text-indigo-300 px-2 py-0.5 rounded border border-indigo-700">
              🔗 QR Vinculado
            </span>
          ) : (
            <button
              onClick={() => onVincular(alumno)}
              className="text-[10px] bg-slate-700 hover:bg-slate-600 text-white px-2 py-0.5 rounded"
            >
              Vincular QR Alumno
            </button>
          )}
        </div>
        <div
          className={`mt-2 inline-block px-3 py-1 rounded-full border ${
            saldoCritico
              ? 'bg-red-500/20 border-red-500 text-red-400'
              : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
          }`}
        >
          <span className="text-xs font-bold">
            🎟️ Saldo: {alumno.boletos_disponibles} Boletos
          </span>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <button
          onClick={() => onVender(1, '1 Boleto')}
          className="bg-slate-800 text-white text-xs px-3 py-2 rounded-lg font-bold"
        >
          1 Boleto (${1 * precioBoleto})
        </button>
        <button
          onClick={() => onVender(5, 'Paquete 5')}
          className="bg-emerald-900/30 text-emerald-400 border border-emerald-800 text-xs px-3 py-2 rounded-lg font-bold"
        >
          📦 5 pz
        </button>
        <div className="flex items-center gap-1 ml-auto xl:ml-2">
          <input
            type="number"
            min="1"
            value={cantidadPersonalizada}
            onChange={(e) =>
              setCantidadPersonalizada(
                Math.max(1, parseInt(e.target.value) || 1)
              )
            }
            className="w-12 bg-slate-800 rounded p-1 text-center text-xs font-bold text-white border border-slate-600"
          />
          <button
            onClick={() =>
              onVender(
                cantidadPersonalizada,
                `${cantidadPersonalizada} Boletos`
              )
            }
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-3 py-1.5 rounded text-xs"
          >
            Cobrar ${cantidadPersonalizada * precioBoleto}
          </button>
        </div>
      </div>
    </div>
  );
}

function RenderTicket({
  ticket,
  onClose,
}: {
  ticket: any;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 bg-black/90 flex justify-center items-center z-50 p-4 print:static print:bg-white print:p-0 print:block">
      <style>{`@media print { @page { margin: 0; size: 80mm 200mm; } body { background: white; -webkit-print-color-adjust: exact; } }`}</style>

      <div className="bg-white text-black p-4 w-full max-w-[320px] print:w-[80mm] print:max-w-[80mm] print:p-2 print:m-0 font-mono shadow-2xl print:shadow-none text-[12px]">
        <div className="flex justify-center mb-3">
          <img
            src="/logo negro.png"
            alt="Logo"
            className="h-12 w-auto max-w-[80%] object-contain grayscale"
          />
        </div>

        {ticket.tipo === 'VENTA' && (
          <>
            <div className="text-center mb-4 border-b border-dashed border-gray-500 pb-3">
              <p className="text-[11px] font-bold">Comprobante de Ingreso</p>
              <p className="text-[11px]">{ticket.fecha}</p>
            </div>
            <div className="space-y-1 mb-4 border-b border-dashed border-gray-500 pb-3">
              <p>
                <span className="font-bold">Folio:</span> {ticket.folio}
              </p>
              <p className="mt-2 font-bold">Alumno:</p>
              <p className="leading-tight">{ticket.nombre}</p>
              <p>
                <span className="font-bold">Matrícula:</span> {ticket.matricula}
              </p>
            </div>
            <div className="mb-4 border-b border-dashed border-gray-500 pb-3">
              <div className="flex justify-between font-bold mb-2">
                <span>CANT</span>
                <span>IMPORTE</span>
              </div>
              <div className="flex justify-between">
                <span>
                  {ticket.cantidad}x {ticket.concepto}
                </span>
                <span>${ticket.total}.00</span>
              </div>
            </div>
            <div className="flex justify-between font-bold mb-4 border-b border-black pb-3 text-sm">
              <span>TOTAL:</span>
              <span>${ticket.total}.00</span>
            </div>
            <div className="text-center mb-6 space-y-1 text-[11px]">
              <p className="inline-block bg-black text-white px-2 py-1 mt-2 font-bold">
                SALDO: {ticket.nuevoSaldo} BOLETOS
              </p>
              <p className="mt-4 italic">¡Gracias por su pago!</p>
            </div>
          </>
        )}

        {ticket.tipo === 'RETIRO' && (
          <>
            <div className="text-center mb-4 border-b border-black pb-3">
              <p className="font-bold text-lg uppercase">Retiro de Efectivo</p>
              <p className="text-[11px]">{ticket.fecha}</p>
            </div>
            <div className="space-y-2 mb-4 border-b border-dashed border-gray-500 pb-3">
              <p>
                <span className="font-bold">Folio de Retiro:</span>{' '}
                {ticket.folio}
              </p>
              <p>
                <span className="font-bold">Concepto:</span> {ticket.concepto}
              </p>
            </div>
            <div className="flex justify-between font-bold mb-8 border-b border-black pb-3 text-sm">
              <span>MONTO RETIRADO:</span>
              <span>${ticket.monto.toFixed(2)}</span>
            </div>
            <div className="mt-12 border-t border-black pt-1 text-center w-3/4 mx-auto">
              <p className="text-[10px]">Firma de Autorización / Recibido</p>
            </div>
            <div className="h-6"></div>
          </>
        )}

        {ticket.tipo === 'CIERRE' && (
          <>
            <div className="text-center mb-4 border-b border-black pb-3">
              <p className="font-bold text-lg uppercase">Cierre de Caja</p>
            </div>
            <div className="space-y-1 mb-4 border-b border-dashed border-gray-500 pb-3 text-[11px]">
              <p>
                <span className="font-bold">Apertura:</span>
                <br />
                {ticket.fechaApertura}
              </p>
              <p>
                <span className="font-bold">Cierre:</span>
                <br />
                {ticket.fechaCierre}
              </p>
            </div>
            <div className="space-y-2 mb-4 border-b border-dashed border-gray-500 pb-3">
              <div className="flex justify-between">
                <span>Fondo Inicial:</span>
                <span>${ticket.fondo.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span>+ Ventas:</span>
                <span>${ticket.ventas.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span>- Retiros:</span>
                <span>${ticket.retiros.toFixed(2)}</span>
              </div>
              <div className="flex justify-between font-bold mt-2 pt-2 border-t border-dashed border-gray-300">
                <span>TOTAL ESPERADO:</span>
                <span>${ticket.esperado.toFixed(2)}</span>
              </div>
            </div>
            <div className="space-y-2 mb-6 border-b border-black pb-3">
              <div className="flex justify-between font-bold">
                <span>EFECTIVO REAL:</span>
                <span>${ticket.real.toFixed(2)}</span>
              </div>
              <div className="flex justify-between font-bold text-[13px] mt-2">
                <span>DIFERENCIA:</span>
                <span className={ticket.diferencia < 0 ? 'text-black' : ''}>
                  ${ticket.diferencia.toFixed(2)}
                </span>
              </div>
              {ticket.diferencia < 0 && (
                <p className="text-[10px] text-center mt-1">
                  (FALTANTE EN CAJA)
                </p>
              )}
              {ticket.diferencia > 0 && (
                <p className="text-[10px] text-center mt-1">
                  (SOBRANTE EN CAJA)
                </p>
              )}
            </div>
            <div className="mt-10 border-t border-black pt-1 text-center w-3/4 mx-auto">
              <p className="text-[10px]">Firma de Cajero / Auditor</p>
            </div>
            <div className="h-6"></div>
          </>
        )}

        <div className="flex gap-2 print:hidden mt-4">
          <button
            onClick={() => window.print()}
            className="w-full bg-slate-800 text-white py-3 rounded font-sans font-bold hover:bg-slate-700 text-sm"
          >
            🖨️ Imprimir
          </button>
          <button
            onClick={onClose}
            className="w-full bg-red-100 text-red-600 py-3 rounded font-sans font-bold hover:bg-red-200 text-sm"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}
