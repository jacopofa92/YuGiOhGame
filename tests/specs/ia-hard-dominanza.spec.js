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
                // Vantaggio netto + due carte coperte: prima Hard passava
                // persino contro un bersaglio coperto che Media attaccava.
                const attaccante = { card: carta('attaccante', 1900, 1000), position: 'attack', isFaceDown: false };
                const coperto = { card: carta('coperto', 1000, 1000), position: 'defense', isFaceDown: true };
                gameState.botMonsterField[0] = attaccante;
                gameState.playerMonsterField[2] = coperto;
                gameState.playerSTField[0] = { card: { id: 1 }, isFaceDown: true };
                gameState.playerSTField[1] = { card: { id: 2 }, isFaceDown: true };
                const bersaglioMedio = AI_MEDIUM.chooseAttackTarget(attaccante, [{ slot: coperto, index: 2 }]);
                const bersaglioHard = AI_HARD.chooseAttackTarget(attaccante, [{ slot: coperto, index: 2 }]);

                // A campo libero, un 1800/1000 deve creare pressione invece
                // di perdere contro un muro 900/2200 per il solo max DEF.
                gameState.playerMonsterField = Array(5).fill(null);
                gameState.playerSTField = Array(5).fill(null);
                gameState.botMonsterField = Array(5).fill(null);
                gameState.botHand = [carta('attacco', 1800, 1000), carta('muro', 900, 2200)];
                const evocazione = AI_HARD.chooseSummon(gameState, 'bot');
                return {
                    bersaglioMedio, bersaglioHard,
                    evocato: evocazione && evocazione.card.uid,
                    attaccoScelto: !!(evocazione && evocazione.card === gameState.botHand[0])
                };
            } finally {
                gameState = salva;
            }
        });
        assert(r.bersaglioMedio === 2 && r.bersaglioHard === 2,
            `Hard non deve rinunciare a un attacco valido della Media: ${JSON.stringify(r)}`);
        assert(r.attaccoScelto === true,
            `A campo libero Hard deve privilegiare la pressione offensiva: ${JSON.stringify(r)}`);
    }
};
