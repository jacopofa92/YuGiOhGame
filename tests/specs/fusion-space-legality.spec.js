module.exports = {
    name: 'Fusione: lo spazio considera le Zone liberate dai materiali sul Terreno',
    async run(t) {
        const result = await t.evaluate(() => {
            const card = (id, uid) => ({ ...cardDatabase.find((c) => c.id === id), uid });
            const fillerTemplate = cardDatabase.find((c) => c.type === 'monster' && c.id !== 1 && c.id !== 29);
            const filler = (i) => ({
                card: { ...fillerTemplate, uid: 'fusion-space-filler-' + i },
                position: 'attack', isFaceDown: false, hasAttacked: false, canChangePosition: false
            });
            const fieldBlueEyes = (uid) => ({
                card: card(1, uid), position: 'attack', isFaceDown: false,
                hasAttacked: false, canChangePosition: false
            });
            const originalFx = FX.playFusionMaterialEffect;
            FX.playFusionMaterialEffect = (_materials, _fusion, _owner, done) => { done(); return 0; };

            // A) Campo pieno e tre materiali tutti in mano: non deve essere
            // neppure proposta; anche una chiamata diretta non consuma nulla.
            gameState.playerMonsterField = [0, 1, 2, 3, 4].map(filler);
            gameState.playerHand = [0, 1, 2].map((i) => card(1, 'all-hand-blue-' + i));
            gameState.playerExtraDeck = [card(29, 'all-hand-ultimate')];
            gameState.playerGraveyard = [];
            const blockedOptions = DuelEngine.getFusableExtraDeckMonsters('player');
            const blocked = DuelEngine.actions.fusionSummon('player', 0, [
                { zone: 'hand', index: 0 }, { zone: 'hand', index: 1 }, { zone: 'hand', index: 2 }
            ]);
            const blockedState = {
                options: blockedOptions.length,
                result: blocked,
                hand: gameState.playerHand.length,
                extra: gameState.playerExtraDeck.length,
                grave: gameState.playerGraveyard.length,
                occupied: gameState.playerMonsterField.filter(Boolean).length
            };

            // B) Campo pieno ma uno dei materiali e' gia' sul Terreno: la
            // ricerca deve sceglierlo e il risultato entra proprio li'.
            gameState.playerMonsterField = [filler(10), filler(11), filler(12), fieldBlueEyes('field-blue'), filler(14)];
            gameState.playerHand = [card(1, 'hand-blue-a'), card(1, 'hand-blue-b')];
            gameState.playerExtraDeck = [card(29, 'field-material-ultimate')];
            gameState.playerGraveyard = [];
            const option = DuelEngine.getFusableExtraDeckMonsters('player')[0];
            const chosenFieldSlots = option ? option.materialLocations.filter((loc) => loc.zone === 'monster').map((loc) => loc.index) : [];
            const summoned = option && DuelEngine.actions.fusionSummon('player', option.extraDeckIndex, option.materialLocations);
            const releasedState = {
                summoned: !!summoned,
                chosenFieldSlots,
                fusionAtReleasedSlot: !!(gameState.playerMonsterField[3] && gameState.playerMonsterField[3].card.id === 29),
                occupied: gameState.playerMonsterField.filter(Boolean).length,
                grave: gameState.playerGraveyard.length
            };

            FX.playFusionMaterialEffect = originalFx;
            return { blockedState, releasedState };
        });

        t.assert(result.blockedState.options === 0 && result.blockedState.result === false,
            'Con campo pieno e materiali tutti in mano la Fusione deve essere bloccata prima dell\'attivazione');
        t.assert(result.blockedState.hand === 3 && result.blockedState.extra === 1
            && result.blockedState.grave === 0 && result.blockedState.occupied === 5,
            'Il tentativo senza spazio non deve consumare materiali o Mostro Fusione');
        t.assert(result.releasedState.summoned && result.releasedState.chosenFieldSlots.includes(3),
            'Con campo pieno deve essere scelto almeno un materiale sul Terreno');
        t.assert(result.releasedState.fusionAtReleasedSlot && result.releasedState.occupied === 5
            && result.releasedState.grave === 3,
            'Il Mostro Fusione deve entrare nella Zona liberata dopo aver mandato i tre materiali al Cimitero');
    }
};
