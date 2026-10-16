module.exports = {
    name: 'Yugi/Yami Yugi: Guerrieri Magnetici e Cavalieri delle Figure completi',
    async run(t) {
        const result = await t.evaluate(() => {
            const copy = (id, uid) => ({ ...cardDatabase.find((card) => card.id === id), uid });
            const slot = (card) => ({ card, position: 'attack', isFaceDown: false, hasAttacked: false, canChangePosition: true });

            // Valkyrion deve poter usare insieme mano e Terreno e, se il
            // campo è pieno, liberare una casella PRIMA di entrarvi.
            resetGameState();
            const valkyrion = copy(1278, 'valkyrion-hand');
            gameState.playerHand = [valkyrion, copy(85, 'alpha-hand'), copy(1277, 'gamma-hand')];
            gameState.playerMonsterField = [
                slot(copy(112, 'beta-field')), slot(copy(4, 'filler-1')),
                slot(copy(5, 'filler-2')), slot(copy(6, 'filler-3')), slot(copy(13, 'filler-4'))
            ];
            gameState.playerGraveyard = [];
            const valkyrionCan = DuelEngine.canSpecialSummonFromHand('player', 0);
            const valkyrionSummoned = DuelEngine.trySpecialSummonFromHand('player', 0);
            const valkyrionOnField = gameState.playerMonsterField.some((entry) => entry && entry.card.uid === 'valkyrion-hand');
            const materialsInGrave = [85, 112, 1277].every((id) => gameState.playerGraveyard.some((card) => card.id === id));

            // La separazione richiede i tre nomi nel Cimitero e tre Zone
            // libere dopo che Valkyrion si è offerto come Tributo.
            resetGameState();
            const valkyrionField = copy(1278, 'valkyrion-field');
            gameState.playerMonsterField = [slot(valkyrionField), slot(copy(4, 'ally-a')), slot(copy(5, 'ally-b')), null, null];
            gameState.playerGraveyard = [copy(85, 'alpha-grave'), copy(112, 'beta-grave'), copy(1277, 'gamma-grave')];
            const valkDef = DuelEngine.getDefinition(1278);
            const canSeparate = valkDef.canActivate(DuelEngine.makeContext('player', { card: valkyrionField, slotIndex: 0, zone: 'monster' }));
            valkDef.activate(DuelEngine.makeContext('player', { card: valkyrionField, slotIndex: 0, zone: 'monster' }));
            const separated = [85, 112, 1277].every((id) => gameState.playerMonsterField.some((entry) => entry && entry.card.id === id));
            const valkyrionInGrave = gameState.playerGraveyard.some((card) => card.uid === 'valkyrion-field');

            // Il Re deve chiamare Jack solo dopo una Evocazione Normale e
            // soltanto se la Regina è già scoperta sul proprio Terreno.
            resetGameState();
            const queen = copy(1279, 'queen');
            const king = copy(1280, 'king');
            const jack = copy(1281, 'jack-deck');
            gameState.playerMonsterField = [slot(queen), slot(king), null, null, null];
            gameState.playerDeck = [jack];
            DuelEngine.getDefinition(1280).onSummon(DuelEngine.makeContext('player', {
                card: king, summonedVia: 'normal', summonedSlotIndex: 1
            }));
            const kingCalledJack = gameState.playerMonsterField.some((entry) => entry && entry.card.uid === 'jack-deck')
                && gameState.playerDeck.length === 0;

            // I tre Cavalieri devono rendere Joker proponibile dal normale
            // percorso di Polimerizzazione dell'Extra Deck.
            resetGameState();
            gameState.playerHand = [copy(1279, 'queen-fusion'), copy(1281, 'jack-fusion'), copy(1280, 'king-fusion')];
            gameState.playerExtraDeck = [copy(1282, 'joker-extra')];
            const jokerFusable = DuelEngine.getFusableExtraDeckMonsters('player')
                .some((entry) => entry.card.id === 1282);

            // Joker annulla soltanto un effetto avversario che lo prende di
            // mira e scarta lo stesso tipo; la clausola è una volta a turno.
            resetGameState();
            const joker = copy(1282, 'joker-field');
            gameState.playerMonsterField = [slot(joker), null, null, null, null];
            gameState.playerHand = [copy(8, 'spell-discard')];
            gameState.playerGraveyard = [];
            gameState.cannotBeTargetedBySpellsUids = {};
            const first = DuelEngine.makeContext('bot', { card: copy(7, 'source-spell') })
                .declareTarget('player', 0, { totalTargetCount: 1 });
            const jokerNegated = first.allowed === false
                && gameState.playerHand.length === 0
                && gameState.playerGraveyard.some((card) => card.uid === 'spell-discard');
            gameState.playerHand = [copy(35, 'second-spell')];
            const second = DuelEngine.makeContext('bot', { card: copy(36, 'second-source') })
                .declareTarget('player', 0, { totalTargetCount: 1 });
            const oncePerTurn = second.allowed === true && gameState.playerHand.length === 1;

            return {
                valkyrionCan, valkyrionSummoned, valkyrionOnField, materialsInGrave,
                canSeparate, separated, valkyrionInGrave, kingCalledJack,
                jokerFusable, jokerNegated, oncePerTurn
            };
        });

        t.assert(result.valkyrionCan && result.valkyrionSummoned && result.valkyrionOnField && result.materialsInGrave,
            `Valkyrion deve usare Alpha/Beta/Gamma fra mano e Terreno anche a campo pieno: ${JSON.stringify(result)}`);
        t.assert(result.canSeparate && result.separated && result.valkyrionInGrave,
            `Valkyrion deve separarsi nei tre Guerrieri Magnetici: ${JSON.stringify(result)}`);
        t.assert(result.kingCalledJack,
            `Cavaliere del Re deve Evocare Cavaliere del Jack dal Deck: ${JSON.stringify(result)}`);
        t.assert(result.jokerFusable && result.jokerNegated && result.oncePerTurn,
            `Cavaliere Joker Arcano deve fondersi e annullare correttamente una volta per turno: ${JSON.stringify(result)}`);
    }
};
