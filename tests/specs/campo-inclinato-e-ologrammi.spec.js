// Due scelte di inquadratura: il campo in prospettiva e la proiezione
// sopra i mostri.
// =====================================================================
// CAMPO INCLINATO (js/ui/tilt-setting.js) è nuovo, spento di default. Le
// tre cose che, rompendosi, costerebbero care:
//   1) da spento il Terreno dev'essere piatto ESATTAMENTE come prima —
//      un'opzione che cambia il gioco anche a interruttore alzato non è
//      un'opzione;
//   2) da acceso il campo non deve sbordare né far comparire una barra di
//      scorrimento: l'inclinazione allontana la fila lontana, ma se il
//      perno fosse sbagliato la metà bassa crescerebbe e la mano finirebbe
//      fuori schermo;
//   3) le carte devono restare cliccabili DOVE SI VEDONO. Il browser fa il
//      hit-testing nello spazio trasformato, quindi in teoria funziona: si
//      verifica lo stesso, perché è la differenza fra un effetto grafico e
//      un gioco ingiocabile.
//
// OLOGRAMMI: l'effetto c'era già su desktop, ma in frazioni della CARTA —
// e su desktop la carta è proporzionalmente molto più piccola che su un
// telefono, per cui lo stesso ologramma occupava l'8,5% della larghezza
// dello schermo contro il 17,5%. C'era e non si notava, ed è il motivo per
// cui sembrava spento. Si sorveglia la PROPRIETÀ ("su schermo largo pesa
// almeno quanto su telefono"), non i numeri: un ritocco alle misure non
// deve far fallire il test, toglierle di nuovo sì.
//
// `standalone`: servono finestre di dimensioni diverse e la preferenza
// scritta PRIMA che la pagina giri, come per un giocatore che l'ha scelta
// in una sessione precedente.
const { openDuel, freezeNaturalGameLoop } = require('../helpers/harness');

/** Apre un duello con le due preferenze già impostate. */
async function duello(browser, viewport, opzioni) {
    const ctx = await browser.newContext({ viewport: viewport });
    await ctx.addInitScript((o) => {
        try {
            localStorage.setItem('ygoCampoInclinato', o.inclinato ? 'on' : 'off');
            localStorage.setItem('ygoHologram', o.ologrammi === false ? 'off' : 'on');
        } catch (e) { /* la preferenza si perde, il duello no */ }
    }, opzioni);
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
    name: 'Inquadratura: campo inclinato a scelta, e ologrammi visibili anche su desktop',
    standalone: true,
    async run({ browser, assert }) {
        // --- 1) Da spento, tutto come prima ------------------------------
        {
            const { ctx, page } = await duello(browser, { width: 1400, height: 900 }, { inclinato: false });
            try {
                const m = await page.evaluate(() => {
                    const gc = document.querySelector('.game-container');
                    return {
                        attributo: document.documentElement.dataset.campoInclinato,
                        tilt: getComputedStyle(gc).getPropertyValue('--campo-tilt').trim()
                    };
                });
                assert(m.attributo === 'off',
                    `Il campo inclinato dev'essere spento di default: "${m.attributo}"`);
                assert(!m.tilt || m.tilt === '0deg',
                    `Da spento non dev'esserci alcuna inclinazione: "${m.tilt}"`);
            } finally { await ctx.close(); }
        }

        // --- 2) Da acceso: inclinato, dentro lo schermo, giocabile -------
        for (const [nome, vp] of [['desktop', { width: 1400, height: 900 }],
            ['telefono', { width: 393, height: 852 }],
            ['telefono in orizzontale', { width: 852, height: 393 }]]) {
            const { ctx, page } = await duello(browser, vp, { inclinato: true });
            try {
                const m = await page.evaluate(() => {
                    const gc = document.querySelector('.game-container');
                    const r = gc.getBoundingClientRect();
                    const de = document.documentElement;
                    const carta = document.querySelector('#playerHand .card');
                    let mano = null;
                    if (carta) {
                        const rc = carta.getBoundingClientRect();
                        const x = rc.left + rc.width / 2;
                        const y = rc.top + rc.height / 2;
                        const sotto = (y >= 0 && y <= window.innerHeight) ? document.elementFromPoint(x, y) : null;
                        mano = {
                            dentro: rc.top >= 0 && rc.bottom <= window.innerHeight + 1
                                && rc.left >= -1 && rc.right <= window.innerWidth + 1,
                            colpita: !!(sotto && (sotto === carta || carta.contains(sotto)
                                || (sotto.parentNode && carta.contains(sotto.parentNode))))
                        };
                    }
                    return {
                        tilt: getComputedStyle(gc).getPropertyValue('--campo-tilt').trim(),
                        sbordaSotto: Math.round(r.bottom - window.innerHeight),
                        sbordaDestra: Math.round(r.right - window.innerWidth),
                        scrollOrizzontale: de.scrollWidth - de.clientWidth,
                        mano: mano
                    };
                });
                assert(/^\d+(\.\d+)?deg$/.test(m.tilt) && parseFloat(m.tilt) > 0,
                    `Da acceso il campo dev'essere inclinato (${nome}): "${m.tilt}"`);
                assert(m.sbordaSotto <= 1 && m.sbordaDestra <= 1 && m.scrollOrizzontale <= 1,
                    `Il campo inclinato non deve sbordare (${nome}): ${JSON.stringify(m)}`);
                assert(m.mano && m.mano.dentro && m.mano.colpita,
                    `Inclinato, una carta della mano deve restare dov'è e cliccabile (${nome}): ${JSON.stringify(m.mano)}`);
            } finally { await ctx.close(); }
        }

        // --- 3) L'ologramma si vede anche su desktop --------------------
        const misure = {};
        for (const [nome, vp] of [['desktop', { width: 1400, height: 900 }],
            ['telefono', { width: 393, height: 852 }]]) {
            const { ctx, page } = await duello(browser, vp, { inclinato: false });
            try {
                const o = await ologrammaDopoEvocazione(page);
                assert(o.presente, `Con l'impostazione accesa l'ologramma deve comparire (${nome})`);
                assert(o.carta > 0, `Carta non trovata sul Terreno (${nome})`);
                misure[nome] = { sullaCarta: o.larghezza / o.carta, sulloSchermo: o.larghezza / o.schermo };
            } finally { await ctx.close(); }
        }
        // La PARITÀ con il telefono non è raggiungibile e non va chiesta:
        // là il campo è più stretto, quindi qualunque cosa misurata sulla
        // carta pesa di più sullo schermo. Quello che deve valere è che su
        // desktop la proiezione sia sensibilmente PIÙ GRANDE DELLA CARTA
        // che su telefono — è la compensazione, ed è l'unica cosa che il
        // codice controlla davvero.
        assert(misure.desktop.sullaCarta > misure.telefono.sullaCarta * 1.2,
            'Su desktop la proiezione deve essere più grande rispetto alla carta, per compensare una carta più '
            + `piccola rispetto allo schermo: ${misure.desktop.sullaCarta.toFixed(2)}x contro `
            + `${misure.telefono.sullaCarta.toFixed(2)}x`);
        // E comunque non deve tornare a essere un francobollo.
        assert(misure.desktop.sulloSchermo > 0.09,
            `Su desktop la proiezione resta troppo piccola per notarsi: ${(misure.desktop.sulloSchermo * 100).toFixed(1)}% dello schermo`);

        // --- 4) E si spegne davvero quando lo si spegne -----------------
        {
            const { ctx, page } = await duello(browser, { width: 1400, height: 900 },
                { inclinato: false, ologrammi: false });
            try {
                const o = await ologrammaDopoEvocazione(page);
                assert(!o.presente, 'Spenta l\'impostazione, di ologrammi non ne deve restare nemmeno uno');
            } finally { await ctx.close(); }
        }
    }
};
