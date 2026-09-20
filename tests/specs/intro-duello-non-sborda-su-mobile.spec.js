// L'apertura del duello non deve sbordare dallo schermo su mobile.
// =====================================================================
// Segnalato dall'utente: "tra la fine del loading (it's time to duel) e
// la comparsa del campo da gioco, su mobile ci sono artefatti (grafica
// che si sposta ecc); su desktop invece è ok".
//
// Misurato, erano DUE cose distinte, entrambe dovute a valori in pixel
// fissi pensati su una finestra desktop larga:
//   1) i due duellanti della cinematica VS si scostano di ±26px nella
//      fase "clash" per lasciare il centro a DUEL!, e poi escono a
//      ±90px. Su 1400px non si nota; su 393px il palco è già largo
//      377px e non c'è nessuno spazio da cui scostarsi, quindi
//      finivano FUORI dallo schermo mentre erano a piena opacità
//      (giocatore a x=-15, avversario fino a 408 su schermo 393);
//   2) la zoomata della telecamera partiva da scale(1.7) + rotateX(58deg):
//      su mobile il campo partiva da -241 a 634, cioè 875px su uno
//      schermo di 393 — più del doppio — tagliando pila del Deck,
//      Abbandona e contatore turni, che sembravano "scivolare" mentre
//      la zoomata rientrava.
//
// Entrambi risolti rendendo quei valori proporzionali allo schermo
// (clamp su vw per la cinematica) o riducendoli nel @media mobile (la
// telecamera). Questo spec tiene ferma la proprietà che conta — niente
// esce dai bordi — invece dei numeri esatti, che possono cambiare se
// qualcuno ritocca l'effetto.
//
// `standalone` perché serve una finestra di dimensioni mobile e la
// sequenza di apertura VERA: il resto della suite apre il duello a
// 1400x900 e con `DUEL_FAST_OPENING`, che salta proprio l'intro.
const path = require('path');

const LARGHEZZA = 393;
const ALTEZZA = 851;
// Tolleranza: l'entrata dei duellanti PARTE deliberatamente da fuori
// campo (è un'entrata), quindi si guarda solo ciò che è a piena
// opacità; per il campo si concede il filo di sbordo della prospettiva.
const TOLLERANZA_PX = 20;

module.exports = {
    name: 'L\'apertura del duello non sborda dallo schermo su mobile',
    standalone: true,
    async run({ browser, assert }) {
        const RADICE = path.join(__dirname, '..', '..');
        const url = 'file:///' + RADICE.replace(/\\/g, '/') + '/duelMonstersCore.html';
        const context = await browser.newContext({
            viewport: { width: LARGHEZZA, height: ALTEZZA },
            deviceScaleFactor: 2,
            isMobile: true,
            hasTouch: true,
            serviceWorkers: 'block'
        });
        const page = await context.newPage();
        const erroriPagina = [];
        page.on('pageerror', (e) => erroriPagina.push(e.message));

        try {
            // NIENTE DUEL_FAST_OPENING: qui l'oggetto d'esame è proprio la
            // sequenza d'apertura reale, coi suoi tempi.
            await page.addInitScript(() => {
                window.AUTH_GATE_SKIP = true;
                window.DUEL_RPS_SKIP = true;
                window.__fuori = { duellanti: [], campo: [] };
                const guarda = () => {
                    const larghezza = window.innerWidth;
                    // 1) I due duellanti della cinematica, solo quando
                    //    sono davvero visibili (durante l'entrata sono
                    //    trasparenti e stare fuori è voluto).
                    ['.di-duelist--player', '.di-duelist--opponent'].forEach((sel) => {
                        const el = document.querySelector(sel);
                        if (!el) return;
                        if (Number(getComputedStyle(el).opacity) < 0.9) return;
                        const r = el.getBoundingClientRect();
                        if (r.left < 0 || r.right > larghezza) {
                            window.__fuori.duellanti.push({ sel: sel, x: Math.round(r.left), destra: Math.round(r.right) });
                        }
                    });
                    // 2) Il campo, durante la zoomata della telecamera.
                    const gc = document.querySelector('.game-container');
                    if (gc && gc.classList.contains('camera-intro')) {
                        const r = gc.getBoundingClientRect();
                        window.__fuori.campo.push({ x: Math.round(r.left), destra: Math.round(r.right) });
                    }
                    requestAnimationFrame(guarda);
                };
                requestAnimationFrame(guarda);
            });

            await page.goto(url, { waitUntil: 'load' });
            // Tutta l'apertura: velo di caricamento, cinematica VS,
            // sipario, zoomata della telecamera, comparsa del campo.
            await page.waitForFunction(
                () => typeof gameState !== 'undefined' && gameState && gameState.phase === 'main1',
                null,
                { timeout: 30000 }
            ).catch(() => { /* l'asserzione qui sotto dice comunque la sua */ });
            await page.waitForTimeout(800);

            const fuori = await page.evaluate(() => window.__fuori);

            assert(fuori.duellanti.length === 0,
                `I duellanti della cinematica VS escono dallo schermo mentre sono a piena opacità, su una finestra larga ${LARGHEZZA}px `
                + `(${fuori.duellanti.length} campioni, il primo: ${JSON.stringify(fuori.duellanti[0])}). `
                + 'Lo scostamento della fase "clash" va tenuto proporzionale alla larghezza, non in pixel fissi.');

            const peggiore = fuori.campo.reduce((acc, c) => ({
                sinistra: Math.max(acc.sinistra, -c.x),
                destra: Math.max(acc.destra, c.destra - LARGHEZZA)
            }), { sinistra: 0, destra: 0 });
            assert(fuori.campo.length > 0,
                'Preparazione: la zoomata della telecamera non è mai stata osservata, il test non starebbe misurando nulla');
            assert(peggiore.sinistra <= TOLLERANZA_PX && peggiore.destra <= TOLLERANZA_PX,
                `Durante la zoomata d'ingresso il campo sborda di ${peggiore.sinistra}px a sinistra e ${peggiore.destra}px a destra `
                + `su una finestra larga ${LARGHEZZA}px (tolleranza ${TOLLERANZA_PX}px). `
                + 'Con i valori desktop (scale 1.7 / rotateX 58deg) sono 241px per lato: la riduzione nel @media mobile serve a questo.');

            assert(erroriPagina.length === 0, `Errori JS non gestiti: ${erroriPagina.join(' | ')}`);
        } finally {
            await page.close();
            await context.close();
        }
    }
};
