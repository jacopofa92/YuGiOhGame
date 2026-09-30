// Regressione dello Structure Deck SD7: Exxod deve entrare soltanto col
// proprio tributo Sfinge e infliggere danno soltanto per un vero Flip
// Summon TERRA; Drago Megaroccia deve nascondere il -1 sentinella e
// calcolare ATK/DEF quando viene Evocato col proprio effetto.
module.exports = {
    name: 'Invincible Fortress: Exxod e Drago Megaroccia',
    async run(t) {
        const exxod = await t.evaluate(() => {
            const copy = (id, uid) => ({ ...cardDatabase.find((c) => c.id === id), uid: uid });
            const exxodCard = copy(753, 'exxod-sd7');
            const nonSphinx = copy(614, 'ratto-sd7');
            const sphinx = copy(760, 'hieraco-sd7');
            const earthFlip = copy(754, 'earth-flip-sd7');
            const def = DuelEngine.getDefinition(753);

            gameState.playerHand = [exxodCard];
            gameState.playerGraveyard = [];
            gameState.playerMonsterField = [
                { card: nonSphinx, position: 'attack', isFaceDown: false },
                null, null, null, null
            ];
            const blockedWithoutSphinx = !DuelEngine.canSpecialSummonFromHand('player', 0);

            gameState.playerMonsterField[1] = { card: sphinx, position: 'attack', isFaceDown: false };
            const summoned = DuelEngine.trySpecialSummonFromHand('player', 0);
            const sphinxWasTributed = gameState.playerGraveyard.some((c) => c.uid === 'hieraco-sd7');
            const ratStayed = gameState.playerMonsterField.some((s) => s && s.card.uid === 'ratto-sd7');
            const exxodStayed = gameState.playerMonsterField.some((s) => s && s.card.uid === 'exxod-sd7');

            gameState.botLP = 8000;
            // Una Normal Summon TERRA non deve attivare Exxod.
            def.onAnyNormalOrFlipSummon(DuelEngine.makeContext('player', {
                card: exxodCard,
                summonedCard: earthFlip,
                summonedVia: 'normal'
            }));
            const lpAfterNormal = gameState.botLP;

            // Un vero Flip Summon TERRA deve infliggere esattamente 1000.
            def.onAnyNormalOrFlipSummon(DuelEngine.makeContext('player', {
                card: exxodCard,
                summonedCard: earthFlip,
                summonedVia: 'flip'
            }));
            const lpAfterFlip = gameState.botLP;

            return {
                cannotNormalSummon: def.cannotNormalSummon === true,
                blockedWithoutSphinx,
                summoned,
                sphinxWasTributed,
                ratStayed,
                exxodStayed,
                lpAfterNormal,
                lpAfterFlip
            };
        });

        t.assert(exxod.cannotNormalSummon, 'Exxod non deve poter essere Evocato Normalmente/Set');
        t.assert(exxod.blockedWithoutSphinx, 'Exxod non deve potersi Evocare Specialmente senza una Sfinge scoperta');
        t.assert(exxod.summoned && exxod.exxodStayed, 'Exxod deve essere Evocato Specialmente quando una Sfinge valida e\' disponibile');
        t.assert(exxod.sphinxWasTributed && exxod.ratStayed, 'Il costo di Exxod deve tributare la Sfinge, non un mostro qualsiasi');
        t.assert(exxod.lpAfterNormal === 8000, `Una Normal Summon TERRA non deve attivare Exxod (LP: ${exxod.lpAfterNormal})`);
        t.assert(exxod.lpAfterFlip === 7000, `Un Flip Summon TERRA deve infliggere 1000 danni (LP: ${exxod.lpAfterFlip})`);

        const megarock = await t.evaluate(() => {
            const copy = (id, uid) => ({ ...cardDatabase.find((c) => c.id === id), uid: uid });
            const dragon = copy(763, 'megarock-sd7');
            const rockA = copy(754, 'rock-a-sd7');
            const rockB = copy(759, 'rock-b-sd7');

            const preview = CardRenderer.createCardElement(dragon, false, 'attack');
            const previewStats = preview.querySelector('.card-stats').textContent;

            gameState.playerHand = [dragon];
            gameState.playerGraveyard = [rockA, rockB];
            gameState.playerBanished = [];
            gameState.playerMonsterField = [null, null, null, null, null];
            const summoned = DuelEngine.trySpecialSummonFromHand('player', 0);
            const fieldCard = gameState.playerMonsterField.find((s) => s)?.card;
            const rendered = CardRenderer.createCardElement(fieldCard, false, 'attack');

            return {
                previewStats,
                summoned,
                attack: fieldCard && fieldCard.attack,
                defense: fieldCard && fieldCard.defense,
                banished: gameState.playerBanished.length,
                renderedStats: rendered.querySelector('.card-stats').textContent
            };
        });

        t.assert(megarock.previewStats.includes('?') && !megarock.previewStats.includes('-1'), `Prima dell'effetto Drago Megaroccia deve mostrare ?/?, rilevato ${megarock.previewStats}`);
        t.assert(megarock.summoned, 'Drago Megaroccia deve potersi Evocare bandendo mostri Roccia');
        t.assert(megarock.banished === 2, `Drago Megaroccia deve bandire i 2 mostri Roccia disponibili (rilevati ${megarock.banished})`);
        t.assert(megarock.attack === 1400 && megarock.defense === 1400, `Con 2 Roccia deve diventare 1400/1400, rilevato ${megarock.attack}/${megarock.defense}`);
        t.assert(megarock.renderedStats.includes('1400') && !megarock.renderedStats.includes('?'), `Dopo l'effetto deve mostrare 1400/1400, rilevato ${megarock.renderedStats}`);
    }
};
