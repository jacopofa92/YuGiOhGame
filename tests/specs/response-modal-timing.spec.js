// Il modale "Vuoi rispondere?" (quando l'avversario attiva una carta e il
// giocatore umano ha una candidata) deve aspettare anche lui il pulse di
// attivazione prima di aprirsi, e mostrare nome+effetto della carta
// avversaria — bug segnalato dall'utente e corretto in
// openActivationWindow/promptDefenderResponse.
module.exports = {
    name: 'Modale di risposta: aspetta il pulse e mostra la carta avversaria',
    async run(t) {
        await t.evaluate(() => {
            CardEffects.register(90201, {
                canActivate() { return true; },
                activate() { window.__respTestLog = window.__respTestLog || []; window.__respTestLog.push('TRAP_RESOLVED'); }
            });
            CardEffects.register(90202, { canActivate() { return true; }, activate() {} });

            gameState.turn = 5;
            gameState.currentPlayer = 'bot';
            gameState.botHand = [{ id: 90202, uid: 'bot-spell-1', name: 'Magia Finta del Bot', type: 'spell', subtype: 'normal', effect: 'EFFETTO DI PROVA UNICO 12345.' }];
            gameState.botGraveyard = [];
            gameState.playerSTField = Array(5).fill(null);
            gameState.playerSTField[0] = { card: { id: 90201, uid: 'player-trap-1', name: 'Trappola Finta del Giocatore', type: 'trap' }, isFaceDown: true, setOnTurn: gameState.turn - 1 };
            window.__respTestLog = [];
            window.__activateStart = Date.now();
            DuelEngine.activateCard('bot', 'hand', 0);
        });

        await t.page.waitForTimeout(700);
        const mid = await t.evaluate(() => {
            const modal = document.getElementById('activateModal');
            return modal ? modal.classList.contains('open') : false;
        });
        t.assert(!mid, 'A ~700ms dall\'attivazione del bot, il modale non deve essere ancora aperto');

        await t.page.waitForFunction(() => {
            const modal = document.getElementById('activateModal');
            return modal && modal.classList.contains('open');
        }, { timeout: 5000, polling: 100 });

        const after = await t.evaluate(() => ({
            elapsedMs: Date.now() - window.__activateStart,
            text: document.getElementById('activateModalText').textContent
        }));
        t.assert(after.elapsedMs >= 1800 && after.elapsedMs <= 2700, `Il modale deve aprirsi ~2000ms dopo il pulse (ottenuto ${after.elapsedMs}ms)`);
        t.assert(after.text.includes('Magia Finta del Bot'), 'Il modale deve citare il nome della carta avversaria');
        t.assert(after.text.includes('EFFETTO DI PROVA UNICO 12345'), 'Il modale deve citare l\'effetto della carta avversaria');

        await t.page.click('#activateConfirmBtn');
        await t.page.waitForFunction(() => !DuelEngine.isChainActive(), { timeout: 15000, polling: 100 });
        const final = await t.evaluate(() => (window.__respTestLog || []).includes('TRAP_RESOLVED'));
        t.assert(final, 'Dopo la conferma, la Trappola del giocatore deve risolversi');
    }
};
