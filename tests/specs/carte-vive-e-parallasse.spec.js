// Carte "vive" (CartaViva in js/ui/card-renderer.js) e parallasse del menu
// (index.html), con la loro fonte comune js/ui/inclinazione.js.
//
// Cosa si sorveglia:
//   - ogni rarità riceve i SUOI livelli di riflesso (comune solo la luce,
//     rara il bordo, super l'arcobaleno, segreta la grana) — è
//     l'informazione che il lucido porta, non solo decorazione;
//   - la carta della scheda si inclina sotto il mouse e col giroscopio;
//   - con "riduci movimento" nulla si muove ma il lucido resta;
//   - il menu sposta i suoi livelli seguendo il mouse, e con "riduci
//     movimento" resta fermo.
const path = require('path');

const RADICE = path.join(__dirname, '..', '..');
const url = (f) => 'file:///' + path.join(RADICE, f).replace(/\\/g, '/');

async function apriCartoteca(browser, opzioni) {
    const ctx = await browser.newContext(Object.assign({ viewport: { width: 1280, height: 860 }, serviceWorkers: 'block' }, opzioni || {}));
    await ctx.addInitScript(() => { window.AUTH_GATE_SKIP = true; });
    const page = await ctx.newPage();
    await page.goto(url('cartoteca.html'));
    await page.waitForFunction(() => window.CardDetail && window.CardRarity && typeof cardDatabase !== 'undefined'
        && document.querySelector('.card.carta-viva'), null, { timeout: 30000 });
    return { ctx, page };
}

/** Apre la scheda della prima carta Yu-Gi-Oh di quella rarità e torna i livelli della carta in anteprima. */
function apriSchedaPerRarita(page, rarita) {
    return page.evaluate((rarita) => {
        const carta = cardDatabase.find((c) => (!c.origin || c.origin === 'yu-gi-oh') && CardRarity.of(c.id) === rarita);
        CardDetail.open(carta);
        const el = document.querySelector('.cd-preview .card');
        return {
            rarita: el.dataset.rarita,
            modo: el.dataset.viva,
            livelli: ['cv-riflesso', 'cv-bordo', 'cv-olo', 'cv-grana'].filter((c) => el.querySelector('.' + c))
        };
    }, rarita);
}

const leggiInclinazione = (page) => page.evaluate(() => {
    const el = document.querySelector('.cd-preview .card');
    return { y: el.style.getPropertyValue('--inc-y'), ozio: el.classList.contains('cv-ozio'), ferma: el.classList.contains('cv-ferma') };
});

module.exports = {
    name: 'Carte vive: riflessi per rarità, inclinazione col mouse e col telefono; parallasse del menu',
    standalone: true,
    async run({ browser, assert }) {
        // --- Riflessi per rarità ----------------------------------------
        const { ctx, page } = await apriCartoteca(browser);
        try {
            const attesi = {
                common: ['cv-riflesso'],
                rare: ['cv-riflesso', 'cv-bordo'],
                super: ['cv-riflesso', 'cv-bordo', 'cv-olo'],
                secret: ['cv-riflesso', 'cv-bordo', 'cv-olo', 'cv-grana']
            };
            for (const [rarita, livelli] of Object.entries(attesi)) {
                const r = await apriSchedaPerRarita(page, rarita);
                assert(r.rarita === rarita, `la carta in scheda porta la sua rarità (${rarita}): ${r.rarita}`);
                assert(r.modo === 'grande', 'la carta della scheda è nel modo "grande"');
                assert(JSON.stringify(r.livelli) === JSON.stringify(livelli),
                    `livelli di riflesso per ${rarita}: attesi ${livelli.join(',')}, trovati ${r.livelli.join(',')}`);
            }
            const griglia = await page.evaluate(() => {
                const tile = document.querySelector('.cards-grid .card, #cardGrid .card, .card.carta-viva:not(.cd-preview .card)');
                return tile ? tile.dataset.viva : null;
            });
            assert(griglia === 'griglia', 'le carte della Cartoteca sono vive in modo "griglia": ' + griglia);

            // --- Mouse: la scheda si inclina e torna a ondeggiare --------
            await apriSchedaPerRarita(page, 'ultra');
            await page.waitForTimeout(300);
            const box = await (await page.$('.cd-preview .card')).boundingBox();
            await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
            await page.mouse.move(box.x + box.width * 0.95, box.y + box.height * 0.5, { steps: 5 });
            await page.waitForTimeout(100);
            const col = await leggiInclinazione(page);
            assert(parseFloat(col.y) > 5, 'col mouse a destra la carta ruota verso destra: ' + col.y);
            assert(!col.ozio, 'mentre il mouse la guida, la carta non ondeggia da sola');
            await page.mouse.move(5, 5);
            await page.waitForTimeout(100);
            const fuori = await leggiInclinazione(page);
            assert(fuori.ozio && !fuori.y, 'uscito il mouse torna a riposo e ondeggia: ' + JSON.stringify(fuori));

            // --- Giroscopio: un telefono inclinato a destra --------------
            await page.evaluate(async () => {
                const manda = (beta, gamma) => window.dispatchEvent(new DeviceOrientationEvent('deviceorientation', { alpha: 0, beta: beta, gamma: gamma }));
                manda(40, 0);                     // posizione di riposo: come lo si tiene
                await new Promise((r) => requestAnimationFrame(() => r()));
                manda(40, 15);                    // inclinato a destra
                await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(() => r())));
            });
            const giro = await leggiInclinazione(page);
            assert(parseFloat(giro.y) > 5, 'inclinando il telefono a destra la carta lo segue: ' + giro.y);
            assert(!giro.ozio, 'col giroscopio attivo la carta non ondeggia da sola');
        } finally {
            await ctx.close();
        }

        // --- Movimento ridotto: fermo, ma il lucido resta ---------------
        const ridotto = await apriCartoteca(browser, { reducedMotion: 'reduce' });
        try {
            const r = await apriSchedaPerRarita(ridotto.page, 'super');
            assert(r.livelli.includes('cv-olo'), 'con movimento ridotto il riflesso della rarità resta');
            const box = await (await ridotto.page.$('.cd-preview .card')).boundingBox();
            await ridotto.page.mouse.move(box.x + box.width * 0.95, box.y + box.height * 0.5, { steps: 5 });
            const stato = await leggiInclinazione(ridotto.page);
            assert(stato.ferma && !stato.y && !stato.ozio, 'con movimento ridotto la carta non si inclina né ondeggia: ' + JSON.stringify(stato));
        } finally {
            await ridotto.ctx.close();
        }

        // --- Parallasse del menu ------------------------------------------
        for (const caso of [{ nome: 'normale', opz: {} }, { nome: 'ridotto', opz: { reducedMotion: 'reduce' } }]) {
            const c = await browser.newContext(Object.assign({ viewport: { width: 1280, height: 800 }, serviceWorkers: 'block' }, caso.opz));
            try {
                const menu = await c.newPage();
                await menu.goto(url('index.html'));
                await menu.waitForFunction(() => !!window.Inclinazione);
                await menu.mouse.move(640, 400);
                await menu.mouse.move(1270, 790, { steps: 8 });
                await menu.waitForTimeout(1200);
                const par = await menu.evaluate(() => parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--par-x')) || 0);
                if (caso.nome === 'normale') assert(par > 0.5, 'il menu segue il mouse (parallasse): --par-x = ' + par);
                else assert(par === 0, 'con movimento ridotto il menu resta fermo: --par-x = ' + par);
            } finally {
                await c.close();
            }
        }
    }
};
