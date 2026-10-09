// Deroga Toon del progetto: le liste Starter restano immutate, cambiano
// soltanto gli effetti dell'archetipo. Questo spec blocca i quattro cardini
// concordati e la nota tecnica invisibile col vecchio testo ufficiale.
module.exports = {
    name: 'Rework Toon: Mondo, attacco immediato, protezione e note legacy',
    async run(t) {
        const r = await t.evaluate(() => {
            resetGameState();
            const copia = (id, uid) => ({ ...cardDatabase.find((c) => c.id === id), uid });
            const world = copia(487, 'world');
            const toon = copia(481, 'toon');

            // Regressione UI/motore: non basta verificare Mondo già scoperto.
            // Il giocatore deve poterlo selezionare in mano e ottenere il
            // comando "Attiva"; canActivate richiede un handler activate
            // anche quando tutto il lavoro successivo vive in static().
            gameState.playerHand = [world];
            const attivabileDallaMano = DuelEngine.canActivate('player', 'hand', 0);
            gameState.playerHand = [];
            gameState.playerSTField[0] = { card: world, isFaceDown: false };
            gameState.playerMonsterField[0] = { card: toon, position: 'attack', isFaceDown: false, summonedOnTurn: gameState.turn };

            DuelEngine.recomputeStaticEffects();
            const diretto = !!gameState.directAttackAllowedUids[toon.uid];
            const regolaScontroToon = DuelEngine.getDefinition(481).mustTargetFilterIfPresent(copia(483, 'toon-nemico'), 'player')
                && !DuelEngine.getDefinition(481).mustTargetFilterIfPresent(copia(202, 'non-toon'), 'player');
            const ctxNemico = DuelEngine.makeContext('bot', { card: copia(7, 'distruzione') });
            ctxNemico.destroyMonster('player', 0);
            const protetto = !!gameState.playerMonsterField[0];
            const lpDopoProtezione = gameState.playerLP;
            ctxNemico.destroyMonster('player', 0);
            const secondaPassa = !gameState.playerMonsterField[0] && gameState.playerGraveyard.some((c) => c.uid === toon.uid);

            const toon2 = copia(481, 'toon-2');
            gameState.playerMonsterField[0] = { card: toon2, position: 'attack', isFaceDown: false };
            DuelEngine.actions.destroySpellTrap.call(ctxNemico, 'player', 0);
            const sopravviveSenzaWorld = !!gameState.playerMonsterField[0];

            const defDrago = DuelEngine.getDefinition(123);
            const defSirena = DuelEngine.getDefinition(484);

            // Abbandonato non deve più restare un boss "muto" in mano
            // all'IA. Facile usa intenzionalmente la Media; Hard applica
            // la stessa linea e poi seleziona il bersaglio più pericoloso.
            const relinquished = copia(416, 'relinquished-ai');
            gameState.botMonsterField = [{ card: relinquished, position: 'attack', isFaceDown: false }, null, null, null, null];
            gameState.playerMonsterField = [{ card: copia(481, 'bersaglio-ai'), position: 'attack', isFaceDown: false }, null, null, null, null];
            gameState.currentPlayer = 'bot';
            gameState.phase = 'main1';
            const sceltaMedia = AI_MEDIUM.chooseSetCardActivation(gameState, 'bot');
            const sceltaHard = AI_HARD.chooseSetCardActivation(gameState, 'bot');

            // Mille Occhi deve restituire l'Equip anche se viene bandito,
            // sacrificato o rimandato in mano, non soltanto se distrutto.
            const restrict = copia(476, 'restrict-cleanup');
            const assorbito = copia(481, 'assorbito-cleanup');
            restrict._restrictTarget = assorbito;
            restrict._restrictFromOwner = 'player';
            gameState.playerMonsterField = [null, null, null, null, null];
            DuelEngine.getDefinition(476).onBanished(DuelEngine.makeContext('bot', { card: restrict }));
            const milleOcchiRipristina = gameState.playerMonsterField.some((slot) => slot && slot.card.uid === assorbito.uid);
            return {
                attivabileDallaMano,
                diretto,
                regolaScontroToon,
                protetto,
                lpDopoProtezione,
                secondaPassa,
                sopravviveSenzaWorld,
                dragoAttaccaSubito: !defDrago.cannotAttackTurnSummoned && !defDrago.requiresLifePointsToAttack,
                sirenaAttaccaSubito: !defSirena.cannotAttackTurnSummoned && !defSirena.requiresLifePointsToAttack,
                iaUsaAbbandonato: sceltaMedia && sceltaMedia.card.id === 416 && sceltaHard && sceltaHard.card.id === 416,
                milleOcchiRipristina,
                noteLegacy: [123, 483, 484, 486, 487, 606].every((id) => {
                    const card = cardDatabase.find((c) => c.id === id);
                    return card && typeof card.legacyOfficialEffect === 'string' && card.legacyOfficialEffect.length > 10;
                })
            };
        });
        t.assert(r.attivabileDallaMano, `Mondo dei Toon deve mostrare l'azione Attiva quando è in mano: ${JSON.stringify(r)}`);
        t.assert(r.diretto, `Mondo dei Toon deve concedere l'attacco diretto: ${JSON.stringify(r)}`);
        t.assert(r.regolaScontroToon, `Con due Mondi i Toon devono affrontare prima i Toon avversari: ${JSON.stringify(r)}`);
        t.assert(r.protetto && r.lpDopoProtezione === 7500, `La prima distruzione deve essere prevenuta pagando 500 LP: ${JSON.stringify(r)}`);
        t.assert(r.secondaPassa, `La seconda distruzione nello stesso turno deve riuscire: ${JSON.stringify(r)}`);
        t.assert(r.sopravviveSenzaWorld, `Distruggere Mondo dei Toon non deve più distruggere i Toon: ${JSON.stringify(r)}`);
        t.assert(r.dragoAttaccaSubito && r.sirenaAttaccaSubito, `I Toon evocati devono poter attaccare subito senza costo d'attacco: ${JSON.stringify(r)}`);
        t.assert(r.iaUsaAbbandonato, `Media e Hard devono usare l'assorbimento di Abbandonato: ${JSON.stringify(r)}`);
        t.assert(r.milleOcchiRipristina, `Mille Occhi deve liberare il mostro assorbito comunque lasci il Terreno: ${JSON.stringify(r)}`);
        t.assert(r.noteLegacy, `Ogni effetto Toon sostituito deve conservare legacyOfficialEffect: ${JSON.stringify(r)}`);
    }
};
