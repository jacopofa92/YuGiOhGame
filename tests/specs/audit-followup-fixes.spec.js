// Follow-up di un audit completo del backlog carte (richiesto
// esplicitamente dall'utente per chiudere ogni discrepanza residua tra
// commenti "SEMPLIFICAZIONE" nel codice e missingEffectNote in
// data/cards.json): 2 carte avevano un comportamento diverso dal testo
// reale MAI segnalato in cards.json, corrette in questa sessione.
module.exports = {
    name: 'Audit backlog: Buco Trappola senza Fondo bandisce (id 128), Gilford il Fulmine richiede 3 Tributi (id 267)',
    async run(t) {
        // 1) Buco Trappola senza Fondo (128): "distruggilo e bandiscilo" —
        // il mostro Evocato dall'avversario con 1500+ ATK deve finire
        // bandito, non semplicemente al Cimitero.
        const r1 = await t.evaluate(() => {
            const bottomless = { ...cardDatabase.find((c) => c.id === 128), uid: 'bottomless-1' };
            const bigMonster = { ...cardDatabase.find((c) => c.type === 'monster' && (c.attack || 0) >= 1500 && !c.extraDeck), uid: 'bigmon-1' };
            gameState.playerSTField = [{ card: bottomless, isFaceDown: false }, null, null, null, null];
            gameState.botMonsterField = [{ card: bigMonster, position: 'attack', isFaceDown: false }, null, null, null, null];
            gameState.botGraveyard = [];
            gameState.botBanished = [];
            const ctx = DuelEngine.makeContext('player', { card: bottomless, summonedCard: bigMonster, summonedSlotIndex: 0 });
            DuelEngine.getDefinition(128).onOpponentSummon(ctx);
            return {
                leftField: !gameState.botMonsterField.some((s) => s && s.card.uid === 'bigmon-1'),
                inGraveyard: gameState.botGraveyard.some((c) => c.uid === 'bigmon-1'),
                inBanished: gameState.botBanished.some((c) => c.uid === 'bigmon-1')
            };
        });
        t.assert(r1.leftField, 'Il mostro Evocato con 1500+ ATK deve lasciare il Terreno');
        t.assert(!r1.inGraveyard, 'Non deve restare nel Cimitero: il testo reale dice "distruggilo E bandiscilo"');
        t.assert(r1.inBanished, 'Deve finire nella Zona Bandite');

        // 2) Gilford il Fulmine (267): richiede 3 Tributi per l'Evocazione
        // Tributo, non i 2 standard per un mostro di Livello 8.
        const r2 = await t.evaluate(() => {
            const gilford = cardDatabase.find((c) => c.id === 267);
            return getTributesRequired(gilford);
        });
        t.assert(r2 === 3, `Gilford il Fulmine deve richiedere 3 Tributi (letti: ${r2})`);
    }
};
