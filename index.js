const { Telegraf, Markup } = require('telegraf');

const bot = new Telegraf(process.env.BOT_TOKEN);

// --- DETECTOR DE NEGOCIOS EN GRUPOS ---
bot.on('message', async (ctx) => {
    // Solo actuamos si es un grupo
    if (ctx.chat.type === 'group' || ctx.chat.type === 'supergroup') {
        const text = ctx.message.text?.toLowerCase();
        
        // Palabras clave que activan a Vandox
        const palabrasClave = ['vendo', 'compro', 'sell', 'buy', 'precio', 'price', 'swap', 'cambio'];
        
        if (text && palabrasClave.some(palabra => text.includes(palabra))) {
            return ctx.reply(`🛡️ *Vandox Safe detectado:* ¿Necesitáis asegurar esta transacción para evitar estafas?`, 
            Markup.inlineKeyboard([
                [Markup.button.callback('🤝 Asegurar Trato (Escrow)', 'iniciar_en_grupo')],
                [Markup.button.callback('❌ Ignorar', 'cancelar')]
            ], { parse_mode: 'Markdown' }));
        }
    }

    // Si es un chat privado, mostramos el menú normal
    if (ctx.chat.type === 'private' && ctx.message.text === '/start') {
        ctx.replyWithMarkdown('🛡️ *Vandox Safe Bot*\nSelecciona tu idioma:', Markup.inlineKeyboard([
            [Markup.button.callback('Español 🇪🇸', 'lang_es'), Markup.button.callback('English 🇺🇸', 'lang_en')]
        ]));
    }
});

// --- ACCIÓN AL PULSAR "ASEGURAR TRATO" EN UN GRUPO ---
bot.action('iniciar_en_grupo', (ctx) => {
    ctx.replyWithMarkdown(
        `🚀 *¡Bóveda Vandox Activada!*\n\n` +
        `Para comenzar, el **Vendedor** debe configurar el monto pulsando el botón de abajo.\n` +
        `Yo me encargaré de custodiar el pago y los archivos.`,
        Markup.inlineKeyboard([
            [Markup.button.callback('💰 Configurar Venta', 'nuevo_escrow')]
        ])
    );
});

// (Aquí seguiría el resto de tu lógica de montos y pagos que ya teníamos)
bot.action('nuevo_escrow', (ctx) => {
    ctx.reply('✍️ Indica el valor total de la venta en USD:');
});

bot.action('lang_es', (ctx) => {
    ctx.reply('✅ Menú Principal', Markup.inlineKeyboard([
        [Markup.button.callback('💰 Nueva Venta', 'nuevo_escrow')],
        [Markup.button.callback('📊 Tarifas', 'ver_tarifas')]
    ]));
});

bot.action('ver_tarifas', (ctx) => {
    ctx.reply('📊 Tarifas: $0.80 (<$15) o 3% (>$15).');
});

bot.launch();
