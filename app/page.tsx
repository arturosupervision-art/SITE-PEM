// Asegúrate de importar Supabase al inicio de tu archivo
// import { supabase } from '../ruta-a-tu-cliente-supabase'; 

const procesarCancelacionDeVenta = async (venta) => {
  try {
    // 1. Consultamos el saldo actual del alumno en la base de datos
    const { data: alumno, error: errorAlumno } = await supabase
      .from('alumnos')
      .select('saldo_boletos, nombre_completo')
      .eq('id', venta.alumno_id) // ID del alumno asociado a la venta
      .single();

    if (errorAlumno) throw errorAlumno;

    // 2. 🚨 EL CANDADO ANTI-FRAUDE 🚨
    // Si el saldo que le queda es menor a los boletos que quiere devolver:
    if (alumno.saldo_boletos < venta.cantidad_boletos) {
      alert(`❌ CANCELACIÓN RECHAZADA\n\nEl alumno ${alumno.nombre_completo} ya utilizó viajes de esta compra.\n\nSaldo actual: ${alumno.saldo_boletos} boletos\nIntenta devolver: ${venta.cantidad_boletos} boletos\n\nEl sistema bloqueó la devolución para evitar fraude.`);
      return; // ⛔ Se detiene TODO aquí. No se le devuelve dinero.
    }

    // 3. Si pasa el candado, calculamos el nuevo saldo restando los boletos devueltos
    const nuevoSaldo = alumno.saldo_boletos - venta.cantidad_boletos;

    // 4. Actualizamos el saldo del alumno en Supabase
    const { error: errorUpdateAlumno } = await supabase
      .from('alumnos')
      .update({ saldo_boletos: nuevoSaldo })
      .eq('id', venta.alumno_id);

    if (errorUpdateAlumno) throw errorUpdateAlumno;

    // 5. Cambiamos el estado de la venta a "Cancelada" o "Devuelta"
    const { error: errorUpdateVenta } = await supabase
      .from('ventas') // Pon el nombre exacto de tu tabla de ventas
      .update({ estado: 'cancelada' }) // O el estatus que manejes
      .eq('id', venta.id);

    if (errorUpdateVenta) throw errorUpdateVenta;

    // 6. Éxito
    alert(`✅ DEVOLUCIÓN EXITOSA\n\nSe autoriza devolver el dinero de ${venta.cantidad_boletos} boletos.\nEl nuevo saldo de ${alumno.nombre_completo} es de ${nuevoSaldo} boletos.`);
    
    // Aquí puedes llamar a tu función que recarga la tabla de ventas para que se actualice la vista
    // cargarVentas(); 

  } catch (error) {
    console.error("Error al cancelar la venta:", error);
    alert("Ocurrió un error al procesar la cancelación. Revisa la consola.");
  }
};
