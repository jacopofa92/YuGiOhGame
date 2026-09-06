// Sedicesima ondata: 2 carte richieste esplicitamente dall'utente (id
// 1127-1128) — Campanella Cerimoniale (Ceremonial Bell, puro effetto di
// UI) e Skull Knight #2 (nuovo parametro opzionale `summonedCard` di
// def.onSacrificedForTribute, riusabile da qualunque futura carta con lo
// stesso bisogno "sapere COSA è stato Evocato con questo Tributo").
module.exports = {
    name: 'Sedicesima ondata: Campanella Cerimoniale, Skull Knight #2 (id 1127-1128)',
    async run(t) {
        // Campanella Cerimoniale (1127): finché scoperta in campo, la
        // mano del bot mostra le carte VERE (data-uid presente) invece
        // dei dorsi; senza di essa, solo dorsi.
        const bellResult = await t.evaluate(() => {
            const filler = { ...cardDatabase.find((c) => c.type === 'monster' && !c.extraDeck), uid: 'bot-hand-1' };
            gameState.botHand = [filler];
            gameState.botMonsterField = [null, null, null, null, null];
            gameState.playerMonsterField = [null, null, null, null, null];
            DuelEngine.recomputeStaticEffects();
            renderBotHand();
            const hiddenByDefault = document.querySelectorAll('#botHand .card[data-uid]').length === 0;

            const bell = { ...cardDatabase.find((c) => c.id === 1127), uid: 'bell-1' };
            gameState.playerMonsterField = [{ card: bell, position: 'attack', isFaceDown: false }, null, null, null, null];
            DuelEngine.recomputeStaticEffects();
            renderBotHand();
            const revealedWithBell = document.querySelectorAll('#botHand .card[data-uid="bot-hand-1"]').length === 1;

            gameState.playerMonsterField = [null, null, null, null, null];
            DuelEngine.recomputeStaticEffects();
            renderBotHand();
            const hiddenAfterBellLeaves = document.querySelectorAll('#botHand .card[data-uid]').length === 0;

            return { hiddenByDefault, revealedWithBell, hiddenAfterBellLeaves };
        });
        t.assert(bellResult.hiddenByDefault, 'Senza Campanella Cerimoniale la mano del bot deve mostrare solo dorsi');
        t.assert(bellResult.revealedWithBell, 'Con Campanella Cerimoniale scoperta, la mano del bot deve mostrare le carte vere');
        t.assert(bellResult.hiddenAfterBellLeaves, 'Se Campanella Cerimoniale lascia il Terreno, la mano del bot deve tornare coperta');

        // Skull Knight #2 (1128): si Tributa per un'Evocazione Tributo di
        // un mostro Demone -> Special Summon un'altra copia da Deck,
        // rimescola. Non deve scattare per un mostro non-Demone, né per
        // un sacrificio SENZA alcuna Evocazione Tributo associata (es.
        // costo d'attacco).
        const skullDemonResult = await t.evaluate(() => {
            const skull1 = { ...cardDatabase.find((c) => c.id === 1128), uid: 'skull-1' };
            const skull2 = { ...cardDatabase.find((c) => c.id === 1128), uid: 'skull-deck-copy' };
            const demonSummoned = { ...cardDatabase.find((c) => c.type === 'monster' && c.race === 'Demone' && c.id !== 1128), uid: 'demon-summoned-1' };
            gameState.playerMonsterField = [null, null, null, null, null];
            gameState.playerDeck = [skull2, { ...cardDatabase.find((c) => c.type === 'monster' && !c.extraDeck), uid: 'filler-deck-1' }];
            const ctx = DuelEngine.makeContext('player', { card: skull1, summonedCard: demonSummoned });
            DuelEngine.getDefinition(1128).onSacrificedForTribute(ctx);
            return {
                newCopyOnField: gameState.playerMonsterField.some((s) => s && s.card.uid === 'skull-deck-copy'),
                deckShrunkBy1: gameState.playerDeck.length === 1
            };
        });
        t.assert(skullDemonResult.newCopyOnField, 'Tributando Skull Knight #2 per Evocare Tributo un mostro Demone deve Special Summonare un\'altra copia dal Deck');
        t.assert(skullDemonResult.deckShrunkBy1, 'Il Deck deve perdere esattamente 1 carta (la copia Special Summonata)');

        const skullNonDemonResult = await t.evaluate(() => {
            const skull1 = { ...cardDatabase.find((c) => c.id === 1128), uid: 'skull-2' };
            const skull2 = { ...cardDatabase.find((c) => c.id === 1128), uid: 'skull-deck-copy-2' };
            const nonDemonSummoned = { ...cardDatabase.find((c) => c.type === 'monster' && c.race !== 'Demone' && !c.extraDeck), uid: 'nondemon-summoned-1' };
            gameState.playerMonsterField = [null, null, null, null, null];
            gameState.playerDeck = [skull2];
            const ctx = DuelEngine.makeContext('player', { card: skull1, summonedCard: nonDemonSummoned });
            DuelEngine.getDefinition(1128).onSacrificedForTribute(ctx);
            return { newCopyOnField: gameState.playerMonsterField.some((s) => s && s.card.uid === 'skull-deck-copy-2') };
        });
        t.assert(!skullNonDemonResult.newCopyOnField, 'NON deve Special Summonare nulla se il mostro Evocato Tributo non è Tipo Demone');

        const skullNoSummonResult = await t.evaluate(() => {
            const skull1 = { ...cardDatabase.find((c) => c.id === 1128), uid: 'skull-3' };
            const skull2 = { ...cardDatabase.find((c) => c.id === 1128), uid: 'skull-deck-copy-3' };
            gameState.playerMonsterField = [null, null, null, null, null];
            gameState.playerDeck = [skull2];
            // Nessun summonedCard: simula un sacrificio come COSTO
            // (es. Guerriero Pantera), non una vera Evocazione Tributo.
            const ctx = DuelEngine.makeContext('player', { card: skull1 });
            DuelEngine.getDefinition(1128).onSacrificedForTribute(ctx);
            return { newCopyOnField: gameState.playerMonsterField.some((s) => s && s.card.uid === 'skull-deck-copy-3') };
        });
        t.assert(!skullNoSummonResult.newCopyOnField, 'NON deve scattare per un sacrificio senza alcuna Evocazione Tributo associata (es. costo d\'attacco)');
    }
};
