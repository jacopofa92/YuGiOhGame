// Regno dei Duellanti, sull'isola (prima del Castello):
//  - un duello si vede PRIMA di sceglierlo, col nome dello sfidante;
//    premi, insidie e vicoli ciechi restano "Ignoto";
//  - un vicolo cieco si percorre (1 o 2 nodi), si scopre che finisce e si
//    torna al bivio da soli; quel sentiero resta chiuso e le altre strade
//    restano lì;
//  - non ci si incastra mai: ogni bivio generato ha almeno una strada che
//    prosegue, mai più di un vicolo, e una pagina ricaricata a metà vicolo
//    riparte dallo stesso punto (o chiude il vicolo già scoperto).
// Richiesta dell'utente: "occhio a non incastrarmi in loop o bloccarmi".
const path = require('path');

module.exports = {
    standalone: true,
    name: 'Regno dei Duellanti: sfidanti visibili, vicoli ciechi senza blocchi',
    async run(t) {
        const radice = path.join(__dirname, '..', '..');
        const url = 'file:///' + path.join(radice, 'torneo-regno-duellanti.html').replace(/\\/g, '/');
        const page = await t.browser.newPage({ viewport: { width: 1280, height: 800 } });
        const errori = [];
        page.on('pageerror', (e) => errori.push(e.message));
        await page.addInitScript(() => { window.AUTH_GATE_SKIP = true; window.PAGE_LOADER_SKIP = true; });
        const stato = () => page.evaluate(() => SaveManager.getTournamentState('duelistKingdom'));
        try {
            await page.goto(url);
            await page.waitForFunction(() => !!window.SaveManager);
            await page.evaluate(() => {
                if (!SaveManager.hasSave()) SaveManager.createNew('Tester');
                SaveManager.setTournamentState('duelistKingdom', {
                    step: 1, stars: 4, difficulty: 'Medio', castleReached: false, eliminated: false, atKaibaGate: false,
                    pendingEncounter: null, scenesShown: { prologue: true },
                    history: [{ kind: 'prize', label: '+1', x: 360, y: 320 }],
                    pendingRoutes: [
                        { kind: 'opponent', characterId: 'mai', x: 590, y: 200 },
                        { kind: 'deadEnd', depth: 2, x: 600, y: 330 },
                        { kind: 'prize', amount: 1, x: 590, y: 460 }
                    ]
                });
            });
            await page.reload();
            await page.waitForSelector('.map-node.choice');

            const bivio = await page.locator('.map-node.choice').allTextContents();
            t.assert(/Mai Valentine/.test(bivio[0]) && /Duello/.test(bivio[0]),
                `Il duello deve mostrare lo sfidante prima della scelta: ${JSON.stringify(bivio)}`);
            t.assert(/Ignoto/.test(bivio[1]) && /Ignoto/.test(bivio[2]),
                `Vicolo cieco e premio devono restare "Ignoto": ${JSON.stringify(bivio)}`);

            // Dentro il vicolo: una sola strada avanti, e un reload non la perde.
            await page.locator('.map-node.choice[data-route-index="1"]').click();
            await page.waitForFunction(() => {
                const s = SaveManager.getTournamentState('duelistKingdom');
                return s.corridor && document.querySelectorAll('.map-node.choice').length === 1;
            }, null, { timeout: 5000 });
            await page.reload();
            await page.waitForSelector('.map-node.choice');
            const dentro = await page.locator('.map-node.choice').allTextContents();
            t.assert(dentro.length === 1 && /prosegue/.test(dentro[0]),
                `Ricaricando a metà vicolo si resta dentro, con la sola strada avanti: ${JSON.stringify(dentro)}`);

            // In fondo: vicolo cieco, ritorno al bivio, sentiero chiuso.
            await page.locator('.map-node.choice').first().click();
            await page.waitForFunction(() => {
                const s = SaveManager.getTournamentState('duelistKingdom');
                return !s.corridor && s.pendingRoutes && s.pendingRoutes[1].closed;
            }, null, { timeout: 8000 });
            let s = await stato();
            t.assert(s.stars === 4 && (s.closedBranches || []).length === 1,
                `Il vicolo non tocca le Stelle e resta disegnato: ${JSON.stringify({ stelle: s.stars, rami: s.closedBranches })}`);
            t.assert(await page.locator('button.map-node.choice').count() === 2,
                'Tornati al bivio, le due strade rimaste devono essere cliccabili');

            // Il sentiero chiuso non si riprende.
            await page.locator('.map-node.choice.closed').click({ force: true });
            await page.waitForTimeout(700);
            s = await stato();
            t.assert(!s.corridor, 'Un sentiero già scoperto come vicolo cieco non deve riaprirsi');

            // Reload col vicolo già scoperto ma il ritorno interrotto.
            await page.evaluate(() => {
                const st = SaveManager.getTournamentState('duelistKingdom');
                st.pendingRoutes.push({ kind: 'deadEnd', depth: 1, x: 620, y: 560 });
                st.corridor = { routeIndex: st.pendingRoutes.length - 1, from: { x: 360, y: 320 }, nodes: [{ x: 620, y: 560 }], at: 0, finito: true };
                SaveManager.setTournamentState('duelistKingdom', st);
            });
            await page.reload();
            await page.waitForSelector('.map-node.choice');
            s = await stato();
            t.assert(!s.corridor && s.pendingRoutes[s.pendingRoutes.length - 1].closed,
                'Un vicolo già scoperto prima del reload deve chiudersi da solo, senza lasciare bloccati');

            // Un bivio con tutte le strade chiuse non può bloccare: si rigenera.
            await page.evaluate(() => {
                const st = SaveManager.getTournamentState('duelistKingdom');
                st.pendingRoutes.forEach((r) => { r.closed = true; });
                SaveManager.setTournamentState('duelistKingdom', st);
            });
            await page.reload();
            await page.waitForSelector('button.map-node.choice');
            t.assert(await page.locator('button.map-node.choice').count() >= 2,
                'Se tutte le strade fossero chiuse, deve nascere un bivio nuovo');

            // Molti bivi: sempre almeno due strade vere, mai più di un vicolo.
            const statistica = await page.evaluate(() => {
                let peggiore = 99, vicoliMax = 0;
                for (let i = 0; i < 2000; i++) {
                    const st = { history: [], step: 0, stars: 3 };
                    generateRoutes(st);
                    const vere = st.pendingRoutes.filter((r) => r.kind !== 'deadEnd').length;
                    peggiore = Math.min(peggiore, vere);
                    vicoliMax = Math.max(vicoliMax, st.pendingRoutes.length - vere);
                }
                return { peggiore, vicoliMax };
            });
            t.assert(statistica.peggiore >= 2 && statistica.vicoliMax <= 1,
                `Ogni bivio deve avere almeno 2 strade vere e al massimo 1 vicolo: ${JSON.stringify(statistica)}`);
            t.assert(errori.length === 0, `Nessun errore in pagina: ${JSON.stringify(errori)}`);
        } finally {
            await page.close();
        }
    }
};
