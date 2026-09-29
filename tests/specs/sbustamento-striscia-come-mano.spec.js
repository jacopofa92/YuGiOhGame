const path = require('path');

module.exports = {
    name: 'Sbustamento responsive: carte grandi desktop e carosello mobile senza sovrapposizioni',
    standalone: true,
    async run({ browser, assert }) {
        const root = path.join(__dirname, '..', '..');
        const url = 'file:///' + path.join(root, 'negozio.html').replace(/\\/g, '/');
        const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
        await context.addInitScript(() => { window.AUTH_GATE_SKIP = true; });
        const page = await context.newPage();
        try {
            await page.goto(url);
            await page.waitForFunction(() => !!(window.PackOpening && window.CardDetail && typeof cardDatabase !== 'undefined'));
            await page.evaluate(() => PackOpening.apri({
                nome: 'Busta Base', nomeBreve: 'BASE', colore: '#9c671c', icona: '👁', carte: 10
            }, [1, 2, 3, 4, 5, 6, 7, 8, 9, 10], []));
            await page.locator('.po-bustina').dispatchEvent('click');
            await page.waitForSelector('.po-striscia');
            await page.waitForTimeout(450);
            await page.locator('.po-backdrop').dispatchEvent('click');
            await page.waitForFunction(() => document.querySelectorAll('.po-slot').length === 10);
            await page.waitForTimeout(420);

            const layout = await page.evaluate(() => {
                const slots = Array.from(document.querySelectorAll('.po-slot'));
                return {
                    width: slots[0].getBoundingClientRect().width,
                    overlap: parseFloat(slots[1].style.marginLeft || '0') < 0,
                    oneRow: getComputedStyle(document.querySelector('.po-striscia')).flexWrap === 'nowrap',
                    scrollable: document.querySelector('.po-striscia').classList.contains('is-scrollable'),
                    summaryInHead: !!document.querySelector('.po-testa > .po-riepilogo')
                };
            });
            assert(layout.width >= 81 && !layout.overlap && layout.oneRow && layout.scrollable && layout.summaryInHead,
                `Il carosello mobile non conserva carte intere e leggibili: ${JSON.stringify(layout)}`);

            await page.setViewportSize({ width: 1200, height: 900 });
            await page.waitForTimeout(180);
            const desktop = await page.evaluate(() => {
                const strip = document.querySelector('.po-striscia');
                const slots = Array.from(strip.querySelectorAll('.po-slot'));
                return {
                    width: slots[0].getBoundingClientRect().width,
                    overlap: slots.some((s) => parseFloat(s.style.marginLeft || '0') < 0),
                    centered: getComputedStyle(strip).justifyContent === 'center',
                    stripWidth: strip.getBoundingClientRect().width
                };
            });
            assert(desktop.width >= 87 && !desktop.overlap && desktop.centered && desktop.stripWidth > 1000,
                `Su desktop le carte devono essere grandi, separate e centrate: ${JSON.stringify(desktop)}`);

            await page.locator('.po-slot').first().dispatchEvent('click');
            await page.waitForSelector('.cd-backdrop.open');
            const layers = await page.evaluate(() => ({
                detailZ: Number(getComputedStyle(document.querySelector('.cd-backdrop')).zIndex),
                openingZ: Number(getComputedStyle(document.querySelector('.po-backdrop')).zIndex),
                summaryOpacity: Number(getComputedStyle(document.querySelector('.po-riepilogo')).opacity),
                selected: document.querySelectorAll('.po-slot.is-selected').length
            }));
            assert(layers.detailZ > layers.openingZ && layers.summaryOpacity === 0 && layers.selected === 1,
                `Il dettaglio non prevale correttamente sul riepilogo: ${JSON.stringify(layers)}`);
        } finally {
            await context.close();
        }
    }
};
