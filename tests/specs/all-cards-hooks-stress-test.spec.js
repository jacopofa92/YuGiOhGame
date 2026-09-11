// Stress-test generico: richiama canActivate/activate/static per OGNI
// carta REGISTRATA in CardEffects (l'intero cardDatabase, non un
// sottoinsieme) con un board minimo popolato, catturando le eccezioni
// non gestite chiamando gli hook DIRETTAMENTE (bypassa activateCard/
// resolveChain, che le intrappolano già in safeCallCardHandler e le
// loggano soltanto — qui vogliamo l'errore vero per farlo fallire).
//
// Nato da un audit generale di sessione: la stessa tecnica, applicata
// prima solo agli Structure Deck, aveva trovato un bug reale (id 690,
// canActivate che leggeva un campo esistente solo nel ctx reattivo).
// Trovare zero errori qui non garantisce che OGNI carta sia corretta
// (non verifica la correttezza dell'effetto, solo che non lanci
// un'eccezione con precondizioni plausibili) — ma una carta che lancia
// un'eccezione anche solo per attivarsi/calcolare il proprio static()
// è un bug innegabile, indipendentemente dal testo esatto.
//
// Falsi positivi noti e già risolti nell'harness (non riaprirli in
// futuro senza motivo): una Carta Equipaggiamento (def.isEquip, anche
// se di type 'monster' come id 157) va sempre agganciata a un vero
// bersaglio prima di chiamare static() — senza un bersaglio valido, il
// motore reale la manda al Cimitero PRIMA di provare a calcolare
// static() (vedi recomputeStaticEffects in duel-engine.js), quindi
// testarla senza un bersaglio produrrebbe un errore che non riflette
// mai un caso raggiungibile nel gioco vero.
module.exports = {
    name: 'Stress-test generico: canActivate/activate/static non lanciano eccezioni su nessuna carta del database',
    async run(t) {
        const results = await t.evaluate(() => {
            const errors = [];
            const FILLER_MONSTER = { id: 900001, name: 'Filler Monster', type: 'monster', level: 4, attack: 1500, defense: 1200, race: 'Warrior', attribute: 'EARTH' };

            function resetBoard() {
                gameState.playerMonsterField = [null, null, null, null, null];
                gameState.botMonsterField = [null, null, null, null, null];
                gameState.playerSTField = [null, null, null, null, null];
                gameState.botSTField = [null, null, null, null, null];
                gameState.playerFieldSpell = null;
                gameState.botFieldSpell = null;
                gameState.playerHand = [];
                gameState.botHand = [];
                gameState.playerGraveyard = [];
                gameState.botGraveyard = [];
                gameState.playerBanished = [];
                gameState.botBanished = [];
                gameState.playerLP = 8000;
                gameState.botLP = 8000;
                gameState.turn = 3;
                gameState.phase = 'main1';
                // Falso link in cima alla Chain (spell dell'avversario), per
                // le Trappole Contatore il cui canActivate legge
                // chain.links[top] — riduce i falsi positivi noti.
                gameState.chain = { links: [{ card: { id: 900002, uid: 'filler-chain-1', name: 'Filler Spell', type: 'spell', subtype: 'normal' }, owner: 'bot' }] };
                // Un mostro filler per lato, per le carte il cui
                // canActivate/static assume "esiste almeno un mostro sul campo".
                gameState.playerMonsterField[1] = { card: Object.assign({ uid: 'filler-p1' }, FILLER_MONSTER), position: 'attack', isFaceDown: false, hasAttacked: false, canChangePosition: true, summonedOnTurn: 1 };
                gameState.botMonsterField[1] = { card: Object.assign({ uid: 'filler-b1' }, FILLER_MONSTER), position: 'attack', isFaceDown: false, hasAttacked: false, canChangePosition: true, summonedOnTurn: 1 };
            }

            function testCard(entry) {
                const def = DuelEngine.getDefinition(entry.id);
                if (!def) return; // non registrata: nessun hook da testare
                resetBoard();
                const instance = Object.assign({}, entry, { uid: 'under-test' });
                let zone, index, slot;
                // def.isEquip PRIMA del type: alcune carte TIPO 'monster'
                // (es. id 157) funzionano comunque come Equip via
                // attachEquip/def.continuous — vanno instradate sulla zona
                // 'st', mai sul Terreno Mostri (vedi il commento in cima).
                if (entry.type === 'monster' && !def.isEquip) {
                    zone = 'monster'; index = 0;
                    slot = { card: instance, position: 'attack', isFaceDown: false, hasAttacked: false, canChangePosition: true, summonedOnTurn: gameState.turn };
                    gameState.playerMonsterField[0] = slot;
                } else if (entry.subtype === 'field') {
                    zone = 'fieldSpell'; index = -1;
                    slot = { card: instance, isFaceDown: false, setOnTurn: gameState.turn - 1 };
                    gameState.playerFieldSpell = slot;
                } else {
                    zone = 'st'; index = 0;
                    slot = { card: instance, isFaceDown: false, setOnTurn: gameState.turn - 1 };
                    gameState.playerSTField[0] = slot;
                    if (def.isEquip) {
                        instance.equippedToOwner = 'player';
                        instance.equippedToIndex = 1;
                        instance.equippedToUid = 'filler-p1';
                    }
                }

                if (typeof def.static === 'function') {
                    try {
                        const staticCtx = zone === 'monster'
                            ? DuelEngine.makeContext('player', { card: instance, slot: slot, slotIndex: index })
                            : zone === 'fieldSpell'
                                ? DuelEngine.makeContext('player', { card: instance, slot: slot, zone: 'fieldSpell' })
                                : DuelEngine.makeContext('player', { card: instance, slot: slot, index: index });
                        def.static(staticCtx);
                    } catch (e) {
                        errors.push({ id: entry.id, name: entry.name, hook: 'static', message: e.message });
                    }
                }

                if (typeof def.activate === 'function') {
                    let canActivateResult = null;
                    try {
                        canActivateResult = DuelEngine.canActivate('player', zone, index);
                    } catch (e) {
                        errors.push({ id: entry.id, name: entry.name, hook: 'canActivate', message: e.message });
                    }
                    if (canActivateResult) {
                        try {
                            const ctx = DuelEngine.makeContext('player', { card: instance, zone: zone, index: index });
                            def.activate(ctx);
                        } catch (e) {
                            errors.push({ id: entry.id, name: entry.name, hook: 'activate', message: e.message });
                        }
                    }
                }
            }

            cardDatabase.forEach(testCard);
            return { totalCards: cardDatabase.length, errors: errors };
        });

        t.assert(results.totalCards > 800, `cardDatabase.length atteso > 800, trovato ${results.totalCards}`);
        const summary = results.errors.map((e) => `id ${e.id} (${e.name}) [${e.hook}]: ${e.message}`).join(' | ');
        t.assert(results.errors.length === 0, `${results.errors.length} carte lanciano un'eccezione: ${summary}`);
    }
};
