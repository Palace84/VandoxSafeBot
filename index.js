const { Telegraf, Markup } = require('telegraf');

const bot = new Telegraf(process.env.BOT_TOKEN);

// Función de Bienvenida
const bienvenidaVandox = (ctx) => {
    return ctx.replyWithMarkdown(
        `🛡️ *Vandox Safe: Bóveda de Seguridad*\n\n` +
        `He detectado una operación. Soy vuestro notario para asegurar que el intercambio sea justo y sin estafas.\n\n` +
        `¿Qué tipo de trato vais a realizar?`,
        Markup.inlineKeyboard([
            [Markup.button.callback('💰 Iniciar Venta (Escrow)', 'nuevo_escrow')],
            [Markup.button.callback('🤝 Iniciar Trueque (Swap)', 'nuevo_swap')]
        ])
    );
};

// --- EL TRUCO: ESCUCHAR TODO EN GRUPOS ---
bot.on('message', (ctx) => {
    const text = ctx.message.text?.toLowerCase();

    if (ctx.chat.type === 'group' || ctx.chat.type === 'supergroup') {
        
        // 1. Si alguien menciona al bot o pone /start
        if (text?.includes(`@${ctx.botInfo.username}`) || text === '/start') {
            return bienvenidaVandox(ctx);
        }

        // 2. SALTO AUTOMÁTICO: Si detecta palabras clave de negocio
        const disparadores = ['hola', 'vendo', 'compro', 'precio', 'pago', 'deal', 'swap', 'envia', 'recibo'];
        if (text && disparadores.some(p => text.includes(p))) {
            return bienvenidaVandox(ctx);
        }
    }

    // Chat Privado
    if (ctx.chat.type === 'private' && text === '/start') {
        ctx.replyWithMarkdown('🛡️ *Vandox Safe Bot*\nSelecciona tu idioma:', Markup.inlineKeyboard([
            [Markup.button.callback('Español 🇪🇸', 'lang_es'), Markup.button.callback('English 🇺🇸', 'lang_en')]
        ]));
    }
});

// Botones
bot.action('nuevo_escrow', (ctx) => ctx.reply('✍️ *Vendedor:* Indica el precio en USD:'));
bot.action('nuevo_swap', (ctx) => ctx.reply('🔄 *Modo Trueque:* Tarifa de $2.00 fijos por seguridad.'));
bot.action('lang_es', (ctx) => {
    ctx.reply('✅ Menú Vandox:', Markup.inlineKeyboard([
        [Markup.button.callback('💰 Nueva Venta', 'nuevo_escrow')],
        [Markup.button.callback('📊 Tarifas', 'ver_tarifas')]
    ]));
});

bot.launch();
