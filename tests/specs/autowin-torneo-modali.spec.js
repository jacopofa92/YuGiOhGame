// L'autowin di un torneo deve lasciare la schermata finale cliccabile.
// =====================================================================
const path = require('path');

module.exports = {
    name: 'Autowin torneo: nessun modale intercetta il pulsante Continua',
    standalone: true,
    async run({ browser, assert }) {
        const root = path.join(__dirname, '..', '..');
        const base = 'file:///' + path.join(root, 'duelMonstersCore.html').replace(/\\/g, '/');
        const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, serviceWorkers: 'block' });
        await context.addInitScript(() => { window.AUTH_GATE_SKIP = true; });
        const page = await context.newPage();
        const errors = [];
        page.on('pageerror', (error) => errors.push(error.message));

        try {
            await page.goto(base + '?mode=tournament&tournament=battleCity&character=weevil&difficulty=Medio&autowin=1');
            // Riproduce la corsa vista nel browser: dopo endDuel ma prima
            // dell'esito, un callback tardivo tenta di riaprire Abbandona.
            await page.evaluate(() => {
                const poll = setInterval(() => {
                    if (typeof gameState === 'undefined' || !gameState.gameOver) return;
                    clearInterval(poll);
                    setTimeout(() => {
                        const modal = document.getElementById('surrenderModal');
                        if (modal) modal.classList.add('open');
                    }, 300);
                }, 20);
            });
            await page.waitForSelector('#duelOutcomeOverlay.is-in', { timeout: 30000 });

            const state = await page.evaluate(() => {
                const button = document.querySelector('#duelOutcomeOverlay .do-continue');
                const rect = button.getBoundingClientRect();
                const hit = document.elementFromPoint(rect.left + rect.width / 2, rect.top + rect.height / 2);
                return {
                    openModals: Array.from(document.querySelectorAll('.modal-backdrop.open')).map((el) => el.id),
                    hitClass: hit && hit.className,
                    hitIsButton: hit === button || button.contains(hit)
                };
            });

            assert(state.openModals.length === 0,
                `A fine autowin sono rimasti aperti questi modali: ${state.openModals.join(', ')}`);
            assert(state.hitIsButton,
                `Il centro di Continua è intercettato da "${state.hitClass}"`);
            await page.locator('#duelOutcomeOverlay .do-continue').click();
            await page.waitForURL(/torneo-battle-city\.html/, { timeout: 10000 });
            assert(!/duelMonstersCore\.html/.test(page.url()),
                `Continua deve uscire davvero dal duello autowin: ${page.url()}`);
            assert(errors.length === 0, 'Errori JS in pagina: ' + errors.join(' | '));
        } finally {
            await context.close();
        }
    }
};
