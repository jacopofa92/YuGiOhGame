// Il cassetto informazioni del duello su telefono orizzontale: si apre solo
// con un tap diretto, non con hover sintetico o trascinamento, e il testo
// lungo resta realmente scorribile.
const { openDuel, freezeNaturalGameLoop } = require('../helpers/harness');

module.exports = {
    standalone: true,
    name: 'Duello mobile landscape: dettaglio carta solo al tap e descrizione scorribile',
    async run({ browser, assert }) {
        const context = await browser.newContext({
            viewport: { width: 844, height: 390 },
            deviceScaleFactor: 2,
            isMobile: true,
            hasTouch: true,
            serviceWorkers: 'block'
        });
        const page = await context.newPage();
        const errori = [];
        page.on('pageerror', (e) => errori.push(e.message));
        try {
            await openDuel(page);
            await freezeNaturalGameLoop(page);
            await page.evaluate(() => {
                gameState.currentPlayer = 'player';
                gameState.phase = 'main1';
                gameState.hasNormalSummoned = false;
                gameState.playerHand = [{
                    ...cardDatabase.find((c) => c.id === 4),
                    uid: 'mobile-info-long',
                    effect: 'Descrizione lunga di prova. '.repeat(90)
                }];
                gameState.selectedCard = { type: null, card: null, index: -1 };
                updateUI();
                updateCardInfoPanel(null);
            });

            const carta = page.locator('#playerHand .card').first();
            await carta.dispatchEvent('mouseenter');
            let visibile = await page.$eval('#cardInfoPanel', (el) => el.classList.contains('visible'));
            assert(!visibile, 'Su un dispositivo touch il mouseenter sintetico non deve aprire il dettaglio');

            await carta.dispatchEvent('pointerdown', { pointerId: 71, pointerType: 'touch', clientX: 420, clientY: 350, isPrimary: true });
            await carta.dispatchEvent('pointerup', { pointerId: 71, pointerType: 'touch', clientX: 420, clientY: 350, isPrimary: true });
            const layout = await page.evaluate(() => {
                const panel = document.getElementById('cardInfoPanel');
                const content = document.getElementById('cardInfoContent');
                content.scrollTop = 60;
                return {
                    visible: panel.classList.contains('visible'),
                    display: getComputedStyle(panel).display,
                    touchAction: getComputedStyle(content).touchAction,
                    scrollHeight: content.scrollHeight,
                    clientHeight: content.clientHeight,
                    scrollTop: content.scrollTop,
                    panelWidth: panel.getBoundingClientRect().width,
                    viewportWidth: innerWidth,
                    panelBottom: panel.getBoundingClientRect().bottom,
                    viewportHeight: innerHeight
                };
            });
            assert(layout.visible, 'Il tap diretto sulla carta deve aprire il dettaglio');
            assert(layout.display === 'flex' && layout.touchAction === 'pan-y',
                `In landscape il pannello compatto deve consentire pan-y: ${JSON.stringify(layout)}`);
            assert(layout.panelWidth <= 150 && layout.panelWidth < layout.viewportWidth * 0.25,
                `Il dettaglio non deve invadere il terreno in orizzontale: ${JSON.stringify(layout)}`);
            assert(layout.scrollHeight > layout.clientHeight && layout.scrollTop > 0,
                `Una descrizione lunga deve essere realmente scorribile: ${JSON.stringify(layout)}`);
            assert(layout.panelBottom <= layout.viewportHeight + 1,
                `Il pannello non deve essere troncato sotto il viewport: ${JSON.stringify(layout)}`);

            await page.evaluate(() => updateCardInfoPanel(null));
            await carta.dispatchEvent('pointerdown', { pointerId: 72, pointerType: 'touch', clientX: 420, clientY: 350, isPrimary: true });
            await page.evaluate(() => document.dispatchEvent(new PointerEvent('pointermove', {
                bubbles: true, pointerId: 72, pointerType: 'touch', clientX: 30, clientY: 30, isPrimary: true
            })));
            await page.evaluate(() => document.dispatchEvent(new PointerEvent('pointerup', {
                bubbles: true, pointerId: 72, pointerType: 'touch', clientX: 30, clientY: 30, isPrimary: true
            })));
            visibile = await page.$eval('#cardInfoPanel', (el) => el.classList.contains('visible'));
            assert(!visibile, 'Trascinare una carta su touch non deve essere interpretato come tap informativo');
            assert(errori.length === 0, `Errori JavaScript durante la prova: ${errori.join(' | ')}`);
        } finally {
            await context.close();
        }
    }
};
