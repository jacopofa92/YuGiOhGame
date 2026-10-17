const path = require('path');

module.exports = {
    standalone: true,
    name: 'Mobile: la morra cede il compositore al campo senza layer concorrenti',
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
        const errori = [];
        page.on('pageerror', (e) => errori.push(e.message));
        await page.addInitScript(() => {
            window.AUTH_GATE_SKIP = true;
            // Bot = Sasso: scegliendo Carta il test arriva sempre alla
            // scelta di chi comincia, senza dipendere dal caso.
            Math.random = () => 0;
            window.__passaggioMorra = { rimossa: null, camera: null, doppiaAnimazione: false };
            const osserva = () => {
                const body = document.body;
                if (!body) { requestAnimationFrame(osserva); return; }
                new MutationObserver(() => {
                    const rps = document.getElementById('duelRpsOverlay');
                    const campo = document.querySelector('.game-container');
                    if (!rps && window.__passaggioMorra.rimossa === null) window.__passaggioMorra.rimossa = performance.now();
                    if (campo && campo.classList.contains('camera-intro') && window.__passaggioMorra.camera === null) {
                        window.__passaggioMorra.camera = performance.now();
                    }
                    if (campo && campo.classList.contains('camera-intro') && campo.classList.contains('duel-arena-enter')) {
                        window.__passaggioMorra.doppiaAnimazione = true;
                    }
                }).observe(body, { childList: true, subtree: true, attributes: true, attributeFilter: ['class'] });
            };
            osserva();
        });

        try {
            await page.goto('file:///' + path.join(radice, 'duelMonstersCore.html').replace(/\\/g, '/'), { waitUntil: 'load' });
            await page.waitForSelector('#duelRpsOverlay.is-in .rps-choice[data-choice="carta"]', { timeout: 20000 });
            const blur = await page.$eval('#duelRpsOverlay', (el) => {
                const s = getComputedStyle(el);
                return s.backdropFilter || s.webkitBackdropFilter || 'none';
            });
            assert(blur === 'none', `Su touch la morra non deve creare un layer backdrop-filter fullscreen: ${blur}`);

            await page.click('#duelRpsOverlay .rps-choice[data-choice="carta"]');
            await page.waitForSelector('#duelRpsOverlay [data-phase="result"].is-on', { timeout: 6000 });
            await page.click('#duelRpsOverlay [data-role="actPrimary"]');
            await page.waitForFunction(() => window.__passaggioMorra.camera !== null, null, { timeout: 8000 });

            const durante = await page.evaluate(() => ({
                ...window.__passaggioMorra,
                morraPresente: !!document.getElementById('duelRpsOverlay'),
                ambienteSospeso: !!(window.FieldAmbience && FieldAmbience.sospeso()),
                siparioTransform: getComputedStyle(document.getElementById('duelIntroOverlay')).transform
            }));
            assert(!durante.morraPresente, 'La camera non deve partire finche il layer della morra e ancora nel DOM');
            assert(durante.camera - durante.rimossa >= 8,
                `Servono almeno due frame di consegna fra morra e camera (rilevati ${(durante.camera - durante.rimossa).toFixed(1)}ms)`);
            assert(!durante.doppiaAnimazione, 'camera-intro e duel-arena-enter non devono mai convivere');
            assert(durante.ambienteSospeso, 'Gli effetti ambientali devono restare sospesi durante la camera iniziale');
            assert(durante.siparioTransform === 'none', `Su touch il sipario deve dissolversi senza scalare: ${durante.siparioTransform}`);

            await page.waitForFunction(() => !document.querySelector('.game-container.camera-intro'), null, { timeout: 4000 });
            const dopo = await page.evaluate(() => ({
                ambienteSospeso: !!(window.FieldAmbience && FieldAmbience.sospeso()),
                willChange: getComputedStyle(document.querySelector('.game-container')).willChange
            }));
            assert(!dopo.ambienteSospeso, 'Gli effetti ambientali devono riprendere dopo la camera iniziale');
            assert(dopo.willChange !== 'transform', `Su mobile il layer permanente del campo deve essere rilasciato dopo l'ingresso: ${dopo.willChange}`);
            assert(errori.length === 0, `Errori JS durante l'apertura: ${errori.join(' | ')}`);
        } finally {
            await page.close();
            await context.close();
        }
    }
};
