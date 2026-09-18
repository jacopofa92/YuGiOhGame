// Multiplayer: le mosse che cambiano lo stato pubblico ma non viaggiavano
// (o viaggiavano al momento sbagliato).
// =====================================================================
// Quarto spec del Multiplayer. Nato da un giro di controllo che cercava
// una cosa sola: quali mosse di un duello vero cambiano lo stato PUBBLICO
// senza che l'avversario ne sappia nulla. Ne sono uscite cinque, tutte
// della stessa famiglia e tutte chiuse qui.
//
//  1. ATTIVAZIONE DI UNA MAGIA/TRAPPOLA — l'avviso partiva a Chain GIÀ
//     RISOLTA. Chi attivava apriva la finestra di risposta e chiedeva
//     all'avversario se voleva rispondere a qualcosa che non gli era
//     ancora stato detto: nessuno poteva rispondere, e ogni attivazione
//     restava ferma i 30 secondi interi del tetto d'attesa prima di
//     risolversi (misurato: il campo si svuotava a ~33s).
//  2. L'ECO INFINITA che ne seguiva: chi riceveva l'attivazione la
//     ri-trasmetteva al mittente (il controllo su MP_applyingRemote vale
//     solo per la parte sincrona, ed era già tornato falso a Chain
//     risolta), quello la riapplicava e la rimandava indietro. Un Buco
//     Nero rimbalzava fra i due client, un giro ogni 30 secondi, per
//     sempre.
//  3. ATTIVAZIONE DALLA MANO — di là quell'indice della mano contiene un
//     segnaposto ('???'), quindi non si attivava proprio nulla.
//  4. SPECIAL SUMMON DALLA PROPRIA MANO (Gilasaurus e gli altri ~30 che
//     si Evocano da sé) — non viaggiava affatto.
//  5. SCARTO PER IL LIMITE DI 6 CARTE a fine turno — non viaggiava, e chi
//     riceveva tirava a indovinare scartando al posto dell'avversario.
//
// C'era anche un sesto guasto, che non si vede da una mossa sola e ha il
// suo controllo in fondo: il RESYNC ribaltava di chi fosse il turno.
// 'player' e 'bot' sono relativi a chi guarda, e chi riceveva la
// fotografia si copiava il campo `currentPlayer` pari pari — dopo ogni
// risincronizzazione i due client credevano ENTRAMBI che fosse il proprio
// turno.
//
// COSA SI MISURA, oltre all'effetto visibile: che i due checksum
// coincidano e che chi riceve non chieda un resync. Il motore si
// riallinea da sé quando divergono, quindi senza quest'ultima misura
// metà di questi bug sembrerebbe verde.
const { startStaticServer, startRoomServer } = require('../helpers/local-servers');

module.exports = {
    name: 'Multiplayer: mosse che non viaggiavano (Magia dalla mano, Special Summon, limite di mano, turno dopo un resync)',
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
                }, { timeout: 15000 });
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
            }, { timeout: 15000 });
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
                { timeout: 40000 }
            );
            await Promise.all([arenaReady(pageA), arenaReady(pageB)]);
            for (const page of [pageA, pageB]) {
                try { await page.click('.di-skip', { timeout: 4000 }); } catch (e) { /* nessuna intro */ }
            }

            const aStarts = await pageA.evaluate(() => window.MP_startingRole === 'player');
            const actor = aStarts ? pageA : pageB;
            const watcher = aStarts ? pageB : pageA;
            await actor.waitForFunction(() => gameState.phase === 'main1' && gameState.currentPlayer === 'player', { timeout: 25000 });
            await watcher.waitForFunction(() => gameState.phase === 'main1' && gameState.currentPlayer === 'bot', { timeout: 25000 });

            await watcher.evaluate(() => {
                window.__mpSent = [];
                const inner = window.MP_broadcast;
                window.MP_broadcast = function (action) { window.__mpSent.push(action.kind); return inner(action); };
            });
            const resetSpia = () => watcher.evaluate(() => { window.__mpSent.length = 0; });
            const resyncCount = () => watcher.evaluate(() => window.__mpSent.filter((k) => k === 'request-resync').length);
            const activateCount = () => watcher.evaluate(() => window.__mpSent.filter((k) => k === 'activate').length);
            const checksumsMatch = async (what) => {
                const [x, y] = await Promise.all([
                    actor.evaluate(() => DuelEngine.computeStateChecksum()),
                    watcher.evaluate(() => DuelEngine.computeStateChecksum())
                ]);
                assert(x === y, `${what}: i due client devono avere lo stesso checksum (attivo: "${x}", osservatore: "${y}")`);
            };

            // --- 1/2/3) Magia attivata DALLA MANO ----------------------
            // Buco Nero: un mostro per parte, e alla fine non deve restarne
            // nessuno su NESSUNO dei due schermi. Il campo si prepara
            // uguale di qua e di là, a mano: quello che conta è cosa fa
            // l'attivazione, non come ci si è arrivati.
            const preparaCampo = (page, mioUid, suoUid) => page.evaluate(([mio, suo]) => {
                const m = cardDatabase.find((c) => c.type === 'monster' && !c.extraDeck && (c.level || 4) <= 4);
                gameState.playerMonsterField[0] = { card: Object.assign({}, m, { uid: mio }), position: 'attack', isFaceDown: false, hasAttacked: false, canChangePosition: false };
                gameState.botMonsterField[0] = { card: Object.assign({}, m, { uid: suo }), position: 'attack', isFaceDown: false, hasAttacked: false, canChangePosition: false };
                updateUI();
            }, [mioUid, suoUid]);
            await preparaCampo(actor, 'mp_mio', 'mp_suo');
            await preparaCampo(watcher, 'mp_suo', 'mp_mio');
            await actor.waitForTimeout(500);
            await checksumsMatch('Con un mostro per parte');
            await resetSpia();

            const attivato = await actor.evaluate(() => {
                const bucoNero = cardDatabase.find((c) => c.id === 7);
                gameState.playerHand[0] = Object.assign({}, bucoNero, { uid: 'mp_buco_nero' });
                return DuelEngine.activateCard('player', 'hand', 0);
            });
            assert(attivato === true, 'Il Buco Nero deve risultare attivabile dalla mano');

            // Tetto DELIBERATAMENTE stretto (12s): con l'avviso mandato
            // solo a Chain risolta ci volevano i 30 secondi interi del
            // tetto d'attesa remoto, quindi è proprio questa attesa a
            // cogliere lo stallo. Il `null` non è un vezzo: la firma è
            // waitForFunction(fn, arg, options), e passando le opzioni come
            // secondo argomento finirebbero in `arg` — il timeout
            // tornerebbe al default di 30s, cioè giusto sopra lo stallo che
            // qui si vuole cogliere.
            const campoVuoto = (page) => page.waitForFunction(
                () => gameState.playerMonsterField.filter(Boolean).length === 0
                    && gameState.botMonsterField.filter(Boolean).length === 0,
                null,
                { timeout: 12000 }
            );
            await campoVuoto(actor);
            await campoVuoto(watcher);
            await actor.waitForTimeout(1500);
            await checksumsMatch('Dopo la Magia attivata dalla mano');
            assert((await resyncCount()) === 0, 'Magia dalla mano: nessun resync deve scattare');
            // L'eco: chi riceve non deve MAI ri-trasmettere l'attivazione
            // che gli è appena arrivata, o i due client se la rimpallano.
            assert((await activateCount()) === 0,
                `Chi riceve un'attivazione non deve rimandarla indietro (ne ha ritrasmesse ${await activateCount()})`);

            // --- 4) Special Summon dalla propria mano ------------------
            await resetSpia();
            const gilaName = await actor.evaluate(() => {
                const gila = cardDatabase.find((c) => c.id === 266); // Gilasaurus: nessun costo, Posizione fissa
                gameState.playerHand[0] = Object.assign({}, gila, { uid: 'mp_gila' });
                DuelEngine.trySpecialSummonFromHand('player', 0);
                return gila.name;
            });
            await watcher.waitForFunction(
                (nome) => gameState.botMonsterField.some((s) => s && s.card.name === nome),
                gilaName,
                { timeout: 15000 }
            );
            await actor.waitForTimeout(1200);
            await checksumsMatch('Dopo la Special Summon dalla mano');
            assert((await resyncCount()) === 0, 'Special Summon dalla mano: nessun resync deve scattare');

            // --- 5) Scarto per il limite di 6 carte a fine turno -------
            await resetSpia();
            await actor.evaluate(() => {
                const m = cardDatabase.find((c) => c.type === 'monster' && !c.extraDeck);
                while (gameState.playerHand.length < 9) {
                    gameState.playerHand.push(Object.assign({}, m, { uid: 'mp_extra' + gameState.playerHand.length }));
                }
                updateUI();
            });
            // La mano cresciuta a mano non è passata dalla rete: si allinea
            // l'osservatore prima di misurare. La richiesta parte da CHI
            // DEVE IMPARARE — chi la riceve risponde col proprio stato.
            await watcher.evaluate(() => { if (window.MP_broadcast) MP_broadcast({ kind: 'request-resync' }); });
            await actor.waitForTimeout(1500);
            await checksumsMatch('Con 9 carte in mano');
            await resetSpia();

            await actor.evaluate(() => { enterEndPhase(); });
            await actor.waitForFunction(() => !!gameState.pendingHandDiscard, { timeout: 10000 });
            await actor.evaluate(() => {
                const quante = gameState.pendingHandDiscard.needed;
                for (let i = 0; i < quante; i++) handleHandDiscardSelectClick(i);
            });
            // L'attesa non deve FALLIRE da sola: se lo scarto non arriva,
            // il messaggio sarebbe un "Timeout" che non dice niente. Si
            // lascia scadere e si lascia parlare la verifica esplicita qui
            // sotto, che dice quante carte vede ciascuno.
            await watcher.waitForFunction(() => gameState.botHand.length === 6, null, { timeout: 12000 })
                .catch(() => { /* ci pensa l'assert */ });
            const maniFinali = await Promise.all([
                actor.evaluate(() => gameState.playerHand.length),
                watcher.evaluate(() => ({
                    mano: gameState.botHand.length,
                    finte: gameState.botGraveyard.filter((c) => c.id === -1 || c.name === '???').length
                }))
            ]);
            assert(maniFinali[0] === maniFinali[1].mano,
                `Limite di mano: l'avversario deve vedere lo stesso numero di carte (lui ${maniFinali[0]}, visto ${maniFinali[1].mano})`);
            assert(maniFinali[1].finte === 0,
                `Limite di mano: nel Cimitero dell'avversario non devono finire segnaposto '???' (trovati: ${maniFinali[1].finte})`);

            // --- 6) Il resync non deve ribaltare di chi è il turno ------
            // Nessuna verifica "prima": a questo punto del test un resync
            // è già passato (l'allineamento della mano poco sopra), quindi
            // se la traduzione manca il turno è già ribaltato — e sarebbe
            // un fallimento buono, ma con un messaggio che indica il posto
            // sbagliato. Si guarda solo lo stato DOPO, che è quello che
            // conta e che è sbagliato in entrambi i casi.
            const turniPrima = await Promise.all([
                actor.evaluate(() => gameState.currentPlayer),
                watcher.evaluate(() => gameState.currentPlayer)
            ]);
            await watcher.evaluate(() => { if (window.MP_broadcast) MP_broadcast({ kind: 'request-resync' }); });
            await actor.waitForTimeout(1500);
            const turniDopo = await Promise.all([
                actor.evaluate(() => gameState.currentPlayer),
                watcher.evaluate(() => gameState.currentPlayer)
            ]);
            assert(turniDopo[0] !== turniDopo[1],
                `Dopo un resync il turno deve restare di UNO solo: 'player' e 'bot' sono relativi a chi guarda, e vanno tradotti `
                + `(prima: "${turniPrima[0]}" / "${turniPrima[1]}", dopo: "${turniDopo[0]}" / "${turniDopo[1]}")`);

            assert(pageErrors.length === 0, `Errori JS non gestiti: ${pageErrors.join(' | ')}`);
        } finally {
            await context.close();
            await room.close();
            await statics.close();
        }
    }
};
