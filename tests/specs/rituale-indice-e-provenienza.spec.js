// Magie Rituali: due difetti trovati dal duello senza testa.
//  1) performRitualTribute può sacrificare carte DALLA MANO, quindi gli
//     indici della mano scorrono; quattro Rituali toglievano poi dalla mano
//     la carta all'indice calcolato PRIMA del sacrificio — la carta
//     sbagliata, o nessuna (errore su `id`). Ora la ritrovano per
//     riferimento.
//  2) Tutte le Rituali dichiaravano come provenienza il Cimitero, mentre
//     il mostro Rituale arriva dalla mano: Carta del Ritorno Sicuro (id 141,
//     "quando un mostro viene Special Summonato dal tuo Cimitero, pesca")
//     pescava per sbaglio ad ogni Evocazione Rituale.
module.exports = {
    name: 'Magie Rituali: carta ritrovata dopo il sacrificio dalla mano, provenienza "mano" (116, 141)',
    async run(t) {
        await t.page.waitForFunction(() => gameState.phase === 'main1' && !DuelEngine.isChainActive(), null, { timeout: 15000 });
        const r = await t.evaluate(() => new Promise((resolve) => {
            if (typeof clearPhaseTransitionTimeout === 'function') clearPhaseTransitionTimeout();
            gameState.currentPlayer = 'player';
            gameState.phase = 'main1';
            gameState.playerMonsterField = [null, null, null, null, null];
            gameState.playerGraveyard = [];
            // Il sacrificio (Livello 4) sta in mano PRIMA di Abbandonato:
            // toglierlo fa scorrere Abbandonato dall'indice 1 allo 0.
            const quattro = cardDatabase.find((c) => c.type === 'monster' && !c.extraDeck && c.level === 4 && !DuelEngine.getDefinition(c.id));
            const abbandonato = { ...cardDatabase.find((c) => c.id === 416), uid: 'abbandonato' };
            gameState.playerHand = [{ ...quattro, uid: 'sacrificio' }, abbandonato];
            // Carta del Ritorno Sicuro scoperta, e un Deck da cui pescare.
            gameState.playerSTField = [{ card: { ...cardDatabase.find((c) => c.id === 141), uid: 'ritorno' }, isFaceDown: false }, null, null, null, null];
            gameState.playerDeck = [{ ...quattro, uid: 'da-pescare' }];
            gameState.playerDeckCount = 1;
            const rito = { ...cardDatabase.find((c) => c.id === 116), uid: 'rito' };
            const ctx = DuelEngine.makeContext('player', { card: rito });
            DuelEngine.getDefinition(116).activate(ctx);
            setTimeout(() => resolve({
                campo: gameState.playerMonsterField.filter(Boolean).map((s) => s.card.uid),
                mano: gameState.playerHand.map((c) => c.uid),
                cimitero: gameState.playerGraveyard.map((c) => c.uid),
                deck: gameState.playerDeck.length
            }), 3000);
        }));
        t.assert(r.campo.join() === 'abbandonato', `Evocato Abbandonato, non un'altra carta (${JSON.stringify(r)})`);
        t.assert(r.cimitero.includes('sacrificio'), `Il sacrificio dalla mano è nel Cimitero (${JSON.stringify(r)})`);
        t.assert(r.deck === 1 && !r.mano.includes('da-pescare'), `Carta del Ritorno Sicuro non pesca: il Rituale arriva dalla mano (${JSON.stringify(r)})`);
    }
};
