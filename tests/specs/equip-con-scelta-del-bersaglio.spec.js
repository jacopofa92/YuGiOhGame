// Ogni Magia Equipaggiamento con PIÙ mostri idonei sul Terreno: la scelta
// del bersaglio apre la lista (asincrona) e la carta deve restare in campo,
// agganciata al mostro SCELTO.
//
// Bug reale che questo spec sorveglia (segnalato giocando il primo Puzzle):
// mentre la lista era aperta, la pulizia degli Equip senza aggancio
// (recomputeStaticEffects, a ogni ridisegno) mandava la carta al Cimitero.
// Con un solo mostro la scelta è immediata e il guasto non si vedeva: per
// questo qui ci sono sempre più candidati e si sceglie l'ULTIMO della
// lista, mai il primo (un'auto-scelta passerebbe comunque).
// Si tocca la carta nella lista come un giocatore vero.
const path = require('path');

const RADICE = path.join(__dirname, '..', '..');
const DUELLO = 'file:///' + path.join(RADICE, 'duelMonstersCore.html').replace(/\\/g, '/');

// Mostri di razze e attributi diversi, perché ogni Equip trovi almeno due
// bersagli: molti ammettono solo una razza (Guerriero, Drago, Incantatore...).
const SQUADRE = [
    // Niente Gearfried il Cavaliere di Ferro (id 16): il suo effetto vero distrugge
    // ogni Equip che gli si aggancia, e farebbe sembrare rotte carte sane.
    [4, 613, 122, 1, 666],      // Guerriero Celtico, Lama Oscura, Spadaccino di Fiamma Blu (Guerrieri), Drago Bianco, Doppio Coston
    [2, 188, 24, 13, 908],      // Mago Nero, Maga Oscura, Elfi Gemelli, Teschio Evocato, Riflesso Demoniaco #2
    [1, 12, 6, 14, 528],        // Drago Bianco, Drago Nero Occhi Rossi, Cavaliere Oscuro, Gaia, Robolady
    [22, 23, 526, 463, 743]     // Kuriboh, Insetto Divoratore, Skull Servant, Spadaccino di Landstar, Curran
];

module.exports = {
    standalone: true,
    name: 'Equip con più bersagli: scelto dalla lista, resta in campo agganciato al mostro scelto',
    async run(t) {
        const errori = [];
        /** Un duello nuovo, fermo in Main Phase 1, col ciclo del bot spento. */
        async function apriDuello() {
            const p = await t.browser.newPage({ viewport: { width: 1400, height: 900 } });
            p.on('pageerror', (e) => errori.push(e.message));
            await p.addInitScript(() => { window.AUTH_GATE_SKIP = true; window.DUEL_FAST_OPENING = true; window.DUEL_RPS_SKIP = true; });
            await p.goto(DUELLO);
            try { await p.click('.di-skip', { timeout: 4000 }); } catch (e) { /* nessuna intro */ }
            await p.waitForFunction(() => typeof gameState !== 'undefined' && gameState.phase === 'main1' && gameState.currentPlayer === 'player', null, { timeout: 30000 });
            await p.waitForTimeout(600);
            // Il ciclo naturale del bot non deve muoversi durante la prova.
            await p.evaluate(() => {
                if (typeof clearPhaseTransitionTimeout === 'function') clearPhaseTransitionTimeout();
                window.changeTurn = function () {};
                window.botTurn = function () {};
            });
            return p;
        }
        let page = await apriDuello();
        try {
            const equip = await page.evaluate(() => cardDatabase
                .filter((c) => c.type === 'spell' && c.subtype === 'equip')
                .filter((c) => { const d = CardEffects.get ? CardEffects.get(c.id) : null; return !d || d.isEquip !== false; })
                .map((c) => ({ id: c.id, nome: c.name })));
            t.assert(equip.length >= 40, `Attese almeno 40 Magie Equipaggiamento, trovate ${equip.length}`);

            // Per gli Equip legati a mostri precisi (Jinzo, Insetti, Macchine,
            // Ingranaggi Antichi...) nessuna squadra fissa basta: si cerca un
            // mostro che l'Equip accetta e se ne mettono DUE copie, così la
            // lista si apre comunque. Solo stato, nessun disegno: è veloce.
            const coppie = await page.evaluate((ids) => {
                const out = {};
                const mostri = cardDatabase.filter((c) => c.type === 'monster').map((c) => c.id);
                const istanza = (id) => Object.assign({}, cardDatabase.find((c) => c.id === id), { uid: 'cp-' + id + '-' + Math.random().toString(36).slice(2) });
                ids.forEach((idEquip) => {
                    for (const m of mostri) {
                        gameState.playerMonsterField = [null, null, null, null, null];
                        gameState.playerMonsterField[0] = { card: istanza(m), position: 'attack', isFaceDown: false, hasAttacked: false, canChangePosition: true, summonedOnTurn: 0 };
                        gameState.playerMonsterField[1] = { card: istanza(m), position: 'attack', isFaceDown: false, hasAttacked: false, canChangePosition: true, summonedOnTurn: 0 };
                        gameState.playerHand = [istanza(idEquip), istanza(526), istanza(528)];
                        let ok = false;
                        try { ok = DuelEngine.canActivate('player', 'hand', 0); } catch (e) { ok = false; }
                        if (ok) { out[idEquip] = m; break; }
                    }
                });
                gameState.playerMonsterField = [null, null, null, null, null];
                return out;
            }, equip.map((e) => e.id));

            const rotte = [];
            const coperte = [];
            const senzaDueBersagli = [];
            for (const e of equip) {
                let provata = false;
                const squadre = coppie[e.id] ? SQUADRE.concat([[coppie[e.id], coppie[e.id]]]) : SQUADRE;
                for (const squadra of squadre) {
                    // Prima di ogni prova il duello deve essere fermo: azzerare il Terreno
                    // a metà della risoluzione della carta precedente fa sembrare rotte
                    // carte sane (insidia già presa nell'audit degli Equip, vedi CLAUDE.md).
                    try {
                        await page.waitForFunction(() => {
                            if (Decisioni.inSospeso()) { Decisioni.rispondi(0); return false; }
                            return !(gameState.chain && (gameState.chain.links || []).length) && !DuelEngine.isChainActive();
                        }, null, { timeout: 15000, polling: 200 });
                    } catch (err) {
                        // La carta provata prima ha lasciato il duello fermo: lo si
                        // dice (con cosa resta aperto a schermo) e si riparte da un
                        // duello nuovo, invece di far fallire a cascata tutte le altre.
                        const aperto = await page.evaluate(() => Array.from(document.querySelectorAll('.modal-backdrop.open, #quickPopover, .quick-popover')).map((m) => (m.id || m.className) + ': ' + (m.innerText || '').slice(0, 80)));
                        rotte.push(`duello rimasto fermo dopo la carta precedente a ${e.id} ${e.nome}: ${JSON.stringify(aperto)}`);
                        await page.close();
                        page = await apriDuello();
                    }
                    // Terreno pulito, squadra in campo, l'Equip e qualche carta da scartare in mano.
                    const pronta = await page.evaluate(([idEquip, ids]) => {
                        const istanza = (id) => Object.assign({}, cardDatabase.find((c) => c.id === id), { uid: 'eq-' + id + '-' + Math.random().toString(36).slice(2) });
                        gameState.chain = { links: [] };
                        gameState.playerMonsterField = [null, null, null, null, null];
                        gameState.botMonsterField = [null, null, null, null, null];
                        gameState.playerSTField = [null, null, null, null, null];
                        gameState.botSTField = [null, null, null, null, null];
                        gameState.playerGraveyard = [istanza(526), istanza(4), istanza(2)];
                        gameState.botGraveyard = [];
                        gameState.playerLP = 8000;
                        gameState.botLP = 8000;
                        gameState.phase = 'main1';
                        gameState.currentPlayer = 'player';
                        ids.forEach((id, i) => {
                            gameState.playerMonsterField[i] = { card: istanza(id), position: 'attack', isFaceDown: false, hasAttacked: false, canChangePosition: true, summonedOnTurn: 0 };
                        });
                        gameState.playerHand = [istanza(idEquip), istanza(526), istanza(528), istanza(546)];
                        updateUI();
                        return DuelEngine.canActivate('player', 'hand', 0);
                    }, [e.id, squadra]);
                    if (!pronta) continue;
                    await page.evaluate(() => DuelEngine.activateCard('player', 'hand', 0));
                    // La conferma d'attivazione, se c'è, poi la lista.
                    let lista = false;
                    for (let k = 0; k < 40 && !lista; k++) {
                        await page.waitForTimeout(150);
                        lista = await page.evaluate(() => {
                            const conf = document.querySelector('#activateModal.open #activateConfirmBtn');
                            if (conf) conf.click();
                            const s = Decisioni.inSospeso();
                            const bersagli = !!(s && s.candidati.length >= 2 && s.candidati.every((c) => c && c.card && c.card.uid));
                            // Una scelta che viene PRIMA del bersaglio (lo scarto di
                            // Flamberge, dalla mano): si risponde e si continua ad aspettare.
                            if (s && !bersagli) { Decisioni.rispondi(0); return false; }
                            return bersagli && !!document.querySelector('#cardListPickerModal.open');
                        });
                        if (!lista && await page.evaluate(() => !(gameState.chain.links || []).length && !Decisioni.inSospeso()
                            && !gameState.playerHand.some((c) => c.uid && c.uid.startsWith('eq-') && c.type === 'spell' && c.subtype === 'equip'))) {
                            // Si è risolta senza lista: un solo bersaglio, o un costo/altra scelta.
                            if (k > 8) break;
                        }
                    }
                    if (!lista) {
                        // Chiude qualunque scelta rimasta aperta prima di provare la squadra seguente.
                        await page.evaluate(() => { for (let i = 0; i < 5 && Decisioni.inSospeso(); i++) Decisioni.rispondi(0); });
                        await page.waitForTimeout(400);
                        continue;
                    }
                    provata = true;
                    // Tocca l'ULTIMO candidato.
                    const scelto = await page.evaluate(() => {
                        const s = Decisioni.inSospeso();
                        const c = s.candidati[s.candidati.length - 1];
                        return c.card.uid;
                    });
                    const voce = await page.$(`#cardListPickerModal.open [data-uid="${scelto}"]`);
                    // L'ultima carta può stare fuori dalla parte visibile della striscia:
                    // la si porta in vista, come farebbe un giocatore scorrendo.
                    if (voce) await voce.scrollIntoViewIfNeeded();
                    const box = voce && await voce.boundingBox();
                    if (box) await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
                    else await page.evaluate(() => { const s = Decisioni.inSospeso(); Decisioni.rispondi(s.candidati.length - 1); });
                    // Altre scelte dopo l'aggancio (rare): la prima opzione.
                    for (let k = 0; k < 30; k++) {
                        await page.waitForTimeout(150);
                        const fermo = await page.evaluate(() => {
                            if (Decisioni.inSospeso()) { Decisioni.rispondi(0); return false; }
                            return !(gameState.chain.links || []).length && !DuelEngine.isChainActive();
                        });
                        if (fermo && k > 3) break;
                    }
                    await page.waitForTimeout(300);
                    const esito = await page.evaluate(([idEquip, uid]) => {
                        const slot = gameState.playerSTField.find((s) => s && s.card.id === idEquip);
                        return {
                            inCampo: !!slot,
                            agganciata: !!(slot && slot.card.equippedToUid === uid),
                            aChi: slot ? slot.card.equippedToUid : null,
                            nelCimitero: gameState.playerGraveyard.some((c) => c.id === idEquip)
                        };
                    }, [e.id, scelto]);
                    if (esito.inCampo && esito.agganciata) coperte.push(e.id);
                    else rotte.push(`${e.id} ${e.nome}: ${JSON.stringify(esito)}`);
                    break;
                }
                if (!provata) senzaDueBersagli.push(`${e.id} ${e.nome}`);
            }

            // Sepoltura Prematura (id 633): la scelta non è un mostro sul Terreno
            // ma quale rianimare dal Cimitero. Stesso guasto possibile, stessa prova:
            // tre mostri nel Cimitero, si tocca il SECONDO della lista.
            {
                await page.waitForFunction(() => !(gameState.chain && (gameState.chain.links || []).length) && !DuelEngine.isChainActive(), null, { timeout: 15000 });
                const scelto = await page.evaluate(() => {
                    const istanza = (id) => Object.assign({}, cardDatabase.find((c) => c.id === id), { uid: 'sp-' + id + '-' + Math.random().toString(36).slice(2) });
                    gameState.chain = { links: [] };
                    gameState.playerMonsterField = [null, null, null, null, null];
                    gameState.playerSTField = [null, null, null, null, null];
                    gameState.playerGraveyard = [istanza(4), istanza(2), istanza(1)];
                    gameState.playerLP = 8000;
                    gameState.playerHand = [istanza(633)];
                    updateUI();
                    DuelEngine.activateCard('player', 'hand', 0);
                    return gameState.playerGraveyard[1].uid;
                });
                await page.waitForSelector(`#cardListPickerModal.open [data-uid="${scelto}"]`, { timeout: 15000 });
                const voce = await page.$(`#cardListPickerModal.open [data-uid="${scelto}"]`);
                await voce.scrollIntoViewIfNeeded();
                await (await voce.evaluateHandle((el) => el.closest('.card-list-item') || el)).click();
                await page.waitForFunction(() => !(gameState.chain && (gameState.chain.links || []).length) && !DuelEngine.isChainActive(), null, { timeout: 15000 });
                await page.waitForTimeout(500);
                const esito = await page.evaluate((uid) => {
                    const slot = gameState.playerSTField.find((s) => s && s.card.id === 633);
                    const mostro = gameState.playerMonsterField.find((s) => s && s.card.uid === uid);
                    return { inCampo: !!slot, agganciata: !!(slot && slot.card.equippedToUid === uid), rianimato: !!mostro, lp: gameState.playerLP };
                }, scelto);
                if (esito.inCampo && esito.agganciata && esito.rianimato && esito.lp === 7200) coperte.push(633);
                else rotte.push(`633 Sepoltura Prematura (scelta dal Cimitero): ${JSON.stringify(esito)}`);
            }

            t.assert(rotte.length === 0, `Magie Equipaggiamento che, scelte dalla lista, non restano agganciate al mostro scelto:\n  - ${rotte.join('\n  - ')}`);
            // La prova deve davvero coprire la grande maggioranza: se un
            // giorno quasi nessuna aprisse la lista, lo spec passerebbe a vuoto.
            t.assert(coperte.length >= Math.floor(equip.length * 0.75),
                `Provate con la lista solo ${coperte.length} Equip su ${equip.length}. Senza due bersagli: ${senzaDueBersagli.join(', ')}`);
            t.assert(errori.length === 0, `Nessun errore in pagina: ${JSON.stringify(errori.slice(0, 5))}`);
            console.log(`      Equip provati con la lista: ${coperte.length}/${equip.length}${senzaDueBersagli.length ? ' — senza due bersagli idonei: ' + senzaDueBersagli.join(', ') : ''}`);
        } finally {
            await page.close();
        }
    }
};
