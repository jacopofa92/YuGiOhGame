// L'IA decide gli attacchi con ATK/DEF EFFETTIVI (bonus e malus inclusi), non
// con quelli stampati: la battaglia si risolve con quelli.
//
// Segnalato dall'utente: un mostro avversario da 1400 contro uno da 1200 che
// un Terreno porta a 1700 — il bot attaccava comunque, in perdita. E al
// contrario: non attaccava un mostro che con un malus era diventato battibile.
//
// Si prova la funzione di scelta del bersaglio di ENTRAMBI i livelli, con
// bonus a tempo (gameState.temporaryAtkDefBonus: è uno dei veri depositi di
// bonus letti da DuelEngine.getEffectiveAtk/Def, e a differenza di
// atkDefBonus non viene azzerato ad ogni render).
module.exports = {
    name: 'IA: gli attacchi tengono conto dei bonus/malus di ATK e DEF',
    async run(t) {
        const { page, assert } = t;
        await page.waitForTimeout(500);
        const r = await page.evaluate(() => {
            const carta = (uid, atk, def) => ({ id: 9000, uid, name: uid, type: 'monster', level: 4, attack: atk, defense: def });
            const bonus = (card, atk, def) => {
                gameState.temporaryAtkDefBonus = gameState.temporaryAtkDefBonus || {};
                gameState.temporaryAtkDefBonus[card.uid] = { atk: atk, def: def };
            };
            const pulisci = () => { gameState.temporaryAtkDefBonus = {}; };
            const scenari = (livello) => {
                const L = livello === 'medio' ? AI_MEDIUM : AI_HARD;
                const out = {};
                const prova = (nome, atkBot, bonusBot, atkG, defG, bonusG, posG) => {
                    pulisci();
                    const attaccante = carta('bot-' + nome, atkBot, 1000);
                    const difensore = carta('pl-' + nome, atkG, defG);
                    if (bonusBot) bonus(attaccante, bonusBot, 0);
                    if (bonusG) bonus(difensore, bonusG[0], bonusG[1]);
                    const slotBot = { card: attaccante, position: 'attack', isFaceDown: false, hasAttacked: false };
                    const slotG = { card: difensore, position: posG || 'attack', isFaceDown: false };
                    out[nome] = L.chooseAttackTarget(slotBot, [{ slot: slotG, index: 2 }]);
                };
                // 1400 contro 1200 che un Terreno porta a 1700: NON attaccare.
                prova('bonusDifensore', 1400, 0, 1200, 1000, [500, 500]);
                // 1400 contro 1600 indebolito a 1100: attaccare.
                prova('malusDifensore', 1400, 0, 1600, 1000, [-500, -500]);
                // 1200 potenziato a 1700 contro 1600 stampato: attaccare.
                prova('bonusAttaccante', 1200, 500, 1600, 1000, null);
                // 1400 contro 1600 stampato ma attaccante indebolito a 900: NON attaccare.
                prova('malusAttaccante', 1400, -500, 1000, 1000, null);
                // In Difesa conta la DEF effettiva: 1000 + 500 = 1500 > 1400 -> NON attaccare.
                prova('bonusDifesa', 1400, 0, 1800, 1000, [500, 500], 'defense');
                // Senza alcun bonus il comportamento di sempre: 1400 contro 1200 -> attaccare.
                prova('senzaBonus', 1400, 0, 1200, 1000, null);
                pulisci();
                return out;
            };
            return { medio: scenari('medio'), difficile: scenari('difficile') };
        });
        ['medio', 'difficile'].forEach((lv) => {
            const o = r[lv];
            assert(o.bonusDifensore === null, `${lv}: un difensore potenziato non va attaccato (scelto ${o.bonusDifensore})`);
            assert(o.malusDifensore === 2, `${lv}: un difensore indebolito va attaccato (scelto ${o.malusDifensore})`);
            assert(o.bonusAttaccante === 2, `${lv}: un attaccante potenziato attacca (scelto ${o.bonusAttaccante})`);
            assert(o.malusAttaccante === null, `${lv}: un attaccante indebolito non attacca (scelto ${o.malusAttaccante})`);
            assert(o.bonusDifesa === null, `${lv}: la DEF effettiva conta in Posizione di Difesa (scelto ${o.bonusDifesa})`);
            assert(o.senzaBonus === 2, `${lv}: senza bonus nulla cambia (scelto ${o.senzaBonus})`);
        });
    }
};
