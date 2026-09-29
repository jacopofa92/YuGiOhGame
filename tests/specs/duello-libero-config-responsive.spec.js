const path = require('path');

module.exports = {
    standalone: true,
    name: 'Duello Libero: configurazione leggibile in desktop, verticale e landscape',
    async run(t) {
        const root = path.join(__dirname, '..', '..');
        const url = 'file:///' + path.join(root, 'duello-libero.html').replace(/\\/g, '/');
        const page = await t.browser.newPage();
        await page.addInitScript(() => { window.AUTH_GATE_SKIP = true; });
        try {
            await page.goto(url);
            await page.waitForSelector('.cube:not(.cube--bloccato)');
            await page.click('.cube:not(.cube--bloccato)');
            await page.waitForSelector('#diffModal.open');

            for (const [width, height] of [[1280, 850], [390, 844], [844, 390]]) {
                await page.setViewportSize({ width, height });
                await page.waitForTimeout(120);
                const m = await page.evaluate(() => {
                    const modal = document.querySelector('.diff-modal').getBoundingClientRect();
                    const buttons = Array.from(document.querySelectorAll('.diff-btn')).map((el) => el.getBoundingClientRect());
                    const fields = document.querySelectorAll('.ds-field').length;
                    const tracks = document.querySelectorAll('.ds-track').length;
                    return {
                        inside: modal.left >= -1 && modal.right <= innerWidth + 1 && modal.top >= -1 && modal.bottom <= innerHeight + 1,
                        buttons: buttons.length,
                        usable: buttons.every((r) => r.width >= 80 && r.height >= 40),
                        fields, tracks,
                        overflow: document.documentElement.scrollWidth <= innerWidth + 1
                    };
                });
                t.assert(m.inside && m.buttons === 3 && m.usable && m.fields > 3 && m.tracks > 2 && m.overflow,
                    `Configurazione non responsive a ${width}x${height}: ${JSON.stringify(m)}`);
            }
        } finally {
            await page.close();
        }
    }
};
