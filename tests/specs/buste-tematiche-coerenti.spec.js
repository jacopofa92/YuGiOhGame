const path = require('path');

module.exports = {
    name: 'Negozio: buste tematiche coerenti con creature base garantite',
    standalone: true,
    async run({ browser, assert }) {
        const root = path.join(__dirname, '..', '..').replace(/\\/g, '/');
        const context = await browser.newContext({ serviceWorkers: 'block' });
        await context.addInitScript(() => { localStorage.clear(); window.AUTH_GATE_SKIP = true; });
        const page = await context.newPage();
        try {
            await page.goto('file:///' + root + '/negozio.html');
            await page.waitForFunction(() => !!window.ShopCatalog && typeof cardDatabase !== 'undefined');
            const risultati = await page.evaluate(() => ShopCatalog.TEMI.flatMap((tema) => [4, 2].map((deboli) => {
                const busta = {
                    id: (deboli === 2 ? 'premium-' : 'tema-') + tema.id,
                    carte: 10, temaId: tema.id, deboliGarantiti: deboli,
                    composizione: deboli === 2
                        ? { common: 3, rare: 3, super: 2, ultra: 1, legendary: 1 }
                        : { common: 5, rare: 3, super: 1, ultra: 1 }
                };
                const ids = ShopCatalog.apriBusta(busta);
                const carte = ids.map((id) => cardDatabase.find((c) => c.id === id));
                const deboliTrovati = carte.filter((c) => c && c.type === 'monster'
                    && (c.level || 0) <= 4 && (c.attack || 0) <= 1400 && (c.defense || 0) <= 1600).length;
                return {
                    tema: tema.id, richieste: deboli, count: ids.length,
                    tutteTema: carte.every((c) => c && tema.test(c)),
                    deboliTrovati
                };
            })));
            risultati.forEach((r) => {
                assert(r.count === 10, `${r.tema}: la busta contiene ${r.count} carte invece di 10`);
                assert(r.tutteTema, `${r.tema}: è uscita almeno una carta fuori tema`);
                assert(r.deboliTrovati >= r.richieste,
                    `${r.tema}: attese ${r.richieste} creature base, trovate ${r.deboliTrovati}`);
            });
        } finally {
            await context.close();
        }
    }
};
