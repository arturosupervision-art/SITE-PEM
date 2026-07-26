'use client';

import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase'; // Ruta para Vercel

export default function ModuloCaja() {
  // ESTADOS PRINCIPALES
  const [cargando, setCargando] = useState(false);
  const [busqueda, setBusqueda] = useState('');
  const [alumnos, setAlumnos] = useState<any[]>([]);
  
  // ESTADOS DE CAJA Y CORTES
  const [cajaAbierta, setCajaAbierta] = useState(false);
  const [montoInicial, setMontoInicial] = useState('');
  const [ventasTurno, setVentasTurno] = useState(0);
  const [retirosTurno, setRetirosTurno] = useState(0);
  const [fechaApertura, setFechaApertura] = useState('');
  
  // ESTADOS DE MODALES
  const [modalHistorial, setModalHistorial] = useState(false);
  const [modalRetiro, setModalRetiro] = useState(false);
  const [modalCierre, setModalCierre] = useState(false);
  const [montoRetiro, setMontoRetiro] = useState('');
  
  // ESTADOS DE QR Y VENTAS
  const [alumnoVincular, setAlumnoVincular] = useState<any>(null);
  const [nuevoQr, setNuevoQr] = useState('');
  const [cantidades, setCantidades] = useState<{ [key: string]: number }>({});

  const TARIFA_BOLETAJE = 20;

  // 1. BUSCAR ALUMNOS
  const buscarAlumnos = async (termino: string = busqueda) => {
    setCargando(true);
    let query = supabase.from('alumnos').select('*').limit(15);
    
    if (termino.trim()) {
      query = query.or(`nombre_completo.ilike.%${termino}%,matricula.ilike.%${termino}%`);
    }
    
    const { data, error } = await query;
    if (!error && data) {
      setAlumnos(data);
    }
    setCargando(false);
  };

  useEffect(() => {
    buscarAlumnos();
  }, []);


  // ==========================================
  // LÓGICA DE TICKETS VISUALES (VENTA, RETIRO Y CIERRE)
  // ==========================================
  const estilosTicket = `
    <style>
      body { font-family: 'Courier New', Courier, monospace; font-size: 14px; color: #000; margin: 0 auto; padding: 20px; max-width: 320px; background: #fff; }
      .center { text-align: center; }
      .left { text-align: left; }
      .right { text-align: right; }
      .bold { font-weight: bold; }
      .divider { border-bottom: 1px dashed #000; margin: 15px 0; }
      .flex { display: flex; justify-content: space-between; }
      .text-xl { font-size: 18px; }
      
      /* Botones que aparecen en la ventana pero NO se imprimen */
      .botones-accion { margin-top: 30px; display: flex; justify-content: center; gap: 10px; }
      .btn { padding: 12px 15px; font-weight: bold; font-family: sans-serif; cursor: pointer; border: none; border-radius: 8px; font-size: 14px; transition: 0.2s; }
      .btn-imprimir { background-color: #10b981; color: white; }
      .btn-imprimir:hover { background-color: #059669; }
      .btn-cerrar { background-color: #ef4444; color: white; }
      .btn-cerrar:hover { background-color: #dc2626; }
      
      @media print { 
        .no-print { display: none !important; } 
        body { padding: 0; margin: 0; max-width: 100%; }
      }
    </style>
  `;

  const lanzarImpresion = (contenidoHTML: string) => {
    const ventanaTicket = window.open('', '_blank', 'width=450,height=700');
    if (!ventanaTicket) {
      alert("⚠️ Tu navegador bloqueó la ventana del ticket. Por favor permite las ventanas emergentes.");
      return;
    }
    
    // Aquí está la corrección: Se agregan botones reales y se quita el cierre automático
    ventanaTicket.document.write(`
      <html>
        <head>
          <title>Visor de Ticket</title>
          ${estilosTicket}
        </head>
        <body>
          ${contenidoHTML}
          
          <div class="botones-accion no-print">
            <button class="btn btn-imprimir" onclick="window.print()">🖨️ Imprimir Ticket</button>
            <button class="btn btn-cerrar" onclick="window.close()">❌ Cerrar</button>
          </div>
        </body>
      </html>
    `);
    ventanaTicket.document.close();
  };

  const imprimirTicketVenta = (alumno: any, cantidad: number, total: number) => {
    const html = `
      <div class="center bold text-xl">SITE - PEM</div>
      <div class="center">Preparatoria Estado de México</div>
      <div class="center" style="margin-top:5px;">TICKET DE VENTA</div>
      <div class="divider"></div>
      <div class="left">Fecha: ${new Date().toLocaleString()}</div>
      <div class="left">Alumno: ${alumno.nombre_completo}</div>
      <div class="left">Matrícula: ${alumno.matricula || 'N/A'}</div>
      <div class="divider"></div>
      <div class="flex"><span>Boletos (${cantidad}x$${TARIFA_BOLETAJE}):</span> <span>$${total}.00</span></div>
      <div class="divider"></div>
      <div class="flex bold text-xl"><span>TOTAL:</span> <span>$${total}.00</span></div>
      <div class="center" style="margin-top:25px;">¡Gracias por tu compra!</div>
    `;
    lanzarImpresion(html);
  };

  const imprimirTicketRetiro = (monto: number) => {
    const html = `
      <div class="center bold text-xl">SITE - PEM</div>
      <div class="center" style="margin-top:5px;">COMPROBANTE DE RETIRO</div>
      <div class="divider"></div>
      <div class="left">Fecha: ${new Date().toLocaleString()}</div>
      <div class="divider"></div>
      <div class="flex bold text-xl"><span>MONTO RETIRADO:</span> <span>$${monto}.00</span></div>
      <div class="divider"></div>
      <div class="center" style="margin-top:60px; border-top:1px solid #000; width:80%; margin-left:auto; margin-right:auto; padding-top:5px;">Firma de Recibido</div>
    `;
    lanzarImpresion(html);
  };

  const imprimirTicketCierre = () => {
    const fondoInicial = Number(montoInicial) || 0;
    const efectivoEsperado = fondoInicial + ventasTurno - retirosTurno;
    
    const html = `
      <div class="center bold text-xl">SITE - PEM</div>
      <div class="center" style="margin-top:5px;">CORTE DE CAJA</div>
      <div class="divider"></div>
      <div class="left">Apertura: ${fechaApertura}</div>
      <div class="left">Cierre: ${new Date().toLocaleString()}</div>
      <div class="divider"></div>
      <div class="flex"><span>Fondo Inicial:</span> <span>$${fondoInicial}.00</span></div>
      <div class="flex"><span>Total Ventas:</span> <span>+$${ventasTurno}.00</span></div>
      <div class="flex"><span>Total Retiros:</span> <span>-$${retirosTurno}.00</span></div>
      <div class="divider"></div>
      <div class="flex bold text-xl"><span>EFECTIVO ESPERADO:</span> <span>$${efectivoEsperado}.00</span></div>
      <div class="divider"></div>
      <div class="center" style="margin-top:60px; border-top:1px solid #000; width:80%; margin-left:auto; margin-right:auto; padding-top:5px;">Firma Cajero</div>
    `;
    lanzarImpresion(html);
  };


  // ==========================================
  // OPERACIONES DE SISTEMA
  // ==========================================
  const handleCobrar = async (alumno: any, cantidad: number) => {
    if (!cajaAbierta) {
      alert("⚠️ Debes abrir la caja primero para realizar ventas.");
      return;
    }

    const total = cantidad * TARIFA_BOLETAJE;
    const confirmacion = window.confirm(`¿Cobrar $${total} por ${cantidad} boletos para ${alumno.nombre_completo}?`);
    if (!confirmacion) return;

    const nuevosBoletos = (alumno.boletos_disponibles || 0) + cantidad;

    const { error: errorAlumno } = await supabase
      .from('alumnos')
      .update({ boletos_disponibles: nuevosBoletos })
      .eq('id', alumno.id);

    const { error: errorCaja } = await supabase
      .from('movimientos_caja')
      .insert([{ tipo: 'venta', monto: total, concepto: `Venta ${cantidad} boletos - ${alumno.matricula}` }]);

    if (!errorAlumno && !errorCaja) {
      setVentasTurno(prev => prev + total);
      imprimirTicketVenta(alumno, cantidad, total); // Abre la ventana del ticket
      buscarAlumnos(); 
    } else {
      alert('❌ Error al registrar la venta.');
    }
  };

  const guardarNuevoQr = async () => {
    if (!nuevoQr.trim()) return;
    const { error } = await supabase
      .from('alumnos')
      .update({ codigo_qr_vinculado: nuevoQr.trim() })
      .eq('id', alumnoVincular.id);

    if (!error) {
      alert('✅ QR Vinculado exitosamente');
      setAlumnoVincular(null);
      setNuevoQr('');
      buscarAlumnos(); 
    } else {
      alert('❌ Error al vincular el QR');
    }
  };

  const handleAbrirCaja = () => {
    if(!montoInicial) return;
    setCajaAbierta(true);
    setFechaApertura(new Date().toLocaleString());
    setVentasTurno(0);
    setRetirosTurno(0);
  };

  const handleRetiro = () => {
    const retiroNum = Number(montoRetiro);
    if(retiroNum > 0) {
      setRetirosTurno(prev => prev + retiroNum);
      imprimirTicketRetiro(retiroNum);
      alert(`Retiro de $${retiroNum} registrado.`);
      setModalRetiro(false);
      setMontoRetiro('');
    }
  };

  const handleCerrarCaja = () => {
    imprimirTicketCierre();
    alert("Caja cerrada correctamente.");
    setCajaAbierta(false);
    setModalCierre(false);
    setMontoInicial('');
  };


  // ==========================================
  // RENDER PANTALLA ABRIR CAJA
  // ==========================================
  if (!cajaAbierta) {
    return (
      <div className="min-h-screen bg-[#020617] flex items-center justify-center p-4">
        <div className="bg-[#0f172a] p-8 rounded-3xl shadow-2xl border border-slate-800 max-w-md w-full text-center">
          <div className="bg-white p-3 rounded-2xl inline-block mb-6">
            <img src="/logo.png" alt="Logo" className="h-16 object-contain" onError={(e) => e.currentTarget.style.display = 'none'} />
          </div>
          <h1 className="text-[#fbbf24] text-2xl font-black mb-2">SITE - PEM</h1>
          <p className="text-slate-400 mb-8">Apertura de Caja</p>
          <input 
            type="number" 
            placeholder="Monto inicial en caja ($)" 
            value={montoInicial}
            onChange={(e) => setMontoInicial(e.target.value)}
            className="w-full bg-[#020617] text-white p-4 rounded-xl border border-slate-700 mb-6 text-center text-lg outline-none focus:border-emerald-500"
          />
          <button 
            onClick={handleAbrirCaja}
            className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-4 rounded-xl transition-colors text-lg shadow-lg"
          >
            Abrir Caja
          </button>
        </div>
      </div>
    );
  }


  // ==========================================
  // RENDER DASHBOARD PRINCIPAL
  // ==========================================
  return (
    <div className="min-h-screen bg-[#020617] p-4 md:p-8 font-sans flex justify-center text-slate-200">
      <div className="w-full max-w-4xl">
        
        {/* HEADER */}
        <div className="flex items-center gap-4 bg-[#0f172a] p-4 rounded-2xl border border-slate-800 mb-6 w-fit">
          <div className="bg-white p-1.5 rounded-lg">
            <img src="/logo.png" alt="Logo" className="h-10 w-auto object-contain" onError={(e) => e.currentTarget.style.display = 'none'} />
          </div>
          <div>
            <h1 className="text-[#fbbf24] font-black text-xl tracking-wide">SITE - PEM</h1>
            <p className="text-emerald-400 text-xs font-bold flex items-center gap-1">✅ Caja Abierta</p>
          </div>
        </div>

        {/* BOTONES SUPERIORES */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <button onClick={() => setModalHistorial(true)} className="bg-[#6366f1] hover:bg-indigo-500 text-white font-bold py-4 px-2 rounded-2xl shadow-lg transition-colors flex flex-col items-center justify-center gap-2 border border-indigo-500/50">
            <span className="text-3xl">📜</span><span>Historial</span>
          </button>
          <button onClick={() => setModalRetiro(true)} className="bg-[#f59e0b] hover:bg-amber-400 text-white font-bold py-4 px-2 rounded-2xl shadow-lg transition-colors flex flex-col items-center justify-center gap-2 border border-amber-500/50">
            <span className="text-3xl">💸</span><span className="text-center leading-tight">Retirar<br/>Efectivo</span>
          </button>
          <button onClick={() => setModalCierre(true)} className="bg-[#ef4444] hover:bg-red-400 text-white font-bold py-4 px-2 rounded-2xl shadow-lg transition-colors flex flex-col items-center justify-center gap-2 border border-red-500/50">
            <span className="text-3xl">🔒</span><span className="text-center leading-tight">Cerrar<br/>Caja</span>
          </button>
        </div>

        {/* BUSCADOR Y TARIFA */}
        <div className="bg-[#0f172a] p-6 rounded-2xl mb-6 border border-slate-800">
          <div className="relative mb-6">
            <span className="absolute left-4 top-3.5 text-slate-400">🔍</span>
            <input 
              type="text" 
              value={busqueda}
              onChange={(e) => { setBusqueda(e.target.value); buscarAlumnos(e.target.value); }}
              placeholder="Buscar por nombre o matrícula..." 
              className="w-full bg-[#020617] text-white rounded-xl py-3 pl-12 pr-4 border border-slate-700 outline-none focus:border-indigo-500 transition-colors" 
            />
          </div>
          <div className="flex justify-center items-center gap-4 text-slate-400">
            <span>Tarifa Boletaje:</span>
            <span className="bg-[#020617] px-6 py-1.5 rounded-xl border border-slate-700 font-black text-[#fbbf24] text-lg">
              {TARIFA_BOLETAJE}
            </span>
          </div>
        </div>

        {/* LISTA DE ALUMNOS */}
        <div className="bg-[#0f172a] p-6 rounded-2xl border border-slate-800">
          <h2 className="font-bold text-lg mb-6">Alumnos (Mostrando primeros 15)</h2>
          {cargando ? <p className="text-slate-400 text-center py-4">Buscando...</p> : alumnos.length === 0 ? <p className="text-slate-500 text-center py-4">No hay resultados.</p> : (
            alumnos.map((alumno) => (
              <div key={alumno.id} className="bg-[#020617] rounded-xl p-5 border border-slate-800 mb-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                  <h3 className="font-bold text-xl uppercase mb-1">{alumno.nombre_completo}</h3>
                  <div className="flex items-center gap-3 mb-3">
                    <span className="text-slate-400 text-sm">Matrícula: {alumno.matricula || 'N/A'}</span>
                    
                    {alumno.codigo_qr_vinculado ? (
                      <span className="text-xs bg-indigo-900/40 text-indigo-300 px-3 py-1 rounded-full border border-indigo-700/50 font-bold">🔗 QR Vinculado</span>
                    ) : (
                      <button onClick={() => setAlumnoVincular(alumno)} className="bg-slate-800 text-slate-300 text-xs px-3 py-1 rounded-full border border-slate-600 hover:bg-slate-700 transition-colors font-medium">
                        Vincular QR Alumno
                      </button>
                    )}
                  </div>
                  <div className="bg-emerald-900/30 text-emerald-400 w-fit px-3 py-1.5 rounded-lg text-sm font-bold border border-emerald-800/50">
                    🎟️ Saldo: {alumno.boletos_disponibles || 0} Boletos
                  </div>
                </div>

                <div className="flex items-center gap-2 bg-[#0f172a] p-2 rounded-lg border border-slate-800">
                  <button onClick={() => handleCobrar(alumno, 1)} className="bg-slate-800 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-slate-700 border border-slate-700">1 Boleto (${TARIFA_BOLETAJE})</button>
                  <button onClick={() => handleCobrar(alumno, 5)} className="bg-emerald-900/40 text-emerald-400 px-4 py-2 rounded-lg text-sm font-medium hover:bg-emerald-900 border border-emerald-800/50 flex gap-1">📦 5 pz</button>
                  <div className="flex items-center gap-2 ml-2 pl-2 border-l border-slate-700">
                    <input type="number" min="1" value={cantidades[alumno.id] || 1} onChange={(e) => setCantidades({...cantidades, [alumno.id]: Number(e.target.value)})} className="w-16 bg-slate-800 border border-slate-600 rounded-lg text-center text-white py-1.5 outline-none" />
                    <button onClick={() => handleCobrar(alumno, cantidades[alumno.id] || 1)} className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-4 py-2 rounded-lg transition-colors">Cobrar</button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* MODAL VINCULAR QR */}
        {alumnoVincular && (
          <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
            <div className="bg-[#0f172a] border border-slate-700 p-6 rounded-2xl w-full max-w-md">
              <h2 className="text-xl font-bold mb-2">Vincular Código QR</h2>
              <p className="text-sm text-slate-400 mb-6">Alumno: <span className="text-white font-bold">{alumnoVincular.nombre_completo}</span></p>
              <input type="text" autoFocus value={nuevoQr} onChange={(e) => setNuevoQr(e.target.value)} placeholder="Escanea el código QR aquí..." className="w-full bg-[#020617] border border-indigo-500/50 rounded-xl px-4 py-3 text-white outline-none mb-6" />
              <div className="flex justify-end gap-3">
                <button onClick={() => { setAlumnoVincular(null); setNuevoQr(''); }} className="px-4 py-2 rounded-lg font-bold text-slate-400 hover:text-white">Cancelar</button>
                <button onClick={guardarNuevoQr} className="px-4 py-2 rounded-lg font-bold bg-indigo-600 hover:bg-indigo-500 text-white">Guardar y Vincular</button>
              </div>
            </div>
          </div>
        )}

        {/* MODAL RETIRO */}
        {modalRetiro && (
          <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
            <div className="bg-[#0f172a] border border-slate-700 p-6 rounded-2xl w-full max-w-sm">
              <h2 className="text-xl font-bold mb-4">Retiro de Efectivo</h2>
              <input type="number" value={montoRetiro} onChange={(e) => setMontoRetiro(e.target.value)} placeholder="Monto a retirar" className="w-full bg-[#020617] border border-slate-700 rounded-xl px-4 py-3 text-white mb-6" />
              <div className="flex justify-end gap-3">
                <button onClick={() => setModalRetiro(false)} className="px-4 py-2 rounded-lg font-bold text-slate-400">Cancelar</button>
                <button onClick={handleRetiro} className="px-4 py-2 rounded-lg font-bold bg-amber-500 text-white">Retirar / Imprimir</button>
              </div>
            </div>
          </div>
        )}

        {/* MODAL CIERRE */}
        {modalCierre && (
          <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
            <div className="bg-[#0f172a] border border-slate-700 p-6 rounded-2xl w-full max-w-sm text-center">
              <span className="text-5xl mb-4 block">🔒</span>
              <h2 className="text-xl font-bold mb-2">¿Cerrar Caja?</h2>
              <p className="text-slate-400 mb-6">Se imprimirá tu corte de caja y ya no podrás hacer más ventas.</p>
              <div className="flex justify-center gap-3">
                <button onClick={() => setModalCierre(false)} className="px-4 py-2 rounded-lg font-bold text-slate-400">Cancelar</button>
                <button onClick={handleCerrarCaja} className="px-4 py-2 rounded-lg font-bold bg-red-500 text-white">Cerrar e Imprimir</button>
              </div>
            </div>
          </div>
        )}

        {/* MODAL HISTORIAL */}
        {modalHistorial && (
          <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
            <div className="bg-[#0f172a] border border-slate-700 p-6 rounded-2xl w-full max-w-md">
              <h2 className="text-xl font-bold mb-4">Historial Reciente</h2>
              <p className="text-slate-400 mb-6 text-sm">Aquí se listarán los movimientos de caja...</p>
              <button onClick={() => setModalHistorial(false)} className="w-full py-2 rounded-lg font-bold bg-slate-800 text-white">Cerrar</button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
