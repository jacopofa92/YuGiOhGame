// Multiplayer: i tre modi di sacrificare una carta come Tributo.
// =====================================================================
// Terzo spec del Multiplayer, accanto a multiplayer-end-to-end.spec.js
// (il duello) e multiplayer-lobby-abbandono.spec.js (la sala d'attesa).
// Sta a parte perché ognuno dei tre casi vuole un campo preparato a mano
// e una fase diversa, e infilarli nel duello end-to-end vorrebbe dire
// riscriverne lo stato a metà.
//
// I TRE CASI, e cosa non andava in ognuno:
//  1. Evocazione Tributo — l'unico che già viaggiava. Ma chi riceveva si
//     limitava a spostare le carte nel Cimitero: nessuno dei due avvisi
//     che il motore fa partire dal lato di chi sacrifica
//     (notifyOwnMonsterSentToGraveyard / notifySacrificedForTribute), e
//     quindi una carta che reagisce al proprio sacrificio (Abbandonato id
//     416) o al sacrificio di un compagno scattava su un client solo.
//     notifySacrificedForTribute porta anche il redirect al bando di
//     `mustBanishOnLeavingField`: la stessa carta finiva bandita di là e
//     nel Cimitero di qua.
//  2. Costo d'attacco (Guerriero Pantera id 399) — arrivava, ma chi
//     riceveva aspettava sempre i 700ms dell'animazione del Sacrificio,
//     mentre chi lo mandava toglieva il mostro subito: il messaggio
//     'attack' che parte una riga dopo arrivava quindi con un checksum
//     calcolato a mostro già sparito, contro un campo dove era ancora lì.
//     Disallineamento e resync ad OGNI attacco pagato con un Sacrificio.
//  3. Castello dell'Ingranaggio Antico (id 843) — non viaggiava affatto:
//     sacrificato dalla zona Magia/Trappola, restava per sempre in campo
//     dal lato dell'avversario.
//
// Il messaggio 'tribute' porta ora tutto quello che serve a fare di là
// esattamente quello che si è fatto di qua: indici, zona, quanto
// aspettare, e (solo per una vera Evocazione Tributo) il mostro che si
// sta Evocando. Vedi applyRemoteTribute in js/multiplayer/multiplayer.js.
//
// COSA SI MISURA, oltre all'effetto visibile: che i checksum dei due lati
// restino uguali e che chi riceve non chieda MAI un resync. Un resync
// rimette a posto da sé, quindi senza questa seconda misura tutti e tre i
// bug sarebbero "invisibili" — si vedeva solo un avviso nel log e una
// risincronizzazione completa ad ogni Tributo.
const { startStaticServer, startRoomServer } = require('../helpers/local-servers');

module.exports = {
    name: 'Multiplayer: Tributi (Evocazione, costo d\'attacco, Castello dell\'Ingranaggio Antico)',
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
            const actor = aStarts ? pageA : pageB;      // chi sacrifica
            const watcher = aStarts ? pageB : pageA;    // chi deve vederlo
            await actor.waitForFunction(() => gameState.phase === 'main1' && gameState.currentPlayer === 'player', { timeout: 25000 });
            await watcher.waitForFunction(() => gameState.phase === 'main1' && gameState.currentPlayer === 'bot', { timeout: 25000 });

            // Spie sul lato che osserva: cosa manda in rete (per sapere se
            // chiede un resync) e se il motore riceve davvero gli avvisi.
            // Avvolgono senza sostituire, come fa multiplayer.js col
            // checksum.
            await watcher.evaluate(() => {
                window.__mpSent = [];
                const inner = window.MP_broadcast;
                window.MP_broadcast = function (action) { window.__mpSent.push(action.kind); return inner(action); };
                window.__tributeNotices = [];
                window.__graveNotices = [];
                const innerTribute = DuelEngine.notifySacrificedForTribute;
                DuelEngine.notifySacrificedForTribute = function (owner, card, summoned) {
                    window.__tributeNotices.push({ owner, card: card && card.name, summoned: summoned && summoned.name });
                    return innerTribute.apply(this, arguments);
                };
                const innerGrave = DuelEngine.notifyOwnMonsterSentToGraveyard;
                DuelEngine.notifyOwnMonsterSentToGraveyard = function (owner, card) {
                    window.__graveNotices.push({ owner, card: card && card.name });
                    return innerGrave.apply(this, arguments);
                };
            });
            const resetSpie = () => watcher.evaluate(() => {
                window.__mpSent.length = 0;
                window.__tributeNotices.length = 0;
                window.__graveNotices.length = 0;
            });
            const checksumsMatch = async (what) => {
                const [x, y] = await Promise.all([
                    actor.evaluate(() => DuelEngine.computeStateChecksum()),
                    watcher.evaluate(() => DuelEngine.computeStateChecksum())
                ]);
                assert(x === y, `${what}: i due client devono avere lo stesso checksum (attivo: "${x}", osservatore: "${y}")`);
            };
            const resyncCount = () => watcher.evaluate(() => window.__mpSent.filter((k) => k === 'request-resync').length);
            // Un campo preparato a mano non è passato dalla rete: lo si
            // allinea prima di misurare, o la differenza sarebbe del test.
            // La richiesta parte da CHI DEVE IMPARARE: chi la riceve
            // risponde col proprio stato pubblico (vedi sendStateResync).
            const allineaOsservatore = async () => {
                await watcher.evaluate(() => { if (window.MP_broadcast) MP_broadcast({ kind: 'request-resync' }); });
                await actor.waitForTimeout(1500);
            };

            // --- 1) Evocazione Tributo ---------------------------------
            await resetSpie();
            await actor.evaluate(() => {
                const filler = cardDatabase.find((c) => c.type === 'monster' && !c.extraDeck && (c.level || 4) <= 4);
                [0, 1].forEach((slot) => {
                    gameState.hasNormalSummoned = false;
                    gameState.playerHand[0] = Object.assign({}, filler, { uid: 'mp_trib_' + slot });
                    summonMonster(gameState.playerHand[0], slot, 'attack', 0);
                });
                gameState.hasNormalSummoned = false;
            });
            await actor.waitForTimeout(2500);
            await checksumsMatch('Con i due mostri da sacrificare in campo');

            const bigName = await actor.evaluate(() => {
                const big = cardDatabase.find((c) => c.type === 'monster' && !c.extraDeck && (c.level || 0) >= 7 && (c.level || 0) <= 8);
                gameState.playerHand[0] = Object.assign({}, big, { uid: 'mp_trib_big' });
                // Si entra direttamente nel sacrificio, saltando la
                // selezione manuale delle caselle da sacrificare (è UI, e
                // non è quello che questo spec sta verificando).
                gameState.pendingTributeSummon = { card: gameState.playerHand[0], handIndex: 0, selected: [0, 1], needed: 2, fromRect: null };
                performTributeSacrifice();
                return big.name;
            });
            await actor.waitForTimeout(2600);

            const seen = await watcher.evaluate(() => ({
                graveyard: gameState.botGraveyard.map((c) => c.name),
                field: gameState.botMonsterField.map((s) => (s ? s.card.name : null)),
                tributeNotices: window.__tributeNotices.slice(),
                graveNotices: window.__graveNotices.slice()
            }));
            assert(seen.graveyard.length === 2, `Evocazione Tributo: i due sacrificati devono finire nel Cimitero anche dall'altro lato (visto: ${JSON.stringify(seen.graveyard)})`);
            assert(seen.field[0] === null && seen.field[1] === null, `Evocazione Tributo: le due caselle devono svuotarsi anche dall'altro lato (visto: ${JSON.stringify(seen.field)})`);
            assert(seen.tributeNotices.length === 2, `Evocazione Tributo: notifySacrificedForTribute deve scattare anche su chi riceve, una volta per carta (ricevute: ${seen.tributeNotices.length})`);
            assert(seen.tributeNotices.every((n) => n.owner === 'bot'), `Gli avvisi devono arrivare col proprietario ribaltato ('bot' = l'avversario) (ricevuto: ${JSON.stringify(seen.tributeNotices)})`);
            assert(seen.tributeNotices.every((n) => n.summoned === bigName),
                `L'avviso deve portare il mostro PER CUI si sacrifica, o Skull Knight #2 (id 1128) non può funzionare in Multiplayer (ricevuto: ${JSON.stringify(seen.tributeNotices.map((n) => n.summoned))})`);
            assert(seen.graveNotices.length === 2, `Evocazione Tributo: notifyOwnMonsterSentToGraveyard deve scattare anche su chi riceve (ricevute: ${seen.graveNotices.length})`);
            await checksumsMatch('Dopo l\'Evocazione Tributo');
            assert((await resyncCount()) === 0, 'Evocazione Tributo: nessun resync deve scattare');

            // --- 2) Sacrificio come costo d'attacco --------------------
            // Guerriero Pantera (id 399, requiresTributeToAttack): il caso
            // che disallineava i due lati ad ogni attacco.
            await actor.evaluate(() => {
                const panther = cardDatabase.find((c) => c.id === 399);
                const filler = cardDatabase.find((c) => c.type === 'monster' && !c.extraDeck && (c.level || 4) <= 4);
                gameState.playerMonsterField[0] = { card: Object.assign({}, panther, { uid: 'mp_panther' }), position: 'attack', isFaceDown: false, hasAttacked: false, canChangePosition: false };
                gameState.playerMonsterField[1] = { card: Object.assign({}, filler, { uid: 'mp_fodder' }), position: 'attack', isFaceDown: false, hasAttacked: false, canChangePosition: false };
                gameState.phase = 'battle';
                updateUI();
            });
            await actor.waitForTimeout(600);
            await allineaOsservatore();
            await checksumsMatch('Prima dell\'attacco pagato con un Sacrificio');
            await resetSpie();
            await actor.evaluate(() => { executeAttack(0, -1); }); // -1 = attacco diretto
            await actor.waitForTimeout(3000);
            const afterAttack = await watcher.evaluate(() => ({
                field: gameState.botMonsterField.map((s) => (s ? s.card.name : null)),
                resync: window.__mpSent.filter((k) => k === 'request-resync').length
            }));
            assert(afterAttack.field[1] === null, `Costo d'attacco: il mostro sacrificato deve sparire anche dall'altro lato (visto: ${JSON.stringify(afterAttack.field)})`);
            assert(afterAttack.resync === 0, `Costo d'attacco: nessun resync deve scattare — era questo il caso che ne faceva partire uno ogni volta (richieste: ${afterAttack.resync})`);

            // --- 3) Castello dell'Ingranaggio Antico (zona Magia/Trappola) ---
            const gearNames = await actor.evaluate(() => {
                const castle = cardDatabase.find((c) => c.id === 843);
                const big = cardDatabase.find((c) => c.type === 'monster' && !c.extraDeck && (c.level || 0) >= 7 && (c.level || 0) <= 8);
                gameState.playerSTField[0] = { card: Object.assign({}, castle, { uid: 'mp_gear_castle' }), isFaceDown: false, setOnTurn: 0 };
                gameState.phase = 'main1';
                updateUI();
                return { castle: castle.name, big: big.name };
            });
            await allineaOsservatore();
            const castleSeen = await watcher.evaluate(() => gameState.botSTField.map((s) => (s ? s.card.name : null)));
            assert(castleSeen[0] === gearNames.castle, `Preparazione: l'osservatore deve vedere il Castello PRIMA del sacrificio, altrimenti la verifica dopo non proverebbe nulla (visto: ${JSON.stringify(castleSeen)})`);
            await checksumsMatch('Prima del sacrificio del Castello');
            await resetSpie();
            await actor.evaluate(() => {
                const big = cardDatabase.find((c) => c.type === 'monster' && !c.extraDeck && (c.level || 0) >= 7 && (c.level || 0) <= 8);
                gameState.playerHand[0] = Object.assign({}, big, { uid: 'mp_gear_summon' });
                performGearCastleTributeSacrifice(0, gameState.playerHand[0], 0, null);
            });
            await actor.waitForTimeout(2000);
            const afterGear = await watcher.evaluate(() => ({
                st: gameState.botSTField.map((s) => (s ? s.card.name : null)),
                graveyard: gameState.botGraveyard.map((c) => c.name),
                notices: window.__tributeNotices.slice(),
                resync: window.__mpSent.filter((k) => k === 'request-resync').length
            }));
            assert(afterGear.st[0] === null, `Castello: deve sparire dalla zona Magia/Trappola anche dall'altro lato (visto: ${JSON.stringify(afterGear.st)})`);
            assert(afterGear.graveyard.includes(gearNames.castle), `Castello: deve arrivare nel Cimitero dell'altro lato (Cimitero: ${JSON.stringify(afterGear.graveyard)})`);
            assert(afterGear.notices.length === 1 && afterGear.notices[0].summoned === gearNames.big,
                `Castello: anche lui deve avvisare il motore del proprio sacrificio, col mostro Evocato (ricevuto: ${JSON.stringify(afterGear.notices)})`);
            assert(afterGear.resync === 0, `Castello: nessun resync deve scattare (richieste: ${afterGear.resync})`);

            assert(pageErrors.length === 0, `Errori JS non gestiti durante i Tributi in Multiplayer: ${pageErrors.join(' | ')}`);
        } finally {
            await context.close();
            await room.close();
            await statics.close();
        }
    }
};
