const { Telegraf, Markup } = require('telegraf');

const bot = new Telegraf(process.env.BOT_TOKEN);

// --- 1. SALUDO AUTOMÁTICO AL ENTRAR A UN GRUPO ---
bot.on('new_chat_members', (ctx) => {
    // Verificamos si el nuevo miembro es el bot
    const botId = ctx.botInfo.id;
    const isBotAdded = ctx.message.new_chat_members.some(member => member.id === botId);

    if (isBotAdded) {
        return ctx.replyWithMarkdown(
            `🛡️ *¡Vandox Safe activado en este grupo!*\n\n` +
            `Hola, soy vuestro notario digital. Estoy aquí para asegurar que este intercambio sea 100% seguro para ambas partes.\n\n` +
            `¿Qué deseáis hacer?`,
            Markup.inlineKeyboard([
                [Markup.button.callback('💰 Iniciar Venta (Escrow)', 'nuevo_escrow')],
                [Markup.button.callback('🤝 Iniciar Trueque (Swap)', 'nuevo_swap')]
            ])
        );
    }
});

// --- 2. DETECTOR DE PALABRAS CLAVE (Por si ya estaba en el grupo) ---
bot.on('message', async (ctx) => {
    if (ctx.chat.type === 'group' || ctx.chat.type === 'supergroup') {
        const text = ctx.message.text?.toLowerCase();
        const palabrasClave = ['vendo', 'compro', 'sell', 'buy', 'precio', 'price', 'swap', 'cambio'];
        
        if (text && palabrasClave.some(palabra => text.includes(palabra))) {
            // Solo salta si no ha saludado antes (opcional)
            return ctx.reply(`🛡️ *Vandox Alert:* He detectado una negociación. ¿Queréis usar la Bóveda Segura?`, 
            Markup.inlineKeyboard([
                [Markup.button.callback('🤝 Asegurar con Vandox', 'iniciar_en_grupo')]
            ]));
        }
    }

    // Respuesta en chat privado
    if (ctx.chat.type === 'private' && ctx.message.text === '/start') {
        ctx.replyWithMarkdown('🛡️ *Vandox Safe Bot*\nSelecciona tu idioma:', Markup.inlineKeyboard([
            [Markup.button.callback('Español 🇪🇸', 'lang_es'), Markup.button.callback('English 🇺🇸', 'lang_en')]
        ]));
    }
});

// --- LÓGICA DE BOTONES ---

bot.action('iniciar_en_grupo', (ctx) => {
    ctx.editMessageText('🚀 *Bóveda Activada.* ¿Quién inicia la configuración?', 
    Markup.inlineKeyboard([
        [Markup.button.callback('💰 Soy el Vendedor', 'nuevo_escrow')],
        [Markup.button.callback('🔄 Es un Trueque', 'nuevo_swap')]
    ]));
});

bot.action('nuevo_escrow', (ctx) => {
    ctx.reply('✍️ *Vendedor:* Indica el precio total en USD:');
});

bot.action('nuevo_swap', (ctx) => {
    ctx.reply('🔄 *Modo Trueque:* La tarifa de protección es de $2.00 fijos por la mediación.');
});

bot.action('lang_es', (ctx) => {
    ctx.reply('✅ Menú Principal', Markup.inlineKeyboard([
        [Markup.button.callback('💰 Nueva Venta', 'nuevo_escrow')],
        [Markup.button.callback('📊 Tarifas', 'ver_tarifas')]
    ]));
});

bot.launch();
