'use client'
import { useState, useEffect, useRef } from 'react'
import { supabase } from '../../lib/supabase'

export default function PanelAdministracion() {
  // ================= ESTADOS DE AUTENTICACIÓN =================
  const [rol, setRol] = useState<'ADMIN' | 'SUPERADMIN' | null>(null)
  const [pin, setPin] = useState('')
  const [errorPin, setErrorPin] = useState(false)
  
  // ================= ESTADO DE VISTA (SOLO SUPERADMIN) =================
  const [vista, setVista] = useState<'FINANZAS' | 'SISTEMA' | 'PERSONAL'>('FINANZAS')

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
  const videoRef = useRef<HTMLVideoElement>(null)

  // Formulario Carga Masiva y Eliminación Masiva
  const [textoMasivo, setTextoMasivo] = useState('')
  const [cargandoMasivo, setCargandoMasivo] = useState(false)
  const [textoEliminarMasivo, setTextoEliminarMasivo] = useState('')
  const [idsSeleccionados, setIdsSeleccionados] = useState<string[]>([])

  // ================= ESTADOS DE GESTIÓN DE PERSONAL (SUPER ADMIN) =================
  const [personal, setPersonal] = useState<any[]>([])
  const [cargandoPersonal, setCargandoPersonal] = useState(false)
  const [mostrarModalPersonal, setMostrarModalPersonal] = useState(false)
  const [personalEditando, setPersonalEditando] = useState<any>(null)
  const [guardandoPersonal, setGuardandoPersonal] = useState(false)

  // Formulario Personal
  const [formPersonalRol, setFormPersonalRol] = useState('CAJA')
  const [formPersonalNombre, setFormPersonalNombre] = useState('')
  const [formPersonalCorreo, setFormPersonalCorreo] = useState('')
  const [formPersonalTelefono, setFormPersonalTelefono] = useState('')
  const [formPersonalPassword, setFormPersonalPassword] = useState('')
  
  const [formPersonalRuta, setFormPersonalRuta] = useState('')
  const [formPersonalTipoTransporte, setFormPersonalTipoTransporte] = useState('Autobús')
  const [formPersonalSemestre, setFormPersonalSemestre] = useState('1º')
  const [formPersonalTurno, setFormPersonalTurno] = useState('Matutino')

  // ================= FUNCIONES DE LOGIN Y CIERRE =================
  const iniciarSesion = (e: React.FormEvent) => {
    e.preventDefault()
    if (pin === '7777') {
      setRol('SUPERADMIN')
      setErrorPin(false)
      cargarDatosDashboard()
      cargarAlumnos()
      cargarPersonal()
    } else if (pin === '8888') {
      setRol('ADMIN')
      setVista('FINANZAS')
      setErrorPin(false)
      cargarDatosDashboard()
    } else {
      setErrorPin(true)
      setPin('')
    }
  }

  const cerrarSesion = () => {
    setRol(null)
    setPin('')
    setVista('FINANZAS')
    setErrorPin(false)
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
  }

  const iniciarCamara = async () => {
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
                  setFormQr(barcodes[0].rawValue);
                  detenerCamara(stream, interval);
                }
              } catch (e) {
                console.error(e);
              }
            }
          }, 500);
        } else {
          console.warn("La detección nativa de códigos QR no está soportada en este navegador. Utilice un escáner físico.");
        }
      }
    } catch (err: any) {
      alert("Error al acceder a la cámara web: " + err.message);
      setUsandoCamara(false);
    }
  }

  // ================= FUNCIONES DE CONTROL DE ALUMNOS (SUPER ADMIN) =================
  const cargarAlumnos = async () => {
    setCargandoAlumnos(true)
    try {
      const { data, error } = await supabase
        .from('alumnos')
        .select('*')
        .order('nombre_completo', { ascending: true })
      
      if (!error && data) {
        setAlumnos(data)
      }
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
    setMostrarModalAlumno(true)
  }

  const guardarAlumno = async (e: React.FormEvent) => {
    e.preventDefault()
    setGuardandoAlumno(true)

    try {
      const gradoGrupoVal = `${formSemestre} Grupo ${formGrupo}`
      const datosAlumno = {
        nombre_completo: formNombre,
        matricula: formMatricula,
        semestre: formSemestre,
        grupo: formGrupo,
        turno: formTurno,
        codigo_qr: formQr,
        correo_tutor: formCorreoTutor,
        telefono_tutor: formTelefonoTutor,
        saldo_actual: formSaldo,
        grado_grupo: gradoGrupoVal
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
    setIdsSeleccionados(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    )
  }

  const seleccionarTodosActuales = () => {
    if (idsSeleccionados.length === alumnosFiltrados.length) {
      setIdsSeleccionados([])
    } else {
      setIdsSeleccionados(alumnosFiltrados.map(a => a.id))
    }
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
              nombre_completo: partes[0]?.trim(),
              matricula: partes[1]?.trim() || '',
              semestre: sem,
              grupo: grupo,
              turno: partes[4]?.trim() || 'Matutino',
              codigo_qr: partes[5]?.trim() || '',
              correo_tutor: partes[6]?.trim() || '',
              telefono_tutor: partes[7]?.trim() || '',
              saldo_actual: parseFloat(partes[8]?.trim()) || 0,
              grado_grupo: `${sem} Grupo ${grupo}`
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

  // ================= FUNCIONES DE CONTROL DE PERSONAL (SUPER ADMIN) =================
  const cargarPersonal = async () => {
    setCargandoPersonal(true)
    try {
      const { data, error } = await supabase.from('personal').select('*').order('nombre', { ascending: true })
      if (!error && data) setPersonal(data)
    } catch (err) {
      console.error(err)
    } finally {
      setCargandoPersonal(false)
    }
  }

  const abrirModalNuevoPersonal = () => {
    setPersonalEditando(null)
    setFormPersonalRol('CAJA')
    setFormPersonalNombre('')
    setFormPersonalCorreo('')
    setFormPersonalTelefono('')
    setFormPersonalPassword('')
    setFormPersonalRuta('')
    setFormPersonalTipoTransporte('Autobús')
    setFormPersonalSemestre('1º')
    setFormPersonalTurno('Matutino')
    setMostrarModalPersonal(true)
  }

  const abrirModalEditarPersonal = (p: any) => {
    setPersonalEditando(p)
    setFormPersonalRol(p.rol || 'CAJA')
    setFormPersonalNombre(p.nombre || '')
    setFormPersonalCorreo(p.correo || '')
    setFormPersonalTelefono(p.telefono || '')
    setFormPersonalPassword(p.contrasena || '')
    setFormPersonalRuta(p.ruta || '')
    setFormPersonalTipoTransporte(p.tipo_transporte || 'Autobús')
    setFormPersonalSemestre(p.semestre_asignado || '1º')
    setFormPersonalTurno(p.turno || 'Matutino')
    setMostrarModalPersonal(true)
  }

  const guardarPersonal = async (e: React.FormEvent) => {
    e.preventDefault()
    setGuardandoPersonal(true)
    try {
      const datos = {
        rol: formPersonalRol,
        nombre: formPersonalNombre,
        correo: formPersonalCorreo,
        telefono: formPersonalTelefono,
        contrasena: formPersonalPassword,
        ruta: formPersonalRol === 'CHOFER' ? formPersonalRuta : null,
        tipo_transporte: formPersonalRol === 'CHOFER' ? formPersonalTipoTransporte : null,
        semestre_asignado: formPersonalRol === 'COORDINADOR' ? formPersonalSemestre : null,
        turno: formPersonalRol === 'COORDINADOR' ? formPersonalTurno : null,
      }
      
      if (personalEditando) {
        const { error } = await supabase.from('personal').update(datos).eq('id', personalEditando.id)
        if (error) throw error
      } else {
        const { error } = await supabase.from('personal').insert([datos])
        if (error) throw error
      }
      setMostrarModalPersonal(false)
      cargarPersonal()
    } catch (err: any) {
      alert('Error al guardar personal: ' + err.message)
    } finally {
      setGuardandoPersonal(false)
    }
  }

  const eliminarPersonal = async (id: string, nombre: string) => {
    if (confirm(`¿Estás seguro de eliminar a ${nombre} del sistema?`)) {
      try {
        const { error } = await supabase.from('personal').delete().eq('id', id)
        if (error) throw error
        cargarPersonal()
      } catch (err: any) {
        alert('Error al eliminar personal: ' + err.message)
      }
    }
  }

  // ================= RENDERIZADO DEL LOGIN =================
  if (!rol) {
    return (
      <div className="min-h-screen bg-[#020617] flex items-center justify-center p-4">
        <div className="bg-[#0f172a] p-8 rounded-2xl shadow-2xl border border-slate-800 max-w-sm w-full">
          <div className="text-center mb-6">
            <h1 className="text-2xl font-black text-white mb-2">SITE-PEM</h1>
            <p className="text-slate-400 text-sm">Panel de Administración Central</p>
          </div>
          
          <form onSubmit={iniciarSesion} className="flex flex-col gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                Clave de Acceso
              </label>
              <input
                type="password"
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                placeholder="••••"
                className={`w-full bg-[#020617] border ${errorPin ? 'border-red-500' : 'border-slate-700'} rounded-xl p-4 text-center text-white text-2xl font-black tracking-widest outline-none focus:border-indigo-500 transition-colors`}
                maxLength={4}
                autoFocus
              />
              {errorPin && (
                <p className="text-red-400 text-xs font-bold mt-2 text-center animate-pulse">
                  Clave incorrecta. Intente de nuevo.
                </p>
              )}
            </div>
            
            <button 
              type="submit" 
              className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3 rounded-xl transition-colors mt-2"
            >
              Ingresar al Panel
            </button>
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
      <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-start md:items-center mb-8 border-b border-slate-800 pb-4 gap-4">
        <div>
          <h3 className="text-indigo-400 font-bold text-sm tracking-widest uppercase">
            SITE-PEM • {rol === 'SUPERADMIN' ? 'SUPER ADMINISTRADOR (MODO DIOS)' : 'FINANZAS'}
          </h3>
          <h1 className="text-white font-black text-3xl">Panel Central</h1>
        </div>
        
        <div className="flex flex-wrap gap-3">
          {rol === 'SUPERADMIN' && (
            <div className="bg-[#0f172a] rounded-xl border border-slate-800 p-1 flex gap-1 mr-2">
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
                ⚙️ Alumnos
              </button>
              <button 
                onClick={() => setVista('PERSONAL')} 
                className={`px-4 py-2 rounded-lg font-bold text-sm transition-colors ${vista === 'PERSONAL' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'}`}
              >
                👥 Personal
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
         <div className="max-w-6xl mx-auto space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
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

           <div className="bg-[#0f172a] rounded-2xl border border-slate-800 shadow-xl overflow-hidden">
            <div className="p-6 border-b border-slate-800 flex flex-col md:flex-row justify-between items-center gap-4 bg-slate-900/50">
              <div>
                <h2 className="text-xl font-bold text-white flex items-center gap-2">🎓 Control de Alumnos ({alumnos.length})</h2>
                <p className="text-slate-400 text-xs mt-1">Semestre, Grupo, Turno, Tutores y Eliminación por Matrícula</p>
              </div>

              <div className="flex flex-wrap w-full md:w-auto gap-2">
                {/* AQUÍ ESTÁ EL BOTÓN DE ACTUALIZAR, MÁS VISIBLE Y AL FRENTE */}
                <button onClick={cargarAlumnos} className="bg-indigo-600 hover:bg-indigo-500 text-white border border-indigo-500 font-bold px-4 py-2 rounded-xl text-xs transition-colors shrink-0 flex items-center gap-2 shadow-lg shadow-indigo-900/20">
                  🔄 Actualizar Boletos
                </button>
                <input 
                  type="text" 
                  placeholder="Buscar alumno..." 
                  value={busquedaAlumno}
                  onChange={(e) => setBusquedaAlumno(e.target.value)}
                  className="bg-[#020617] border border-slate-700 rounded-xl px-4 py-2 text-sm text-white outline-none focus:border-indigo-500 flex-1 md:w-40"
                />
                <button onClick={descargarBaseDatosAlumnos} className="bg-slate-800 hover:bg-slate-700 text-indigo-400 border border-slate-700 font-bold px-3 py-2 rounded-xl text-xs transition-colors shrink-0 flex items-center gap-1">📥 Descargar BD</button>
                <button onClick={() => setMostrarModalMasivo(true)} className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-3 py-2 rounded-xl text-xs transition-colors shrink-0 flex items-center gap-1">📁 Carga Masiva</button>
                <button onClick={() => setMostrarModalEliminarMasivo(true)} className="bg-red-900/50 hover:bg-red-800 text-red-300 border border-red-700 font-bold px-3 py-2 rounded-xl text-xs transition-colors shrink-0 flex items-center gap-1">🗑️ Eliminar Generación</button>
                <button onClick={abrirModalNuevoAlumno} className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold px-3 py-2 rounded-xl text-xs transition-colors shrink-0 flex items-center gap-1">➕ Nuevo</button>
              </div>
            </div>

            {idsSeleccionados.length > 0 && (
              <div className="bg-red-950/40 border-b border-red-900/50 px-6 py-3 flex justify-between items-center">
                <span className="text-red-300 text-xs font-bold">{idsSeleccionados.length} alumnos seleccionados para borrado</span>
                <button onClick={eliminarSeleccionadosDirecto} className="bg-red-600 hover:bg-red-500 text-white px-3 py-1.5 rounded-lg text-xs font-bold transition-colors">Eliminar Selección Marcada</button>
              </div>
            )}

            <div className="overflow-x-auto p-2">
              {cargandoAlumnos ? (
                <p className="text-center text-slate-500 py-10 font-bold">Cargando catálogo de alumnos...</p>
              ) : alumnosFiltrados.length === 0 ? (
                <p className="text-center text-slate-500 py-10 font-bold">No se encontraron alumnos registrados.</p>
              ) : (
                <table className="w-full text-left text-sm">
                  <thead className="text-slate-400 border-b border-slate-800 uppercase text-xs">
                    <tr>
                      <th className="px-3 py-4 text-center"><input type="checkbox" checked={idsSeleccionados.length === alumnosFiltrados.length && alumnosFiltrados.length > 0} onChange={seleccionarTodosActuales} className="cursor-pointer"/></th>
                      <th className="px-4 py-4 font-bold">Nombre Completo</th>
                      <th className="px-4 py-4 font-bold">Matrícula / QR</th>
                      <th className="px-4 py-4 font-bold">Sem / Grupo / Turno</th>
                      <th className="px-4 py-4 font-bold">Datos del Tutor</th>
                      <th className="px-4 py-4 font-bold text-center">Boletos Disp.</th>
                      <th className="px-4 py-4 font-bold text-center">Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {alumnosFiltrados.map((al) => (
                      <tr key={al.id} className="border-b border-slate-800/50 hover:bg-slate-800/20">
                        <td className="px-3 py-4 text-center"><input type="checkbox" checked={idsSeleccionados.includes(al.id)} onChange={() => toggleSeleccionAlumno(al.id)} className="cursor-pointer"/></td>
                        <td className="px-4 py-4 text-white font-bold">{al.nombre_completo}</td>
                        <td className="px-4 py-4">
                          <p className="text-slate-300 font-mono text-xs">{al.matricula || 'Sin Matrícula'}</p>
                          {al.codigo_qr ? <span className="bg-indigo-900/40 text-indigo-300 border border-indigo-800 px-1.5 py-0.5 rounded font-mono text-[10px] inline-block mt-1">🏷️ {al.codigo_qr}</span> : <span className="text-slate-600 italic text-[10px] block mt-1">Sin QR</span>}
                        </td>
                        <td className="px-4 py-4 text-xs">
                          <p className="text-white font-bold">{al.semestre} - Grupo {al.grupo}</p>
                          <p className="text-slate-400">{al.turno}</p>
                        </td>
                        <td className="px-4 py-4 text-xs">
                          <p className="text-slate-300">✉️ {al.correo_tutor || 'No registrado'}</p>
                          <p className="text-slate-400">📞 {al.telefono_tutor || 'No registrado'}</p>
                        </td>
                        {/* FORMATO CAMBIADO A BOLETOS ENTEROS */}
                        <td className="px-4 py-4 text-center font-black text-emerald-400 text-lg">
                          {al.saldo_actual || 0} <span className="text-sm">🎟️</span>
                        </td>
                        <td className="px-4 py-4 text-center">
                          <div className="flex justify-center gap-1">
                            <button onClick={() => abrirModalEditarAlumno(al)} className="bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-600 px-2 py-1 rounded text-xs font-bold transition-colors">✏️</button>
                            <button onClick={() => eliminarAlumnoIndividual(al.id, al.nombre_completo)} className="bg-red-900/40 hover:bg-red-800 text-red-300 border border-red-700 px-2 py-1 rounded text-xs font-bold transition-colors">🗑️</button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
              <div className="p-6 border-b border-slate-800 flex justify-between items-center bg-slate-900/50">
                <h2 className="text-lg font-bold text-white flex items-center gap-2">💳 Auditoría de Retiros (Hoy)</h2>
                <button onClick={cargarDatosDashboard} className="bg-slate-800 hover:bg-slate-700 text-slate-300 px-4 py-2 rounded-lg text-sm font-bold transition-colors border border-slate-700">
                  🔄 Actualizar
                </button>
              </div>
              <div className="overflow-x-auto p-2">
                {retiros.length === 0 ? (
                  <p className="text-center text-slate-500 py-10 font-bold">No se han registrado retiros hoy.</p>
                ) : (
                  <table className="w-full text-left text-sm">
                    <thead className="text-slate-400 border-b border-slate-800 uppercase text-xs">
                      <tr>
                        <th className="px-6 py-4 font-bold">Fecha / Hora</th>
                        <th className="px-6 py-4 font-bold">Concepto</th>
                        <th className="px-6 py-4 font-bold text-right">Monto</th>
                      </tr>
                    </thead>
                    <tbody>
                      {retiros.map((r) => (
                        <tr key={r.id} className="border-b border-slate-800/50 hover:bg-slate-800/20">
                          <td className="px-6 py-4 text-slate-300">{new Date(r.created_at).toLocaleString('es-MX')}</td>
                          <td className="px-6 py-4 text-white font-medium">{r.concepto}</td>
                          <td className="px-6 py-4 text-right font-black text-red-400">- ${r.monto.toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
         </div>
      )}

      {/* ================= CONTENIDO: VISTA SISTEMA (ALUMNOS) ================= */}
      {vista === 'SISTEMA' && rol === 'SUPERADMIN' && (
        <div className="max-w-6xl mx-auto space-y-8">
          
          <div className="bg-[#0f172a] rounded-2xl border border-indigo-900/40 p-6 shadow-xl">
            <h2 className="text-xl font-black text-white mb-2 flex items-center gap-2">
              🚀 Acceso Directo a Módulos
            </h2>
            <p className="text-slate-400 text-sm mb-4">
              Como Super Admin, puedes entrar a cualquier consola directamente sin requerir contraseñas adicionales.
            </p>
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
                  <p className="text-slate-500 text-xs">Registros de ascenso y descenso</p>
                </div>
              </a>
            </div>
          </div>

          <div className="bg-[#0f172a] rounded-2xl border border-slate-800 shadow-xl overflow-hidden">
            <div className="p-6 border-b border-slate-800 flex flex-col md:flex-row justify-between items-center gap-4 bg-slate-900/50">
              <div>
                <h2 className="text-xl font-bold text-white flex items-center gap-2">🎓 Control de Alumnos ({alumnos.length})</h2>
                <p className="text-slate-400 text-xs mt-1">Semestre, Grupo, Turno, Tutores y Eliminación por Matrícula</p>
              </div>

              <div className="flex flex-wrap w-full md:w-auto gap-2">
                <input 
                  type="text" 
                  placeholder="Buscar alumno..." 
                  value={busquedaAlumno}
                  onChange={(e) => setBusquedaAlumno(e.target.value)}
                  className="bg-[#020617] border border-slate-700 rounded-xl px-4 py-2 text-sm text-white outline-none focus:border-indigo-500 flex-1 md:w-40"
                />
                <button onClick={descargarBaseDatosAlumnos} className="bg-slate-800 hover:bg-slate-700 text-indigo-400 border border-slate-700 font-bold px-3 py-2 rounded-xl text-xs transition-colors shrink-0 flex items-center gap-1">📥 Descargar BD</button>
                <button onClick={() => setMostrarModalMasivo(true)} className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-3 py-2 rounded-xl text-xs transition-colors shrink-0 flex items-center gap-1">📁 Carga Masiva</button>
                <button onClick={() => setMostrarModalEliminarMasivo(true)} className="bg-red-900/50 hover:bg-red-800 text-red-300 border border-red-700 font-bold px-3 py-2 rounded-xl text-xs transition-colors shrink-0 flex items-center gap-1">🗑️ Eliminar Generación</button>
                <button onClick={abrirModalNuevoAlumno} className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold px-3 py-2 rounded-xl text-xs transition-colors shrink-0 flex items-center gap-1">➕ Nuevo</button>
              </div>
            </div>

            {idsSeleccionados.length > 0 && (
              <div className="bg-red-950/40 border-b border-red-900/50 px-6 py-3 flex justify-between items-center">
                <span className="text-red-300 text-xs font-bold">{idsSeleccionados.length} alumnos seleccionados para borrado</span>
                <button onClick={eliminarSeleccionadosDirecto} className="bg-red-600 hover:bg-red-500 text-white px-3 py-1.5 rounded-lg text-xs font-bold transition-colors">Eliminar Selección Marcada</button>
              </div>
            )}

            <div className="overflow-x-auto p-2">
              {cargandoAlumnos ? (
                <p className="text-center text-slate-500 py-10 font-bold">Cargando catálogo de alumnos...</p>
              ) : alumnosFiltrados.length === 0 ? (
                <p className="text-center text-slate-500 py-10 font-bold">No se encontraron alumnos registrados.</p>
              ) : (
                <table className="w-full text-left text-sm">
                  <thead className="text-slate-400 border-b border-slate-800 uppercase text-xs">
                    <tr>
                      <th className="px-3 py-4 text-center"><input type="checkbox" checked={idsSeleccionados.length === alumnosFiltrados.length && alumnosFiltrados.length > 0} onChange={seleccionarTodosActuales} className="cursor-pointer"/></th>
                      <th className="px-4 py-4 font-bold">Nombre Completo</th>
                      <th className="px-4 py-4 font-bold">Matrícula / QR</th>
                      <th className="px-4 py-4 font-bold">Sem / Grupo / Turno</th>
                      <th className="px-4 py-4 font-bold">Datos del Tutor</th>
                      <th className="px-4 py-4 font-bold text-right">Saldo</th>
                      <th className="px-4 py-4 font-bold text-center">Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {alumnosFiltrados.map((al) => (
                      <tr key={al.id} className="border-b border-slate-800/50 hover:bg-slate-800/20">
                        <td className="px-3 py-4 text-center"><input type="checkbox" checked={idsSeleccionados.includes(al.id)} onChange={() => toggleSeleccionAlumno(al.id)} className="cursor-pointer"/></td>
                        <td className="px-4 py-4 text-white font-bold">{al.nombre_completo}</td>
                        <td className="px-4 py-4">
                          <p className="text-slate-300 font-mono text-xs">{al.matricula || 'Sin Matrícula'}</p>
                          {al.codigo_qr ? <span className="bg-indigo-900/40 text-indigo-300 border border-indigo-800 px-1.5 py-0.5 rounded font-mono text-[10px] inline-block mt-1">🏷️ {al.codigo_qr}</span> : <span className="text-slate-600 italic text-[10px] block mt-1">Sin QR</span>}
                        </td>
                        <td className="px-4 py-4 text-xs">
                          <p className="text-white font-bold">{al.semestre} - Grupo {al.grupo}</p>
                          <p className="text-slate-400">{al.turno}</p>
                        </td>
                        <td className="px-4 py-4 text-xs">
                          <p className="text-slate-300">✉️ {al.correo_tutor || 'No registrado'}</p>
                          <p className="text-slate-400">📞 {al.telefono_tutor || 'No registrado'}</p>
                        </td>
                        <td className="px-4 py-4 text-right font-black text-emerald-400">${(al.saldo_actual || 0).toFixed(2)}</td>
                        <td className="px-4 py-4 text-center">
                          <div className="flex justify-center gap-1">
                            <button onClick={() => abrirModalEditarAlumno(al)} className="bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-600 px-2 py-1 rounded text-xs font-bold transition-colors">✏️</button>
                            <button onClick={() => eliminarAlumnoIndividual(al.id, al.nombre_completo)} className="bg-red-900/40 hover:bg-red-800 text-red-300 border border-red-700 px-2 py-1 rounded text-xs font-bold transition-colors">🗑️</button>
                          </div>
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

      {/* ================= CONTENIDO: VISTA PERSONAL (NUEVO) ================= */}
      {vista === 'PERSONAL' && rol === 'SUPERADMIN' && (
        <div className="max-w-6xl mx-auto space-y-8">
          <div className="bg-[#0f172a] rounded-2xl border border-slate-800 shadow-xl overflow-hidden">
            <div className="p-6 border-b border-slate-800 flex flex-col md:flex-row justify-between items-center gap-4 bg-slate-900/50">
              <div>
                <h2 className="text-xl font-bold text-white flex items-center gap-2">👥 Gestión de Personal ({personal.length})</h2>
                <p className="text-slate-400 text-xs mt-1">Cajeros, Choferes, Coordinadores y Administradores</p>
              </div>
              <button onClick={abrirModalNuevoPersonal} className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold px-4 py-2 rounded-xl text-sm transition-colors flex items-center gap-2">
                ➕ Registrar Personal
              </button>
            </div>

            <div className="overflow-x-auto p-2">
              {cargandoPersonal ? (
                <p className="text-center text-slate-500 py-10 font-bold">Cargando catálogo de personal...</p>
              ) : personal.length === 0 ? (
                <p className="text-center text-slate-500 py-10 font-bold">No hay personal registrado en el sistema.</p>
              ) : (
                <table className="w-full text-left text-sm">
                  <thead className="text-slate-400 border-b border-slate-800 uppercase text-xs">
                    <tr>
                      <th className="px-4 py-4 font-bold">Nombre / Correo (Usuario)</th>
                      <th className="px-4 py-4 font-bold">Rol</th>
                      <th className="px-4 py-4 font-bold">Detalles Asignados</th>
                      <th className="px-4 py-4 font-bold">Teléfono</th>
                      <th className="px-4 py-4 font-bold text-center">Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {personal.map((p) => (
                      <tr key={p.id} className="border-b border-slate-800/50 hover:bg-slate-800/20">
                        <td className="px-4 py-4">
                          <p className="text-white font-bold">{p.nombre}</p>
                          <p className="text-slate-400 text-xs">✉️ {p.correo}</p>
                        </td>
                        <td className="px-4 py-4">
                          <span className="bg-indigo-900/40 text-indigo-300 border border-indigo-800 px-2 py-1 rounded text-xs font-black uppercase">
                            {p.rol}
                          </span>
                        </td>
                        <td className="px-4 py-4 text-xs text-slate-300">
                          {p.rol === 'CHOFER' && <p>Ruta: <span className="font-bold text-white">{p.ruta}</span> ({p.tipo_transporte})</p>}
                          {p.rol === 'COORDINADOR' && <p>Semestre: <span className="font-bold text-white">{p.semestre_asignado}</span> - Turno: {p.turno}</p>}
                          {(p.rol === 'CAJA' || p.rol === 'ADMIN' || p.rol === 'SUPERADMIN') && <p className="text-slate-500 italic">Acceso General</p>}
                        </td>
                        <td className="px-4 py-4 text-slate-300 text-xs">
                          📞 {p.telefono || 'N/A'}
                        </td>
                        <td className="px-4 py-4 text-center">
                          <div className="flex justify-center gap-2">
                            <button onClick={() => abrirModalEditarPersonal(p)} className="bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-600 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors">✏️ Editar</button>
                            <button onClick={() => eliminarPersonal(p.id, p.nombre)} className="bg-red-900/40 hover:bg-red-800 text-red-300 border border-red-700 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors">🗑️ Borrar</button>
                          </div>
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

      <div className="text-center mt-10 pb-4 text-slate-600 text-sm">
        System by <span className="font-bold text-slate-500">Arturo Díaz</span>
      </div>

      {/* ================= MODALES EXISTENTES (ALUMNOS, HISTORIAL, CORTE, REPORTES) ================= */}
      {/* ... [Tus modales de alumnos, carga masiva e historiales permanecen exactamente igual, los omito visualmente aquí pero van integrados] ... */}

      {/* ================= MODAL: NUEVO / EDITAR PERSONAL ================= */}
      {mostrarModalPersonal && (
        <div className="fixed inset-0 bg-black/90 flex justify-center items-center z-50 p-4">
          <div className="bg-[#0f172a] border border-slate-700 p-6 md:p-8 rounded-2xl w-full max-w-xl shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-white">
                {personalEditando ? '✏️ Editar Personal' : '➕ Registrar Personal'}
              </h2>
              <button onClick={() => setMostrarModalPersonal(false)} className="text-slate-400 hover:text-white bg-slate-800 px-3 py-1 rounded-lg">✕</button>
            </div>

            <form onSubmit={guardarPersonal} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Rol en el Sistema</label>
                <select 
                  value={formPersonalRol} 
                  onChange={(e) => setFormPersonalRol(e.target.value)}
                  className="w-full bg-[#020617] border border-indigo-500/50 rounded-xl p-3 text-white text-sm outline-none focus:border-indigo-400 font-bold"
                >
                  <option value="CAJA">Caja (Ventas)</option>
                  <option value="CHOFER">Chofer (Unidad)</option>
                  <option value="COORDINADOR">Coordinador (Paradas)</option>
                  <option value="ADMIN">Administrador</option>
                  <option value="SUPERADMIN">Super Administrador</option>
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Nombre Completo</label>
                  <input type="text" required value={formPersonalNombre} onChange={(e) => setFormPersonalNombre(e.target.value)} className="w-full bg-[#020617] border border-slate-700 rounded-xl p-3 text-white text-sm outline-none focus:border-indigo-500" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Correo (Usuario de Acceso)</label>
                  <input type="email" required value={formPersonalCorreo} onChange={(e) => setFormPersonalCorreo(e.target.value)} className="w-full bg-[#020617] border border-slate-700 rounded-xl p-3 text-white text-sm outline-none focus:border-indigo-500" />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Teléfono</label>
                  <input type="tel" required value={formPersonalTelefono} onChange={(e) => setFormPersonalTelefono(e.target.value)} className="w-full bg-[#020617] border border-slate-700 rounded-xl p-3 text-white text-sm outline-none focus:border-indigo-500 font-mono" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Contraseña</label>
                  <input type="text" required value={formPersonalPassword} onChange={(e) => setFormPersonalPassword(e.target.value)} className="w-full bg-[#020617] border border-slate-700 rounded-xl p-3 text-white text-sm outline-none focus:border-indigo-500 font-mono" />
                </div>
              </div>

              {/* CAMPOS CONDICIONALES SEGÚN ROL */}
              {formPersonalRol === 'CHOFER' && (
                <div className="p-4 bg-indigo-900/10 border border-indigo-900/30 rounded-xl mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-indigo-400 uppercase mb-1">Ruta Asignada</label>
                    <input type="text" required value={formPersonalRuta} onChange={(e) => setFormPersonalRuta(e.target.value)} placeholder="Ej. Ruta 1 - Centro" className="w-full bg-[#020617] border border-slate-700 rounded-xl p-3 text-white text-sm outline-none focus:border-indigo-500" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-indigo-400 uppercase mb-1">Tipo de Transporte</label>
                    <select value={formPersonalTipoTransporte} onChange={(e) => setFormPersonalTipoTransporte(e.target.value)} className="w-full bg-[#020617] border border-slate-700 rounded-xl p-3 text-white text-sm outline-none focus:border-indigo-500">
                      <option value="Autobús">Autobús</option>
                      <option value="Van">Van / Camioneta</option>
                    </select>
                  </div>
                </div>
              )}

              {formPersonalRol === 'COORDINADOR' && (
                <div className="p-4 bg-emerald-900/10 border border-emerald-900/30 rounded-xl mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-emerald-400 uppercase mb-1">Semestre Asignado</label>
                    <select value={formPersonalSemestre} onChange={(e) => setFormPersonalSemestre(e.target.value)} className="w-full bg-[#020617] border border-slate-700 rounded-xl p-3 text-white text-sm outline-none focus:border-indigo-500">
                      <option value="1º">1º Semestre</option>
                      <option value="2º">2º Semestre</option>
                      <option value="3º">3º Semestre</option>
                      <option value="4º">4º Semestre</option>
                      <option value="5º">5º Semestre</option>
                      <option value="6º">6º Semestre</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-emerald-400 uppercase mb-1">Turno</label>
                    <select value={formPersonalTurno} onChange={(e) => setFormPersonalTurno(e.target.value)} className="w-full bg-[#020617] border border-slate-700 rounded-xl p-3 text-white text-sm outline-none focus:border-indigo-500">
                      <option value="Matutino">Matutino</option>
                      <option value="Vespertino">Vespertino</option>
                    </select>
                  </div>
                </div>
              )}

              <div className="pt-6 flex gap-3">
                <button type="button" onClick={() => setMostrarModalPersonal(false)} className="w-1/2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold py-3 rounded-xl transition-colors text-sm">
                  Cancelar
                </button>
                <button type="submit" disabled={guardandoPersonal} className="w-1/2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3 rounded-xl transition-colors text-sm">
                  {guardandoPersonal ? 'Guardando...' : 'Guardar Personal'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* AQUÍ VAN TUS MODALES DE ALUMNOS, CARGA MASIVA Y FINANZAS (Corte Z, etc.) DE FORMA HABITUAL */}
      
    </div>
  )
}
