// Il bot non deve MAI giocare mentre una cinematica copre lo schermo.
//
// Bug reale segnalato dall'utente: "il mio avversario ha evocato il Drago
// Bianco Occhi Blu, è partito il filmato ma nel mentre sotto ha
// attaccato". Il ciclo del bot aspettava le cinematiche solo SUBITO DOPO
// l'Evocazione Normale; le attese successive (entrata in Battle Phase,
// primo attacco) erano a tempo fisso e non ricontrollavano nulla. Una
// cinematica che parte più tardi — una Magia che Evoca Specialmente un
// mostro con filmato dedicato — trovava quindi il bot che tirava dritto:
// il filmato del Drago Bianco dura 6,6 secondi contro i 2,9 di attesa
// fissa fra Evocazione e primo attacco.
//
// QUI NON SI RIPRODUCE UN VIDEO VERO. Una prima versione di questo test
// faceva partire davvero il filmato del Drago Bianco (3 MB) e aspettava
// 17 secondi: passava, ma il carico rendeva instabili gli spec successivi
// della suite — con quel test la suite falliva a rotazione su prove
// diverse, senza di esso era verde (misurato). Qui si sostituisce il solo
// SEGNALE che il ciclo del bot consulta, `FX.isCinematicPlaying`: è
// esattamente ciò che il bot deve rispettare, e il test diventa
// deterministico e breve.
//
// Verificato che COGLIE il bug: rimettendo l'attesa fissa al posto di
// `attendiPoi` (js/ai/bot.js) fallisce con Battle Phase e attacchi
// avvenuti mentre il segnale era ancora alto.
module.exports = {
    name: 'Il bot aspetta la fine di una cinematica di Evocazione prima di giocare',
    // Il ciclo naturale del bot è proprio l'oggetto del test.
    freeze: false,
    async run(t) {
        await t.page.waitForFunction(
            () => typeof gameState !== 'undefined' && typeof FX !== 'undefined' && typeof botTurn === 'function',
            null, { timeout: 20000 }
        );

        const esito = await t.evaluate(() => new Promise((risolvi) => {
            const eventi = [];
            const t0 = performance.now();
            const segna = (c) => eventi.push(Math.round(performance.now() - t0) + 'ms ' + c);
            let violazioni = 0;

            // La cinematica è FINTA: conta solo che il segnale sia alto,
            // perché è l'unica cosa che il ciclo del bot guarda.
            const veroIsCinematicPlaying = FX.isCinematicPlaying;
            let cinematicaAttiva = false;
            FX.isCinematicPlaying = () => cinematicaAttiva || veroIsCinematicPlaying();

            const battagliaVera = window.enterBattlePhase;
            window.enterBattlePhase = function () {
                if (cinematicaAttiva) { violazioni++; segna('Battle Phase DURANTE la cinematica'); }
                const esitoVero = battagliaVera.apply(this, arguments);
                // La cinematica comincia QUI, a Battle Phase appena
                // iniziata: il controllo che il ciclo fa dopo l'Evocazione
                // Normale è già stato superato da un pezzo, ed è proprio
                // la finestra in cui il bot tirava dritto. Dura 4s, come
                // un filmato breve.
                if (!cinematicaAttiva && !eventi.some((e) => e.indexOf('cinematica accesa') !== -1)) {
                    cinematicaAttiva = true;
                    segna('cinematica accesa');
                    setTimeout(() => { cinematicaAttiva = false; segna('cinematica finita'); }, 4000);
                }
                return esitoVero;
            };

            const attaccoVero = window.resolveAttack;
            window.resolveAttack = function () {
                if (cinematicaAttiva) { violazioni++; segna('attacco DURANTE la cinematica'); }
                return attaccoVero.apply(this, arguments);
            };

            const ripristina = () => {
                FX.isCinematicPlaying = veroIsCinematicPlaying;
                window.enterBattlePhase = battagliaVera;
                window.resolveAttack = attaccoVero;
            };

            const mostro = { ...cardDatabase.find((c) => c.type === 'monster' && !c.extraDeck), uid: 'attaccante-prova' };
            gameState.currentPlayer = 'bot';
            gameState.turn = 3;
            gameState.gameOver = false;
            gameState.hasNormalSummoned = false;
            gameState.botMonsterField[0] = { card: mostro, position: 'attack', isFaceDown: false, hasAttacked: false };
            gameState.playerMonsterField = [null, null, null, null, null];

            botTurn();

            setTimeout(() => {
                const accesa = eventi.some((e) => e.indexOf('cinematica accesa') !== -1);
                ripristina();
                risolvi({ violazioni: violazioni, accesa: accesa, eventi: eventi });
            }, 11000);
        }));

        t.assert(esito.accesa, 'Il bot deve arrivare in Battle Phase (è lì che la prova accende la cinematica): senza, non si sta provando nulla');
        t.assert(
            esito.violazioni === 0,
            `Il bot ha agito ${esito.violazioni} volte mentre la cinematica era in corso: ${esito.eventi.join(' | ')}`
        );
    }
};
