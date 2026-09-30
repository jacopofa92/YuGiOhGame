const path = require('path');

module.exports = {
    name: 'Storia: Continua ritorna alla mappa dopo vittoria e sconfitta',
    standalone: true,
    async run({ browser, assert }) {
        const root = path.join(__dirname, '..', '..');
        const base = 'file:///' + path.join(root, 'duelMonstersCore.html').replace(/\\/g, '/');
        const query = '?mode=story&campaign=anime&torneo=anime-area-prologo'
            + '&laterale=anime-1-amichevole-joey&tappa=anime-1-amichevole-joey'
            + '&character=joey&difficulty=Facile';

        async function prova(vittoria) {
            const context = await browser.newContext({ viewport: { width: 1280, height: 800 }, serviceWorkers: 'block' });
            await context.addInitScript(() => { window.AUTH_GATE_SKIP = true; });
            const page = await context.newPage();
            const errors = [];
            page.on('pageerror', (error) => errors.push(error.message));
            await page.goto(base + query + (vittoria ? '&autowin=1' : ''));
            if (!vittoria) {
                await page.waitForFunction(() => typeof endDuel === 'function' && typeof gameState !== 'undefined' && !gameState.gameOver,
                    null, { timeout: 20000 });
                await page.evaluate(() => endDuel(false));
            }
            await page.waitForSelector('#duelOutcomeOverlay.is-in', { timeout: 30000 });
            await page.locator('#duelOutcomeOverlay .do-continue').click();
            await page.waitForURL(/storia\.html\?campaign=anime&torneo=anime-area-prologo/, { timeout: 12000 });
            const result = { url: page.url(), errors: errors.slice() };
            await context.close();
            return result;
        }

        const win = await prova(true);
        const loss = await prova(false);
        assert(!/duelMonstersCore\.html/.test(win.url), `Dopo la vittoria Continua resta nel duello: ${win.url}`);
        assert(!/duelMonstersCore\.html/.test(loss.url), `Dopo la sconfitta Continua resta nel duello: ${loss.url}`);
        assert(/torneo=anime-area-prologo/.test(win.url) && /torneo=anime-area-prologo/.test(loss.url),
            `Continua deve conservare l'area corretta: vittoria=${win.url}, sconfitta=${loss.url}`);
        assert(win.errors.length === 0, `Errori JS dopo vittoria: ${win.errors.join(' | ')}`);
        assert(loss.errors.length === 0, `Errori JS dopo sconfitta: ${loss.errors.join(' | ')}`);
    }
};
