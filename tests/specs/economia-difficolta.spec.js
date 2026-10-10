// Il Negozio carica insieme Rewards, ShopCatalog e SaveManager: e' il punto
// adatto per sorvegliare l'intera curva senza duplicare le tabelle nel test.
const path = require('path');

module.exports = {
    name: 'Economia: farming graduato per difficolta e prezzi del Negozio',
    standalone: true,
    async run({ browser, assert }) {
        const radice = path.join(__dirname, '..', '..');
        const url = 'file:///' + path.join(radice, 'negozio.html').replace(/\\/g, '/');
        const context = await browser.newContext({ serviceWorkers: 'block' });
        await context.addInitScript(() => { window.AUTH_GATE_SKIP = true; });
        const page = await context.newPage();
        try {
            await page.goto(url);
            await page.waitForFunction(() => !!(window.Rewards && window.ShopCatalog && window.SaveManager));
            const esito = await page.evaluate(() => {
                if (!SaveManager.hasSave()) SaveManager.createNew('Economia test');
                const originale = Math.random;
                const valuta = () => Object.assign({}, SaveManager.getCurrency());
                const delta = (a, b, k) => (b[k] || 0) - (a[k] || 0);
                function torneo(id, difficulty, firstTime) {
                    const prima = valuta();
                    const voci = Rewards.forTournament(id, firstTime, difficulty);
                    const dopo = valuta();
                    return {
                        credits: delta(prima, dopo, 'credits'),
                        starChips: delta(prima, dopo, 'starChips'),
                        locatorCards: delta(prima, dopo, 'locatorCards'),
                        millenniumCards: delta(prima, dopo, 'millenniumCards'),
                        regole: voci.filter((v) => !v.nota).map((v) => v.rule)
                    };
                }
                function stella(difficulty, tiro) {
                    Math.random = () => tiro;
                    return Rewards.forDuel({ won: true, difficulty: difficulty, inTournament: false })
                        .some((v) => v.currency === 'starChips');
                }
                const out = {
                    regno: {
                        facile: torneo('duelistKingdom', 'Facile', false),
                        medio: torneo('duelistKingdom', 'Medio', false),
                        difficile: torneo('duelistKingdom', 'Difficile', false),
                        primaFacile: torneo('duelistKingdom', 'Facile', true)
                    },
                    battleCity: ['Facile', 'Medio', 'Difficile'].map((d) => torneo('battleCity', d, false)),
                    kaiba: ['Facile', 'Medio', 'Difficile'].map((d) => torneo('kaibaTournament', d, false)),
                    stelle: [stella('Facile', 0.03), stella('Medio', 0.03), stella('Medio', 0.07), stella('Difficile', 0.07)],
                    starter: ShopCatalog.costoMazzo('starter'),
                    leggendaria: ShopCatalog.carteDelGiorno().find((v) => v.rarity === 'legendary')
                };
                Math.random = originale;
                return out;
            });

            assert(esito.regno.facile.credits === 650 && esito.regno.medio.credits === 825 && esito.regno.difficile.credits === 1000,
                `Crediti torneo non graduati: ${JSON.stringify(esito.regno)}`);
            assert(esito.regno.facile.starChips === 14 && esito.regno.medio.starChips === 19 && esito.regno.difficile.starChips === 24,
                `Stelle del Regno non graduate: ${JSON.stringify(esito.regno)}`);
            assert(esito.regno.primaFacile.credits === 1150 && esito.regno.primaFacile.starChips === 18,
                `La prima vittoria a Facile deve aggiungere +500/+4: ${JSON.stringify(esito.regno.primaFacile)}`);
            assert(esito.regno.primaFacile.regole.some((r) => /Prima vittoria assoluta/.test(r)),
                'Il riepilogo deve spiegare il bonus fisso');
            assert(esito.battleCity.map((x) => x.locatorCards).join(',') === '1,2,3',
                `Carte Locazione non graduate: ${JSON.stringify(esito.battleCity)}`);
            assert(esito.kaiba.map((x) => x.millenniumCards).join(',') === '1,1,2',
                `Carte del Millennio non graduate: ${JSON.stringify(esito.kaiba)}`);
            assert(esito.stelle.join(',') === 'false,true,false,true',
                `Soglie Stella 2%/5%/9% non rispettate: ${JSON.stringify(esito.stelle)}`);
            assert(esito.starter.starChips === 18 && esito.starter.giaPosseduti === 0,
                `Lo Starter gratuito non deve rincarare il primo acquisto: ${JSON.stringify(esito.starter)}`);
            assert(esito.leggendaria && esito.leggendaria.costo.millenniumCards === 2,
                `La Leggendaria deve costare 2 Carte del Millennio: ${JSON.stringify(esito.leggendaria)}`);
        } finally {
            await context.close();
        }
    }
};
