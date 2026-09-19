// Il Flip Summon gira la carta in 3D, non la sostituisce e basta.
// =====================================================================
// L'animazione (CardRenderer.playFlipReveal) esisteva già ed era
// agganciata a UN SOLO dei due modi in cui un mostro coperto viene
// scoperto: quello subito, quando un attacco lo rivela
// (resolveBattleDamage). Il Flip Summon fatto dal giocatore — stessa
// identica situazione a schermo — non la chiamava mai, quindi la carta
// passava da dorso a fronte fra un render e l'altro, cioè il momento più
// teatrale del gioco buttato via.
//
// Il test guarda che l'elemento che gira esista DAVVERO subito dopo il
// Flip Summon, e insieme che la meccanica di gioco non sia stata toccata
// (posizione, isFaceDown, e il marchio summonedViaFlip da cui dipendono
// gli effetti FLIP).
module.exports = {
    name: 'Flip Summon: la carta si gira in 3D e la meccanica resta intatta',
    async run(t) {
        const esito = await t.evaluate(() => {
            const mostro = cardDatabase.find((c) => c.type === 'monster' && !c.extraDeck);
            gameState.playerMonsterField[0] = {
                card: { ...mostro, uid: 'FLIP-TEST' },
                position: 'defense', isFaceDown: true,
                hasAttacked: false, canChangePosition: true
            };
            gameState.phase = 'main1';
            gameState.currentPlayer = 'player';
            updateUI();
            const primaCoperta = !!document.querySelector('#playerFieldBoard .card.face-down');

            changeMonsterPosition(0);

            const slot = gameState.playerMonsterField[0];
            return {
                primaCoperta,
                flipInCorso: !!document.querySelector('#playerFieldBoard .card-flip-outer'),
                scoperta: slot.isFaceDown === false,
                posizione: slot.position,
                marchioFlip: slot.summonedViaFlip === true
            };
        });

        t.assert(esito.primaCoperta, 'Preparazione: il mostro deve partire davvero coperto');
        t.assert(esito.flipInCorso,
            'Subito dopo il Flip Summon deve esistere l\'elemento che gira (.card-flip-outer): senza, la carta ' +
            'passa da dorso a fronte fra un render e l\'altro, che a schermo è una sostituzione istantanea');
        t.assert(esito.scoperta && esito.posizione === 'attack',
            `Il Flip Summon deve comunque scoprire il mostro in Attacco (isFaceDown ${esito.scoperta}, posizione ${esito.posizione})`);
        t.assert(esito.marchioFlip,
            'Il marchio summonedViaFlip deve restare: è quello da cui dipendono gli effetti FLIP, e un\'animazione non deve averci nulla a che fare');
    }
};
