module.exports = {
    name: 'Supporto Divinita: Canto Antico recupera Ra e applica i Tributi originali',
    async run(t) {
        const result = await t.evaluate(() => {
            const copy = (id, uid) => ({ ...cardDatabase.find((card) => card.id === id), uid });

            resetGameState();
            gameState.currentPlayer = 'bot';
            gameState.phase = 'main1';
            const chant = copy(1273, 'chant-search');
            const ra = copy(472, 'ra-search');
            gameState.botDeck = [ra];
            gameState.botDeckCount = 1;
            const chantDef = DuelEngine.getDefinition(1273);
            const canSearch = chantDef.canActivate(DuelEngine.makeContext('bot', { card: chant }));
            chantDef.activate(DuelEngine.makeContext('bot', { card: chant }));
            const searchWorked = gameState.botHand.some((card) => card.uid === ra.uid)
                && gameState.botDeck.length === 0
                && gameState.additionalTributeSummonFor.bot === true;

            const graveChant = copy(1273, 'chant-grave');
            gameState.botGraveyard.push(graveChant);
            const graveCtx = DuelEngine.makeContext('bot', { card: graveChant, zone: 'graveyard' });
            const canUseGrave = chantDef.canActivateFromGraveyardMainPhase(graveCtx);
            chantDef.activateFromGraveyardMainPhase(graveCtx);
            const graveWorked = gameState.botBanished.some((card) => card.uid === graveChant.uid)
                && gameState.ancientChantRaBoostTurnFor.bot === gameState.turn;

            ra._raPayLp = false;
            ra._tributedOriginalStats = [
                { id: 1, attack: 3000, defense: 2500 },
                { id: 2, attack: 2500, defense: 2100 },
                { id: 4, attack: 1400, defense: 1200 }
            ];
            const raDef = DuelEngine.getDefinition(472);
            raDef.onSummon(DuelEngine.makeContext('bot', { summonedCard: ra, summonedVia: 'normal' }));
            gameState.atkDefBonus = {};
            raDef.static(DuelEngine.makeContext('bot', { card: ra }));
            const bonus = gameState.atkDefBonus[ra.uid];

            return {
                canSearch,
                searchWorked,
                canUseGrave,
                graveWorked,
                attack: bonus && bonus.atk,
                defense: bonus && bonus.def,
                consumed: gameState.ancientChantRaBoostTurnFor.bot === null,
                searchOncePerTurn: !chantDef.canActivate(DuelEngine.makeContext('bot', { card: chant }))
            };
        });

        t.assert(result.canSearch && result.searchWorked,
            `Canto Antico deve recuperare Ra e concedere la quota aggiuntiva: ${JSON.stringify(result)}`);
        t.assert(result.canUseGrave && result.graveWorked && result.consumed,
            `L'effetto dal Cimitero deve bandire Canto Antico e consumarsi su Ra: ${JSON.stringify(result)}`);
        t.assert(result.attack === 6900 && result.defense === 5800,
            `Ra deve sommare le statistiche originali dei Tributi: ${JSON.stringify(result)}`);
        t.assert(result.searchOncePerTurn, 'Il recupero di Ra deve restare una volta per turno');
    }
};
