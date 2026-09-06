// Quindicesima ondata: 3 carte richieste esplicitamente dall'utente al
// di fuori del backlog "prima serie" (id 1124-1126) — Falena Perfetta
// (Perfectly Ultimate Great Moth), Drago Meteora (Meteor Dragon, vanilla
// puro) e Drago Nero Meteora (Meteor Black Dragon, Fusione vanilla di
// Drago Nero Occhi Rossi + Drago Meteora). Zero infrastruttura nuova:
// Falena Perfetta riusa lo stesso schema già esistente di Larva
// Mostruosa (id 50)/Grande Falena (id 52) — solo la soglia "6° turno o
// successivo" cambia; Drago Nero Meteora riusa def.fusionMaterials, già
// generico (stesso schema di Drago Nero del Teschio id 102).
module.exports = {
    name: 'Quindicesima ondata: Falena Perfetta, Drago Meteora, Drago Nero Meteora (id 1124-1126)',
    async run(t) {
        // Falena Perfetta (1124): Special Summon dalla mano sacrificando
        // Falena Piccola SOLO al 6° turno proprio (o oltre) dopo
        // l'aggancio di Bozzolo dell'Evoluzione — non prima.
        const perfectMothResult = await t.evaluate(() => {
            const perfectMoth = { ...cardDatabase.find((c) => c.id === 1124) };
            const petitMoth = { ...cardDatabase.find((c) => c.id === 522), uid: 'petit-1' };
            gameState.playerHand = [perfectMoth];
            gameState.playerMonsterField = [{ card: petitMoth, position: 'attack', isFaceDown: false }, null, null, null, null];
            gameState.currentPlayer = 'player';

            // Turno 5° proprio (delta 10 sul contatore grezzo, < 12): NON deve poter Special Summonare ancora.
            petitMoth._cocoonEquippedOnTurn = 1;
            gameState.turn = 11; // 11 - 1 = 10 = 5 propri turni
            const tooEarly = DuelEngine.canSpecialSummonFromHand('player', 0);

            // Turno 6° proprio esatto (delta 12): deve poter Special Summonare.
            gameState.turn = 13; // 13 - 1 = 12 = 6 propri turni
            const exactlyOnTime = DuelEngine.canSpecialSummonFromHand('player', 0);

            // Turno 7° proprio (delta 14, oltre il 6°): "o successivo" -> deve poter Special Summonare comunque.
            gameState.turn = 15; // 15 - 1 = 14 = 7 propri turni
            const stillWorksLater = DuelEngine.canSpecialSummonFromHand('player', 0);
            const summoned = DuelEngine.trySpecialSummonFromHand('player', 0);
            const petitMothSacrificed = !gameState.playerMonsterField.some((s) => s && s.card.uid === 'petit-1');
            const petitMothInGraveyard = gameState.playerGraveyard.some((c) => c.uid === 'petit-1');

            return { tooEarly, exactlyOnTime, stillWorksLater, summoned, petitMothSacrificed, petitMothInGraveyard };
        });
        t.assert(!perfectMothResult.tooEarly, 'Falena Perfetta NON deve poter Special Summonarsi prima del 6° turno proprio dall\'aggancio');
        t.assert(perfectMothResult.exactlyOnTime, 'Falena Perfetta deve poter Special Summonarsi esattamente al 6° turno proprio');
        t.assert(perfectMothResult.stillWorksLater, 'Falena Perfetta deve poter Special Summonarsi anche OLTRE il 6° turno ("o successivo")');
        t.assert(perfectMothResult.summoned, 'Falena Perfetta deve riuscire davvero a Special Summonarsi');
        t.assert(perfectMothResult.petitMothSacrificed, 'Falena Piccola deve essere sacrificata (rimossa dal Terreno)');
        t.assert(perfectMothResult.petitMothInGraveyard, 'Falena Piccola sacrificata deve finire nel Cimitero');

        // Drago Meteora (1125): vanilla puro, statistiche corrette, nessun handler registrato.
        const meteorDragonResult = await t.evaluate(() => {
            const card = cardDatabase.find((c) => c.id === 1125);
            return {
                exists: !!card,
                vanilla: card && card.vanilla === true,
                stats: card && `${card.race}/${card.attribute}/${card.level}/${card.attack}/${card.defense}`,
                hasNoHandler: !DuelEngine.getDefinition(1125)
            };
        });
        t.assert(meteorDragonResult.exists, 'Drago Meteora deve esistere nel database carte');
        t.assert(meteorDragonResult.vanilla, 'Drago Meteora deve essere marcato come vanilla');
        t.assert(meteorDragonResult.stats === 'Drago/TERRA/6/1800/2000', `Statistiche di Drago Meteora errate (rilevate ${meteorDragonResult.stats})`);
        t.assert(meteorDragonResult.hasNoHandler, 'Drago Meteora non deve avere alcuna registrazione in CardEffects (vanilla puro)');

        // Drago Nero Meteora (1126): Fusione via Drago Nero Occhi Rossi (12) + Drago Meteora (1125), dalla mano.
        const meteorBlackDragonResult = await t.evaluate(() => {
            const fusion = { ...cardDatabase.find((c) => c.id === 1126) };
            const redEyes = { ...cardDatabase.find((c) => c.id === 12), uid: 'redeyes-1' };
            const meteorDragon = { ...cardDatabase.find((c) => c.id === 1125), uid: 'meteordragon-1' };
            gameState.playerHand = [redEyes, meteorDragon];
            gameState.playerMonsterField = [null, null, null, null, null];
            gameState.playerExtraDeck = [fusion];
            gameState.playerGraveyard = [];
            const fusable = DuelEngine.getFusableExtraDeckMonsters('player');
            const match = fusable.find((f) => f.card.id === 1126);
            let summoned = false;
            if (match) {
                summoned = DuelEngine.actions.fusionSummon('player', match.extraDeckIndex, match.materialLocations);
            }
            return {
                foundAsFusable: !!match,
                summoned: summoned,
                fusionOnField: gameState.playerMonsterField.some((s) => s && s.card.id === 1126),
                materialsInGraveyard: gameState.playerGraveyard.length === 2,
                handEmpty: gameState.playerHand.length === 0
            };
        });
        t.assert(meteorBlackDragonResult.foundAsFusable, 'Drago Nero Meteora deve risultare fondibile avendo entrambi i materiali in mano');
        t.assert(meteorBlackDragonResult.summoned, 'Drago Nero Meteora deve riuscire a Evocarsi per Fusione');
        t.assert(meteorBlackDragonResult.fusionOnField, 'Drago Nero Meteora deve finire sul Terreno dopo la Fusione');
        t.assert(meteorBlackDragonResult.materialsInGraveyard, 'Entrambi i materiali (Drago Nero Occhi Rossi + Drago Meteora) devono finire nel Cimitero');
        t.assert(meteorBlackDragonResult.handEmpty, 'La mano deve restare vuota dopo aver consumato entrambi i materiali');
    }
};
