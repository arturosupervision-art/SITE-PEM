import { NextResponse } from 'next/server';

const escapeHtml = (value: unknown) =>
  String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { ticket, chatId } = body;

    if (!ticket) {
      return NextResponse.json(
        { error: 'Falta el objeto ticket en la petición' },
        { status: 400 }
      );
    }

    const token = process.env.TELEGRAM_BOT_TOKEN?.trim();
    const destino = (chatId ? String(chatId).trim() : '') || process.env.TELEGRAM_CHAT_ID?.trim();

    if (!token || !destino) {
      return NextResponse.json(
        { error: 'Faltan las claves de Telegram (TELEGRAM_BOT_TOKEN o chat_id)' },
        { status: 500 }
      );
    }

    const montoFormateado = Number(ticket.monto ?? 0).toFixed(2);

    const mensaje = `
<pre>
================================
      PREPARATORIA UDL
    TRANSPORTE ESCOLAR
================================
Folio:  ${escapeHtml(ticket.folio)}
Fecha:  ${escapeHtml(ticket.fecha)}
Cajero: ${escapeHtml(ticket.cajero)}
--------------------------------
ALUMNO:
${escapeHtml(ticket.alumno)}
Matrícula: ${escapeHtml(ticket.matricula)}
--------------------------------
CONCEPTO
Viajes / Boletos:  ${escapeHtml(ticket.cantidad)} pza(s)
TOTAL PAGADO:      $${montoFormateado} MXN
--------------------------------
SALDO ACTUAL:      ${escapeHtml(ticket.nuevoSaldo)} viajes
================================
   ¡Gracias por tu compra!
    Comprobante Digital
================================
</pre>
`.trim();

    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: destino,
        text: mensaje,
        parse_mode: 'HTML',
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      console.error('Error de Telegram API:', data);
      return NextResponse.json({ error: data.description || data }, { status: 400 });
    }

    return NextResponse.json({ ok: true, messageId: data.result?.message_id });
  } catch (error) {
    console.error('Error interno en /api/telegram:', error);
    return NextResponse.json(
      { error: 'Error al enviar a Telegram', details: String(error) },
      { status: 500 }
    );
  }
}
