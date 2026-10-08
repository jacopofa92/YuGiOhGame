// L'IA Difficile può raffinare la Media, ma non deve diventare più passiva.
module.exports = {
    name: 'IA Difficile: mantiene gli attacchi validi e privilegia pressione a campo libero',
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
                // Contro un coperto battibile Hard conserva la scelta della
                // Media; contro un muro coperto evita lo schianto suicida.
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

                // A campo libero, un 1800/1000 deve creare pressione invece
                // di perdere contro un muro 900/2200 per il solo max DEF.
                gameState.playerMonsterField = Array(5).fill(null);
                gameState.playerSTField = Array(5).fill(null);
                gameState.botMonsterField = Array(5).fill(null);
                gameState.botHand = [carta('attacco', 1800, 1000), carta('muro', 900, 2200)];
                const evocazione = AI_HARD.chooseSummon(gameState, 'bot');

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
                return {
                    bersaglioMedio, bersaglioHard, bersaglioMedioSuMuro, bersaglioHardSuMuro,
                    evocato: evocazione && evocazione.card.uid,
                    attaccoScelto: !!(evocazione && evocazione.card.uid === 'attacco'),
                    magiaBaseline: decisioneMagia && decisioneMagia.card.uid,
                    conteggioMagie: usate.activateCount,
                    zonaAttivata: attivazioneSet && attivazioneSet.zone
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
            `Hard deve evitare uno schianto certo contro un coperto: ${JSON.stringify(r)}`);
        assert(r.attaccoScelto === true,
            `A campo libero Hard deve privilegiare la pressione offensiva: ${JSON.stringify(r)}`);
        assert(r.magiaBaseline === 'magia-media' && r.conteggioMagie === 1,
            `Hard deve partire dalla decisione valida della Media: ${JSON.stringify(r)}`);
        assert(r.zonaAttivata === null,
            `Hard non deve consumare attivazioni proattive fuori contesto: ${JSON.stringify(r)}`);
    }
};
