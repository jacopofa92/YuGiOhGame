// Battle City, mappa della città: le caselle sono pedine 3D in SVG (non più
// emoji) e le caselle raggiungibili sono EVIDENTI — accese, con un percorso
// dal segnalino a ciascuna, e le sole ad avere l'etichetta. Richiesta
// dell'utente: "rendi più evidente dove il giocatore può spostarsi... e al
// posto delle emoticon metti qualcosa in 3D".
//
// Controlla le PROPRIETÀ, non il disegno: un percorso per ogni casella
// raggiungibile (e solo per quelle), nessuna emoji rimasta nelle caselle o
// nella legenda, il segnalino che segue la mossa. Il disegno si giudica a
// occhio, una misura non lo dice.
//
// `standalone`: la pagina del torneo vive per conto suo.
const path = require('path');

const EMOJI = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}❓❗]/u;

module.exports = {
    standalone: true,
    name: 'Battle City: pedine 3D al posto delle emoji, e percorsi verso le sole caselle raggiungibili',
    async run(t) {
        const RADICE = path.join(__dirname, '..', '..');
        const url = 'file:///' + path.join(RADICE, 'torneo-battle-city.html').replace(/\\/g, '/');
        const page = await t.browser.newPage({ viewport: { width: 1280, height: 900 } });
        const erroriPagina = [];
        page.on('pageerror', (e) => erroriPagina.push(e.message));
        await page.addInitScript(() => { window.AUTH_GATE_SKIP = true; });

        try {
            await page.goto(url);
            await page.waitForFunction(() => !!(window.SaveManager && window.BoardPieces), null, { timeout: 25000 });
            // Settore costruito dal codice vero, con la casella a destra
            // dell'inizio forzata a "libera": cliccarla deve spostare il
            // segnalino senza aprire duelli o eventi.
            await page.evaluate(() => {
                if (!SaveManager.hasSave()) SaveManager.createNew('Tester');
                const s = makeInitialState('Medio');
                buildSector(s);
                s.grid.cells.forEach((c) => { c.revealed = true; });
                s.grid.cells[13] = { kind: 'empty', revealed: true, resolved: false };
                s.intermezziVisti = ['prologue', 'city', 'intro'];
                saveState(s);
            });
            await page.reload();
            await page.waitForSelector('.city-cell', { timeout: 15000 });
            await page.waitForFunction(() => document.querySelectorAll('.city-routes .route').length > 0, null, { timeout: 5000 });

            const leggi = () => page.evaluate(() => {
                const g = document.getElementById('cityGrid');
                const reach = Array.from(document.querySelectorAll('.city-cell.reachable')).map((el) => el.dataset.index);
                const attesi = (g.dataset.reachable || '').split(',').filter(Boolean);
                const testoCaselle = Array.from(document.querySelectorAll('.city-cell, .legend')).map((el) => el.textContent).join(' ');
                const etichetteVisibili = Array.from(document.querySelectorAll('.city-cell > .cell-label'))
                    .filter((el) => getComputedStyle(el).display !== 'none')
                    .map((el) => el.parentElement);
                const tok = document.querySelector('.city-player-token').getBoundingClientRect();
                const cella = document.querySelector(`.city-cell[data-index="${g.dataset.player}"]`).getBoundingClientRect();
                return {
                    player: g.dataset.player,
                    reach: reach.sort(), attesi: attesi.sort(),
                    percorsi: document.querySelectorAll('.city-routes .route').length,
                    frecce: document.querySelectorAll('.city-routes .route-arrow').length,
                    pedine: document.querySelectorAll('.city-cell .bp-piece').length,
                    pedineLegenda: document.querySelectorAll('.legend .bp-piece').length,
                    testoCaselle: testoCaselle,
                    etichetteFuoriPosto: etichetteVisibili.filter((c) => !c.classList.contains('reachable') && !c.classList.contains('heliport')).length,
                    segnalinoCentrato: Math.abs((tok.left + tok.width / 2) - (cella.left + cella.width / 2)) < 3
                };
            });

            const prima = await leggi();
            t.assert(prima.reach.length === 4, `Dal centro del settore le caselle raggiungibili sono 4, lette ${prima.reach.length}`);
            t.assert(JSON.stringify(prima.reach) === JSON.stringify(prima.attesi),
                `Le caselle accese devono essere esattamente le vicine del segnalino: ${prima.reach} contro ${prima.attesi}`);
            t.assert(prima.percorsi === prima.reach.length && prima.frecce === prima.reach.length,
                `Un percorso con la sua freccia per ogni casella raggiungibile: ${prima.percorsi} percorsi, ${prima.frecce} frecce, ${prima.reach.length} caselle`);
            t.assert(prima.pedine > 0 && prima.pedineLegenda >= 8, `Caselle e legenda devono usare le pedine SVG (${prima.pedine} in mappa, ${prima.pedineLegenda} in legenda)`);
            t.assert(!EMOJI.test(prima.testoCaselle), `Nessuna emoji deve restare nelle caselle o nella legenda: "${(prima.testoCaselle.match(EMOJI) || [])[0]}"`);
            t.assert(prima.etichetteFuoriPosto === 0, `L'etichetta si vede solo sulle caselle raggiungibili (e sul decollo): ${prima.etichetteFuoriPosto} fuori posto`);
            t.assert(prima.segnalinoCentrato, 'Il segnalino deve stare sulla casella del giocatore');

            await page.click('.city-cell[data-index="13"]');
            await page.waitForFunction(() => document.getElementById('cityGrid').dataset.player === '13', null, { timeout: 5000 });
            await page.waitForTimeout(700);
            const dopo = await leggi();
            t.assert(JSON.stringify(dopo.reach) === JSON.stringify(dopo.attesi) && dopo.reach.indexOf('13') === -1,
                `Dopo la mossa si accendono le vicine della NUOVA casella: ${dopo.reach}`);
            t.assert(dopo.percorsi === dopo.reach.length, `I percorsi seguono la mossa: ${dopo.percorsi} per ${dopo.reach.length} caselle`);
            t.assert(dopo.segnalinoCentrato, 'Il segnalino deve aver raggiunto la casella cliccata');

            t.assert(erroriPagina.length === 0, 'Nessun errore JS deve comparire in pagina: ' + erroriPagina.join(' | '));
        } finally {
            await page.close();
        }
    }
};
