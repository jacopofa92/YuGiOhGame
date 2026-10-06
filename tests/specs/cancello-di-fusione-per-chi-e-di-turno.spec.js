// Cancello di Fusione (id 887) usato da chi è di turno, anche se la Magia
// Terreno è dell'AVVERSARIO — il comando 'usaTerrenoAltrui'.
// =====================================================================
// Prima la persona e l'IA avevano due copie della stessa mossa (una in
// actions.js, una in bot.js); ora è un comando solo (js/engine/comandi.js)
// con il posto come parametro. Nessuno spec la copriva: questo prova i due
// posti — la persona dal click sul Terreno avversario, l'IA dalla sua
// funzione di turno — e che chi NON è di turno non la possa usare.
module.exports = {
    name: 'Cancello di Fusione: lo usa chi è di turno, anche sul Terreno avversario (persona e IA)',
    async run(t) {
        const esito = await t.evaluate(async () => {
            const carta = (id, uid) => ({ ...cardDatabase.find((c) => c.id === id), uid });
            const fxVero = FX.playFusionMaterialEffect;
            FX.playFusionMaterialEffect = (_m, _f, _o, done) => { done(); return 0; };
            const prepara = (diTurno, proprietarioCancello) => {
                const altro = diTurno === 'player' ? 'bot' : 'player';
                gameState.currentPlayer = diTurno;
                gameState.phase = 'main1';
                gameState.gameOver = false;
                [diTurno, altro].forEach((p) => {
                    gameState[p + 'MonsterField'] = [null, null, null, null, null];
                    gameState[p + 'Banished'] = [];
                    gameState[p + 'Graveyard'] = [];
                    gameState[p + 'FieldSpell'] = null;
                });
                gameState[diTurno + 'Hand'] = [0, 1, 2].map((i) => carta(1, `cancello-${diTurno}-occhi-blu-${i}`));
                gameState[diTurno + 'ExtraDeck'] = [carta(29, `cancello-${diTurno}-definitivo`)];
                gameState[proprietarioCancello + 'FieldSpell'] = { card: carta(887, 'cancello-carta'), isFaceDown: false };
            };
            const fotografia = (p) => ({
                fusione: gameState[p + 'MonsterField'].some((s) => s && s.card && s.card.id === 29),
                banditi: gameState[p + 'Banished'].length,
                mano: gameState[p + 'Hand'].length,
                extra: gameState[p + 'ExtraDeck'].length
            });

            // A) La persona, nel suo turno, usa il Cancello del bot.
            prepara('player', 'bot');
            const usatoDallaPersona = Comandi.esegui('player', { tipo: 'usaTerrenoAltrui' });
            const a = Object.assign({ usato: usatoDallaPersona }, fotografia('player'));

            // B) Lo stesso comando per chi NON è di turno: non deve fare nulla.
            prepara('player', 'bot');
            const usatoFuoriTurno = Comandi.esegui('bot', { tipo: 'usaTerrenoAltrui' });
            const b = Object.assign({ usato: usatoFuoriTurno }, fotografia('bot'));

            // C) L'IA, nel suo turno, usa il Cancello della persona.
            prepara('bot', 'player');
            await attemptBotUseTurnPlayerFieldSpell('bot');
            const c = fotografia('bot');

            FX.playFusionMaterialEffect = fxVero;
            return { a, b, c };
        });

        t.assert(esito.a.usato && esito.a.fusione && esito.a.banditi === 3 && esito.a.mano === 0 && esito.a.extra === 0,
            `La persona di turno deve Evocare per Fusione dal Cancello avversario, bandendo i materiali: ${JSON.stringify(esito.a)}`);
        t.assert(!esito.b.usato && !esito.b.fusione && esito.b.banditi === 0,
            `Chi non è di turno non deve poter usare il Cancello: ${JSON.stringify(esito.b)}`);
        t.assert(esito.c.fusione && esito.c.banditi === 3 && esito.c.extra === 0,
            `L'IA di turno deve usare il Cancello della persona con lo stesso comando: ${JSON.stringify(esito.c)}`);
    }
};
