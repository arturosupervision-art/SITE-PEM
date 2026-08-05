'use client'
import { useState, useEffect, useRef } from 'react'
import { supabase } from '../../lib/supabase'

export default function PanelAdministracion() {
  // ================= ESTADOS DE AUTENTICACIÓN =================
  const [rol, setRol] = useState<'ADMIN' | 'SUPERADMIN' | null>(null)
  
  const [usuario, setUsuario] = useState('')
  const [password, setPassword] = useState('')
  const [errorAuth, setErrorAuth] = useState(false)
  
  // ================= ESTADO DE VISTA (SOLO SUPERADMIN) =================
  const [vista, setVista] = useState<'FINANZAS' | 'SISTEMA' | 'EMPLEADOS'>('FINANZAS')

  // ================= ESTADOS DEL DASHBOARD (FINANZAS) =================
  const [cargando, setCargando] = useState(false)
  const [ventasDia, setVentasDia] = useState(0)
  const [boletosDia, setBoletosDia] = useState(0)
  const [ventasSemana, setVentasSemana] = useState(0)
  const [retiros, setRetiros] = useState<any[]>([])

  // ================= ESTADOS DE MODALES (FINANZAS) =================
  const [mostrarCorte, setMostrarCorte] = useState(false)
  const [fechaCorte, setFechaCorte] = useState(new Date().toLocaleDateString('en-CA'))
  
  const [mostrarHistorial, setMostrarHistorial] = useState(false)
  const [fechaHistorial, setFechaHistorial] = useState(new Date().toLocaleDateString('en-CA'))
  const [historialUnificado, setHistorialUnificado] = useState<any[]>([])
  const [statsHistorial, setStatsHistorial] = useState({ ventas: 0, retiros: 0, total: 0, boletos: 0 })

  // ================= ESTADOS DE REPORTE POR RANGO =================
  const [mostrarReporteRango, setMostrarReporteRango] = useState(false)
  const [fechaInicioRango, setFechaInicioRango] = useState(new Date().toLocaleDateString('en-CA'))
  const [fechaFinRango, setFechaFinRango] = useState(new Date().toLocaleDateString('en-CA'))
  const [statsRango, setStatsRango] = useState({ ventas: 0, retiros: 0, total: 0, boletos: 0 })
  const [calculandoRango, setCalculandoRango] = useState(false)
  const [rangoCalculado, setRangoCalculado] = useState(false)

  // ================= ESTADO DEL TICKET / REPORTE =================
  const [documentoActual, setDocumentoActual] = useState<any>(null)

  // ================= ESTADOS DE GESTIÓN DE ALUMNOS (SUPER ADMIN) =================
  const [alumnos, setAlumnos] = useState<any[]>([])
  const [busquedaAlumno, setBusquedaAlumno] = useState('')
  const [cargandoAlumnos, setCargandoAlumnos] = useState(false)
  const [mostrarModalAlumno, setMostrarModalAlumno] = useState(false)
  const [mostrarModalMasivo, setMostrarModalMasivo] = useState(false)
  const [mostrarModalEliminarMasivo, setMostrarModalEliminarMasivo] = useState(false)
  const [alumnoEditando, setAlumnoEditando] = useState<any>(null)
  
  // Formulario Individual Alumno
  const [formNombre, setFormNombre] = useState('')
  const [formMatricula, setFormMatricula] = useState('')
  const [formSemestre, setFormSemestre] = useState('1º')
  const [formGrupo, setFormGrupo] = useState('1')
  const [formTurno, setFormTurno] = useState('Matutino')
  const [formQr, setFormQr] = useState('')
  const [formCorreoTutor, setFormCorreoTutor] = useState('')
  const [formTelefonoTutor, setFormTelefonoTutor] = useState('')
  const [formSaldo, setFormSaldo] = useState(0)
  const [guardandoAlumno, setGuardandoAlumno] = useState(false)

  // Estados para Cámara de PC
  const [usandoCamara, setUsandoCamara] = useState(false)
  const [modoCamara, setModoCamara] = useState<'FORMULARIO' | 'BUSQUEDA' | null>(null)
  const videoRef = useRef<HTMLVideoElement>(null)

  // Formulario Carga Masiva y Eliminación Masiva
  const [textoMasivo, setTextoMasivo] = useState('')
  const [cargandoMasivo, setCargandoMasivo] = useState(false)
  const [textoEliminarMasivo, setTextoEliminarMasivo] = useState('')
  const [idsSeleccionados, setIdsSeleccionados] = useState<string[]>([])

  // ================= ESTADOS DE GESTIÓN DE EMPLEADOS =================
  const [empleados, setEmpleados] = useState<any[]>([])
  const [empleadoEditando, setEmpleadoEditando] = useState<any>(null)
  
  const [mostrarModalEmpleado, setMostrarModalEmpleado] = useState(false)
  const [guardandoEmpleado, setGuardandoEmpleado] = useState(false)
  
  const [formEmpRol, setFormEmpRol] = useState('CAJA')
  const [formEmpNombre, setFormEmpNombre] = useState('')
  const [formEmpCorreo, setFormEmpCorreo] = useState('')
  const [formEmpTelefono, setFormEmpTelefono] = useState('')
  const [formEmpPassword, setFormEmpPassword] = useState('')
  const [formEmpRuta, setFormEmpRuta] = useState('') 
  const [formEmpTransporte, setFormEmpTransporte] = useState('Autobus') 
  const [formEmpSemestreAsignado, setFormEmpSemestreAsignado] = useState('1º') 
  const [formEmpTurnoAsignado, setFormEmpTurnoAsignado] = useState('Matutino')

  // ================= FUNCIONES DE LOGIN Y CIERRE =================
  const procesarLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    
    try {
      const { data, error } = await supabase
        .from('usuarios')
        .select('*')
        .eq('correo', usuario)
        .eq('contrasena', password)
        .single();

      if (error || !data) {
        setErrorAuth(true);
        setPassword('');
        return;
      }

      setErrorAuth(false);
      setRol(data.rol.toUpperCase());
      
      if (data.rol.toUpperCase() === 'SUPERADMIN' || data.rol.toUpperCase() === 'ADMIN') {
        cargarDatosDashboard();
        if (data.rol.toUpperCase() === 'SUPERADMIN') {
          cargarAlumnos();
          cargarEmpleados();
        }
      }
    } catch (err) {
      console.error("Error en login:", err);
      alert("Error al conectar con la base de datos.");
    }
  }

  const cerrarSesion = () => {
    setRol(null)
    setUsuario('')
    setPassword('')
    setVista('FINANZAS')
    setErrorAuth(false)
  }

  useEffect(() => {
    if (mostrarHistorial && rol) cargarHistorialCompleto()
  }, [fechaHistorial, mostrarHistorial])

  // ================= FUNCIONES DE CARGA (FINANZAS) =================
  const obtenerLimitesDia = (fechaLocal: string) => {
    return {
      inicio: new Date(`${fechaLocal}T00:00:00.000`).toISOString(),
      fin: new Date(`${fechaLocal}T23:59:59.999`).toISOString()
    }
  }

  const cargarDatosDashboard = async () => {
    setCargando(true)
    const hoyLocal = new Date().toLocaleDateString('en-CA')
    const limitesHoy = obtenerLimitesDia(hoyLocal)

    const fechaActual = new Date()
    const diaSemana = fechaActual.getDay()
    const diff = fechaActual.getDate() - diaSemana + (diaSemana === 0 ? -6 : 1) 
    const fechaLunes = new Date(fechaActual.setDate(diff))
    const lunesLocalStr = fechaLunes.toLocaleDateString('en-CA')
    
    const limitesSemana = {
      inicio: new Date(`${lunesLocalStr}T00:00:00.000`).toISOString(),
      fin: limitesHoy.fin
    }

    try {
      const { data: vHoy } = await supabase.from('ventas_boletos').select('monto_total, cantidad_boletos').gte('created_at', limitesHoy.inicio).lte('created_at', limitesHoy.fin)
      const totalVentasHoy = (vHoy || []).reduce((acc, v) => acc + v.monto_total, 0)
      const totalBoletosHoy = (vHoy || []).reduce((acc, v) => acc + v.cantidad_boletos, 0)
      
      const { data: vSemana } = await supabase.from('ventas_boletos').select('monto_total').gte('created_at', limitesSemana.inicio).lte('created_at', limitesSemana.fin)
      const totalVentasSemana = (vSemana || []).reduce((acc, v) => acc + v.monto_total, 0)

      const { data: rHoy } = await supabase.from('movimientos_caja').select('*').gte('created_at', limitesHoy.inicio).lte('created_at', limitesHoy.fin).order('created_at', { ascending: false })

      setVentasDia(totalVentasHoy)
      setBoletosDia(totalBoletosHoy)
      setVentasSemana(totalVentasSemana)
      setRetiros(rHoy || [])
    } catch (error) {
      console.error(error)
    } finally {
      setCargando(false)
    }
  }

  const cargarHistorialCompleto = async () => {
    const limites = obtenerLimitesDia(fechaHistorial)

    const { data: ventas } = await supabase.from('ventas_boletos').select(`id, created_at, monto_total, cantidad_boletos, folio_secuencial, alumnos ( nombre_completo )`).gte('created_at', limites.inicio).lte('created_at', limites.fin)
    const { data: retirosDb } = await supabase.from('movimientos_caja').select('*').gte('created_at', limites.inicio).lte('created_at', limites.fin)

    let unificado: any[] = []
    let tVentas = 0
    let tRetiros = 0
    let tBoletos = 0 

    if (ventas) {
      ventas.forEach(v => {
        tVentas += v.monto_total
        tBoletos += v.cantidad_boletos
        unificado.push({ tipo: 'VENTA', id: v.id, fecha: v.created_at, folio: `SITE-${String(v.folio_secuencial).padStart(5,'0')}`, descripcion: `Venta: ${v.alumnos?.nombre_completo} (${v.cantidad_boletos} bts)`, monto: v.monto_total })
      })
    }

    if (retirosDb) {
      retirosDb.forEach(r => {
        tRetiros += r.monto
        unificado.push({ tipo: 'RETIRO', id: r.id, fecha: r.created_at, folio: `RET-${r.id.substring(0,5)}`, descripcion: `Retiro: ${r.concepto}`, monto: r.monto })
      })
    }

    unificado.sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime())
    
    setHistorialUnificado(unificado)
    setStatsHistorial({ ventas: tVentas, retiros: tRetiros, total: tVentas - tRetiros, boletos: tBoletos })
  }

  const calcularRangoFechas = async () => {
    setCalculandoRango(true)
    const inicioIso = new Date(`${fechaInicioRango}T00:00:00.000`).toISOString()
    const finIso = new Date(`${fechaFinRango}T23:59:59.999`).toISOString()

    try {
      const { data: ventas } = await supabase.from('ventas_boletos').select('monto_total, cantidad_boletos').gte('created_at', inicioIso).lte('created_at', finIso)
      const { data: retirosDb } = await supabase.from('movimientos_caja').select('monto').gte('created_at', inicioIso).lte('created_at', finIso)

      const vTotales = (ventas || []).reduce((acc, v) => acc + v.monto_total, 0)
      const bTotales = (ventas || []).reduce((acc, v) => acc + v.cantidad_boletos, 0)
      const rTotales = (retirosDb || []).reduce((acc, r) => acc + r.monto, 0)

      setStatsRango({ ventas: vTotales, boletos: bTotales, retiros: rTotales, total: vTotales - rTotales })
      setRangoCalculado(true)
    } catch (error) {
      console.error(error)
    } finally {
      setCalculandoRango(false)
    }
  }

  const generarDocumentoRango = () => {
    setDocumentoActual({
      tipo: 'REPORTE_RANGO',
      fechaInicio: fechaInicioRango,
      fechaFin: fechaFinRango,
      fechaImpresion: new Date().toLocaleString('es-MX'),
      ventas: statsRango.ventas,
      boletos: statsRango.boletos,
      retiros: statsRango.retiros,
      totalNeto: statsRango.total
    })
    setMostrarReporteRango(false)
  }

  const generarCorteZ = async () => {
    const limites = obtenerLimitesDia(fechaCorte)
    const { data: ventas } = await supabase.from('ventas_boletos').select('monto_total, cantidad_boletos').gte('created_at', limites.inicio).lte('created_at', limites.fin)
    const { data: retirosDb } = await supabase.from('movimientos_caja').select('monto').gte('created_at', limites.inicio).lte('created_at', limites.fin)

    const vTotales = (ventas || []).reduce((acc, v) => acc + v.monto_total, 0)
    const bTotales = (ventas || []).reduce((acc, v) => acc + v.cantidad_boletos, 0)
    const rTotales = (retirosDb || []).reduce((acc, r) => acc + r.monto, 0)

    setDocumentoActual({
      tipo: 'CORTE_Z', fechaCorte: fechaCorte, fechaImpresion: new Date().toLocaleString('es-MX'), ventas: vTotales, boletos: bTotales, retiros: rTotales, totalNeto: vTotales - rTotales
    })
    setMostrarCorte(false)
  }

  // ================= FUNCIONES DE CÁMARA PARA PC =================
  const detenerCamara = (streamToStop?: MediaStream, intervalId?: NodeJS.Timeout) => {
    if (intervalId) clearInterval(intervalId);
    if (streamToStop) {
      streamToStop.getTracks().forEach(t => t.stop());
    } else if (videoRef.current && videoRef.current.srcObject) {
      const s = videoRef.current.srcObject as MediaStream;
      s.getTracks().forEach(t => t.stop());
    }
    setUsandoCamara(false);
    setModoCamara(null);
  }

  const iniciarCamara = async (modo: 'FORMULARIO' | 'BUSQUEDA' = 'FORMULARIO') => {
    setModoCamara(modo);
    setUsandoCamara(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        
        if ('BarcodeDetector' in window) {
          const detector = new (window as any).BarcodeDetector({ formats: ['qr_code'] });
          const interval = setInterval(async () => {
            if (videoRef.current && videoRef.current.readyState === videoRef.current.HAVE_ENOUGH_DATA) {
              try {
                const barcodes = await detector.detect(videoRef.current);
                if (barcodes.length > 0) {
                  if (modo === 'FORMULARIO') {
                    setFormQr(barcodes[0].rawValue);
                  } else if (modo === 'BUSQUEDA') {
                    setBusquedaAlumno(barcodes[0].rawValue);
                  }
                  detenerCamara(stream, interval);
                }
              } catch (e) {
                console.error(e);
              }
            }
          }, 500);
        }
      }
    } catch (err: any) {
      alert("Error al acceder a la cámara web: " + err.message);
      setUsandoCamara(false);
      setModoCamara(null);
    }
  }

  // ================= FUNCIONES DE CONTROL DE ALUMNOS (SUPER ADMIN) =================
  const cargarAlumnos = async () => {
    setCargandoAlumnos(true)
    try {
      const { data, error } = await supabase.from('alumnos').select('*').order('nombre_completo', { ascending: true })
      if (!error && data) setAlumnos(data)
    } catch (err) {
      console.error(err)
    } finally {
      setCargandoAlumnos(false)
    }
  }

  const abrirModalNuevoAlumno = () => {
    setAlumnoEditando(null)
    setFormNombre('')
    setFormMatricula('')
    setFormSemestre('1º')
    setFormGrupo('1')
    setFormTurno('Matutino')
    setFormQr('')
    setFormCorreoTutor('')
    setFormTelefonoTutor('')
    setFormSaldo(0)
    setUsandoCamara(false)
    setModoCamara(null)
    setMostrarModalAlumno(true)
  }

  const abrirModalEditarAlumno = (al: any) => {
    setAlumnoEditando(al)
    setFormNombre(al.nombre_completo || '')
    setFormMatricula(al.matricula || '')
    setFormSemestre(al.semestre || '1º')
    setFormGrupo(al.grupo || '1')
    setFormTurno(al.turno || 'Matutino')
    setFormQr(al.codigo_qr || '')
    setFormCorreoTutor(al.correo_tutor || '')
    setFormTelefonoTutor(al.telefono_tutor || '')
    setFormSaldo(al.saldo_actual || 0)
    setUsandoCamara(false)
    setModoCamara(null)
    setMostrarModalAlumno(true)
  }

  const guardarAlumno = async (e: React.FormEvent) => {
    e.preventDefault()
    setGuardandoAlumno(true)
    try {
      const gradoGrupoVal = `${formSemestre} Grupo ${formGrupo}`
      const datosAlumno = {
        nombre_completo: formNombre, matricula: formMatricula, semestre: formSemestre, grupo: formGrupo, turno: formTurno, codigo_qr: formQr, correo_tutor: formCorreoTutor, telefono_tutor: formTelefonoTutor, saldo_actual: formSaldo, grado_grupo: gradoGrupoVal
      }

      if (alumnoEditando) {
        const { error } = await supabase.from('alumnos').update(datosAlumno).eq('id', alumnoEditando.id)
        if (error) throw error
      } else {
        const { error } = await supabase.from('alumnos').insert([datosAlumno])
        if (error) throw error
      }

      detenerCamara()
      setMostrarModalAlumno(false)
      cargarAlumnos()
    } catch (err: any) {
      alert('Error al guardar el alumno: ' + err.message)
    } finally {
      setGuardandoAlumno(false)
    }
  }

  const eliminarAlumnoIndividual = async (id: any, nombre: string) => {
    if (confirm(`¿Estás seguro de eliminar a ${nombre}?`)) {
      try {
        const { error } = await supabase.from('alumnos').delete().eq('id', id)
        if (error) throw error
        cargarAlumnos()
      } catch (err: any) {
        alert('Error al eliminar alumno: ' + err.message)
      }
    }
  }

  const toggleSeleccionAlumno = (id: string) => {
    setIdsSeleccionados(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id])
  }

  const seleccionarTodosActuales = () => {
    if (idsSeleccionados.length === alumnosFiltrados.length) setIdsSeleccionados([])
    else setIdsSeleccionados(alumnosFiltrados.map(a => a.id))
  }

  const eliminarSeleccionadosDirecto = async () => {
    if (idsSeleccionados.length === 0) return
    if (confirm(`¿Eliminar los ${idsSeleccionados.length} alumnos seleccionados?`)) {
      try {
        const { error } = await supabase.from('alumnos').delete().in('id', idsSeleccionados)
        if (error) throw error
        alert('Alumnos eliminados correctamente.')
        setIdsSeleccionados([])
        cargarAlumnos()
      } catch (err: any) {
        alert('Error al eliminar selección: ' + err.message)
      }
    }
  }

  const procesarEliminacionMasiva = async () => {
    if (!textoEliminarMasivo.trim()) return
    try {
      const lineas = textoEliminarMasivo.split('\n')
      const matriculasAEliminar: string[] = []

      lineas.forEach(l => {
        const val = l.trim()
        if (val && !val.toLowerCase().includes('matricula')) {
          matriculasAEliminar.push(val)
        }
      })

      if (matriculasAEliminar.length === 0) {
        alert('No se encontraron matrículas válidas para eliminar.')
        return
      }

      if (confirm(`Se eliminarán los alumnos correspondientes a ${matriculasAEliminar.length} matrículas. ¿Deseas continuar?`)) {
        const { error } = await supabase.from('alumnos').delete().in('matricula', matriculasAEliminar)
        if (error) throw error
        alert('Eliminación masiva completada con éxito.')
        setTextoEliminarMasivo('')
        setMostrarModalEliminarMasivo(false)
        cargarAlumnos()
      }
    } catch (err: any) {
      alert('Error en eliminación masiva: ' + err.message)
    }
  }

  const descargarPlantillaEliminar = () => {
    const contenido = "Nombre,Matricula,Semestre,Grupo,Turno\nJuan Perez Lopez,2026-001,6º,1,Matutino\nMaria Garcia Gomez,2026-002,6º,2,Vespertino"
    const blob = new Blob([contenido], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', 'plantilla_eliminar_alumnos.csv')
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const procesarCargaMasiva = async () => {
    if (!textoMasivo.trim()) return
    setCargandoMasivo(true)

    try {
      const lineas = textoMasivo.split('\n')
      const nuevosAlumnos: any[] = []

      lineas.forEach(linea => {
        const l = linea.trim()
        if (l && !l.toLowerCase().includes('nombre')) {
          const partes = l.split(',')
          if (partes.length >= 1) {
            const sem = partes[2]?.trim() || '1º'
            const grupo = partes[3]?.trim() || '1'
            nuevosAlumnos.push({
              nombre_completo: partes[0]?.trim(), matricula: partes[1]?.trim() || '', semestre: sem, grupo: grupo, turno: partes[4]?.trim() || 'Matutino', codigo_qr: partes[5]?.trim() || '', correo_tutor: partes[6]?.trim() || '', telefono_tutor: partes[7]?.trim() || '', saldo_actual: parseFloat(partes[8]?.trim()) || 0, grado_grupo: `${sem} Grupo ${grupo}`
            })
          }
        }
      })

      if (nuevosAlumnos.length === 0) {
        alert('No se encontraron registros válidos para procesar.')
        return
      }

      const { error } = await supabase.from('alumnos').insert(nuevosAlumnos)
      if (error) throw error

      alert(`¡Éxito! Se subieron ${nuevosAlumnos.length} alumnos correctamente.`)
      setTextoMasivo('')
      setMostrarModalMasivo(false)
      cargarAlumnos()
    } catch (err: any) {
      alert('Error al realizar la carga masiva: ' + err.message)
    } finally {
      setCargandoMasivo(false)
    }
  }

  const descargarPlantilla = () => {
    const contenido = "Nombre Completo,Matricula,Semestre,Grupo,Turno,Codigo QR,Correo Tutor,Telefono Tutor,Saldo Inicial\nJuan Perez Lopez,2026-001,6º,1,Matutino,QR-1001,tutor.juan@email.com,5512345678,0\nMaria Garcia Gomez,2026-002,6º,2,Vespertino,QR-1002,tutor.maria@email.com,5587654321,50"
    const blob = new Blob([contenido], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', 'plantilla_alumnos_site.csv')
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const descargarBaseDatosAlumnos = () => {
    if (alumnos.length === 0) {
      alert('No hay alumnos para exportar.')
      return
    }
    let csv = "Nombre Completo,Matricula,Semestre,Grupo,Turno,Codigo QR,Correo Tutor,Telefono Tutor,Saldo Actual\n"
    alumnos.forEach(a => {
      csv += `"${a.nombre_completo || ''}","${a.matricula || ''}","${a.semestre || ''}","${a.grupo || ''}","${a.turno || ''}","${a.codigo_qr || ''}","${a.correo_tutor || ''}","${a.telefono_tutor || ''}",${a.saldo_actual || 0}\n`
    })
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', 'base_datos_alumnos_actual.csv')
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const cargarArchivoMasivo = (e: React.ChangeEvent<HTMLInputElement>, tipo: 'CARGA' | 'ELIMINAR') => {
    const file = e.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onload = (event) => {
        const contenido = event.target?.result as string
        if (contenido) {
          if (tipo === 'CARGA') {
            setTextoMasivo(contenido)
          } else {
            const lineas = contenido.split('\n')
            const matriculasExtraidas: string[] = []
            lineas.forEach(l => {
              const row = l.trim()
              if (row) {
                const partes = row.split(',')
                const mat = partes.length > 1 ? partes[1].replace(/"/g, '').trim() : row.replace(/"/g, '').trim()
                if (mat && !mat.toLowerCase().includes('matricula')) {
                  matriculasExtraidas.push(mat)
                }
              }
            })
            setTextoEliminarMasivo(matriculasExtraidas.join('\n'))
          }
        }
      }
      reader.readAsText(file)
    }
  }

  const alumnosFiltrados = alumnos.filter(a => 
    a.nombre_completo?.toLowerCase().includes(busquedaAlumno.toLowerCase()) ||
    a.matricula?.toLowerCase().includes(busquedaAlumno.toLowerCase()) ||
    a.codigo_qr?.toLowerCase().includes(busquedaAlumno.toLowerCase()) ||
    a.correo_tutor?.toLowerCase().includes(busquedaAlumno.toLowerCase()) ||
    a.telefono_tutor?.toLowerCase().includes(busquedaAlumno.toLowerCase())
  )

  // ================= FUNCIONES DE EMPLEADOS =================
  const cargarEmpleados = async () => {
    const { data, error } = await supabase
      .from('usuarios')
      .select('*')
      .order('id', { ascending: false });

    if (error) {
      console.error("Error cargando empleados:", error);
    } else {
      setEmpleados(data || []);
    }
  };

  const abrirModalNuevoEmpleado = () => {
    setEmpleadoEditando(null)
    setFormEmpRol('CAJA')
    setFormEmpNombre('')
    setFormEmpCorreo('')
    setFormEmpTelefono('')
    setFormEmpPassword('')
    setFormEmpRuta('')
    setFormEmpTransporte('Autobus')
    setFormEmpSemestreAsignado('1º')
    setFormEmpTurnoAsignado('Matutino')
    setMostrarModalEmpleado(true)
  }

  const editarEmpleado = (emp: any) => {
    setEmpleadoEditando(emp)
    setFormEmpRol(emp.rol)
    setFormEmpNombre(emp.nombre)
    setFormEmpCorreo(emp.correo)
    setFormEmpTelefono(emp.telefono || '')
    setFormEmpPassword(emp.contrasena)
    setMostrarModalEmpleado(true)
  }

  const eliminarEmpleado = async (id: string) => {
    if(window.confirm("¿Estás seguro de que deseas eliminar a este empleado? Esta acción no se puede deshacer.")) {
      const { error } = await supabase
        .from('usuarios')
        .delete()
        .eq('id', id);
        
      if (error) {
        alert("Error al eliminar el empleado.");
        return;
      }
      cargarEmpleados();
    }
  }

  const guardarEmpleado = async (e: React.FormEvent) => {
    e.preventDefault()
    setGuardandoEmpleado(true)

    try {
      const datosEmpleado: any = {
        rol: formEmpRol,
        nombre: formEmpNombre,
        correo: formEmpCorreo,
        telefono: formEmpTelefono,
        contrasena: formEmpPassword
      }

      if (formEmpRol === 'CHOFER') {
        datosEmpleado.ruta_asignada = formEmpRuta
        datosEmpleado.tipo_transporte = formEmpTransporte
      } else if (formEmpRol === 'COORDINADOR') {
        datosEmpleado.semestre_asignado = formEmpSemestreAsignado
        datosEmpleado.turno_asignado = formEmpTurnoAsignado
      }
      
      if (empleadoEditando) {
        const { error } = await supabase
          .from('usuarios')
          .update(datosEmpleado)
          .eq('id', empleadoEditando.id);
          
        if (error) throw error;
        alert("Empleado actualizado con éxito.");
      } else {
        const { error } = await supabase
          .from('usuarios')
          .insert([datosEmpleado]);
          
        if (error) throw error;
        alert(`Empleado ${formEmpNombre} (${formEmpRol}) dado de alta con éxito.`);
      }
      
      setMostrarModalEmpleado(false)
      cargarEmpleados();
    } catch (err: any) {
      alert('Error al guardar empleado: ' + err.message)
    } finally {
      setGuardandoEmpleado(false)
    }
  }


  // ================= RENDERIZADO DEL LOGIN SECUENCIAL =================
  if (!rol) {
    return (
      <div className="min-h-screen bg-[#020617] flex items-center justify-center p-4">
        <div className="bg-[#0f172a] p-8 rounded-2xl shadow-2xl border border-slate-800 max-w-sm w-full relative overflow-hidden">
          
          <div className="text-center mb-6 relative z-10">
            <h1 className="text-2xl font-black text-white mb-2">SITE-PEM</h1>
            <p className="text-slate-400 text-sm">Panel de Administración Central</p>
          </div>

          <form onSubmit={procesarLogin} className="flex flex-col gap-4 relative z-10">
            <div className="animate-fade-in space-y-4">
              <p className="text-indigo-400 text-xs text-center font-bold mb-4 uppercase tracking-wider">
                Identificación de Usuario
              </p>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                  Usuario / Correo
                </label>
                <input
                  type="text"
                  value={usuario}
                  onChange={(e) => setUsuario(e.target.value)}
                  placeholder="Escriba su usuario"
                  className={`w-full bg-[#020617] border ${errorAuth ? 'border-red-500' : 'border-slate-700'} rounded-xl p-3 text-white text-sm outline-none focus:border-indigo-500 transition-colors`}
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                  Contraseña
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className={`w-full bg-[#020617] border ${errorAuth ? 'border-red-500' : 'border-slate-700'} rounded-xl p-3 text-white text-sm outline-none focus:border-indigo-500 transition-colors`}
                />
              </div>
              {errorAuth && (
                <p className="text-red-400 text-xs font-bold mt-1 text-center animate-pulse">
                  Credenciales incorrectas.
                </p>
              )}
              
              <button 
                type="submit" 
                className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3 rounded-xl transition-colors mt-2"
              >
                Ingresar al Sistema
              </button>
            </div>
          </form>
        </div>
      </div>
    )
  }

  if (cargando) return <div className="min-h-screen bg-[#020617] flex justify-center items-center text-white font-bold text-xl">Cargando Sistema...</div>

  // ================= RENDERIZADO DEL PANEL PRINCIPAL =================
  return (
    <div className="min-h-screen bg-[#020617] text-slate-200 font-sans p-4 md:p-8">
      
      {/* HEADER PRINCIPAL */}
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-start md:items-center mb-8 border-b border-slate-800 pb-4 gap-4">
        <div>
          <h3 className="text-indigo-400 font-bold text-sm tracking-widest uppercase">
            SITE-PEM • {rol === 'SUPERADMIN' ? 'SUPER ADMINISTRADOR (MODO DIOS)' : 'FINANZAS'}
          </h3>
          <h1 className="text-white font-black text-3xl">Panel Central</h1>
        </div>
        
        <div className="flex flex-wrap gap-3">
          {rol === 'SUPERADMIN' && (
            <div className="bg-[#0f172a] rounded-xl border border-slate-800 p-1 flex flex-wrap gap-1 mr-2">
              <button 
                onClick={() => setVista('FINANZAS')} 
                className={`px-4 py-2 rounded-lg font-bold text-sm transition-colors ${vista === 'FINANZAS' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'}`}
              >
                💵 Finanzas
              </button>
              <button 
                onClick={() => setVista('SISTEMA')} 
                className={`px-4 py-2 rounded-lg font-bold text-sm transition-colors ${vista === 'SISTEMA' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'}`}
              >
                🎓 Alumnos
              </button>
              <button 
                onClick={() => setVista('EMPLEADOS')} 
                className={`px-4 py-2 rounded-lg font-bold text-sm transition-colors ${vista === 'EMPLEADOS' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'}`}
              >
                🧑‍💼 Empleados
              </button>
            </div>
          )}

          {vista === 'FINANZAS' && (
            <button 
              onClick={() => { setMostrarReporteRango(true); setRangoCalculado(false); }} 
              className="bg-indigo-900/40 hover:bg-indigo-800/60 text-indigo-400 border border-indigo-800/50 px-5 py-2.5 rounded-xl font-bold transition-colors text-sm flex items-center gap-2"
            >
              📅 Reporte Rango
            </button>
          )}

          {rol === 'ADMIN' && (
            <a 
              href="/Coordinador" 
              target="_blank" 
              className="bg-slate-800 hover:bg-slate-700 text-indigo-400 border border-slate-700 px-5 py-2.5 rounded-xl font-bold transition-colors text-sm flex items-center gap-2"
            >
              📋 Módulo Coordinador
            </a>
          )}
          
          <button 
            onClick={cerrarSesion} 
            className="bg-red-900/30 hover:bg-red-800/50 text-red-400 px-5 py-2.5 rounded-xl font-bold transition-colors border border-red-900/50 text-sm"
          >
            Cerrar Sesión
          </button>
        </div>
      </div>

      {/* ================= CONTENIDO: VISTA FINANZAS ================= */}
      {vista === 'FINANZAS' && (
        <>
          <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="bg-[#0f172a] rounded-2xl border border-emerald-900/50 p-6 flex flex-col items-center justify-center relative overflow-hidden shadow-lg">
              <div className="absolute top-0 left-0 w-full h-1 bg-emerald-500"></div>
              <span className="text-3xl mb-2">💵</span>
              <p className="text-slate-400 font-bold text-xs uppercase tracking-widest mb-1 text-center">Ingresos Acumulados (Hoy)</p>
              <p className="text-white font-black text-4xl mb-4">${ventasDia.toFixed(2)}</p>
              <button onClick={() => setMostrarCorte(true)} className="bg-emerald-900/40 hover:bg-emerald-800/60 text-emerald-400 border border-emerald-800/50 px-4 py-2 rounded-lg font-bold text-sm flex items-center gap-2 transition-colors">
                🖨️ Imprimir Corte Z
              </button>
            </div>

            <div className="bg-[#0f172a] rounded-2xl border border-pink-900/50 p-6 flex flex-col items-center justify-center relative overflow-hidden shadow-lg">
              <div className="absolute top-0 left-0 w-full h-1 bg-pink-500"></div>
              <span className="text-3xl mb-2">🎟️</span>
              <p className="text-slate-400 font-bold text-xs uppercase tracking-widest mb-1 text-center">Boletos Vendidos (Hoy)</p>
              <p className="text-white font-black text-4xl">{boletosDia}</p>
            </div>

            <div className="bg-[#0f172a] rounded-2xl border border-indigo-900/50 p-6 flex flex-col items-center justify-center relative overflow-hidden shadow-lg">
              <div className="absolute top-0 left-0 w-full h-1 bg-indigo-500"></div>
              <span className="text-3xl mb-2">📊</span>
              <p className="text-slate-400 font-bold text-xs uppercase tracking-widest mb-1 text-center">Ventas Semanales</p>
              <p className="text-white font-black text-4xl mb-4">${ventasSemana.toFixed(2)}</p>
              <button onClick={() => setMostrarHistorial(true)} className="bg-slate-800 hover:bg-slate-700 text-white border border-slate-600 px-4 py-2 rounded-lg font-bold text-sm transition-colors">
                Ver Historial
              </button>
            </div>
          </div>
          
          <div className="max-w-7xl mx-auto bg-[#0f172a] rounded-2xl border border-slate-800 overflow-hidden shadow-xl">
            <div className="p-6 border-b border-slate-800 flex justify-between items-center bg-slate-900/50">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">💸 Retiros de Caja (Hoy)</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-[#020617] text-slate-400 text-xs uppercase tracking-wider">
                    <th className="p-4 font-bold border-b border-slate-800">Hora</th>
                    <th className="p-4 font-bold border-b border-slate-800">Concepto</th>
                    <th className="p-4 font-bold border-b border-slate-800 text-right">Monto</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {retiros.length === 0 ? (
                    <tr><td colSpan={3} className="p-8 text-center text-slate-500">No hay retiros registrados hoy.</td></tr>
                  ) : (
                    retiros.map((r, i) => (
                      <tr key={i} className="hover:bg-slate-800/30 transition-colors">
                        <td className="p-4 text-sm text-slate-300">{new Date(r.created_at).toLocaleTimeString('es-MX', {hour: '2-digit', minute:'2-digit'})}</td>
                        <td className="p-4 text-sm text-white font-medium">{r.concepto}</td>
                        <td className="p-4 text-sm text-pink-400 font-bold text-right">-${r.monto.toFixed(2)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* ================= CONTENIDO: VISTA ALUMNOS (SISTEMA) ================= */}
      {vista === 'SISTEMA' && rol === 'SUPERADMIN' && (
        <div className="max-w-7xl mx-auto space-y-8 animate-fade-in">
          
          {/* ACCESOS DIRECTOS */}
          <div className="bg-[#0f172a] rounded-2xl border border-indigo-900/40 p-6 shadow-xl">
            <h2 className="text-xl font-black text-white mb-4 flex items-center gap-2">
              🚀 Acceso Directo a Módulos
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <a href="/" target="_blank" className="bg-slate-900 hover:bg-slate-800 border border-slate-700 p-4 rounded-xl flex items-center gap-3 transition-colors group">
                <span className="text-2xl">🎟️</span>
                <div>
                  <p className="text-white font-bold text-sm group-hover:text-indigo-400">Punto de Venta</p>
                  <p className="text-slate-500 text-xs">Venta de boletos / Escáner</p>
                </div>
              </a>
              <a href="/Chofer" target="_blank" className="bg-slate-900 hover:bg-slate-800 border border-slate-700 p-4 rounded-xl flex items-center gap-3 transition-colors group">
                <span className="text-2xl">🚌</span>
                <div>
                  <p className="text-white font-bold text-sm group-hover:text-indigo-400">Módulo de Chofer</p>
                  <p className="text-slate-500 text-xs">Validación en unidad</p>
                </div>
              </a>
              <a href="/Coordinador" target="_blank" className="bg-slate-900 hover:bg-slate-800 border border-slate-700 p-4 rounded-xl flex items-center gap-3 transition-colors group">
                <span className="text-2xl">📋</span>
                <div>
                  <p className="text-white font-bold text-sm group-hover:text-indigo-400">Módulo de Coordinador</p>
                  <p className="text-slate-500 text-xs">Registros de ascenso</p>
                </div>
              </a>
            </div>
          </div>

          {/* TABLA DE CONTROL DE ALUMNOS ÍNTEGRA */}
          <div className="bg-[#0f172a] rounded-2xl border border-slate-800 shadow-xl overflow-hidden">
            <div className="p-6 border-b border-slate-800 flex flex-col md:flex-row justify-between items-center gap-4 bg-slate-900/50">
              <div>
                <h2 className="text-xl font-bold text-white flex items-center gap-2">🎓 Control de Alumnos ({alumnos.length})</h2>
                <p className="text-slate-400 text-xs mt-1">Gestiona la base de datos de estudiantes</p>
              </div>
              <div className="flex flex-wrap w-full md:w-auto gap-2">
                <button onClick={abrirModalNuevoAlumno} className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold px-3 py-2 rounded-xl text-xs transition-colors flex items-center gap-1">➕ Nuevo Alumno</button>
              </div>
            </div>

            <div className="p-6">
              <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-6">
                
                {/* AQUI ESTÁ EL CONTENEDOR DE BÚSQUEDA CORREGIDO CON SU BOTÓN DE ESCÁNER */}
                <div className="relative w-full md:w-1/2">
                  <input
                    type="text"
                    placeholder="Buscar por nombre, matrícula, correo o QR..."
                    value={busquedaAlumno}
                    onChange={(e) => setBusquedaAlumno(e.target.value)}
                    className="w-full bg-[#020617] border border-slate-700 rounded-xl py-3 pl-4 pr-12 text-white text-sm outline-none focus:border-indigo-500"
                  />
                  <button
                    type="button"
                    onClick={() => iniciarCamara('BUSQUEDA')}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-indigo-400 transition-colors"
                    title="Escanear QR de alumno"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3 4a1 1 0 011-1h4a1 1 0 010 2H5v3a1 1 0 01-2 0V4zm14-1a1 1 0 011 1v3a1 1 0 01-2 0V5h-3a1 1 0 010-2h4zM3 20a1 1 0 011 1h4a1 1 0 010-2H5v-3a1 1 0 01-2 0v4zm14 1a1 1 0 011-1v-4a1 1 0 01-2 0v3h-3a1 1 0 010 2h4z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 9h6v6H9z" />
                    </svg>
                  </button>
                </div>
                
                <div className="flex flex-wrap gap-2">
                  {idsSeleccionados.length > 0 && (
                    <button onClick={eliminarSeleccionadosDirecto} className="bg-red-600 hover:bg-red-500 text-white font-bold px-3 py-2 rounded-xl text-xs transition-colors animate-pulse">
                      Eliminar ({idsSeleccionados.length})
                    </button>
                  )}
                  <button onClick={() => setMostrarModalMasivo(true)} className="bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold px-3 py-2 rounded-xl text-xs transition-colors border border-slate-700">📄 Carga Masiva</button>
                  <button onClick={() => setMostrarModalEliminarMasivo(true)} className="bg-red-900/30 hover:bg-red-900/50 text-red-400 font-bold px-3 py-2 rounded-xl text-xs transition-colors border border-red-900/50">🗑️ Bajas Masivas</button>
                  <button onClick={descargarBaseDatosAlumnos} className="bg-emerald-900/30 hover:bg-emerald-900/50 text-emerald-400 font-bold px-3 py-2 rounded-xl text-xs transition-colors border border-emerald-900/50">⬇️ Descargar DB</button>
                </div>
              </div>

              {cargandoAlumnos ? (
                <div className="text-center py-12 text-slate-400 font-bold animate-pulse">Cargando base de datos...</div>
              ) : (
                <div className="overflow-x-auto rounded-xl border border-slate-800">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-[#020617] text-slate-400 text-[10px] uppercase tracking-wider">
                        <th className="p-3 border-b border-slate-800 text-center w-10">
                          <input type="checkbox" onChange={seleccionarTodosActuales} checked={idsSeleccionados.length === alumnosFiltrados.length && alumnosFiltrados.length > 0} className="w-4 h-4 accent-indigo-500" />
                        </th>
                        <th className="p-3 border-b border-slate-800">Nombre del Alumno</th>
                        <th className="p-3 border-b border-slate-800">Matrícula</th>
                        <th className="p-3 border-b border-slate-800">Grado/Grupo</th>
                        <th className="p-3 border-b border-slate-800">Tutor</th>
                        <th className="p-3 border-b border-slate-800">Saldo</th>
                        <th className="p-3 border-b border-slate-800 text-center">Acciones</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/50">
                      {alumnosFiltrados.length === 0 ? (
                        <tr><td colSpan={7} className="p-8 text-center text-slate-500">No se encontraron resultados.</td></tr>
                      ) : (
                        alumnosFiltrados.map((al) => (
                          <tr key={al.id} className="hover:bg-slate-800/30 transition-colors">
                            <td className="p-3 text-center">
                              <input type="checkbox" checked={idsSeleccionados.includes(al.id)} onChange={() => toggleSeleccionAlumno(al.id)} className="w-4 h-4 accent-indigo-500" />
                            </td>
                            <td className="p-3">
                              <p className="text-white font-bold text-sm">{al.nombre_completo}</p>
                              {al.codigo_qr && <p className="text-xs text-indigo-400 mt-1">QR: {al.codigo_qr}</p>}
                            </td>
                            <td className="p-3 text-slate-300 text-sm">{al.matricula || '-'}</td>
                            <td className="p-3">
                              <p className="text-slate-300 text-sm">{al.grado_grupo || `${al.semestre} Gpo ${al.grupo}`}</p>
                              <p className="text-xs text-slate-500">{al.turno}</p>
                            </td>
                            <td className="p-3">
                              <p className="text-slate-300 text-xs">{al.correo_tutor || 'Sin correo'}</p>
                              <p className="text-slate-300 text-xs">{al.telefono_tutor || 'Sin teléfono'}</p>
                            </td>
                            <td className="p-3">
                              <span className={`px-2 py-1 rounded-md text-xs font-bold ${al.saldo_actual > 0 ? 'bg-emerald-900/40 text-emerald-400' : 'bg-slate-800 text-slate-400'}`}>
                                ${al.saldo_actual?.toFixed(2) || '0.00'}
                              </span>
                            </td>
                            <td className="p-3">
                              <div className="flex justify-center gap-2">
                                <button onClick={() => abrirModalEditarAlumno(al)} className="bg-slate-800 hover:bg-indigo-600 text-white p-2 rounded-lg transition-colors" title="Editar">✏️</button>
                                <button onClick={() => eliminarAlumnoIndividual(al.id, al.nombre_completo)} className="bg-slate-800 hover:bg-red-600 text-white p-2 rounded-lg transition-colors" title="Eliminar">🗑️</button>
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ================= CONTENIDO: VISTA EMPLEADOS ================= */}
      {vista === 'EMPLEADOS' && rol === 'SUPERADMIN' && (
        <div className="max-w-7xl mx-auto animate-fade-in">
          <div className="bg-[#0f172a] rounded-2xl border border-amber-900/40 p-6 shadow-xl">
            <div className="flex flex-col md:flex-row justify-between items-center gap-4 border-b border-slate-800 pb-4 mb-4">
              <div>
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                  🧑‍💼 Gestión de Personal
                </h2>
                <p className="text-slate-400 text-xs mt-1">
                  Registra personal de Caja, Choferes, Coordinadores y Administradores para darles acceso a sus módulos correspondientes.
                </p>
              </div>
              <button 
                onClick={abrirModalNuevoEmpleado}
                className="bg-amber-600 hover:bg-amber-500 text-white font-bold px-4 py-2 rounded-xl text-sm transition-colors flex items-center gap-2"
              >
                ➕ Nuevo Empleado
              </button>
            </div>
            
            <div className="bg-[#0f172a] rounded-lg shadow-lg border border-slate-800">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-slate-300">
                  <thead className="bg-[#020617] text-slate-400 text-xs uppercase">
                    <tr>
                      <th className="p-4 rounded-tl-lg border-b border-slate-800">Nombre</th>
                      <th className="p-4 border-b border-slate-800">Correo</th>
                      <th className="p-4 border-b border-slate-800">Rol</th>
                      <th className="p-4 border-b border-slate-800">Contraseña</th>
                      <th className="p-4 rounded-tr-lg border-b border-slate-800">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/50">
                    {empleados.map((emp) => (
                      <tr key={emp.id} className="hover:bg-slate-800/30 transition-colors">
                        <td className="p-4 text-white font-medium text-sm">{emp.nombre}</td>
                        <td className="p-4 text-sm">{emp.correo}</td>
                        <td className="p-4 text-sm">
                          <span className="px-2 py-1 rounded bg-slate-800 text-amber-400 text-[10px] font-bold">
                            {emp.rol.replace('_', ' ')}
                          </span>
                        </td>
                        <td className="p-4 text-sm font-mono">{emp.contrasena}</td>
                        <td className="p-4">
                          <button 
                            onClick={() => editarEmpleado(emp)} 
                            className="bg-indigo-600 hover:bg-indigo-500 text-white px-3 py-1 rounded-md mr-2 text-xs transition-colors"
                          >
                            Editar
                          </button>
                          <button 
                            onClick={() => eliminarEmpleado(emp.id)} 
                            className="bg-red-600 hover:bg-red-500 text-white px-3 py-1 rounded-md text-xs transition-colors"
                          >
                            Eliminar
                          </button>
                        </td>
                      </tr>
                    ))}
                    {empleados.length === 0 && (
                      <tr>
                        <td colSpan={5} className="p-6 text-center text-slate-500">
                          No hay empleados registrados en la base de datos.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}


      {/* ====================================================================================== */}
      {/* ======================================= MODALES ====================================== */}
      {/* ====================================================================================== */}

      {/* MODAL CÁMARA PARA BÚSQUEDA (SEPARA LA VISTA DE LA DE FORMULARIO) */}
      {usandoCamara && modoCamara === 'BUSQUEDA' && (
        <div className="fixed inset-0 bg-black/90 flex justify-center items-center z-50 p-4">
          <div className="bg-[#0f172a] border border-slate-700 p-6 rounded-2xl w-full max-w-md shadow-2xl">
            <h2 className="text-xl font-bold text-white mb-4 text-center">Escanear QR de Alumno</h2>
            
            {/* Opción 1: Lector Físico (Pistola) */}
            <div className="mb-6 bg-slate-800 p-4 rounded-xl border border-slate-700">
              <label className="block text-slate-300 text-xs font-bold mb-2 uppercase text-center">
                Escáner Físico (Pistola)
              </label>
              <input
                type="text"
                autoFocus
                placeholder="Haz clic aquí y dispara el lector..."
                className="w-full bg-[#020617] text-white border border-slate-600 rounded-lg py-2 px-3 text-sm focus:outline-none focus:border-indigo-500 text-center"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    const codigoEscaneado = (e.target as HTMLInputElement).value;
                    setBusquedaAlumno(codigoEscaneado);
                    (e.target as HTMLInputElement).value = '';
                    detenerCamara(); // Cierra el modal y deja la búsqueda aplicada en la tabla principal
                  }
                }}
              />
            </div>

            <p className="text-slate-400 text-xs text-center mb-4 uppercase font-bold">O usa la cámara de tu PC</p>
            
            {/* Opción 2: Cámara web */}
            <div className="relative rounded-xl overflow-hidden bg-black aspect-video border border-slate-700 flex justify-center items-center">
              <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover"></video>
              <div className="absolute inset-0 border-2 border-indigo-500/50 m-8 rounded-lg pointer-events-none"></div>
            </div>
            
            <button onClick={() => detenerCamara()} className="w-full mt-6 bg-slate-800 hover:bg-red-600 text-white font-bold py-3 rounded-xl transition-colors">
              Cancelar Escaneo
            </button>
          </div>
        </div>
      )}

      {/* MODAL: CORTE Z */}
      {mostrarCorte && (
        <div className="fixed inset-0 bg-black/90 flex justify-center items-center z-50 p-4">
          <div className="bg-[#0f172a] border border-slate-800 p-8 rounded-2xl w-full max-w-sm shadow-2xl">
            <h2 className="text-xl font-bold text-white mb-4 text-center">Imprimir Corte Z</h2>
            <div className="mb-6">
              <label className="block text-slate-400 text-xs uppercase font-bold mb-2 text-center">Selecciona la Fecha</label>
              <input type="date" value={fechaCorte} onChange={(e) => setFechaCorte(e.target.value)} className="w-full bg-[#020617] border border-slate-700 rounded-xl p-3 text-white text-center outline-none focus:border-emerald-500" />
            </div>
            <div className="flex gap-3">
              <button onClick={() => setMostrarCorte(false)} className="w-1/2 bg-slate-800 hover:bg-slate-700 text-white font-bold py-3 rounded-xl transition-colors">Cancelar</button>
              <button onClick={generarCorteZ} className="w-1/2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 rounded-xl transition-colors">Generar</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: HISTORIAL / REPORTES */}
      {mostrarHistorial && (
        <div className="fixed inset-0 bg-black/90 flex justify-center items-center z-50 p-4">
          <div className="bg-[#0f172a] border border-slate-700 p-6 md:p-8 rounded-2xl w-full max-w-4xl shadow-2xl max-h-[90vh] flex flex-col">
            <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-6 border-b border-slate-800 pb-4">
              <h2 className="text-xl font-bold text-white">Historial de Operaciones</h2>
              <div className="flex items-center gap-3 w-full md:w-auto">
                <input type="date" value={fechaHistorial} onChange={(e) => setFechaHistorial(e.target.value)} className="bg-[#020617] border border-slate-700 rounded-lg p-2 text-white text-sm outline-none focus:border-indigo-500 w-full md:w-auto" />
                <button onClick={() => setMostrarHistorial(false)} className="bg-slate-800 hover:bg-slate-700 text-white px-4 py-2 rounded-lg font-bold text-sm transition-colors">Cerrar</button>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6 shrink-0">
              <div className="bg-[#020617] p-3 rounded-xl border border-slate-800 text-center"><p className="text-slate-500 text-[10px] uppercase font-bold">Ventas Netas</p><p className="text-emerald-400 font-black text-lg">${statsHistorial.ventas.toFixed(2)}</p></div>
              <div className="bg-[#020617] p-3 rounded-xl border border-slate-800 text-center"><p className="text-slate-500 text-[10px] uppercase font-bold">Boletos Emitidos</p><p className="text-white font-black text-lg">{statsHistorial.boletos}</p></div>
              <div className="bg-[#020617] p-3 rounded-xl border border-slate-800 text-center"><p className="text-slate-500 text-[10px] uppercase font-bold">Retiros</p><p className="text-pink-400 font-black text-lg">-${statsHistorial.retiros.toFixed(2)}</p></div>
              <div className="bg-indigo-900/30 p-3 rounded-xl border border-indigo-900/50 text-center"><p className="text-indigo-400 text-[10px] uppercase font-bold">Caja Teórica</p><p className="text-white font-black text-lg">${statsHistorial.total.toFixed(2)}</p></div>
            </div>

            <div className="flex-1 overflow-y-auto rounded-xl border border-slate-800 bg-[#020617]">
              <table className="w-full text-left border-collapse">
                <thead className="sticky top-0 bg-[#0f172a] shadow-md">
                  <tr className="text-slate-400 text-xs uppercase tracking-wider">
                    <th className="p-3 border-b border-slate-800">Hora</th>
                    <th className="p-3 border-b border-slate-800">Tipo</th>
                    <th className="p-3 border-b border-slate-800">Folio / Ref</th>
                    <th className="p-3 border-b border-slate-800">Descripción</th>
                    <th className="p-3 border-b border-slate-800 text-right">Monto</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/50">
                  {historialUnificado.length === 0 ? (
                    <tr><td colSpan={5} className="p-8 text-center text-slate-500">No hay movimientos en esta fecha.</td></tr>
                  ) : (
                    historialUnificado.map((mov, i) => (
                      <tr key={i} className="hover:bg-slate-800/30">
                        <td className="p-3 text-sm text-slate-400">{new Date(mov.fecha).toLocaleTimeString('es-MX', {hour: '2-digit', minute:'2-digit'})}</td>
                        <td className="p-3"><span className={`px-2 py-1 rounded-[4px] text-[10px] font-bold ${mov.tipo === 'VENTA' ? 'bg-emerald-900/30 text-emerald-400' : 'bg-pink-900/30 text-pink-400'}`}>{mov.tipo}</span></td>
                        <td className="p-3 text-sm font-mono text-slate-300">{mov.folio}</td>
                        <td className="p-3 text-sm text-slate-300">{mov.descripcion}</td>
                        <td className={`p-3 text-sm font-bold text-right ${mov.tipo === 'VENTA' ? 'text-emerald-400' : 'text-pink-400'}`}>{mov.tipo === 'VENTA' ? '+' : '-'}${mov.monto.toFixed(2)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: REPORTE POR RANGO */}
      {mostrarReporteRango && (
        <div className="fixed inset-0 bg-black/90 flex justify-center items-center z-50 p-4">
          <div className="bg-[#0f172a] border border-slate-700 p-6 rounded-2xl w-full max-w-lg shadow-2xl">
            <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">📅 Reporte de Ventas por Rango</h2>
            
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div>
                <label className="block text-slate-400 text-xs font-bold mb-1">Fecha Inicial</label>
                <input type="date" value={fechaInicioRango} onChange={(e) => { setFechaInicioRango(e.target.value); setRangoCalculado(false) }} className="w-full bg-[#020617] border border-slate-700 rounded-xl p-3 text-white outline-none focus:border-indigo-500" />
              </div>
              <div>
                <label className="block text-slate-400 text-xs font-bold mb-1">Fecha Final</label>
                <input type="date" value={fechaFinRango} onChange={(e) => { setFechaFinRango(e.target.value); setRangoCalculado(false) }} className="w-full bg-[#020617] border border-slate-700 rounded-xl p-3 text-white outline-none focus:border-indigo-500" />
              </div>
            </div>

            {rangoCalculado ? (
              <div className="bg-[#020617] p-4 rounded-xl border border-slate-800 mb-6 space-y-2">
                <div className="flex justify-between text-sm"><span className="text-slate-400">Total Ingresos:</span><span className="text-emerald-400 font-bold">${statsRango.ventas.toFixed(2)}</span></div>
                <div className="flex justify-between text-sm"><span className="text-slate-400">Boletos Vendidos:</span><span className="text-white font-bold">{statsRango.boletos}</span></div>
                <div className="flex justify-between text-sm"><span className="text-slate-400">Total Retiros:</span><span className="text-pink-400 font-bold">-${statsRango.retiros.toFixed(2)}</span></div>
                <div className="border-t border-slate-700 pt-2 flex justify-between text-base"><span className="text-white font-bold">Neto en Caja:</span><span className="text-indigo-400 font-black">${statsRango.total.toFixed(2)}</span></div>
              </div>
            ) : (
              <button onClick={calcularRangoFechas} disabled={calculandoRango} className="w-full bg-slate-800 hover:bg-slate-700 text-white font-bold py-3 rounded-xl transition-colors mb-6">
                {calculandoRango ? 'Calculando...' : 'Calcular Totales'}
              </button>
            )}

            <div className="flex gap-3">
              <button onClick={() => setMostrarReporteRango(false)} className="w-1/2 bg-transparent border border-slate-700 text-slate-300 font-bold py-3 rounded-xl hover:bg-slate-800 transition-colors">Cancelar</button>
              <button onClick={generarDocumentoRango} disabled={!rangoCalculado} className={`w-1/2 font-bold py-3 rounded-xl transition-colors ${rangoCalculado ? 'bg-indigo-600 hover:bg-indigo-500 text-white' : 'bg-slate-800 text-slate-500 cursor-not-allowed'}`}>🖨️ Generar Ticket</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: ALTA/EDICIÓN ALUMNO INDIVIDUAL */}
      {mostrarModalAlumno && (
        <div className="fixed inset-0 bg-black/90 flex justify-center items-center z-50 p-4">
          <div className="bg-[#0f172a] border border-slate-700 p-6 md:p-8 rounded-2xl w-full max-w-2xl shadow-2xl max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold text-white mb-6 border-b border-slate-800 pb-4">
              {alumnoEditando ? '✏️ Editar Alumno' : '➕ Nuevo Alumno'}
            </h2>

            <form onSubmit={guardarAlumno} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Nombre Completo *</label>
                  <input type="text" required value={formNombre} onChange={(e) => setFormNombre(e.target.value)} className="w-full bg-[#020617] border border-slate-700 rounded-xl p-3 text-white text-sm outline-none focus:border-indigo-500" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Matrícula (Opcional)</label>
                  <input type="text" value={formMatricula} onChange={(e) => setFormMatricula(e.target.value)} className="w-full bg-[#020617] border border-slate-700 rounded-xl p-3 text-white text-sm outline-none focus:border-indigo-500" />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Semestre</label>
                  <select value={formSemestre} onChange={(e) => setFormSemestre(e.target.value)} className="w-full bg-[#020617] border border-slate-700 rounded-xl p-3 text-white text-sm outline-none focus:border-indigo-500">
                    <option value="1º">1º</option><option value="2º">2º</option><option value="3º">3º</option>
                    <option value="4º">4º</option><option value="5º">5º</option><option value="6º">6º</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Grupo</label>
                  <select value={formGrupo} onChange={(e) => setFormGrupo(e.target.value)} className="w-full bg-[#020617] border border-slate-700 rounded-xl p-3 text-white text-sm outline-none focus:border-indigo-500">
                    <option value="1">1</option><option value="2">2</option><option value="3">3</option>
                    <option value="4">4</option><option value="5">5</option><option value="6">6</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Turno</label>
                  <select value={formTurno} onChange={(e) => setFormTurno(e.target.value)} className="w-full bg-[#020617] border border-slate-700 rounded-xl p-3 text-white text-sm outline-none focus:border-indigo-500">
                    <option value="Matutino">Matutino</option>
                    <option value="Vespertino">Vespertino</option>
                  </select>
                </div>
              </div>

              <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-800 mt-2">
                <label className="block text-xs font-bold text-indigo-400 uppercase mb-2">Asignación de Código QR</label>
                <div className="flex gap-2">
                  <input type="text" value={formQr} onChange={(e) => setFormQr(e.target.value)} placeholder="Ej. QR-0001" className="flex-1 bg-[#020617] border border-slate-700 rounded-xl p-3 text-white text-sm font-mono outline-none focus:border-indigo-500" />
                  <button type="button" onClick={() => iniciarCamara('FORMULARIO')} className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 rounded-xl text-sm font-bold transition-colors whitespace-nowrap">📷 Escanear con PC</button>
                </div>
                {usandoCamara && modoCamara === 'FORMULARIO' && (
                  <div className="mt-4 relative rounded-xl overflow-hidden bg-black aspect-video border border-slate-700 flex justify-center items-center">
                    <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover"></video>
                    <div className="absolute inset-0 border-2 border-indigo-500/50 m-8 rounded-lg pointer-events-none"></div>
                    <button type="button" onClick={() => detenerCamara()} className="absolute top-2 right-2 bg-red-600 text-white p-2 rounded-full text-xs font-bold">Cerrar</button>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Correo del Tutor</label>
                  <input type="email" value={formCorreoTutor} onChange={(e) => setFormCorreoTutor(e.target.value)} className="w-full bg-[#020617] border border-slate-700 rounded-xl p-3 text-white text-sm outline-none focus:border-indigo-500" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Teléfono del Tutor</label>
                  <input type="tel" value={formTelefonoTutor} onChange={(e) => setFormTelefonoTutor(e.target.value)} className="w-full bg-[#020617] border border-slate-700 rounded-xl p-3 text-white text-sm outline-none focus:border-indigo-500" />
                </div>
              </div>

              <div className="pt-4 flex gap-3">
                <button type="button" onClick={() => { setMostrarModalAlumno(false); detenerCamara(); }} className="w-1/2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold py-3 rounded-xl transition-colors text-sm">Cancelar</button>
                <button type="submit" disabled={guardandoAlumno} className="w-1/2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3 rounded-xl transition-colors text-sm">{guardandoAlumno ? 'Guardando...' : 'Guardar Alumno'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: CARGA MASIVA DE ALUMNOS */}
      {mostrarModalMasivo && (
        <div className="fixed inset-0 bg-black/90 flex justify-center items-center z-50 p-4">
          <div className="bg-[#0f172a] border border-slate-700 p-6 md:p-8 rounded-2xl w-full max-w-2xl shadow-2xl">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-white">📄 Carga Masiva (CSV)</h2>
              <button onClick={() => setMostrarModalMasivo(false)} className="text-slate-400 hover:text-white bg-slate-800 px-3 py-1 rounded-lg">✕</button>
            </div>
            <div className="bg-indigo-900/20 border border-indigo-900/50 p-4 rounded-xl mb-4">
              <p className="text-indigo-300 text-xs mb-2 font-bold">Instrucciones:</p>
              <ol className="text-slate-400 text-xs list-decimal pl-4 space-y-1">
                <li>Descarga la plantilla oficial en formato CSV.</li>
                <li>Llénala desde Excel y guárdala nuevamente como CSV delimitado por comas.</li>
                <li>Selecciona el archivo aquí o pega el texto directamente.</li>
              </ol>
              <button onClick={descargarPlantilla} className="mt-3 text-indigo-400 font-bold text-xs underline hover:text-indigo-300">⬇️ Descargar Plantilla.csv</button>
            </div>

            <div className="mb-4">
              <label className="block text-xs font-bold text-slate-400 uppercase mb-2">Subir archivo CSV</label>
              <input type="file" accept=".csv" onChange={(e) => cargarArchivoMasivo(e, 'CARGA')} className="block w-full text-sm text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-bold file:bg-slate-800 file:text-white hover:file:bg-slate-700" />
            </div>

            <div className="mb-4">
              <label className="block text-xs font-bold text-slate-400 uppercase mb-2">O Pega el contenido aquí</label>
              <textarea value={textoMasivo} onChange={(e) => setTextoMasivo(e.target.value)} rows={6} className="w-full bg-[#020617] border border-slate-700 rounded-xl p-3 text-white text-xs font-mono outline-none focus:border-indigo-500" placeholder="Nombre Completo,Matricula,Semestre,Grupo,Turno,Codigo QR,Correo Tutor,Telefono Tutor,Saldo Inicial"></textarea>
            </div>

            <button onClick={procesarCargaMasiva} disabled={cargandoMasivo || !textoMasivo.trim()} className={`w-full font-bold py-3 rounded-xl transition-colors text-sm ${cargandoMasivo || !textoMasivo.trim() ? 'bg-slate-800 text-slate-500 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-500 text-white'}`}>
              {cargandoMasivo ? 'Procesando Subida...' : 'Subir Alumnos'}
            </button>
          </div>
        </div>
      )}

      {/* MODAL: BAJA MASIVA DE ALUMNOS */}
      {mostrarModalEliminarMasivo && (
        <div className="fixed inset-0 bg-black/90 flex justify-center items-center z-50 p-4">
          <div className="bg-[#0f172a] border border-red-900/50 p-6 md:p-8 rounded-2xl w-full max-w-2xl shadow-2xl">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">🗑️ Baja Masiva de Alumnos</h2>
              <button onClick={() => setMostrarModalEliminarMasivo(false)} className="text-slate-400 hover:text-white bg-slate-800 px-3 py-1 rounded-lg">✕</button>
            </div>
            
            <div className="bg-red-900/20 border border-red-900/50 p-4 rounded-xl mb-4">
              <p className="text-red-400 text-xs mb-2 font-bold">⚠️ ¡Atención! Acción Irreversible</p>
              <p className="text-slate-400 text-xs">Sube un archivo CSV o pega una lista con las <strong className="text-white">Matrículas</strong> exactas de los alumnos que deseas dar de baja del sistema.</p>
              <button onClick={descargarPlantillaEliminar} className="mt-3 text-red-400 font-bold text-xs underline hover:text-red-300">⬇️ Descargar Plantilla para Bajas.csv</button>
            </div>

            <div className="mb-4">
              <label className="block text-xs font-bold text-slate-400 uppercase mb-2">Subir archivo CSV (Matrículas)</label>
              <input type="file" accept=".csv" onChange={(e) => cargarArchivoMasivo(e, 'ELIMINAR')} className="block w-full text-sm text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-bold file:bg-slate-800 file:text-white hover:file:bg-slate-700" />
            </div>

            <div className="mb-4">
              <label className="block text-xs font-bold text-slate-400 uppercase mb-2">O Pega las Matrículas (Una por línea)</label>
              <textarea value={textoEliminarMasivo} onChange={(e) => setTextoEliminarMasivo(e.target.value)} rows={6} className="w-full bg-[#020617] border border-slate-700 rounded-xl p-3 text-white text-xs font-mono outline-none focus:border-red-500" placeholder="2026-001&#10;2026-002&#10;2026-003"></textarea>
            </div>

            <button onClick={procesarEliminacionMasiva} disabled={!textoEliminarMasivo.trim()} className={`w-full font-bold py-3 rounded-xl transition-colors text-sm ${!textoEliminarMasivo.trim() ? 'bg-slate-800 text-slate-500 cursor-not-allowed' : 'bg-red-600 hover:bg-red-500 text-white'}`}>
              Ejecutar Bajas Masivas
            </button>
          </div>
        </div>
      )}

      {/* MODAL: NUEVO/EDITAR EMPLEADO (ALTA DE USUARIOS) */}
      {mostrarModalEmpleado && (
        <div className="fixed inset-0 bg-black/90 flex justify-center items-center z-50 p-4">
          <div className="bg-[#0f172a] border border-slate-700 p-6 md:p-8 rounded-2xl w-full max-w-lg shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-white">
                {empleadoEditando ? '✏️ Editar Empleado' : '➕ Alta de Empleado'}
              </h2>
              <button onClick={() => setMostrarModalEmpleado(false)} className="text-slate-400 hover:text-white bg-slate-800 px-3 py-1 rounded-lg">✕</button>
            </div>

            <form onSubmit={guardarEmpleado} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-amber-400 uppercase mb-1">Perfil del Empleado</label>
                <select 
                  value={formEmpRol} 
                  onChange={(e) => setFormEmpRol(e.target.value)}
                  className="w-full bg-[#020617] border border-amber-900/50 rounded-xl p-3 text-white text-sm outline-none focus:border-amber-500 font-bold"
                >
                  <option value="CAJA">Caja / Punto de Venta</option>
                  <option value="CHOFER">Chofer</option>
                  <option value="COORDINADOR">Coordinador</option>
                  <option value="ADMIN">Administrador</option>
                  <option value="SUPERADMIN">Super Administrador</option>
                </select>
              </div>

              <div className="bg-slate-900 p-4 rounded-xl border border-slate-800 space-y-4">
                <h3 className="text-slate-300 font-bold text-xs uppercase border-b border-slate-800 pb-2">Información de Acceso</h3>
                
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Nombre Completo</label>
                  <input type="text" required value={formEmpNombre} onChange={(e) => setFormEmpNombre(e.target.value)} placeholder="Ej. Roberto Sánchez" className="w-full bg-[#020617] border border-slate-700 rounded-xl p-3 text-white text-sm outline-none focus:border-indigo-500" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Correo / Usuario de Acceso</label>
                  <input type="text" required value={formEmpCorreo} onChange={(e) => setFormEmpCorreo(e.target.value)} placeholder="usuario_sistema" className="w-full bg-[#020617] border border-slate-700 rounded-xl p-3 text-white text-sm outline-none focus:border-indigo-500" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Teléfono</label>
                  <input type="tel" required value={formEmpTelefono} onChange={(e) => setFormEmpTelefono(e.target.value)} placeholder="5512345678" className="w-full bg-[#020617] border border-slate-700 rounded-xl p-3 text-white text-sm outline-none focus:border-indigo-500" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Contraseña temporal (o NIP)</label>
                  <input type="password" required minLength={4} value={formEmpPassword} onChange={(e) => setFormEmpPassword(e.target.value)} placeholder="••••" className="w-full bg-[#020617] border border-slate-700 rounded-xl p-3 text-white text-sm outline-none focus:border-indigo-500" />
                </div>
              </div>

              {formEmpRol === 'CHOFER' && (
                <div className="bg-indigo-900/20 p-4 rounded-xl border border-indigo-900/50 space-y-4 animate-fade-in">
                  <h3 className="text-indigo-400 font-bold text-xs uppercase border-b border-indigo-900/50 pb-2">Datos de Ruta</h3>
                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Ruta Asignada</label>
                    <input type="text" required value={formEmpRuta} onChange={(e) => setFormEmpRuta(e.target.value)} placeholder="Ej. Ruta Centro - Plantel" className="w-full bg-[#020617] border border-slate-700 rounded-xl p-3 text-white text-sm outline-none focus:border-indigo-500" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Tipo de Transporte</label>
                    <select value={formEmpTransporte} onChange={(e) => setFormEmpTransporte(e.target.value)} className="w-full bg-[#020617] border border-slate-700 rounded-xl p-3 text-white text-sm outline-none focus:border-indigo-500">
                      <option value="Autobus">Autobús</option>
                      <option value="Van">Van / Camioneta</option>
                    </select>
                  </div>
                </div>
              )}

              {formEmpRol === 'COORDINADOR' && (
                <div className="bg-emerald-900/20 p-4 rounded-xl border border-emerald-900/50 space-y-4 animate-fade-in">
                  <h3 className="text-emerald-400 font-bold text-xs uppercase border-b border-emerald-900/50 pb-2">Asignación de Grupo</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Semestre</label>
                      <select value={formEmpSemestreAsignado} onChange={(e) => setFormEmpSemestreAsignado(e.target.value)} className="w-full bg-[#020617] border border-slate-700 rounded-xl p-3 text-white text-sm outline-none focus:border-indigo-500">
                        <option value="1º">1º</option><option value="2º">2º</option><option value="3º">3º</option>
                        <option value="4º">4º</option><option value="5º">5º</option><option value="6º">6º</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Turno</label>
                      <select value={formEmpTurnoAsignado} onChange={(e) => setFormEmpTurnoAsignado(e.target.value)} className="w-full bg-[#020617] border border-slate-700 rounded-xl p-3 text-white text-sm outline-none focus:border-indigo-500">
                        <option value="Matutino">Matutino</option>
                        <option value="Vespertino">Vespertino</option>
                      </select>
                    </div>
                  </div>
                </div>
              )}

              <div className="pt-4 flex gap-3">
                <button type="button" onClick={() => setMostrarModalEmpleado(false)} className="w-1/2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold py-3 rounded-xl transition-colors text-sm">Cancelar</button>
                <button type="submit" disabled={guardandoEmpleado} className="w-1/2 bg-amber-600 hover:bg-amber-500 text-white font-bold py-3 rounded-xl transition-colors text-sm">
                  {guardandoEmpleado ? 'Guardando...' : empleadoEditando ? 'Actualizar Empleado' : 'Registrar Empleado'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  )
}
