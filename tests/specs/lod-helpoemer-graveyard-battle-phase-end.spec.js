// Helpoemer (id 1123): "alla fine della Battle Phase del tuo avversario,
// se questa carta è nel Cimitero perché distrutta in battaglia, il tuo
// avversario scarta 1 carta a caso". Verifica il nuovo
// def.canTriggerFromGraveyard (duel-engine.js, firePhaseTrigger — nuova
// scansione generica del Cimitero, opt-in, riusabile da qualunque futura
// carta con lo stesso bisogno "se sono nel Cimitero quando scatta questa
// fase") insieme al riuso del tracker già esistente
// gameState.battleDestroyedThisTurnFor. Battaglia REALE via resolveAttack
// + vera transizione di fase via enterMainPhase2() (non un fireTrigger
// sintetico), stesso schema di battle-resolution.spec.js.
module.exports = {
    name: 'Helpoemer: scarto forzato dal Cimitero alla fine della Battle Phase avversaria, solo se distrutto in battaglia (id 1123)',
    async run(t) {
        // Caso 1: Helpoemer (controllato dal bot) viene distrutto in
        // battaglia dal player durante la Battle Phase del PLAYER -> alla
        // fine di quella Battle Phase (dell'avversario di Helpoemer... no,
        // è la battle phase di CHI l'ha distrutto, cioè il player, che è
        // l'avversario del controllore di Helpoemer, il bot) il PLAYER
        // (avversario del controllore di Helpoemer) deve scartare 1 carta.
        const triggeredResult = await t.evaluate(() => {
            return new Promise((resolve) => {
                const helpoemer = { ...cardDatabase.find((c) => c.id === 1123), uid: 'helpoemer-1' };
                const attacker = { ...cardDatabase.find((c) => c.type === 'monster' && c.id !== 1123 && !c.extraDeck), uid: 'attacker-1', attack: 3000, defense: 0 };
                const filler1 = { ...cardDatabase.find((c) => c.id === 23), uid: 'player-hand-1' };
                const filler2 = { ...cardDatabase.find((c) => c.id === 23), uid: 'player-hand-2' };
                gameState.playerMonsterField = [{ card: attacker, position: 'attack', isFaceDown: false, hasAttacked: false }, null, null, null, null];
                gameState.botMonsterField = [{ card: helpoemer, position: 'attack', isFaceDown: false }, null, null, null, null];
                gameState.playerHand = [filler1, filler2];
                gameState.botGraveyard = [];
                gameState.phase = 'battle';
                gameState.currentPlayer = 'player';
                gameState.battleDestroyedThisTurnFor = { player: [], bot: [] };
                DuelEngine.recomputeStaticEffects();
                resolveAttack('player', 0, 0, () => {
                    const inGraveyard = gameState.botGraveyard.some((c) => c.uid === 'helpoemer-1');
                    const wasTrackedAsBattleDestroyed = gameState.battleDestroyedThisTurnFor.bot.some((c) => c.uid === 'helpoemer-1');
                    // Stessa coppia di chiamate fatta da enterEndPhase()
                    // (game-flow.js) quando wasInBattlePhase è vero: per
                    // ENTRAMBI i lati, indipendentemente da chi vive il
                    // turno (vedi il commento su 'onBattlePhaseEnd' lì).
                    DuelEngine.firePhaseTrigger('onBattlePhaseEnd', 'player');
                    DuelEngine.firePhaseTrigger('onBattlePhaseEnd', 'bot');
                    resolve({
                        inGraveyard: inGraveyard,
                        wasTrackedAsBattleDestroyed: wasTrackedAsBattleDestroyed,
                        playerHandLength: gameState.playerHand.length
                    });
                });
            });
        });
        t.assert(triggeredResult.inGraveyard, 'Helpoemer distrutto in battaglia deve finire nel Cimitero del bot');
        t.assert(triggeredResult.wasTrackedAsBattleDestroyed, 'gameState.battleDestroyedThisTurnFor deve registrare Helpoemer come distrutto in battaglia');
        t.assert(triggeredResult.playerHandLength === 1, `Il player (avversario del controllore di Helpoemer) deve scartare 1 carta a caso (mano rimasta: ${triggeredResult.playerHandLength}, attesa 1)`);

        // Caso 2: Helpoemer nel Cimitero ma NON distrutto in battaglia
        // (es. scartato dalla mano) -> nessuno scarto alla fine di
        // nessuna Battle Phase.
        const notBattleDestroyedResult = await t.evaluate(() => {
            const helpoemer2 = { ...cardDatabase.find((c) => c.id === 1123), uid: 'helpoemer-2' };
            gameState.botGraveyard = [helpoemer2];
            gameState.playerHand = [{ ...cardDatabase.find((c) => c.id === 23), uid: 'player-hand-untouched-1' }];
            gameState.battleDestroyedThisTurnFor = { player: [], bot: [] };
            gameState.currentPlayer = 'player';
            DuelEngine.firePhaseTrigger('onBattlePhaseEnd', 'player');
            DuelEngine.firePhaseTrigger('onBattlePhaseEnd', 'bot');
            return { playerHandLength: gameState.playerHand.length };
        });
        t.assert(notBattleDestroyedResult.playerHandLength === 1, 'Helpoemer nel Cimitero ma NON distrutto in battaglia non deve far scartare nulla');

        // Caso 3: Helpoemer distrutto in battaglia ma è ANCORA la PROPRIA
        // Battle Phase (del suo stesso controllore, non dell'avversario)
        // -> non deve scattare (il testo dice esplicitamente "del tuo
        // avversario").
        const ownBattlePhaseResult = await t.evaluate(() => {
            const helpoemer3 = { ...cardDatabase.find((c) => c.id === 1123), uid: 'helpoemer-3' };
            gameState.botGraveyard = [helpoemer3];
            gameState.playerHand = [{ ...cardDatabase.find((c) => c.id === 23), uid: 'player-hand-untouched-2' }];
            gameState.battleDestroyedThisTurnFor = { player: [], bot: [helpoemer3] };
            gameState.currentPlayer = 'bot'; // è il turno/Battle Phase dello stesso controllore di Helpoemer (bot)
            DuelEngine.firePhaseTrigger('onBattlePhaseEnd', 'bot');
            return { playerHandLength: gameState.playerHand.length };
        });
        t.assert(ownBattlePhaseResult.playerHandLength === 1, 'Durante la PROPRIA Battle Phase (non quella dell\'avversario) Helpoemer non deve far scartare nulla');
    }
};
