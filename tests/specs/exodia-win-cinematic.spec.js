// "5 pezzi di Exodia riuniti" (checkGameOver/triggerExodiaWin,
// game-flow.js): prima di dichiarare la vittoria vera con endDuel(),
// gioca una cinematica dedicata (FX.playInstantWinCinematic, effects.js
// — generica per QUALUNQUE vittoria istantanea, non solo Exodia, vedi
// triggerInstantWin in game-flow.js) — un filmato dedicato se esiste
// (video/vittorie/exodiawin.mp4), altrimenti una sequenza CSS "cool"
// (bagliore dorato sui 5 pezzi in mano + flash/banner finale), stesso
// principio già usato per le Evocazioni di mostri di alto Livello
// (FX.playMonsterSummonEffect). Verifica che la vittoria NON scatti
// all'istante (la cinematica deve girare prima), che scatti comunque
// alla fine, e che una chiamata rientrante a checkGameOver() mentre la
// cinematica è in corso non la faccia ripartire da capo.
module.exports = {
    name: 'Exodia: la cinematica di vittoria gira prima di endDuel(), niente riavvii rientranti (id 11/41-44)',
    async run(t) {
        const r1 = await t.evaluate(() => {
            return new Promise((resolve) => {
                const pieceIds = [11, 41, 42, 43, 44];
                gameState.playerHand = pieceIds.map((id) => ({ ...cardDatabase.find((c) => c.id === id), uid: `exodia-${id}` }));
                gameState.gameOver = false;
                gameState.instantWinCinematicPlaying = false;

                // Il mock va installato PRIMA di updateUI(): updateUI()
                // stessa chiama checkGameOver() al suo interno (ultima riga
                // della funzione), quindi la cinematica parte già durante
                // questa chiamata, non dopo — installare il mock più tardi
                // lascerebbe partire la VERA implementazione (che impiega
                // secondi reali, non i 50ms del mock).
                let effectCallCount = 0;
                let receivedKind = null;
                let receivedPieceElementCount = null;
                const originalEffect = FX.playInstantWinCinematic;
                FX.playInstantWinCinematic = (kind, bannerText, pieceElements, onDone) => {
                    effectCallCount++;
                    receivedKind = kind;
                    receivedPieceElementCount = pieceElements.length;
                    // Rientranza: mentre la cinematica "gira" (prima di
                    // chiamare onDone), una nuova checkGameOver() non deve
                    // farla ripartire una seconda volta.
                    checkGameOver();
                    setTimeout(onDone, 50);
                };

                updateUI();
                const gameOverImmediatelyAfter = gameState.gameOver;

                setTimeout(() => {
                    FX.playInstantWinCinematic = originalEffect;
                    resolve({
                        gameOverImmediatelyAfter,
                        gameOverAfterCinematic: gameState.gameOver,
                        effectCallCount,
                        receivedKind,
                        receivedPieceElementCount
                    });
                }, 300);
            });
        });
        t.assert(!r1.gameOverImmediatelyAfter, 'La vittoria NON deve scattare subito: deve aspettare la fine della cinematica');
        t.assert(r1.gameOverAfterCinematic, 'La vittoria deve scattare alla fine della cinematica');
        t.assert(r1.effectCallCount === 1, `La cinematica deve partire una volta sola, anche con una checkGameOver() rientrante mentre gira — letta ${r1.effectCallCount} volte`);
        t.assert(r1.receivedKind === 'exodiawin', `Il "kind" passato deve essere "exodiawin" — letto "${r1.receivedKind}"`);
        t.assert(r1.receivedPieceElementCount === 5, `Deve ricevere i 5 DOM element dei pezzi in mano del giocatore — letti ${r1.receivedPieceElementCount}`);

        // Per il bot (mano non mostrata a schermo): l'array degli elementi
        // deve restare vuoto, ma la cinematica/vittoria deve comunque girare.
        const r2 = await t.evaluate(() => {
            return new Promise((resolve) => {
                const pieceIds = [11, 41, 42, 43, 44];
                gameState.botHand = pieceIds.map((id) => ({ ...cardDatabase.find((c) => c.id === id), uid: `exodia-bot-${id}` }));
                gameState.playerHand = [];
                gameState.gameOver = false;
                gameState.instantWinCinematicPlaying = false;

                let receivedPieceElementCount = null;
                const originalEffect = FX.playInstantWinCinematic;
                FX.playInstantWinCinematic = (kind, bannerText, pieceElements, onDone) => {
                    receivedPieceElementCount = pieceElements.length;
                    setTimeout(onDone, 50);
                };

                updateUI();
                setTimeout(() => {
                    FX.playInstantWinCinematic = originalEffect;
                    resolve({ receivedPieceElementCount, gameOver: gameState.gameOver });
                }, 300);
            });
        });
        t.assert(r2.receivedPieceElementCount === 0, `Per la vittoria del bot l'array dei DOM element deve restare vuoto (mano non mostrata a schermo) — letti ${r2.receivedPieceElementCount}`);
        t.assert(r2.gameOver, 'La vittoria del bot deve comunque scattare alla fine della cinematica');

        // Smoke test SENZA mock: la vera implementazione deve comunque
        // chiamare onDone entro un tempo ragionevole, senza restare
        // bloccata — video/vittorie/exodiawin.mp4 ESISTE in questo
        // repository (dura ~18.3s), quindi il tetto d'attesa qui deve
        // coprire la sua vera durata + il margine di sicurezza di
        // playVideoOverlay (durata + 5s), non un numero indovinato a
        // caso. BUG REALE trovato e corretto in questa stessa sessione:
        // playVideoOverlay aveva un tetto di sicurezza FISSO a 12s,
        // quindi un video più lungo (come questo) veniva SEMPRE tagliato
        // a metà prima della fine — ora si ricalibra sulla vera durata
        // del video appena nota (video.duration via 'loadedmetadata').
        const r3 = await t.evaluate(() => {
            return new Promise((resolve) => {
                const start = Date.now();
                const timeout = setTimeout(() => resolve({ finished: false, ms: Date.now() - start }), 25000);
                FX.playInstantWinCinematic('exodiawin', 'EXODIA IL PROIBITO', [], () => {
                    clearTimeout(timeout);
                    resolve({ finished: true, ms: Date.now() - start });
                });
            });
        });
        t.assert(r3.finished, `La vera implementazione (video/vittorie/exodiawin.mp4, ~18.3s) deve chiamare onDone entro 25s — non è mai stata chiamata (letto dopo ${r3.ms}ms)`);
        t.assert(r3.ms > 15000, `Il video deve giocare per (quasi) tutta la sua vera durata, non essere tagliato a metà da un tetto fisso troppo basso (rilevati ${r3.ms}ms, attesi almeno ~15000ms)`);
    }
};
