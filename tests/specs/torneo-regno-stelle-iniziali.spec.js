// Il torneo "Regno dei Duellanti" deve DAVVERO partire con STARTING_STARS
// (2) Stelle interne al torneo, e quella dote di partenza non deve mai
// finire nel portafoglio reale del giocatore (quello è il bottino delle
// Stelle VINTE durante la scalata, non quelle con cui si parte).
//
// Bug reale chiuso qui: il vecchio codice chiamava
// `addStars(STARTING_STARS - currentStars())` PRIMA che lo stato del
// torneo esistesse ancora — `addStars` esce subito (`if (!state) return
// 0`) quando non trova uno stato da aggiornare, quindi quella chiamata
// era un no-op silenzioso e il torneo partiva sempre da ZERO Stelle
// nonostante la schermata iniziale promettesse "Parti con 2 Stelle".
//
// `standalone`: la pagina del torneo vive per conto suo.
const path = require('path');

module.exports = {
    standalone: true,
    name: 'Torneo Regno dei Duellanti: si parte davvero con 2 Stelle interne, senza toccare il portafoglio',
    async run(t) {
        const RADICE = path.join(__dirname, '..', '..');
        const url = 'file:///' + path.join(RADICE, 'torneo-regno-duellanti.html').replace(/\\/g, '/');
        const page = await t.browser.newPage({ viewport: { width: 1280, height: 900 } });
        const erroriPagina = [];
        page.on('pageerror', (e) => erroriPagina.push(e.message));
        await page.addInitScript(() => { window.AUTH_GATE_SKIP = true; });

        try {
            await page.goto(url);
            await page.waitForFunction(() => !!(window.SaveManager && document.getElementById('startTournamentBtn')), null, { timeout: 25000 });

            // Baseline pulita: nessun torneo in corso, portafoglio Stelle a
            // un valore noto e diverso da zero, per poter distinguere "non
            // e' cambiato" da "e' per caso rimasto a zero".
            await page.evaluate(() => {
                if (!SaveManager.hasSave()) SaveManager.createNew('Tester');
                SaveManager.setTournamentState('duelistKingdom', null);
                const attuali = SaveManager.getCurrency().starChips || 0;
                if (attuali > 0) SaveManager.addCurrency('starChips', -attuali);
                SaveManager.addCurrency('starChips', 7);
            });
            await page.reload();
            await page.waitForFunction(() => !!(window.SaveManager && document.getElementById('startTournamentBtn')), null, { timeout: 25000 });

            const primaDelClick = await page.evaluate(() => SaveManager.getCurrency().starChips);
            t.assert(primaDelClick === 7, `Portafoglio di partenza atteso a 7, letto ${primaDelClick}`);

            await page.click('#startTournamentBtn');
            await page.waitForFunction(() => {
                const s = window.SaveManager && SaveManager.getTournamentState('duelistKingdom');
                return !!s;
            }, null, { timeout: 10000 });

            const dopo = await page.evaluate(() => ({
                stelleTorneo: SaveManager.getTournamentState('duelistKingdom').stars,
                portafoglio: SaveManager.getCurrency().starChips
            }));

            t.assert(dopo.stelleTorneo === 2, `Il torneo deve partire con 2 Stelle interne, non ${dopo.stelleTorneo}`);
            t.assert(dopo.portafoglio === 7, `La dote di partenza non deve toccare il portafoglio reale (atteso invariato a 7, letto ${dopo.portafoglio})`);

            t.assert(erroriPagina.length === 0, 'Nessun errore JS deve comparire in pagina: ' + erroriPagina.join(' | '));
        } finally {
            await page.close();
        }
    }
};
