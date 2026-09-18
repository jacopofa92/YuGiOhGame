// Multiplayer: una partita di più turni, con una battaglia vera.
// =====================================================================
// Quinto spec del Multiplayer, e quello che copre il pezzo di duello che
// restava senza rete: il CICLO DI TURNO e la BATTAGLIA. Gli altri
// verificano mosse singole su un campo preparato a mano
// (multiplayer-end-to-end, -tributi, -mosse-non-trasmesse) o la sala
// d'attesa (-lobby-abbandono); nessuno faceva passare il turno più volte,
// e nessuno faceva combattere due mostri.
//
// Perché conta: i Life Point entrano nel checksum anti-desync come il
// resto, ma non erano mai stati confrontati fra i due client — e la
// finestra di risposta del difensore (Forza dello Specchio, Cilindro
// Magico: le carte più iconiche del gioco) è esattamente il punto in cui
// un difetto di protocollo si manifesta come un'attesa infinita, com'è
// già successo per le attivazioni.
//
// I tetti di attesa sulla battaglia sono DELIBERATAMENTE stretti: un
// avversario che viene interpellato su qualcosa che non gli è stato
// trasmesso non risponde mai, e chi attacca resta fermo fino al tetto
// remoto di 30 secondi. Un tetto stretto trasforma quello stallo in un
// fallimento invece che in un test lento che passa lo stesso.
const { startStaticServer, startRoomServer } = require('../helpers/local-servers');

module.exports = {
    name: 'Multiplayer: più turni, pescate e una battaglia vera',
    standalone: true,
    async run({ browser, assert }) {
        const statics = await startStaticServer();
        const room = await startRoomServer();
        const context = await browser.newContext({ viewport: { width: 1280, height: 860 }, serviceWorkers: 'block' });
        const pageErrors = [];

        try {
            const openLobby = async (label) => {
                const page = await context.newPage();
                page.on('pageerror', (err) => pageErrors.push(`[${label}] ${err.message}`));
                await page.addInitScript(() => { window.AUTH_GATE_SKIP = true; window.DUEL_RPS_SKIP = true; });
                await page.goto(statics.origin + '/multiplayer.html', { waitUntil: 'load' });
                await page.waitForSelector('#mpCreateBtn');
                await page.waitForFunction(() => {
                    const el = document.getElementById('pageLoader');
                    return !el || el.classList.contains('page-loader-hidden');
                }, null, { timeout: 15000 });
                await page.evaluate(() => {
                    const avanzate = document.querySelector('.mp-advanced');
                    if (avanzate) avanzate.open = true;
                });
                await page.fill('#mpServerUrl', room.wsUrl);
                return page;
            };

            const pageA = await openLobby('A');
            const pageB = await openLobby('B');
            await pageA.click('#mpCreateBtn');
            await pageA.waitForFunction(() => {
                const el = document.getElementById('mpRoomCodeValue');
                return el && /^[A-Z0-9]{5}$/.test(el.textContent.trim());
            }, null, { timeout: 15000 });
            const code = (await pageA.textContent('#mpRoomCodeValue')).trim();
            await pageB.click('#mpTabJoin');
            await pageB.fill('#mpJoinCode', code);
            await pageB.click('#mpJoinBtn');
            await pageA.waitForSelector('#mpReadyBar:not([hidden])', { timeout: 20000 });
            await pageB.waitForSelector('#mpReadyBar:not([hidden])', { timeout: 20000 });
            await pageA.click('#mpReadyBtn');
            await pageB.click('#mpReadyBtn');

            const arenaReady = (page) => page.waitForFunction(
                () => window.MULTIPLAYER_MODE === true && typeof gameState !== 'undefined'
                    && typeof DuelEngine !== 'undefined' && Array.isArray(gameState.playerHand)
                    && gameState.playerHand.length >= 5,
                null, { timeout: 40000 }
            );
            await Promise.all([arenaReady(pageA), arenaReady(pageB)]);
            for (const page of [pageA, pageB]) {
                try { await page.click('.di-skip', { timeout: 4000 }); } catch (e) { /* nessuna intro */ }
            }
            for (const page of [pageA, pageB]) {
                await page.evaluate(() => {
                    window.__mpSent = [];
                    const inner = window.MP_broadcast;
                    window.MP_broadcast = function (action) { window.__mpSent.push(action.kind); return inner(action); };
                });
            }

            const stato = (page) => page.evaluate(() => ({
                turno: gameState.turn,
                diChi: gameState.currentPlayer,
                miaMano: gameState.playerHand.length,
                manoAvversario: gameState.botHand.length,
                mioMazzo: gameState.playerDeck.length,
                contatoreAvversario: gameState.botDeckCount,
                lpMio: gameState.playerLP,
                lpSuo: gameState.botLP,
                somma: DuelEngine.computeStateChecksum()
            }));
            const diTurno = async () => (
                (await pageA.evaluate(() => gameState.currentPlayer)) === 'player'
                    ? { attivo: pageA, passivo: pageB }
                    : { attivo: pageB, passivo: pageA }
            );
            const aspettaMain1 = (page) => page.waitForFunction(
                () => gameState.phase === 'main1' && gameState.currentPlayer === 'player',
                null, { timeout: 30000 }
            );

            let { attivo, passivo } = await diTurno();
            await aspettaMain1(attivo);

            // --- Due cambi di turno, con la pescata di chi comincia -----
            for (let giro = 1; giro <= 2; giro++) {
                const primaAttivo = await stato(attivo);
                const primaPassivo = await stato(passivo);
                const turnoPrima = primaAttivo.turno;

                await attivo.evaluate(() => endTurn());
                // Si aspetta il cambio VERO su tutti e due i lati, non un
                // tempo indovinato: il turno passa perché viaggiano le
                // FASI, e quanto ci mettano dipende dalle animazioni.
                const cambiato = (page) => page.waitForFunction(
                    (t) => gameState.turn > t, turnoPrima, { timeout: 25000 }
                ).then(() => true).catch(() => false);
                const [ca, cp] = await Promise.all([cambiato(attivo), cambiato(passivo)]);
                assert(ca && cp, `Giro ${giro}: il turno deve cambiare su ENTRAMBI i lati (attivo ${ca}, passivo ${cp})`);

                const nuovo = await diTurno();
                await aspettaMain1(nuovo.attivo);
                const dopoAttivo = await stato(nuovo.attivo);
                const dopoPassivo = await stato(nuovo.passivo);

                // Chi comincia il turno pesca: era il "passivo" del giro
                // appena chiuso.
                assert(dopoAttivo.miaMano === primaPassivo.miaMano + 1,
                    `Giro ${giro}: chi comincia il turno deve pescare 1 carta (${primaPassivo.miaMano} -> ${dopoAttivo.miaMano})`);
                assert(dopoPassivo.manoAvversario === dopoAttivo.miaMano,
                    `Giro ${giro}: l'avversario deve vedere la stessa mano (vede ${dopoPassivo.manoAvversario}, sono ${dopoAttivo.miaMano})`);
                assert(dopoPassivo.contatoreAvversario === dopoAttivo.mioMazzo,
                    `Giro ${giro}: il contatore del Deck visto dall'avversario deve seguire la pescata (vede ${dopoPassivo.contatoreAvversario}, sono ${dopoAttivo.mioMazzo})`);
                assert(dopoAttivo.somma === dopoPassivo.somma,
                    `Giro ${giro}: stesso checksum dopo il cambio turno ("${dopoAttivo.somma}" contro "${dopoPassivo.somma}")`);
                assert(dopoAttivo.diChi !== dopoPassivo.diChi,
                    `Giro ${giro}: il turno deve restare di UNO solo (${dopoAttivo.diChi} / ${dopoPassivo.diChi})`);

                attivo = nuovo.attivo;
                passivo = nuovo.passivo;
            }

            // --- Cambio Posizione --------------------------------------
            await attivo.evaluate(() => {
                const m = cardDatabase.find((c) => c.type === 'monster' && !c.extraDeck && (c.level || 4) <= 4);
                gameState.hasNormalSummoned = false;
                gameState.playerHand[0] = Object.assign({}, m, { uid: 'mp_pos' });
                summonMonster(gameState.playerHand[0], 0, 'attack', 0);
            });
            await passivo.waitForFunction(() => !!gameState.botMonsterField[0], null, { timeout: 15000 });
            await attivo.evaluate(() => {
                // Un mostro appena Evocato non potrebbe cambiare Posizione
                // nello stesso turno: si retrodata, che è più corto che
                // far passare un altro giro di turni solo per questo.
                gameState.playerMonsterField[0].summonedOnTurn = 0;
                gameState.playerMonsterField[0].canChangePosition = true;
                changeMonsterPosition(0);
            });
            await passivo.waitForFunction(
                () => !!gameState.botMonsterField[0] && gameState.botMonsterField[0].position === 'defense',
                null, { timeout: 15000 }
            );

            // --- Battaglia vera, col difensore interpellato -------------
            // Campo preparato uguale di qua e di là: un attaccante forte
            // contro un difensore debole, e una Trappola COPERTA dalla
            // parte di chi difende — il caso in cui il difensore deve
            // essere davvero interpellato prima che il danno si applichi.
            const preparaAttaccante = (page, mioUid, suoUid) => page.evaluate(([mio, suo]) => {
                const forte = cardDatabase.find((c) => c.type === 'monster' && !c.extraDeck && c.attack === 1800);
                const debole = cardDatabase.find((c) => c.type === 'monster' && !c.extraDeck && c.attack === 1200);
                gameState.playerMonsterField[0] = { card: Object.assign({}, forte, { uid: mio }), position: 'attack', isFaceDown: false, hasAttacked: false, canChangePosition: false };
                gameState.botMonsterField[0] = { card: Object.assign({}, debole, { uid: suo }), position: 'attack', isFaceDown: false, hasAttacked: false, canChangePosition: false };
                const trappola = cardDatabase.find((c) => c.id === 382); // Forza dello Specchio
                gameState.botSTField[0] = { card: Object.assign({}, trappola, { uid: 'mp_specchio' }), isFaceDown: true, setOnTurn: 0 };
                gameState.playerSTField[0] = null;
                gameState.phase = 'battle';
                updateUI();
                return { attaccante: forte.name, difensore: debole.name, atk: forte.attack, def: debole.attack };
            }, [mioUid, suoUid]);
            const preparaDifensore = (page, mioUid, suoUid) => page.evaluate(([mio, suo]) => {
                const forte = cardDatabase.find((c) => c.type === 'monster' && !c.extraDeck && c.attack === 1800);
                const debole = cardDatabase.find((c) => c.type === 'monster' && !c.extraDeck && c.attack === 1200);
                gameState.botMonsterField[0] = { card: Object.assign({}, forte, { uid: suo }), position: 'attack', isFaceDown: false, hasAttacked: false, canChangePosition: false };
                gameState.playerMonsterField[0] = { card: Object.assign({}, debole, { uid: mio }), position: 'attack', isFaceDown: false, hasAttacked: false, canChangePosition: false };
                const trappola = cardDatabase.find((c) => c.id === 382);
                gameState.playerSTField[0] = { card: Object.assign({}, trappola, { uid: 'mp_specchio' }), isFaceDown: true, setOnTurn: 0 };
                gameState.botSTField[0] = null;
                gameState.phase = 'battle';
                updateUI();
            }, [mioUid, suoUid]);
            const carte = await preparaAttaccante(attivo, 'mp_att', 'mp_dif');
            await preparaDifensore(passivo, 'mp_dif', 'mp_att');
            await attivo.waitForTimeout(600);

            const lpPrima = await stato(passivo);
            await attivo.evaluate(() => { executeAttack(0, 0); });

            // Il difensore DEVE essere interpellato: è tutto il senso di
            // una Trappola coperta, ed è il punto dove uno stallo di
            // protocollo si vedrebbe subito.
            const promptDifensore = await passivo.waitForSelector('#activateModal.open', { timeout: 12000 })
                .then(() => true).catch(() => false);
            assert(promptDifensore,
                'Il difensore deve essere interpellato prima che il danno si applichi: senza, una Trappola coperta in Multiplayer è carta morta');
            const rifiuta = await passivo.$('#activateCancelBtn, #activateDeclineBtn, .modal-btn-secondary');
            if (rifiuta) await rifiuta.click();

            // Risoluzione rapida su entrambi i lati (tetto stretto: uno
            // stallo da timeout remoto fallisce qui).
            const danno = carte.atk - carte.def;
            await attivo.waitForFunction(
                (atteso) => gameState.botLP === 8000 - atteso, danno, { timeout: 12000 }
            );
            await passivo.waitForFunction(
                (atteso) => gameState.playerLP === 8000 - atteso, danno, { timeout: 12000 }
            );
            const dopoAtt = await stato(attivo);
            const dopoPas = await stato(passivo);
            assert(dopoAtt.lpMio === dopoPas.lpSuo && dopoAtt.lpSuo === dopoPas.lpMio,
                `I Life Point devono coincidere rovesciati fra i due client (attaccante ${dopoAtt.lpMio}/${dopoAtt.lpSuo}, difensore ${dopoPas.lpMio}/${dopoPas.lpSuo})`);
            assert(dopoAtt.somma === dopoPas.somma,
                `Dopo la battaglia i due client devono avere lo stesso checksum ("${dopoAtt.somma}" contro "${dopoPas.somma}")`);
            assert(lpPrima.lpMio === 8000 && dopoPas.lpMio === 8000 - danno,
                `Il difensore deve perdere esattamente la differenza di ATK (${danno}): era ${lpPrima.lpMio}, ora ${dopoPas.lpMio}`);

            const resync = (await Promise.all([pageA, pageB].map(
                (p) => p.evaluate(() => window.__mpSent.filter((k) => k === 'request-resync').length)
            ))).reduce((x, y) => x + y, 0);
            assert(resync === 0, `Nessun resync deve scattare in tutta la partita (ne sono stati chiesti ${resync})`);

            assert(pageErrors.length === 0, `Errori JS non gestiti: ${pageErrors.join(' | ')}`);
        } finally {
            await context.close();
            await room.close();
            await statics.close();
        }
    }
};
