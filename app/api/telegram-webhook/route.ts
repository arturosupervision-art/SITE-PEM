import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Inicializar Supabase (Asegúrate de tener estas variables en tu .env.local)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
const supabase = createClient(supabaseUrl, supabaseKey)

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN

// Función para enviar mensajes de vuelta a Telegram
async function sendTelegramMessage(chatId: number, text: string) {
  const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`
  await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      text: text,
    }),
  })
}

export async function POST(req: Request) {
  try {
    const body = await req.json()

    // Verificar si el evento tiene un mensaje y texto
    if (body.message && body.message.text) {
      const chatId = body.message.chat.id
      const text = body.message.text.trim()

      // Detectar si es el comando /start con el ID del tutor
      // El formato que envía el botón es: /start ID_TUTOR
      if (text.startsWith('/start ')) {
        const tutorId = text.split(' ')[1] // Extraemos el ID que va después del espacio

        if (tutorId) {
          // Actualizar en Supabase: Buscar al tutor por su ID y guardarle el chat_id
          const { data, error } = await supabase
            .from('usuarios') // CAMBIA 'usuarios' por el nombre real de tu tabla de tutores si es diferente
            .update({ telegram_chat_id: chatId.toString() }) // CAMBIA 'telegram_chat_id' por tu columna real
            .eq('id', tutorId)
            .select()

          if (error) {
            console.error('Error actualizando Supabase:', error)
            await sendTelegramMessage(
              chatId,
              '❌ Hubo un error vinculando tu cuenta. Por favor, contacta a la escuela.'
            )
          } else if (data && data.length > 0) {
            await sendTelegramMessage(
              chatId,
              '✅ ¡Hola! Tu cuenta ha sido vinculada exitosamente. A partir de ahora recibirás aquí las notificaciones de acceso de tus hijos al transporte.'
            )
          } else {
            await sendTelegramMessage(
              chatId,
              '⚠️ No encontramos una cuenta con ese identificador. Verifica tu enlace en la plataforma escolar.'
            )
          }
        }
      } else if (text === '/start') {
        // Si entran sin el ID
        await sendTelegramMessage(
          chatId,
          '👋 ¡Hola! Para vincular tu cuenta, por favor haz clic en el botón de Telegram desde el panel de la plataforma escolar.'
        )
      }
    }

    // Siempre debemos responder con 200 a Telegram para que no reintente enviar el mismo mensaje
    return NextResponse.json({ status: 'ok' })
  } catch (error) {
    console.error('Error en el Webhook de Telegram:', error)
    return NextResponse.json({ status: 'error' }, { status: 500 })
  }
}
