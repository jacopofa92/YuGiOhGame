// Destiny Board (id 866) + Spirit Message "I"/"N"/"A"/"L" (id 867-870,
// nuove carte aggiunte in questa sessione — testo ufficiale verificato
// su db.yugioh-card.com): meccanica di vittoria alternativa. Verifica
// il piazzamento in ordine durante l'End Phase avversaria
// (onOpponentEndPhase, nuovo hook generico in firePhaseTrigger), la
// vittoria automatica quando tutte e 5 sono scoperte insieme
// (hasDestinyBoardComplete/checkGameOver, game-flow.js), il collasso
// quando un pezzo lascia il Terreno, e l'interazione con Santuario
// Oscuro (id 192).
module.exports = {
    name: 'Destiny Board: piazzamento in ordine, vittoria automatica, collasso, interazione con Santuario Oscuro',
    async run(t) {
        // 1) Campo vuoto: la prima Spirit Message piazzata deve essere "I".
        const r1 = await t.evaluate(() => {
            const board = { ...cardDatabase.find((c) => c.id === 866), uid: 'board-1' };
            const msgI = { ...cardDatabase.find((c) => c.id === 867), uid: 'msgI-1' };
            gameState.playerSTField = [{ card: board, isFaceDown: false, setOnTurn: gameState.turn - 1 }, null, null, null, null];
            gameState.playerHand = [msgI];
            gameState.playerFieldSpell = null;
            const ctx = DuelEngine.makeContext('player', { card: board });
            DuelEngine.getDefinition(866).onOpponentEndPhase(ctx);
            return {
                placed: gameState.playerSTField.some((s) => s && s.card.uid === 'msgI-1' && !s.isFaceDown),
                handEmpty: gameState.playerHand.length === 0
            };
        });
        t.assert(r1.placed, 'Con il Terreno vuoto (solo Destiny Board), la prima Spirit Message piazzata deve essere "I"');
        t.assert(r1.handEmpty, 'La Spirit Message piazzata deve lasciare la mano');

        // 2) Senza la prossima lettera in mano/Deck, nessun piazzamento.
        const r2 = await t.evaluate(() => {
            const board = { ...cardDatabase.find((c) => c.id === 866), uid: 'board-2' };
            gameState.playerSTField = [{ card: board, isFaceDown: false, setOnTurn: gameState.turn - 1 }, null, null, null, null];
            gameState.playerHand = [];
            gameState.playerDeck = [];
            const ctx = DuelEngine.makeContext('player', { card: board });
            DuelEngine.getDefinition(866).onOpponentEndPhase(ctx);
            return gameState.playerSTField.filter((s) => s).length;
        });
        t.assert(r2 === 1, 'Senza la prossima Spirit Message disponibile, non deve essere piazzato nulla (solo Destiny Board resta)');

        // 3) Tutte e 5 scoperte insieme -> vittoria automatica.
        const r3 = await t.evaluate(() => {
            const board = { ...cardDatabase.find((c) => c.id === 866), uid: 'board-3' };
            const msgI = { ...cardDatabase.find((c) => c.id === 867), uid: 'msgI-3' };
            const msgN = { ...cardDatabase.find((c) => c.id === 868), uid: 'msgN-3' };
            const msgA = { ...cardDatabase.find((c) => c.id === 869), uid: 'msgA-3' };
            const msgL = { ...cardDatabase.find((c) => c.id === 870), uid: 'msgL-3' };
            gameState.playerSTField = [
                { card: board, isFaceDown: false, setOnTurn: gameState.turn - 1 },
                { card: msgI, isFaceDown: false }, { card: msgN, isFaceDown: false },
                { card: msgA, isFaceDown: false }, { card: msgL, isFaceDown: false }
            ];
            gameState.gameOver = false;
            checkGameOver();
            return gameState.gameOver;
        });
        t.assert(r3 === true, 'Destiny Board + le 4 Spirit Message scoperte insieme devono terminare il duello all\'istante');

        // 4) Se una Spirit Message viene distrutta, TUTTE le altre pezzi
        // (incluso Destiny Board) vanno al Cimitero insieme (testo reale:
        // "manda al Cimitero tutte le Spirit Message e Destiny Board").
        const r4 = await t.evaluate(() => {
            const board = { ...cardDatabase.find((c) => c.id === 866), uid: 'board-4' };
            const msgI = { ...cardDatabase.find((c) => c.id === 867), uid: 'msgI-4' };
            const msgN = { ...cardDatabase.find((c) => c.id === 868), uid: 'msgN-4' };
            gameState.playerSTField = [
                { card: board, isFaceDown: false, setOnTurn: gameState.turn - 1 },
                { card: msgI, isFaceDown: false, setOnTurn: gameState.turn - 1 },
                { card: msgN, isFaceDown: false, setOnTurn: gameState.turn - 1 },
                null, null
            ];
            gameState.playerGraveyard = [];
            // Distrugge msgI (indice 1) come se l'avesse fatto il bot.
            DuelEngine.actions.destroySpellTrap.call({ owner: 'bot' }, 'player', 1);
            return {
                fieldEmpty: gameState.playerSTField.filter((s) => s).length === 0,
                boardInGrave: gameState.playerGraveyard.some((c) => c.uid === 'board-4'),
                msgIInGrave: gameState.playerGraveyard.some((c) => c.uid === 'msgI-4'),
                msgNInGrave: gameState.playerGraveyard.some((c) => c.uid === 'msgN-4')
            };
        });
        t.assert(r4.fieldEmpty, 'Dopo la distruzione di una Spirit Message, il Terreno deve restare senza alcun pezzo di Destiny Board');
        t.assert(r4.boardInGrave, 'Destiny Board stessa deve finire nel Cimitero quando un pezzo qualsiasi lascia il Terreno');
        t.assert(r4.msgIInGrave, 'La Spirit Message distrutta deve essere nel Cimitero');
        t.assert(r4.msgNInGrave, 'Anche la Spirit Message NON toccata direttamente deve finire nel Cimitero (collasso totale)');

        // 5) Santuario Oscuro: la scelta "Special Summonala come Mostro"
        // deve generare un Mostro Normale Demone/OSCURITÀ Lv1 0/0, immune
        // al targeting per un attacco (mockando il popup per renderlo
        // deterministico: nessuna vera interfaccia in un test headless).
        const r5 = await t.evaluate(() => {
            const board = { ...cardDatabase.find((c) => c.id === 866), uid: 'board-5' };
            const msgI = { ...cardDatabase.find((c) => c.id === 867), uid: 'msgI-5' };
            const sanctuary = { ...cardDatabase.find((c) => c.id === 192), uid: 'sanctuary-5' };
            gameState.playerSTField = [{ card: board, isFaceDown: false, setOnTurn: gameState.turn - 1 }, null, null, null, null];
            gameState.playerMonsterField = [null, null, null, null, null];
            gameState.playerHand = [msgI];
            gameState.playerFieldSpell = { card: sanctuary, isFaceDown: false };

            const originalPopover = window.DuelEngineUI.openChoicePopover;
            window.DuelEngineUI.openChoicePopover = (anchor, opts) => { opts.choiceB.onSelect(); };
            try {
                const ctx = DuelEngine.makeContext('player', { card: board });
                DuelEngine.getDefinition(866).onOpponentEndPhase(ctx);
            } finally {
                window.DuelEngineUI.openChoicePopover = originalPopover;
            }

            DuelEngine.recomputeStaticEffects();
            const slot = gameState.playerMonsterField.find((s) => s && s.card.uid === 'msgI-5');
            return slot ? {
                summoned: true,
                type: slot.card.type,
                level: slot.card.level,
                race: slot.card.race,
                attribute: slot.card.attribute,
                attack: slot.card.attack,
                defense: slot.card.defense,
                cannotBeAttackTarget: !!(gameState.cannotBeAttackTargetUids && gameState.cannotBeAttackTargetUids[slot.card.uid])
            } : { summoned: false };
        });
        t.assert(r5.summoned, 'Santuario Oscuro deve poter Special Summonare la Spirit Message come Mostro');
        t.assert(r5.type === 'monster', 'La carta Special Summonata deve diventare di Tipo Mostro');
        t.assert(r5.level === 1 && r5.race === 'Demone' && r5.attribute === 'OSCURITÀ' && r5.attack === 0 && r5.defense === 0, `Deve avere le statistiche corrette (Demone/OSCURITÀ/Lv1/0/0) — lette: ${JSON.stringify(r5)}`);
        t.assert(r5.cannotBeAttackTarget, 'Il Mostro generato non deve poter essere scelto come bersaglio per un attacco');
    }
};
