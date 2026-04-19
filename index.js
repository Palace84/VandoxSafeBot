const { Telegraf, Markup } = require('telegraf');
const { createClient } = require('@supabase/supabase-js');

const bot = new Telegraf(process.env.BOT_TOKEN);
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);
const ADMIN_ID = process.env.ADMIN_ID;

const WALLET_TON = 'UQAfvihg2RIt_PFSTfBOYLYC-8ABrUd1IbAxUItFAOVmc8lH';

// --- HELPERS ---
function calcFee(amount) {
    return amount < 50 ? 1.00 : parseFloat((amount * 0.015).toFixed(2));
}

function genCode() {
    return String(Math.floor(1000 + Math.random() * 9000));
}

function genTxId() {
    return 'VDX-2026-' + Math.floor(1000 + Math.random() * 9000);
}

function getLang(ctx) {
    const lang = ctx.from?.language_code;
    return lang && lang.startsWith('es') ? 'es' : 'en';
}

function t(lang, key) {
    const texts = {
        en: {
            detected: '🛡️ *Vandox Safe* — I detected a deal in progress.\nWant me to secure it so both sides are protected?',
            startBtn: '🔒 Secure this deal',
            tarifasBtn: '📊 View pricing',
            welcome: '🛡️ *Vandox Safe*\n\nWhat type of deal?',
            saleBtn: '💵 Sale (money for product)',
            swapBtn: '🔄 Swap (product for product)',
            askSellerPrice: '✍️ *Seller:* What is the agreed price in USD? (numbers only)',
            askBuyerPrice: '✍️ *Buyer:* What price did you agree to pay in USD? (numbers only)',
            priceMismatch: '❌ *Prices don\'t match.*\nSeller declared: *$SELLER*\nBuyer declared: *$BUYER*\n\nOne of you must correct their amount.',
            priceMatch: '✅ *Prices match at $AMOUNT*\n\n📦 Deal: $AMOUNT\n🛡️ Vandox fee: $FEE\n💳 *Total to deposit: $TOTAL*\n\n🔑 Verification code: *CODE*\n\nBoth parties must see the same code.',
            whoPaysFee: 'Who pays the Vandox fee?',
            buyerPays: '💳 Buyer pays',
            sellerPays: '💳 Seller pays',
            splitPays: '50/50 split',
            payNow: '✅ Proceed to payment',
            payInstructions: '🏦 *Secure Vault — Vandox Safe*\n\n💳 Send exactly *$TOTAL USDT* to:\n\n`WALLET`\n\n📡 Network: *TON only*\n⚠️ Wrong network = lost funds\n\n🔑 Your deal code: *CODE*',
            paidBtn: '✅ I have sent the payment',
            paidNotif: '📨 Payment reported. Verifying on blockchain...',
            adminNotif: '🔔 *New payment reported*\n\nTX: *TXID*\nAmount: *$TOTAL*\nCode: *CODE*\nGroup: CHATID',
            releaseBtn: '✅ Release funds to seller',
            disputeBtn: '⚠️ Open dispute',
            released: '🎉 *Deal complete!*\nFunds released to seller.\nTX: *TXID*',
            disputed: '⚠️ *Dispute opened.*\nVandox will review the evidence. Both parties will be contacted.',
            tarifas: '📊 *Vandox Pricing:*\n\n• Sales under $50: *$1.00 flat*\n• Sales $50+: *1.5%*\n• Swaps: *$1.00 flat*\n\n_Cheapest escrow service available._',
            invalidAmount: '❌ Please enter a valid number (e.g. 150)',
            cancelled: '❌ Deal cancelled.',
            swapInstructions: '🔄 *Swap — Vandox Safe*\n\nBoth parties upload their digital products. Exchange happens simultaneously.\n\nFlat fee: *$1.00*\n🔑 Code: *CODE*',
            sellerUpload: '📤 *Seller:* Upload your digital product here (file, link, or credentials).',
            buyerConfirm: '📥 *Buyer:* Product received from seller. Confirm to complete the deal.',
            confirmBtn: '✅ Confirm receipt',
        },
        es: {
            detected: '🛡️ *Vandox Safe* — Detecto un trato en curso.\n¿Quieres que lo custodie para que ambas partes estén protegidas?',
            startBtn: '🔒 Custodiar este trato',
            tarifasBtn: '📊 Ver tarifas',
            welcome: '🛡️ *Vandox Safe*\n\n¿Qué tipo de trato?',
            saleBtn: '💵 Venta (dinero por producto)',
            swapBtn: '🔄 Trueque (producto por producto)',
            askSellerPrice: '✍️ *Vendedor:* ¿Cuál es el precio acordado en USD? (solo números)',
            askBuyerPrice: '✍️ *Comprador:* ¿Cuánto acordaste pagar en USD? (solo números)',
            priceMismatch: '❌ *Los precios no coinciden.*\nVendedor declaró: *$SELLER*\nComprador declaró: *$BUYER*\n\nUno de los dos debe corregir su importe.',
            priceMatch: '✅ *Precios coinciden: $AMOUNT*\n\n📦 Trato: $AMOUNT\n🛡️ Tarifa Vandox: $FEE\n💳 *Total a depositar: $TOTAL*\n\n🔑 Código de verificación: *CODE*\n\nAmbas partes deben ver el mismo código.',
            whoPaysFee: '¿Quién paga la tarifa Vandox?',
            buyerPays: '💳 El comprador paga',
            sellerPays: '💳 El vendedor paga',
            splitPays: '50/50 entre ambos',
            payNow: '✅ Proceder al pago',
            payInstructions: '🏦 *Bóveda Segura — Vandox Safe*\n\n💳 Envía exactamente *$TOTAL USDT* a:\n\n`WALLET`\n\n📡 Red: *TON únicamente*\n⚠️ Red incorrecta = fondos perdidos\n\n🔑 Código de tu trato: *CODE*',
            paidBtn: '✅ Ya he enviado el pago',
            paidNotif: '📨 Pago reportado. Verificando en blockchain...',
            adminNotif: '🔔 *Nuevo pago reportado*\n\nTX: *TXID*\nImporte: *$TOTAL*\nCódigo: *CODE*\nGrupo: CHATID',
            releaseBtn: '✅ Liberar fondos al vendedor',
            disputeBtn: '⚠️ Abrir disputa',
            released: '🎉 *¡Trato completado!*\nFondos liberados al vendedor.\nTX: *TXID*',
            disputed: '⚠️ *Disputa abierta.*\nVandox revisará la evidencia y contactará a ambas partes.',
            tarifas: '📊 *Tarifas Vandox:*\n\n• Ventas menores de $50: *$1.00 fijo*\n• Ventas de $50+: *1.5%*\n• Trueques: *$1.00 fijo*\n\n_El servicio de custodia más barato del mercado._',
            invalidAmount: '❌ Por favor escribe un número válido (ej: 150)',
            cancelled: '❌ Trato cancelado.',
            swapInstructions: '🔄 *Trueque — Vandox Safe*\n\nAmbas partes suben sus productos digitales. El intercambio ocurre simultáneamente.\n\nTarifa fija: *$1.00*\n🔑 Código: *CODE*',
            sellerUpload: '📤 *Vendedor:* Sube tu producto digital aquí (archivo, enlace o credenciales).',
            buyerConfirm: '📥 *Comprador:* Producto recibido del vendedor. Confirma para completar el trato.',
            confirmBtn: '✅ Confirmar recepción',
        }
    };
    return texts[lang][key] || texts['en'][key] || key;
}

// --- GUARDAR Y LEER TRANSACCIONES ---
async function saveTx(tx) {
    await supabase.from('transacciones').upsert(tx);
}

async function getTx(id) {
    const { data } = await supabase.from('transacciones').select('*').eq('id', id).single();
    return data;
}

// --- NOTIFICAR AL ADMIN ---
async function notifyAdmin(bot, msg) {
    try {
        await bot.telegram.sendMessage(ADMIN_ID, msg, { parse_mode: 'Markdown' });
    } catch (e) {
        console.log('Admin notify error:', e.message);
    }
}

// --- PALABRAS CLAVE ---
const triggers = [
    'vendo', 'vender', 'venta', 'compro', 'comprar', 'precio', 'pago', 'pagar',
    'deal', 'sell', 'buy', 'price', 'payment', 'swap', 'trueque', 'intercambio',
    'cuanto', 'cuánto', 'ofrezco', 'busco', 'interesado', 'acuerdo', 'trato'
];

// --- COMANDO START EN PRIVADO ---
bot.command('start', (ctx) => {
    if (ctx.chat.type !== 'private') return;
    const lang = getLang(ctx);
    ctx.replyWithMarkdown(
        t(lang, 'welcome'),
        Markup.inlineKeyboard([
            [Markup.button.callback(t(lang, 'saleBtn'), 'private_sale')],
            [Markup.button.callback(t(lang, 'swapBtn'), 'private_swap')],
            [Markup.button.callback(t(lang, 'tarifasBtn'), 'ver_tarifas')]
        ])
    );
});

// --- COMANDO ADMIN: LIBERAR FONDOS ---
bot.command('liberar', async (ctx) => {
    if (String(ctx.from.id) !== String(ADMIN_ID)) return;
    const parts = ctx.message.text.split(' ');
    const txId = parts[1];
    if (!txId) return ctx.reply('Uso: /liberar VDX-2026-XXXX');

    const tx = await getTx(txId);
    if (!tx) return ctx.reply('Transacción no encontrada: ' + txId);

    await saveTx({ ...tx, estado: 'liberado' });

    const lang = tx.lang || 'en';
    const msg = t(lang, 'released').replace('TXID', txId);

    if (tx.comprador_id) await bot.telegram.sendMessage(tx.comprador_id, msg, { parse_mode: 'Markdown' });
    if (tx.vendedor_id) await bot.telegram.sendMessage(tx.vendedor_id, msg, { parse_mode: 'Markdown' });
    if (tx.grupo_id) await bot.telegram.sendMessage(tx.grupo_id, msg, { parse_mode: 'Markdown' });

    ctx.reply('✅ Fondos liberados para TX: ' + txId);
});

// --- COMANDO ADMIN: DISPUTAR ---
bot.command('disputar', async (ctx) => {
    if (String(ctx.from.id) !== String(ADMIN_ID)) return;
    const parts = ctx.message.text.split(' ');
    const txId = parts[1];
    if (!txId) return ctx.reply('Uso: /disputar VDX-2026-XXXX');

    const tx = await getTx(txId);
    if (!tx) return ctx.reply('Transacción no encontrada: ' + txId);

    await saveTx({ ...tx, estado: 'disputa' });

    const lang = tx.lang || 'en';
    const msg = t(lang, 'disputed');

    if (tx.comprador_id) await bot.telegram.sendMessage(tx.comprador_id, msg, { parse_mode: 'Markdown' });
    if (tx.vendedor_id) await bot.telegram.sendMessage(tx.vendedor_id, msg, { parse_mode: 'Markdown' });

    ctx.reply('⚠️ Disputa activada para TX: ' + txId);
});

bot.on('message', async (ctx, next) => {
    const text = ctx.message?.text;
    const chatId = String(ctx.chat.id);
    const lang = getLang(ctx);

    if (ctx.chat.type !== 'group' && ctx.chat.type !== 'supergroup') return next();
    if (!text) return next();

    const lower = text.toLowerCase();
    const isTrigger = triggers.some(t => lower.includes(t));

    if (isTrigger) {
        return ctx.replyWithMarkdown(
            t(lang, 'detected'),
            Markup.inlineKeyboard([
                [Markup.button.callback(t(lang, 'startBtn'), 'iniciar_trato_' + lang)],
                [Markup.button.callback(t(lang, 'tarifasBtn'), 'ver_tarifas')]
            ])
        );
    }

    const amount = parseFloat(text.replace(',', '.'));
    if (isNaN(amount) || amount <= 0) return next();

    const { data: txs } = await supabase
        .from('transacciones')
        .select('*')
        .eq('grupo_id', chatId)
        .in('estado', ['esperando_vendedor_precio', 'esperando_comprador_precio'])
        .order('created_at', { ascending: false })
        .limit(1);

    if (!txs || txs.length === 0) return next();
    const tx = txs[0];
    const txLang = tx.lang || 'en';

    if (tx.estado === 'esperando_vendedor_precio') {
        await saveTx({ ...tx, vendedor_precio: amount, vendedor_id: String(ctx.from.id), estado: 'esperando_comprador_precio' });
        ctx.replyWithMarkdown(t(txLang, 'askBuyerPrice') + '\n\n_TX: ' + tx.id + '_');

    } else if (tx.estado === 'esperando_comprador_precio') {
        const sellerAmount = tx.vendedor_precio;
        if (amount !== sellerAmount) {
            const msg = t(txLang, 'priceMismatch')
                .replace('$SELLER', '$' + sellerAmount.toFixed(2))
                .replace('$BUYER', '$' + amount.toFixed(2));
            return ctx.replyWithMarkdown(msg);
        }

        const fee = calcFee(amount);
        const total = parseFloat((amount + fee).toFixed(2));
        await saveTx({ ...tx, comprador_precio: amount, comprador_id: String(ctx.from.id), fee, total, estado: 'esperando_quien_paga' });

        const matchMsg = t(txLang, 'priceMatch')
            .replace('$AMOUNT', '$' + amount.toFixed(2))
            .replace('$FEE', '$' + fee.toFixed(2))
            .replace('$TOTAL', '$' + total.toFixed(2))
            .replace('CODE', tx.code);

        ctx.replyWithMarkdown(matchMsg, Markup.inlineKeyboard([
            [Markup.button.callback(t(txLang, 'buyerPays'), 'fee_buyer_' + tx.id)],
            [Markup.button.callback(t(txLang, 'sellerPays'), 'fee_seller_' + tx.id)],
            [Markup.button.callback(t(txLang, 'splitPays'), 'fee_split_' + tx.id)]
        ]));
    }
});
// --- QUIÉN PAGA LA FEE ---
bot.action(/fee_(buyer|seller|split)_(.+)/, async (ctx) => {
    await ctx.answerCbQuery();
    const who = ctx.match[1];
    const txId = ctx.match[2];
    const tx = await getTx(txId);
    if (!tx) return;
    const lang = tx.lang || 'en';

    let total = tx.comprador_precio;
    if (who === 'buyer') total = parseFloat((tx.comprador_precio + tx.fee).toFixed(2));
    else if (who === 'split') total = parseFloat((tx.comprador_precio + tx.fee / 2).toFixed(2));

    await saveTx({ ...tx, quien_paga_fee: who, total_depositar: total, estado: 'esperando_pago' });

    const msg = t(lang, 'payInstructions')
        .replace('$TOTAL', '$' + total.toFixed(2))
        .replace('WALLET', WALLET_TON)
        .replace('CODE', tx.code);

    ctx.replyWithMarkdown(msg, Markup.inlineKeyboard([
        [Markup.button.callback(t(lang, 'paidBtn'), 'pago_enviado_' + txId)]
    ]));
});

// --- PAGO ENVIADO ---
bot.action(/pago_enviado_(.+)/, async (ctx) => {
    await ctx.answerCbQuery();
    const txId = ctx.match[1];
    const tx = await getTx(txId);
    if (!tx) return;
    const lang = tx.lang || 'en';

    await saveTx({ ...tx, estado: 'verificando_pago' });
    ctx.replyWithMarkdown(t(lang, 'paidNotif'));

    const adminMsg = t(lang, 'adminNotif')
        .replace('TXID', txId)
        .replace('$TOTAL', '$' + (tx.total_depositar || tx.total))
        .replace('CODE', tx.code)
        .replace('CHATID', tx.grupo_id);

    await notifyAdmin(bot, adminMsg + '\n\n✅ /liberar ' + txId + '\n⚠️ /disputar ' + txId);
});

// --- TARIFAS ---
bot.action('ver_tarifas', (ctx) => {
    ctx.answerCbQuery();
    const lang = getLang(ctx);
    ctx.replyWithMarkdown(t(lang, 'tarifas'));
});

// --- ACCIONES PRIVADAS ---
bot.action('private_sale', (ctx) => {
    ctx.answerCbQuery();
    const lang = getLang(ctx);
    ctx.replyWithMarkdown(t(lang, 'askSellerPrice'));
});

bot.action('private_swap', (ctx) => {
    ctx.answerCbQuery();
    const lang = getLang(ctx);
    ctx.replyWithMarkdown(t(lang, 'swapInstructions').replace('CODE', genCode()));
});

bot.launch();
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
