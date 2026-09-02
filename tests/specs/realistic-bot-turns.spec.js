// Il bot gioca 3 turni consecutivi realistici (pesca, Evocazione,
// Attivazioni, Battle Phase) a difficoltà Media e Difficile, senza mai
// generare un errore JS non gestito — il test di stress più ampio della
// suite: se una singola carta rotta manda in eccezione l'IA a metà
// decisione, lo scopre qui. Lento (i ritardi di Chain sono reali, ~9s a
// turno): non freeza il ciclo naturale, lo guida di proposito lui stesso.
module.exports = {
    freeze: false,
    name: 'Il bot gioca 3 turni realistici senza errori (Media e Difficile)',
    async run(t) {
        for (const difficulty of ['medium', 'hard']) {
            await t.evaluate((diff) => {
                gameState.botDifficulty = diff;
                window.DuelSession = window.DuelSession || {};
                DuelSession.opponent = { id: 'kaiba' };
                resetGameState();
                gameState.currentPlayer = 'bot';
                gameState.phase = 'draw';
                gameState.turn = 1;
            }, difficulty);

            for (let i = 0; i < 3; i++) {
                await t.evaluate((turnNum) => {
                    gameState.currentPlayer = 'bot';
                    gameState.hasNormalSummoned = false;
                    gameState.phase = 'draw';
                    gameState.turn = turnNum;
                }, i * 2 + 1);
                await t.evaluate(() => { botTurn(); });
                await t.page.waitForTimeout(9000);
            }

            const final = await t.evaluate(() => ({
                botLP: gameState.botLP,
                playerLP: gameState.playerLP,
                gameOver: gameState.gameOver
            }));
            t.assert(final.botLP > 0 || final.gameOver, `[${difficulty}] stato finale incoerente: LP bot ${final.botLP}, gameOver ${final.gameOver}`);
        }
        // Se il bot ha lanciato un'eccezione non gestita in una qualunque
        // delle decisioni sopra, run-all.js la intercetta comunque tramite
        // page.on('pageerror') e fa fallire questo test da solo.
    }
};
