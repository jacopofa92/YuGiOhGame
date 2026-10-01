const path = require('path');

module.exports = {
    name: 'Menu: font locale del logo e loader nelle viste Negozio/Cartoteca',
    standalone: true,
    async run({ browser, assert }) {
        const root = path.join(__dirname, '..', '..');
        const url = 'file:///' + path.join(root, 'index.html').replace(/\\/g, '/');
        const context = await browser.newContext({ viewport: { width: 1280, height: 800 }, serviceWorkers: 'block' });
        await context.addInitScript(() => {
            window.AUTH_GATE_SKIP = true;
            try { sessionStorage.setItem('ygoSplashShown', '1'); } catch (e) { /* file:// può limitarlo */ }
        });
        const page = await context.newPage();
        const errors = [];
        page.on('pageerror', (error) => errors.push(error.message));
        await page.goto(url, { waitUntil: 'domcontentloaded' });
        await page.waitForFunction(() => typeof showView === 'function' && window.PageLoader && customElements.get('game-logo'));

        const logo = await page.evaluate(async () => {
            await document.fonts.load('900 32px "Duel Arena Inscription"');
            const title = document.querySelector('game-logo .gl-riga2');
            return {
                family: getComputedStyle(title).fontFamily,
                loaded: document.fonts.check('900 32px "Duel Arena Inscription"')
            };
        });
        assert(logo.family.includes('Duel Arena Inscription'), `Font del logo non applicato: ${logo.family}`);
        assert(logo.loaded, 'Il font locale del titolo non è stato caricato');

        for (const name of ['negozio', 'cartoteca']) {
            await page.evaluate((view) => {
                PageLoader.hide();
                showView(view);
            }, name);
            const visible = await page.locator('#pageLoader').evaluate((el) => !el.classList.contains('page-loader-hidden'));
            assert(visible, `Il loader generale non parte entrando in ${name}`);
            await page.waitForFunction(() => document.querySelector('#pageLoader').classList.contains('page-loader-hidden'),
                null, { timeout: 30000 });
            const viewReady = await page.locator('#view-' + name).evaluate((el) => getComputedStyle(el).display !== 'none');
            assert(viewReady, `La vista ${name} non resta visibile dopo il caricamento`);
        }

        assert(errors.length === 0, `Errori JS nel menu: ${errors.join(' | ')}`);
        await context.close();
    }
};
