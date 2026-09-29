const path = require('path');

const ROOT = path.join(__dirname, '..', '..');
const DUEL_URL = 'file:///' + path.join(ROOT, 'duelMonstersCore.html').replace(/\\/g, '/') + '?mode=sandbox';

module.exports = {
    name: 'Sandbox: field iniziale, cambio live persistente e uscita diretta',
    standalone: true,
    async run(t) {
        const page = await t.browser.newPage({ viewport: { width: 1400, height: 900 } });
        try {
            await page.addInitScript(() => {
                window.AUTH_GATE_SKIP = true;
                window.DUEL_FAST_OPENING = true;
                if (!sessionStorage.getItem('ygoSandboxConfig')) {
                    sessionStorage.setItem('ygoSandboxConfig', JSON.stringify({
                        playerLP: 8000, botLP: 8000, turn: 1, phase: 'main1',
                        currentPlayer: 'player', hasNormalSummoned: false,
                        field: 'campoPrato.jpg', player: {}, bot: {}
                    }));
                }
            });
            await page.goto(DUEL_URL, { waitUntil: 'load' });
            await page.waitForSelector('#sandboxFieldSelect');

            const initial = await page.evaluate(() => ({
                selected: document.getElementById('sandboxFieldSelect').value,
                background: document.body.style.backgroundImage,
                exitText: document.getElementById('surrenderBtn').textContent
            }));
            t.assert(initial.selected === 'campoPrato.jpg' && initial.background.includes('campoPrato.jpg'),
                'Il field scelto nel menu sandbox deve essere applicato all’avvio');
            t.assert(initial.exitText.includes('Esci Sandbox'),
                'Il duello sandbox deve mostrare un’uscita dedicata');

            await page.selectOption('#sandboxFieldSelect', 'campoAcquatico.jpg');
            const changed = await page.evaluate(() => ({
                background: document.body.style.backgroundImage,
                saved: JSON.parse(sessionStorage.getItem('ygoSandboxConfig')).field,
                custom: window.DUEL_ARENA_CUSTOM_FIELD
            }));
            t.assert(changed.background.includes('campoAcquatico.jpg')
                && changed.saved === 'campoAcquatico.jpg'
                && changed.custom === 'campoAcquatico.jpg',
            'Cambiare field durante il duello deve aggiornare sfondo e configurazione persistita');

            await page.click('#surrenderBtn');
            t.assert(await page.locator('#surrenderModal').evaluate((el) => el.classList.contains('open')),
                'Esci Sandbox deve aprire la conferma');
            await Promise.all([
                page.waitForURL(/duello-sandbox\.html$/),
                page.click('#surrenderConfirmBtn')
            ]);
            t.assert(page.url().endsWith('/duello-sandbox.html'),
                'La conferma deve tornare direttamente al menu sandbox');
            await page.waitForSelector('#sbxField');
            t.assert(await page.inputValue('#sbxField') === 'campoAcquatico.jpg',
                'Il menu sandbox deve offrire il field e ricordare quello cambiato durante il duello');
        } finally {
            await page.close();
        }
    }
};
