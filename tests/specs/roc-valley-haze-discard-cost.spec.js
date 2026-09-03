// Roc dalla Valle della Foschia (id 781): "Quando questa carta viene
// mandata direttamente dalla tua mano al Cimitero: aggiungila al Deck e
// mescolalo." L'aggancio onSentToGraveyardFromHand esisteva già, ma
// scattava solo per gli scarti passati da ctx.discardRandomFromHand/
// ctx.discardChosenFromHand — non per lo scarto-come-COSTO di un'altra
// carta, che in ~22 punti di card-effects.js faceva ancora uno
// hand.splice + graveyard.push manuale, bypassando l'hook. Questo test
// verifica il fix su uno di quei 22 siti (Tributo ai Dannati id 492) e
// conferma che una carta NORMALE nello stesso scenario non viene toccata
// (nessun over-triggering). Copre anche l'interazione con Scavo Fossile
// (id 823), uno dei 2 siti in cui l'indice di rianimazione dal Cimitero
// va ora ricalcolato DOPO lo scarto (per uid, non per indice congelato
// prima) proprio per restare corretto quando lo scarto stesso altera il
// Cimitero.
module.exports = {
    name: "Roc dalla Valle della Foschia torna nel Deck anche se scartata come costo di un'altra carta (id 781)",
    async run(t) {
        // 1) Tributo ai Dannati (492) scarta l'indice 0 come costo: se è
        // Roc dalla Valle della Foschia, deve finire rimescolata nel Deck,
        // non restare nel Cimitero.
        const r1 = await t.evaluate(() => {
            const tribute = { ...cardDatabase.find((c) => c.id === 492), uid: 'tribute-1' };
            const roc = { ...cardDatabase.find((c) => c.id === 781), uid: 'roc-1' };
            const oppMonster = { ...cardDatabase.find((c) => c.type === 'monster' && !c.extraDeck && c.id !== 781), uid: 'oppmon-1' };
            gameState.playerHand = [roc];
            gameState.playerGraveyard = [];
            gameState.botMonsterField = [{ card: oppMonster, position: 'attack', isFaceDown: false }, null, null, null, null];
            const deckBefore = gameState.playerDeck.length;
            const ctx = DuelEngine.makeContext('player', { card: tribute });
            DuelEngine.getDefinition(492).activate(ctx);
            return {
                handEmpty: gameState.playerHand.length === 0,
                rocInGraveyard: gameState.playerGraveyard.some((c) => c.uid === 'roc-1'),
                rocInDeck: gameState.playerDeck.some((c) => c.uid === 'roc-1'),
                deckGrew: gameState.playerDeck.length === deckBefore + 1
            };
        });
        t.assert(r1.handEmpty, 'Tributo ai Dannati deve comunque scartare la carta dalla mano come costo');
        t.assert(!r1.rocInGraveyard, 'Roc dalla Valle della Foschia non deve restare nel Cimitero: torna nel Deck');
        t.assert(r1.rocInDeck, 'Roc dalla Valle della Foschia deve trovarsi rimescolata nel Deck');
        t.assert(r1.deckGrew, 'Il Deck deve crescere di 1 carta dopo il rimescolamento');

        // 2) Stesso scenario con un mostro NORMALE al posto di 781: deve
        // restare regolarmente nel Cimitero (nessun over-triggering).
        const r2 = await t.evaluate(() => {
            const tribute2 = { ...cardDatabase.find((c) => c.id === 492), uid: 'tribute-2' };
            const normalMonster = { ...cardDatabase.find((c) => c.type === 'monster' && c.id !== 781 && !c.extraDeck), uid: 'normal-2' };
            const oppMonster2 = { ...cardDatabase.find((c) => c.type === 'monster' && !c.extraDeck && c.id !== 781), uid: 'oppmon-2' };
            gameState.playerHand = [normalMonster];
            gameState.playerGraveyard = [];
            gameState.botMonsterField = [{ card: oppMonster2, position: 'attack', isFaceDown: false }, null, null, null, null];
            const ctx = DuelEngine.makeContext('player', { card: tribute2 });
            DuelEngine.getDefinition(492).activate(ctx);
            return gameState.playerGraveyard.some((c) => c.uid === 'normal-2');
        });
        t.assert(r2, 'Un mostro NORMALE scartato come costo deve restare regolarmente nel Cimitero');

        // 3) Scavo Fossile (823) scarta Roc come costo, mentre rianima un
        // Dinosauro già nel Cimitero: la rianimazione deve restare corretta
        // anche se lo scarto stesso fa lasciare Roc dal Cimitero subito dopo
        // (indice ricalcolato per uid DOPO lo scarto, non congelato prima).
        const r3 = await t.evaluate(() => {
            const fossil = { ...cardDatabase.find((c) => c.id === 823), uid: 'fossil-1' };
            const roc3 = { ...cardDatabase.find((c) => c.id === 781), uid: 'roc-3' };
            const dino = { ...cardDatabase.find((c) => c.type === 'monster' && c.race === 'Dinosauro'), uid: 'dino-1' };
            gameState.playerHand = [roc3];
            gameState.playerGraveyard = [dino];
            gameState.playerMonsterField = [null, null, null, null, null];
            const ctx = DuelEngine.makeContext('player', { card: fossil });
            DuelEngine.getDefinition(823).activate(ctx);
            return {
                rocInDeck: gameState.playerDeck.some((c) => c.uid === 'roc-3'),
                dinoSummoned: gameState.playerMonsterField.some((s) => s && s.card.uid === 'dino-1')
            };
        });
        t.assert(r3.rocInDeck, 'Anche scartata da Scavo Fossile, Roc deve tornare nel Deck');
        t.assert(r3.dinoSummoned, 'Scavo Fossile deve comunque Special Summonare correttamente il Dinosauro dal Cimitero');
    }
};
