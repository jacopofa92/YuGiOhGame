// Le lezioni brevi del menu Tutorial (js/tutorial/tutorial-duel.js,
// ?lezione=catena|fusione|flip). Ognuna si gioca DAVVERO seguendo il
// riflettore — avanti sulle spiegazioni, tocco sul punto indicato — fino al
// pannello "Lezione completata". Poi si controlla che sia successo ciò che
// la lezione insegna (non solo che i passi siano scorsi), che la spunta
// finisca nel salvataggio senza toccare la lezione col nonno, e che la
// pagina tutorial.html la mostri come completata.
const path = require('path');

const RADICE = path.join(__dirname, '..', '..');
const DUELLO = 'file:///' + path.join(RADICE, 'duelMonstersCore.html').replace(/\\/g, '/')
    + '?mode=tutorial&character=solomonMuto&difficulty=Facile&field=citta.jpg&lezione=';
const MENU = 'file:///' + path.join(RADICE, 'tutorial.html').replace(/\\/g, '/');

const LEZIONI = {
    catena: {
        // Giudizio Solenne ha annullato Raigeki: i mostri del giocatore ci
        // sono ancora, e Giudizio è costato metà dei Life Point.
        verifica: () => ({
            ok: gameState.playerMonsterField.filter(Boolean).length === 2
                && gameState.botGraveyard.some((c) => c.id === 409)
                && gameState.playerGraveyard.some((c) => c.id === 448)
                && gameState.playerLP === 4000,
            dettaglio: { mostri: gameState.playerMonsterField.filter(Boolean).length, lp: gameState.playerLP }
        })
    },
    fusione: {
        verifica: () => ({
            ok: gameState.playerMonsterField.some((s) => s && s.card.id === 254)
                && gameState.playerGraveyard.some((c) => c.id === 14)
                && gameState.playerGraveyard.some((c) => c.id === 15),
            dettaglio: { campo: gameState.playerMonsterField.filter(Boolean).map((s) => s.card.id) }
        })
    },
    flip: {
        // Il giocatore sceglie il Drago (il secondo mostro del nonno): l'Elfo
        // resta. Un'auto-scelta "il primo che trovo" prenderebbe l'Elfo.
        verifica: () => ({
            ok: gameState.botGraveyard.some((c) => c.id === 1)
                && gameState.botMonsterField.some((s) => s && s.card.id === 24),
            dettaglio: { nonno: gameState.botMonsterField.filter(Boolean).map((s) => s.card.id) }
        })
    }
};

async function seguiRiflettore(page) {
    const scadenza = Date.now() + 90000;
    while (Date.now() < scadenza) {
        const st = await page.evaluate(() => {
            const passo = TutorialDuel._passi[TutorialDuel._passo()];
            const avanti = document.querySelector('.tut-avanti');
            const el = passo && passo.bersaglio ? passo.bersaglio() : null;
            const r = el ? el.getBoundingClientRect() : null;
            return {
                fine: !!(passo && passo.fine),
                avanti: !!(avanti && !avanti.hidden),
                r: r && r.width > 0 ? { x: r.left + r.width / 2, y: r.top + r.height / 2 } : null,
                popover: !!document.getElementById('quickPopover')
            };
        });
        if (st.fine) return;
        if (st.avanti) { await page.click('.tut-avanti'); await page.waitForTimeout(300); continue; }
        if (st.popover) {
            const b = await page.$('#quickPopover button');
            if (b) { await b.click(); await page.waitForTimeout(600); continue; }
        }
        if (st.r) await page.mouse.click(st.r.x, st.r.y);
        await page.waitForTimeout(600);
    }
    throw new Error('La lezione non è arrivata al pannello finale entro il tempo massimo');
}

module.exports = {
    standalone: true,
    name: 'Lezioni brevi (Catena, Fusione, Flip): si giocano seguendo il riflettore e finiscono spuntate nel menu Tutorial',
    async run(t) {
        for (const [id, lezione] of Object.entries(LEZIONI)) {
            const page = await t.browser.newPage({ viewport: { width: 1366, height: 820 } });
            const errori = [];
            page.on('pageerror', (e) => errori.push(e.message));
            await page.addInitScript(() => { window.AUTH_GATE_SKIP = true; window.DUEL_FAST_OPENING = true; });
            try {
                await page.goto(DUELLO + id);
                await page.waitForFunction(() => !!window.SaveManager);
                await page.evaluate(() => {
                    if (!SaveManager.hasSave()) SaveManager.createNew('Allievo');
                    SaveManager.setTutorial({ daFare: false, completata: false, premiata: false, lezioni: {} });
                });
                await page.reload();
                await page.waitForSelector('#tutorialCoach', { timeout: 40000 });
                t.assert(await page.evaluate(() => TutorialDuel.lezione) === id, `La pagina deve aprire la lezione "${id}"`);
                const sfondo = await page.evaluate(() => getComputedStyle(document.body).backgroundImage);
                t.assert(/citta\.jpg/.test(sfondo), `Lezione ${id}: si gioca sul campo "La Città" (${sfondo})`);
                // Una lezione breve non è mai obbligatoria: si può uscire.
                t.assert(await page.evaluate(() => getComputedStyle(document.getElementById('surrenderBtn')).display !== 'none'),
                    `Lezione ${id}: "Abbandona" deve esserci`);

                await seguiRiflettore(page);
                const esito = await page.evaluate(lezione.verifica);
                t.assert(esito.ok, `Lezione ${id}: deve essere successo ciò che insegna: ${JSON.stringify(esito.dettaglio)}`);
                const tut = await page.evaluate(() => SaveManager.getTutorial());
                t.assert(tut.lezioni[id] === true, `Lezione ${id}: completata nel salvataggio (${JSON.stringify(tut)})`);
                t.assert(!tut.completata && !tut.premiata, `Lezione ${id}: non deve toccare la lezione col nonno (${JSON.stringify(tut)})`);
                t.assert(errori.length === 0, `Lezione ${id}: nessun errore in pagina: ${JSON.stringify(errori)}`);

                // "Torna alle lezioni" porta al menu, che la mostra spuntata
                // senza chiedere conferme di uscita.
                page.on('dialog', (d) => { errori.push('dialogo: ' + d.message()); d.dismiss(); });
                await Promise.all([page.waitForURL(/tutorial\.html/), page.click('.tut-avanti')]);
                await page.waitForSelector(`.tut-lezione[data-lezione="${id}"]`);
                const stato = await page.textContent(`.tut-lezione[data-lezione="${id}"] .tut-stato`);
                t.assert(/Completata/.test(stato), `Nel menu Tutorial la lezione ${id} risulta completata ("${stato}")`);
                t.assert(errori.length === 0, `Lezione ${id}: uscita pulita: ${JSON.stringify(errori)}`);
            } finally {
                await page.close();
            }
        }

        // Il menu elenca tutte e quattro le lezioni, ognuna col suo link.
        const page = await t.browser.newPage();
        await page.addInitScript(() => { window.AUTH_GATE_SKIP = true; });
        try {
            await page.goto(MENU);
            // "Regole del Duello" condivide lo stile delle tessere, ma è una
            // voce di consultazione: non è una quinta lezione giocabile.
            const link = await page.$$eval('.tut-lezione[data-lezione]', (els) => els.map((a) => a.getAttribute('href')));
            t.assert(['nonno', 'catena', 'fusione', 'flip'].every((id) => link.some((h) => h.endsWith('&lezione=' + id))),
                `Il menu Tutorial deve elencare le quattro lezioni: ${JSON.stringify(link)}`);
            t.assert(link.every((h) => /[?&]field=citta\.jpg(&|$)/.test(h)),
                `Ogni lezione del menu si gioca in città: ${JSON.stringify(link)}`);
        } finally {
            await page.close();
        }
    }
};
