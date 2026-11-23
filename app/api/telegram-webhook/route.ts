import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;

// Función auxiliar para responderle al papá/tutor en Telegram
async function enviarRespuestaTelegram(chatId: number, texto: string) {
  if (!TELEGRAM_BOT_TOKEN) return;
  try {
    await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text: texto,
        parse_mode: "Markdown",
      }),
    });
  } catch (error) {
    console.error("Error enviando respuesta a Telegram:", error);
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    // Validar que sea un mensaje de texto normal
    if (!body.message || !body.message.text) {
      return NextResponse.json({ success: true }); 
    }

    const chatId = body.message.chat.id;
    const texto = body.message.text.trim();

    // 1. Si el tutor inicia el bot por primera vez (/start)
    if (texto === "/start") {
      const bienvenida = `👋 *¡Bienvenido al Bot Oficial de SITE-PEM!*\n\nPara recibir las notificaciones de transporte y acceso escolar de tu hijo(a), por favor vincula tu cuenta enviando el siguiente comando con su matrícula escolar (o el código proporcionado por administración):\n\n👉 \`/vincular MATRICULA\`\n\nEjemplo: \`/vincular 67890\``;
      await enviarRespuestaTelegram(chatId, bienvenida);
      return NextResponse.json({ success: true });
    }

    // 2. Si el tutor intenta vincular una matrícula o código secundario (/vincular)
    if (texto.toLowerCase().startsWith("/vincular")) {
      const partes = texto.split(/\s+/);
      
      if (partes.length < 2) {
        await enviarRespuestaTelegram(chatId, "⚠️ *Error:* Debes incluir la matrícula o código de vinculación. Ejemplo:\n`/vincular 67890`");
        return NextResponse.json({ success: true });
      }

      const valorIngresado = partes[1].trim().toUpperCase();

      // CASO A: Código secundario generado en SuperAdmin (formato PEM-XXXX)
      if (valorIngresado.startsWith("PEM-")) {
        const { data: alumnosCodigo, error: errorCodigo } = await supabase
          .from("alumnos")
          .select("id, matricula, nombre_completo")
          .eq("codigo_vinculacion_2", valorIngresado)
          .limit(1);

        if (errorCodigo || !alumnosCodigo || alumnosCodigo.length === 0) {
          await enviarRespuestaTelegram(
            chatId,
            `❌ *Código inválido o ya utilizado.*\nNo encontramos un código activo con: *${valorIngresado}*. Solicita uno nuevo en administración.`
          );
          return NextResponse.json({ success: true });
        }

        const alumno = alumnosCodigo[0];

        // Guardamos en chat_id_telegram_2 y limpiamos el código usado (un solo uso)
        const { error: updateError2 } = await supabase
          .from("alumnos")
          .update({
            chat_id_telegram_2: chatId.toString(),
            codigo_vinculacion_2: null,
          })
          .eq("id", alumno.id);

        if (updateError2) {
          await enviarRespuestaTelegram(chatId, "❌ *Error interno:* No se pudo vincular la cuenta secundaria. Contacta a Soporte SITE-PEM.");
          return NextResponse.json({ success: true });
        }

        const exito2 = `✅ *¡VINCULACIÓN SECUNDARIA EXITOSA!*\n\nEste número de Telegram (Contacto 2) ha sido enlazado al estudiante:\n🎓 *${alumno.nombre_completo}*\n\nA partir de este momento recibirás notificaciones del sistema SITE-PEM.`;
        await enviarRespuestaTelegram(chatId, exito2);
        return NextResponse.json({ success: true });
      }

      // CASO B: Vinculación principal por Matrícula (Telegram 1)
      const matriculaLimpia = valorIngresado.replace(/[^a-zA-Z0-9]/g, "");

      const { data: alumnos, error } = await supabase
        .from("alumnos")
        .select("id, matricula, nombre_completo")
        .eq("matricula", matriculaLimpia)
        .limit(1);

      if (error || !alumnos || alumnos.length === 0) {
        await enviarRespuestaTelegram(chatId, `❌ *Matrícula no encontrada.*\nNo tenemos registro de la matrícula: *${matriculaLimpia}*. Por favor, verifica y vuelve a intentarlo.`);
        return NextResponse.json({ success: true });
      }

      const alumno = alumnos[0];

      const { error: updateError } = await supabase
        .from("alumnos")
        .update({ telegram_chat_id: chatId.toString() })
        .eq("matricula", matriculaLimpia);

      if (updateError) {
        await enviarRespuestaTelegram(chatId, "❌ *Error interno:* No se pudo vincular la cuenta. Contacta a Soporte SITE-PEM.");
        return NextResponse.json({ success: true });
      }

      const exito = `✅ *¡VINCULACIÓN EXITOSA!*\n\nEste número de Telegram ha sido enlazado al estudiante:\n🎓 *${alumno.nombre_completo}*\n\nA partir de este momento recibirás notificaciones del sistema SITE-PEM.`;
      await enviarRespuestaTelegram(chatId, exito);
      
      return NextResponse.json({ success: true });
    }

    // 3. Cualquier otro mensaje que no sea un comando válido
    await enviarRespuestaTelegram(chatId, "🤖 No reconozco ese comando. Por favor, usa `/vincular MATRICULA` para registrarte.");
    return NextResponse.json({ success: true });

  } catch (error) {
    console.error("Error en el Webhook de Telegram SITE-PEM:", error);
    return NextResponse.json({ success: true });
  }
}
