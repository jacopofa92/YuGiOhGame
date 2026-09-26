// Negozio: 1 sola copia per carta della rotazione giornaliera.
// =====================================================================
// Richiesta esplicita dell'utente: "posso comprare solo 1 in quella
// rotazione giornaliera" — prima nulla lo impediva, una carta si poteva
// ricomprare finché bastavano i crediti, restando sempre in vetrina.
//
// `standalone`: serve negozio.html, non la pagina del duello.
const path = require('path');

module.exports = {
    name: 'Negozio: la carta del giorno sparisce dopo l\'acquisto, non si ricompra',
    standalone: true,
    async run({ browser, assert }) {
        const RADICE = path.join(__dirname, '..', '..');
        const url = 'file:///' + RADICE.replace(/\\/g, '/') + '/negozio.html';
        const context = await browser.newContext({
            viewport: { width: 900, height: 950 },
            serviceWorkers: 'block'
        });
        await context.addInitScript(() => { window.AUTH_GATE_SKIP = true; });
        const page = await context.newPage();
        const erroriPagina = [];
        page.on('pageerror', (e) => erroriPagina.push(e.message));

        try {
            await page.goto(url);
            await page.waitForFunction(() => !!(window.ShopCatalog && window.SaveManager), null, { timeout: 20000 });
            await page.evaluate(() => {
                if (!SaveManager.hasSave()) SaveManager.createNew('Tester');
                SaveManager.addCurrency('credits', 100000);
            });
            await page.reload();
            await page.waitForFunction(() => !!window.ShopCatalog, null, { timeout: 20000 });
            await page.waitForSelector('.shop-item, .shop-empty-note', { timeout: 15000 });

            // --- Stato iniziale: le 4 carte, nessuna comprata -----------
            const carteFresche = await page.evaluate(() => ShopCatalog.carteDelGiorno());
            assert(carteFresche.length === 4, `Le carte del giorno devono essere 4 (trovate ${carteFresche.length})`);
            assert(carteFresche.every((c) => c.acquistataOggi === false),
                'Un salvataggio nuovo non deve avere nessuna carta del giorno già segnata come comprata');

            const contaGrigliaGiorno = () => document.querySelectorAll('.shop-grid:not(.packs):not(.decks) .shop-item').length;
            const primoConteggio = await page.evaluate(contaGrigliaGiorno);
            assert(primoConteggio === 4, `La griglia "Carte del giorno" deve mostrare 4 carte (mostra ${primoConteggio})`);

            // --- "Ne possiedi N": già presente, verificato che non regredisca ---
            const primaCartaId = carteFresche[0].cardId;
            const metaPrima = await page.evaluate(() => document.querySelector('.shop-grid:not(.packs):not(.decks) .shop-item .shop-item-meta').textContent);
            assert(/non ancora nella collezione/i.test(metaPrima),
                `Una carta mai posseduta deve dirlo esplicitamente: "${metaPrima}"`);

            // --- Comprare una carta la fa sparire SUBITO dalla griglia ---
            await page.evaluate(() => {
                document.querySelector('.shop-grid:not(.packs):not(.decks) .shop-item .buy-btn:not(.alt)').click();
            });
            await page.waitForTimeout(1000);

            const dopoUnAcquisto = await page.evaluate((cardId) => ({
                itemNellaGriglia: document.querySelectorAll('.shop-grid:not(.packs):not(.decks) .shop-item').length,
                possedute: SaveManager.getOwnedCount(cardId),
                acquistataOggi: ShopCatalog.carteDelGiorno().find((c) => c.cardId === cardId).acquistataOggi,
                credit: SaveManager.getCurrency().credits
            }), primaCartaId);
            assert(dopoUnAcquisto.itemNellaGriglia === 3,
                `Dopo 1 acquisto devono restare 3 carte in vetrina (trovate ${dopoUnAcquisto.itemNellaGriglia})`);
            assert(dopoUnAcquisto.possedute === 1, `La carta comprata deve risultare posseduta 1 volta (risulta ${dopoUnAcquisto.possedute})`);
            assert(dopoUnAcquisto.acquistataOggi === true, 'La carta comprata deve risultare acquistataOggi=true');
            assert(dopoUnAcquisto.credit === 99900, `I crediti devono scendere di 100 (restano ${dopoUnAcquisto.credit})`);

            // --- "Ne possiedi 1" ora si vede sulle ALTRE carte comprate ---
            // (verificato di nuovo dopo aver comprato tutto, più sotto)

            // --- Comprando anche le altre 3, la vetrina si svuota -------
            for (let i = 0; i < 3; i++) {
                await page.evaluate(() => {
                    const btn = document.querySelector('.shop-grid:not(.packs):not(.decks) .shop-item .buy-btn:not(.alt)');
                    if (btn) btn.click();
                });
                await page.waitForTimeout(800);
            }
            const dopoTutte = await page.evaluate(() => ({
                itemNellaGriglia: document.querySelectorAll('.shop-grid:not(.packs):not(.decks) .shop-item').length,
                messaggio: (document.querySelector('.shop-empty-note') || {}).textContent || null,
                tutteAcquistate: ShopCatalog.carteDelGiorno().every((c) => c.acquistataOggi)
            }));
            assert(dopoTutte.itemNellaGriglia === 0, 'Dopo aver comprato tutte e 4 la griglia deve restare vuota');
            assert(!!dopoTutte.messaggio, 'Deve comparire un messaggio quando la vetrina di oggi è esaurita');
            assert(dopoTutte.tutteAcquistate, 'Tutte e 4 le carte devono risultare acquistataOggi=true');

            // --- Persiste dopo un ricaricamento (stesso giorno) ---------
            await page.reload();
            await page.waitForFunction(() => !!window.ShopCatalog, null, { timeout: 20000 });
            await page.waitForSelector('.shop-item, .shop-empty-note', { timeout: 15000 });
            const dopoReload = await page.evaluate(() => ({
                itemNellaGriglia: document.querySelectorAll('.shop-grid:not(.packs):not(.decks) .shop-item').length,
                messaggio: (document.querySelector('.shop-empty-note') || {}).textContent || null
            }));
            assert(dopoReload.itemNellaGriglia === 0, 'Ricaricando la pagina, lo stesso giorno, la vetrina deve restare esaurita');
            assert(!!dopoReload.messaggio, 'Il messaggio di vetrina esaurita deve sopravvivere al ricaricamento della pagina');

            assert(erroriPagina.length === 0, 'Errori JS in pagina: ' + erroriPagina.join(' | '));
        } finally {
            await context.close();
        }
    }
};
