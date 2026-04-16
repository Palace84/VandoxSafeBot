const { Telegraf, Markup } = require('telegraf');

const bot = new Telegraf(process.env.BOT_TOKEN);

// Base de datos temporal
let transacciones = {};

bot.start((ctx) => {
    ctx.replyWithMarkdown('🛡️ *Vandox Safe Bot*\nSelecciona tu idioma / Select language:', Markup.inlineKeyboard([
        [Markup.button.callback('Español 🇪🇸', 'lang_es'), Markup.button.callback('English 🇺🇸', 'lang_en')]
    ]));
});

// --- MENÚ PRINCIPAL CON TODAS LAS OPCIONES ---
bot.action('lang_es', (ctx) => {
    ctx.editMessageText('✅ *Vandox Safe: Menú Principal*\n¿Qué tipo de operación deseas asegurar?', 
    { parse_mode: 'Markdown', ...Markup.inlineKeyboard([
        [Markup.button.callback('🤝 Nuevo Trueque (Swap)', 'nuevo_swap')],
        [Markup.button.callback('💰 Nueva Venta (Escrow)', 'nuevo_escrow')],
        [Markup.button.callback('📊 Ver Tarifas Globales', 'ver_tarifas')]
    ])});
});

// --- LÓGICA DE TRUEQUE (SWAP) ---
bot.action('nuevo_swap', (ctx) => {
    ctx.replyWithMarkdown('🔄 *Modo Trueque (Swap)*\n\nEn este modo, Vandox actúa como notario para el cambio de activos digitales.\n\n🛡️ *Tarifa de mediación:* $2.00 fijos.\n\n¿Deseas generar el código de invitación para el otro usuario?', 
    Markup.inlineKeyboard([
        [Markup.button.callback('✅ Generar Invitación', 'generar_inv_swap')],
        [Markup.button.callback('❌ Cancelar', 'lang_es')]
    ]));
});

// --- LÓGICA DE VENTA (ESCROW) ---
bot.action('nuevo_escrow', (ctx) => {
    transacciones[ctx.from.id] = { etapa: 'esperando_monto' };
    ctx.reply('✍️ *Paso 1:* Indica el valor total de la venta en USD (ej: 10 o 50):');
});

// --- MANEJO DE MONTOS ---
bot.on('text', (ctx) => {
    const userId = ctx.from.id;
    if (transacciones[userId]?.etapa === 'esperando_monto') {
        const monto = parseFloat(ctx.message.text);
        if (isNaN(monto)) return ctx.reply('❌ Introduce un número válido.');

        transacciones[userId].monto = monto;
        transacciones[userId].etapa = 'eligiendo_quien_paga';

        ctx.replyWithMarkdown(`💰 *Monto:* $${monto}\n\n¿Quién paga la comisión de seguridad de Vandox?`, 
        Markup.inlineKeyboard([
            [Markup.button.callback('👤 Comprador', 'paga_comprador')],
            [Markup.button.callback('👤 Vendedor', 'paga_vendedor')],
            [Markup.button.callback('🤝 50% / 50%', 'paga_split')]
        ]));
    }
});

// Función auxiliar para calcular pagos de Escrow
const manejarPago = (ctx, tipo) => {
    const userId = ctx.from.id;
    if (!transacciones[userId]) return;
    
    const monto = transacciones[userId].monto;
    let comision = monto < 15 ? 0.80 : monto * 0.03; 
    
    let mensaje = `📦 *Orden Vandox Safe (Escrow)*\n\nValor: $${monto}\nComisión: $${comision.toFixed(2)}\n`;
    
    if (tipo === 'comprador') mensaje += `💳 *Total Comprador:* $${(monto + comision).toFixed(2)}`;
    if (tipo === 'vendedor') mensaje += `💳 *Vendedor recibe:* $${(monto - comision).toFixed(2)}`;
    if (tipo === 'split') mensaje += `🤝 *Cada uno paga:* $${(comision / 2).toFixed(2)}`;

    ctx.editMessageText(mensaje + `\n\n¿Proceder al pago de la comisión?`, {
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

bot.action('ver_tarifas', (ctx) => {
    ctx.replyWithMarkdown('📊 *Tarifas Vandox:*\n\n🤝 *Trueque:* $2.00 fijos.\n💰 *Ventas:* $0.80 (si <$15) o 3% (si >$15).\n\n_Tarifas diseñadas para ser accesibles globalmente._');
});

bot.action('pagar_crypto', (ctx) => {
    ctx.reply('🏦 *Pasarela Vandox:* Envía el pago a tu dirección de USDT (configuración pendiente).');
});

bot.launch();
