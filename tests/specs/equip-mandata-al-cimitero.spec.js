// "Quando questa carta viene mandata dal Terreno al Cimitero" — la
// clausola che quattro Carte Equipaggiamento avevano scritta nel testo e
// nessuna eseguiva.
// =====================================================================
// Una Magia/Trappola può finire al Cimitero dal Terreno per due strade
// molto diverse, e finora solo una aveva un aggancio:
//   1. distrutta da un effetto -> destroySpellTrap -> `onSTDestroyed`;
//   2. una Carta Equipaggiamento rimasta ORFANA perché il mostro a cui
//      era agganciata non c'è più: la pulizia in recomputeStaticEffects
//      la mandava al Cimitero in silenzio.
//
// La seconda è il percorso PIÙ COMUNE per un equip — il mostro muore in
// battaglia e l'equip lo segue — ed era proprio quello scoperto. Quattro
// carte lo dichiaravano nel proprio missingEffectNote citandosi a
// vicenda: Ciondolo Nero (117), Pugnale Farfalla - Elma (135), Corno
// dell'Unicorno (301), Coccola Malevola (594).
//
// Il test esercita QUEL percorso (il mostro sparisce, l'equip resta
// orfana), non una chiamata diretta all'handler: è la strada che nel
// gioco vero non funzionava.
module.exports = {
    name: 'Carte Equipaggiamento: la clausola "quando mandata al Cimitero" (117/135/301/594)',
    async run(t) {
        const prova = (id) => t.evaluate((id) => new Promise((resolve) => {
            const mostro = cardDatabase.find((c) => c.type === 'monster' && !c.extraDeck);
            const equip = { ...cardDatabase.find((c) => c.id === id), uid: 'EQ-' + id };
            gameState.playerGraveyard = [];
            gameState.playerHand = [];
            gameState.playerDeck = [];
            gameState.playerDeckCount = 0;
            gameState.playerLP = 8000;
            gameState.botLP = 8000;
            gameState.playerMonsterField = [
                { card: { ...mostro, uid: 'PORTATORE' }, position: 'attack', isFaceDown: false, hasAttacked: false, canChangePosition: false },
                null, null, null, null
            ];
            gameState.playerSTField = [null, null, null, null, null];
            updateUI();

            // Aggancio tramite il vero activate() della carta.
            gameState.playerSTField[0] = { card: equip, isFaceDown: false };
            DuelEngine.getDefinition(id).activate(
                DuelEngine.makeContext('player', { card: equip, zone: 'st', index: 0 })
            );
            updateUI();
            const agganciata = !!equip.equippedToUid;

            // Il mostro sparisce: da qui in poi l'equip è orfana.
            gameState.playerMonsterField[0] = null;
            updateUI();

            // L'avviso parte DOPO il render (setTimeout 0 in
            // duel-engine.js): recomputeStaticEffects gira dentro
            // updateUI(), e un effetto che reagisse subito lo
            // richiamerebbe a metà dello stesso render.
            setTimeout(() => resolve({
                agganciata: agganciata,
                inCimitero: gameState.playerGraveyard.some((c) => c.uid === 'EQ-' + id),
                inMano: gameState.playerHand.some((c) => c.uid === 'EQ-' + id),
                inDeck: (gameState.playerDeck || []).some((c) => c.uid === 'EQ-' + id),
                lpMiei: gameState.playerLP,
                lpAvversario: gameState.botLP
            }), 80);
        }), id);

        // 117 Ciondolo Nero: 500 danni all'avversario. Resta nel Cimitero.
        const ciondolo = await prova(117);
        t.assert(ciondolo.agganciata, 'Preparazione: il Ciondolo Nero deve essersi agganciato al mostro');
        t.assert(ciondolo.lpAvversario === 7500,
            `Ciondolo Nero deve infliggere 500 danni all'avversario andando al Cimitero (LP avversario: ${ciondolo.lpAvversario})`);
        t.assert(ciondolo.inCimitero, 'Ciondolo Nero resta nel Cimitero: non ha nessuna clausola di ritorno');

        // 135 Pugnale Farfalla - Elma: torna in mano (è ciò che la rende
        // riutilizzabile all'infinito).
        const elma = await prova(135);
        t.assert(elma.inMano && !elma.inCimitero,
            `Pugnale Farfalla - Elma deve tornare in MANO, non restare nel Cimitero (mano: ${elma.inMano}, cimitero: ${elma.inCimitero})`);

        // 301 Corno dell'Unicorno: torna in cima al Deck.
        const corno = await prova(301);
        t.assert(corno.inDeck && !corno.inCimitero,
            `Corno dell'Unicorno deve tornare in cima al DECK (deck: ${corno.inDeck}, cimitero: ${corno.inCimitero})`);

        // 594 Coccola Malevola: paga 500 LP e torna in cima al Deck.
        const coccola = await prova(594);
        t.assert(coccola.inDeck && !coccola.inCimitero,
            `Coccola Malevola deve tornare in cima al DECK (deck: ${coccola.inDeck}, cimitero: ${coccola.inCimitero})`);
        t.assert(coccola.lpMiei === 7500,
            `Coccola Malevola deve costare 500 Life Point a CHI LA CONTROLLA (LP rimasti: ${coccola.lpMiei})`);
    }
};
