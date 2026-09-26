// Il bot non deve più Evocare un mostro e poi distruggerselo da solo.
// =====================================================================
// Segnalato dall'utente guardando il bot giocare: "la ia mette un mostro
// e poi usa buco nero: non ha senso! al massimo prima buco nero e poi
// usa un mostro". Causa reale: AI_SHARED.scoreCardImpact/isRemovalWorthwhile
// trattavano OGNI effetto "distruggi tutti i mostri" come vantaggio puro,
// senza mai guardare che Buco Nero (a differenza di Raigeki, che colpisce
// solo l'avversario) distrugge anche il proprio Terreno — e il bot
// Evocava sempre PRIMA di considerare le proprie Magie/Trappole (vedi
// js/ai/bot.js#botTurn), quindi la propria Evocazione appena fatta finiva
// sempre nel mucchio.
//
// Due casi, nello stesso test: quando conviene DAVVERO (il proprio
// Terreno è vuoto, l'avversario ha un mostro forte) Buco Nero deve
// partire PRIMA dell'Evocazione, cosicché il mostro Evocato dopo
// sopravviva; quando NON conviene (il bot ha già un mostro più forte di
// quello che perderebbe l'avversario) Buco Nero deve restare in mano.
//
// Si confrontano le carte per `id` (il numero di catalogo), MAI per
// `uid`: un `uid` scritto a mano su una carta di mano viene RISCRITTO dal
// motore quando la carta entra in campo (assegna un identificativo di
// istanza suo), quindi un confronto per uid dopo un'Evocazione risulta
// sempre falso anche a Evocazione riuscita — insidia presa scrivendo
// proprio questo test.
//
// Verificato che COGLIE il bug: rimuovendo la chiamata a
// attemptBotMassDestructionBeforeSummon in botTurn() il caso A fallisce
// (il mostro Evocato viene distrutto).
module.exports = {
    name: 'Il bot attiva Buco Nero PRIMA di Evocare quando conviene, mai quando non conviene',
    freeze: false,
    async run(t) {
        await t.page.waitForFunction(
            () => typeof gameState !== 'undefined' && typeof botTurn === 'function' && typeof DuelEngine !== 'undefined',
            null, { timeout: 20000 }
        );

        const esitoA = await t.evaluate(() => new Promise((risolvi) => {
            const bucoNero = { ...cardDatabase.find((c) => c.id === 7) }; // Dark Hole
            const mostroDebole = { ...cardDatabase.find((c) => c.type === 'monster' && !c.extraDeck && (c.level || 0) <= 4 && (c.attack || 0) > 0 && (c.attack || 0) <= 1500) };
            const idMostroDebole = mostroDebole.id;
            const mostroForteAvversario = { ...cardDatabase.find((c) => c.type === 'monster' && !c.extraDeck && (c.attack || 0) >= 2400) };
            const idMostroForteAvversario = mostroForteAvversario.id;

            const timeline = [];
            const t0 = performance.now();
            const segna = (etichetta) => timeline.push(Math.round(performance.now() - t0) + 'ms ' + etichetta);

            const attivaVera = DuelEngine.activateCard;
            DuelEngine.activateCard = function (owner, zone, index) {
                if (owner === 'bot' && zone === 'hand' && gameState.botHand[index] && gameState.botHand[index].id === 7) {
                    segna('Buco Nero attivato');
                }
                return attivaVera.apply(this, arguments);
            };
            const summonVero = window.botSummonMonster;
            window.botSummonMonster = function (card) {
                segna('botSummonMonster chiamata con id ' + (card ? card.id : 'niente'));
                return summonVero.apply(this, arguments);
            };

            gameState.currentPlayer = 'bot';
            gameState.turn = 3;
            gameState.gameOver = false;
            gameState.hasNormalSummoned = false;
            gameState.botHand = [bucoNero, mostroDebole];
            gameState.botMonsterField = [null, null, null, null, null];
            gameState.botSTField = [null, null, null, null, null];
            gameState.playerMonsterField = [{ card: mostroForteAvversario, position: 'attack', isFaceDown: false, hasAttacked: false }, null, null, null, null];
            gameState.playerSTField = [null, null, null, null, null];

            botTurn();

            setTimeout(() => {
                DuelEngine.activateCard = attivaVera;
                window.botSummonMonster = summonVero;
                risolvi({
                    timeline: timeline,
                    mostroDeboleSulCampoDelBot: gameState.botMonsterField.some((s) => s && s.card && s.card.id === idMostroDebole),
                    mostroForteDistrutto: !gameState.playerMonsterField.some((s) => s && s.card && s.card.id === idMostroForteAvversario),
                    bucoNeroUsato: !gameState.botHand.some((c) => c.id === 7),
                    campoFinaleBot: gameState.botMonsterField.map((s) => s && s.card && s.card.id),
                    manoFinaleBot: gameState.botHand.map((c) => c.id),
                    idMostroDebole: idMostroDebole
                });
            }, 12000);
        }));

        t.assert(esitoA.bucoNeroUsato, `Con un Terreno avversario forte e il proprio vuoto, Buco Nero deve convenire ed essere attivato: ${JSON.stringify(esitoA.timeline)}`);
        t.assert(esitoA.mostroForteDistrutto, 'Il mostro forte dell\'avversario deve essere stato distrutto da Buco Nero');
        t.assert(esitoA.mostroDeboleSulCampoDelBot,
            `Il mostro debole del bot deve sopravvivere: Buco Nero doveva partire PRIMA dell'Evocazione, non dopo. Cronologia: ${JSON.stringify(esitoA.timeline)}. Campo: ${JSON.stringify(esitoA.campoFinaleBot)}. Mano: ${JSON.stringify(esitoA.manoFinaleBot)}. Atteso id: ${esitoA.idMostroDebole}`);
        const indiceBucoNero = esitoA.timeline.findIndex((e) => e.indexOf('Buco Nero') !== -1);
        const indiceEvocazione = esitoA.timeline.findIndex((e) => e.indexOf('botSummonMonster chiamata') !== -1);
        t.assert(indiceBucoNero !== -1 && indiceEvocazione !== -1 && indiceBucoNero < indiceEvocazione,
            `Buco Nero deve comparire PRIMA dell'Evocazione nella cronologia: ${JSON.stringify(esitoA.timeline)}`);

        // --- Caso B: NON conviene (il bot perderebbe più di quanto guadagna) ---
        const esitoB = await t.evaluate(() => new Promise((risolvi) => {
            const bucoNero = { ...cardDatabase.find((c) => c.id === 7) };
            const mostroDebole = { ...cardDatabase.find((c) => c.type === 'monster' && !c.extraDeck && (c.level || 0) <= 4 && (c.attack || 0) > 0 && (c.attack || 0) <= 1500) };
            const mostroForteDelBot = { ...cardDatabase.find((c) => c.type === 'monster' && !c.extraDeck && (c.attack || 0) >= 2400) };
            const idMostroForteDelBot = mostroForteDelBot.id;
            const mostroDeboleAvversario = { ...cardDatabase.find((c) => c.type === 'monster' && !c.extraDeck && (c.attack || 0) > 0 && (c.attack || 0) <= 1000) };

            gameState.currentPlayer = 'bot';
            gameState.turn = 3;
            gameState.gameOver = false;
            gameState.hasNormalSummoned = true; // già Evocato questo turno: isola il comportamento di attemptBotMassDestructionBeforeSummon
            gameState.botHand = [bucoNero, mostroDebole];
            gameState.botMonsterField = [{ card: mostroForteDelBot, position: 'attack', isFaceDown: false, hasAttacked: false }, null, null, null, null];
            gameState.botSTField = [null, null, null, null, null];
            gameState.playerMonsterField = [{ card: mostroDeboleAvversario, position: 'attack', isFaceDown: false, hasAttacked: false }, null, null, null, null];
            gameState.playerSTField = [null, null, null, null, null];

            botTurn();

            setTimeout(() => {
                risolvi({
                    bucoNeroUsato: !gameState.botHand.some((c) => c.id === 7),
                    mostroForteDelBotSopravvive: gameState.botMonsterField.some((s) => s && s.card && s.card.id === idMostroForteDelBot)
                });
            }, 12000);
        }));

        t.assert(!esitoB.bucoNeroUsato,
            'Se il bot perderebbe più di quanto guadagna, Buco Nero non deve essere attivato per niente');
        t.assert(esitoB.mostroForteDelBotSopravvive,
            'Il mostro forte già in campo del bot non deve sparire: Buco Nero non doveva partire in questo scenario');
    }
};
