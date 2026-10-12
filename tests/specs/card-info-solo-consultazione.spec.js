// Il pannello informativo e' una consultazione, non parte del comando di
// gioco: durante Tributi/scarti/attacchi i tocchi devono raggiungere soltanto
// la scelta in corso. Fuori da quei contesti il tap normale resta invariato.
module.exports = {
    name: 'Info carta: non copre selezioni e attacchi, resta nei tap normali',
    async run(t) {
        const { page, assert } = t;
        await page.evaluate(() => {
            gameState.currentPlayer = 'player';
            gameState.phase = 'main1';
            gameState.playerHand = [];
            gameState.playerMonsterField = Array(5).fill(null);
            gameState.botMonsterField = Array(5).fill(null);
            gameState.pendingTributeSummon = null;
            gameState.pendingTributePlacement = null;
            gameState.pendingHandDiscard = null;
            gameState.pendingSummon = null;
            gameState.selectedCard = { type: null, card: null, index: -1 };
            updateUI();
        });

        const normale = await page.evaluate(() => {
            const card = { ...cardDatabase.find((c) => c.type === 'monster' && c.level <= 4), uid: 'info-normal' };
            handleCardClick(card, 'hand', 0, 'player', false);
            return document.getElementById('cardInfoPanel').classList.contains('visible');
        });
        assert(normale, 'Un tap normale deve continuare ad aprire le informazioni');

        const manoStabile = await page.evaluate(() => {
            const carta = { ...cardDatabase.find((c) => c.type === 'spell'), uid: 'mano-no-flicker' };
            gameState.playerHand = [carta];
            updateUI();
            const prima = document.querySelector('#playerHand .card');
            updateUI();
            return prima === document.querySelector('#playerHand .card');
        });
        assert(manoStabile, 'Una carta immutata in mano deve conservare lo stesso nodo DOM fra due render');

        const tributo = await page.evaluate(async () => {
            const sacrificio = { ...cardDatabase.find((c) => c.type === 'monster' && c.level <= 4), uid: 'info-tributo-materiale' };
            const evocato = { ...cardDatabase.find((c) => c.type === 'monster' && c.level >= 5 && c.level <= 6), uid: 'info-tributo-evocato' };
            gameState.playerMonsterField[0] = { card: sacrificio, position: 'attack', isFaceDown: false };
            gameState.playerHand = [evocato];
            // Due Tributi: dopo il primo click il flusso resta in attesa e
            // non avvia animazioni asincrone che contaminerebbero il caso
            // di scarto verificato subito dopo.
            startTributeSelection(evocato, 0, 2, null);
            // Pressione prolungata: consulta senza scegliere il Tributo e
            // senza lasciare pulsanti permanenti sopra le carte.
            const cardEl = document.querySelector('#playerFieldBoard .field-slot[data-type="monster"][data-index="0"] .card');
            cardEl.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, pointerType: 'touch', clientX: 20, clientY: 20 }));
            await new Promise((resolve) => setTimeout(resolve, 580));
            cardEl.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, pointerType: 'touch', clientX: 20, clientY: 20 }));
            cardEl.click();
            const consultato = document.getElementById('cardInfoPanel').classList.contains('visible')
                && gameState.pendingTributeSummon.selected.length === 0
                && !document.querySelector('.card-inspect-button');
            cardEl.click();
            return {
                consultato,
                info: document.getElementById('cardInfoPanel').classList.contains('visible'),
                scelto: !!(gameState.pendingTributeSummon && gameState.pendingTributeSummon.selected.includes(0))
            };
        });
        assert(tributo.consultato && !tributo.info && tributo.scelto,
            `Il tap sul Tributo deve scegliere senza aprire info: ${JSON.stringify(tributo)}`);

        const scarto = await page.evaluate(() => {
            cancelTributeSelection();
            const carta = { ...cardDatabase.find((c) => c.type === 'spell'), uid: 'info-scarto' };
            gameState.playerHand = [carta];
            // Ne chiediamo due per osservare lo stato dopo il primo tap,
            // prima che performHandDiscard chiuda automaticamente la scelta.
            gameState.pendingHandDiscard = { needed: 2, selected: [], onComplete: null };
            updateCardInfoPanel(carta, { sourceType: 'hand', sourceOwner: 'player' });
            handleCardClick(carta, 'hand', 0, 'player', false);
            return {
                info: document.getElementById('cardInfoPanel').classList.contains('visible'),
                scelto: gameState.pendingHandDiscard.selected.includes(0)
            };
        });
        assert(!scarto.info && scarto.scelto,
            `Il tap sullo scarto deve scegliere senza aprire info: ${JSON.stringify(scarto)}`);

        const attacco = await page.evaluate(() => {
            gameState.pendingHandDiscard = null;
            gameState.phase = 'battle';
            const attaccante = { ...cardDatabase.find((c) => c.type === 'monster'), uid: 'info-attaccante' };
            suppressCardInspectionFor(700);
            handleCardClick(attaccante, 'monster', 0, 'player', false);
            return document.getElementById('cardInfoPanel').classList.contains('visible');
        });
        assert(!attacco, 'Il click sintetico successivo a un attacco non deve riaprire le informazioni');
    }
};
