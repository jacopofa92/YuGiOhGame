const path = require('path');

module.exports = {
    name: 'UI: loader condiviso con carta 3D responsive',
    standalone: true,
    async run({ browser, assert }) {
        const root = path.join(__dirname, '..', '..');
        const url = 'file:///' + path.join(root, 'impostazioni.html').replace(/\\/g, '/');
        const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
        await context.addInitScript(() => {
            window.AUTH_GATE_SKIP = true;
            window.PAGE_LOADER_MANUAL_HIDE = true;
        });
        const page = await context.newPage();
        const errors = [];
        page.on('pageerror', (error) => errors.push(error.message));
        await page.goto(url, { waitUntil: 'domcontentloaded' });
        await page.waitForSelector('#pageLoader .page-loader-card');

        const desktop = await page.evaluate(() => {
            const loader = document.querySelector('#pageLoader');
            const card = loader.querySelector('.page-loader-card');
            return {
                faces: card.querySelectorAll('.page-loader-face').length,
                oldGlyph: !!loader.querySelector('.page-loader-disk-glyph'),
                animation: getComputedStyle(card).animationName,
                transformStyle: getComputedStyle(card).transformStyle,
                role: loader.getAttribute('role')
            };
        });
        assert(desktop.faces === 2, `La carta del loader deve avere due facce, trovate ${desktop.faces}`);
        assert(!desktop.oldGlyph, 'Il vecchio glifo statico non deve essere ancora presente');
        assert(desktop.animation.includes('pageLoaderCardTurn'), `Animazione 3D assente: ${desktop.animation}`);
        assert(desktop.transformStyle === 'preserve-3d', `Prospettiva 3D non attiva: ${desktop.transformStyle}`);
        assert(desktop.role === 'status', 'Il loader deve comunicare lo stato alle tecnologie assistive');

        for (const viewport of [{ width: 390, height: 844 }, { width: 844, height: 390 }]) {
            await page.setViewportSize(viewport);
            const bounds = await page.locator('#pageLoader .page-loader-stage').boundingBox();
            assert(bounds && bounds.x >= 0 && bounds.y >= 0,
                `Loader fuori schermo a ${viewport.width}x${viewport.height}`);
            assert(bounds.x + bounds.width <= viewport.width && bounds.y + bounds.height <= viewport.height,
                `Loader troncato a ${viewport.width}x${viewport.height}`);
        }
        assert(errors.length === 0, `Errori JS nel loader: ${errors.join(' | ')}`);
        await context.close();
    }
};
