// La proiezione sopra i mostri si vede anche su un monitor.
// =====================================================================
// L'effetto c'era già su desktop — nel codice non c'è mai stato alcun
// limite a mobile — ma le sue misure sono frazioni della CARTA, e su
// desktop la carta è proporzionalmente molto più piccola che su un
// telefono: lo stesso ologramma occupava l'8,5% della larghezza dello
// schermo contro il 17,5%. C'era e non si notava, ed è il motivo per cui
// sembrava spento di là.
//
// Si sorveglia la PROPRIETÀ, non i numeri: che su desktop la proiezione
// sia più grande RISPETTO ALLA CARTA di quanto lo sia su telefono, cioè
// che la compensazione esista. La parità fra i due rispetto allo SCHERMO
// non è raggiungibile e non va chiesta — su telefono il campo è più
// stretto, quindi qualunque cosa misurata sulla carta pesa di più.
//
// `standalone`: servono finestre di dimensioni diverse e la preferenza
// scritta PRIMA che la pagina giri, come per un giocatore che l'ha scelta
// in una sessione precedente.
const { openDuel, freezeNaturalGameLoop } = require('../helpers/harness');

/** Apre un duello con l'ologramma acceso o spento. */
async function duello(browser, viewport, acceso) {
    const ctx = await browser.newContext({ viewport: viewport });
    await ctx.addInitScript((on) => {
        try { localStorage.setItem('ygoHologram', on ? 'on' : 'off'); } catch (e) { /* la preferenza si perde, il duello no */ }
    }, acceso);
    const page = await ctx.newPage();
    await openDuel(page);
    await freezeNaturalGameLoop(page);
    await page.waitForTimeout(900);
    return { ctx, page };
}

/** Evoca davvero un mostro e torna la geometria del suo ologramma. */
async function ologrammaDopoEvocazione(page) {
    return page.evaluate(() => new Promise((ok) => {
        const carta = gameState.playerHand.find((c) => c.type === 'monster' && (c.level || 4) <= 4)
            || gameState.playerHand[0];
        const i = gameState.playerHand.indexOf(carta);
        if (typeof summonMonster === 'function') summonMonster(carta, 2, 'attack', i);
        setTimeout(() => {
            const item = document.querySelector('.mh-item');
            const slot = gameState.playerMonsterField[2];
            const cartaEl = slot && slot.card && typeof findFieldCardElementByUid === 'function'
                ? findFieldCardElementByUid(slot.card.uid) : null;
            ok(item
                ? {
                    presente: true,
                    larghezza: item.getBoundingClientRect().width,
                    carta: cartaEl ? cartaEl.getBoundingClientRect().width : 0,
                    schermo: window.innerWidth
                }
                : { presente: false, schermo: window.innerWidth });
        }, 2400);
    }));
}

module.exports = {
    name: 'Ologrammi: la proiezione si vede anche su desktop, e si spegne davvero',
    standalone: true,
    async run({ browser, assert }) {
        const misure = {};
        for (const [nome, vp] of [['desktop', { width: 1400, height: 900 }],
            ['telefono', { width: 393, height: 852 }]]) {
            const { ctx, page } = await duello(browser, vp, true);
            try {
                const o = await ologrammaDopoEvocazione(page);
                assert(o.presente, `Con l'impostazione accesa l'ologramma deve comparire (${nome})`);
                assert(o.carta > 0, `Carta non trovata sul Terreno (${nome})`);
                misure[nome] = { sullaCarta: o.larghezza / o.carta, sulloSchermo: o.larghezza / o.schermo };
            } finally { await ctx.close(); }
        }
        assert(misure.desktop.sullaCarta > misure.telefono.sullaCarta * 1.2,
            'Su desktop la proiezione deve essere più grande rispetto alla carta, per compensare una carta più '
            + `piccola rispetto allo schermo: ${misure.desktop.sullaCarta.toFixed(2)}x contro `
            + `${misure.telefono.sullaCarta.toFixed(2)}x`);
        // E comunque non deve tornare a essere un francobollo.
        assert(misure.desktop.sulloSchermo > 0.09,
            `Su desktop la proiezione resta troppo piccola per notarsi: ${(misure.desktop.sulloSchermo * 100).toFixed(1)}% dello schermo`);

        // Spenta, non ne deve restare nemmeno uno: un'impostazione che non
        // spegne non è un'impostazione.
        const { ctx, page } = await duello(browser, { width: 1400, height: 900 }, false);
        try {
            const o = await ologrammaDopoEvocazione(page);
            assert(!o.presente, 'Spenta l\'impostazione, di ologrammi non ne deve restare nemmeno uno');
        } finally { await ctx.close(); }
    }
};
