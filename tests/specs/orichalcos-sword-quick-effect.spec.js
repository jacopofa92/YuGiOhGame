// Spada Sigillante di Orichalcos (id 396): terza clausola, l'Effetto
// Veloce "scarta 1 carta per distruggere 1 carta scoperta sul Terreno,
// una volta per turno" — usabile anche durante il turno avversario.
// Nuovo checkpoint generico findSpellTrapQuickEffectCandidates
// (duel-engine.js, gemello di findMonsterQuickEffectCandidates già
// esistente per i mostri) più una coppia di hook dedicata
// (canActivateAsQuickEffect/activateAsQuickEffect) sulla carta stessa,
// per non confondersi con le sue altre due abilità (aggancio ed
// estensione, che restano sulla normale canActivate/activate). Verifica
// sia i singoli hook direttamente sia l'integrazione reale nella Chain
// (DuelEngine.activateCard + finestra di priorità), stesso pattern di
// chain-resolution.spec.js.
module.exports = {
    name: "Spada Sigillante di Orichalcos: Effetto Veloce scarta-per-distruggere, anche durante il turno avversario (id 396)",
    async run(t) {
        // 1) canActivateAsQuickEffect: falso se non ancora agganciata, falso
        // con la mano vuota (nessun costo pagabile), vero altrimenti.
        const r1 = await t.evaluate(() => {
            const sword = { ...cardDatabase.find((c) => c.id === 396), uid: 'sword-1' };
            const monster = { ...cardDatabase.find((c) => c.type === 'monster' && c.subtype === 'effect' && !c.extraDeck), uid: 'monster-1' };
            gameState.playerMonsterField = [{ card: monster, position: 'attack', isFaceDown: false }, null, null, null, null];
            gameState.playerSTField = [null, null, null, null, null];
            gameState.playerHand = [];
            const notEquippedResult = DuelEngine.getDefinition(396).canActivateAsQuickEffect(DuelEngine.makeContext('player', { card: sword }));

            sword.equippedToOwner = 'player';
            sword.equippedToIndex = 0;
            sword.equippedToUid = 'monster-1';
            gameState.playerSTField[0] = { card: sword, isFaceDown: false };
            const emptyHandResult = DuelEngine.getDefinition(396).canActivateAsQuickEffect(DuelEngine.makeContext('player', { card: sword }));

            gameState.playerHand = [{ ...cardDatabase.find((c) => c.type === 'monster'), uid: 'fodder-1' }];
            gameState.botMonsterField = [{ card: { ...cardDatabase.find((c) => c.type === 'monster'), uid: 'oppmon-1' }, position: 'attack', isFaceDown: false }, null, null, null, null];
            const readyResult = DuelEngine.getDefinition(396).canActivateAsQuickEffect(DuelEngine.makeContext('player', { card: sword }));

            return { notEquippedResult, emptyHandResult, readyResult };
        });
        t.assert(!r1.notEquippedResult, "Non ancora agganciata: l'Effetto Veloce non deve essere disponibile");
        t.assert(!r1.emptyHandResult, 'Con la mano vuota (nessuna carta da scartare come costo): non deve essere disponibile');
        t.assert(r1.readyResult, 'Agganciata, con una carta in mano e un bersaglio sul Terreno: deve essere disponibile');

        // 2) activateAsQuickEffect: scarta 1 carta, distrugge un mostro
        // dell'avversario (priorità al campo avversario), rispetta il
        // limite una volta per turno.
        const r2 = await t.evaluate(() => {
            const sword2 = { ...cardDatabase.find((c) => c.id === 396), uid: 'sword-2', equippedToOwner: 'player', equippedToIndex: 0, equippedToUid: 'monster-2' };
            const monster2 = { ...cardDatabase.find((c) => c.type === 'monster' && c.subtype === 'effect' && !c.extraDeck), uid: 'monster-2' };
            const oppMonster = { ...cardDatabase.find((c) => c.type === 'monster' && !c.extraDeck), uid: 'oppmon-2' };
            const fodder = { ...cardDatabase.find((c) => c.type === 'monster'), uid: 'fodder-2' };
            gameState.playerMonsterField = [{ card: monster2, position: 'attack', isFaceDown: false }, null, null, null, null];
            gameState.playerSTField = [{ card: sword2, isFaceDown: false }, null, null, null, null];
            gameState.playerHand = [fodder];
            gameState.playerGraveyard = [];
            gameState.botMonsterField = [{ card: oppMonster, position: 'attack', isFaceDown: false }, null, null, null, null];

            DuelEngine.getDefinition(396).activateAsQuickEffect(DuelEngine.makeContext('player', { card: sword2 }));
            const secondAttemptAllowed = DuelEngine.getDefinition(396).canActivateAsQuickEffect(DuelEngine.makeContext('player', { card: sword2 }));

            return {
                handEmpty: gameState.playerHand.length === 0,
                fodderInGraveyard: gameState.playerGraveyard.some((c) => c.uid === 'fodder-2'),
                oppMonsterDestroyed: !gameState.botMonsterField.some((s) => s && s.card.uid === 'oppmon-2'),
                secondAttemptAllowed
            };
        });
        t.assert(r2.handEmpty, 'Deve scartare la carta dalla mano come costo');
        t.assert(r2.fodderInGraveyard, 'La carta scartata deve finire nel Cimitero');
        t.assert(r2.oppMonsterDestroyed, "Deve distruggere il mostro dell'avversario (priorità al campo avversario)");
        t.assert(!r2.secondAttemptAllowed, 'Una volta usato in questo turno, non deve essere riattivabile di nuovo (limite una volta per turno)');

        // 3) Nessun mostro scoperto disponibile: deve poter distruggere una
        // carta scoperta in zona Magia/Trappola (il testo reale copre "1
        // carta scoperta sul Terreno", non solo i mostri — a differenza del
        // checkpoint di targeting condiviso, che legge solo la zona Mostro).
        const r3 = await t.evaluate(() => {
            const sword3 = { ...cardDatabase.find((c) => c.id === 396), uid: 'sword-3', equippedToOwner: 'player', equippedToIndex: 0, equippedToUid: 'monster-3' };
            const monster3 = { ...cardDatabase.find((c) => c.type === 'monster' && c.subtype === 'effect' && !c.extraDeck), uid: 'monster-3' };
            const oppSpell = { ...cardDatabase.find((c) => c.type === 'spell' && c.subtype === 'continuous'), uid: 'oppspell-3' };
            const fodder3 = { ...cardDatabase.find((c) => c.type === 'monster'), uid: 'fodder-3' };
            gameState.playerMonsterField = [{ card: monster3, position: 'attack', isFaceDown: false }, null, null, null, null];
            gameState.playerSTField = [{ card: sword3, isFaceDown: false }, null, null, null, null];
            gameState.playerHand = [fodder3];
            gameState.playerGraveyard = [];
            gameState.botMonsterField = [null, null, null, null, null];
            gameState.botSTField = [{ card: oppSpell, isFaceDown: false }, null, null, null, null];
            gameState.botGraveyard = [];

            DuelEngine.getDefinition(396).activateAsQuickEffect(DuelEngine.makeContext('player', { card: sword3 }));

            return {
                oppSpellDestroyed: !gameState.botSTField.some((s) => s && s.card.uid === 'oppspell-3'),
                oppSpellInGraveyard: gameState.botGraveyard.some((c) => c.uid === 'oppspell-3')
            };
        });
        t.assert(r3.oppSpellDestroyed, 'Senza mostri scoperti disponibili, deve poter distruggere una Magia/Trappola scoperta dell\'avversario');
        t.assert(r3.oppSpellInGraveyard, 'La carta distrutta deve finire nel Cimitero');

        // 4) Integrazione REALE nella Chain: quando il GIOCATORE attiva una
        // carta (fittizia), il BOT con Spada Sigillante già agganciata deve
        // poter rispondere con l'Effetto Veloce attraverso la vera finestra
        // di priorità (DuelEngine.activateCard + openActivationWindow),
        // stesso pattern di chain-resolution.spec.js — risposta lato bot
        // per restare deterministico (BotAI, nessun modale reale da pilotare).
        await t.evaluate(() => {
            CardEffects.register(90396, {
                canActivate() { return true; },
                activate(ctx) { window.__testLog = window.__testLog || []; window.__testLog.push('FAKE_SPELL_RESOLVE:' + ctx.owner); }
            });
        });
        const r4 = await t.evaluate(() => {
            return new Promise((resolve) => {
                window.__testLog = [];
                gameState.turn = 5;
                const sword4 = { ...cardDatabase.find((c) => c.id === 396), uid: 'sword-4', equippedToOwner: 'bot', equippedToIndex: 0, equippedToUid: 'botmonster-4' };
                const botMonster4 = { ...cardDatabase.find((c) => c.type === 'monster' && c.subtype === 'effect' && !c.extraDeck), uid: 'botmonster-4' };
                const playerMonster4 = { ...cardDatabase.find((c) => c.type === 'monster' && !c.extraDeck), uid: 'playermon-4' };
                const botFodder4 = { ...cardDatabase.find((c) => c.type === 'monster'), uid: 'botfodder-4' };
                gameState.botMonsterField = [{ card: botMonster4, position: 'attack', isFaceDown: false }, null, null, null, null];
                gameState.botSTField = [{ card: sword4, isFaceDown: false }, null, null, null, null];
                gameState.botHand = [botFodder4];
                gameState.botGraveyard = [];
                gameState.playerMonsterField = [{ card: playerMonster4, position: 'attack', isFaceDown: false }, null, null, null, null];
                gameState.playerHand = [{ id: 90396, uid: 'fakespell-4', name: 'Fake Spell', type: 'spell', subtype: 'normal' }];
                gameState.playerGraveyard = [];

                const activated = DuelEngine.activateCard('player', 'hand', 0);
                const start = Date.now();
                const poll = () => {
                    if (!DuelEngine.isChainActive() || Date.now() - start > 15000) {
                        resolve({
                            activated,
                            log: window.__testLog.slice(),
                            botFodderInGraveyard: gameState.botGraveyard.some((c) => c.uid === 'botfodder-4'),
                            playerMonsterDestroyed: !gameState.playerMonsterField.some((s) => s && s.card.uid === 'playermon-4')
                        });
                        return;
                    }
                    setTimeout(poll, 100);
                };
                setTimeout(poll, 100);
            });
        });
        t.assert(r4.activated, 'Il giocatore deve poter attivare la carta fittizia');
        t.assert(r4.botFodderInGraveyard, "Il bot deve aver risposto con l'Effetto Veloce di Spada Sigillante, scartando una carta come costo");
        t.assert(r4.playerMonsterDestroyed, 'Il mostro del giocatore deve essere stato distrutto dalla risposta del bot');
        t.assert(r4.log.includes('FAKE_SPELL_RESOLVE:player'), 'La carta fittizia del giocatore deve comunque risolversi alla fine della Chain');
    }
};
