// Le altre 2 condizioni di vittoria istantanea (oltre a Exodia, vedi
// exodia-win-cinematic.spec.js) riusano lo stesso orchestratore
// condiviso (triggerInstantWin/game-flow.js -> FX.playInstantWinCinematic
// /effects.js): Destiny Board completo (id 866-870) e Elefante Volante
// (id 246). Verifica che entrambe passino dalla cinematica prima di
// endDuel(), con il "kind" e i DOM element giusti per ciascuna.
module.exports = {
    name: 'Destiny Board ed Elefante Volante riusano la stessa cinematica di vittoria istantanea di Exodia',
    async run(t) {
        // 1) Destiny Board completo per il GIOCATORE: le 5 carte (Santuario
        // Oscuro/id 866 + le 4 Spirit Message) sono in zona Magia/Trappola,
        // mostrata a schermo per ENTRAMBI i lati (a differenza della mano).
        const r1 = await t.evaluate(() => {
            return new Promise((resolve) => {
                const board = { ...cardDatabase.find((c) => c.id === 866), uid: 'board-win-1' };
                const msgI = { ...cardDatabase.find((c) => c.id === 867), uid: 'msgI-win-1' };
                const msgN = { ...cardDatabase.find((c) => c.id === 868), uid: 'msgN-win-1' };
                const msgA = { ...cardDatabase.find((c) => c.id === 869), uid: 'msgA-win-1' };
                const msgL = { ...cardDatabase.find((c) => c.id === 870), uid: 'msgL-win-1' };
                gameState.playerSTField = [
                    { card: board, isFaceDown: false, setOnTurn: gameState.turn - 1 },
                    { card: msgI, isFaceDown: false }, { card: msgN, isFaceDown: false },
                    { card: msgA, isFaceDown: false }, { card: msgL, isFaceDown: false }
                ];
                gameState.gameOver = false;
                gameState.instantWinCinematicPlaying = false;

                let receivedKind = null;
                let receivedPieceElementCount = null;
                const originalEffect = FX.playInstantWinCinematic;
                FX.playInstantWinCinematic = (kind, bannerText, pieceElements, onDone) => {
                    receivedKind = kind;
                    receivedPieceElementCount = pieceElements.length;
                    setTimeout(onDone, 50);
                };

                updateUI();
                const gameOverImmediatelyAfter = gameState.gameOver;

                setTimeout(() => {
                    FX.playInstantWinCinematic = originalEffect;
                    resolve({ gameOverImmediatelyAfter, gameOverAfterCinematic: gameState.gameOver, receivedKind, receivedPieceElementCount });
                }, 300);
            });
        });
        t.assert(!r1.gameOverImmediatelyAfter, 'Destiny Board: la vittoria non deve scattare subito, deve aspettare la cinematica');
        t.assert(r1.gameOverAfterCinematic, 'Destiny Board: la vittoria deve scattare alla fine della cinematica');
        t.assert(r1.receivedKind === 'destinyboard', `Destiny Board: il "kind" deve essere "destinyboard" — letto "${r1.receivedKind}"`);
        t.assert(r1.receivedPieceElementCount === 5, `Destiny Board: deve ricevere i 5 DOM element delle carte in zona Magia/Trappola (visibile per ENTRAMBI i lati, a differenza della mano) — letti ${r1.receivedPieceElementCount}`);

        // 2) Elefante Volante: nessun "insieme di pezzi" (una singola
        // carta), la cinematica deve comunque girare con kind dedicato e
        // pieceElements vuoto.
        const r2 = await t.evaluate(() => {
            return new Promise((resolve) => {
                gameState.playerSTField = [null, null, null, null, null];
                gameState.gameOver = false;
                gameState.instantWinCinematicPlaying = false;
                gameState.flyingElephantWinnerOwner = 'player';

                let receivedKind = null;
                let receivedPieceElementCount = null;
                const originalEffect = FX.playInstantWinCinematic;
                FX.playInstantWinCinematic = (kind, bannerText, pieceElements, onDone) => {
                    receivedKind = kind;
                    receivedPieceElementCount = pieceElements.length;
                    setTimeout(onDone, 50);
                };

                updateUI();
                setTimeout(() => {
                    FX.playInstantWinCinematic = originalEffect;
                    resolve({ gameOver: gameState.gameOver, receivedKind, receivedPieceElementCount });
                }, 300);
            });
        });
        t.assert(r2.gameOver, "Elefante Volante: la vittoria deve scattare alla fine della cinematica");
        t.assert(r2.receivedKind === 'flyingelephant', `Elefante Volante: il "kind" deve essere "flyingelephant" — letto "${r2.receivedKind}"`);
        t.assert(r2.receivedPieceElementCount === 0, `Elefante Volante: nessun "pezzo" da far brillare, l'array deve restare vuoto — letti ${r2.receivedPieceElementCount}`);
    }
};
