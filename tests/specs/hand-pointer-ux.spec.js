// La mano usa un unico flusso Pointer Event per mouse e touch: un tap deve
// mostrare dettagli + sollevare la carta senza richiedere hover, mentre un
// click esterno deve azzerare soltanto quella selezione visiva.
module.exports = {
    name: 'UX mano: tap mostra e solleva, click esterno riallinea la carta',
    async run(t) {
        await t.evaluate(() => {
            gameState.currentPlayer = 'player';
            gameState.phase = 'main1';
            gameState.hasNormalSummoned = false;
            gameState.playerHand = [{ ...cardDatabase.find((card) => card.id === 4), uid: 'pointer-ux-main' }];
            gameState.selectedCard = { type: null, card: null, index: -1 };
            updateUI();
        });

        const card = t.page.locator('#playerHand .card').first();
        await card.dispatchEvent('pointerdown', { pointerId: 41, pointerType: 'touch', clientX: 600, clientY: 780, isPrimary: true });
        await card.dispatchEvent('pointerup', { pointerId: 41, pointerType: 'touch', clientX: 600, clientY: 780, isPrimary: true });

        let state = await t.evaluate(() => ({
            selectedType: gameState.selectedCard.type,
            selectedVisual: !!document.querySelector('#playerHand .card.selected'),
            infoVisible: document.getElementById('cardInfoPanel').classList.contains('visible')
        }));
        t.assert(state.selectedType === 'hand', 'Il tap deve selezionare la carta della mano');
        t.assert(state.selectedVisual, 'La carta toccata deve risultare sollevata tramite .selected');
        t.assert(state.infoVisible, 'Il tap deve mostrare il box informazioni senza dipendere dall hover');

        await t.evaluate(() => document.body.dispatchEvent(new MouseEvent('click', { bubbles: true })));
        state = await t.evaluate(() => ({
            selectedType: gameState.selectedCard.type,
            selectedVisual: !!document.querySelector('#playerHand .card.selected'),
            infoVisible: document.getElementById('cardInfoPanel').classList.contains('visible')
        }));
        t.assert(state.selectedType === null, 'Il click esterno deve svuotare la selezione della mano');
        t.assert(!state.selectedVisual, 'Il click esterno deve rimettere la carta in linea');
        t.assert(!state.infoVisible, 'Il click esterno deve chiudere anche il box informazioni');

        // In Battle Phase il drag e' vietato, ma l'ispezione touch deve
        // continuare a funzionare: e' il caso che prima restava senza alcun
        // handler, perché startHandCardDrag usciva immediatamente.
        await t.evaluate(() => {
            gameState.phase = 'battle';
            gameState.playerHand = [{ ...cardDatabase.find((card) => card.id === 4), uid: 'pointer-ux-battle' }];
            updateUI();
        });
        const battleCard = t.page.locator('#playerHand .card').first();
        await battleCard.dispatchEvent('pointerdown', { pointerId: 42, pointerType: 'touch', clientX: 600, clientY: 780, isPrimary: true });
        await battleCard.dispatchEvent('pointerup', { pointerId: 42, pointerType: 'touch', clientX: 600, clientY: 780, isPrimary: true });
        state = await t.evaluate(() => ({
            selectedType: gameState.selectedCard.type,
            selectedVisual: !!document.querySelector('#playerHand .card.selected'),
            infoVisible: document.getElementById('cardInfoPanel').classList.contains('visible'),
            dragPreview: !!document.querySelector('.drag-preview')
        }));
        t.assert(state.selectedType === 'hand' && state.selectedVisual && state.infoVisible,
            'Anche fuori dalla Main Phase il tap deve ispezionare e sollevare la carta');
        t.assert(!state.dragPreview, 'Fuori dalla Main Phase non deve poter iniziare un drag di piazzamento');
    }
};
