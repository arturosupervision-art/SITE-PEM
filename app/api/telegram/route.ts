import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { ticket, chatId } = await req.json();

    const token = process.env.TELEGRAM_BOT_TOKEN;
    const destino = chatId || process.env.TELEGRAM_CHAT_ID;

    if (!token || !destino) {
      return NextResponse.json(
        { error: 'Faltan las claves de Telegram en .env.local' },
        { status: 500 }
      );
    }

    const mensaje = `
<pre>
================================
      PREPARATORIA UDL
    TRANSPORTE ESCOLAR
================================
Folio:  ${ticket.folio}
Fecha:  ${ticket.fecha}
Cajero: ${ticket.cajero}
--------------------------------
ALUMNO:
${ticket.alumno}
Matrícula: ${ticket.matricula}
--------------------------------
CONCEPTO
Viajes / Boletos:  ${ticket.cantidad} pza(s)
TOTAL PAGADO:      $${ticket.monto}.00 MXN
--------------------------------
SALDO ACTUAL:      ${ticket.nuevoSaldo} viajes
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

    if (!res.ok) {
      const errData = await res.json();
      return NextResponse.json({ error: errData }, { status: 400 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: 'Error al enviar a Telegram' }, { status: 500 });
  }
}
