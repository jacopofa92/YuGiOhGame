// Scorpione d'Acciaio (id 1122): "un mostro non-Macchina che attacca
// questa carta verrà distrutto alla End Phase del suo 2° turno dopo
// l'attacco". Verifica il nuovo hook def.onBeingAttacked (dispatch
// automatico e forzato sul lato DIFENSORE, dentro TRIGGER.ON_ATTACK_DECLARE
// in duel-engine.js — diverso dal Chain-based onAttackDeclare, riservato
// alle risposte OPZIONALI del difensore) e il nuovo meccanismo generico
// ctx.queueDelayedDestroyAtOpponentEndPhase +
// DuelEngine.processDelayedDestroyAtOpponentEndPhase (gemello di
// reviveFromGraveyardWithCountdown/processSelfDestructAtOpponentEndPhase,
// ma per un MOSTRO ALTRUI). Battaglia REALE via resolveAttack (non un
// fireTrigger sintetico), stesso schema di battle-resolution.spec.js.
module.exports = {
    name: 'Scorpione d\'Acciaio: distruzione ritardata dell\'attaccante non-Macchina alla 2ª End Phase del suo turno (id 1122)',
    async run(t) {
        // Caso 1: un mostro NON-Macchina attacca Scorpione d'Acciaio ->
        // deve mettersi in coda la distruzione ritardata (2 End Phase
        // dell'ATTACCANTE, non del difensore).
        const nonMachineResult = await t.evaluate(() => {
            return new Promise((resolve) => {
                const scorpion = { ...cardDatabase.find((c) => c.id === 1122), uid: 'scorpion-1' };
                const attacker = { ...cardDatabase.find((c) => c.type === 'monster' && c.race !== 'Macchina' && !c.extraDeck), uid: 'attacker-nonmachine-1', attack: 3000, defense: 0 };
                gameState.playerMonsterField = [{ card: attacker, position: 'attack', isFaceDown: false, hasAttacked: false }, null, null, null, null];
                gameState.botMonsterField = [{ card: scorpion, position: 'attack', isFaceDown: false }, null, null, null, null];
                gameState.phase = 'battle';
                gameState.pendingDelayedDestroyAtOpponentEndPhase = [];
                DuelEngine.recomputeStaticEffects();
                resolveAttack('player', 0, 0, () => {
                    const entry = gameState.pendingDelayedDestroyAtOpponentEndPhase.find((e) => e.targetUid === 'attacker-nonmachine-1');
                    resolve({
                        queued: !!entry,
                        targetOwner: entry && entry.targetOwner,
                        endsRemaining: entry && entry.endsRemaining
                    });
                });
            });
        });
        t.assert(nonMachineResult.queued, 'Un attaccante non-Macchina deve mettere in coda la distruzione ritardata');
        t.assert(nonMachineResult.targetOwner === 'player', 'La distruzione deve riguardare l\'ATTACCANTE (player), non il controllore di Scorpione d\'Acciaio (bot)');
        t.assert(nonMachineResult.endsRemaining === 2, `endsRemaining deve partire da 2 (rilevato ${nonMachineResult.endsRemaining})`);

        // Caso 2: un mostro Macchina attacca Scorpione d'Acciaio -> NON deve mettersi in coda nulla.
        const machineResult = await t.evaluate(() => {
            return new Promise((resolve) => {
                const scorpion = { ...cardDatabase.find((c) => c.id === 1122), uid: 'scorpion-2' };
                const machineAttacker = { ...cardDatabase.find((c) => c.type === 'monster' && c.race === 'Macchina' && c.id !== 1122 && !c.extraDeck), uid: 'attacker-machine-1', attack: 3000, defense: 0 };
                gameState.playerMonsterField = [{ card: machineAttacker, position: 'attack', isFaceDown: false, hasAttacked: false }, null, null, null, null];
                gameState.botMonsterField = [{ card: scorpion, position: 'attack', isFaceDown: false }, null, null, null, null];
                gameState.phase = 'battle';
                gameState.pendingDelayedDestroyAtOpponentEndPhase = [];
                DuelEngine.recomputeStaticEffects();
                resolveAttack('player', 0, 0, () => {
                    const entry = gameState.pendingDelayedDestroyAtOpponentEndPhase.find((e) => e.targetUid === 'attacker-machine-1');
                    resolve({ queued: !!entry });
                });
            });
        });
        t.assert(!machineResult.queued, 'Un attaccante di Tipo Macchina NON deve mettere in coda alcuna distruzione ritardata');

        // Caso 3: la coda scatta solo alla 2ª End Phase del TURNO
        // DELL'ATTACCANTE (non a quella del controllore di Scorpione
        // d'Acciaio) — verificato chiamando processDelayedDestroyAtOpponentEndPhase
        // direttamente, stesso pattern già usato per verificare
        // processSelfDestructAtOpponentEndPhase in altre sessioni.
        const countdownResult = await t.evaluate(() => {
            const attackerCard = { ...cardDatabase.find((c) => c.type === 'monster' && c.race !== 'Macchina' && !c.extraDeck), uid: 'attacker-countdown-1' };
            gameState.botMonsterField = [{ card: attackerCard, position: 'attack', isFaceDown: false }, null, null, null, null];
            gameState.playerMonsterField = [null, null, null, null, null];
            gameState.playerGraveyard = [];
            gameState.botGraveyard = [];
            gameState.pendingDelayedDestroyAtOpponentEndPhase = [{ queuedByOwner: 'player', targetOwner: 'bot', targetUid: 'attacker-countdown-1', endsRemaining: 2 }];

            // Una End Phase del PLAYER (non del bot) non deve intaccare il conteggio.
            DuelEngine.processDelayedDestroyAtOpponentEndPhase('player');
            const stillOnFieldAfterPlayerEnd = gameState.botMonsterField.some((s) => s && s.card.uid === 'attacker-countdown-1');
            const endsAfterPlayerEnd = gameState.pendingDelayedDestroyAtOpponentEndPhase[0].endsRemaining;

            // 1ª End Phase del bot: decrementa a 1, non distrugge ancora.
            DuelEngine.processDelayedDestroyAtOpponentEndPhase('bot');
            const stillOnFieldAfterFirstBotEnd = gameState.botMonsterField.some((s) => s && s.card.uid === 'attacker-countdown-1');

            // 2ª End Phase del bot: decrementa a 0, distrugge.
            DuelEngine.processDelayedDestroyAtOpponentEndPhase('bot');
            const destroyedAfterSecondBotEnd = !gameState.botMonsterField.some((s) => s && s.card.uid === 'attacker-countdown-1');
            const inGraveyard = gameState.botGraveyard.some((c) => c.uid === 'attacker-countdown-1');

            return { stillOnFieldAfterPlayerEnd, endsAfterPlayerEnd, stillOnFieldAfterFirstBotEnd, destroyedAfterSecondBotEnd, inGraveyard };
        });
        t.assert(countdownResult.stillOnFieldAfterPlayerEnd, 'L\'End Phase del proprietario di Scorpione d\'Acciaio (player) non deve far avanzare il conteggio');
        t.assert(countdownResult.endsAfterPlayerEnd === 2, 'endsRemaining non deve decrementare alla End Phase sbagliata');
        t.assert(countdownResult.stillOnFieldAfterFirstBotEnd, 'Dopo solo 1 End Phase del bot (l\'attaccante) il mostro non deve ancora essere distrutto');
        t.assert(countdownResult.destroyedAfterSecondBotEnd, 'Dopo la 2ª End Phase del bot il mostro attaccante deve essere distrutto');
        t.assert(countdownResult.inGraveyard, 'Il mostro distrutto deve finire nel Cimitero del suo proprietario (bot)');
    }
};
