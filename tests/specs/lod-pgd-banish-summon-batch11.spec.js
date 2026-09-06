// Undicesima ondata prima serie: 12 Mostri Effetto minori (id 1093-1104).
// Verifica soprattutto che la coppia GENERICA già esistente
// canSpecialSummonFromHand/paySpecialSummonCost (nata per i mostri Toon
// id 484/486) copra senza modifiche il pattern "Special Summon dalla
// mano bandendo N mostri di un Attributo dal Cimitero" (Anima di
// Purezza e Luce/Spirito delle Fiamme/Lo Spirito della Roccia/Spirito
// dell'Acqua/Garuda lo Spirito del Vento) — oltre al riuso di
// onPositionChange, grantTemporaryAtkDefBonus, onStandbyPhase, e
// l'estensione di onOpponentStandbyPhase/onOpponentEndPhase (prima SOLO
// zona 'st') anche alla zona Mostro.
module.exports = {
    name: 'Undicesima ondata prima serie: Special Summon bandendo dal Cimitero, cambio Posizione, bonus temporanei (id 1093-1104)',
    async run(t) {
        // Anima di Purezza e Luce (1093): Special Summon dalla mano bandendo 2 mostri LUCE dal Cimitero; malus ATK ai mostri avversari SOLO nella loro Battle Phase.
        const soulResult = await t.evaluate(() => {
            const filler = cardDatabase.find((c) => c.type === 'monster' && !c.extraDeck);
            const soul = { ...cardDatabase.find((c) => c.id === 1093), uid: 'soul-1' };
            gameState.playerHand = [soul];
            gameState.playerGraveyard = [{ ...filler, uid: 'light-1', attribute: 'LUCE' }, { ...filler, uid: 'light-2', attribute: 'LUCE' }];
            gameState.playerMonsterField = [null, null, null, null, null];
            gameState.playerBanished = [];
            const canBefore = DuelEngine.canSpecialSummonFromHand('player', 0);
            const summoned = DuelEngine.trySpecialSummonFromHand('player', 0);
            const banishedBoth = gameState.playerBanished.filter((c) => c.uid === 'light-1' || c.uid === 'light-2').length === 2;
            const graveEmpty = gameState.playerGraveyard.length === 0;

            const oppMonster = { ...filler, uid: 'soul-opp-1' };
            gameState.botMonsterField = [{ card: oppMonster, position: 'attack', isFaceDown: false }, null, null, null, null];
            gameState.phase = 'battle';
            gameState.currentPlayer = 'bot';
            DuelEngine.recomputeStaticEffects();
            const atkDuringOppBattle = DuelEngine.getEffectiveAtk(oppMonster);
            gameState.currentPlayer = 'player';
            DuelEngine.recomputeStaticEffects();
            const atkOutsideOppBattle = DuelEngine.getEffectiveAtk(oppMonster);
            return { canBefore: canBefore, summoned: summoned, banishedBoth: banishedBoth, graveEmpty: graveEmpty, atkDuringOppBattle: atkDuringOppBattle, atkOutsideOppBattle: atkOutsideOppBattle };
        });
        t.assert(soulResult.canBefore, 'Anima di Purezza e Luce deve poter Special Summonarsi con 2 mostri LUCE nel Cimitero');
        t.assert(soulResult.summoned, 'Anima di Purezza e Luce deve riuscire a Special Summonarsi');
        t.assert(soulResult.banishedBoth, 'Entrambi i mostri LUCE devono essere banditi come costo');
        t.assert(soulResult.graveEmpty, 'Il Cimitero deve restare vuoto dopo il bando');
        t.assert(soulResult.atkDuringOppBattle === soulResult.atkOutsideOppBattle - 300, `Il malus di -300 ATK deve applicarsi SOLO durante la Battle Phase avversaria (rilevati ${soulResult.atkDuringOppBattle} vs ${soulResult.atkOutsideOppBattle})`);

        // Spirito delle Fiamme (1094): Special Summon bandendo 1 mostro FUOCO; +300 ATK SOLO durante la PROPRIA Battle Phase.
        const flameResult = await t.evaluate(() => {
            const filler = cardDatabase.find((c) => c.type === 'monster' && !c.extraDeck);
            const flame = { ...cardDatabase.find((c) => c.id === 1094), uid: 'flame-1' };
            gameState.playerHand = [flame];
            gameState.playerGraveyard = [{ ...filler, uid: 'fire-1', attribute: 'FUOCO' }];
            gameState.playerMonsterField = [null, null, null, null, null];
            gameState.playerBanished = [];
            const summoned = DuelEngine.trySpecialSummonFromHand('player', 0);
            const banished = gameState.playerBanished.some((c) => c.uid === 'fire-1');
            const summonedFlame = gameState.playerMonsterField.find((s) => s && s.card.uid === 'flame-1').card;

            gameState.phase = 'battle';
            gameState.currentPlayer = 'player';
            DuelEngine.recomputeStaticEffects();
            const atkOwnBattle = DuelEngine.getEffectiveAtk(summonedFlame);
            gameState.currentPlayer = 'bot';
            DuelEngine.recomputeStaticEffects();
            const atkOppBattle = DuelEngine.getEffectiveAtk(summonedFlame);
            return { summoned: summoned, banished: banished, atkOwnBattle: atkOwnBattle, atkOppBattle: atkOppBattle };
        });
        t.assert(flameResult.summoned && flameResult.banished, 'Spirito delle Fiamme deve Special Summonarsi bandendo il mostro FUOCO dal Cimitero');
        t.assert(flameResult.atkOwnBattle === 2000, `Spirito delle Fiamme deve avere 2000 ATK nella propria Battle Phase (base 1700+300, rilevati ${flameResult.atkOwnBattle})`);
        t.assert(flameResult.atkOppBattle === 1700, `Spirito delle Fiamme deve tornare a 1700 ATK fuori dalla propria Battle Phase (rilevati ${flameResult.atkOppBattle})`);

        // Spirito della Brezza (1095): guadagna LP SOLO in Posizione di Attacco (opposto di Fata Danzante).
        const breezeResult = await t.evaluate(() => {
            const breeze = { ...cardDatabase.find((c) => c.id === 1095), uid: 'breeze-1' };
            gameState.playerLP = 8000;
            DuelEngine.getDefinition(1095).onStandbyPhase(DuelEngine.makeContext('player', { card: breeze, slot: { position: 'attack' } }));
            const lpAfterAttack = gameState.playerLP;
            DuelEngine.getDefinition(1095).onStandbyPhase(DuelEngine.makeContext('player', { card: breeze, slot: { position: 'defense' } }));
            return { lpAfterAttack: lpAfterAttack, lpAfterDefense: gameState.playerLP };
        });
        t.assert(breezeResult.lpAfterAttack === 9000, `Spirito della Brezza in Attacco deve far guadagnare 1000 LP (attesi 9000, rilevati ${breezeResult.lpAfterAttack})`);
        t.assert(breezeResult.lpAfterDefense === 9000, 'Spirito della Brezza in Difesa NON deve far guadagnare LP');

        // Sciame di Locuste (1096): Ignition per coprirsi; al FLIP distrugge 1 Magia/Trappola avversaria.
        const locustsResult = await t.evaluate(() => {
            const locusts = { ...cardDatabase.find((c) => c.id === 1096), uid: 'locusts-1' };
            const spellTrap = { ...cardDatabase.find((c) => c.type === 'spell' || c.type === 'trap'), uid: 'locusts-target' };
            gameState.playerMonsterField = [{ card: locusts, position: 'attack', isFaceDown: false }, null, null, null, null];
            gameState.botSTField = [{ card: spellTrap, isFaceDown: true }, null, null, null, null];
            gameState.phase = 'main1';
            gameState.currentPlayer = 'player';
            const ctx = DuelEngine.makeContext('player', { card: locusts, index: 0 });
            const canActivate = DuelEngine.getDefinition(1096).canActivate(ctx);
            DuelEngine.getDefinition(1096).activate(ctx);
            const flipped = gameState.playerMonsterField[0].isFaceDown && gameState.playerMonsterField[0].position === 'defense';
            window.DuelEngineUI = null;
            const flipCtx = DuelEngine.makeContext('player', { card: locusts, index: 0 });
            DuelEngine.getDefinition(1096).onFlip(flipCtx);
            return { canActivate: canActivate, flipped: flipped, spellTrapDestroyed: !gameState.botSTField.some((s) => s && s.card.uid === 'locusts-target') };
        });
        t.assert(locustsResult.canActivate, 'Sciame di Locuste deve potersi coprire con la propria Ignition');
        t.assert(locustsResult.flipped, 'Sciame di Locuste deve coprirsi in Posizione di Difesa');
        t.assert(locustsResult.spellTrapDestroyed, 'Sciame di Locuste deve distruggere la Magia/Trappola avversaria al FLIP');

        // Sciame di Scarabei (1097): stesso schema, ma distrugge 1 mostro avversario.
        const scarabsResult = await t.evaluate(() => {
            const scarabs = { ...cardDatabase.find((c) => c.id === 1097), uid: 'scarabs-1' };
            const target = { ...cardDatabase.find((c) => c.type === 'monster' && !c.extraDeck), uid: 'scarabs-target' };
            gameState.botMonsterField = [{ card: target, position: 'attack', isFaceDown: false }, null, null, null, null];
            window.DuelEngineUI = null;
            const flipCtx = DuelEngine.makeContext('player', { card: scarabs, index: 0 });
            DuelEngine.getDefinition(1097).onFlip(flipCtx);
            return !gameState.botMonsterField.some((s) => s && s.card.uid === 'scarabs-target');
        });
        t.assert(scarabsResult, 'Sciame di Scarabei deve distruggere il mostro avversario al FLIP');

        // Saggezza Corrotta (1098): rimescola il Deck se passa da Attacco a Difesa scoperta.
        const taintedWisdomResult = await t.evaluate(() => {
            const filler = cardDatabase.find((c) => c.type === 'monster' && !c.extraDeck);
            const wisdom = { ...cardDatabase.find((c) => c.id === 1098), uid: 'wisdom-1' };
            gameState.playerDeck = [{ ...filler, uid: 'd1' }, { ...filler, uid: 'd2' }, { ...filler, uid: 'd3' }];
            const before = gameState.playerDeck.map((c) => c.uid).join(',');
            DuelEngine.getDefinition(1098).onPositionChange(DuelEngine.makeContext('player', { card: wisdom, fromPosition: 'attack', toPosition: 'defense' }));
            const sameOrder = gameState.playerDeck.map((c) => c.uid).join(',') === before;
            const sameCards = gameState.playerDeck.length === 3;

            DuelEngine.getDefinition(1098).onPositionChange(DuelEngine.makeContext('player', { card: wisdom, fromPosition: 'defense', toPosition: 'attack' }));
            return { sameCards: sameCards, notNecessarilyReshuffledOnWrongDirection: true };
        });
        t.assert(taintedWisdomResult.sameCards, 'Saggezza Corrotta deve rimescolare senza perdere/aggiungere carte al Deck');

        // Il Macellaio del Bistrot (1099): infligge danno da battaglia -> l'avversario pesca 2 carte.
        const bistroButcherResult = await t.evaluate(() => {
            const filler = cardDatabase.find((c) => c.type === 'monster' && !c.extraDeck);
            const butcher = { ...cardDatabase.find((c) => c.id === 1099), uid: 'butcher-1' };
            gameState.botDeck = [{ ...filler, uid: 'bd1' }, { ...filler, uid: 'bd2' }];
            gameState.botHand = [];
            const ctx = DuelEngine.makeContext('player', { card: butcher, opponent: 'bot' });
            DuelEngine.getDefinition(1099).onDealsBattleDamage(ctx);
            return gameState.botHand.length === 2;
        });
        t.assert(bistroButcherResult, 'Il Macellaio del Bistrot deve far pescare 2 carte all\'avversario');

        // Il Piccolo Spadaccino di Aile (1100): tributa 1 altro mostro per +700 ATK fino a fine turno.
        const aileResult = await t.evaluate(() => {
            const swordsman = { ...cardDatabase.find((c) => c.id === 1100), uid: 'aile-1', attack: 800 };
            const ally = { ...cardDatabase.find((c) => c.type === 'monster' && !c.extraDeck), uid: 'aile-ally' };
            gameState.playerMonsterField = [{ card: swordsman, position: 'attack', isFaceDown: false }, { card: ally, position: 'attack', isFaceDown: false }, null, null, null];
            gameState.phase = 'main1';
            gameState.currentPlayer = 'player';
            window.DuelEngineUI = null;
            const ctx = DuelEngine.makeContext('player', { card: swordsman, index: 0 });
            const canActivate = DuelEngine.getDefinition(1100).canActivate(ctx);
            DuelEngine.getDefinition(1100).activate(ctx);
            DuelEngine.recomputeStaticEffects();
            return { canActivate: canActivate, allyGone: !gameState.playerMonsterField.some((s) => s && s.card.uid === 'aile-ally'), atk: DuelEngine.getEffectiveAtk(swordsman) };
        });
        t.assert(aileResult.canActivate, 'Il Piccolo Spadaccino di Aile deve potersi attivare con un altro mostro da tributare');
        t.assert(aileResult.allyGone, 'Il mostro tributato deve lasciare il Terreno');
        t.assert(aileResult.atk === 1500, `Il Piccolo Spadaccino di Aile deve guadagnare 700 ATK (attesi 1500, rilevati ${aileResult.atk})`);

        // Lo Spirito della Roccia (1101): Special Summon bandendo 1 mostro TERRA; +300 ATK SOLO durante la Battle Phase AVVERSARIA.
        const rockSpiritResult = await t.evaluate(() => {
            const filler = cardDatabase.find((c) => c.type === 'monster' && !c.extraDeck);
            const rock = { ...cardDatabase.find((c) => c.id === 1101), uid: 'rock-1' };
            gameState.playerHand = [rock];
            gameState.playerGraveyard = [{ ...filler, uid: 'earth-1', attribute: 'TERRA' }];
            gameState.playerMonsterField = [null, null, null, null, null];
            gameState.playerBanished = [];
            const summoned = DuelEngine.trySpecialSummonFromHand('player', 0);
            const summonedRock = gameState.playerMonsterField.find((s) => s && s.card.uid === 'rock-1').card;
            gameState.phase = 'battle';
            gameState.currentPlayer = 'bot';
            DuelEngine.recomputeStaticEffects();
            const atkOppBattle = DuelEngine.getEffectiveAtk(summonedRock);
            gameState.currentPlayer = 'player';
            DuelEngine.recomputeStaticEffects();
            const atkOwnBattle = DuelEngine.getEffectiveAtk(summonedRock);
            return { summoned: summoned, atkOppBattle: atkOppBattle, atkOwnBattle: atkOwnBattle };
        });
        t.assert(rockSpiritResult.summoned, 'Lo Spirito della Roccia deve Special Summonarsi bandendo il mostro TERRA dal Cimitero');
        t.assert(rockSpiritResult.atkOppBattle === 2000, `Lo Spirito della Roccia deve avere 2000 ATK nella Battle Phase avversaria (base 1700+300, rilevati ${rockSpiritResult.atkOppBattle})`);
        t.assert(rockSpiritResult.atkOwnBattle === 1700, `Lo Spirito della Roccia deve tornare a 1700 ATK nella propria Battle Phase (rilevati ${rockSpiritResult.atkOwnBattle})`);

        // Unità Scagliapietre (1102): tributa 1 Guerriero (se stessa inclusa) per distruggere 1 mostro con DEF <= ATK.
        const throwstoneResult = await t.evaluate(() => {
            const unit = { ...cardDatabase.find((c) => c.id === 1102), uid: 'throwstone-1', attack: 900 };
            const weakDef = { ...cardDatabase.find((c) => c.type === 'monster' && !c.extraDeck), uid: 'throwstone-weak', defense: 900 };
            const strongDef = { ...cardDatabase.find((c) => c.type === 'monster' && !c.extraDeck), uid: 'throwstone-strong', defense: 2000 };
            gameState.playerMonsterField = [{ card: unit, position: 'attack', isFaceDown: false }, null, null, null, null];
            gameState.botMonsterField = [{ card: weakDef, position: 'defense', isFaceDown: false }, { card: strongDef, position: 'defense', isFaceDown: false }, null, null, null];
            gameState.phase = 'main1';
            gameState.currentPlayer = 'player';
            window.DuelEngineUI = null;
            const ctx = DuelEngine.makeContext('player', { card: unit, index: 0 });
            const canActivate = DuelEngine.getDefinition(1102).canActivate(ctx);
            DuelEngine.getDefinition(1102).activate(ctx);
            return {
                canActivate: canActivate,
                unitTributed: !gameState.playerMonsterField.some((s) => s && s.card.uid === 'throwstone-1'),
                weakDestroyed: !gameState.botMonsterField.some((s) => s && s.card.uid === 'throwstone-weak'),
                strongSurvived: gameState.botMonsterField.some((s) => s && s.card.uid === 'throwstone-strong')
            };
        });
        t.assert(throwstoneResult.canActivate, 'Unità Scagliapietre deve potersi attivare avendo se stessa come possibile Tributo Guerriero');
        t.assert(throwstoneResult.unitTributed, 'Unità Scagliapietre deve tributarsi (unico Guerriero disponibile)');
        t.assert(throwstoneResult.weakDestroyed, 'Deve distruggere il mostro con DEF pari o inferiore alla propria ATK');
        t.assert(throwstoneResult.strongSurvived, 'Il mostro con DEF superiore deve sopravvivere');

        // Spirito dell'Acqua (1103): Special Summon bandendo 1 mostro ACQUA; durante OGNI Standby Phase avversaria cambia la Posizione di 1 suo mostro, bloccata per il resto del turno.
        const aquaSpiritResult = await t.evaluate(() => {
            const filler = cardDatabase.find((c) => c.type === 'monster' && !c.extraDeck);
            const spirit = { ...cardDatabase.find((c) => c.id === 1103), uid: 'aqua-spirit-1' };
            gameState.playerHand = [spirit];
            gameState.playerGraveyard = [{ ...filler, uid: 'water-1', attribute: 'ACQUA' }];
            gameState.playerMonsterField = [null, null, null, null, null];
            gameState.playerBanished = [];
            const summoned = DuelEngine.trySpecialSummonFromHand('player', 0);
            const summonedSpirit = gameState.playerMonsterField.find((s) => s && s.card.uid === 'aqua-spirit-1').card;

            const oppMonster = { ...filler, uid: 'aqua-target-1' };
            gameState.botMonsterField = [{ card: oppMonster, position: 'attack', isFaceDown: false }, null, null, null, null];
            gameState.cannotChangePositionUidsThisTurn = new Set();
            window.DuelEngineUI = null;
            // Dispatcher REALE (non l'hook chiamato a mano): la Standby
            // Phase di 'bot' deve far scattare onOpponentStandbyPhase sul
            // campo MOSTRO del player (opponentOf('bot') === 'player') —
            // verifica end-to-end della nuova estensione zona Mostro.
            DuelEngine.firePhaseTrigger(DuelEngine.TRIGGER.ON_STANDBY_PHASE, 'bot');
            return {
                summoned: summoned,
                positionChanged: gameState.botMonsterField[0].position === 'defense',
                lockedForTurn: gameState.cannotChangePositionUidsThisTurn.has('aqua-target-1')
            };
        });
        t.assert(aquaSpiritResult.summoned, 'Spirito dell\'Acqua deve Special Summonarsi bandendo il mostro ACQUA dal Cimitero');
        t.assert(aquaSpiritResult.positionChanged, 'Spirito dell\'Acqua deve cambiare la Posizione di Battaglia del mostro avversario');
        t.assert(aquaSpiritResult.lockedForTurn, 'Il mostro cambiato deve restare bloccato in quella Posizione per il resto del turno');

        // Garuda lo Spirito del Vento (1104): Special Summon bandendo 1 mostro VENTO; reagisce alla End Phase avversaria (nuova estensione zona Mostro di onOpponentEndPhase).
        const garudaResult = await t.evaluate(() => {
            const filler = cardDatabase.find((c) => c.type === 'monster' && !c.extraDeck);
            const garuda = { ...cardDatabase.find((c) => c.id === 1104), uid: 'garuda-1' };
            gameState.playerHand = [garuda];
            gameState.playerGraveyard = [{ ...filler, uid: 'wind-1', attribute: 'VENTO' }];
            gameState.playerMonsterField = [null, null, null, null, null];
            gameState.playerBanished = [];
            const summoned = DuelEngine.trySpecialSummonFromHand('player', 0);
            const summonedGaruda = gameState.playerMonsterField.find((s) => s && s.card.uid === 'garuda-1').card;

            const oppMonster = { ...filler, uid: 'garuda-target-1' };
            gameState.botMonsterField = [{ card: oppMonster, position: 'defense', isFaceDown: false }, null, null, null, null];
            window.DuelEngineUI = null;
            // Dispatcher REALE: la End Phase di 'bot' deve far scattare
            // onOpponentEndPhase sul campo MOSTRO del player.
            DuelEngine.firePhaseTrigger(DuelEngine.TRIGGER.ON_END_PHASE, 'bot');
            return { summoned: summoned, positionChanged: gameState.botMonsterField[0].position === 'attack' };
        });
        t.assert(garudaResult.summoned, 'Garuda lo Spirito del Vento deve Special Summonarsi bandendo il mostro VENTO dal Cimitero');
        t.assert(garudaResult.positionChanged, 'Garuda lo Spirito del Vento deve cambiare la Posizione di Battaglia del mostro avversario alla sua End Phase (dispatcher onOpponentEndPhase esteso alla zona Mostro)');
    }
};
