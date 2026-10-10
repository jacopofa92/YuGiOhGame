// La vista SPA Duello Libero carica modale e opzioni in modo lazy. La barra
// superiore, che non dipende da quei file, deve comparire nello stesso turno
// del click: ritardarla fino alla rete produceva un evidente vuoto su mobile.
const path = require('path');

module.exports = {
    name: 'Duello Libero SPA: topbar immediata mentre i moduli lazy caricano',
    standalone: true,
    async run({ browser, assert }) {
        const radice = path.join(__dirname, '..', '..');
        const context = await browser.newContext({ serviceWorkers: 'block' });
        await context.addInitScript(() => { window.AUTH_GATE_SKIP = true; });
        const page = await context.newPage();
        try {
            await page.goto('file:///' + path.join(radice, 'index.html').replace(/\\/g, '/'));
            await page.waitForFunction(() => typeof window.showView === 'function' && !!window.SaveManager);
            const esito = await page.evaluate(() => {
                if (!SaveManager.hasSave()) SaveManager.createNew('Topbar test');
                const originale = window.ensureViewScripts;
                let risolvi;
                window.ensureViewScripts = () => new Promise((resolve) => { risolvi = resolve; });
                showView('duello-libero');
                const immediata = !!document.querySelector('#view-duello-libero > .topbar');
                const titolo = (document.querySelector('#view-duello-libero .topbar-title') || {}).textContent || '';
                risolvi();
                window.ensureViewScripts = originale;
                return { immediata, titolo };
            });
            assert(esito.immediata, 'La topbar deve esistere prima che i moduli lazy abbiano finito');
            assert(esito.titolo === 'Duello Libero', `Titolo inatteso: "${esito.titolo}"`);
        } finally {
            await context.close();
        }
    }
};
