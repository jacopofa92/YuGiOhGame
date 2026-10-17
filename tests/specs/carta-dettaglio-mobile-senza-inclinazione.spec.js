// Sul telefono (puntatore a tocco) la carta in dettaglio NON si inclina e non
// ondeggia — richiesta dell'utente — ma il giroscopio continua a muovere la
// LUCE (riflesso, bordo lucido, arcobaleno, grana): le variabili --luce-x,
// --luce-y e --forza cambiano ancora, solo il transform resta fermo.
// Sul computer (mouse) l'inclinazione resta com'era: lo sorveglia
// carte-vive-e-parallasse.
const path = require('path');

const RADICE = path.join(__dirname, '..', '..');
const url = (f) => 'file:///' + path.join(RADICE, f).replace(/\\/g, '/');

module.exports = {
    name: 'Carta in dettaglio su telefono: dritta, ma la luce segue il giroscopio',
    standalone: true,
    async run({ browser, assert }) {
        const ctx = await browser.newContext({ viewport: { width: 393, height: 852 }, isMobile: true, hasTouch: true, serviceWorkers: 'block' });
        await ctx.addInitScript(() => { window.AUTH_GATE_SKIP = true; });
        const page = await ctx.newPage();
        try {
            await page.goto(url('cartoteca.html'));
            await page.waitForFunction(() => window.CardDetail && window.CardRarity && typeof cardDatabase !== 'undefined'
                && document.querySelector('.card.carta-viva'), null, { timeout: 30000 });
            await page.evaluate(() => {
                const carta = cardDatabase.find((c) => (!c.origin || c.origin === 'yu-gi-oh') && CardRarity.of(c.id) === 'ultra');
                CardDetail.open(carta);
            });
            await page.waitForTimeout(400);

            const stato = () => page.evaluate(() => {
                const el = document.querySelector('.cd-preview .card');
                const cs = getComputedStyle(el);
                return {
                    transform: cs.transform, animazione: cs.animationName,
                    luceX: el.style.getPropertyValue('--luce-x'), forza: el.style.getPropertyValue('--forza'),
                    incY: el.style.getPropertyValue('--inc-y'), riflesso: !!el.querySelector('.cv-riflesso')
                };
            });

            const riposo = await stato();
            assert(riposo.riflesso, 'la carta in dettaglio ha comunque il suo riflesso');
            assert(riposo.transform === 'none', `a riposo la carta resta dritta (nessun ondeggiamento): ${riposo.transform}`);
            assert(riposo.animazione === 'none', `nessuna animazione di ondeggiamento: ${riposo.animazione}`);

            // Il telefono si inclina a destra: la luce si sposta, la carta no.
            await page.evaluate(async () => {
                const manda = (beta, gamma) => window.dispatchEvent(new DeviceOrientationEvent('deviceorientation', { alpha: 0, beta, gamma }));
                manda(40, 0);
                await new Promise((r) => requestAnimationFrame(() => r()));
                manda(40, 18);
                await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(() => r())));
            });
            const inclinato = await stato();
            assert(parseFloat(inclinato.luceX) > 55, `il giroscopio sposta la luce a destra: --luce-x = ${inclinato.luceX}`);
            assert(parseFloat(inclinato.forza) > 0.2, `il giroscopio accende la luce: --forza = ${inclinato.forza}`);
            assert(inclinato.transform === 'none', `col telefono inclinato la carta resta dritta: ${inclinato.transform}`);
        } finally {
            await ctx.close();
        }
    }
};
