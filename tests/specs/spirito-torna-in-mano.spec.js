// Mostri Spirito: Evocati Normalmente, tornano in mano alla End Phase.
//
// Difetto trovato dal duello senza testa (tools/duello-senza-testa.js) e
// confermato nel browser: fireTrigger passava all'auto-effetto "quando
// questa carta viene Evocata" un contesto SENZA ctx.card (ogni chiamante
// mette solo summonedCard), quindi l'onSummon degli Spirito
// (`ctx.card._returnToHandTurn = ...`) andava in errore in silenzio e la
// carta restava sul Terreno per sempre. Si prova il percorso vero:
// summonMonster (il giocatore) e una Evocazione del bot come la fa bot.js,
// poi la End Phase di chi l'ha Evocato.
module.exports = {
    name: 'Mostri Spirito Evocati Normalmente tornano in mano alla End Phase (id 1005)',
    async run(t) {
        await t.page.waitForFunction(() => gameState.phase === 'main1' && !DuelEngine.isChainActive(), null, { timeout: 15000 });

        // --- Il giocatore Evoca Coniglio Bianco di Inaba ---
        await t.evaluate(() => {
            if (typeof clearPhaseTransitionTimeout === 'function') clearPhaseTransitionTimeout();
            gameState.currentPlayer = 'player';
            gameState.phase = 'main1';
            gameState.hasNormalSummoned = false;
            gameState.playerMonsterField = [null, null, null, null, null];
            gameState.playerSTField = [null, null, null, null, null];
            gameState.botSTField = [null, null, null, null, null];
            const coniglio = { ...cardDatabase.find((c) => c.id === 1005), uid: 'coniglio-g' };
            gameState.playerHand = [coniglio];
            summonMonster(coniglio, 0, 'attack', 0);
        });
        await t.page.waitForFunction(() => !!gameState.playerMonsterField[0] && !DuelEngine.isChainActive(), null, { timeout: 10000 });
        const segnato = await t.evaluate(() => gameState.playerMonsterField[0].card._returnToHandTurn === gameState.turn);
        t.assert(segnato, 'Evocato dal giocatore: l\'onSummon dello Spirito segna il ritorno in mano (prima andava in errore)');
        await t.evaluate(() => { enterEndPhase(); if (typeof clearPhaseTransitionTimeout === 'function') clearPhaseTransitionTimeout(); });
        const dopoG = await t.evaluate(() => ({ campo: !!gameState.playerMonsterField[0], mano: gameState.playerHand.some((c) => c.uid === 'coniglio-g') }));
        t.assert(!dopoG.campo && dopoG.mano, `Alla End Phase lo Spirito torna in mano (${JSON.stringify(dopoG)})`);

        // --- Il bot Evoca uno Spirito come fa bot.js ---
        const bot = await t.evaluate(() => new Promise((resolve) => {
            gameState.currentPlayer = 'bot';
            gameState.phase = 'main1';
            gameState.botMonsterField = [null, null, null, null, null];
            const coniglio = { ...cardDatabase.find((c) => c.id === 1005), uid: 'coniglio-b' };
            gameState.botMonsterField[0] = { card: coniglio, position: 'attack', isFaceDown: false, hasAttacked: false, canChangePosition: false, summonedOnTurn: gameState.turn };
            const summonCtx = DuelEngine.makeContext('bot', { summonedCard: coniglio, summonedSlotIndex: 0, summonedPosition: 'attack' });
            DuelEngine.fireTrigger(DuelEngine.TRIGGER.ON_NORMAL_SUMMON, summonCtx, () => resolve(coniglio._returnToHandTurn === gameState.turn));
        }));
        t.assert(bot, 'Evocato dal bot: anche lì lo Spirito segna il ritorno in mano');
    }
};
