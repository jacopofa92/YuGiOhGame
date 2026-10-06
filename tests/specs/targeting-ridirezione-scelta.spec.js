// Le ultime due ridirezioni del dataset non devono scegliere il nuovo
// bersaglio da sole. Questo spec usa direttamente Decisioni.rispondi: così
// verifica anche che la risoluzione resti sospesa fino alla scelta e che la
// posizione scelta sia quella restituita al chiamante (lo stesso dato che
// viaggia nel Multiplayer a passo comune).
module.exports = {
    name: 'Specchietto della Fata e Spostamento attendono la scelta del nuovo bersaglio',
    async run(t) {
        const r1 = await t.evaluate(() => {
            const copia = (id, uid) => ({ ...cardDatabase.find((c) => c.id === id), uid });
            const originale = copia(71, 'redirect-originale');
            const alleato = copia(72, 'redirect-alleato');
            const avversario = copia(73, 'redirect-avversario');
            const specchio = copia(235, 'specchio-scelta');
            const magia = copia(474, 'magia-sorgente');
            gameState.turn = 5;
            gameState.playerMonsterField = [
                { card: originale, position: 'attack', isFaceDown: false },
                { card: alleato, position: 'attack', isFaceDown: false },
                null, null, null
            ];
            gameState.botMonsterField = [
                { card: avversario, position: 'attack', isFaceDown: false },
                null, null, null, null
            ];
            gameState.playerSTField = [{ card: specchio, isFaceDown: true, setOnTurn: 4 }, null, null, null, null];
            gameState.botSTField = [null, null, null, null, null];
            gameState.playerGraveyard = [];

            let esito = null;
            DuelEngine.makeContext('bot', { card: magia }).declareTargetWaiting(
                'player', 0, { totalTargetCount: 1 }, (result) => { esito = result; }
            );
            const pending = Decisioni.inSospeso();
            const indiceAvversario = pending.candidati.findIndex((c) => c.card.uid === 'redirect-avversario');
            const prima = esito;
            Decisioni.rispondi(indiceAvversario);
            return {
                sospesa: prima === null,
                sceltaAperta: !!pending,
                ownerFinale: esito && esito.targetOwner,
                indiceFinale: esito && esito.targetIndex,
                consumata: gameState.playerGraveyard.some((c) => c.uid === 'specchio-scelta')
            };
        });
        t.assert(r1.sospesa, 'Specchietto della Fata non deve restituire il bersaglio prima della decisione');
        t.assert(r1.sceltaAperta, 'Specchietto della Fata deve aprire una Decisione');
        t.assert(r1.ownerFinale === 'bot' && r1.indiceFinale === 0, 'deve usare il nuovo bersaglio scelto dal controllore della Trappola');
        t.assert(r1.consumata, 'la Trappola Normale deve essere consumata quando reagisce');

        const r2 = await t.evaluate(() => {
            const copia = (id, uid) => ({ ...cardDatabase.find((c) => c.id === id), uid });
            const primo = copia(71, 'shift-originale');
            const secondo = copia(72, 'shift-secondo');
            const terzo = copia(73, 'shift-terzo');
            const shift = copia(622, 'shift-scelta');
            const magia = copia(474, 'shift-sorgente');
            gameState.turn = 8;
            gameState.playerMonsterField = [
                { card: primo, position: 'attack', isFaceDown: false },
                { card: secondo, position: 'defense', isFaceDown: false },
                { card: terzo, position: 'defense', isFaceDown: true },
                null, null
            ];
            gameState.botMonsterField = [null, null, null, null, null];
            gameState.playerSTField = [{ card: shift, isFaceDown: true, setOnTurn: 7 }, null, null, null, null];
            gameState.botSTField = [null, null, null, null, null];
            gameState.playerGraveyard = [];

            let esito = null;
            DuelEngine.makeContext('bot', { card: magia }).declareTargetWaiting(
                'player', 0, { totalTargetCount: 1 }, (result) => { esito = result; }
            );
            const pending = Decisioni.inSospeso();
            const indiceTerzo = pending.candidati.findIndex((c) => c.card.uid === 'shift-terzo');
            Decisioni.rispondi(indiceTerzo);
            return {
                candidati: pending.candidati.map((c) => c.card.uid),
                ownerFinale: esito && esito.targetOwner,
                indiceFinale: esito && esito.targetIndex,
                consumata: gameState.playerGraveyard.some((c) => c.uid === 'shift-scelta')
            };
        });
        t.assert(r2.candidati.length === 2 && !r2.candidati.includes('shift-originale'), 'Spostamento deve proporre tutti e soli gli altri mostri controllati');
        t.assert(r2.ownerFinale === 'player' && r2.indiceFinale === 2, 'Spostamento deve rispettare anche la scelta di un mostro coperto');
        t.assert(r2.consumata, 'Spostamento deve essere consumata quando reagisce');

        // Percorso reale, non soltanto chiamata sintetica al checkpoint:
        // Mille Coltelli sceglie il primo mostro avversario, poi
        // Specchietto fa scegliere al difensore il mostro del bot.
        const r3 = await t.evaluate(() => {
            const copia = (id, uid) => ({ ...cardDatabase.find((c) => c.id === id), uid });
            const vittima = copia(71, 'mille-vittima');
            const ridiretto = copia(72, 'mille-ridiretto');
            const alternativa = copia(73, 'mille-alternativa');
            const specchio = copia(235, 'mille-specchio');
            const mille = copia(474, 'mille-sorgente');
            gameState.turn = 12;
            gameState.playerMonsterField = [{ card: vittima, position: 'attack', isFaceDown: false }, null, null, null, null];
            gameState.botMonsterField = [
                { card: ridiretto, position: 'attack', isFaceDown: false },
                { card: alternativa, position: 'attack', isFaceDown: false },
                null, null, null
            ];
            gameState.playerSTField = [{ card: specchio, isFaceDown: true, setOnTurn: 11 }, null, null, null, null];
            gameState.botSTField = [null, null, null, null, null];
            gameState.playerGraveyard = [];
            gameState.botGraveyard = [];
            DuelEngine.getDefinition(474).activate(DuelEngine.makeContext('bot', { card: mille }));
            const pending = Decisioni.inSospeso();
            const indice = pending.candidati.findIndex((c) => c.card.uid === 'mille-ridiretto');
            Decisioni.rispondi(indice);
            return {
                vittimaSalva: gameState.playerMonsterField[0] && gameState.playerMonsterField[0].card.uid === 'mille-vittima',
                ridirettoDistrutto: gameState.botMonsterField[0] === null
                    && gameState.botGraveyard.some((c) => c.uid === 'mille-ridiretto')
            };
        });
        t.assert(r3.vittimaSalva && r3.ridirettoDistrutto, 'una vera Magia deve riprendere la risoluzione sul bersaglio scelto dalla Trappola');
    }
};
