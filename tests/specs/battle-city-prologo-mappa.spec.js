const path = require('path');

module.exports = {
    standalone: true,
    name: 'Battle City: prologo prima della mappa urbana a tutto schermo',
    async run(t) {
        const radice = path.join(__dirname, '..', '..');
        const url = 'file:///' + path.join(radice, 'torneo-battle-city.html').replace(/\\/g, '/');
        const page = await t.browser.newPage({ viewport: { width: 1280, height: 800 } });
        await page.addInitScript(() => { window.AUTH_GATE_SKIP = true; });
        try {
            await page.goto(url);
            await page.waitForFunction(() => !!(window.SaveManager && document.getElementById('startBtn')));
            await page.evaluate(() => {
                if (!SaveManager.hasSave()) SaveManager.createNew('Tester');
                SaveManager.setTournamentState('battleCity', null);
            });
            await page.reload();
            await page.waitForSelector('#startBtn');
            await page.click('#startBtn');
            await page.waitForSelector('.sc-scena');

            const prologo = await page.evaluate(() => ({
                visto: (SaveManager.getTournamentState('battleCity').intermezziVisti || []).includes('prologue'),
                sfondo: document.querySelector('.sc-sfondo').style.backgroundImage,
                mappaPrematura: !!document.getElementById('cityGrid')
            }));
            t.assert(prologo.visto, 'Il prologo deve essere registrato nella nuova scalata');
            t.assert(!prologo.mappaPrematura, 'La mappa non deve comparire sotto la scena prima della sua conclusione');

            await page.locator('.sc-salta').click();
            await page.waitForSelector('#cityGrid');
            const layout = await page.evaluate(() => {
                const main = document.querySelector('.main');
                const grid = document.getElementById('cityGrid');
                return {
                    mainWidth: main.getBoundingClientRect().width,
                    gridWidth: grid.getBoundingClientRect().width,
                    viewportWidth: innerWidth,
                    background: document.body.style.backgroundImage,
                    gridBackground: getComputedStyle(grid).backgroundColor,
                    gridBorder: getComputedStyle(grid).borderTopWidth,
                    modalitaCitta: document.body.classList.contains('city-map-active')
                };
            });
            t.assert(layout.mainWidth >= layout.viewportWidth - 2,
                `La mappa deve usare tutta la larghezza dello schermo (${layout.mainWidth}/${layout.viewportWidth})`);
            t.assert(layout.gridWidth > 540,
                `La griglia desktop non deve restare bloccata al vecchio limite di 640px contenitore (griglia ${layout.gridWidth}px)`);
            t.assert(/citta\.jpg/i.test(layout.background),
                `Lo sfondo della fase urbana deve essere citta.jpg: ${layout.background}`);
            t.assert(layout.gridBackground === 'rgba(0, 0, 0, 0)' && layout.gridBorder === '0px' && layout.modalitaCitta,
                `La città deve fare da base, senza pannello opaco della griglia: ${JSON.stringify(layout)}`);
        } finally {
            await page.close();
        }
    }
};
