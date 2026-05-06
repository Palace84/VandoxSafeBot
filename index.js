const { Telegraf, Markup } = require('telegraf');
const fetch = require('node-fetch');
const { TonClient, WalletContractV4, internal, toNano, Address, beginCell } = require('@ton/ton');
const { mnemonicToPrivateKey } = require('@ton/crypto');
const { createClient } = require('@supabase/supabase-js');
const express = require('express');
const path = require('path');
const crypto = require('crypto');

const WALLET_MNEMONIC = process.env.WALLET_MNEMONIC;
const tonClient = new TonClient({
    endpoint: 'https://toncenter.com/api/v2/jsonRPC',
    apiKey: process.env.TONCENTER_KEY || ''
});

const app = express();
const PORT = process.env.PORT || 3000;
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Headers', '*');
    next();
});
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const bot = new Telegraf(process.env.BOT_TOKEN);
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);
const ADMIN_ID = process.env.ADMIN_ID;
const WALLET_TON = 'UQDuAM7-g7P-GGGPXX21WZzG-0yJX79eLzP96qsaJp_6MLac';

// ── HELPERS ──────────────────────────────────────────────────────────────────

function calcFee(amount) {
    return amount <= 50 ? 1.00 : parseFloat((amount * 0.015).toFixed(2));
}
function genCode() { return String(Math.floor(1000 + Math.random() * 9000)); }
function genTxId() { return 'VDX-' + Math.floor(1000 + Math.random() * 9000); }
function getLang(ctx) {
    const l = ctx.from?.language_code;
    return l && l.startsWith('es') ? 'es' : 'en';
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
    catch (e) { console.log('Admin notify error:', e.message); }
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

// Valida initData de Telegram — devuelve user o null
function validarInitData(initData) {
    try {
        const params = new URLSearchParams(initData);
        const hash = params.get('hash');
        params.delete('hash');
        const dataCheckString = Array.from(params.entries())
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([k, v]) => k + '=' + v)
            .join('\n');
        const secretKey = crypto.createHmac('sha256', 'WebAppData').update(process.env.BOT_TOKEN).digest();
        const calculatedHash = crypto.createHmac('sha256', secretKey).update(dataCheckString).digest('hex');
        if (calculatedHash !== hash) return null;
        return JSON.parse(params.get('user') || '{}');
    } catch(e) { return null; }
}

// ── TEXTOS ───────────────────────────────────────────────────────────────────

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

// ── TON / USDT ────────────────────────────────────────────────────────────────

async function enviarUSDT(destinatario, cantidad) {
    try {
        const key = await mnemonicToPrivateKey(WALLET_MNEMONIC.split(' '));
        const wallet = WalletContractV4.create({ publicKey: key.publicKey, workchain: 0 });
        const opened = tonClient.open(wallet);
        const seqno = await opened.getSeqno();

        const USDT_MASTER = 'EQCxE6mUtQJKFnGfaROTKOt1lZbDiiX1kCixRv7Nw2Id_sDs';
        const jettonResp = await fetch(
            'https://tonapi.io/v2/accounts/' + WALLET_TON + '/jettons/' + USDT_MASTER,
            { headers: { 'Accept': 'application/json' } }
        );
        const jettonData = await jettonResp.json();
        const jettonWallet = jettonData.wallet_address?.address;
        if (!jettonWallet) throw new Error('No se encontró jetton wallet del bot');

        const body = beginCell()
            .storeUint(0xf8a7ea5, 32)
            .storeUint(0, 64)
            .storeCoins(BigInt(Math.round(cantidad * 1e6)))
            .storeAddress(Address.parse(destinatario))
            .storeAddress(Address.parse(WALLET_TON))
            .storeBit(false)
            .storeCoins(toNano('0.01'))
            .storeBit(false)
            .endCell();

        await opened.sendTransfer({
            secretKey: key.secretKey,
            seqno,
            messages: [internal({
                to: Address.parseRaw(jettonWallet),
                value: toNano('0.05'),
                body: body
            })]
        });
        console.log('enviarUSDT OK:', cantidad, '->', destinatario);
        return true;
    } catch(e) {
        console.log('Error enviarUSDT:', e.message);
        return false;
    }
}

// ── DISTRIBUIR FONDOS — Lee datos frescos de Supabase para tener vendedor_wallet actualizado
async function distribuirFondos(tx) {
    try {
        const txFresca = await getTx(tx.id);
        const monto = parseFloat(txFresca.comprador_precio || 0);
        const fee = parseFloat(txFresca.fee || 0);
        const OWNER = process.env.OWNER_WALLET;

        if (!txFresca.vendedor_wallet) {
            console.log('Sin wallet de vendedor para TX:', txFresca.id);
            return false;
        }

        console.log('Distribuyendo TX:', txFresca.id, '| vendedor:', monto, '| fee:', fee);
        const ok1 = await enviarUSDT(txFresca.vendedor_wallet, monto);
        await new Promise(r => setTimeout(r, 15000));
        const ok2 = await enviarUSDT(OWNER, fee);
        console.log('Distribucion completada. Vendedor:', ok1, '| Fee:', ok2);
        return ok1 && ok2;
    } catch(e) {
        console.log('Error distribuirFondos:', e.message);
        return false;
    }
}

async function verificarPagoUSDT(tx) {
    try {
        const totalEsperado = parseFloat(tx.total_depositar || tx.total || 0);
        if (!totalEsperado) return false;

        const USDT_MASTER = 'EQCxE6mUtQJKFnGfaROTKOt1lZbDiiX1kCixRv7Nw2Id_sDs';
        const url = 'https://tonapi.io/v2/accounts/' + WALLET_TON + '/jettons/' + USDT_MASTER + '/history?limit=20';
        const response = await fetch(url, { headers: { 'Accept': 'application/json' } });
        if (!response.ok) return false;
        const data = await response.json();
        if (!data.events) return false;

        const ahora = Math.floor(Date.now() / 1000);
        for (const event of data.events) {
            if ((ahora - event.timestamp) > 7200) continue;
            for (const action of event.actions) {
                if (action.type !== 'JettonTransfer') continue;
                const amount = parseFloat(action.JettonTransfer?.amount || '0') / 1e6;
                const comment = action.JettonTransfer?.comment || '';
                if (Math.abs(amount - totalEsperado) < 0.1 || comment.includes(tx.code)) {
                    return true;
                }
            }
        }
        return false;
    } catch(e) {
        console.log('Error verificacion:', e.message);
        return false;
    }
}

// ── LIBERAR AUTOMATICO — MUTEX ATOMICO ───────────────────────────────────────

async function liberarAutomatico(tx) {
    const { data: locked, error: lockError } = await supabase
        .from('transacciones')
        .update({ estado: 'liberando' })
        .eq('id', tx.id)
        .not('estado', 'in', '("liberando","liberado")')
        .select()
        .single();

    if (lockError || !locked) {
        console.log('TX ya siendo liberada o liberada, saltando:', tx.id);
        return;
    }

    console.log('Lock adquirido para TX:', tx.id, '— distribuyendo fondos...');

    // Marcar liberado ANTES de distribuir — igual que v2.1
    await saveTx({ ...locked, estado: 'liberado', verificado_chain: true });

    const ok = await distribuirFondos(locked);

    const lang = locked.lang || 'en';
    const msg = txt(lang, 'released', { txid: locked.id });
    if (locked.comprador_id) await bot.telegram.sendMessage(locked.comprador_id, msg, { parse_mode: 'Markdown' }).catch(() => {});
    if (locked.vendedor_id) await bot.telegram.sendMessage(locked.vendedor_id, msg, { parse_mode: 'Markdown' }).catch(() => {});
    if (locked.grupo_id) await bot.telegram.sendMessage(locked.grupo_id, '🔗 ' + msg, { parse_mode: 'Markdown' }).catch(() => {});
    await notifyAdmin('✅ Liberado\nTX: ' + locked.id + '\nDistribuido: ' + (ok ? 'SÍ' : 'ERROR'));
}

async function iniciarVerificacionActiva(txId) {
    let intentos = 0;
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
        if (intentos >= 24) {
            clearInterval(intervalRapido);
            let intentosSlow = 0;
            const intervalLento = setInterval(async () => {
                intentosSlow++;
                const txActual2 = await getTx(txId);
                if (!txActual2 || txActual2.estado !== 'verificando_pago') { clearInterval(intervalLento); return; }
                const pagado2 = await verificarPagoUSDT(txActual2);
                if (pagado2) { clearInterval(intervalLento); await liberarAutomatico(txActual2); return; }
                if (intentosSlow >= 48) {
                    clearInterval(intervalLento);
                    await notifyAdmin('⚠️ Pago no detectado 2h\nTX: ' + txId);
                }
            }, 120000);
        }
    }, 30000);
}

// ── ENDPOINTS EXPRESS ─────────────────────────────────────────────────────────

app.post('/liberar', async (req, res) => {
    try {
        const { txId } = req.body;
        if (!txId) return res.json({ ok: false });
        const tx = await getTx(txId);
        if (!tx) return res.json({ ok: false });
        if (!tx.pago_confirmado || !tx.archivo_subido) return res.json({ ok: false, motivo: 'faltan slots' });
       if (tx.estado === 'liberado') return res.json({ ok: true, motivo: 'ya liberado' });
if (tx.estado === 'liberando') {
    await supabase.from('transacciones').update({ estado: 'liberado', verificado_chain: true, liberado_at: new Date().toISOString() }).eq('id', tx.id);
    return res.json({ ok: true, motivo: 'liberando completado' });
}
await liberarAutomatico(tx);
        res.json({ ok: true });
    } catch(e) {
        console.log('Error /liberar:', e.message);
        res.json({ ok: false, error: e.message });
    }
});

app.post('/ton-webhook', async (req, res) => {
    res.sendStatus(200);
    console.log('TON WEBHOOK RECIBIDO:', JSON.stringify(req.body));
    try {
        const event = req.body;
        if (!event || !event.actions) return;
        for (const action of event.actions) {
            if (action.type !== 'JettonTransfer') continue;
            const transfer = action.JettonTransfer;
            if (!transfer) continue;
            const amount = parseFloat(transfer.amount || '0') / 1e6;
            const comment = transfer.comment || '';
            if (transfer.recipient?.address !== WALLET_TON) continue;
            const { data: tratos } = await supabase
                .from('transacciones')
                .select('*')
                .eq('estado', 'verificando_pago');
            if (!tratos) continue;
            for (const tx of tratos) {
                const totalEsperado = parseFloat(tx.total_depositar || tx.total || 0);
                if (Math.abs(amount - totalEsperado) < 0.1 || comment.includes(tx.code)) {
                    await liberarAutomatico(tx);
                    break;
                }
            }
        }
    } catch(e) {
        console.log('Webhook error:', e.message);
    }
});

app.get('/user', (req, res) => {
    const initData = req.query.initData;
    if (!initData) return res.json({ user: null });
    const user = validarInitData(initData);
    res.json({ user });
});

app.get('/descargar/:txId', async (req, res) => {
    try {
        const { txId } = req.params;
        const initData = req.query.initData;
        if (!initData) return res.status(401).json({ error: 'No autorizado' });
        const user = validarInitData(initData);
        if (!user || !user.id) return res.status(401).json({ error: 'initData inválido' });
        const userId = String(user.id);
        const tx = await getTx(txId);
        if (!tx) return res.status(404).json({ error: 'Trato no encontrado' });
        if (userId !== String(tx.comprador_id)) return res.status(403).json({ error: 'Solo el comprador puede descargar' });
        if (!tx.pago_confirmado) return res.status(403).json({ error: 'Pago no confirmado' });
        if (!tx.archivo_path) return res.status(404).json({ error: 'No hay archivo en esta transacción' });
        const { data, error } = await supabase.storage.from('Productos').createSignedUrl(tx.archivo_path, 60);
        if (error) return res.status(500).json({ error: 'Error generando enlace de descarga' });
        res.json({ url: data.signedUrl, nombre: tx.archivo_nombre });
    } catch(e) {
        console.log('Error /descargar:', e.message);
        res.status(500).json({ error: e.message });
    }
});

// Permite al vendedor editar el precio mientras el comprador no haya aceptado
app.post('/precio', async (req, res) => {
    try {
        const { txId, precio, initData } = req.body;
        if (!initData) return res.status(401).json({ error: 'No autorizado' });
        const user = validarInitData(initData);
        if (!user || !user.id) return res.status(401).json({ error: 'initData inválido' });
        const userId = String(user.id);
        const tx = await getTx(txId);
        if (!tx) return res.status(404).json({ error: 'Trato no encontrado' });
        if (userId !== String(tx.vendedor_telegram_id) && userId !== String(tx.vendedor_id)) {
            return res.status(403).json({ error: 'Solo el vendedor puede editar el precio' });
        }
        const estadosEditables = ['nuevo', 'configurando', 'esperando_comprador_precio', 'esperando_pago'];
        if (!estadosEditables.includes(tx.estado)) {
            return res.status(403).json({ error: 'El precio ya no se puede editar' });
        }
        const amount = parseFloat(precio);
        if (isNaN(amount) || amount <= 0) return res.status(400).json({ error: 'Precio inválido' });
        const fee = calcFee(amount);
        const total = parseFloat((amount + fee).toFixed(2));
        await saveTx({ ...tx, vendedor_precio: amount, fee, total_depositar: total, comprador_precio: null, estado: 'esperando_comprador_precio' });
        res.json({ ok: true, fee, total });
    } catch(e) {
        console.log('Error /precio:', e.message);
        res.status(500).json({ error: e.message });
    }
});

app.post('/webhook', (req, res) => {
    bot.handleUpdate(req.body, res);
});

app.listen(PORT, () => {
    console.log('Mini App server running on port ' + PORT);
});

// ── BOT COMMANDS ──────────────────────────────────────────────────────────────

bot.command('start', (ctx) => {
    if (ctx.chat.type !== 'private') return;
    const lang = getLang(ctx);
    ctx.replyWithMarkdown(txt(lang, 'welcome'), Markup.inlineKeyboard([
        [Markup.button.callback(txt(lang, 'saleBtn'), 'sale_private')],
        [Markup.button.callback(txt(lang, 'swapBtn'), 'swap_private')],
        [Markup.button.callback(txt(lang, 'tarifasBtn'), 'tarifas')]
    ]));
});

bot.command('liberar', async (ctx) => {
    if (String(ctx.from.id) !== String(ADMIN_ID)) return;
    const txId = ctx.message.text.split(' ')[1];
    if (!txId) return ctx.reply('Uso: /liberar VDX-XXXX');
    const tx = await getTx(txId);
    if (!tx) return ctx.reply('TX no encontrada: ' + txId);
    await liberarAutomatico(tx);
    ctx.reply('✅ Liberado: ' + txId);
});

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

// ── MENSAJES EN GRUPOS ────────────────────────────────────────────────────────

const triggers = [
    'vendo','vender','venta','compro','comprar','precio','pago','pagar',
    'deal','sell','buy','price','payment','swap','trueque','intercambio',
    'cuanto','cuánto','ofrezco','busco','interesado','acuerdo','trato'
];

bot.on('message', async (ctx) => {
    if (ctx.chat.type !== 'group' && ctx.chat.type !== 'supergroup') return;
    const text = ctx.message?.text;
    if (!text) return;

    const chatId = String(ctx.chat.id);
    const userId = String(ctx.from.id);
    const lang = getLang(ctx);

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
                if (userId === tx.vendedor_id) return ctx.replyWithMarkdown('❌ El vendedor no puede actuar como comprador en el mismo trato.');
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

    const lower = text.toLowerCase();
    const isTrigger = triggers.some(t => lower.includes(t));
    if (isTrigger) {
        const txId = genTxId();
        const code = genCode();
        await saveTx({
            id: txId,
            grupo_id: String(ctx.chat.id),
            vendedor_telegram_id: userId,
            vendedor_nombre: ctx.from.first_name || ctx.from.username || 'Vendedor',
            estado: 'nuevo',
            lang,
            code,
            tipo: 'pendiente'
        });
        const miniAppUrl = 'https://t.me/VandoxSafeBot/app?startapp=' + txId;
        return ctx.reply('🛡️ Vandox Safe — ' + (lang === 'es' ? 'Trato detectado' : 'Deal detected'), {
            reply_markup: {
                inline_keyboard: [[{ text: '🔒 ' + (lang === 'es' ? 'Custodiar este trato' : 'Secure this deal'), url: miniAppUrl }]]
            }
        });
    }
});

// ── BOT ACTIONS ───────────────────────────────────────────────────────────────

bot.action('start_deal', async (ctx) => {
    await ctx.answerCbQuery();
    const lang = getLang(ctx);
    ctx.replyWithMarkdown(txt(lang, 'welcome'), Markup.inlineKeyboard([
        [Markup.button.callback(txt(lang, 'saleBtn'), 'start_sale')],
        [Markup.button.callback(txt(lang, 'swapBtn'), 'start_swap')],
        [Markup.button.callback(txt(lang, 'tarifasBtn'), 'tarifas')]
    ]));
});

bot.action('start_sale', async (ctx) => {
    await ctx.answerCbQuery();
    const lang = getLang(ctx);
    const txId = genTxId();
    const code = genCode();
    await saveTx({ id: txId, grupo_id: String(ctx.chat.id), estado: 'esperando_vendedor_precio', lang, code, tipo: 'venta' });
    const miniAppUrl = 'https://t.me/VandoxSafeBot/app?startapp=' + txId;
    ctx.replyWithMarkdown(
        txt(lang, 'askSellerPrice') + '\n\n_TX: ' + txId + '_',
        Markup.inlineKeyboard([[{ text: '🛡️ Open Vandox Safe', web_app: { url: miniAppUrl } }]])
    );
});

bot.action('start_swap', async (ctx) => {
    await ctx.answerCbQuery();
    const lang = getLang(ctx);
    const txId = genTxId();
    const code = genCode();
    await saveTx({ id: txId, grupo_id: String(ctx.chat.id), estado: 'swap_iniciado', lang, code, tipo: 'swap', fee: 1.00 });
    ctx.replyWithMarkdown(txt(lang, 'swapReady', { code, txid: txId }));
    await notifyAdmin('🔄 Nuevo swap\nTX: ' + txId + '\nGrupo: ' + ctx.chat.id);
});

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

bot.action(/^paid_(.+)$/, async (ctx) => {
    await ctx.answerCbQuery();
    const txId = ctx.match[1];
    const tx = await getTx(txId);
    if (!tx) return;
    const lang = tx.lang || 'en';
    await saveTx({ ...tx, estado: 'verificando_pago' });
    iniciarVerificacionActiva(txId);
    ctx.replyWithMarkdown(txt(lang, 'paidNotif'));
    try {
        await bot.telegram.sendMessage(ADMIN_ID, txt(lang, 'adminNotif', {
            txid: txId,
            total: String(tx.total_depositar || tx.total || '?'),
            code: tx.code,
            group: tx.grupo_id
        }), {
            parse_mode: 'Markdown',
            reply_markup: {
                inline_keyboard: [[
                    { text: '✅ Liberar fondos', callback_data: 'admin_liberar_' + txId },
                    { text: '⚠️ Disputar', callback_data: 'admin_disputar_' + txId }
                ]]
            }
        });
    } catch(e) { console.log('Admin error:', e.message); }
});

bot.action(/^admin_liberar_(.+)$/, async (ctx) => {
    await ctx.answerCbQuery();
    if (String(ctx.from.id) !== String(ADMIN_ID)) return;
    const txId = ctx.match[1];
    const tx = await getTx(txId);
    if (!tx) return;
    await liberarAutomatico(tx);
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

bot.action(/^cancel_(.+)$/, async (ctx) => {
    await ctx.answerCbQuery();
    const txId = ctx.match[1];
    const tx = await getTx(txId);
    if (!tx) return;
    await saveTx({ ...tx, estado: 'cancelado' });
    ctx.replyWithMarkdown(txt(tx.lang || 'en', 'cancelled'));
});

bot.action('tarifas', (ctx) => {
    ctx.answerCbQuery();
    ctx.replyWithMarkdown(txt(getLang(ctx), 'tarifas'));
});

bot.action('sale_private', (ctx) => {
    ctx.answerCbQuery();
    ctx.replyWithMarkdown(txt(getLang(ctx), 'askSellerPrice'));
});

bot.action('swap_private', (ctx) => {
    ctx.answerCbQuery();
    const lang = getLang(ctx);
    ctx.replyWithMarkdown(txt(lang, 'swapReady', { code: genCode(), txid: genTxId() }));
});

// ── WEBHOOK TONAPI ────────────────────────────────────────────────────────────

async function registrarWebhookTonAPI() {
    try {
        const res1 = await fetch('https://rt.tonapi.io/webhooks', {
            method: 'POST',
            headers: { 'Authorization': 'Bearer ' + process.env.TONAPI_KEY, 'Content-Type': 'application/json' },
            body: JSON.stringify({ endpoint: 'https://vandox-bot-production.up.railway.app/ton-webhook' })
        });
        const webhook = await res1.json();
        console.log('Webhook creado:', JSON.stringify(webhook));
        if (!webhook.webhook_id) return;
        const res2 = await fetch('https://rt.tonapi.io/webhooks/' + webhook.webhook_id + '/account-tx/subscribe', {
            method: 'POST',
            headers: { 'Authorization': 'Bearer ' + process.env.TONAPI_KEY, 'Content-Type': 'application/json' },
            body: JSON.stringify({ accounts: [{ account_id: '0:ee00cefe83b3fe18618f5d7db5599cc6fb4c895fbf5e2f33fdeaab1a269ffa30' }] })
        });
        if (res2.ok) console.log('Webhook suscrito correctamente a la hot wallet');
    } catch(e) {
        console.log('Error webhook:', e.message);
    }
}

setTimeout(() => { registrarWebhookTonAPI(); }, 5000);

// ── LAUNCH ────────────────────────────────────────────────────────────────────

bot.launch().then(() => {
    console.log('Bot Vandox iniciado con éxito');
}).catch((err) => {
    console.error('Error al lanzar el bot:', err);
});

process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
