// Dodicesima ondata prima serie: 10 Mostri Effetto minori (id 1105-1114).
// Verifica soprattutto il nuovo hook def.onDestroysMonsterByBattle
// (actions.js/fireOnDestroy) — una reazione di questo motore dal lato
// di chi VINCE uno scontro in battaglia, per TUTTI i casi (a differenza
// del più vecchio def.onDestroysMonsterInBattle, che copre solo il caso
// "l'attaccante vince", riusato qui per Lupo Bicefalo) — e il nuovo
// store generico gameState.untilOpponentTurnAtkDefBonus (Bazoo il
// Divora-Anime).
module.exports = {
    name: 'Dodicesima ondata prima serie: distruzione in battaglia dal lato del vincitore, bonus fino al turno avversario (id 1105-1114)',
    async run(t) {
        // Drago Tiranno (1105): secondo attacco condizionato ai mostri avversari residui; nega e distrugge le Trappole che lo bersagliano.
        const tyrantResult = await t.evaluate(() => {
            const dragon = { ...cardDatabase.find((c) => c.id === 1105), uid: 'tyrant-1' };
            const oppMonster = { ...cardDatabase.find((c) => c.type === 'monster' && !c.extraDeck), uid: 'tyrant-opp-1' };
            gameState.botMonsterField = [{ card: oppMonster, position: 'attack', isFaceDown: false }, null, null, null, null];
            const extraWithOpp = DuelEngine.getDefinition(1105).getExtraAttackCount(DuelEngine.makeContext('player', { card: dragon }));
            gameState.botMonsterField = [null, null, null, null, null];
            const extraWithoutOpp = DuelEngine.getDefinition(1105).getExtraAttackCount(DuelEngine.makeContext('player', { card: dragon }));

            const trap = { ...cardDatabase.find((c) => c.type === 'trap'), uid: 'tyrant-trap-1' };
            gameState.botSTField = [{ card: trap, isFaceDown: true }, null, null, null, null];
            gameState.botGraveyard = [];
            // Stesso schema di reactCtx dentro declareCardEffectTarget
            // (duel-engine.js): cancel()/cancelled vanno passati come
            // campi extra a makeContext, non sono presenti di default.
            const ctx = DuelEngine.makeContext('player', {
                card: dragon, sourceCard: trap, sourceType: 'trap', sourceOwner: 'bot',
                cancelled: false, cancel() { this.cancelled = true; }
            });
            DuelEngine.getDefinition(1105).onCardEffectTargetDeclare(ctx);
            return { extraWithOpp: extraWithOpp, extraWithoutOpp: extraWithoutOpp, trapDestroyed: !gameState.botSTField.some((s) => s && s.card.uid === 'tyrant-trap-1'), cancelled: ctx.cancelled === true };
        });
        t.assert(tyrantResult.extraWithOpp === 1, 'Drago Tiranno deve poter attaccare due volte se l\'avversario controlla ancora un mostro');
        t.assert(tyrantResult.extraWithoutOpp === 0, 'Drago Tiranno NON deve poter attaccare due volte se l\'avversario non controlla mostri');
        t.assert(tyrantResult.trapDestroyed, 'Drago Tiranno deve distruggere la Trappola che lo sceglie come bersaglio');
        t.assert(tyrantResult.cancelled, 'Drago Tiranno deve negare l\'attivazione della Trappola (ctx.cancel())');

        // Vampire Baby (1106): distrugge un mostro in battaglia -> alla fine della Battle Phase lo Special Summona sul proprio Terreno.
        const vampireBabyResult = await t.evaluate(() => {
            const vampire = { ...cardDatabase.find((c) => c.id === 1106), uid: 'vampire-1' };
            const prey = { ...cardDatabase.find((c) => c.type === 'monster' && !c.extraDeck), uid: 'vampire-prey' };
            gameState.playerMonsterField = [{ card: vampire, position: 'attack', isFaceDown: false }, null, null, null, null];
            gameState.botGraveyard = [prey];
            const destroyCtx = DuelEngine.makeContext('player', { card: vampire, destroyedCard: prey, destroyedCardOwner: 'bot' });
            DuelEngine.getDefinition(1106).onDestroysMonsterByBattle(destroyCtx);
            const endCtx = DuelEngine.makeContext('player', { card: vampire });
            DuelEngine.getDefinition(1106).onBattlePhaseEnd(endCtx);
            const revived = gameState.playerMonsterField.find((s) => s && s.card.uid === 'vampire-prey');
            return { revived: !!revived, removedFromGrave: !gameState.botGraveyard.some((c) => c.uid === 'vampire-prey') };
        });
        t.assert(vampireBabyResult.revived, 'Vampire Baby deve Special Summonare il mostro distrutto in battaglia alla fine della Battle Phase');
        t.assert(vampireBabyResult.removedFromGrave, 'Il mostro rianimato deve lasciare il Cimitero avversario');

        // Vampire Baby: se non ha distrutto nulla, o se non era lo stesso turno, non deve fare nulla.
        const vampireBabyNoOpResult = await t.evaluate(() => {
            const vampire = { ...cardDatabase.find((c) => c.id === 1106), uid: 'vampire-2' };
            gameState.playerMonsterField = [{ card: vampire, position: 'attack', isFaceDown: false }, null, null, null, null];
            const endCtx = DuelEngine.makeContext('player', { card: vampire });
            DuelEngine.getDefinition(1106).onBattlePhaseEnd(endCtx);
            return gameState.playerMonsterField.filter((s) => s).length === 1;
        });
        t.assert(vampireBabyNoOpResult, 'Vampire Baby non deve Special Summonare nulla se non ha distrutto un mostro questo turno');

        // Bazoo il Divora-Anime (1107): banditura fino a 3 mostri dal Cimitero, +300 ATK ciascuno FINO ALLA FINE DEL TURNO AVVERSARIO (store generico untilOpponentTurnAtkDefBonus).
        const bazooResult = await t.evaluate(() => {
            const filler = cardDatabase.find((c) => c.type === 'monster' && !c.extraDeck);
            const bazoo = { ...cardDatabase.find((c) => c.id === 1107), uid: 'bazoo-1' };
            gameState.playerMonsterField = [{ card: bazoo, position: 'attack', isFaceDown: false }, null, null, null, null];
            gameState.playerGraveyard = [{ ...filler, uid: 'bg-1' }, { ...filler, uid: 'bg-2' }, { ...filler, uid: 'bg-3' }, { ...filler, uid: 'bg-4' }];
            gameState.playerBanished = [];
            gameState.phase = 'main1';
            gameState.currentPlayer = 'player';
            gameState.untilOpponentTurnAtkDefBonus = {};
            gameState.untilOpponentTurnActiveUidsFor = { player: new Set(), bot: new Set() };
            const ctx = DuelEngine.makeContext('player', { card: bazoo, index: 0 });
            const canActivate = DuelEngine.getDefinition(1107).canActivate(ctx);
            DuelEngine.getDefinition(1107).activate(ctx);
            DuelEngine.recomputeStaticEffects();
            const atkAfterActivation = DuelEngine.getEffectiveAtk(bazoo);
            // Il ciclo in card-effects.js scandisce il Cimitero dalla FINE
            // (indice più alto) verso l'inizio, quindi le ultime 3 carte
            // aggiunte (bg-2/bg-3/bg-4) vengono bandite, non le prime 3.
            const banishedCount = gameState.playerBanished.filter((c) => ['bg-2', 'bg-3', 'bg-4'].includes(c.uid)).length;
            const oneLeftInGrave = gameState.playerGraveyard.some((c) => c.uid === 'bg-1');
            // changeTurn() è frozen dalla harness (freezeNaturalGameLoop,
            // vedi tests/README.md), quindi non possiamo chiamarla per
            // simulare il ritorno del turno del controllore — replichiamo
            // qui solo la porzione di reset rilevante (identica a quella
            // scritta in game-flow.js/changeTurn per questo stesso store).
            const untilOppSet = gameState.untilOpponentTurnActiveUidsFor.player;
            untilOppSet.forEach((uid) => { delete gameState.untilOpponentTurnAtkDefBonus[uid]; });
            untilOppSet.clear();
            DuelEngine.recomputeStaticEffects();
            const atkAfterExpiry = DuelEngine.getEffectiveAtk(bazoo);
            return { canActivate: canActivate, atkAfterActivation: atkAfterActivation, banishedCount: banishedCount, oneLeftInGrave: oneLeftInGrave, atkAfterExpiry: atkAfterExpiry };
        });
        t.assert(bazooResult.canActivate, 'Bazoo il Divora-Anime deve potersi attivare con mostri nel Cimitero');
        t.assert(bazooResult.banishedCount === 3, `Bazoo deve bandire fino a 3 mostri (rilevati ${bazooResult.banishedCount})`);
        t.assert(bazooResult.oneLeftInGrave, 'Il 4° mostro (il più vecchio, bg-1) nel Cimitero non deve essere toccato');
        t.assert(bazooResult.atkAfterActivation === 2500, `Bazoo deve guadagnare 300 ATK per ogni mostro bandito (attesi 1600+900=2500, rilevati ${bazooResult.atkAfterActivation})`);
        t.assert(bazooResult.atkAfterExpiry === 1600, `Il bonus di Bazoo deve sparire alla scadenza (attesi 1600, rilevati ${bazooResult.atkAfterExpiry})`);

        // Falcos il Saggio Alato (1108): rimanda in cima al Deck avversario SOLO se il mostro distrutto era in Posizione di Attacco.
        const falcosResult = await t.evaluate(() => {
            const falcos = { ...cardDatabase.find((c) => c.id === 1108), uid: 'falcos-1' };
            const preyAttack = { ...cardDatabase.find((c) => c.type === 'monster' && !c.extraDeck), uid: 'falcos-prey-atk' };
            gameState.botGraveyard = [preyAttack];
            gameState.botDeck = [];
            const ctxAttack = DuelEngine.makeContext('player', { card: falcos, destroyedCard: preyAttack, destroyedCardOwner: 'bot', destroyedWasAttackPosition: true });
            DuelEngine.getDefinition(1108).onDestroysMonsterByBattle(ctxAttack);
            const movedToDeck = gameState.botDeck.some((c) => c.uid === 'falcos-prey-atk');

            const preyDefense = { ...cardDatabase.find((c) => c.type === 'monster' && !c.extraDeck), uid: 'falcos-prey-def' };
            gameState.botGraveyard = [preyDefense];
            const ctxDefense = DuelEngine.makeContext('player', { card: falcos, destroyedCard: preyDefense, destroyedCardOwner: 'bot', destroyedWasAttackPosition: false });
            DuelEngine.getDefinition(1108).onDestroysMonsterByBattle(ctxDefense);
            const stayedInGrave = gameState.botGraveyard.some((c) => c.uid === 'falcos-prey-def');
            return { movedToDeck: movedToDeck, stayedInGrave: stayedInGrave };
        });
        t.assert(falcosResult.movedToDeck, 'Falcos il Saggio Alato deve rimandare in cima al Deck un mostro distrutto in Posizione di Attacco');
        t.assert(falcosResult.stayedInGrave, 'Falcos il Saggio Alato NON deve toccare un mostro distrutto in Posizione di Difesa');

        // Cavaliere Mistico di Sciacallo (1109): stesso schema, nessun vincolo di Posizione.
        const jackalResult = await t.evaluate(() => {
            const jackal = { ...cardDatabase.find((c) => c.id === 1109), uid: 'jackal-1' };
            const prey = { ...cardDatabase.find((c) => c.type === 'monster' && !c.extraDeck), uid: 'jackal-prey' };
            gameState.botGraveyard = [prey];
            gameState.botDeck = [];
            const ctx = DuelEngine.makeContext('player', { card: jackal, destroyedCard: prey, destroyedCardOwner: 'bot' });
            DuelEngine.getDefinition(1109).onDestroysMonsterByBattle(ctx);
            return gameState.botDeck.some((c) => c.uid === 'jackal-prey');
        });
        t.assert(jackalResult, 'Cavaliere Mistico di Sciacallo deve rimandare in cima al Deck avversario il mostro distrutto, indipendentemente dalla Posizione');

        // Mummia Errante (1110): Ignition una volta per turno per coprirsi.
        const mummyResult = await t.evaluate(() => {
            const mummy = { ...cardDatabase.find((c) => c.id === 1110), uid: 'mummy-1' };
            gameState.playerMonsterField = [{ card: mummy, position: 'attack', isFaceDown: false }, null, null, null, null];
            gameState.phase = 'main1';
            gameState.currentPlayer = 'player';
            const ctx = DuelEngine.makeContext('player', { card: mummy, index: 0 });
            const canActivate = DuelEngine.getDefinition(1110).canActivate(ctx);
            DuelEngine.getDefinition(1110).activate(ctx);
            return { canActivate: canActivate, flipped: gameState.playerMonsterField[0].isFaceDown && gameState.playerMonsterField[0].position === 'defense' };
        });
        t.assert(mummyResult.canActivate && mummyResult.flipped, 'Mummia Errante deve coprirsi in Posizione di Difesa con la propria Ignition');

        // Apprendista Strega (1111): +500 ATK ai mostri OSCURITÀ, -400 ATK ai mostri LUCE (Attributi invertiti rispetto a Hoshiningen).
        const witchResult = await t.evaluate(() => {
            const witch = { ...cardDatabase.find((c) => c.id === 1111), uid: 'witch-1' };
            const darkMonster = { ...cardDatabase.find((c) => c.type === 'monster' && c.attribute === 'OSCURITÀ' && !c.extraDeck), uid: 'witch-dark', attack: 1000 };
            const lightMonster = { ...cardDatabase.find((c) => c.type === 'monster' && c.attribute === 'LUCE' && !c.extraDeck), uid: 'witch-light', attack: 1000 };
            gameState.playerMonsterField = [{ card: witch, position: 'attack', isFaceDown: false }, { card: darkMonster, position: 'attack', isFaceDown: false }, null, null, null];
            gameState.botMonsterField = [{ card: lightMonster, position: 'attack', isFaceDown: false }, null, null, null, null];
            DuelEngine.recomputeStaticEffects();
            return { darkAtk: DuelEngine.getEffectiveAtk(darkMonster), lightAtk: DuelEngine.getEffectiveAtk(lightMonster) };
        });
        t.assert(witchResult.darkAtk === 1500, `Apprendista Strega deve dare +500 ATK ai mostri OSCURITÀ (attesi 1500, rilevati ${witchResult.darkAtk})`);
        t.assert(witchResult.lightAtk === 600, `Apprendista Strega deve dare -400 ATK ai mostri LUCE (attesi 600, rilevati ${witchResult.lightAtk})`);

        // Spirito Silvano (1112): manda al Cimitero 1 Equip agganciata a sé, infligge 500 danni.
        const sylvanResult = await t.evaluate(() => {
            const sprite = { ...cardDatabase.find((c) => c.id === 1112), uid: 'sprite-1' };
            const equip = { ...cardDatabase.find((c) => c.type === 'spell'), uid: 'sprite-equip', equippedToUid: 'sprite-1' };
            gameState.playerMonsterField = [{ card: sprite, position: 'attack', isFaceDown: false }, null, null, null, null];
            gameState.playerSTField = [{ card: equip, isFaceDown: false }, null, null, null, null];
            gameState.botLP = 8000;
            gameState.phase = 'main1';
            gameState.currentPlayer = 'player';
            window.DuelEngineUI = null;
            const ctx = DuelEngine.makeContext('player', { card: sprite, index: 0 });
            const canActivate = DuelEngine.getDefinition(1112).canActivate(ctx);
            DuelEngine.getDefinition(1112).activate(ctx);
            return { canActivate: canActivate, equipGone: !gameState.playerSTField.some((s) => s && s.card.uid === 'sprite-equip'), botLp: gameState.botLP };
        });
        t.assert(sylvanResult.canActivate, 'Spirito Silvano deve potersi attivare con un Equip agganciato');
        t.assert(sylvanResult.equipGone, 'L\'Equip deve finire al Cimitero');
        t.assert(sylvanResult.botLp === 7500, `Spirito Silvano deve infliggere 500 danni (attesi 7500, rilevati ${sylvanResult.botLp})`);

        // Yado Karu (1113): passando da Attacco a Difesa, rimanda la mano in fondo al Deck.
        const yadoKaruResult = await t.evaluate(() => {
            const filler = cardDatabase.find((c) => c.type === 'monster' && !c.extraDeck);
            const yado = { ...cardDatabase.find((c) => c.id === 1113), uid: 'yado-1' };
            gameState.playerHand = [{ ...filler, uid: 'h1' }, { ...filler, uid: 'h2' }];
            gameState.playerDeck = [{ ...filler, uid: 'd1' }];
            DuelEngine.getDefinition(1113).onPositionChange(DuelEngine.makeContext('player', { card: yado, fromPosition: 'attack', toPosition: 'defense' }));
            return { handEmpty: gameState.playerHand.length === 0, deckBottomHasHandCards: gameState.playerDeck[0].uid === 'h1' && gameState.playerDeck[1].uid === 'h2' };
        });
        t.assert(yadoKaruResult.handEmpty, 'Yado Karu deve svuotare la mano');
        t.assert(yadoKaruResult.deckBottomHasHandCards, 'Le carte della mano devono finire in fondo al Deck, nell\'ordine originale');

        // Lupo Bicefalo (1114): riusa l'ESISTENTE onDestroysMonsterInBattle (id 833) — nega per sempre gli effetti di un Mostro Flip distrutto, solo se controlla un ALTRO Demone.
        const twinHeadedWolfResult = await t.evaluate(() => {
            const wolf = { ...cardDatabase.find((c) => c.id === 1114), uid: 'wolf-1' };
            const otherFiend = { ...cardDatabase.find((c) => c.type === 'monster' && c.race === 'Demone' && c.id !== 1114), uid: 'wolf-fiend-2' };
            const flipMonster = { ...cardDatabase.find((c) => c.id === 23), uid: 'wolf-prey-flip' };
            gameState.playerMonsterField = [{ card: wolf, position: 'attack', isFaceDown: false }, null, null, null, null];
            gameState.monsterEffectsNegatedUidsFor = { player: new Set(), bot: new Set() };
            gameState.negatedEffectsForeverUids = new Set();
            // Senza un altro Demone sul proprio Terreno: NON deve negare nulla.
            const ctxNoFiend = DuelEngine.makeContext('player', { card: wolf, destroyedCard: flipMonster });
            DuelEngine.getDefinition(1114).onDestroysMonsterInBattle(ctxNoFiend);
            const negatedWithoutFiend = gameState.negatedEffectsForeverUids.has('wolf-prey-flip');

            // Con un altro Demone sul proprio Terreno: deve negare per sempre.
            gameState.playerMonsterField = [{ card: wolf, position: 'attack', isFaceDown: false }, { card: otherFiend, position: 'attack', isFaceDown: false }, null, null, null];
            const ctxWithFiend = DuelEngine.makeContext('player', { card: wolf, destroyedCard: flipMonster });
            DuelEngine.getDefinition(1114).onDestroysMonsterInBattle(ctxWithFiend);
            const negatedWithFiend = gameState.negatedEffectsForeverUids.has('wolf-prey-flip');

            // Un mostro NON Flip distrutto non deve mai essere toccato.
            const nonFlipMonster = { ...cardDatabase.find((c) => c.type === 'monster' && !c.extraDeck && !DuelEngine.getDefinition(c.id)?.onFlip), uid: 'wolf-prey-nonflip' };
            const ctxNonFlip = DuelEngine.makeContext('player', { card: wolf, destroyedCard: nonFlipMonster });
            DuelEngine.getDefinition(1114).onDestroysMonsterInBattle(ctxNonFlip);
            const nonFlipUntouched = !gameState.negatedEffectsForeverUids.has('wolf-prey-nonflip');
            return { negatedWithoutFiend: negatedWithoutFiend, negatedWithFiend: negatedWithFiend, nonFlipUntouched: nonFlipUntouched };
        });
        t.assert(!twinHeadedWolfResult.negatedWithoutFiend, 'Lupo Bicefalo NON deve negare nulla senza un altro mostro Demone sul proprio Terreno');
        t.assert(twinHeadedWolfResult.negatedWithFiend, 'Lupo Bicefalo deve negare per sempre gli effetti di un Mostro Flip distrutto, controllando un altro Demone');
        t.assert(twinHeadedWolfResult.nonFlipUntouched, 'Lupo Bicefalo NON deve toccare un mostro distrutto che non è un Mostro Flip');
    }
};
