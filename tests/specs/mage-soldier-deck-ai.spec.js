// Guardrail del mazzo AVVERSARIO di Mage Soldier. Protegge le sinergie
// emerse dall'audit: Evocatore di Illusioni deve avere un Extra Deck vero,
// i Segnalini Magia devono circolare e la IA deve spenderli con criterio.
module.exports = {
    name: 'Mage Soldier: deck a Segnalini Magia e rimozioni usate dalla IA',
    async run(t) {
        const risultato = await t.evaluate(() => {
            const copia = (id, uid) => ({ ...cardDatabase.find((c) => c.id === id), uid });
            const slot = (card) => ({ card, position: 'attack', isFaceDown: false, canChangePosition: true });
            const totale = (livello) => characterDeckDatabase.mageSoldier[livello].main
                .reduce((somma, voce) => somma + voce.qty, 0);

            resetGameState();
            Tavolo.imposta({ player: 'ia', bot: 'ia' });
            gameState.currentPlayer = 'bot';
            gameState.phase = 'main1';
            gameState.personaggioPerPosto = { player: 'yamiYugi', bot: 'mageSoldier' };

            const breaker = copia(131, 'breaker');
            breaker.counters = 1;
            gameState.botMonsterField = [slot(breaker), null, null, null, null];
            gameState.playerSTField = [{ card: copia(8, 'bersaglio-magia'), isFaceDown: true }, null, null, null, null];
            const sceltaBreaker = AI_MEDIUM.chooseSetCardActivation(gameState, 'bot');

            const blast = copia(742, 'blast');
            blast.counters = 2;
            gameState.botMonsterField = [slot(blast), null, null, null, null];
            gameState.playerSTField = [null, null, null, null, null];
            gameState.playerMonsterField = [slot(copia(242, 'bersaglio-mostro')), null, null, null, null];
            const sceltaBlast = AI_MEDIUM.chooseSetCardActivation(gameState, 'bot');

            return {
                totali: ['easy', 'medium', 'hard'].map(totale),
                extra: ['easy', 'medium'].map((livello) => characterDeckDatabase.mageSoldier[livello].extra.map((voce) => voce.id)),
                hardCerbero: characterDeckDatabase.mageSoldier.hard.main.some((voce) => voce.id === 734 && voce.qty === 2),
                hardLineaMorta: characterDeckDatabase.mageSoldier.hard.main.some((voce) => voce.id === 736),
                breakerAccettaSegnalini: DuelEngine.getDefinition(131).acceptsSpellCounters,
                sceltaBreaker: sceltaBreaker && sceltaBreaker.card.id,
                sceltaBlast: sceltaBlast && sceltaBlast.card.id
            };
        });

        t.assert(risultato.totali.every((n) => n === 40),
            `I tre Main Deck devono restare da 40 carte: ${risultato.totali.join('/')}`);
        t.assert(risultato.extra.every((lista) => lista.includes(387)),
            `Evocatore di Illusioni deve trovare Re dei Musicisti: ${JSON.stringify(risultato.extra)}`);
        t.assert(risultato.hardCerbero && !risultato.hardLineaMorta,
            'Il Difficile deve usare Cerbero, non Abile Mago Oscuro senza Mago Nero');
        t.assert(risultato.breakerAccettaSegnalini === 'counters',
            'Distruttore deve accettare i Segnalini Magia di Mago Apprendista');
        t.assert(risultato.sceltaBreaker === 131 && risultato.sceltaBlast === 742,
            `La IA deve spendere i Segnalini sulle rimozioni giuste: ${JSON.stringify(risultato)}`);
    }
};
