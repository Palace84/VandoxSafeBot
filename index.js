const { Telegraf, Markup } = require('telegraf');

const bot = new Telegraf(process.env.BOT_TOKEN);

// --- SALUDO FORZADO AL ENTRAR A UN GRUPO ---
bot.on('new_chat_members', (ctx) => {
    const isBotAdded = ctx.message.new_chat_members.some(member => member.id === ctx.botInfo.id);
    if (isBotAdded) {
        enviarBienvenidaGrupo(ctx);
    }
});

// Por si acaso el bot ya estaba y alguien pone /start o algo, que también salude
bot.command('start', (ctx) => {
    if (ctx.chat.type === 'group' || ctx.chat.type === 'supergroup') {
        return enviarBienvenidaGrupo(ctx);
    }
    // Si es privado, menú normal
    ctx.replyWithMarkdown('🛡️ *Vandox Safe Bot*\nSelecciona tu idioma:', Markup.inlineKeyboard([
        [Markup.button.callback('Español 🇪🇸', 'lang_es'), Markup.button.callback('English 🇺🇸', 'lang_en')]
    ]));
});

// Función centralizada de bienvenida
function enviarBienvenidaGrupo(ctx) {
    ctx.replyWithMarkdown(
        `🛡️ *¡Bóveda Vandox Activada!*\n\n` +
        `Detecto que este grupo es para un intercambio. Estoy listo para actuar como vuestro notario digital.\n\n` +
        `Para empezar, seleccionad el tipo de trato:`,
        Markup.inlineKeyboard([
            [Markup.button.callback('💰 Iniciar Venta (Escrow)', 'nuevo_escrow')],
            [Markup.button.callback('🤝 Iniciar Trueque (Swap)', 'nuevo_swap')]
        ])
    );
}

// --- DETECTOR DE PALABRAS CLAVE (Se mantiene como refuerzo) ---
bot.on('message', (ctx) => {
    if (ctx.chat.type === 'group' || ctx.chat.type === 'supergroup') {
        const text = ctx.message.text?.toLowerCase();
        const palabras = ['vendo', 'compro', 'sell', 'buy', 'precio', 'price', 'swap', 'cambio'];
        if (text && palabras.some(p => text.includes(p))) {
            // Solo responde si no hay botones activos
            ctx.reply(`🛡️ *Vandox Alert:* Negociación detectada. ¿Queréis asegurar el trato?`, 
            Markup.inlineKeyboard([[Markup.button.callback('🤝 Asegurar ahora', 'iniciar_en_grupo')]]));
        }
    }
});

// (Mantenemos el resto de botones igual para no romper nada)
bot.action('nuevo_escrow', (ctx) => ctx.reply('✍️ *Vendedor:* Indica el precio total en USD:'));
bot.action('nuevo_swap', (ctx) => ctx.reply('🔄 *Modo Trueque:* La tarifa es de $2.00 fijos.'));
bot.action('iniciar_en_grupo', (ctx) => enviarBienvenidaGrupo(ctx));

bot.launch();
