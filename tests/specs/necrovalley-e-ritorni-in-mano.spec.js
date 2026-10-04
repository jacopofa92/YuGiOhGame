// Necrovalley (id 890) e i ritorni in mano (Criosfinge id 761), dopo il
// censimento 1.0.35:
//  - gli spostamenti dal Cimitero scritti a mano passano ora da
//    ACTIONS.graveyardMoveNegated (il guardrail-necrovalley sorveglia che
//    restino tutti coperti; qui si prova che il controllo FUNZIONI);
//  - l'eccezione del Capo dei Guardiani della Tomba (id 899) vale anche lì;
//  - le rinascite "alla prossima Standby Phase" si fermano con Necrovalley,
//    e col Terreno pieno la carta torna DAVVERO nel Cimitero (prima spariva);
//  - un mostro rubato rimandato in mano torna al PROPRIETARIO, e Criosfinge
//    fa scartare lui.
module.exports = {
    name: 'Necrovalley ferma gli spostamenti dal Cimitero; i mostri tornano nella mano del proprietario',
    async run(t) {
        const prepara = () => t.evaluate(() => {
            if (typeof clearPhaseTransitionTimeout === 'function') clearPhaseTransitionTimeout();
            window.DuelEngineUI = null; // scelte automatiche: qui conta il motore, non il picker
            gameState.playerLP = 8000;
            gameState.botLP = 8000;
            gameState.gameOver = false;
            gameState.playerMonsterField = [null, null, null, null, null];
            gameState.botMonsterField = [null, null, null, null, null];
            gameState.playerSTField = [null, null, null, null, null];
            gameState.botSTField = [null, null, null, null, null];
            gameState.playerFieldSpell = null;
            gameState.botFieldSpell = null;
            gameState.playerGraveyard = [];
            gameState.botGraveyard = [];
            gameState.playerHand = [];
            gameState.botHand = [];
            gameState.delayedGraveyardRevivals = [];
            gameState.chain = { links: [], active: false };
            DuelEngine.recomputeStaticEffects();
        });
        const conNecrovalley = () => t.evaluate(() => {
            gameState.botFieldSpell = { card: { ...cardDatabase.find((c) => c.id === 890), uid: 'necro' }, isFaceDown: false };
        });

        // --- Ptera Nero (805): senza Necrovalley torna in mano, con no ---
        for (const necro of [false, true]) {
            await prepara();
            if (necro) await conNecrovalley();
            const esito = await t.evaluate(() => {
                const ptera = { ...cardDatabase.find((c) => c.id === 805), uid: 'ptera' };
                gameState.playerGraveyard = [ptera];
                DuelEngine.getDefinition(805).onDestroy(DuelEngine.makeContext('player', { card: ptera, destroyedByOpponentCard: false }));
                return { mano: gameState.playerHand.map((c) => c.uid), cimitero: gameState.playerGraveyard.map((c) => c.uid) };
            });
            if (necro) {
                t.assert(esito.mano.length === 0 && esito.cimitero.includes('ptera'), `805 con Necrovalley: resta nel Cimitero (${JSON.stringify(esito)})`);
            } else {
                t.assert(esito.mano.includes('ptera'), `805 senza Necrovalley: torna in mano (${JSON.stringify(esito)})`);
            }
        }

        // --- Capo dei Guardiani (899): il SUO Cimitero non è protetto ---
        await prepara();
        await conNecrovalley();
        const capo = await t.evaluate(() => {
            gameState.playerMonsterField[0] = { card: { ...cardDatabase.find((c) => c.id === 899), uid: 'capo' }, position: 'attack', isFaceDown: false };
            const ptera = { ...cardDatabase.find((c) => c.id === 805), uid: 'ptera2' };
            gameState.playerGraveyard = [ptera];
            DuelEngine.getDefinition(805).onDestroy(DuelEngine.makeContext('player', { card: ptera, destroyedByOpponentCard: false }));
            return gameState.playerHand.map((c) => c.uid);
        });
        t.assert(capo.includes('ptera2'), `Col Capo dei Guardiani in campo il proprio Cimitero non è protetto da Necrovalley (${JSON.stringify(capo)})`);

        // --- Falcos (1108): Cimitero dell'AVVERSARIO protetto ---
        await prepara();
        await conNecrovalley();
        const falcos = await t.evaluate(() => {
            const vittima = { ...cardDatabase.find((c) => c.type === 'monster' && !c.extraDeck), uid: 'vittima' };
            gameState.botGraveyard = [vittima];
            gameState.botDeck = [];
            gameState.botDeckCount = 0;
            DuelEngine.getDefinition(1108).onDestroysMonsterByBattle(DuelEngine.makeContext('player', {
                card: { ...cardDatabase.find((c) => c.id === 1108), uid: 'falcos' },
                destroyedCard: vittima, destroyedCardOwner: 'bot', destroyedWasAttackPosition: true
            }));
            return { cimitero: gameState.botGraveyard.length, deck: gameState.botDeck.length };
        });
        t.assert(falcos.cimitero === 1 && falcos.deck === 0, `1108 con Necrovalley: il mostro resta nel Cimitero avversario (${JSON.stringify(falcos)})`);

        // --- Rinascita a tempo: Necrovalley la ferma al momento giusto ---
        await prepara();
        const rinascita = await t.evaluate(() => {
            const vamp = { ...cardDatabase.find((c) => c.type === 'monster' && !c.extraDeck), uid: 'rinasce' };
            DuelEngine.makeContext('player', {}).reviveFromGraveyardWithCountdown('player', vamp, 1);
            // Necrovalley arriva DOPO che la rinascita è stata programmata:
            // conta il momento in cui la carta lascerebbe il Cimitero.
            gameState.botFieldSpell = { card: { ...cardDatabase.find((c) => c.id === 890), uid: 'necro2' }, isFaceDown: false };
            DuelEngine.processDelayedGraveyardRevivals('player');
            return { campo: gameState.playerMonsterField.some((s) => s && s.card.uid === 'rinasce'), cimitero: gameState.playerGraveyard.some((c) => c.uid === 'rinasce') };
        });
        t.assert(!rinascita.campo && rinascita.cimitero, `Rinascita con Necrovalley: la carta resta nel Cimitero (${JSON.stringify(rinascita)})`);

        // --- Rinascita a tempo col Terreno pieno: la carta non sparisce ---
        await prepara();
        const pieno = await t.evaluate(() => {
            const base = cardDatabase.find((c) => c.type === 'monster' && !c.extraDeck);
            gameState.playerMonsterField = [0, 1, 2, 3, 4].map((i) => ({ card: { ...base, uid: 'pieno' + i }, position: 'attack', isFaceDown: false }));
            const vamp = { ...base, uid: 'rinasce2' };
            DuelEngine.makeContext('player', {}).reviveFromGraveyardWithCountdown('player', vamp, 1);
            DuelEngine.processDelayedGraveyardRevivals('player');
            return gameState.playerGraveyard.some((c) => c.uid === 'rinasce2');
        });
        t.assert(pieno, 'Rinascita col Terreno pieno: la carta torna davvero nel Cimitero, come dice il log');

        // --- Un mostro rubato torna nella mano del PROPRIETARIO ---
        await prepara();
        const rubato = await t.evaluate(() => {
            const base = cardDatabase.find((c) => c.type === 'monster' && !c.extraDeck);
            gameState.botMonsterField[0] = { card: { ...base, uid: 'del-bot' }, position: 'attack', isFaceDown: false };
            gameState.botHand = [{ ...base, uid: 'mano-bot' }];
            // Criosfinge in campo: "quel proprietario" scarta 1 carta.
            gameState.playerMonsterField[1] = { card: { ...cardDatabase.find((c) => c.id === 761), uid: 'crio' }, position: 'attack', isFaceDown: false };
            const ctx = DuelEngine.makeContext('player', {});
            ctx.takeControl('player', 'bot', 0);
            const idx = gameState.playerMonsterField.findIndex((s) => s && s.card.uid === 'del-bot');
            ctx.returnMonsterToHand('player', idx);
            return {
                manoPlayer: gameState.playerHand.map((c) => c.uid),
                manoBot: gameState.botHand.map((c) => c.uid),
                cimiteroBot: gameState.botGraveyard.map((c) => c.uid)
            };
        });
        t.assert(!rubato.manoPlayer.includes('del-bot'), `Il mostro rubato NON finisce nella mano di chi l'ha rubato (${JSON.stringify(rubato)})`);
        t.assert(rubato.manoBot.includes('del-bot'), `Torna nella mano del proprietario (${JSON.stringify(rubato)})`);
        t.assert(rubato.cimiteroBot.length === 1, `Criosfinge fa scartare il proprietario, non chi lo controllava (${JSON.stringify(rubato)})`);
    }
};
