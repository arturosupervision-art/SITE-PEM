'use client';

import React, { useState, useEffect, useRef } from 'react';
import { createClient } from '@supabase/supabase-js';

// Conexión a Supabase usando tus variables de entorno
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const PRECIO_BOLETO = 15; // Ajusta aquí el precio por viaje si es diferente

export default function ModuloCajaViajes() {
  // Estados del turno
  const [turnoActivo, setTurnoActivo] = useState<any>(null);
  const [cajeroNombre, setCajeroNombre] = useState('');
  const [fondoInicial, setFondoInicial] = useState('0');
  const [resumenTurno, setResumenTurno] = useState({ totalVentas: 0, totalBoletos: 0 });

  // Estados de búsqueda NFC y alumno
  const [busqueda, setBusqueda] = useState('');
  const [buscando, setBuscando] = useState(false);
  const [alumno, setAlumno] = useState<any>(null);
  const inputNfcRef = useRef<HTMLInputElement>(null);

  // Estados de venta y vinculación NFC
  const [cantidadBoletos, setCantidadBoletos] = useState(1);
  const [procesandoVenta, setProcesandoVenta] = useState(false);
  const [nuevoNfc, setNuevoNfc] = useState('');
  const [vinculando, setVinculando] = useState(false);

  // Mensajes y último ticket
  const [mensaje, setMensaje] = useState<{ tipo: 'exito' | 'error'; texto: string } | null>(null);
  const [ultimoTicket, setUltimoTicket] = useState<any>(null);

  const mostrarMensaje = (tipo: 'exito' | 'error', texto: string) => {
    setMensaje({ tipo, texto });
    setTimeout(() => setMensaje(null), 5000);
  };

  // Cargar turno abierto al entrar
  useEffect(() => {
    verificarTurnoActivo();
  }, []);

  const verificarTurnoActivo = async () => {
    const { data } = await supabase
      .from('turnos_caja')
      .select('*')
      .eq('estado', 'abierto')
      .order('fecha_apertura', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (data) {
      setTurnoActivo(data);
      cargarResumenTurno(data.id);
    }
  };

  const cargarResumenTurno = async (turnoId: string) => {
    const { data } = await supabase
      .from('ventas_boletos')
      .select('cantidad, monto_total')
      .eq('turno_id', turnoId);

    if (data) {
      const totalVentas = data.reduce((acc, v) => acc + Number(v.monto_total || 0), 0);
      const totalBoletos = data.reduce((acc, v) => acc + Number(v.cantidad || 0), 0);
      setResumenTurno({ totalVentas, totalBoletos });
    }
  };

  const abrirTurno = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cajeroNombre.trim()) {
      mostrarMensaje('error', 'Escribe el nombre del cajero.');
      return;
    }

    const { data, error } = await supabase
      .from('turnos_caja')
      .insert({
        cajero_nombre: cajeroNombre.trim(),
        fondo_inicial: Number(fondoInicial) || 0,
        estado: 'abierto',
        fecha_apertura: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      mostrarMensaje('error', 'Error al abrir turno en Supabase.');
    } else {
      setTurnoActivo(data);
      mostrarMensaje('exito', 'Turno abierto correctamente.');
      setTimeout(() => inputNfcRef.current?.focus(), 200);
    }
  };

  const cerrarTurno = async () => {
    if (!turnoActivo) return;
    const confirmar = window.confirm('¿Seguro que deseas cerrar el turno actual?');
    if (!confirmar) return;

    const { error } = await supabase
      .from('turnos_caja')
      .update({
        estado: 'cerrado',
        fecha_cierre: new Date().toISOString(),
        total_ventas: resumenTurno.totalVentas,
      })
      .eq('id', turnoActivo.id);

    if (error) {
      mostrarMensaje('error', 'No se pudo cerrar el turno.');
    } else {
      setTurnoActivo(null);
      setAlumno(null);
      setUltimoTicket(null);
      setResumenTurno({ totalVentas: 0, totalBoletos: 0 });
      mostrarMensaje('exito', 'Turno cerrado correctamente.');
    }
  };

  // Búsqueda optimizada para lector físico NFC
  const handleBuscarAlumno = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const termino = busqueda.trim();
    if (!termino) return;

    setBuscando(true);
    setAlumno(null);

    try {
      const { data, error } = await supabase
        .from('alumnos')
        .select('*')
        .or(`codigo_qr_vinculado.ilike.${termino},matricula.ilike.%${termino}%,nombre_completo.ilike.%${termino}%`)
        .limit(1)
        .maybeSingle();

      if (error) {
        console.error('Error Supabase:', error);
        mostrarMensaje('error', 'Error al consultar la base de datos.');
      } else if (!data) {
        mostrarMensaje('error', 'Tarjeta NFC o alumno no encontrado.');
      } else {
        setAlumno(data);
        setBusqueda('');
      }
    } catch (err) {
      mostrarMensaje('error', 'Error de conexión al buscar alumno.');
    } finally {
      setBuscando(false);
    }
  };

  // Enviar ticket digital en automático a Telegram
  const enviarTicketTelegram = async (ticket: any, chatIdAlumno?: string) => {
    try {
      const res = await fetch('/api/telegram', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ticket,
          chatId: chatIdAlumno || null,
        }),
      });
      return res.ok;
    } catch (error) {
      console.error('Error enviando ticket a Telegram:', error);
      return false;
    }
  };

  // Ejecutar venta + envío automático
  const ejecutarVenta = async () => {
    if (!alumno || !turnoActivo) return;
    setProcesandoVenta(true);

    const montoTotal = cantidadBoletos * PRECIO_BOLETO;
    const nuevoSaldo = (Number(alumno.boletos_disponibles) || 0) + cantidadBoletos;

    try {
      // 1. Actualizar saldo del alumno
      const { error: errAlumno } = await supabase
        .from('alumnos')
        .update({ boletos_disponibles: nuevoSaldo })
        .eq('id', alumno.id);

      if (errAlumno) throw errAlumno;

      // 2. Registrar la venta
      const { error: errVenta } = await supabase.from('ventas_boletos').insert({
        turno_id: turnoActivo.id,
        alumno_id: alumno.id,
        cantidad: cantidadBoletos,
        monto_total: montoTotal,
        fecha_venta: new Date().toISOString(),
      });

      if (errVenta) throw errVenta;

      // 3. Armar ticket digital
      const ticketData = {
        folio: `VTA-${Date.now().toString().slice(-6)}`,
        fecha: new Date().toLocaleString('es-MX', { timeZone: 'America/Mexico_City' }),
        alumno: alumno.nombre_completo,
        matricula: alumno.matricula,
        cantidad: cantidadBoletos,
        monto: montoTotal,
        nuevoSaldo,
        cajero: turnoActivo.cajero_nombre,
      };

      setUltimoTicket(ticketData);
      setAlumno({ ...alumno, boletos_disponibles: nuevoSaldo });
      await cargarResumenTurno(turnoActivo.id);

      // 4. Enviar a Telegram en automático (sin dar clic en nada)
      const enviado = await enviarTicketTelegram(ticketData, alumno.telegram_chat_id);

      if (enviado) {
        mostrarMensaje('exito', `¡Venta exitosa! +${cantidadBoletos} viajes. Ticket enviado a Telegram.`);
      } else {
        mostrarMensaje('exito', `¡Venta exitosa! +${cantidadBoletos} viajes (No se pudo enviar a Telegram).`);
      }

      setCantidadBoletos(1);
      setTimeout(() => inputNfcRef.current?.focus(), 200);
    } catch (error) {
      console.error(error);
      mostrarMensaje('error', 'Hubo un error al registrar la venta.');
    } finally {
      setProcesandoVenta(false);
    }
  };

  // Vincular nueva tarjeta NFC al alumno
  const vincularNFC = async () => {
    if (!alumno || !nuevoNfc.trim()) return;
    setVinculando(true);

    const { error } = await supabase
      .from('alumnos')
      .update({ codigo_qr_vinculado: nuevoNfc.trim() })
      .eq('id', alumno.id);

    if (error) {
      mostrarMensaje('error', 'No se pudo vincular la tarjeta NFC.');
    } else {
      setAlumno({ ...alumno, codigo_qr_vinculado: nuevoNfc.trim() });
      setNuevoNfc('');
      mostrarMensaje('exito', 'Tarjeta NFC vinculada correctamente.');
    }
    setVinculando(false);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 md:p-8">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Encabezado */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-slate-900 p-6 rounded-2xl border border-slate-800">
          <div>
            <h1 className="text-2xl font-bold text-white">SITE-PEM | Caja de Transporte</h1>
            <p className="text-slate-400 text-sm">Lector NFC activo • Ticket Digital automático vía Telegram</p>
          </div>
          {turnoActivo && (
            <div className="flex items-center gap-4">
              <div className="text-right">
                <p className="text-xs text-slate-400">Cajero: {turnoActivo.cajero_nombre}</p>
                <p className="text-sm font-semibold text-emerald-400">
                  Caja: ${resumenTurno.totalVentas}.00 ({resumenTurno.totalBoletos} viajes)
                </p>
              </div>
              <button
                onClick={cerrarTurno}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-sm font-medium rounded-xl transition"
              >
                Cerrar Turno
              </button>
            </div>
          )}
        </div>

        {/* Alertas */}
        {mensaje && (
          <div
            className={`p-4 rounded-xl font-medium text-sm border ${
              mensaje.tipo === 'exito'
                ? 'bg-emerald-950/60 border-emerald-700 text-emerald-300'
                : 'bg-rose-950/60 border-rose-700 text-rose-300'
            }`}
          >
            {mensaje.texto}
          </div>
        )}

        {/* Si no hay turno abierto */}
        {!turnoActivo ? (
          <form onSubmit={abrirTurno} className="bg-slate-900 p-6 rounded-2xl border border-slate-800 max-w-md mx-auto space-y-4">
            <h2 className="text-lg font-semibold text-white">Abrir Turno de Caja</h2>
            <div>
              <label className="block text-sm text-slate-400 mb-1">Nombre del Cajero</label>
              <input
                type="text"
                value={cajeroNombre}
                onChange={(e) => setCajeroNombre(e.target.value)}
                placeholder="Ej. Juan Pérez"
                className="w-full p-3 rounded-xl bg-slate-950 border border-slate-700 text-white focus:outline-none focus:border-indigo-500"
              />
            </div>
            <div>
              <label className="block text-sm text-slate-400 mb-1">Fondo Inicial ($ MXN)</label>
              <input
                type="number"
                value={fondoInicial}
                onChange={(e) => setFondoInicial(e.target.value)}
                className="w-full p-3 rounded-xl bg-slate-950 border border-slate-700 text-white focus:outline-none focus:border-indigo-500"
              />
            </div>
            <button
              type="submit"
              className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl transition"
            >
              Iniciar Turno
            </button>
          </form>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Columna Izquierda: Buscador NFC y Venta */}
            <div className="lg:col-span-2 space-y-6">
              {/* Buscador NFC */}
              <form onSubmit={handleBuscarAlumno} className="bg-slate-900 p-6 rounded-2xl border border-slate-800 space-y-3">
                <label className="block text-sm font-medium text-indigo-400">
                  Acerca la tarjeta NFC al lector (o escribe matrícula / nombre)
                </label>
                <div className="flex gap-2">
                  <input
                    ref={inputNfcRef}
                    type="text"
                    autoFocus
                    value={busqueda}
                    onChange={(e) => setBusqueda(e.target.value)}
                    placeholder="Escanea tarjeta NFC aquí..."
                    className="flex-1 p-3 rounded-xl bg-slate-950 border border-slate-700 text-white focus:outline-none focus:border-indigo-500"
                  />
                  <button
                    type="submit"
                    disabled={buscando}
                    className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl transition disabled:opacity-50"
                  >
                    {buscando ? 'Buscando...' : 'Buscar'}
                  </button>
                </div>
              </form>

              {/* Tarjeta del Alumno y Venta */}
              {alumno && (
                <div className="bg-slate-900 p-6 rounded-2xl border border-slate-800 space-y-6">
                  <div className="flex justify-between items-start border-b border-slate-800 pb-4">
                    <div>
                      <h2 className="text-xl font-bold text-white">{alumno.nombre_completo}</h2>
                      <p className="text-slate-400 text-sm">Matrícula: {alumno.matricula}</p>
                      <p className="text-xs text-slate-500 mt-1">
                        NFC vinculado: {alumno.codigo_qr_vinculado || 'Sin tarjeta vinculada'}
                      </p>
                    </div>
                    <div className="text-right bg-slate-950 px-4 py-2 rounded-xl border border-slate-800">
                      <p className="text-xs text-slate-400">Saldo Actual</p>
                      <p className="text-2xl font-bold text-emerald-400">{alumno.boletos_disponibles || 0} viajes</p>
                    </div>
                  </div>

                  {/* Selector de Boletos */}
                  <div className="space-y-4">
                    <label className="block text-sm text-slate-300">Cantidad de viajes a comprar:</label>
                    <div className="flex flex-wrap gap-2">
                      {[1, 2, 5, 10, 20].map((num) => (
                        <button
                          key={num}
                          type="button"
                          onClick={() => setCantidadBoletos(num)}
                          className={`px-4 py-2 rounded-xl font-semibold transition ${
                            cantidadBoletos === num
                              ? 'bg-indigo-600 text-white'
                              : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                          }`}
                        >
                          {num} {num === 1 ? 'viaje' : 'viajes'}
                        </button>
                      ))}
                      <input
                        type="number"
                        min={1}
                        value={cantidadBoletos}
                        onChange={(e) => setCantidadBoletos(Math.max(1, Number(e.target.value)))}
                        className="w-24 p-2 rounded-xl bg-slate-950 border border-slate-700 text-center text-white"
                      />
                    </div>

                    <div className="flex items-center justify-between bg-slate-950 p-4 rounded-xl border border-slate-800">
                      <span className="text-slate-400">Total a cobrar:</span>
                      <span className="text-2xl font-bold text-white">
                        ${cantidadBoletos * PRECIO_BOLETO}.00 MXN
                      </span>
                    </div>

                    <button
                      onClick={ejecutarVenta}
                      disabled={procesandoVenta}
                      className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-lg rounded-xl transition disabled:opacity-50"
                    >
                      {procesandoVenta ? 'Procesando y enviando a Telegram...' : 'Cobrar y Enviar Ticket Digital'}
                    </button>
                  </div>

                  {/* Vincular nueva tarjeta NFC */}
                  <div className="pt-4 border-t border-slate-800">
                    <p className="text-xs text-slate-400 mb-2">¿Cambiar o vincular tarjeta NFC a este alumno?</p>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={nuevoNfc}
                        onChange={(e) => setNuevoNfc(e.target.value)}
                        placeholder="Pasa la nueva tarjeta NFC aquí..."
                        className="flex-1 p-2 text-sm rounded-xl bg-slate-950 border border-slate-700 text-white"
                      />
                      <button
                        type="button"
                        onClick={vincularNFC}
                        disabled={vinculando}
                        className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white text-sm rounded-xl transition"
                      >
                        Vincular NFC
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Columna Derecha: Vista previa del último Ticket Digital */}
            <div className="bg-slate-900 p-6 rounded-2xl border border-slate-800 h-fit">
              <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-4">
                Último Ticket Enviado
              </h3>
              {ultimoTicket ? (
                <pre className="bg-slate-950 p-4 rounded-xl border border-slate-800 text-xs text-emerald-300 font-mono overflow-x-auto leading-relaxed">
{`================================
      PREPARATORIA UDL
    TRANSPORTE ESCOLAR
================================
Folio:  ${ultimoTicket.folio}
Fecha:  ${ultimoTicket.fecha}
Cajero: ${ultimoTicket.cajero}
--------------------------------
ALUMNO:
${ultimoTicket.alumno}
Matrícula: ${ultimoTicket.matricula}
--------------------------------
CONCEPTO
Viajes / Boletos:  ${ultimoTicket.cantidad} pza(s)
TOTAL PAGADO:      $${ultimoTicket.monto}.00 MXN
--------------------------------
SALDO ACTUAL:      ${ultimoTicket.nuevoSaldo} viajes
================================
   ¡Gracias por tu compra!
    Comprobante Digital
================================`}
                </pre>
              ) : (
                <p className="text-sm text-slate-500 text-center py-8">
                  Aquí aparecerá el comprobante digital en cuanto realices una venta.
                </p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
