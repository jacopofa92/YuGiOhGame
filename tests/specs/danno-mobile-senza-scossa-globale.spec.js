const path = require('path');

module.exports = {
    standalone: true,
    name: 'Mobile: il danno usa un impulso locale senza scuotere tutto il campo',
    async run({ browser, assert }) {
        const radice = path.join(__dirname, '..', '..');
        const context = await browser.newContext({
            viewport: { width: 393, height: 851 },
            deviceScaleFactor: 2,
            isMobile: true,
            hasTouch: true,
            serviceWorkers: 'block'
        });
        const page = await context.newPage();
        try {
            await page.setContent('<div class="game-container"><div id="lp">6100</div></div>');
            await page.addStyleTag({ path: path.join(radice, 'js', 'ui', 'effects.css') });
            await page.addScriptTag({ path: path.join(radice, 'js', 'ui', 'effects.js') });
            await page.addScriptTag({ path: path.join(radice, 'js', 'vendor', 'gsap.min.js') });
            await page.addScriptTag({ path: path.join(radice, 'js', 'ui', 'fx-gsap.js') });
            await page.evaluate(() => FX.refreshBackend());

            const durante = await page.evaluate(() => {
                const campo = document.querySelector('.game-container');
                FX.playDamageEffect(3000, { anchorEl: document.getElementById('lp') });
                return {
                    coarse: matchMedia('(pointer: coarse)').matches,
                    transformCampo: campo.style.transform,
                    classeScossa: campo.classList.contains('fx-shake'),
                    impulsoLocale: !!document.querySelector('.fx-gsap-mobile-hit'),
                    vignetta: !!document.querySelector('.fx-gsap-vignette')
                };
            });

            assert(durante.coarse, 'Il contesto del test deve esporre un puntatore touch/coarse');
            assert(!durante.transformCampo, `Il campo mobile non deve essere traslato: ${durante.transformCampo}`);
            assert(!durante.classeScossa, 'Il campo mobile non deve ricevere .fx-shake');
            assert(durante.impulsoLocale, 'Il danno mobile deve mostrare l\'impulso locale vicino ai LP');
            assert(durante.vignetta, 'La vignetta del colpo deve restare visibile anche su mobile');
        } finally {
            await page.close();
            await context.close();
        }
    }
};
