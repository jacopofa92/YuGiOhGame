// Spada Rivelatrice (id 8): il flip dei mostri coperti dell'avversario
// deve scatenare i loro trigger ON_FLIP (fix del 2026-09-02 — prima era
// una SEMPLIFICAZIONE dichiarata: il flip non attivava nulla). Usa
// Insetto Divoratore Mostruoso (id 23, effetto FLIP: distrugge il mostro
// scoperto con l'ATK più alto sul Terreno) come sonda osservabile.
module.exports = {
    name: 'Spada Rivelatrice gira scoperti i mostri avversari e ne scatena i trigger ON_FLIP (id 8/23)',
    async run(t) {
        await t.evaluate(() => {
            // FX disattivata: rende il test deterministico, sincrono, senza
            // dover aspettare l'animazione reale delle spade (l'else senza
            // FX in activate() esiste apposta per questo percorso).
            window.FX = null;
            const strong = { ...cardDatabase.find((c) => c.type === 'monster' && !c.extraDeck), attack: 2500, defense: 0, uid: 'strong-atk-1' };
            gameState.playerMonsterField = [{ card: strong, position: 'attack', isFaceDown: false, hasAttacked: false }, null, null, null, null];
            const insetto = { ...cardDatabase.find((c) => c.id === 23), uid: 'insetto-1' };
            gameState.botMonsterField = [{ card: insetto, position: 'defense', isFaceDown: true }, null, null, null, null];
            gameState.botSTField = [null, null, null, null, null];
            gameState.playerSTField = [null, null, null, null, null];
            const spada = { ...cardDatabase.find((c) => c.id === 8), uid: 'spada-1' };
            const ctx = DuelEngine.makeContext('player', { card: spada, index: 0 });
            DuelEngine.getDefinition(8).activate(ctx);
        });

        // Segnale vero (lo stato del Terreno), non un'attesa a tempo
        // indovinato — vedi tests/README.md.
        await t.page.waitForFunction(() => gameState.playerMonsterField[0] === null, { timeout: 3000 });

        const result = await t.evaluate(() => ({
            insettoFaceUp: !!gameState.botMonsterField[0] && gameState.botMonsterField[0].isFaceDown === false,
            attackerGone: gameState.playerMonsterField[0] === null
        }));
        t.assert(result.insettoFaceUp, 'Insetto Divoratore Mostruoso deve risultare scoperto dopo l\'attivazione di Spada Rivelatrice');
        t.assert(result.attackerGone, 'Il flip causato da Spada Rivelatrice deve scatenare ON_FLIP: Insetto Divoratore deve distruggere il mostro scoperto avversario più forte');

        const lifecycle = await t.evaluate(() => {
            const spada = { ...cardDatabase.find((c) => c.id === 8), uid: 'spada-persistenza-1' };
            gameState.playerSTField[0] = { card: spada, isFaceDown: false, turnsLeft: 3 };
            gameState.revealedSwordsLanded = { player: false, bot: true };
            DuelEngine.recomputeStaticEffects();
            const mentreAttiva = {
                blocca: DuelEngine.cannotAttack('bot'),
                rivela: DuelEngine.isRevealedFor('bot'),
                lame: gameState.revealedSwordsLanded.bot
            };

            // Simula qualunque uscita anticipata dal Terreno (distruzione,
            // rimozione, ritorno in mano): il ricalcolo centrale deve togliere
            // sia la regola continua sia la sua rappresentazione persistente.
            gameState.playerSTField[0] = null;
            DuelEngine.recomputeStaticEffects();
            return {
                mentreAttiva,
                dopoRimozione: {
                    blocca: DuelEngine.cannotAttack('bot'),
                    rivela: DuelEngine.isRevealedFor('bot'),
                    lame: gameState.revealedSwordsLanded.bot
                }
            };
        });
        t.assert(lifecycle.mentreAttiva.blocca && lifecycle.mentreAttiva.rivela && lifecycle.mentreAttiva.lame,
            'Finché Spada Rivelatrice resta scoperta devono persistere blocco, rivelazione e lame');
        t.assert(!lifecycle.dopoRimozione.blocca && !lifecycle.dopoRimozione.rivela && !lifecycle.dopoRimozione.lame,
            'Se Spada Rivelatrice lascia il Terreno, regola e resa persistente devono sparire immediatamente');
    }
};
