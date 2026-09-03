// Ninja d'Assalto (id 459): "Effetto Veloce: puoi bandire 2 mostri
// OSCURITÀ dal Cimitero; bandisci questa carta scoperta fino alla End
// Phase." Era implementata come un normale effetto Ignition (solo nella
// propria Main Phase) — canRespondAsQuickEffect: true la rende offerta
// anche come risposta in una Chain già aperta durante il turno
// avversario, riusando findMonsterQuickEffectCandidates (duel-engine.js,
// infrastruttura già esistente da prima di questa sessione, condivisa
// con Spadaccino Mistico LV6 id 865): a differenza di Spada Sigillante
// di Orichalcos (id 396), questa carta ha una sola abilità, quindi
// nessuna coppia di hook dedicata è servita.
module.exports = {
    name: "Ninja d'Assalto: Effetto Veloce risponde anche durante il turno avversario (id 459)",
    async run(t) {
        // Integrazione REALE nella Chain: quando il GIOCATORE attiva una
        // carta fittizia, il BOT con Ninja d'Assalto scoperto in campo e
        // 2+ mostri OSCURITÀ nel Cimitero deve poter rispondere bandendosi
        // fino alla End Phase — stesso pattern di chain-resolution.spec.js
        // e orichalcos-sword-quick-effect.spec.js.
        await t.evaluate(() => {
            CardEffects.register(90459, {
                canActivate() { return true; },
                activate(ctx) { window.__testLog = window.__testLog || []; window.__testLog.push('FAKE_SPELL_RESOLVE:' + ctx.owner); }
            });
        });
        const r1 = await t.evaluate(() => {
            return new Promise((resolve) => {
                window.__testLog = [];
                gameState.turn = 5;
                const ninja = { ...cardDatabase.find((c) => c.id === 459), uid: 'ninja-1' };
                const darkFodder1 = { ...cardDatabase.find((c) => c.type === 'monster' && c.attribute === 'OSCURITÀ' && c.id !== 459), uid: 'darkfodder-1' };
                const darkFodder2 = { ...cardDatabase.find((c) => c.type === 'monster' && c.attribute === 'OSCURITÀ' && c.id !== 459), uid: 'darkfodder-2' };
                gameState.botMonsterField = [{ card: ninja, position: 'attack', isFaceDown: false }, null, null, null, null];
                gameState.botGraveyard = [darkFodder1, darkFodder2];
                gameState.botBanished = [];
                gameState.botBanishedTemporarily = gameState.botBanishedTemporarily || [];
                gameState.playerHand = [{ id: 90459, uid: 'fakespell-1', name: 'Fake Spell', type: 'spell', subtype: 'normal' }];
                gameState.playerGraveyard = [];

                const activated = DuelEngine.activateCard('player', 'hand', 0);
                const start = Date.now();
                const poll = () => {
                    if (!DuelEngine.isChainActive() || Date.now() - start > 15000) {
                        resolve({
                            activated,
                            log: window.__testLog.slice(),
                            ninjaLeftField: !gameState.botMonsterField.some((s) => s && s.card.uid === 'ninja-1'),
                            darkMonstersBanished: gameState.botBanished.filter((c) => c.uid === 'darkfodder-1' || c.uid === 'darkfodder-2').length
                        });
                        return;
                    }
                    setTimeout(poll, 100);
                };
                setTimeout(poll, 100);
            });
        });
        t.assert(r1.activated, 'Il giocatore deve poter attivare la carta fittizia');
        t.assert(r1.ninjaLeftField, "Ninja d'Assalto deve essersi bandito rispondendo durante il turno del giocatore (non il proprio)");
        t.assert(r1.darkMonstersBanished === 2, 'Deve bandire i 2 mostri OSCURITÀ dal Cimitero come costo');
        t.assert(r1.log.includes('FAKE_SPELL_RESOLVE:player'), 'La carta fittizia del giocatore deve comunque risolversi alla fine della Chain');

        // Senza 2 mostri OSCURITÀ nel Cimitero: non deve essere candidata
        // (nessuna risposta, la carta fittizia risolve senza intoppi).
        const r2 = await t.evaluate(() => {
            return new Promise((resolve) => {
                window.__testLog = [];
                const ninja2 = { ...cardDatabase.find((c) => c.id === 459), uid: 'ninja-2' };
                gameState.botMonsterField = [{ card: ninja2, position: 'attack', isFaceDown: false }, null, null, null, null];
                gameState.botGraveyard = [];
                gameState.playerHand = [{ id: 90459, uid: 'fakespell-2', name: 'Fake Spell', type: 'spell', subtype: 'normal' }];
                gameState.playerGraveyard = [];

                DuelEngine.activateCard('player', 'hand', 0);
                const start = Date.now();
                const poll = () => {
                    if (!DuelEngine.isChainActive() || Date.now() - start > 15000) {
                        resolve({ ninjaStillThere: gameState.botMonsterField.some((s) => s && s.card.uid === 'ninja-2') });
                        return;
                    }
                    setTimeout(poll, 100);
                };
                setTimeout(poll, 100);
            });
        });
        t.assert(r2.ninjaStillThere, "Senza 2 mostri OSCURITÀ nel Cimitero, Ninja d'Assalto non deve rispondere e resta in campo");
    }
};
