// Il bot non deve MAI giocare mentre una cinematica copre lo schermo.
//
// Bug reale segnalato dall'utente: "il mio avversario ha evocato il Drago
// Bianco Occhi Blu, è partito il filmato ma nel mentre sotto ha
// attaccato". Il ciclo del bot aspettava le cinematiche solo SUBITO DOPO
// l'Evocazione Normale; le attese successive (entrata in Battle Phase,
// primo attacco) erano a tempo fisso e non ricontrollavano nulla. Una
// cinematica che parte più tardi — una Magia che Evoca Specialmente un
// mostro con filmato dedicato, per dire — trovava quindi il bot che
// tirava dritto: il filmato del Drago Bianco dura 6,6 secondi contro i
// 2,9 di attesa fissa fra Evocazione e primo attacco.
//
// QUI si riproduce esattamente quella finestra: la cinematica parte
// all'ingresso in Battle Phase, cioè dopo che il controllo esistente è
// già stato superato. Verificato che il test COGLIE il bug: ripristinando
// l'attesa fissa al posto di `attendiPoi` (js/ai/bot.js) fallisce con due
// attacchi durante il filmato.
module.exports = {
    name: 'Il bot aspetta la fine di un filmato di Evocazione prima di attaccare (Drago Bianco id 1)',
    // Il ciclo naturale del bot è proprio l'oggetto del test: non va congelato.
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

            const drago = { ...cardDatabase.find((c) => c.id === 1), uid: 'drago-prova' };
            let filmatoPartito = false;

            // Sonda su Battle Phase: registra se arriva mentre un filmato è
            // a schermo, e FA PARTIRE il filmato la prima volta — è la
            // finestra in cui il bot non controllava più nulla.
            const battagliaVera = window.enterBattlePhase;
            window.enterBattlePhase = function () {
                if (FX.isCinematicPlaying()) { violazioni++; segna('Battle Phase DURANTE il filmato'); }
                const esitoVero = battagliaVera.apply(this, arguments);
                if (!filmatoPartito) {
                    filmatoPartito = true;
                    const slot = document.querySelector('#botFieldBoard .field-slot[data-type="monster"][data-index="0"]');
                    segna('parte il filmato');
                    FX.playMonsterSummonEffect(drago, slot);
                }
                return esitoVero;
            };

            // Sonda sugli attacchi: è l'azione che l'utente ha visto
            // avvenire sotto al filmato.
            const attaccoVero = window.resolveAttack;
            window.resolveAttack = function () {
                if (FX.isCinematicPlaying()) { violazioni++; segna('attacco DURANTE il filmato'); }
                return attaccoVero.apply(this, arguments);
            };

            gameState.currentPlayer = 'bot';
            gameState.turn = 3;
            gameState.gameOver = false;
            gameState.hasNormalSummoned = false;
            gameState.botMonsterField[0] = { card: drago, position: 'attack', isFaceDown: false, hasAttacked: false };
            gameState.playerMonsterField = [null, null, null, null, null];

            botTurn();

            // Finestra abbondante: il filmato dura ~6,6s e il turno del bot
            // deve avere il tempo di arrivare agli attacchi DOPO di esso.
            setTimeout(() => {
                window.enterBattlePhase = battagliaVera;
                window.resolveAttack = attaccoVero;
                risolvi({ violazioni: violazioni, filmatoPartito: filmatoPartito, eventi: eventi });
            }, 17000);
        }));

        t.assert(esito.filmatoPartito, 'Il bot deve arrivare in Battle Phase: senza, il test non sta provando nulla');
        t.assert(
            esito.violazioni === 0,
            `Il bot ha agito ${esito.violazioni} volte mentre il filmato era a schermo: ${esito.eventi.join(' | ')}`
        );
    }
};
