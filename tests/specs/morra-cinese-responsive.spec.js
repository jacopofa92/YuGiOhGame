const path = require('path');

module.exports = {
    standalone: true,
    name: 'Morra cinese: arena responsive in verticale e landscape',
    async run(t) {
        const root = path.join(__dirname, '..', '..');
        const url = 'file:///' + path.join(root, 'duelMonstersCore.html').replace(/\\/g, '/') + '?mode=sandbox';
        const page = await t.browser.newPage();
        await page.addInitScript(() => { window.AUTH_GATE_SKIP = true; });
        try {
            await page.goto(url);
            await page.waitForFunction(() => !!window.DuelRPS);
            await page.evaluate(() => { DuelRPS.play({ name: 'Seto Kaiba' }); });
            await page.waitForSelector('.rps-overlay.is-in');
            for (const [width, height] of [[1280, 800], [390, 844], [844, 390]]) {
                await page.setViewportSize({ width, height });
                await page.waitForTimeout(100);
                const m = await page.evaluate(() => {
                const panel = document.querySelector('.rps-panel').getBoundingClientRect();
                const choices = Array.from(document.querySelectorAll('.rps-choice')).map((el) => el.getBoundingClientRect());
                return {
                    inside: panel.left >= -1 && panel.right <= innerWidth + 1 && panel.top >= -1 && panel.bottom <= innerHeight + 1,
                    choices: choices.length,
                    usable: choices.every((r) => r.width >= 70 && r.height >= 74),
                    overflow: document.documentElement.scrollWidth <= innerWidth + 1
                };
                });
                t.assert(m.inside && m.choices === 3 && m.usable && m.overflow,
                    `Morra non responsive a ${width}x${height}: ${JSON.stringify(m)}`);
            }
        } finally {
            await page.close();
        }
    }
};
