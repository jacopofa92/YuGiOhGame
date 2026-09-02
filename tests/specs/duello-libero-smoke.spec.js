// Duello Libero contro un personaggio (Kaiba, difficoltà Media) si avvia
// correttamente dalla query string: modalità, avversario e mani iniziali
// coerenti. Non congela il ciclo naturale (freeze:false): è proprio
// quello che deve avviarsi da solo qui.
module.exports = {
    name: 'Duello Libero: avvio corretto contro Kaiba',
    url: '?mode=free&character=kaiba&difficulty=Medio',
    freeze: false,
    async run(t) {
        await t.page.waitForTimeout(4500);
        const state = await t.evaluate(() => ({
            mode: window.DuelSession ? DuelSession.mode : null,
            opponentName: window.DuelSession ? DuelSession.opponent.name : null,
            handLen: gameState.playerHand.length,
            botHandLen: gameState.botHand.length
        }));
        t.assert(state.mode === 'free', `mode atteso 'free', ottenuto '${state.mode}'`);
        t.assert(state.opponentName === 'Seto Kaiba', `avversario atteso 'Seto Kaiba', ottenuto '${state.opponentName}'`);
        t.assert(state.handLen === 6, `il giocatore che inizia deve avere 6 carte in mano, ottenuto ${state.handLen}`);
        t.assert(state.botHandLen === 5, `il bot deve avere 5 carte in mano, ottenuto ${state.botHandLen}`);
    }
};
