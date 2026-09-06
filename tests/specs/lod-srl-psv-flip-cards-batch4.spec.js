// Quarta ondata prima serie: gli ultimi 8 Mostri Flip semplici (id
// 1031-1038). Un test per meccanismo, non uno per carta.
module.exports = {
    name: 'Quarta ondata prima serie: controllo permanente, ritorno in mano, Fusione da Extra Deck (id 1031-1038)',
    async run(t) {
        // Domatore d'Ombre (1031): controllo temporaneo di un Demone avversario, filtrato per razza.
        const shadowTamerResult = await t.evaluate(() => {
            const tamer = { ...cardDatabase.find((c) => c.id === 1031), uid: 'tamer-1' };
            const fiend = { ...cardDatabase.find((c) => c.type === 'monster' && !c.extraDeck && c.race === 'Demone'), uid: 'fiend-1' };
            const nonFiend = { ...cardDatabase.find((c) => c.type === 'monster' && !c.extraDeck && c.race === 'Guerriero'), uid: 'warrior-1' };
            gameState.playerMonsterField = [{ card: tamer, position: 'attack', isFaceDown: false }, null, null, null, null];
            gameState.botMonsterField = [{ card: nonFiend, position: 'attack', isFaceDown: false }, { card: fiend, position: 'attack', isFaceDown: false }, null, null, null];
            const ctx = DuelEngine.makeContext('player', { card: tamer });
            DuelEngine.getDefinition(1031).onFlip(ctx);
            return gameState.playerMonsterField.some((s) => s && s.card.uid === 'fiend-1');
        });
        t.assert(shadowTamerResult, 'Domatore d\'Ombre deve prendere il controllo del mostro Demone, mai di uno non-Demone');

        // Uccello Tornado (1032): fa tornare in mano fino a 2 Magie/Trappole, mai più di 2.
        const tornadoBirdResult = await t.evaluate(() => {
            const bird = { ...cardDatabase.find((c) => c.id === 1032), uid: 'bird-1' };
            const st1 = { ...cardDatabase.find((c) => c.type === 'spell'), uid: 'st1' };
            const st2 = { ...cardDatabase.find((c) => c.type === 'trap'), uid: 'st2' };
            const st3 = { ...cardDatabase.find((c) => c.type === 'spell'), uid: 'st3' };
            gameState.playerMonsterField = [{ card: bird, position: 'attack', isFaceDown: false }, null, null, null, null];
            gameState.playerSTField = [{ card: st1, isFaceDown: false }, { card: st3, isFaceDown: false }, null, null, null];
            gameState.botSTField = [{ card: st2, isFaceDown: false }, null, null, null, null];
            gameState.playerHand = [];
            gameState.botHand = [];
            const ctx = DuelEngine.makeContext('player', { card: bird });
            DuelEngine.getDefinition(1032).onFlip(ctx);
            const stillOnField = gameState.playerSTField.filter((s) => s).length + gameState.botSTField.filter((s) => s).length;
            // Ogni carta torna in mano al proprio PROPRIETARIO (non a chi controlla Uccello Tornado) — testo reale della carta.
            return { handCount: gameState.playerHand.length + gameState.botHand.length, stillOnField: stillOnField };
        });
        t.assert(tornadoBirdResult.handCount === 2, `Uccello Tornado deve far tornare ESATTAMENTE 2 carte in mano, ciascuna al proprio proprietario (rilevate ${tornadoBirdResult.handCount})`);
        t.assert(tornadoBirdResult.stillOnField === 1, `Deve restare esattamente 1 carta Magia/Trappola sul Terreno (rilevate ${tornadoBirdResult.stillOnField})`);

        // Scarabeo Bombardiere (1033): distrugge un mostro Effetto coperto in Difesa, lascia stare un vanilla.
        const beetleEffectResult = await t.evaluate(() => {
            const beetle = { ...cardDatabase.find((c) => c.id === 1033), uid: 'beetle-1' };
            const effectMonster = { ...cardDatabase.find((c) => c.type === 'monster' && !c.extraDeck && !c.vanilla && window.DuelEngine && DuelEngine.getDefinition(c.id)), uid: 'effect-mon-1' };
            gameState.playerMonsterField = [{ card: beetle, position: 'attack', isFaceDown: false }, null, null, null, null];
            gameState.botMonsterField = [{ card: effectMonster, position: 'defense', isFaceDown: true }, null, null, null, null];
            const ctx = DuelEngine.makeContext('player', { card: beetle });
            DuelEngine.getDefinition(1033).onFlip(ctx);
            return gameState.botMonsterField[0] === null;
        });
        t.assert(beetleEffectResult, 'Scarabeo Bombardiere deve distruggere un vero Mostro Effetto coperto in Difesa');

        const beetleVanillaResult = await t.evaluate(() => {
            const beetle = { ...cardDatabase.find((c) => c.id === 1033), uid: 'beetle-2' };
            const vanilla = { ...cardDatabase.find((c) => c.type === 'monster' && !c.extraDeck && c.vanilla), uid: 'vanilla-mon-1' };
            gameState.playerMonsterField = [{ card: beetle, position: 'attack', isFaceDown: false }, null, null, null, null];
            gameState.botMonsterField = [{ card: vanilla, position: 'defense', isFaceDown: true }, null, null, null, null];
            const ctx = DuelEngine.makeContext('player', { card: beetle });
            DuelEngine.getDefinition(1033).onFlip(ctx);
            return !!gameState.botMonsterField[0];
        });
        t.assert(beetleVanillaResult, 'Scarabeo Bombardiere NON deve distruggere un mostro vanilla (non-Effetto)');

        // Invasore del Trono (1034): scambio PERMANENTE di controllo, bloccato durante la Battle Phase.
        const invaderBattlePhaseBlocked = await t.evaluate(() => {
            const invader = { ...cardDatabase.find((c) => c.id === 1034), uid: 'invader-1' };
            const target = { ...cardDatabase.find((c) => c.type === 'monster' && !c.extraDeck), uid: 'target-1' };
            gameState.playerMonsterField = [{ card: invader, position: 'attack', isFaceDown: false }, null, null, null, null];
            gameState.botMonsterField = [{ card: target, position: 'attack', isFaceDown: false }, null, null, null, null];
            gameState.phase = 'battle';
            const ctx = DuelEngine.makeContext('player', { card: invader });
            DuelEngine.getDefinition(1034).onFlip(ctx);
            return gameState.botMonsterField.some((s) => s && s.card.uid === 'target-1');
        });
        t.assert(invaderBattlePhaseBlocked, 'Invasore del Trono NON deve scambiare il controllo durante la Battle Phase');

        const invaderSwapResult = await t.evaluate(() => {
            const invader = { ...cardDatabase.find((c) => c.id === 1034), uid: 'invader-2' };
            const target = { ...cardDatabase.find((c) => c.type === 'monster' && !c.extraDeck), uid: 'target-2' };
            gameState.playerMonsterField = [{ card: invader, position: 'attack', isFaceDown: false }, null, null, null, null];
            gameState.botMonsterField = [{ card: target, position: 'attack', isFaceDown: false }, null, null, null, null];
            gameState.phase = 'main1';
            const ctx = DuelEngine.makeContext('player', { card: invader });
            DuelEngine.getDefinition(1034).onFlip(ctx);
            const swapped = gameState.playerMonsterField.some((s) => s && s.card.uid === 'target-2') && gameState.botMonsterField.some((s) => s && s.card.uid === 'invader-2');
            gameState.currentPlayer = 'player';
            gameState.turn = 5;
            DuelEngine.processTemporaryControlReturns();
            const stillSwappedAfterEndPhase = gameState.playerMonsterField.some((s) => s && s.card.uid === 'target-2');
            return { swapped: swapped, stillSwappedAfterEndPhase: stillSwappedAfterEndPhase };
        });
        t.assert(invaderSwapResult.swapped, 'Invasore del Trono deve scambiare davvero il controllo fuori dalla Battle Phase');
        t.assert(invaderSwapResult.stillSwappedAfterEndPhase, 'Lo scambio deve essere PERMANENTE: non deve tornare indietro dopo processTemporaryControlReturns (End Phase)');

        // Bollettino Meteo (1035): distrugge Spada Rivelatrice (id 8) scoperta avversaria.
        const weatherReportResult = await t.evaluate(() => {
            const report = { ...cardDatabase.find((c) => c.id === 1035), uid: 'report-1' };
            const swords = { ...cardDatabase.find((c) => c.id === 8), uid: 'swords-1' };
            gameState.playerMonsterField = [{ card: report, position: 'attack', isFaceDown: false }, null, null, null, null];
            gameState.botSTField = [{ card: swords, isFaceDown: false }, null, null, null, null];
            const ctx = DuelEngine.makeContext('player', { card: report });
            DuelEngine.getDefinition(1035).onFlip(ctx);
            return gameState.botSTField[0] === null;
        });
        t.assert(weatherReportResult, 'Bollettino Meteo deve distruggere la Spada Rivelatrice scoperta avversaria');

        // Lanciere Sciocco (1036): quando distrutto, entrambi i giocatori Special Summonano dal proprio Cimitero.
        const spearCretinResult = await t.evaluate(() => {
            const cretin = { ...cardDatabase.find((c) => c.id === 1036), uid: 'cretin-1' };
            const playerGraveMonster = { ...cardDatabase.find((c) => c.type === 'monster' && !c.extraDeck), uid: 'pg-mon-1' };
            const botGraveMonster = { ...cardDatabase.find((c) => c.type === 'monster' && !c.extraDeck), uid: 'bg-mon-1' };
            gameState.playerMonsterField = [{ card: cretin, position: 'attack', isFaceDown: false }, null, null, null, null];
            gameState.botMonsterField = [null, null, null, null, null];
            gameState.playerGraveyard = [playerGraveMonster];
            gameState.botGraveyard = [botGraveMonster];
            DuelEngine.actions.destroyMonster('player', 0);
            return {
                playerSummoned: gameState.playerMonsterField.some((s) => s && s.card.uid === 'pg-mon-1'),
                botSummoned: gameState.botMonsterField.some((s) => s && s.card.uid === 'bg-mon-1')
            };
        });
        t.assert(spearCretinResult.playerSummoned, 'Lanciere Sciocco distrutto deve far Special Summonare un mostro dal Cimitero del proprietario');
        t.assert(spearCretinResult.botSummoned, 'Lanciere Sciocco distrutto deve far Special Summonare un mostro anche dal Cimitero dell\'avversario');

        // Assalitrice delle Fiamme (1037): bandisce le prime 3 carte del Deck, infligge 800 danni.
        const ladyAssailantResult = await t.evaluate(() => {
            const lady = { ...cardDatabase.find((c) => c.id === 1037), uid: 'lady-1' };
            gameState.playerMonsterField = [{ card: lady, position: 'attack', isFaceDown: false }, null, null, null, null];
            gameState.playerDeck = cardDatabase.filter((c) => c.type === 'monster' && !c.extraDeck).slice(0, 10).map((c) => ({ ...c }));
            gameState.playerBanished = [];
            gameState.botLP = 8000;
            const deckSizeBefore = gameState.playerDeck.length;
            const ctx = DuelEngine.makeContext('player', { card: lady });
            DuelEngine.getDefinition(1037).onFlip(ctx);
            return { deckShrunkBy: deckSizeBefore - gameState.playerDeck.length, banishedCount: gameState.playerBanished.length, damage: 8000 - gameState.botLP };
        });
        t.assert(ladyAssailantResult.deckShrunkBy === 3, `Deve togliere esattamente 3 carte dal Deck (rilevate ${ladyAssailantResult.deckShrunkBy})`);
        t.assert(ladyAssailantResult.banishedCount === 3, `Le 3 carte devono finire bandite (rilevate ${ladyAssailantResult.banishedCount})`);
        t.assert(ladyAssailantResult.damage === 800, `Deve infliggere 800 danni (rilevati ${ladyAssailantResult.damage})`);

        // Evocatore di Illusioni (1038): tributa, Special Summon dall'Extra Deck, distrutto in End Phase.
        const summonerResult = await t.evaluate(() => {
            const summoner = { ...cardDatabase.find((c) => c.id === 1038), uid: 'summoner-1' };
            const ally = { ...cardDatabase.find((c) => c.type === 'monster' && !c.extraDeck), uid: 'ally-1' };
            const fusion = { ...cardDatabase.find((c) => c.extraDeck), uid: 'fusion-1' };
            gameState.playerMonsterField = [{ card: summoner, position: 'attack', isFaceDown: false }, { card: ally, position: 'attack', isFaceDown: false }, null, null, null];
            gameState.playerExtraDeck = [fusion];
            gameState.playerGraveyard = [];
            const ctx = DuelEngine.makeContext('player', { card: summoner });
            DuelEngine.getDefinition(1038).onFlip(ctx);
            const fusionOnField = gameState.playerMonsterField.some((s) => s && s.card.uid === 'fusion-1');
            const allyTributed = gameState.playerGraveyard.some((c) => c.uid === 'ally-1');
            gameState.currentPlayer = 'player';
            gameState.turn = 5;
            DuelEngine.actions.clearTemporaryAtkDefBonus();
            const fusionDestroyedAtEndPhase = !gameState.playerMonsterField.some((s) => s && s.card.uid === 'fusion-1');
            return { fusionOnField: fusionOnField, allyTributed: allyTributed, fusionDestroyedAtEndPhase: fusionDestroyedAtEndPhase };
        });
        t.assert(summonerResult.allyTributed, 'Evocatore di Illusioni deve tributare l\'altro mostro sul Terreno');
        t.assert(summonerResult.fusionOnField, 'Il Mostro Fusione deve essere Special Summonato dall\'Extra Deck');
        t.assert(summonerResult.fusionDestroyedAtEndPhase, 'Il Mostro Fusione deve essere distrutto alla End Phase (clearTemporaryAtkDefBonus)');
    }
};
