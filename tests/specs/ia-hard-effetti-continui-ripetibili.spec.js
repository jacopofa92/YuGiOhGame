// L'audit Forbidden Memories ha mostrato che Labyrinth Mage equipaggiava
// Labirinto Magico ma non usava mai il suo secondo effetto. Hard deve
// riconoscere genericamente gli effetti volontari scoperti marcati
// repeatableWhileContinuous, senza una lista speciale di carte.
module.exports = {
    name: 'IA Hard riattiva gli effetti continui ripetibili (Labirinto Magico)',
    async run(t) {
        const risultato = await t.evaluate(() => {
            resetGameState();
            const copia = (id, uid) => ({ ...cardDatabase.find((c) => c.id === id), uid });
            const muro = copia(337, 'muro');
            const labirinto = copia(364, 'labirinto');
            const wallShadow = copia(857, 'wall-shadow');
            labirinto.equippedToOwner = 'bot';
            labirinto.equippedToIndex = 0;
            labirinto.equippedToUid = muro.uid;
            gameState.currentPlayer = 'bot';
            gameState.phase = 'main1';
            gameState.botMonsterField = [
                { card: muro, position: 'defense', isFaceDown: false },
                null, null, null, null
            ];
            gameState.botSTField = [
                { card: labirinto, isFaceDown: false },
                null, null, null, null
            ];
            gameState.botDeck = [wallShadow];
            gameState.botDeckCount = 1;
            DuelEngine.recomputeStaticEffects();
            const scelta = AI_HARD.chooseSetCardActivation(gameState, 'bot');

            // Anche l'ingresso nella combo è parte del playbook: se Muro e
            // Labirinto sono entrambi in mano, il Muro non va Settato
            // coperto (l'Equip non potrebbe bersagliarlo).
            gameState.botMonsterField = [
                { card: copia(924, 'tributo'), position: 'attack', isFaceDown: false },
                null, null, null, null
            ];
            gameState.botSTField = [null, null, null, null, null];
            gameState.botHand = [copia(337, 'muro-mano'), copia(364, 'labirinto-mano')];
            gameState.hasNormalSummoned = false;
            gameState.hasNormalSummonedByOwner = { player: false, bot: false };
            gameState.personaggioPerPosto = { player: 'yamiYugi', bot: 'labyrinthMage' };
            const evocazione = AI_HARD.chooseSummon(gameState, 'bot');
            return {
                carta: scelta?.card?.id,
                zona: scelta?.zone,
                indice: scelta?.index,
                cartaEvocata: evocazione?.card?.id,
                posizione: evocazione?.position,
                coperta: evocazione?.faceDown
            };
        });
        t.assert(risultato.carta === 364 && risultato.zona === 'st' && risultato.indice === 0,
            `Hard deve scegliere il secondo effetto di Labirinto Magico: ${JSON.stringify(risultato)}`);
        t.assert(risultato.cartaEvocata === 337 && risultato.posizione === 'defense' && risultato.coperta === false,
            `Hard deve preparare la combo evocando Muro scoperto in Difesa: ${JSON.stringify(risultato)}`);
    }
};
