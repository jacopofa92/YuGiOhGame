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
            const sceltaIaMondo = AI_HARD.chooseNextSpellTrapAction(gameState, {}, 'player');
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
            const toonRegistrati = [123, 481, 483, 484, 486, 606]
                .every((id) => DuelEngine.getDefinition(id)?.isToon === true);
            gameState.playerSTField[0] = { card: copia(487, 'world-shortcuts'), isFaceDown: false };
            gameState.playerMonsterField = [null, null, null, null, null];
            const sirenaSpeciale = defSirena.canSpecialSummonFromHand(
                DuelEngine.makeContext('player', { card: copia(484, 'mermaid-shortcut') })
            );
            gameState.playerMonsterField[0] = { card: copia(481, 'toon-cost-1'), position: 'attack', isFaceDown: false };
            const dragoSpeciale = defDrago.canSpecialSummonFromHand(
                DuelEngine.makeContext('player', { card: copia(123, 'dragon-shortcut') })
            );
            const teschioSpeciale = DuelEngine.getDefinition(486).canSpecialSummonFromHand(
                DuelEngine.makeContext('player', { card: copia(486, 'skull-shortcut') })
            );
            gameState.playerMonsterField[1] = { card: copia(202, 'generic-cost-2'), position: 'attack', isFaceDown: false };
            const mangaSpeciale = DuelEngine.getDefinition(606).canSpecialSummonFromHand(
                DuelEngine.makeContext('player', { card: copia(606, 'manga-shortcut') })
            );

            // Carte di supporto: Maschera deve trovare Mondo nella zona
            // Magie/Trappole, mentre Riavvolgimento può scegliere soltanto
            // un Toon, non un mostro generico.
            const maschera = copia(482, 'mask');
            gameState.playerSTField[0] = { card: copia(487, 'world-mask'), isFaceDown: false };
            gameState.botMonsterField = [{ card: copia(202, 'enemy'), position: 'attack', isFaceDown: false }, null, null, null, null];
            const mascheraConMondo = DuelEngine.getDefinition(482).canActivate(DuelEngine.makeContext('player', { card: maschera }));
            gameState.playerMonsterField = [{ card: copia(202, 'non-toon-rewind'), position: 'attack', isFaceDown: false }, null, null, null, null];
            const rewindSoloNonToon = DuelEngine.getDefinition(485).canActivate(DuelEngine.makeContext('player', { card: copia(485, 'rewind') }));
            gameState.playerMonsterField[1] = { card: copia(481, 'toon-rewind'), position: 'attack', isFaceDown: false };
            const rewindConToon = DuelEngine.getDefinition(485).canActivate(DuelEngine.makeContext('player', { card: copia(485, 'rewind-2') }));

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

            // Piano Fusione di Pegasus: Facile ne resta intenzionalmente
            // privo, mentre Normale/Difficile devono avere materiali,
            // Polimerizzazione e Restrizione nell'Extra Deck. Verifichiamo
            // anche il percorso usato davvero dall'IA, non soltanto la
            // definizione statica del Mostro Fusione.
            const pianoFusionePegasus = ['medium', 'hard'].every((livello) => {
                const deck = characterDeckDatabase.pegasus[livello];
                return [38, 416, 475].every((id) => deck.main.some((e) => e.id === id))
                    && deck.extra.some((e) => e.id === 476);
            }) && characterDeckDatabase.pegasus.easy.extra.length === 0;
            const hardPegasus = characterDeckDatabase.pegasus.hard;
            const pianoHardRiconoscibile = deckListCount(hardPegasus.main) === 40
                && [38, 416, 475].every((id) => hardPegasus.main.some((e) => e.id === id && e.qty === 2))
                // L'Occhio della Verità è meno efficiente di una rimozione,
                // ma appartiene all'identità di Pegasus e non va sacrificato
                // da futuri bilanciamenti puramente numerici.
                && hardPegasus.main.some((e) => e.id === 466);
            const poly = copia(38, 'poly-ai');
            gameState.botHand = [poly, copia(416, 'relinquished-material'), copia(475, 'idol-material')];
            gameState.botExtraDeck = [copia(476, 'restrict-fusion')];
            gameState.botMonsterField = [null, null, null, null, null];
            gameState.currentPlayer = 'bot';
            gameState.phase = 'main1';
            const opzioneFusione = DuelEngine.getFusableExtraDeckMonsters('bot').find((o) => o.card.id === 476);
            const fusioneAttivabile = DuelEngine.canActivate('bot', 'hand', 0);
            const sceltaFusioneIa = AI_MEDIUM.chooseNextSpellTrapAction(gameState, {}, 'bot');

            const restrictAttivo = copia(476, 'restrict-active');
            const debole = copia(481, 'restrict-weak');
            const forte = copia(1, 'restrict-strong');
            gameState.botMonsterField = [{ card: restrictAttivo, position: 'attack', isFaceDown: false }, null, null, null, null];
            gameState.playerMonsterField = [
                { card: debole, position: 'attack', isFaceDown: false },
                { card: forte, position: 'attack', isFaceDown: false },
                null, null, null
            ];
            gameState.livelloIA = { player: 'hard', bot: 'hard' };
            DuelEngine.getDefinition(476).activate(DuelEngine.makeContext('bot', {
                card: restrictAttivo, zone: 'monster', index: 0
            }));
            DuelEngine.recomputeStaticEffects();
            const assorbimentoMilleOcchi = restrictAttivo._restrictTarget?.uid === forte.uid
                && DuelEngine.getEffectiveAtk(restrictAttivo) === forte.attack
                && gameState.cannotAttackUids[debole.uid] === true;
            return {
                attivabileDallaMano,
                iaAttivaMondo: sceltaIaMondo && sceltaIaMondo.action === 'activate' && sceltaIaMondo.card.id === 487,
                mascheraConMondo,
                rewindSoloNonToon,
                rewindConToon,
                toonRegistrati,
                scorciatoieToon: sirenaSpeciale && dragoSpeciale && teschioSpeciale && mangaSpeciale,
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
                pianoFusionePegasus,
                pianoHardRiconoscibile,
                iaPreparaMilleOcchi: !!opzioneFusione && fusioneAttivabile
                    && sceltaFusioneIa && sceltaFusioneIa.action === 'activate' && sceltaFusioneIa.card.id === 38,
                assorbimentoMilleOcchi,
                noteLegacy: [123, 483, 484, 486, 487, 606].every((id) => {
                    const card = cardDatabase.find((c) => c.id === id);
                    return card && typeof card.legacyOfficialEffect === 'string' && card.legacyOfficialEffect.length > 10;
                })
            };
        });
        t.assert(r.attivabileDallaMano, `Mondo dei Toon deve mostrare l'azione Attiva quando è in mano: ${JSON.stringify(r)}`);
        t.assert(r.iaAttivaMondo, `L'IA deve scegliere Mondo dei Toon quando è l'unica Magia disponibile: ${JSON.stringify(r)}`);
        t.assert(r.mascheraConMondo, `Maschera Toon deve riconoscere Mondo dei Toon nella zona Magie/Trappole: ${JSON.stringify(r)}`);
        t.assert(!r.rewindSoloNonToon && r.rewindConToon, `Riavvolgimento Toon deve richiedere un vero mostro Toon: ${JSON.stringify(r)}`);
        t.assert(r.toonRegistrati && r.scorciatoieToon, `Tutti i mostri Toon e le loro Evocazioni alternative devono riconoscere Mondo dei Toon: ${JSON.stringify(r)}`);
        t.assert(r.diretto, `Mondo dei Toon deve concedere l'attacco diretto: ${JSON.stringify(r)}`);
        t.assert(r.regolaScontroToon, `Con due Mondi i Toon devono affrontare prima i Toon avversari: ${JSON.stringify(r)}`);
        t.assert(r.protetto && r.lpDopoProtezione === 7500, `La prima distruzione deve essere prevenuta pagando 500 LP: ${JSON.stringify(r)}`);
        t.assert(r.secondaPassa, `La seconda distruzione nello stesso turno deve riuscire: ${JSON.stringify(r)}`);
        t.assert(r.sopravviveSenzaWorld, `Distruggere Mondo dei Toon non deve più distruggere i Toon: ${JSON.stringify(r)}`);
        t.assert(r.dragoAttaccaSubito && r.sirenaAttaccaSubito, `I Toon evocati devono poter attaccare subito senza costo d'attacco: ${JSON.stringify(r)}`);
        t.assert(r.iaUsaAbbandonato, `Media e Hard devono usare l'assorbimento di Abbandonato: ${JSON.stringify(r)}`);
        t.assert(r.milleOcchiRipristina, `Mille Occhi deve liberare il mostro assorbito comunque lasci il Terreno: ${JSON.stringify(r)}`);
        t.assert(r.pianoFusionePegasus && r.iaPreparaMilleOcchi,
            `Pegasus Normale/Difficile e la sua IA devono poter preparare Restrizione dai Mille Occhi: ${JSON.stringify(r)}`);
        t.assert(r.pianoHardRiconoscibile,
            `Pegasus Difficile deve avere 40 carte, il nucleo Mille Occhi 2x e conservare L'Occhio della Verità: ${JSON.stringify(r)}`);
        t.assert(r.assorbimentoMilleOcchi,
            `Restrizione dai Mille Occhi deve assorbire il bersaglio migliore, copiarne l'ATK e bloccare gli altri mostri: ${JSON.stringify(r)}`);
        t.assert(r.noteLegacy, `Ogni effetto Toon sostituito deve conservare legacyOfficialEffect: ${JSON.stringify(r)}`);
    }
};
