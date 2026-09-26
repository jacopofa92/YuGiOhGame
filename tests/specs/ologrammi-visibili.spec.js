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
            const ri = item ? item.getBoundingClientRect() : null;
            const rc = cartaEl ? cartaEl.getBoundingClientRect() : null;
            ok(item
                ? {
                    presente: true,
                    larghezza: ri.width,
                    carta: rc ? rc.width : 0,
                    schermo: window.innerWidth,
                    // Dove finisce la figura rispetto alla SUA carta: la
                    // base deve cadere dentro la carta, così la proiezione
                    // nasce da lì invece di galleggiarle sopra.
                    baseFigura: ri.bottom,
                    cartaSopra: rc ? rc.top : 0,
                    cartaSotto: rc ? rc.bottom : 0
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
                // La base della figura cade DENTRO la sua carta. Chiesto
                // esplicitamente dall'utente dopo averla vista su un 2K
                // ("troppo oltre la carta... più sopra alla propria carta"):
                // con le misure precedenti la figura dei propri mostri
                // finiva a metà strada verso la fila avversaria.
                // Su desktop anche più stretto: nella metà INFERIORE della
                // carta. "Dentro la carta" da solo non bastava a cogliere il
                // difetto — con le misure vecchie la base cadeva nel 15%
                // più alto della carta, quindi tecnicamente dentro, e la
                // figura svettava comunque di una carta e mezza. Il
                // telefono non è stato toccato e resta sul controllo largo.
                const sogliaBase = nome === 'desktop'
                    ? (o.cartaSopra + o.cartaSotto) / 2
                    : o.cartaSopra;
                assert(o.baseFigura > sogliaBase && o.baseFigura <= o.cartaSotto + 1,
                    `La proiezione deve nascere dalla sua carta (${nome}): base a ${Math.round(o.baseFigura)}, `
                    + `carta da ${Math.round(o.cartaSopra)} a ${Math.round(o.cartaSotto)}`);
            } finally { await ctx.close(); }
        }
        // Su desktop, rispetto alla carta, MAI più piccola che su telefono:
        // la carta lì è proporzionalmente più piccola, e con le stesse
        // frazioni la proiezione tornerebbe a non notarsi. Il margine un
        // tempo era +20%; è sceso quando l'utente ha chiesto ologrammi un
        // po' più piccoli su desktop, e il controllo è rimasto sulla
        // direzione, non su un numero da ritoccare ogni volta.
        assert(misure.desktop.sullaCarta >= misure.telefono.sullaCarta,
            'Su desktop la proiezione non deve essere più piccola, rispetto alla carta, che su telefono: '
            + `${misure.desktop.sullaCarta.toFixed(2)}x contro ${misure.telefono.sullaCarta.toFixed(2)}x`);
        // E comunque non deve tornare a essere un francobollo.
        assert(misure.desktop.sulloSchermo > 0.07,
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
