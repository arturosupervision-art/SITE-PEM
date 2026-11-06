import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;

// Función auxiliar para responderle al papá en Telegram
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

    // 1. Si el papá inicia el bot por primera vez (/start)
    if (texto === "/start") {
      const bienvenida = `👋 *¡Bienvenido al Bot Oficial de SITE-PEM!*\n\nPara recibir las notificaciones de acceso, por favor vincula tu cuenta enviando el siguiente comando con la matrícula escolar de tu hijo(a):\n\n👉 \`/vincular MATRICULA\`\n\nEjemplo: \`/vincular 67890\``;
      await enviarRespuestaTelegram(chatId, bienvenida);
      return NextResponse.json({ success: true });
    }

    // 2. Si el papá intenta vincular una matrícula (/vincular)
    if (texto.toLowerCase().startsWith("/vincular")) {
      const partes = texto.split(" ");
      
      if (partes.length < 2) {
        await enviarRespuestaTelegram(chatId, "⚠️ *Error:* Debes incluir la matrícula. Ejemplo:\n`/vincular 67890`");
        return NextResponse.json({ success: true });
      }

      // Extraemos la matrícula que escribió el papá y la limpiamos
      const matriculaLimpia = partes[1].replace(/[^a-zA-Z0-9]/g, "").toUpperCase();

      // Buscamos al alumno en Supabase
      const { data: alumnos, error } = await supabase
        .from("alumnos")
        .select("*")
        .eq("matricula", matriculaLimpia)
        .limit(1);

      if (error || !alumnos || alumnos.length === 0) {
        await enviarRespuestaTelegram(chatId, `❌ *Matrícula no encontrada.*\nNo tenemos registro de la matrícula: *${matriculaLimpia}*. Por favor, verifica y vuelve a intentarlo.`);
        return NextResponse.json({ success: true });
      }

      const alumno = alumnos[0];

      // Actualizamos usando la columna correcta que tienes en Supabase (telegram_chat_id)
      const { error: updateError } = await supabase
        .from("alumnos")
        .update({ telegram_chat_id: chatId.toString() })
        .eq("matricula", matriculaLimpia);

      if (updateError) {
        await enviarRespuestaTelegram(chatId, "❌ *Error interno:* No se pudo vincular la cuenta. Contacta a Coordinación.");
        return NextResponse.json({ success: true });
      }

      const exito = `✅ *¡VINCULACIÓN EXITOSA!*\n\nEste número de Telegram ha sido enlazado al estudiante:\n🎓 *${alumno.nombre_completo}*\n\nA partir de este momento recibirás alertas automáticas.`;
      await enviarRespuestaTelegram(chatId, exito);
      
      return NextResponse.json({ success: true });
    }

    // 3. Cualquier otro mensaje que no sea un comando válido
    await enviarRespuestaTelegram(chatId, "🤖 No reconozco ese comando. Por favor, usa `/vincular MATRICULA` para registrarte.");
    return NextResponse.json({ success: true });

  } catch (error) {
    console.error("Error en el Webhook de Telegram:", error);
    return NextResponse.json({ success: true });
  }
}
