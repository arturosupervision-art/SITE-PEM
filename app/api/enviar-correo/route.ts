import { NextResponse } from 'next/server';
import nodemailer from 'nodemailer';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { correoTutor, nombreAlumno, tipoMovimiento, hora, ubicacion } = body;

    // 1. Configuramos tu cuenta de Gmail
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: 'notificaciones@pem.edu.mx', // <-- CAMBIA ESTO POR TU GMAIL
        pass: 'zuto kvhl aoyf pvxs ' // <-- CAMBIA ESTO POR TU CONTRASEÑA DE APLICACIÓN
      },
    });

    // 2. Diseñamos el correo
    const asunto = tipoMovimiento === 'ASCENSO' 
      ? `🚌 ${nombreAlumno} ha abordado el transporte escolar` 
      : `✅ ${nombreAlumno} ha bajado del transporte escolar`;

    const color = tipoMovimiento === 'ASCENSO' ? '#28B463' : '#2E86C1';

    const plantillaHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; border: 1px solid #ddd; border-radius: 10px; overflow: hidden;">
        <div style="background-color: ${color}; color: white; padding: 15px; text-align: center;">
          <h2 style="margin:0;">Aviso de Transporte Escolar</h2>
        </div>
        <div style="padding: 20px;">
          <p>Hola,</p>
          <p>Le informamos que el alumno <strong>${nombreAlumno}</strong> ha registrado un <strong>${tipoMovimiento}</strong> exitoso en nuestra unidad.</p>
          <ul style="background-color: #f9f9f9; padding: 15px; border-radius: 5px; list-style-type: none;">
            <li style="margin-bottom: 10px;">⏰ <strong>Hora:</strong> ${hora}</li>
            <li>📍 <strong>Ruta/Ubicación:</strong> ${ubicacion}</li>
          </ul>
          <p style="color: #666; font-size: 12px; margin-top: 30px;">
            Este es un mensaje automático del sistema, por favor no responda a este correo.
          </p>
        </div>
      </div>
    `;

    // 3. Enviamos el correo
    await transporter.sendMail({
      from: '"Transporte Escolar" <notificaciones@pem.edu.mx>', // <-- CAMBIA ESTO POR TU GMAIL
      to: correoTutor,
      subject: asunto,
      html: plantillaHtml,
    });

    return NextResponse.json({ mensaje: 'Correo enviado' }, { status: 200 });

  } catch (error) {
    console.error('Error al enviar:', error);
    return NextResponse.json({ error: 'Hubo un error' }, { status: 500 });
  }
}
