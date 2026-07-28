'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Scanner } from '@yudiel/react-qr-scanner'

export default function ModuloCajaViajes() {
  // ================= ESTADOS DE AUTENTICACIÓN =================
  const [usuarioAutenticado, setUsuarioAutenticado] = useState<any>(null)
  const [loginCorreo, setLoginCorreo] = useState('')
  const [loginPass, setLoginPass] = useState('')
  const [loginError, setLoginError] = useState('')
  const [cargandoLogin, setCargandoLogin] = useState(false)

  // ================= ESTADOS GENERALES =================
  const [cargando, setCargando] = useState(false)
  const [alumnos, setAlumnos] = useState<any[]>([])
  const [busqueda, setBusqueda] = useState('')
  const [escanearVenta, setEscanearVenta] = useState(false)
  const [precioBoleto, setPrecioBoleto] = useState(20)

  // ================= ESTADOS DE CAJA =================
  const [turnoActual, setTurnoActual] = useState<any>(null)
  const [fondoApertura, setFondoApertura] = useState<number | string>(0)
  const [statsTurno, setStatsTurno] = useState({ ventas: 0, retiros: 0, boletos: 0 })
  
  // ================= MODALES DE OPERACIÓN =================
  const [mostrarRetiro, setMostrarRetiro] = useState(false)
  const [montoRetiro, setMontoRetiro] = useState('')
  const [conceptoRetiro, setConceptoRetiro] = useState('')

  const [mostrarCierre, setMostrarCierre] = useState(false)
  const [resumenCierre, setResumenCierre] = useState<any>(null)
  const [efectivoCajon, setEfectivoCajon] = useState('')

  const [mostrarHistorial, setMostrarHistorial] = useState(false)
  const [ventasDia, setVentasDia] = useState<any[]>([])
  const [fechaFiltro, setFechaFiltro] = useState(new Date().toLocaleDateString('en-CA'))
  const [cargandoHistorial, setCargandoHistorial] = useState(false)

  // ================= ESTADOS QR =================
  const [alumnoVincular, setAlumnoVincular] = useState<any>(null)
  const [nuevoQr, setNuevoQr] = useState('')
  const [usarCamara, setUsarCamara] = useState(false)

  // ================= CONTROL DE TICKETS =================
  const [ticketActual, setTicketActual] = useState<any>(null)

  // ================= EFECTOS =================
  useEffect(() => {
    // Solo cargar datos si el usuario ya inició sesión
    if (usuarioAutenticado) {
      verificarTurnoYAlumnos()
    }
  }, [usuarioAutenticado])

  useEffect(() => {
    if (turnoActual) cargarStatsTurno(turnoActual.id, turnoActual.fecha_apertura)
  }, [turnoActual])

  useEffect(() => {
    if (mostrarHistorial) cargarHistorialVentas()
  }, [fechaFiltro, mostrarHistorial])

  // ================= FUNCIONES DE AUTENTICACIÓN =================
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoginError('')
    setCargandoLogin(true)

    try {
      const { data, error } = await supabase
        .from('usuarios')
        .select('*')
        .eq('correo', loginCorreo)
        .eq('contrasena', loginPass)
        .eq('rol', 'cajera')
        .single()

      if (error || !data) {
        setLoginError('Credenciales incorrectas o acceso denegado (Solo Cajeras).')
      } else {
        setUsuarioAutenticado(data)
      }
    } catch (err) {
      setLoginError('Error de conexión con el servidor.')
    } finally {
      setCargandoLogin(false)
    }
  }

  const handleLogout = () => {
    if (turnoActual && turnoActual.estado === 'abierta') {
      if (!window.confirm('⚠️ Tienes una caja abierta. ¿Seguro que deseas cerrar sesión sin hacer el corte?')) {
        return
      }
    }
    setUsuarioAutenticado(null)
    setTurnoActual(null)
    setLoginCorreo('')
    setLoginPass('')
  }

  // ================= FUNCIONES DE CAJA =================
  const verificarTurnoYAlumnos = async () => {
    setCargando(true)
    try {
      const { data: turno } = await supabase.from('turnos_caja').select('*').eq('estado', 'abierta').maybeSingle()
      
      if (turno) {
        setTurnoActual(turno)
      } else {
        const { data: ultimoTurno } = await supabase.from('turnos_caja').select('efectivo_esperado, efectivo_entregado').eq('estado', 'cerrada').order('fecha_cierre', { ascending: false }).limit(1).maybeSingle()
        if (ultimoTurno) {
          const remanente = (ultimoTurno.efectivo_esperado || 0) - (ultimoTurno.efectivo_entregado || 0)
          setFondoApertura(remanente > 0 ? remanente : 0)
        } else {
          setFondoApertura(0)
        }
      }

      const { data: alumnosDb } = await supabase.from('alumnos').select('*').order('nombre_completo', { ascending: true })
      if (alumnosDb) setAlumnos(alumnosDb)
    } catch (error) {
      console.error(error)
    } finally {
      setCargando(false)
    }
  }

  const cargarStatsTurno = async (turnoId: string, fechaApertura: string) => {
    const { data: ventas } = await supabase.from('ventas_boletos').select('monto_total, cantidad_boletos').gte('created_at', fechaApertura)
    const { data: retiros } = await supabase.from('movimientos_caja').select('monto').eq('turno_id', turnoId)
    
    const totalVentas = (ventas || []).reduce((acc, v) => acc + v.monto_total, 0)
    const totalBoletos = (ventas || []).reduce((acc, v) => acc + v.cantidad_boletos, 0)
    const totalRetiros = (retiros || []).reduce((acc, r) => acc + r.monto, 0)
    
    setStatsTurno({ ventas: totalVentas, retiros: totalRetiros, boletos: totalBoletos })
  }

  const abrirCaja = async (e: React.FormEvent) => {
    e.preventDefault()
    const montoInicial = Number(fondoApertura)
    if (montoInicial < 0) return alert('El fondo no puede ser negativo')
    const { data, error } = await supabase.from('turnos_caja').insert([{ fondo_inicial: montoInicial }]).select().single()
    if (error) alert('Error al abrir la caja')
    else setTurnoActual(data)
  }

  const realizarRetiro = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!turnoActual) return
    const monto = parseFloat(montoRetiro)
    if (monto <= 0 || !conceptoRetiro) return alert('Datos inválidos para el retiro')

    const { error } = await supabase.from('movimientos_caja').insert([{ turno_id: turnoActual.id, monto, concepto: conceptoRetiro }])
    if (!error) {
      setTicketActual({ tipo: 'RETIRO', folio: `RET-${Date.now().toString().slice(-5)}`, monto: monto, concepto: conceptoRetiro, fecha: new Date().toLocaleString('es-MX') })
      setMostrarRetiro(false); setMontoRetiro(''); setConceptoRetiro('')
      cargarStatsTurno(turnoActual.id, turnoActual.fecha_apertura)
    } else {
      alert('Error al registrar retiro')
    }
  }

  const prepararCierre = async () => {
    if (!turnoActual) return
    setResumenCierre({ 
      fondo: Number(turnoActual.fondo_inicial), 
      ventas: statsTurno.ventas, 
      retiros: statsTurno.retiros, 
      esperado: Number(turnoActual.fondo_inicial) + statsTurno.ventas - statsTurno.retiros 
    })
    setMostrarCierre(true)
  }

  const procesarCierre = async (e: React.FormEvent) => {
    e.preventDefault()
    const efectivoReal = parseFloat(efectivoCajon)
    if (isNaN(efectivoReal)) return alert('Ingresa un monto válido')
    const diferencia = efectivoReal - resumenCierre.esperado

    if (!window.confirm(`¿Seguro que deseas cerrar la caja?\n\nEfectivo Entregado: $${efectivoReal}\nDiferencia: $${diferencia}`)) return

    const { error } = await supabase.from('turnos_caja').update({
      estado: 'cerrada', fecha_cierre: new Date().toISOString(), total_ventas: resumenCierre.ventas, efectivo_esperado: resumenCierre.esperado, efectivo_entregado: efectivoReal, diferencia_corte: diferencia
    }).eq('id', turnoActual.id)

    if (!error) {
      setTicketActual({ tipo: 'CIERRE', fechaApertura: new Date(turnoActual.fecha_apertura).toLocaleString('es-MX'), fechaCierre: new Date().toLocaleString('es-MX'), fondo: resumenCierre.fondo, ventas: resumenCierre.ventas, retiros: resumenCierre.retiros, esperado: resumenCierre.esperado, real: efectivoReal, diferencia: diferencia })
      setTurnoActual(null); setMostrarCierre(false); setEfectivoCajon(''); setStatsTurno({ventas:0, retiros:0, boletos:0})
    } else {
      alert('Error al cerrar la caja')
    }
  }

  // ================= FUNCIONES DE VIAJES Y VENTAS =================
  const venderBoletos = async (alumno: any, cantidadAgregar: number, concepto: string) => {
    if (!turnoActual) return alert('Debes abrir la caja primero')
    if (cantidadAgregar <= 0) return

    const nuevoSaldo = (alumno.boletos_disponibles || 0) + cantidadAgregar
    const totalCobrado = cantidadAgregar * precioBoleto

    const { error: errAlumno } = await supabase.from('alumnos').update({ boletos_disponibles: nuevoSaldo }).eq('id', alumno.id)
    const { data: dataVenta, error: errVenta } = await supabase.from('ventas_boletos').insert([{ alumno_id: alumno.id, cantidad_boletos: cantidadAgregar, monto_total: totalCobrado }]).select()

    if (errAlumno || errVenta || !dataVenta) {
      alert('❌ Error al procesar la venta.')
    } else {
      setTicketActual({
        tipo: 'VENTA', folio: `SITE-${String(dataVenta[0].folio_secuencial).padStart(5, '0')}`, nombre: alumno.nombre_completo, matricula: alumno.matricula, cantidad: cantidadAgregar, concepto: concepto, total: totalCobrado, nuevoSaldo: nuevoSaldo, fecha: new Date().toLocaleString('es-MX')
      })
      setAlumnos(alumnos.map(a => a.id === alumno.id ? {...a, boletos_disponibles: nuevoSaldo} : a))
      cargarStatsTurno(turnoActual.id, turnoActual.fecha_apertura)
    }
  }

  const cargarHistorialVentas = async () => {
    setCargandoHistorial(true)
    const inicioDia = new Date(`${fechaFiltro}T00:00:00.000`).toISOString()
    const finDia = new Date(`${fechaFiltro}T23:59:59.999`).toISOString()

    const { data, error } = await supabase.from('ventas_boletos').select(`id, created_at, folio_secuencial, cantidad_boletos, monto_total, alumno_id, alumnos ( nombre_completo, matricula )`).gte('created_at', inicioDia).lte('created_at', finDia).order('created_at', { ascending: false })
    if (!error) setVentasDia(data || [])
    setCargandoHistorial(false)
  }

  const cancelarVenta = async (ventaId: string, alumnoId: string, cantidadBoletos: number) => {
    if (!window.confirm(`⚠️ ¿Seguro de cancelar esta venta?\n\nSe descontarán ${cantidadBoletos} boletos de la cuenta del alumno.`)) return
    try {
      const { data: alumno } = await supabase.from('alumnos').select('boletos_disponibles').eq('id', alumnoId).single()
      const nuevoSaldo = Math.max(0, (alumno?.boletos_disponibles || 0) - cantidadBoletos)
      
      await supabase.from('alumnos').update({ boletos_disponibles: nuevoSaldo }).eq('id', alumnoId)
      await supabase.from('ventas_boletos').delete().eq('id', ventaId)

      alert('✅ Venta cancelada.')
      cargarHistorialVentas()
      verificarTurnoYAlumnos()
      if(turnoActual) cargarStatsTurno(turnoActual.id, turnoActual.fecha_apertura)
    } catch (error) {
      alert('❌ Error al cancelar la venta.')
    }
  }

  const guardarNuevoQr = async () => {
    if (!nuevoQr.trim()) return;
    const { error } = await supabase.from('alumnos').update({ codigo_qr_vinculado: nuevoQr.trim() }).eq('id', alumnoVincular.id);
    if (!error) {
      alert('✅ QR Vinculado exitosamente');
      setAlumnoVincular(null); setNuevoQr(''); setUsarCamara(false);
      verificarTurnoYAlumnos(); 
    } else {
      alert('❌ Error al vincular el QR');
    }
  }

  const alumnosFiltrados = alumnos.filter(a => 
    a.nombre_completo?.toLowerCase().includes(busqueda.toLowerCase()) || 
    (a.matricula && a.matricula.toLowerCase().includes(busqueda.toLowerCase()))
  ).slice(0, 15)

  // ================= PANTALLA: LOGIN =================
  if (!usuarioAutenticado) {
    return (
      <div className="min-h-screen bg-[#020617] flex flex-col items-center justify-center p-4">
        <div className="bg-[#0f172a] p-8 rounded-3xl shadow-2xl border border-slate-800 max-w-md w-full text-center">
          <div className="bg-white p-3 rounded-2xl inline-block mb-6 shadow-lg shadow-white/5">
            <img src="/logo negro.png" alt="Logo" className="h-16 object-contain" />
          </div>
          <h1 className="text-[#fbbf24] text-2xl font-black mb-1 tracking-wide">MÓDULO DE CAJA</h1>
          <p className="text-slate-400 mb-8 text-sm">Ingresa tus credenciales para operar</p>
          
          <form onSubmit={handleLogin} className="text-left space-y-5">
            {loginError && (
              <div className="bg-red-900/30 border border-red-500/50 text-red-400 p-3 rounded-lg text-sm font-bold text-center">
                {loginError}
              </div>
            )}
            <div>
              <label className="text-slate-300 font-bold text-sm ml-1 mb-2 block">Correo Electrónico:</label>
              <input 
                type="email" 
                required 
                value={loginCorreo} 
                onChange={(e) => setLoginCorreo(e.target.value)} 
                className="w-full bg-[#020617] text-white p-4 rounded-xl border border-slate-700 text-center outline-none focus:border-indigo-500 transition-colors" 
                placeholder="cajera@escuela.edu.mx"
              />
            </div>
            <div>
              <label className="text-slate-300 font-bold text-sm ml-1 mb-2 block">Contraseña:</label>
              <input 
                type="password" 
                required 
                value={loginPass} 
                onChange={(e) => setLoginPass(e.target.value)} 
                className="w-full bg-[#020617] text-white p-4 rounded-xl border border-slate-700 text-center outline-none focus:border-indigo-500 transition-colors" 
                placeholder="••••••••"
              />
            </div>
            <button 
              type="submit" 
              disabled={cargandoLogin}
              className={`w-full text-white font-bold py-4 rounded-xl transition-all text-lg shadow-lg mt-4 ${cargandoLogin ? 'bg-indigo-800 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-500 shadow-indigo-900/50'}`}
            >
              {cargandoLogin ? 'Verificando...' : '🔐 Iniciar Sesión'}
            </button>
          </form>
        </div>
        <div className="mt-10 text-center text-slate-600 text-sm">
          System by <span className="font-bold">Arturo Díaz</span>
        </div>
      </div>
    )
  }

  // ================= PANTALLA: CARGANDO DATOS =================
  if (cargando) return <div className="min-h-screen bg-[#020617] flex justify-center items-center text-indigo-400 font-bold text-xl">Sincronizando Sistema...</div>

  // ================= PANTALLA: APERTURA DE CAJA =================
  if (!turnoActual) {
    return (
      <div className="min-h-screen bg-[#020617] flex flex-col items-center justify-center p-4">
        {ticketActual?.tipo === 'CIERRE' ? (
          <RenderTicket ticket={ticketActual} onClose={() => setTicketActual(null)} />
        ) : (
          <>
            {/* Header Mini para Logout en Apertura */}
            <div className="absolute top-4 right-4 print:hidden">
              <button onClick={handleLogout} className="bg-slate-800 hover:bg-slate-700 text-slate-300 px-4 py-2 rounded-lg font-bold text-sm border border-slate-700 transition-colors">
                Cerrar Sesión
              </button>
            </div>

            <div className="bg-[#0f172a] p-8 rounded-3xl shadow-2xl border border-slate-800 max-w-md w-full text-center mt-auto">
              <div className="bg-white p-3 rounded-2xl inline-block mb-6">
                <img src="/logo negro.png" alt="Logo" className="h-16 object-contain" />
              </div>
              <h1 className="text-[#fbbf24] text-2xl font-black mb-2">Apertura de Caja</h1>
              <p className="text-slate-400 mb-8 text-sm px-4">Para comenzar a operar, declara el fondo inicial de la caja.</p>
              
              <form onSubmit={abrirCaja} className="text-left">
                <label className="text-white font-bold text-sm ml-1 mb-2 block">Fondo de Caja (MXN):</label>
                <input type="number" required min="0" step="0.5" value={fondoApertura} onChange={(e) => setFondoApertura(e.target.value)} className="w-full bg-[#020617] text-white p-4 rounded-xl border border-slate-700 mb-6 text-center text-xl outline-none focus:border-emerald-500 font-bold" />
                <button type="submit" className="w-full bg-[#10b981] hover:bg-[#059669] text-white font-bold py-4 rounded-xl transition-colors text-lg shadow-lg flex items-center justify-center gap-2">
                  <span>🔓 Abrir Caja y Comenzar</span>
                </button>
              </form>
            </div>
            <div className="mt-auto pb-8 pt-10 text-center text-slate-600 text-sm">
              System by <span className="font-bold text-slate-500">Arturo Díaz</span>
            </div>
          </>
        )}
      </div>
    )
  }

  // ================= PANTALLA: DASHBOARD PRINCIPAL =================
  const efectivoEsperado = Number(turnoActual.fondo_inicial) + statsTurno.ventas - statsTurno.retiros

  return (
    <div className="min-h-screen bg-[#020617] text-slate-200 font-sans p-4 md:p-8 flex flex-col">
      
      <div className={`max-w-5xl mx-auto w-full flex-grow ${ticketActual ? 'hidden print:hidden' : 'block print:hidden'}`}>
        
        {/* HEADER CONTROLES */}
        <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-4">
          <div className="flex items-center gap-4 bg-[#0f172a] p-4 rounded-2xl border border-slate-800 w-full md:w-fit relative overflow-hidden">
            <div className="bg-white p-1.5 rounded-lg h-12 w-12 flex items-center justify-center z-10">
              <img src="/logo negro.png" alt="Logo" className="h-full object-contain" />
            </div>
            <div className="z-10">
              <h1 className="text-[#fbbf24] font-black text-xl tracking-wide">SITE - VIAJES</h1>
              <p className="text-emerald-400 text-xs font-bold flex items-center gap-1">✅ Caja Abierta • {usuarioAutenticado.nombre}</p>
            </div>
            <div className="absolute right-0 top-0 bottom-0 w-32 bg-gradient-to-l from-[#020617] to-transparent opacity-50 z-0 pointer-events-none"></div>
          </div>
          
          <div className="flex gap-2 w-full md:w-auto flex-wrap md:flex-nowrap">
            <button onClick={() => setMostrarHistorial(true)} className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3 px-4 rounded-xl transition-colors flex items-center justify-center gap-2 border border-indigo-500/50">
              <span>📜 Historial</span>
            </button>
            <button onClick={() => setMostrarRetiro(true)} className="flex-1 bg-amber-600 hover:bg-amber-500 text-white font-bold py-3 px-4 rounded-xl transition-colors flex items-center justify-center gap-2 border border-amber-500/50">
              <span>💸 Retirar</span>
            </button>
            <button onClick={prepararCierre} className="flex-1 bg-red-600 hover:bg-red-500 text-white font-bold py-3 px-4 rounded-xl transition-colors flex items-center justify-center gap-2 border border-red-500/50">
              <span>🔒 Cierre</span>
            </button>
            <button onClick={handleLogout} className="flex-none bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold py-3 px-4 rounded-xl transition-colors flex items-center justify-center border border-slate-600 ml-auto md:ml-2">
              <span>🚪 Salir</span>
            </button>
          </div>
        </div>

        {/* DASHBOARD CAJERO */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          <div className="bg-[#0f172a] p-4 rounded-2xl border border-slate-800 text-center">
            <p className="text-slate-400 text-xs font-bold uppercase tracking-wider">Fondo Inicial</p>
            <p className="text-white font-black text-lg">${Number(turnoActual.fondo_inicial).toFixed(2)}</p>
          </div>
          <div className="bg-[#0f172a] p-4 rounded-2xl border border-emerald-900/50 text-center">
            <p className="text-emerald-400/80 text-xs font-bold uppercase tracking-wider">Ventas ({statsTurno.boletos} bts)</p>
            <p className="text-emerald-400 font-black text-lg">+ ${statsTurno.ventas.toFixed(2)}</p>
          </div>
          <div className="bg-[#0f172a] p-4 rounded-2xl border border-amber-900/50 text-center">
            <p className="text-amber-400/80 text-xs font-bold uppercase tracking-wider">Retiros</p>
            <p className="text-amber-400 font-black text-lg">- ${statsTurno.retiros.toFixed(2)}</p>
          </div>
          <div className="bg-indigo-900/20 p-4 rounded-2xl border border-indigo-500/30 text-center shadow-inner shadow-indigo-900/20">
            <p className="text-indigo-300 text-xs font-bold uppercase tracking-wider">Debe Haber en Caja</p>
            <p className="text-indigo-400 font-black text-2xl">${efectivoEsperado.toFixed(2)}</p>
          </div>
        </div>

        {/* BUSCADOR Y ESCÁNER */}
        <div className="bg-[#0f172a] p-6 rounded-2xl mb-6 border border-slate-800 flex flex-col gap-4 shadow-lg">
          <div className="flex flex-col md:flex-row gap-4 justify-between items-center">
            <div className="w-full md:w-2/3 flex gap-2">
              <input type="text" placeholder="Escanear QR o teclea alumno/matrícula..." value={busqueda} onChange={(e) => setBusqueda(e.target.value)} className="w-full bg-[#020617] text-white rounded-xl py-3 px-4 border border-slate-700 outline-none focus:border-indigo-500 transition-colors" autoFocus />
              <button onClick={() => setEscanearVenta(!escanearVenta)} className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold px-4 rounded-xl flex items-center justify-center shadow-md transition-colors whitespace-nowrap">
                {escanearVenta ? '❌ Cerrar' : '📷 Cámara'}
              </button>
            </div>
            <div className="flex items-center gap-3 bg-[#020617] px-4 py-2 rounded-xl border border-slate-700 w-full md:w-auto justify-between md:justify-start">
              <span className="text-slate-400 text-sm font-bold">Tarifa Viaje:</span>
              <span className="font-black text-[#fbbf24] text-xl">${precioBoleto}</span>
            </div>
          </div>

          {escanearVenta && (
            <div className="w-full max-w-sm mx-auto rounded-xl overflow-hidden border-2 border-indigo-500 shadow-lg bg-black">
              <Scanner
                onScan={(result) => {
                  if (result && result.length > 0) {
                    setBusqueda(result[0].rawValue);
                    setEscanearVenta(false);
                  }
                }}
                onError={(error) => console.log("Error de cámara:", error)}
              />
            </div>
          )}
        </div>

        {/* LISTA DE ALUMNOS */}
        <div className="bg-[#0f172a] p-6 rounded-2xl border border-slate-800 shadow-xl mb-6">
          <h2 className="font-bold text-lg mb-6 text-white">{busqueda === '' ? 'Alumnos (Últimos registrados)' : `Resultados de Búsqueda`}</h2>
          
          <div className="space-y-4">
            {alumnosFiltrados.length === 0 ? (
              <p className="text-slate-500 py-4 text-center">No se encontraron alumnos.</p>
            ) : (
              alumnosFiltrados.map((alumno) => (
                <div key={alumno.id} className="bg-[#020617] p-5 rounded-xl border border-slate-800 flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4 hover:border-slate-600 transition-colors">
                  
                  <div className="flex-1">
                    <h3 className="font-bold text-xl uppercase text-slate-100 mb-1">{alumno.nombre_completo}</h3>
                    <div className="flex items-center gap-3 mb-2">
                      <p className="text-sm text-slate-400">Matrícula: {alumno.matricula || 'N/A'}</p>
                      {alumno.codigo_qr_vinculado ? (
                        <span className="text-[10px] bg-indigo-900/40 text-indigo-300 px-2 py-0.5 rounded border border-indigo-700/50 font-bold uppercase tracking-wider">QR OK</span>
                      ) : (
                        <button onClick={() => setAlumnoVincular(alumno)} className="text-[10px] bg-slate-800 text-slate-300 px-2 py-0.5 rounded border border-slate-600 hover:bg-slate-700 font-bold uppercase tracking-wider">Vincular QR</button>
                      )}
                    </div>
                    <div className="bg-emerald-900/20 text-emerald-400 w-fit px-3 py-1 rounded-lg text-sm font-bold border border-emerald-900">
                      🎟️ Saldo: {alumno.boletos_disponibles || 0} Viajes
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 bg-[#0f172a] p-2 rounded-lg border border-slate-800 w-full xl:w-auto">
                    <button onClick={() => venderBoletos(alumno, 1, '1 Boleto Viaje')} className="flex-1 xl:flex-none bg-slate-800 hover:bg-slate-700 text-white px-4 py-3 rounded-lg font-bold border border-slate-700 transition-colors text-sm">1 Boleto (${1 * precioBoleto})</button>
                    <button onClick={() => venderBoletos(alumno, 5, 'Paquete 5 Viajes')} className="flex-1 xl:flex-none bg-emerald-900/40 hover:bg-emerald-800 text-emerald-400 border border-emerald-800/50 px-4 py-3 rounded-lg font-bold transition-colors text-sm">📦 5 Viajes</button>
                    
                    <div className="flex items-center gap-1 flex-1 xl:flex-none mt-2 xl:mt-0 ml-0 xl:ml-2 pl-0 xl:pl-2 xl:border-l border-slate-700 w-full xl:w-auto">
                      <BotonesPersonalizados onCobrar={(cant) => venderBoletos(alumno, cant, `${cant} Boletos Viaje`)} precio={precioBoleto} />
                    </div>
                  </div>

                </div>
              ))
            )}
          </div>
        </div>

      </div>

      <div className={`text-center pb-4 text-slate-600 text-sm ${ticketActual ? 'hidden print:hidden' : 'block print:hidden'}`}>
        System by <span className="font-bold text-slate-500">Arturo Díaz</span>
      </div>

      {/* MODAL VINCULAR QR */}
      {alumnoVincular && (
        <div className="fixed inset-0 bg-black/90 flex items-center justify-center p-4 z-40 print:hidden">
          <div className="bg-[#0f172a] border border-slate-700 p-6 rounded-2xl w-full max-w-md">
            <h2 className="text-xl font-bold mb-2 text-white">Vincular Código QR</h2>
            <p className="text-sm text-slate-400 mb-6">Alumno: <span className="text-amber-500 font-bold">{alumnoVincular.nombre_completo}</span></p>
            
            {usarCamara ? (
              <div className="mb-6">
                <div className="rounded-xl overflow-hidden border-2 border-indigo-500 shadow-lg shadow-indigo-500/20 mb-3 bg-black">
                  <Scanner 
                    onScan={(result) => { if(result && result.length > 0) setNuevoQr(result[0].rawValue) }} 
                    onError={(error) => console.log(error?.message)} 
                  />
                </div>
                {nuevoQr && (
                  <p className="text-center text-emerald-400 font-bold mb-2 break-all bg-emerald-900/20 p-2 rounded-lg border border-emerald-900">
                    ¡Código detectado!: {nuevoQr}
                  </p>
                )}
                <button onClick={() => setUsarCamara(false)} className="w-full bg-slate-800 hover:bg-slate-700 text-white py-2 rounded-lg text-sm transition-colors border border-slate-600">
                  Cerrar Cámara / Usar Pistola
                </button>
              </div>
            ) : (
              <div className="mb-6">
                <input type="text" autoFocus value={nuevoQr} onChange={(e) => setNuevoQr(e.target.value)} placeholder="Escanea con pistola o teclea aquí..." className="w-full bg-[#020617] border border-indigo-500/50 rounded-xl px-4 py-3 text-white outline-none mb-3 font-mono focus:border-indigo-400" />
                <button onClick={() => setUsarCamara(true)} className="w-full bg-indigo-900/40 hover:bg-indigo-800/60 text-indigo-300 border border-indigo-500/50 py-3 rounded-lg text-sm flex justify-center items-center gap-2 font-bold transition-colors">
                  📷 Activar Cámara del Dispositivo
                </button>
              </div>
            )}

            <div className="flex justify-end gap-3 mt-4 border-t border-slate-800 pt-4">
              <button onClick={() => { setAlumnoVincular(null); setNuevoQr(''); setUsarCamara(false); }} className="px-4 py-2 rounded-lg font-bold text-slate-400 hover:text-white">Cancelar</button>
              <button onClick={guardarNuevoQr} disabled={!nuevoQr} className={`px-6 py-2 rounded-lg font-bold text-white transition-colors ${nuevoQr ? 'bg-indigo-600 hover:bg-indigo-500 shadow-lg shadow-indigo-900' : 'bg-slate-700 cursor-not-allowed opacity-50'}`}>
                Vincular y Guardar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL RETIRO */}
      {mostrarRetiro && (
        <div className="fixed inset-0 bg-black/90 flex justify-center items-center p-4 z-40 print:hidden">
          <div className="bg-[#0f172a] border border-slate-700 p-8 rounded-3xl shadow-2xl w-full max-w-sm">
            <h2 className="text-2xl font-black text-amber-500 mb-6 text-center">💸 Retiro de Efectivo</h2>
            <form onSubmit={realizarRetiro} className="space-y-5">
              <div>
                <label className="text-sm font-bold text-slate-400">Monto a retirar ($):</label>
                <input type="number" required min="1" step="0.5" value={montoRetiro} onChange={e => setMontoRetiro(e.target.value)} className="w-full bg-[#020617] border border-slate-600 rounded-xl p-4 text-white mt-1 text-2xl font-bold text-center outline-none focus:border-amber-500" placeholder="0.00" autoFocus />
              </div>
              <div>
                <label className="text-sm font-bold text-slate-400">Concepto / Entregado a:</label>
                <input type="text" required value={conceptoRetiro} onChange={e => setConceptoRetiro(e.target.value)} className="w-full bg-[#020617] border border-slate-600 rounded-xl p-3 text-white mt-1 outline-none focus:border-amber-500" placeholder="Ej. Entrega Dirección" />
              </div>
              <div className="flex gap-3 pt-4">
                <button type="button" onClick={() => setMostrarRetiro(false)} className="w-1/3 bg-slate-800 hover:bg-slate-700 text-white rounded-xl py-3 font-bold transition-colors">Cancelar</button>
                <button type="submit" className="w-2/3 bg-amber-600 hover:bg-amber-500 text-white rounded-xl py-3 font-bold transition-colors shadow-lg">Registrar e Imprimir</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL CIERRE */}
      {mostrarCierre && resumenCierre && (
        <div className="fixed inset-0 bg-black/90 flex justify-center items-center p-4 z-40 print:hidden">
          <div className="bg-[#0f172a] border border-slate-700 p-8 rounded-3xl shadow-2xl w-full max-w-md">
            <h2 className="text-3xl font-black text-red-500 mb-6 text-center">🔒 Cierre de Caja</h2>
            
            <div className="bg-[#020617] p-5 rounded-2xl space-y-3 mb-6 border border-slate-800">
              <div className="flex justify-between text-slate-400 font-medium"><span>Fondo Inicial:</span> <span>${resumenCierre.fondo.toFixed(2)}</span></div>
              <div className="flex justify-between text-emerald-400 font-medium"><span>+ Ventas de Viajes:</span> <span>${resumenCierre.ventas.toFixed(2)}</span></div>
              <div className="flex justify-between text-amber-400 font-medium"><span>- Retiros/Entregas:</span> <span>${resumenCierre.retiros.toFixed(2)}</span></div>
              <div className="border-t border-slate-700 my-2 pt-3 flex justify-between font-black text-xl text-white">
                <span>Efectivo Esperado:</span> <span>${resumenCierre.esperado.toFixed(2)}</span>
              </div>
            </div>

            <form onSubmit={procesarCierre} className="space-y-6">
              <div className="text-center">
                <label className="text-sm font-bold text-slate-400">¿Cuánto dinero FÍSICO vas a entregar?</label>
                <input type="number" required step="0.5" min="0" value={efectivoCajon} onChange={e => setEfectivoCajon(e.target.value)} className="w-full bg-[#020617] border border-slate-500 rounded-xl p-4 mt-2 text-3xl text-center font-black text-white focus:border-red-500 outline-none" placeholder="$0.00" autoFocus />
                <p className="text-[10px] text-slate-500 mt-2">Nota: Si entregas menos de lo esperado, el faltante se asignará como deuda al abrir el próximo turno.</p>
              </div>
              <div className="flex gap-3">
                <button type="button" onClick={() => setMostrarCierre(false)} className="w-1/3 bg-slate-800 text-white rounded-xl py-4 font-bold hover:bg-slate-700">Cancelar</button>
                <button type="submit" className="w-2/3 bg-red-600 hover:bg-red-500 text-white rounded-xl py-4 font-bold shadow-lg shadow-red-900/50">Cerrar Caja e Imprimir</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL HISTORIAL */}
      {mostrarHistorial && (
        <div className="fixed inset-0 bg-black/90 flex justify-center items-center p-4 z-40 print:hidden">
          <div className="bg-[#0f172a] rounded-3xl shadow-2xl w-full max-w-4xl overflow-hidden border border-slate-700 flex flex-col max-h-[90vh]">
            <div className="bg-indigo-900/40 p-6 border-b border-slate-800 flex flex-col md:flex-row justify-between items-center gap-4">
              <div>
                <h2 className="text-2xl font-black text-white">Historial de Viajes (Ventas)</h2>
                <div className="mt-2 flex items-center gap-3">
                  <label htmlFor="fechaFiltro" className="text-sm font-bold text-slate-400 cursor-pointer">Consultar fecha:</label>
                  <input id="fechaFiltro" type="date" value={fechaFiltro} onChange={(e) => setFechaFiltro(e.target.value)} className="bg-[#020617] border border-indigo-500/50 rounded-lg p-2.5 text-sm text-white font-bold outline-none focus:border-indigo-400 shadow-sm cursor-pointer" />
                </div>
              </div>
              <button onClick={() => setMostrarHistorial(false)} className="bg-slate-800 hover:bg-slate-700 border border-slate-600 text-white px-6 py-2 rounded-xl font-bold w-full md:w-auto">Volver a Caja</button>
            </div>

            <div className="p-2 md:p-6 overflow-y-auto flex-grow bg-[#0f172a]">
              {cargandoHistorial ? <p className="text-center text-slate-400 py-10 font-bold">Cargando...</p> : ventasDia.length === 0 ? (
                <p className="text-slate-500 text-center py-10 font-bold">No hay ventas registradas en esta fecha.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm text-slate-300 min-w-[600px]">
                    <thead className="border-b border-slate-700 text-slate-400">
                      <tr>
                        <th className="pb-3 px-2">Folio</th>
                        <th className="pb-3 px-2">Hora</th>
                        <th className="pb-3 px-2">Alumno</th>
                        <th className="pb-3 px-2 text-center">Viajes</th>
                        <th className="pb-3 px-2 text-right">Monto</th>
                        <th className="pb-3 px-2 text-center">Acción</th>
                      </tr>
                    </thead>
                    <tbody>
                      {ventasDia.map((venta) => (
                        <tr key={venta.id} className="border-b border-slate-800 hover:bg-slate-800/50 transition-colors">
                          <td className="py-4 px-2 font-mono text-amber-400 font-bold">SITE-{String(venta.folio_secuencial || 0).padStart(5, '0')}</td>
                          <td className="py-4 px-2">{new Date(venta.created_at).toLocaleTimeString('es-MX', {hour: '2-digit', minute:'2-digit'})}</td>
                          <td className="py-4 px-2 font-bold text-white">{venta.alumnos?.nombre_completo}</td>
                          <td className="py-4 px-2 text-center font-black text-emerald-400">+{venta.cantidad_boletos}</td>
                          <td className="py-4 px-2 text-right font-bold text-white">${venta.monto_total}</td>
                          <td className="py-4 px-2 text-center">
                            <button onClick={() => cancelarVenta(venta.id, venta.alumno_id, venta.cantidad_boletos)} className="text-xs bg-red-900/30 hover:bg-red-600 text-red-400 hover:text-white px-3 py-2 rounded-lg font-bold border border-red-800/50 transition-colors">
                              Cancelar Venta
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* TICKET EN PANTALLA E IMPRESIÓN */}
      {ticketActual && (
        <RenderTicket ticket={ticketActual} onClose={() => setTicketActual(null)} />
      )}

    </div>
  )
}

function BotonesPersonalizados({ onCobrar, precio }: { onCobrar: (cant: number) => void, precio: number }) {
  const [cant, setCant] = useState(1);
  return (
    <div className="flex items-center gap-2 w-full">
      <input type="number" min="1" value={cant} onChange={(e) => setCant(Math.max(1, parseInt(e.target.value) || 1))} className="w-16 bg-[#020617] rounded-lg p-2 text-center text-sm font-bold text-white border border-slate-600 outline-none" />
      <button onClick={() => onCobrar(cant)} className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-4 py-3 rounded-lg text-sm transition-colors shadow-lg">Cobrar ${cant * precio}</button>
    </div>
  )
}

function RenderTicket({ ticket, onClose }: { ticket: any, onClose: () => void }) {
  return (
    <div className="fixed inset-0 bg-black/90 flex justify-center items-center z-[100] p-4 print:p-0 print:bg-white print:block">
      <style>{`
        @media print { 
          @page { margin: 0; size: 80mm auto; } 
          body { background: white; -webkit-print-color-adjust: exact; margin: 0; padding: 0; }
        }
      `}</style>
      <div className="bg-white text-black p-5 w-full max-w-[320px] print:w-[80mm] print:max-w-[80mm] print:p-2 print:m-0 font-mono shadow-2xl print:shadow-none text-[12px] md:text-[14px] print:text-[12px] flex flex-col rounded-xl print:rounded-none">
         
         <div className="flex justify-center mb-3">
           <img src="/logo negro.png" alt="Logo" className="h-16 w-auto object-contain grayscale" />
         </div>
         <div className="text-center font-bold text-lg mb-1">SITE - VIAJES</div>

         {ticket.tipo === 'VENTA' && (
           <>
             <div className="text-center mb-4 border-b border-dashed border-gray-400 pb-3">
                <p className="text-[11px] font-bold uppercase">Comprobante de Viaje</p>
                <p className="text-[11px]">{ticket.fecha}</p>
             </div>
             <div className="space-y-1 mb-4 border-b border-dashed border-gray-400 pb-3">
                <p><span className="font-bold">Folio:</span> {ticket.folio}</p>
                <p className="mt-2 font-bold">Alumno:</p>
                <p className="leading-tight uppercase text-[11px]">{ticket.nombre}</p>
                <p><span className="font-bold">Matrícula:</span> {ticket.matricula || 'N/A'}</p>
             </div>
             <div className="mb-4 border-b border-dashed border-gray-400 pb-3">
                <div className="flex justify-between font-bold mb-2"><span>CANT / DESC</span><span>IMPORTE</span></div>
                <div className="flex justify-between">
                  <span>{ticket.cantidad}x Viaje</span>
                  <span>${ticket.total}.00</span>
                </div>
             </div>
             <div className="flex justify-between font-bold mb-4 border-b border-black pb-3 text-base">
                <span>TOTAL:</span><span>${ticket.total}.00</span>
             </div>
             <div className="text-center mb-6 space-y-1 text-[11px]">
                <p className="inline-block border-2 border-black font-black px-3 py-1 mt-2 text-sm">SALDO: {ticket.nuevoSaldo} VIAJES</p>
                <p className="mt-4 italic">¡Guarde su comprobante!</p>
             </div>
           </>
         )}

         {ticket.tipo === 'RETIRO' && (
           <>
             <div className="text-center mb-4 border-b border-black pb-3 mt-4">
                <p className="font-bold text-lg uppercase">Retiro Efectivo</p>
                <p className="text-[11px]">{ticket.fecha}</p>
             </div>
             <div className="space-y-2 mb-4 border-b border-dashed border-gray-400 pb-3">
                <p><span className="font-bold">Folio Retiro:</span> {ticket.folio}</p>
                <p><span className="font-bold">Concepto:</span> {ticket.concepto}</p>
             </div>
             <div className="flex justify-between font-bold mb-8 border-b border-black pb-3 text-base">
                <span>MONTO:</span><span>${ticket.monto.toFixed(2)}</span>
             </div>
             <div className="mt-16 border-t border-black pt-2 text-center w-4/5 mx-auto">
                <p className="text-[10px] uppercase font-bold">Firma de Recibido</p>
             </div>
             <div className="h-4"></div>
           </>
         )}

         {ticket.tipo === 'CIERRE' && (
           <>
             <div className="text-center mb-4 border-b border-black pb-3 mt-4">
                <p className="font-bold text-xl uppercase">Corte de Caja</p>
             </div>
             <div className="space-y-1 mb-4 border-b border-dashed border-gray-400 pb-3 text-[11px]">
                <p><span className="font-bold">Apertura:</span><br/>{ticket.fechaApertura}</p>
                <p><span className="font-bold">Cierre:</span><br/>{ticket.fechaCierre}</p>
             </div>
             <div className="space-y-2 mb-4 border-b border-dashed border-gray-400 pb-3">
                <div className="flex justify-between"><span>Fondo Inicial:</span><span>${ticket.fondo.toFixed(2)}</span></div>
                <div className="flex justify-between"><span>+ Ventas (Viajes):</span><span>${ticket.ventas.toFixed(2)}</span></div>
                <div className="flex justify-between"><span>- Retiros:</span><span>${ticket.retiros.toFixed(2)}</span></div>
                <div className="flex justify-between font-bold mt-2 pt-2 border-t border-dashed border-gray-400 text-sm">
                  <span>TOTAL ESPERADO:</span><span>${ticket.esperado.toFixed(2)}</span>
                </div>
             </div>
             <div className="space-y-2 mb-6 border-b border-black pb-3">
                <div className="flex justify-between font-black text-sm"><span>EFECTIVO ENTREGADO:</span><span>${ticket.real.toFixed(2)}</span></div>
                <div className="flex justify-between font-bold text-[13px] mt-2">
                  <span>DIFERENCIA:</span>
                  <span>${ticket.diferencia.toFixed(2)}</span>
                </div>
                {ticket.diferencia < 0 && <p className="text-[10px] text-center mt-1 font-bold">(FALTANTE - SE COBRARÁ SIGUIENTE TURNO)</p>}
                {ticket.diferencia > 0 && <p className="text-[10px] text-center mt-1 font-bold">(SOBRANTE EN CAJA)</p>}
                {ticket.diferencia === 0 && <p className="text-[10px] text-center mt-1 font-bold">(CAJA CUADRADA PERFECTA)</p>}
             </div>
             <div className="mt-16 border-t border-black pt-2 text-center w-4/5 mx-auto">
                <p className="text-[10px] uppercase font-bold">Firma de Cajero</p>
             </div>
             <div className="h-4"></div>
           </>
         )}
         
         <div className="flex flex-col gap-2 print:hidden mt-6">
            <button onClick={() => window.print()} className="w-full bg-[#10b981] hover:bg-[#059669] text-white py-4 rounded-xl font-sans font-black text-lg transition-colors shadow-lg">🖨️ IMPRIMIR</button>
            <button onClick={onClose} className="w-full bg-slate-200 hover:bg-slate-300 text-slate-800 py-3 rounded-xl font-sans font-bold text-sm transition-colors">Cerrar y Continuar</button>
         </div>
      </div>
    </div>
  )
}
