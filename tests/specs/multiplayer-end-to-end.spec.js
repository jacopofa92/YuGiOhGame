// Multiplayer end-to-end: DUE client veri, il server di stanze vero.
// =====================================================================
// Fino a qui il Multiplayer era l'unica parte del progetto senza alcuna
// rete di sicurezza automatica: ogni modifica al protocollo si poteva
// verificare solo aprendo due browser a mano. Questo test chiude quel
// buco — e non simula nulla del relay: avvia server/server.js come vero
// sottoprocesso e apre due pagine su multiplayer.html, che fanno lobby,
// stanza e duello esattamente come due giocatori reali.
//
// `standalone: true` (vedi tests/run-all.js): questo spec non vuole la
// pagina già aperta sul duello che ricevono tutti gli altri — se la
// costruisce da sé, due volte.
//
// SERVE UN SERVER HTTP: mp-lobby.js carica l'arena con
// `fetch('duelMonstersCore.html')`, e su file:// quella fetch è bloccata
// dal browser. Vedi tests/helpers/local-servers.js.
//
// Cosa verifica, in ordine: accoppiamento in stanza; una mossa per ogni
// tipo di messaggio del protocollo (summon / spelltrap / fieldspell);
// che dopo OGNI mossa il checksum anti-desync dei due lati coincida; che
// una Magia Terreno non faccia scattare un resync; che il difensore
// venga davvero interpellato per rispondere in Catena e che la sua
// risposta arrivi all'altro lato; e che una resa arrivi all'avversario
// come vittoria.
const { startStaticServer, startRoomServer } = require('../helpers/local-servers');

// Nota su come il test si procura le carte da giocare: la mano è pescata
// a caso dal mazzo, quindi ogni mossa parte SOSTITUENDO una carta della
// mano con quella che serve (`gameState.playerHand[i] = ...`), mai
// aggiungendone una — il CONTEGGIO della mano entra nel checksum
// anti-desync, quindi allungarla disallineerebbe i due client per colpa
// del test invece che per un bug del motore. Il contenuto della mano non
// viaggia mai sulla rete (solo il conteggio), quindi sostituirla è
// invisibile all'avversario, esattamente come una pescata vera.

module.exports = {
    name: 'Multiplayer end-to-end: due client attraverso il server di stanze',
    standalone: true,
    async run({ browser, assert }) {
        const statics = await startStaticServer();
        const room = await startRoomServer();
        // serviceWorkers: 'block' — sw.js non deve poter servire una
        // versione in cache di duelMonstersCore.html a metà test: qui
        // conta sempre il file su disco, quello appena modificato.
        const context = await browser.newContext({ viewport: { width: 1400, height: 900 }, serviceWorkers: 'block' });
        const pageErrors = [];

        try {
            const openLobby = async (label) => {
                const page = await context.newPage();
                page.on('pageerror', (err) => pageErrors.push(`[${label}] ${err.message}`));
                // Stessi due opt-out di tests/helpers/harness.js#openDuel, per
                // le stesse ragioni: nessun account Supabase in questa suite,
                // e nessuna morra cinese da cliccare (in Multiplayer chi
                // comincia lo decide comunque il server, vedi MP_startingRole).
                await page.addInitScript(() => { window.AUTH_GATE_SKIP = true; window.DUEL_RPS_SKIP = true; });
                await page.goto(statics.origin + '/multiplayer.html', { waitUntil: 'load' });
                await page.waitForSelector('#mpCreateBtn');
                // Il velo di caricamento condiviso (js/ui/page-loader.js) copre
                // la pagina per almeno 1s: cliccare sotto di lui fallirebbe.
                await page.waitForFunction(() => {
                    const el = document.getElementById('pageLoader');
                    return !el || el.classList.contains('page-loader-hidden');
                }, { timeout: 15000 });
                await page.fill('#mpServerUrl', room.wsUrl);
                return page;
            };

            const pageA = await openLobby('A');
            const pageB = await openLobby('B');

            // --- 0) Raggiungere il server pubblico ------------------------
            // Due comportamenti che in partita non si vedono mai ma che in
            // produzione decidono se il gioco parte: la promozione a wss://
            // (una pagina HTTPS, com'è quella pubblicata, non può aprire un
            // socket in chiaro) e la pazienza alla prima connessione (il
            // server gratuito dorme e ci mette un minuto a tornare su).
            const urls = await pageA.evaluate(() => ({
                promossoDaHttps: DuelNetwork.normalizeServerUrl('ws://esempio.onrender.com', true),
                localeLasciatoInChiaro: DuelNetwork.normalizeServerUrl('ws://localhost:8787', true),
                senzaSchemaSuHttps: DuelNetwork.normalizeServerUrl('esempio.onrender.com', true),
                senzaSchemaInLocale: DuelNetwork.normalizeServerUrl('localhost:8787', false),
                giaSicuro: DuelNetwork.normalizeServerUrl('wss://esempio.onrender.com', true)
            }));
            assert(urls.promossoDaHttps === 'wss://esempio.onrender.com', `Da una pagina HTTPS un indirizzo in chiaro va promosso a wss:// (ottenuto: ${urls.promossoDaHttps})`);
            assert(urls.localeLasciatoInChiaro === 'ws://localhost:8787', `Un server locale non ha un certificato: deve restare in chiaro (ottenuto: ${urls.localeLasciatoInChiaro})`);
            assert(urls.senzaSchemaSuHttps === 'wss://esempio.onrender.com', `Un indirizzo incollato senza schema deve prenderne uno adatto alla pagina (ottenuto: ${urls.senzaSchemaSuHttps})`);
            assert(urls.senzaSchemaInLocale === 'ws://localhost:8787', `Fuori da HTTPS lo schema scelto resta ws:// (ottenuto: ${urls.senzaSchemaInLocale})`);
            assert(urls.giaSicuro === 'wss://esempio.onrender.com', 'Un indirizzo già wss:// non va toccato');

            // Porta chiusa = il caso "server addormentato" visto dal client.
            // Budget accorciato apposta: il test verifica che si INSISTA
            // annunciandolo, non che si aspetti davvero un minuto e mezzo.
            const waking = await pageA.evaluate(() => new Promise((resolve) => {
                const annunci = [];
                DuelNetwork.on('connect-waking', (info) => annunci.push(info.attempt));
                DuelNetwork.connect('ws://127.0.0.1:9', { totalTimeoutMs: 14000 })
                    .then(() => resolve({ annunci, errore: null }))
                    .catch((err) => resolve({ annunci, errore: err.message }));
            }));
            assert(waking.annunci.length >= 2, `Una connessione che non risponde deve essere ritentata, non abbandonata al primo colpo (annunci di risveglio: ${JSON.stringify(waking.annunci)})`);
            assert(waking.annunci[0] === 1 && waking.annunci[1] === 2, `Gli annunci devono numerare i tentativi (ottenuto: ${JSON.stringify(waking.annunci)})`);
            assert(!!waking.errore, 'Esaurito il budget, la connessione deve comunque fallire con un errore invece di restare appesa per sempre');

            // --- Stanza: A crea, B entra col codice ---------------------
            await pageA.click('#mpCreateBtn');
            await pageA.waitForFunction(() => {
                const el = document.getElementById('mpRoomCodeValue');
                return el && /^[A-Z0-9]{5}$/.test(el.textContent.trim());
            }, { timeout: 15000 });
            const code = (await pageA.textContent('#mpRoomCodeValue')).trim();
            assert(code.length === 5, `Il server deve assegnare un codice stanza di 5 caratteri (ricevuto: "${code}")`);

            await pageB.click('#mpTabJoin');
            await pageB.fill('#mpJoinCode', code);
            await pageB.click('#mpJoinBtn');

            // --- Arena caricata e duello avviato su ENTRAMBI ------------
            const arenaReady = (page) => page.waitForFunction(
                () => window.MULTIPLAYER_MODE === true
                    && typeof gameState !== 'undefined' && typeof DuelEngine !== 'undefined'
                    && Array.isArray(gameState.playerHand) && gameState.playerHand.length >= 5
                    && !!document.getElementById('playerHand'),
                { timeout: 40000 }
            );
            await Promise.all([arenaReady(pageA), arenaReady(pageB)]);
            for (const page of [pageA, pageB]) {
                try { await page.click('.di-skip', { timeout: 4000 }); } catch (e) { /* nessuna intro da saltare */ }
            }

            // Chi comincia lo decide il server al momento dell'accoppiamento:
            // il test non lo dà per scontato, lo chiede.
            const aStarts = await pageA.evaluate(() => window.MP_startingRole === 'player');
            const bStarts = await pageB.evaluate(() => window.MP_startingRole === 'player');
            assert(aStarts !== bStarts, 'Il server deve assegnare il primo turno a UNO solo dei due client');
            const actor = aStarts ? pageA : pageB;      // chi gioca le mosse
            const watcher = aStarts ? pageB : pageA;    // chi deve vederle arrivare

            // La cascata naturale di apertura (draw -> standby -> main1) parte
            // da sola solo dal lato di chi comincia; l'altro la riceve come
            // messaggi 'phase'. Che arrivi anche di là è già la prima
            // verifica del protocollo.
            await actor.waitForFunction(() => gameState.phase === 'main1' && gameState.currentPlayer === 'player', { timeout: 25000 });
            await watcher.waitForFunction(() => gameState.phase === 'main1' && gameState.currentPlayer === 'bot', { timeout: 25000 });

            // Spia sul canale in USCITA del lato che osserva: serve per
            // dimostrare che non chiede resync (vedi la Magia Terreno più
            // sotto). Avvolge MP_broadcast senza sostituirlo, come fa
            // multiplayer.js stesso col suo wrapping del checksum.
            await watcher.evaluate(() => {
                window.__mpSent = [];
                const inner = window.MP_broadcast;
                window.MP_broadcast = function (action) {
                    window.__mpSent.push(action.kind);
                    return inner(action);
                };
            });

            const checksumsMatch = async (what) => {
                const [a, b] = await Promise.all([
                    actor.evaluate(() => DuelEngine.computeStateChecksum()),
                    watcher.evaluate(() => DuelEngine.computeStateChecksum())
                ]);
                assert(a === b, `${what}: i due client devono avere lo stesso checksum di stato (attivo: "${a}", osservatore: "${b}")`);
            };
            await checksumsMatch('Apertura del duello');

            // --- 1) Evocazione ------------------------------------------
            const monsterName = await actor.evaluate(() => {
                // `cardDatabase` è un const di js/data/cards-db.js: esiste nello
                // scope globale della pagina ma NON su window (trappola già
                // costata tempo altrove in questo progetto), quindi va letto
                // così, per nome, da dentro la pagina.
                const card = Object.assign({}, cardDatabase.find((c) => c.type === 'monster' && !c.extraDeck && (c.level || 4) <= 4), { uid: 'mp_test_monster' });
                gameState.playerHand[0] = card;
                summonMonster(card, 0, 'attack', 0);
                return card.name;
            });
            await watcher.waitForFunction(
                (name) => !!gameState.botMonsterField[0] && gameState.botMonsterField[0].card.name === name,
                monsterName,
                { timeout: 15000 }
            );
            const summonSeen = await watcher.evaluate(() => ({
                position: gameState.botMonsterField[0].position,
                handCount: gameState.botHand.length
            }));
            assert(summonSeen.position === 'attack', 'Evocazione: la Posizione deve arrivare all\'avversario');
            await checksumsMatch('Dopo l\'Evocazione');

            // --- 2) Magia/Trappola coperta -------------------------------
            await actor.evaluate(() => {
                const card = Object.assign({}, cardDatabase.find((c) => c.type === 'trap'), { uid: 'mp_test_trap' });
                gameState.playerHand[1] = card;
                setSpellTrap(card, 0, 1);
            });
            await watcher.waitForFunction(() => !!gameState.botSTField[0], { timeout: 15000 });
            const stSeen = await watcher.evaluate(() => ({
                faceDown: gameState.botSTField[0].isFaceDown,
                handCount: gameState.botHand.length
            }));
            assert(stSeen.faceDown === true, 'Una carta Settata deve restare coperta anche dal lato avversario');
            assert(stSeen.handCount === summonSeen.handCount - 1, 'Ogni carta giocata deve far calare di 1 la mano vista dall\'avversario');
            await checksumsMatch('Dopo la carta coperta');

            // --- 3) Magia Terreno (una regressione già corretta) ----------
            // Prima del ramo 'fieldspell' in multiplayer.js questo messaggio
            // finiva nel `default: break`: la mano dell'avversario non
            // calava, il checksum divergeva e partiva un resync completo.
            // Qui si verifica sia l'effetto visibile (la Magia Terreno c'è)
            // sia l'assenza di quel sintomo (nessuna richiesta di resync).
            await watcher.evaluate(() => { window.__mpSent.length = 0; });
            await actor.evaluate(() => {
                const card = Object.assign({}, cardDatabase.find((c) => c.type === 'spell' && c.subtype === 'field'), { uid: 'mp_test_field' });
                gameState.playerHand[2] = card;
                setFieldSpell(card, 2);
            });
            await watcher.waitForFunction(() => !!gameState.botFieldSpell, { timeout: 15000 });
            const fieldSeen = await watcher.evaluate(() => ({
                handCount: gameState.botHand.length,
                sent: window.__mpSent.slice()
            }));
            assert(fieldSeen.handCount === stSeen.handCount - 1,
                'Magia Terreno: la mano dell\'avversario deve calare di 1 (era proprio questo a far divergere il checksum)');
            assert(!fieldSeen.sent.includes('request-resync'),
                `Magia Terreno: nessun resync deve più scattare (inviati: ${JSON.stringify(fieldSeen.sent)})`);
            await checksumsMatch('Dopo la Magia Terreno');

            // --- 4) Catena: il difensore risponde DAVVERO lui -------------
            // Due buchi chiusi insieme qui. La finestra di risposta a
            // un'Evocazione si apriva SOLO sul client di chi evocava, e lì
            // a decidere per il difensore era l'euristica dell'IA: la
            // persona dall'altra parte non veniva mai interpellata, e la
            // sua vera mano non la conosceva nessuno. Ora la domanda arriva
            // a chi ha le carte e la risposta torna indietro.
            await watcher.evaluate(() => {
                const trap = Object.assign({}, cardDatabase.find((c) => c.id === 40), { uid: 'mp_test_trap_hole' });
                gameState.playerHand[0] = trap;
                setSpellTrap(trap, 1, 0);
            });
            await actor.waitForFunction(() => !!gameState.botSTField[1], { timeout: 15000 });
            // Una Trappola non può rispondere nel turno in cui è stata
            // piazzata: la si retrodata invece di far passare un turno
            // intero solo per arrivare a questo punto.
            await watcher.evaluate(() => { gameState.playerSTField[1].setOnTurn = 0; });

            await actor.evaluate(() => {
                gameState.hasNormalSummoned = false; // una seconda Evocazione, solo per il test
                const card = Object.assign({}, cardDatabase.find((c) => c.type === 'monster' && !c.extraDeck && (c.level || 4) <= 4 && c.attack >= 1000), { uid: 'mp_test_monster2' });
                gameState.playerHand[3] = card;
                summonMonster(card, 1, 'attack', 3);
            });
            // Il difensore riceve davvero la domanda...
            await watcher.waitForSelector('#activateModal.open', { timeout: 20000 });
            await watcher.click('#activateConfirmBtn');
            // ...e la sua risposta arriva a chi ha evocato: il mostro appena
            // messo in campo sparisce da ENTRAMBI i lati, senza che nessuno
            // dei due client abbia indovinato nulla per conto dell'altro.
            await actor.waitForFunction(() => gameState.playerMonsterField[1] === null, { timeout: 25000 });
            await watcher.waitForFunction(() => gameState.botMonsterField[1] === null, { timeout: 25000 });
            await checksumsMatch('Dopo la Catena');

            // --- 5) Resa: l'esito deve arrivare all'avversario ------------
            // DuelSession.finish naviga via dalla pagina ~900ms dopo la fine
            // del duello: neutralizzata su ENTRAMBI i lati perché il test
            // possa leggere l'esito. È l'unica cosa stubbata in tutto lo
            // spec, e sta a valle del protocollo (non lo tocca).
            for (const page of [actor, watcher]) {
                await page.evaluate(() => {
                    window.DuelSession.finish = function (playerWon) { window.__mpEndResult = playerWon; };
                });
            }
            await actor.click('#surrenderBtn');
            await actor.click('#surrenderConfirmBtn');
            await watcher.waitForFunction(() => gameState.gameOver === true, { timeout: 15000 });
            // endDuel lascia passare ~900ms prima di dichiarare l'esito a
            // DuelSession.finish: si aspetta il segnale vero, non quel tempo.
            const waitOutcome = (page) => page.waitForFunction(() => window.__mpEndResult !== undefined, { timeout: 15000 });
            await Promise.all([waitOutcome(watcher), waitOutcome(actor)]);
            const outcome = await watcher.evaluate(() => window.__mpEndResult);
            assert(outcome === true, `Chi resta in piedi deve ricevere una VITTORIA (ricevuto: ${JSON.stringify(outcome)})`);
            const actorOutcome = await actor.evaluate(() => window.__mpEndResult);
            assert(actorOutcome === false, `Chi si arrende deve registrare una SCONFITTA (ricevuto: ${JSON.stringify(actorOutcome)})`);

            assert(pageErrors.length === 0, `Errori JS non gestiti durante il duello multiplayer: ${pageErrors.join(' | ')}`);
        } finally {
            await context.close();
            await room.close();
            await statics.close();
        }
    }
};
