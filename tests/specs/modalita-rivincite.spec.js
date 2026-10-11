// Modalità Rivincite (js/modes/rivincita-mode.js, js/data/rivincite-db.js).
// Si gioca nei panni del personaggio e con il SUO mazzo: lo spec controlla
// che il mazzo in campo sia proprio quello (e non quello del salvataggio),
// che a schermo tu sia il personaggio, che una vittoria diventi una
// medaglia del livello giusto (una volta sola per le Sfide), e che
// rivincite.html la mostri e lanci il duello con l'URL giusto.
// In più il catalogo: personaggi con i loro mazzi, campi esistenti,
// traguardi delle Sfide allineati al numero di Rivincite, premi in crediti.
const fs = require('fs');
const path = require('path');

const RADICE = path.join(__dirname, '..', '..');
const DUELLO = 'file:///' + path.join(RADICE, 'duelMonstersCore.html').replace(/\\/g, '/');
const PAGINA = 'file:///' + path.join(RADICE, 'rivincite.html').replace(/\\/g, '/');

module.exports = {
    standalone: true,
    name: 'Rivincite: il mazzo è quello del personaggio, la vittoria diventa una medaglia, la pagina la mostra',
    async run(t) {
        const page = await t.browser.newPage({ viewport: { width: 1400, height: 900 } });
        const errori = [];
        page.on('pageerror', (e) => errori.push(e.message));
        await page.addInitScript(() => { window.AUTH_GATE_SKIP = true; window.DUEL_FAST_OPENING = true; window.DUEL_RPS_SKIP = true; });
        try {
            await page.goto(DUELLO + '?mode=rivincita&rivincita=joey-rex&character=rex&difficulty=Difficile');
            try { await page.click('.di-skip', { timeout: 4000 }); } catch (e) { /* nessuna intro */ }
            await page.waitForFunction(() => typeof gameState !== 'undefined' && (gameState.playerHand || []).length >= 5, null, { timeout: 30000 });

            const mazzi = await page.evaluate(() => {
                const conta = (spec) => {
                    const m = {};
                    (spec.main || []).forEach((e) => { m[e.id] = (m[e.id] || 0) + (e.qty || 1); });
                    return m;
                };
                const inGioco = (posto) => {
                    const m = {};
                    const carte = [].concat(gameState[posto + 'Hand'] || [], gameState[posto + 'Deck'] || []);
                    carte.forEach((c) => { m[c.id] = (m[c.id] || 0) + 1; });
                    return m;
                };
                return {
                    joey: conta(getCharacterDeck('joey', 'hard')),
                    rex: conta(getCharacterDeck('rex', 'hard')),
                    giocatore: inGioco('player'),
                    avversario: inGioco('bot'),
                    nome: DuelSession.player.name,
                    ritratto: DuelSession.player.image
                };
            });
            t.assert(JSON.stringify(mazzi.giocatore) === JSON.stringify(mazzi.joey),
                `Mano e mazzo del giocatore sono esattamente il mazzo di Joey: ${JSON.stringify(mazzi.giocatore)} contro ${JSON.stringify(mazzi.joey)}`);
            t.assert(JSON.stringify(mazzi.avversario) === JSON.stringify(mazzi.rex),
                `L'avversario usa il mazzo Difficile di Rex: ${JSON.stringify(mazzi.avversario)}`);
            t.assert(mazzi.nome === 'Joey Wheeler' && /joeyWheeler/.test(mazzi.ritratto || ''),
                `A schermo sei Joey (${mazzi.nome}, ${mazzi.ritratto})`);
            const targa = await page.textContent('#playerInfo');
            t.assert(/Joey Wheeler/.test(targa), `Il riquadro del giocatore dice Joey Wheeler ("${targa.trim()}")`);

            // Vittoria: medaglia Difficile, Sfida "una Rivincita" avanzata.
            await page.evaluate(() => endDuel(true));
            await page.waitForFunction(() => ((SaveManager.getModeState('rivincite') || {})['joey-rex'] || { vinte: {} }).vinte.Difficile, null, { timeout: 15000 });
            const sfida = await page.evaluate(() => SaveManager.getChallengeProgress('rivincita-prima'));
            t.assert(sfida.count === 1 && sfida.completed, `La Sfida "Nei loro panni" è completata (${JSON.stringify(sfida)})`);
            t.assert(errori.length === 0, `Nessun errore durante il duello: ${JSON.stringify(errori)}`);
        } finally {
            await page.close();
        }

        // Una Rivincita inesistente riporta all'elenco invece di rompersi.
        {
            const p = await t.browser.newPage();
            await p.addInitScript(() => { window.AUTH_GATE_SKIP = true; window.DUEL_FAST_OPENING = true; window.DUEL_RPS_SKIP = true; });
            try {
                await p.goto(DUELLO + '?mode=rivincita&rivincita=non-esiste&character=rex&difficulty=Medio');
                try { await p.click('.di-skip', { timeout: 4000 }); } catch (e) { /* nessuna intro */ }
                await p.waitForURL(/rivincite\.html/, { timeout: 20000 });
            } finally {
                await p.close();
            }
        }

        // La pagina dell'elenco: medaglie, scelta del livello, URL del duello.
        const p = await t.browser.newPage({ viewport: { width: 393, height: 852 } });
        await p.addInitScript(() => { window.AUTH_GATE_SKIP = true; });
        try {
            await p.goto(PAGINA);
            await p.evaluate(() => {
                if (!SaveManager.hasSave()) SaveManager.createNew('Rivale');
                SaveManager.setModeState('rivincite', { 'joey-rex': { vinte: { Difficile: true } } });
            });
            await p.reload();
            const medaglie = await p.$$eval('.mp-voce[data-rivincita="joey-rex"] .mp-medaglia', (els) => els.map((e) => e.classList.contains('is-vinta')));
            t.assert(JSON.stringify(medaglie) === JSON.stringify([false, false, true]), `Solo la medaglia d'oro (Difficile) risulta vinta: ${JSON.stringify(medaglie)}`);
            const scorre = await p.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
            t.assert(!scorre, 'La pagina non scorre di lato su un telefono');
            await p.click('.mp-voce[data-rivincita="yugi-marik"]');
            t.assert(await p.isVisible('#sceltaLivello'), 'Toccando una Rivincita si apre la scelta del livello');
            await p.route('**/duelMonstersCore.html*', (r) => r.fulfill({ body: '<html></html>', contentType: 'text/html' }));
            await Promise.all([p.waitForURL(/duelMonstersCore\.html/), p.click('.mp-scelta[data-livello="Facile"]')]);
            const url = decodeURIComponent(p.url());
            t.assert(/mode=rivincita/.test(url) && /rivincita=yugi-marik/.test(url) && /character=marik/.test(url)
                && /difficulty=Facile/.test(url) && /field=torreDeiDuelliShadow\.jpg/.test(url),
            `L'URL del duello porta Rivincita, avversario, livello e campo: ${url}`);

            // Il catalogo.
            await p.goto(PAGINA);
            const cat = await p.evaluate(() => {
                const s = document.createElement('script');
                s.src = 'js/data/challenges-db.js';
                document.head.appendChild(s);
                return new Promise((ok) => {
                    s.onload = () => ok({
                        voci: rivinciteDatabase.map((r) => ({ id: r.id, g: r.giocatore, a: r.avversario, campo: r.campo })),
                        personaggi: characterDatabase.map((c) => c.id),
                        sfide: challengesDatabase.filter((c) => c.modalita === 'rivincite').map((c) => ({ id: c.id, target: c.target, reward: c.reward }))
                    });
                });
            });
            const id = new Set();
            cat.voci.forEach((v) => {
                t.assert(!id.has(v.id), `Id ripetuto nelle Rivincite: ${v.id}`);
                id.add(v.id);
                t.assert(cat.personaggi.includes(v.g) && cat.personaggi.includes(v.a), `Rivincita ${v.id}: personaggi esistenti (${v.g}, ${v.a})`);
                t.assert(!v.campo || fs.existsSync(path.join(RADICE, 'images', 'fields', v.campo)), `Rivincita ${v.id}: il campo ${v.campo} esiste`);
            });
            const sfidaDi = (x) => cat.sfide.find((c) => c.id === x) || {};
            t.assert(sfidaDi('rivincita-tutte-difficile').target === cat.voci.length, `"Tutte a Difficile" vale ${cat.voci.length} Rivincite`);
            t.assert(sfidaDi('rivincita-tutte-medaglie').target === cat.voci.length * 3, `"Tutte le medaglie" vale ${cat.voci.length * 3} medaglie`);
            t.assert(cat.sfide.every((c) => Object.keys(c.reward || {}).every((k) => k === 'credits')), 'Le Sfide delle Rivincite pagano solo crediti');
        } finally {
            await p.close();
        }

        // Ogni personaggio usato ha i suoi tre mazzi (lo controlla la pagina del duello, che li carica).
        const d = await t.browser.newPage();
        await d.addInitScript(() => { window.AUTH_GATE_SKIP = true; window.DUEL_FAST_OPENING = true; window.DUEL_RPS_SKIP = true; });
        try {
            await d.goto(DUELLO);
            await d.waitForFunction(() => typeof getCharacterDeck === 'function' && typeof rivinciteDatabase !== 'undefined', null, { timeout: 30000 });
            const mancanti = await d.evaluate(() => {
                const out = [];
                rivinciteDatabase.forEach((r) => [r.giocatore, r.avversario].forEach((id) => ['easy', 'medium', 'hard'].forEach((liv) => {
                    const s = getCharacterDeck(id, liv);
                    if (!s || !(s.main || []).length) out.push(id + ':' + liv);
                })));
                return out;
            });
            t.assert(mancanti.length === 0, `Personaggi delle Rivincite senza mazzo: ${JSON.stringify(mancanti)}`);
        } finally {
            await d.close();
        }
    }
};
