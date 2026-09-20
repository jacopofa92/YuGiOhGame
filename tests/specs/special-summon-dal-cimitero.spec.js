// "Non puo' essere Special Summonata dal Cimitero" — e i due effetti che
// dipendevano dalla stessa informazione senza averla.
// =====================================================================
// Tre carte lo dicono nel testo (Drago Tiranno 1105, Sovrano Oscuro Ha
// Des 1118, Helpoemer 1123) e per nessuna delle tre era applicato. Il
// punto unico dove applicarlo c'era gia' — ACTIONS.specialSummon — ma non
// sapeva da dove arrivasse la carta: `fromZone` era facoltativo e lo
// passava una minoranza dei chiamanti.
//
// Ora lo passano tutti, e questo test guarda le due facce della cosa:
//   1. il divieto funziona, e la clausola di riscatto di id 1105 (tributa
//      1 Drago) funziona in entrambi i sensi;
//   2. Carta del Ritorno Sicuro (id 141) pesca su una rianimazione
//      qualunque, non solo su quelle poche che dichiaravano la zona.
//      Questo era un bug silenzioso PREESISTENTE, non una novita' di
//      questo giro: la carta c'era e scattava di rado.
module.exports = {
    name: 'Non Special Summonabile dal Cimitero (1105/1118/1123) e Carta del Ritorno Sicuro (141)',
    async run(t) {
        const rianima = (id, opzioni) => t.evaluate(([cardId, opt]) => {
            gameState.playerMonsterField = [null, null, null, null, null];
            gameState.botMonsterField = [null, null, null, null, null];
            gameState.playerGraveyard = [];
            gameState.playerSTField = [null, null, null, null, null];
            if (opt && opt.dragoInCampo) {
                const drago = { ...cardDatabase.find((c) => c.type === 'monster' && !c.extraDeck), race: 'Drago', uid: 'DRAGO-AIUTO' };
                gameState.playerMonsterField[4] = { card: drago, position: 'attack', isFaceDown: false, hasAttacked: false, canChangePosition: false };
            }
            const carta = { ...cardDatabase.find((c) => c.id === cardId), uid: 'RIANIMATA' };
            DuelEngine.actions.specialSummon('player', carta, 0, 'attack', 'graveyard');
            return {
                inCampo: gameState.playerMonsterField.some((s) => s && s.card.uid === 'RIANIMATA'),
                nelCimitero: gameState.playerGraveyard.some((c) => c.uid === 'RIANIMATA'),
                dragoRimasto: gameState.playerMonsterField.some((s) => s && s.card.uid === 'DRAGO-AIUTO')
            };
        }, [id, opzioni || null]);

        // --- 1118 e 1123: divieto secco, nessuna via d'uscita ----------
        for (const id of [1118, 1123]) {
            const r = await rianima(id);
            t.assert(!r.inCampo && r.nelCimitero,
                `id ${id} non deve poter essere Special Summonata dal Cimitero (rilevato ${JSON.stringify(r)})`);
        }

        // --- 1105: vietata a mani vuote, permessa tributando 1 Drago ---
        const senzaDrago = await rianima(1105);
        t.assert(!senzaDrago.inCampo && senzaDrago.nelCimitero,
            `Drago Tiranno senza un Drago da tributare deve restare nel Cimitero (rilevato ${JSON.stringify(senzaDrago)})`);
        const conDrago = await rianima(1105, { dragoInCampo: true });
        t.assert(conDrago.inCampo,
            `Drago Tiranno con un Drago in campo deve poter arrivare (rilevato ${JSON.stringify(conDrago)})`);
        t.assert(!conDrago.dragoRimasto,
            'Il Drago dev\'essere davvero tributato: se resta in campo, il riscatto e\' gratis');

        // --- Le stesse carte da un'ALTRA zona restano Evocabili --------
        // Il divieto e' "dal Cimitero", non "mai": se bloccasse ogni zona
        // sarebbe cannotSpecialSummon, che e' un flag diverso.
        const dallaMano = await t.evaluate(() => {
            gameState.playerMonsterField = [null, null, null, null, null];
            gameState.playerGraveyard = [];
            const carta = { ...cardDatabase.find((c) => c.id === 1118), uid: 'DA-MANO' };
            DuelEngine.actions.specialSummon('player', carta, 0, 'attack', 'hand');
            return gameState.playerMonsterField.some((s) => s && s.card.uid === 'DA-MANO');
        });
        t.assert(dallaMano,
            'Dalla MANO la stessa carta deve restare Special Summonabile: il divieto riguarda solo il Cimitero');

        // --- 141: pesca su una rianimazione qualunque ------------------
        // Si usa una carta a caso (nessun id speciale) rianimata con
        // ctx.specialSummon come fa qualunque effetto del motore.
        const ritorno = await t.evaluate(() => {
            gameState.playerMonsterField = [null, null, null, null, null];
            gameState.playerGraveyard = [];
            gameState.playerHand = [];
            gameState.playerDeck = cardDatabase.filter((c) => c.type === 'monster' && !c.extraDeck).slice(0, 6).map((c) => ({ ...c, uid: 'deck-' + c.id }));
            gameState.playerDeckCount = gameState.playerDeck.length;
            const ritornoSicuro = { ...cardDatabase.find((c) => c.id === 141), uid: 'ritorno-1' };
            gameState.playerSTField = [{ card: ritornoSicuro, isFaceDown: false }, null, null, null, null];
            const manoPrima = gameState.playerHand.length;
            const rianimato = { ...cardDatabase.find((c) => c.type === 'monster' && !c.extraDeck), uid: 'RIANIMATO-1' };
            // Nessun fireTrigger a mano: specialSummon fa scattare da se'
            // ON_SPECIAL_SUMMON, ed e' proprio quello che si vuole
            // provare — una rianimazione normalissima, come la scrive una
            // carta qualunque.
            const ctx = DuelEngine.makeContext('player', {});
            ctx.specialSummon('player', rianimato, 0, 'attack', 'graveyard');
            return { manoPrima, manoDopo: gameState.playerHand.length };
        });
        t.assert(ritorno.manoDopo === ritorno.manoPrima + 1,
            `Carta del Ritorno Sicuro deve far pescare 1 carta quando un mostro arriva dal proprio Cimitero (mano ${ritorno.manoPrima} -> ${ritorno.manoDopo})`);
    }
};
