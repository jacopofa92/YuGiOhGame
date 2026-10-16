// Le Fusioni che si Evocano dall'Extra Deck SENZA Polimerizzazione
// (banishFusionMaterials, es. Cannone Drago XY/XYZ) devono farsi vedere:
// la zona Extra Deck pulsa in viola (.fusion-ready) quando almeno una è
// evocabile ora, e cliccandola si apre TUTTO l'Extra Deck con le evocabili
// in viola e selezionabili, le altre spente e non selezionabili.
// Vedi fusioniEvocabiliOra/createSlotElement (game-flow.js) e l'opzione
// `evocabili` di openCardListPicker (actions.js).
const { openDuel, freezeNaturalGameLoop } = require('../helpers/harness');

module.exports = {
    name: 'Extra Deck: le Fusioni evocabili senza Polimerizzazione pulsano in viola',
    standalone: true,
    async run({ browser, assert }) {
        const context = await browser.newContext({ serviceWorkers: 'block' });
        const page = await context.newPage();
        try {
            await openDuel(page);
            await freezeNaturalGameLoop(page);
            // freezeNaturalGameLoop non ferma la sequenza d'inizio turno
            // già partita al caricamento (Draw -> Standby -> Main, vedi
            // tests/README.md): se la si prepara troppo presto, la fase
            // torna a 'draw' sotto i piedi del test e la zona smette di
            // pulsare per un motivo legittimo. Si aspetta che arrivi in Main.
            await page.waitForFunction(() => gameState.currentPlayer === 'player' && gameState.phase === 'main1', null, { timeout: 15000 });
            await page.waitForTimeout(600);

            const prima = await page.evaluate(() => {
                const make = (id, uid) => ({ ...cardDatabase.find((c) => c.id === id), uid });
                const slot = (card) => ({ card, position: 'attack', isFaceDown: false, hasAttacked: false, canChangePosition: false });
                gameState.currentPlayer = 'player';
                gameState.phase = 'main1';
                gameState.playerBanished = [];
                // X + Y in campo: XY (511) è evocabile, XYZ (512) no (manca Z).
                gameState.playerMonsterField = [slot(make(510, 'x')), slot(make(513, 'y')), null, null, null];
                gameState.playerExtraDeck = [make(512, 'xyz'), make(511, 'xy')];
                updateUI();
                const zona = () => document.querySelector('.field-slot[data-zone="fusion"][data-owner="player"]');
                const pulsaInMain = !!zona() && zona().classList.contains('fusion-ready');

                // Nel turno dell'avversario non si può Evocare: niente pulsazione.
                gameState.currentPlayer = 'bot';
                updateUI();
                const pulsaTurnoAltrui = zona().classList.contains('fusion-ready');
                gameState.currentPlayer = 'player';
                updateUI();
                return { pulsaInMain, pulsaTurnoAltrui };
            });
            assert(prima.pulsaInMain, 'Con X + Y in campo la zona Extra Deck deve pulsare in viola');
            assert(!prima.pulsaTurnoAltrui, 'Nel turno avversario la zona Extra Deck non deve pulsare');

            const zona = page.locator('.field-slot[data-zone="fusion"][data-owner="player"]');
            await zona.click();
            await page.waitForSelector('#cardListPickerModal.open .card-list-item');
            const elenco = await page.evaluate(() => [...document.querySelectorAll('#cardListPickerRow .card-list-item')].map((el) => ({
                evocabile: el.classList.contains('card-list-item--evocabile'),
                spenta: el.classList.contains('card-list-item--spenta'),
                bloccata: el.classList.contains('not-selectable'),
                cliccabile: typeof el.onclick === 'function'
            })));
            assert(elenco.length === 2, `L'elenco deve mostrare tutto l'Extra Deck (2 carte), ne mostra ${elenco.length}`);
            // L'ordine è quello dell'Extra Deck: [XYZ, XY].
            assert(elenco[0].spenta && elenco[0].bloccata && !elenco[0].cliccabile, 'XYZ (non evocabile ora) deve essere spenta e non selezionabile');
            assert(elenco[1].evocabile && !elenco[1].bloccata && elenco[1].cliccabile, 'XY (evocabile ora) deve pulsare in viola ed essere selezionabile');

            await page.evaluate(() => {
                // La convergenza dei materiali è solo grafica: la si chiude subito.
                FX.playFusionMaterialEffect = (_m, _f, _o, completa) => completa();
            });
            await page.locator('#cardListPickerRow .card-list-item--evocabile').click();
            await page.waitForFunction(() => gameState.playerMonsterField.some((s) => s && s.card.id === 511), null, { timeout: 5000 });
            const dopo = await page.evaluate(() => {
                updateUI();
                const zona = document.querySelector('.field-slot[data-zone="fusion"][data-owner="player"]');
                return {
                    banditi: gameState.playerBanished.map((c) => c.id).sort((a, b) => a - b),
                    pulsa: zona.classList.contains('fusion-ready')
                };
            });
            assert(dopo.banditi.join(',') === '510,513', `X e Y devono essere bandite (${dopo.banditi.join(',')})`);
            assert(!dopo.pulsa, 'Senza più materiali la zona Extra Deck deve smettere di pulsare');
        } finally {
            await context.close();
        }
    }
};
