const { Telegraf, Markup } = require('telegraf');

const bot = new Telegraf(process.env.BOT_TOKEN);

// Base de datos temporal
let transacciones = {};

bot.start((ctx) => {
    ctx.replyWithMarkdown('🛡️ *Vandox Safe Bot*\nSelecciona tu idioma / Select language:', Markup.inlineKeyboard([
        [Markup.button.callback('Español 🇪🇸', 'lang_es'), Markup.button.callback('English 🇺🇸', 'lang_en')]
    ]));
});

bot.action('lang_es', (ctx) => {
    ctx.editMessageText('✅ *Vandox Safe: Menú Principal*\n¿Qué deseas hacer?', 
    { parse_mode: 'Markdown', ...Markup.inlineKeyboard([
        [Markup.button.callback('🤝 Nuevo Escrow (Venta)', 'nuevo_escrow')],
        [Markup.button.callback('📊 Ver Tarifas Globales', 'ver_tarifas')]
    ])});
});

bot.action('nuevo_escrow', (ctx) => {
    transacciones[ctx.from.id] = { etapa: 'esperando_monto' };
    ctx.reply('✍️ *Paso 1:* Indica el valor total de la venta en USD (ej: 10 o 50):');
});

bot.on('text', (ctx) => {
    const userId = ctx.from.id;
    if (transacciones[userId]?.etapa === 'esperando_monto') {
        const monto = parseFloat(ctx.message.text);
        if (isNaN(monto)) return ctx.reply('❌ Introduce un número válido.');

        transacciones[userId].monto = monto;
        transacciones[userId].etapa = 'eligiendo_quien_paga';

        ctx.replyWithMarkdown(`💰 *Monto:* $${monto}\n\n¿Quién paga la comisión de seguridad?`, 
        Markup.inlineKeyboard([
            [Markup.button.callback('👤 Comprador', 'paga_comprador')],
            [Markup.button.callback('👤 Vendedor', 'paga_vendedor')],
            [Markup.button.callback('🤝 50% / 50%', 'paga_split')]
        ]));
    }
});

// Lógica de quién paga y cálculo de comisión flexible
const manejarPago = (ctx, tipo) => {
    const userId = ctx.from.id;
    const monto = transacciones[userId].monto;
    
    // Tarifas super flexibles (Pensadas para India/Latam)
    let comision = monto < 15 ? 0.80 : monto * 0.03; // $0.80 si es < $15, sino 3%
    
    let mensaje = `📦 *Orden Vandox Safe*\n\nValor: $${monto}\nComisión: $${comision.toFixed(2)}\n`;
    
    if (tipo === 'comprador') mensaje += `💳 *Total Comprador:* $${(monto + comision).toFixed(2)}`;
    if (tipo === 'vendedor') mensaje += `💳 *Vendedor recibe:* $${(monto - comision).toFixed(2)}`;
    if (tipo === 'split') mensaje += `🤝 *Cada uno paga:* $${(comision / 2).toFixed(2)}`;

    ctx.editMessageText(mensaje + `\n\n¿Proceder al pago seguro?`, {
        parse_mode: 'Markdown',
        ...Markup.inlineKeyboard([
            [Markup.button.callback('💳 Ir a pagar', 'pagar_crypto')],
            [Markup.button.callback('❌ Cancelar', 'lang_es')]
        ])
    });
};

bot.action('paga_comprador', (ctx) => manejarPago(ctx, 'comprador'));
bot.action('paga_vendedor', (ctx) => manejarPago(ctx, 'vendedor'));
bot.action('paga_split', (ctx) => manejarPago(ctx, 'split'));

bot.action('pagar_crypto', (ctx) => {
    ctx.reply('🏦 *Pasarela:* Envía el pago a tu dirección de USDT (Aún no configurada).');
});

bot.launch();
