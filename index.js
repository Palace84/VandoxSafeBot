const { Telegraf, Markup } = require('telegraf');

// El bot usa el Token que configuraste en Railway
const bot = new Telegraf(process.env.BOT_TOKEN);

// --- BIENVENIDA Y SELECCIÓN DE IDIOMA ---
bot.start((ctx) => {
    const welcomeMsg = `
🛡️ *Welcome to Vandox Safe Bot*
The secure vault for your digital trades.

🌍 *Choose your language / Selecciona tu idioma:*
    `;
    ctx.replyWithMarkdown(welcomeMsg, Markup.inlineKeyboard([
        [Markup.button.callback('Español 🇪🇸', 'lang_es'), Markup.button.callback('English 🇺🇸', 'lang_en')],
        [Markup.button.callback('हिन्दी (Hindi) 🇮🇳', 'lang_hi'), Markup.button.callback('日本語 (Japanese) 🇯🇵', 'lang_jp')]
    ]));
});

// --- LÓGICA PARA ESPAÑOL ---
bot.action('lang_es', (ctx) => {
    ctx.editMessageText('✅ *Idioma: Español*\n\nBienvenido a Vandox. ¿Qué deseas hacer hoy?', 
    { parse_mode: 'Markdown', ...Markup.inlineKeyboard([
        [Markup.button.callback('🤝 Iniciar Trueque (Swap)', 'start_swap')],
        [Markup.button.callback('💰 Iniciar Venta (Escrow)', 'start_sale')]
    ])});
});

// --- LÓGICA PARA INGLÉS ---
bot.action('lang_en', (ctx) => {
    ctx.editMessageText('✅ *Language: English*\n\nWelcome to Vandox. What would you like to do?', 
    { parse_mode: 'Markdown', ...Markup.inlineKeyboard([
        [Markup.button.callback('🤝 Start Swap', 'start_swap')],
        [Markup.button.callback('💰 Start Sale', 'start_sale')]
    ])});
});

// --- RESPUESTA A BOTONES DE ACCIÓN (Provisional) ---
bot.action('start_swap', (ctx) => {
    ctx.reply('🚧 *Fase de Bóveda:* Esta función estará lista en cuanto configuremos el grupo de 3. ¡Estamos en ello!');
});

bot.action('start_sale', (ctx) => {
    ctx.reply('💰 *Vandox Escrow:* Preparando la pasarela de pago segura...');
});

// --- DETECCIÓN EN GRUPOS ---
bot.on('message', (ctx) => {
    if (ctx.chat.type === 'group' || ctx.chat.type === 'supergroup') {
        const text = ctx.message.text?.toLowerCase();
        if (text?.includes('vender') || text?.includes('sell') || text?.includes('comprar')) {
            ctx.reply(`⚠️ *Vandox Alert:* He detectado una posible transacción. Para vuestra seguridad, usad Vandox Safe.`);
        }
    }
});

bot.launch();
console.log("🚀 Vandox Safe Bot está en marcha...");
