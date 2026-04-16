const { Telegraf, Markup } = require('telegraf');

const bot = new Telegraf(process.env.BOT_TOKEN);

// --- FUNCIÓN DE BIENVENIDA REUTILIZABLE ---
const saludarGrupo = (ctx) => {
    return ctx.replyWithMarkdown(
        `🛡️ *¡Bóveda Vandox Activada!*\n\n` +
        `Detecto una operación en este grupo. Soy vuestro notario digital para asegurar que nadie sea estafado.\n\n` +
        `¿Qué tipo de trato vais a realizar?`,
        Markup.inlineKeyboard([
            [Markup.button.callback('💰 Iniciar Venta (Escrow)', 'nuevo_escrow')],
            [Markup.button.callback('🤝 Iniciar Trueque (Swap)', 'nuevo_swap')]
        ])
    );
};

// --- 1. DETECTAR CUANDO ES AÑADIDO (Evento directo) ---
bot.on('new_chat_members', (ctx) => {
    const isBotAdded = ctx.message.new_chat_members.some(member => member.id === ctx.botInfo.id);
    if (isBotAdded) {
        return saludarGrupo(ctx);
    }
});

// --- 2. DETECTAR CUALQUIER MENSAJE (Por si el evento anterior falla) ---
bot.on('message', (ctx) => {
    const userId = ctx.from.id;
    const text = ctx.message.text?.toLowerCase();

    // Si estamos en un grupo
    if (ctx.chat.type === 'group' || ctx.chat.type === 'supergroup') {
        
        // Si alguien pone /start o menciona al bot, saludamos
        if (text === '/start' || text?.includes(`@${ctx.botInfo.username}`)) {
            return saludarGrupo(ctx);
        }

        // Si detectamos palabras de negocio y el bot no ha hablado aún
        const palabrasNegocio = ['vendo', 'compro', 'sell', 'buy', 'precio', 'price', 'swap', 'cambio', 'pago'];
        if (text && palabrasNegocio.some(p => text.includes(p))) {
            return saludarGrupo(ctx);
        }
    }

    // Si es chat privado (Menú normal)
    if (ctx.chat.type === 'private' && text === '/start') {
        ctx.replyWithMarkdown('🛡️ *Vandox Safe Bot*\nSelecciona tu idioma:', Markup.inlineKeyboard([
            [Markup.button.callback('Español 🇪🇸', 'lang_es'), Markup.button.callback('English 🇺🇸', 'lang_en')]
        ]));
    }
});

// --- LÓGICA DE BOTONES ---
bot.action('nuevo_escrow', (ctx) => {
    ctx.reply('✍️ *Vendedor:* Por favor, escribe el precio total del trato en USD (ej: 50):');
});

bot.action('nuevo_swap', (ctx) => {
    ctx.reply('🔄 *Modo Trueque:* Vandox custodiará los activos de ambos. La tarifa de mediación es de $2.00 fijos.');
});

bot.action('lang_es', (ctx) => {
    ctx.reply('✅ *Menú Vandox:*', Markup.inlineKeyboard([
        [Markup.button.callback('💰 Nueva Venta', 'nuevo_escrow')],
        [Markup.button.callback('📊 Tarifas', 'ver_tarifas')]
    ]));
});

bot.launch();
