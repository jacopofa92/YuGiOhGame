// L'IA Difficile può raffinare la Media, ma non deve diventare più passiva.
module.exports = {
    name: 'IA Difficile: base stabile, preparazione del turno e linea letale',
    async run({ page, assert }) {
        const r = await page.evaluate(() => {
            const carta = (uid, atk, def) => ({
                id: 9900 + atk + def, uid, name: uid, type: 'monster', level: 4,
                attack: atk, defense: def, attribute: 'TERRA'
            });
            const salva = gameState;
            const canActivateOriginale = DuelEngine.canActivate;
            const sceltaMediaOriginale = AI_MEDIUM.chooseNextSpellTrapAction;
            try {
                gameState = Object.assign({}, gameState, {
                    botLP: 8000, playerLP: 2000,
                    botHand: [], playerHand: [],
                    botMonsterField: Array(5).fill(null),
                    playerMonsterField: Array(5).fill(null),
                    botSTField: Array(5).fill(null),
                    playerSTField: Array(5).fill(null),
                    hasNormalSummoned: false
                });
                // Hard prudente evita il muro; i playbook di Gansley e Noah
                // seguono invece il piano visibile e accettano il rischio.
                const attaccante = { card: carta('attaccante', 1900, 1000), position: 'attack', isFaceDown: false };
                const coperto = { card: carta('coperto', 1000, 1000), position: 'defense', isFaceDown: true };
                gameState.botMonsterField[0] = attaccante;
                gameState.playerMonsterField[2] = coperto;
                gameState.playerSTField[0] = { card: { id: 1 }, isFaceDown: true };
                gameState.playerSTField[1] = { card: { id: 2 }, isFaceDown: true };
                const bersaglioMedio = AI_MEDIUM.chooseAttackTarget(attaccante, [{ slot: coperto, index: 2 }]);
                const bersaglioHard = AI_HARD.chooseAttackTarget(attaccante, [{ slot: coperto, index: 2 }]);
                coperto.card.defense = 2200;
                const bersaglioMedioSuMuro = AI_MEDIUM.chooseAttackTarget(attaccante, [{ slot: coperto, index: 2 }]);
                const bersaglioHardSuMuro = AI_HARD.chooseAttackTarget(attaccante, [{ slot: coperto, index: 2 }]);
                gameState.personaggioPerPosto = { player: null, bot: 'gansley' };
                const bersaglioGansleySuMuro = AI_HARD.chooseAttackTarget(attaccante, [{ slot: coperto, index: 2 }]);
                gameState.personaggioPerPosto = { player: 'joey', bot: 'kaiba' };
                const restraintKaiba = AI_SHARED.getSpellTrapRestraint(gameState, 'bot');
                const restraintJoey = AI_SHARED.getSpellTrapRestraint(gameState, 'player');

                // A campo libero, un 1800/1000 deve creare pressione invece
                // di perdere contro un muro 900/2200 per il solo max DEF.
                gameState.playerMonsterField = Array(5).fill(null);
                gameState.playerSTField = Array(5).fill(null);
                gameState.botMonsterField = Array(5).fill(null);
                gameState.botHand = [carta('attacco', 1800, 1000), carta('muro', 900, 2200)];
                const evocazione = AI_HARD.chooseSummon(gameState, 'bot');

                const cercatore = carta('cercatore-exodia', 1000, 600);
                cercatore.effect = 'Quando questa carta viene mandata al Cimitero: puoi aggiungere alla tua mano 1 mostro dal Deck.';
                gameState.personaggioPerPosto.bot = 'seeker';
                gameState.botHand = [carta('picchiatore-exodia', 1800, 1000), cercatore];
                const evocazioneSeeker = AI_HARD.chooseSummon(gameState, 'bot');
                gameState.personaggioPerPosto.bot = 'kaiba';

                // La prima decisione Magia/Trappola di Hard non può essere
                // peggiore della Media; le azioni extra arrivano dopo.
                const magiaBaseline = { id: 9801, uid: 'magia-media', name: 'Magia Media', type: 'spell' };
                gameState.botHand = [magiaBaseline];
                AI_MEDIUM.chooseNextSpellTrapAction = () => ({
                    handIndex: 0, card: magiaBaseline, action: 'activate'
                });
                const usate = {};
                const decisioneMagia = AI_HARD.chooseNextSpellTrapAction(gameState, usate, 'bot');

                // Una Trappola coperta attivabile non va consumata alla
                // cieca in Main Phase; un Ignition scoperto resta invece
                // un vero vantaggio esclusivo del livello Difficile.
                const trappola = { id: 9802, uid: 'trappola', name: 'Trappola', type: 'trap' };
                const ignition = carta('ignition', 1400, 1000);
                gameState.botSTField[0] = { card: trappola, isFaceDown: true };
                gameState.botMonsterField[0] = { card: ignition, isFaceDown: false, position: 'attack' };
                DuelEngine.canActivate = (_io, zona, indice) => zona === 'st' ? indice === 0 : zona === 'monster' && indice === 0;
                const attivazioneSet = AI_HARD.chooseSetCardActivation(gameState, 'bot');

                // Una pescata pura deve precedere l'Evocazione: il nuovo
                // mostro ottenuto potrà così essere scelto nello stesso turno.
                const pescata = { id: 9803, uid: 'pescata', name: 'Pescata', type: 'spell', effect: 'Pesca 2 carte.' };
                gameState.botHand = [pescata];
                DuelEngine.canActivate = (_io, zona, indice) => zona === 'hand' && indice === 0;
                const preparazione = AI_HARD.choosePreSummonSpellAction(gameState, 'bot');
                const terreno = { id: 9804, uid: 'terreno', name: 'Terreno tematico', type: 'spell', subtype: 'field', effect: 'I mostri ACQUA guadagnano 200 ATK.' };
                gameState.botHand = [terreno];
                const preparazioneTerreno = AI_HARD.choosePreSummonSpellAction(gameState, 'bot');

                // Il più debole elimina il bersaglio piccolo; il più forte
                // resta per l'attacco diretto che completa il letale.
                const attaccanti = [
                    { index: 0, slot: { card: carta('forte', 3000, 1000), position: 'attack', isFaceDown: false } },
                    { index: 1, slot: { card: carta('debole', 1200, 1000), position: 'attack', isFaceDown: false } },
                    { index: 2, slot: { card: carta('medio', 2000, 1000), position: 'attack', isFaceDown: false } }
                ];
                const difensori = [
                    { index: 0, slot: { card: carta('difensore', 900, 1000), position: 'attack', isFaceDown: false } }
                ];
                const ordinati = AI_HARD.orderAttackers(attaccanti);
                const letale = AI_HARD.estimateLethal(attaccanti, difensori, 4500, 'bot');


                gameState.playerMonsterField = Array(5).fill(null);
                gameState.botMonsterField = Array(5).fill(null);
                gameState.botMonsterField[3] = {
                    card: carta('difensivo-pronto', 1700, 1900),
                    position: 'defense', isFaceDown: false, canChangePosition: true
                };
                const cambiPosizione = AI_HARD.choosePositionChanges(gameState, 'bot');
                const cambiPosizioneMedia = AI_MEDIUM.choosePositionChanges(gameState, 'bot');

                gameState.botMonsterField[3] = {
                    card: carta('attaccante-minacciato', 1000, 2000),
                    position: 'attack', isFaceDown: false, canChangePosition: true
                };
                gameState.playerMonsterField[0] = {
                    card: carta('minaccia', 1800, 1000),
                    position: 'attack', isFaceDown: false
                };
                const riparoMedia = AI_MEDIUM.choosePositionChanges(gameState, 'bot');
                return {
                    bersaglioMedio, bersaglioHard, bersaglioMedioSuMuro, bersaglioHardSuMuro, bersaglioGansleySuMuro,
                    restraintKaiba, restraintJoey,
                    evocato: evocazione && evocazione.card.uid,
                    evocatoSeeker: evocazioneSeeker && evocazioneSeeker.card.uid,
                    attaccoScelto: !!(evocazione && evocazione.card.uid === 'attacco'),
                    magiaBaseline: decisioneMagia && decisioneMagia.card.uid,
                    conteggioMagie: usate.activateCount,
                    zonaAttivata: attivazioneSet && attivazioneSet.zone,
                    preparazione: preparazione && preparazione.card.uid,
                    preparazioneTerreno: preparazioneTerreno && preparazioneTerreno.card.uid,
                    ordineAttacchi: ordinati.map((item) => item.slot.card.uid),
                    letale,
                    cambiPosizione,
                    cambiPosizioneMedia,
                    riparoMedia
                };
            } finally {
                DuelEngine.canActivate = canActivateOriginale;
                AI_MEDIUM.chooseNextSpellTrapAction = sceltaMediaOriginale;
                gameState = salva;
            }
        });
        assert(r.bersaglioMedio === 2 && r.bersaglioHard === 2,
            `Hard non deve rinunciare a un attacco valido della Media: ${JSON.stringify(r)}`);
        assert(r.bersaglioMedioSuMuro === 2 && r.bersaglioHardSuMuro === null,
            `Hard prudente deve evitare uno schianto noto al simulatore: ${JSON.stringify(r)}`);
        assert(r.bersaglioGansleySuMuro === 2,
            `Il playbook di Gansley deve seguire il piano visibile sui coperti: ${JSON.stringify(r)}`);
        assert(r.restraintKaiba < r.restraintJoey,
            `La personalità deve appartenere al posto IA che sta decidendo: ${JSON.stringify(r)}`);
        assert(r.attaccoScelto === true,
            `A campo libero Hard deve privilegiare la pressione offensiva: ${JSON.stringify(r)}`);
        assert(r.evocatoSeeker === 'cercatore-exodia',
            `Seeker deve privilegiare chi cerca i pezzi di Exodia: ${JSON.stringify(r)}`);
        assert(r.magiaBaseline === 'magia-media' && r.conteggioMagie === 1,
            `Hard deve partire dalla decisione valida della Media: ${JSON.stringify(r)}`);
        assert(r.zonaAttivata === null,
            `Hard non deve consumare attivazioni proattive fuori contesto: ${JSON.stringify(r)}`);
        assert(r.preparazione === 'pescata',
            `Hard deve pescare/cercare prima di scegliere l'Evocazione: ${JSON.stringify(r)}`);
        assert(r.preparazioneTerreno === 'terreno',
            `Hard deve preparare una Magia Terreno prima dell'Evocazione: ${JSON.stringify(r)}`);
        assert(r.ordineAttacchi.join(',') === 'debole,medio,forte',
            `Hard deve conservare l'attaccante più forte per ultimo: ${JSON.stringify(r)}`);
        assert(r.letale.possible === true && r.letale.damage === 5000,
            `Hard deve riconoscere la linea letale disponibile: ${JSON.stringify(r)}`);
        assert(r.cambiPosizione.length === 1 && r.cambiPosizione[0] === 3,
            `Hard deve rimettere in Attacco un mostro libero di colpire: ${JSON.stringify(r)}`);
        assert(r.cambiPosizioneMedia.length === 1 && r.cambiPosizioneMedia[0] === 3,
            `Media deve rimettere in Attacco un mostro libero di colpire: ${JSON.stringify(r)}`);
        assert(r.riparoMedia.length === 1 && r.riparoMedia[0] === 3,
            `Media deve passare in Difesa sotto una minaccia superiore: ${JSON.stringify(r)}`);
    }
};
