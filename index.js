const { Telegraf, Markup } = require('telegraf');
const fetch = require('node-fetch');
const { TonClient, WalletContractV4, internal, toNano, Address } = require('@ton/ton');
const { mnemonicToPrivateKey } = require('@ton/crypto');

const CONTRACT_ADDRESS = process.env.CONTRACT_ADDRESS;
const WALLET_MNEMONIC = process.env.WALLET_MNEMONIC;

const tonClient = new TonClient({
    endpoint: 'https://testnet.toncenter.com/api/v2/jsonRPC',
    apiKey: ''
});
const { createClient } = require('@supabase/supabase-js');

const bot = new Telegraf(process.env.BOT_TOKEN);
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);
const ADMIN_ID = process.env.ADMIN_ID;
const WALLET_TON = 'UQDcvUumghbxhW7IUIfnKvsVRZ2oQx-tDK6ne8aXO5JT0NXj';

function calcFee(amount) {
    return amount <= 50 ? 1.00 : parseFloat((amount * 0.015).toFixed(2));
}
function genCode() { return String(Math.floor(1000 + Math.random() * 9000)); }
function genTxId() { return 'VDX-' + Math.floor(1000 + Math.random() * 9000); }
function getLang(ctx) {
    const l = ctx.from?.language_code;
    return l && l.startsWith('es') ? 'es' : 'en';
}

function txt(lang, key, vars) {
    const T = {
        en: {
            detected: '🛡️ *Vandox Safe* — Deal detected.\nWant me to secure it so both sides are protected?',
            startBtn: '🔒 Secure this deal',
            tarifasBtn: '📊 View pricing',
            welcome: '🛡️ *Vandox Safe*\n\nWhat type of deal?',
            saleBtn: '💵 Sale (money for product)',
            swapBtn: '🔄 Swap (product for product)',
            askSellerPrice: '✍️ *Seller:* Write the agreed price in USD.\n_(numbers only, e.g. 150)_',
            askBuyerPrice: '✍️ *Buyer:* Write the price you agreed to pay in USD.\n_(numbers only, e.g. 150)_',
            priceMismatch: '❌ *Prices don\'t match.*\nSeller: *${{seller}}* — Buyer: *${{buyer}}*\n\nOne must correct their amount.',
            priceMatch: '✅ *Prices match — ${{amount}}*\n\n📦 Deal: ${{amount}}\n🛡️ Fee: ${{fee}}\n💳 *Total to deposit: ${{total}}*\n\n🔑 Verification code: *{{code}}*\n_Both parties must see the same code._',
            buyerPays: '💳 Buyer pays fee',
            sellerPays: '💳 Seller pays fee',
            splitPays: '50/50 split',
            payInstructions: '🏦 *Secure Vault — Vandox Safe*\n\n💳 Send exactly *${{total}} USDT* to:\n\n`{{wallet}}`\n\n📡 Network: *TON only*\n⚠️ Wrong network = lost funds\n\n🔑 Deal code: *{{code}}*\nTX: {{txid}}',
            paidBtn: '✅ I have sent the payment',
            cancelBtn: '❌ Cancel deal',
            paidNotif: '📨 Payment reported. Verifying on blockchain...\n\nVandox will notify both parties shortly.',
            adminNotif: '🔔 *New payment reported*\n\nTX: {{txid}}\nAmount: ${{total}}\nCode: {{code}}\nGroup: {{group}}',
            released: '🎉 *Deal complete!*\nFunds released to seller.\nTX: {{txid}}',
            disputed: '⚠️ *Dispute opened.*\nVandox will review and contact both parties.',
            tarifas: '📊 *Vandox Pricing:*\n\n• Sales under $50: *$1.00 flat*\n• Sales $50+: *1.5%*\n• Swaps: *$1.00 flat*\n\n_Cheapest escrow in the market._',
            cancelled: '❌ Deal cancelled.',
            swapReady: '🔄 *Swap initiated*\n\nBoth parties upload their digital products here.\nExchange happens simultaneously when both are ready.\n\nFlat fee: *$1.00*\n🔑 Code: *{{code}}*\nTX: {{txid}}',
        },
        es: {
            detected: '🛡️ *Vandox Safe* — Trato detectado.\n¿Quieres que lo custodie para proteger a ambas partes?',
            startBtn: '🔒 Custodiar este trato',
            tarifasBtn: '📊 Ver tarifas',
            welcome: '🛡️ *Vandox Safe*\n\n¿Qué tipo de trato?',
            saleBtn: '💵 Venta (dinero por producto)',
            swapBtn: '🔄 Trueque (producto por producto)',
            askSellerPrice: '✍️ *Vendedor:* Escribe el precio acordado en USD.\n_(solo números, ej: 150)_',
            askBuyerPrice: '✍️ *Comprador:* Escribe el precio que acordaste pagar en USD.\n_(solo números, ej: 150)_',
            priceMismatch: '❌ *Los precios no coinciden.*\nVendedor: *${{seller}}* — Comprador: *${{buyer}}*\n\nUno debe corregir su importe.',
            priceMatch: '✅ *Precios coinciden — ${{amount}}*\n\n📦 Trato: ${{amount}}\n🛡️ Tarifa: ${{fee}}\n💳 *Total a depositar: ${{total}}*\n\n🔑 Código de verificación: *{{code}}*\n_Ambas partes deben ver el mismo código._',
            buyerPays: '💳 El comprador paga',
            sellerPays: '💳 El vendedor paga',
            splitPays: '50/50 entre ambos',
            payInstructions: '🏦 *Bóveda Segura — Vandox Safe*\n\n💳 Envía exactamente *${{total}} USDT* a:\n\n`{{wallet}}`\n\n📡 Red: *TON únicamente*\n⚠️ Red incorrecta = fondos perdidos\n\n🔑 Código: *{{code}}*\nTX: {{txid}}',
            paidBtn: '✅ Ya he enviado el pago',
            cancelBtn: '❌ Cancelar trato',
            paidNotif: '📨 Pago reportado. Verificando en blockchain...\n\nVandox notificará a ambas partes en breve.',
            adminNotif: '🔔 *Nuevo pago reportado*\n\nTX: {{txid}}\nImporte: ${{total}}\nCódigo: {{code}}\nGrupo: {{group}}',
            released: '🎉 *¡Trato completado!*\nFondos liberados al vendedor.\nTX: {{txid}}',
            disputed: '⚠️ *Disputa abierta.*\nVandox revisará y contactará a ambas partes.',
            tarifas: '📊 *Tarifas Vandox:*\n\n• Ventas menores de $50: *$1.00 fijo*\n• Ventas de $50+: *1.5%*\n• Trueques: *$1.00 fijo*\n\n_El servicio de custodia más barato del mercado._',
            cancelled: '❌ Trato cancelado.',
            swapReady: '🔄 *Trueque iniciado*\n\nAmbas partes suben sus productos digitales aquí.\nEl intercambio ocurre simultáneamente.\n\nTarifa fija: *$1.00*\n🔑 Código: *{{code}}*\nTX: {{txid}}',
        }
    };
    let s = (T[lang]?.[key]) || (T.en[key]) || key;
    if (vars) Object.keys(vars).forEach(k => { s = s.replace(new RegExp('{{' + k + '}}', 'g'), vars[k]); });
    return s;
}

async function saveTx(tx) {
    const { error } = await supabase.from('transacciones').upsert(tx);
    if (error) console.log('Supabase error:', error.message);
}
async function getTx(id) {
    const { data } = await supabase.from('transacciones').select('*').eq('id', id).single();
    return data;
}
async function notifyAdmin(msg) {
    try { await bot.telegram.sendMessage(ADMIN_ID, msg, { parse_mode: 'Markdown' }); }
    catch (e) { console.log('Admin error:', e.message); }
}
async function getActiveTx(chatId) {
    const { data } = await supabase
        .from('transacciones')
        .select('*')
        .eq('grupo_id', chatId)
        .in('estado', ['esperando_vendedor_precio', 'esperando_comprador_precio'])
        .order('created_at', { ascending: false })
        .limit(1);
    return data?.[0] || null;
}

const triggers = [
    'vendo','vender','venta','compro','comprar','precio','pago','pagar',
    'deal','sell','buy','price','payment','swap','trueque','intercambio',
    'cuanto','cuánto','ofrezco','busco','interesado','acuerdo','trato'
];

// COMANDO START
bot.command('start', (ctx) => {
    if (ctx.chat.type !== 'private') return;
    const lang = getLang(ctx);
    ctx.replyWithMarkdown(txt(lang, 'welcome'), Markup.inlineKeyboard([
        [Markup.button.callback(txt(lang, 'saleBtn'), 'sale_private')],
        [Markup.button.callback(txt(lang, 'swapBtn'), 'swap_private')],
        [Markup.button.callback(txt(lang, 'tarifasBtn'), 'tarifas')]
    ]));
});

// ADMIN LIBERAR
bot.command('liberar', async (ctx) => {
    if (String(ctx.from.id) !== String(ADMIN_ID)) return;
    const txId = ctx.message.text.split(' ')[1];
    if (!txId) return ctx.reply('Uso: /liberar VDX-XXXX');
    const tx = await getTx(txId);
    if (!tx) return ctx.reply('TX no encontrada: ' + txId);
    await saveTx({ ...tx, estado: 'liberado' });
    const lang = tx.lang || 'en';
    const msg = txt(lang, 'released', { txid: txId });
    if (tx.comprador_id) await bot.telegram.sendMessage(tx.comprador_id, msg, { parse_mode: 'Markdown' });
    if (tx.vendedor_id) await bot.telegram.sendMessage(tx.vendedor_id, msg, { parse_mode: 'Markdown' });
    if (tx.grupo_id) await bot.telegram.sendMessage(tx.grupo_id, msg, { parse_mode: 'Markdown' });
    ctx.reply('✅ Liberado: ' + txId);
});

// ADMIN DISPUTAR
bot.command('disputar', async (ctx) => {
    if (String(ctx.from.id) !== String(ADMIN_ID)) return;
    const txId = ctx.message.text.split(' ')[1];
    if (!txId) return ctx.reply('Uso: /disputar VDX-XXXX');
    const tx = await getTx(txId);
    if (!tx) return ctx.reply('TX no encontrada: ' + txId);
    await saveTx({ ...tx, estado: 'disputa' });
    const lang = tx.lang || 'en';
    const msg = txt(lang, 'disputed');
    if (tx.comprador_id) await bot.telegram.sendMessage(tx.comprador_id, msg, { parse_mode: 'Markdown' });
    if (tx.vendedor_id) await bot.telegram.sendMessage(tx.vendedor_id, msg, { parse_mode: 'Markdown' });
    ctx.reply('⚠️ Disputa activada: ' + txId);
});

// MENSAJES EN GRUPOS — número primero, trigger después
bot.on('message', async (ctx) => {
    if (ctx.chat.type !== 'group' && ctx.chat.type !== 'supergroup') return;
    const text = ctx.message?.text;
    if (!text) return;

    const chatId = String(ctx.chat.id);
    const userId = String(ctx.from.id);
    const lang = getLang(ctx);

    // PRIORIDAD 1: ¿hay transacción activa esperando un número?
    const isNumber = /^\d+([.,]\d+)?$/.test(text.trim());
    if (isNumber) {
        const tx = await getActiveTx(chatId);
        if (tx) {
            const amount = parseFloat(text.replace(',', '.'));
            const txLang = tx.lang || 'en';

            if (tx.estado === 'esperando_vendedor_precio') {
                await saveTx({ ...tx, vendedor_precio: amount, vendedor_id: userId, estado: 'esperando_comprador_precio' });
                return ctx.replyWithMarkdown(txt(txLang, 'askBuyerPrice') + '\n\n_TX: ' + tx.id + '_');
            }

            if (tx.estado === 'esperando_comprador_precio') {
                if (amount !== tx.vendedor_precio) {
                    return ctx.replyWithMarkdown(txt(txLang, 'priceMismatch', {
                        seller: tx.vendedor_precio.toFixed(2),
                        buyer: amount.toFixed(2)
                    }));
                }
                const fee = calcFee(amount);
                const total = parseFloat((amount + fee).toFixed(2));
                await saveTx({ ...tx, comprador_precio: amount, comprador_id: userId, fee, total, estado: 'esperando_quien_paga' });
                return ctx.replyWithMarkdown(
                    txt(txLang, 'priceMatch', { amount: amount.toFixed(2), fee: fee.toFixed(2), total: total.toFixed(2), code: tx.code }),
                    Markup.inlineKeyboard([
                        [Markup.button.callback(txt(txLang, 'buyerPays'), 'fee_buyer_' + tx.id)],
                        [Markup.button.callback(txt(txLang, 'sellerPays'), 'fee_seller_' + tx.id)],
                        [Markup.button.callback(txt(txLang, 'splitPays'), 'fee_split_' + tx.id)]
                    ])
                );
            }
            return;
        }
    }

    // PRIORIDAD 2: detectar palabras clave de trato
    const lower = text.toLowerCase();
    const isTrigger = triggers.some(t => lower.includes(t));
    if (isTrigger) {
        return ctx.replyWithMarkdown(
            txt(lang, 'detected'),
            Markup.inlineKeyboard([
                [Markup.button.callback(txt(lang, 'startBtn'), 'start_deal')],
                [Markup.button.callback(txt(lang, 'tarifasBtn'), 'tarifas')]
            ])
        );
    }
});

// BOTON: INICIAR TRATO
bot.action('start_deal', async (ctx) => {
    await ctx.answerCbQuery();
    const lang = getLang(ctx);
    ctx.replyWithMarkdown(txt(lang, 'welcome'), Markup.inlineKeyboard([
        [Markup.button.callback(txt(lang, 'saleBtn'), 'start_sale')],
        [Markup.button.callback(txt(lang, 'swapBtn'), 'start_swap')],
        [Markup.button.callback(txt(lang, 'tarifasBtn'), 'tarifas')]
    ]));
});

// BOTON: INICIAR VENTA
bot.action('start_sale', async (ctx) => {
    await ctx.answerCbQuery();
    const lang = getLang(ctx);
    const txId = genTxId();
    const code = genCode();
    await saveTx({ id: txId, grupo_id: String(ctx.chat.id), estado: 'esperando_vendedor_precio', lang, code, tipo: 'venta' });
    ctx.replyWithMarkdown(txt(lang, 'askSellerPrice') + '\n\n_TX: ' + txId + '_');
});

// BOTON: INICIAR SWAP
bot.action('start_swap', async (ctx) => {
    await ctx.answerCbQuery();
    const lang = getLang(ctx);
    const txId = genTxId();
    const code = genCode();
    await saveTx({ id: txId, grupo_id: String(ctx.chat.id), estado: 'swap_iniciado', lang, code, tipo: 'swap', fee: 1.00 });
    ctx.replyWithMarkdown(txt(lang, 'swapReady', { code, txid: txId }));
    await notifyAdmin('🔄 Nuevo swap\nTX: ' + txId + '\nGrupo: ' + ctx.chat.id);
});

// BOTON: QUIEN PAGA FEE
bot.action(/^fee_(buyer|seller|split)_(.+)$/, async (ctx) => {
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
    ctx.replyWithMarkdown(
        txt(lang, 'payInstructions', { total: total.toFixed(2), wallet: WALLET_TON, code: tx.code, txid: txId }),
        Markup.inlineKeyboard([
            [Markup.button.callback(txt(lang, 'paidBtn'), 'paid_' + txId)],
            [Markup.button.callback(txt(lang, 'cancelBtn'), 'cancel_' + txId)]
        ])
    );
});

// BOTON: PAGO ENVIADO
bot.action(/^paid_(.+)$/, async (ctx) => {
    await ctx.answerCbQuery();
    const txId = ctx.match[1];
    const tx = await getTx(txId);
    if (!tx) return;
    const lang = tx.lang || 'en';
    await saveTx({ ...tx, estado: 'verificando_pago' });
    iniciarVerificacionActiva(txId);
    ctx.replyWithMarkdown(txt(lang, 'paidNotif'));
    const adminMsg = txt(lang, 'adminNotif', {
        txid: txId,
        total: String(tx.total_depositar || tx.total || '?'),
        code: tx.code,
        group: tx.grupo_id
    });
    try {
        await bot.telegram.sendMessage(ADMIN_ID, adminMsg, {
            parse_mode: 'Markdown',
            reply_markup: {
                inline_keyboard: [[
                    { text: '✅ Liberar fondos', callback_data: 'admin_liberar_' + txId },
                    { text: '⚠️ Disputar', callback_data: 'admin_disputar_' + txId }
                ]]
            }
        });
    } catch (e) { console.log('Admin error:', e.message); }
});

bot.action(/^admin_liberar_(.+)$/, async (ctx) => {
    await ctx.answerCbQuery();
    if (String(ctx.from.id) !== String(ADMIN_ID)) return;
    const txId = ctx.match[1];
    const tx = await getTx(txId);
    if (!tx) return;
    await saveTx({ ...tx, estado: 'liberado' });
    const lang = tx.lang || 'en';
    const msg = txt(lang, 'released', { txid: txId });
    if (tx.comprador_id) await bot.telegram.sendMessage(tx.comprador_id, msg, { parse_mode: 'Markdown' });
    if (tx.vendedor_id) await bot.telegram.sendMessage(tx.vendedor_id, msg, { parse_mode: 'Markdown' });
    if (tx.grupo_id) await bot.telegram.sendMessage(tx.grupo_id, msg, { parse_mode: 'Markdown' });
    ctx.editMessageText('✅ Fondos liberados: ' + txId);
});

bot.action(/^admin_disputar_(.+)$/, async (ctx) => {
    await ctx.answerCbQuery();
    if (String(ctx.from.id) !== String(ADMIN_ID)) return;
    const txId = ctx.match[1];
    const tx = await getTx(txId);
    if (!tx) return;
    await saveTx({ ...tx, estado: 'disputa' });
    const lang = tx.lang || 'en';
    const msg = txt(lang, 'disputed');
    if (tx.comprador_id) await bot.telegram.sendMessage(tx.comprador_id, msg, { parse_mode: 'Markdown' });
    if (tx.vendedor_id) await bot.telegram.sendMessage(tx.vendedor_id, msg, { parse_mode: 'Markdown' });
    ctx.editMessageText('⚠️ Disputa activada: ' + txId);
});
// BOTON: CANCELAR
bot.action(/^cancel_(.+)$/, async (ctx) => {
    await ctx.answerCbQuery();
    const txId = ctx.match[1];
    const tx = await getTx(txId);
    if (!tx) return;
    await saveTx({ ...tx, estado: 'cancelado' });
    ctx.replyWithMarkdown(txt(tx.lang || 'en', 'cancelled'));
});

// BOTON: TARIFAS
bot.action('tarifas', (ctx) => {
    ctx.answerCbQuery();
    ctx.replyWithMarkdown(txt(getLang(ctx), 'tarifas'));
});

// PRIVADO
bot.action('sale_private', (ctx) => {
    ctx.answerCbQuery();
    ctx.replyWithMarkdown(txt(getLang(ctx), 'askSellerPrice'));
});
bot.action('swap_private', (ctx) => {
    ctx.answerCbQuery();
    const lang = getLang(ctx);
    ctx.replyWithMarkdown(txt(lang, 'swapReady', { code: genCode(), txid: genTxId() }));
});
// VERIFICACION AUTOMATICA ON-CHAIN
// VERIFICACION AUTOMATICA USDT TON
async function verificarPagoUSDT(tx) {
    try {
        const totalEsperado = parseFloat(tx.total_depositar || tx.total || 0);
        if (!totalEsperado) return false;

        const url = 'https://toncenter.com/api/v2/getTransactions?address=' + WALLET_TON + '&limit=10';
        const response = await fetch(url);
        const data = await response.json();
        if (!data.ok || !data.result) return false;

        const ahora = Math.floor(Date.now() / 1000);
        const ventana = 7200;

        for (const t of data.result) {
            if ((ahora - t.utime) > ventana) continue;
            const msg = t.in_msg?.message || '';
            const valor = parseFloat(t.in_msg?.value || '0') / 1e9;
            if (msg.includes(tx.code) || Math.abs(valor - totalEsperado) < 0.05) {
                return true;
            }
        }

        // Buscar jettons USDT
        const jettonUrl = 'https://toncenter.com/api/v2/getTokenData?address=' + WALLET_TON;
        const jettonResp = await fetch(jettonUrl);
        const jettonData = await jettonResp.json();

        if (jettonData.ok) {
            const transfers = jettonData.result?.jetton_transfers || [];
            for (const transfer of transfers) {
                if ((ahora - transfer.utime) > ventana) continue;
                const amount = parseFloat(transfer.amount || '0') / 1e6;
                if (Math.abs(amount - totalEsperado) < 0.05) {
                    return true;
                }
            }
        }

        return false;
    } catch (e) {
        console.log('Error verificacion USDT:', e.message);
        return false;
    }
}

async function iniciarVerificacionActiva(txId) {
    let intentos = 0;
    const maxIntentos = 24; // 24 x 30seg = 12 minutos rapido
    const maxIntentosSlow = 48; // luego 48 x 2min = 96 minutos

    const tx = await getTx(txId);
    if (!tx) return;

    // Fase rapida: comprobar cada 30 segundos durante 12 minutos
    const intervalRapido = setInterval(async () => {
        intentos++;
        const txActual = await getTx(txId);
        if (!txActual || txActual.estado !== 'verificando_pago') {
            clearInterval(intervalRapido);
            return;
        }

        const pagado = await verificarPagoUSDT(txActual);
        if (pagado) {
            clearInterval(intervalRapido);
            await liberarAutomatico(txActual);
            return;
        }

        if (intentos >= maxIntentos) {
            clearInterval(intervalRapido);
            // Fase lenta: comprobar cada 2 minutos durante 2 horas
            let intentosSlow = 0;
            const intervalLento = setInterval(async () => {
                intentosSlow++;
                const txActual2 = await getTx(txId);
                if (!txActual2 || txActual2.estado !== 'verificando_pago') {
                    clearInterval(intervalLento);
                    return;
                }
                const pagado2 = await verificarPagoUSDT(txActual2);
                if (pagado2) {
                    clearInterval(intervalLento);
                    await liberarAutomatico(txActual2);
                    return;
                }
                if (intentosSlow >= maxIntentosSlow) {
                    clearInterval(intervalLento);
                    await notifyAdmin('⚠️ Pago no detectado después de 2 horas\nTX: ' + txId + '\nRevisa manualmente.\n\n✅ /liberar ' + txId);
                }
            }, 120000);
        }
    }, 30000);
}

async function liberarAutomatico(tx) {
    await saveTx({ ...tx, estado: 'liberado', verificado_chain: true });
    const lang = tx.lang || 'en';
    const msg = txt(lang, 'released', { txid: tx.id });
    if (tx.comprador_id) await bot.telegram.sendMessage(tx.comprador_id, msg, { parse_mode: 'Markdown' });
    if (tx.vendedor_id) await bot.telegram.sendMessage(tx.vendedor_id, msg, { parse_mode: 'Markdown' });
    if (tx.grupo_id) await bot.telegram.sendMessage(tx.grupo_id, '🔗 *Pago verificado en blockchain.*\n' + msg, { parse_mode: 'Markdown' });
    await notifyAdmin('✅ *Pago verificado y liberado automáticamente*\nTX: ' + tx.id + '\nImporte: $' + (tx.total_depositar || tx.total));
}
async function liberarConContrato(tx) {
    try {
        const key = await mnemonicToPrivateKey(WALLET_MNEMONIC.split(' '));
        const wallet = WalletContractV4.create({ publicKey: key.publicKey, workchain: 0 });
        const contract = tonClient.open(wallet);
        const seqno = await contract.getSeqno();
        
        await contract.sendTransfer({
            secretKey: key.secretKey,
            seqno,
            messages: [
                internal({
                    to: Address.parse(CONTRACT_ADDRESS),
                    value: toNano('0.05'),
                    body: JSON.stringify({ type: 'Release', txId: tx.id })
                })
            ]
        });
        return true;
    } catch(e) {
        console.log('Error contrato:', e.message);
        return false;
    }
}
bot.launch();
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
