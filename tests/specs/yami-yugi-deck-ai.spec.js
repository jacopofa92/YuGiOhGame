// Yami Yugi: una sola copia canonica di Mago Nero, supporto funzionante
// e Slifer realmente giocabile dall'IA Difficile. Questi tre controlli
// restano insieme perché una lista corretta sulla carta, ma inutilizzabile
// dal pilota, falserebbe di nuovo le simulazioni di difficoltà.
module.exports = {
    name: 'Yami Yugi: Mago Nero canonico, Pietra del Saggio e IA di Slifer',
    async run(t) {
        const risultato = await t.evaluate(() => {
            const quantita = (livello, id) => {
                const voce = characterDeckDatabase.yamiYugi[livello].main.find((e) => e.id === id);
                return voce ? voce.qty : 0;
            };
            const totale = (livello) => characterDeckDatabase.yamiYugi[livello].main
                .reduce((somma, voce) => somma + voce.qty, 0);

            resetGameState();
            Tavolo.imposta({ player: 'ia', bot: 'ia' });

            const maga = { ...cardDatabase.find((c) => c.id === 188), uid: 'maga-test' };
            const pietra = { ...cardDatabase.find((c) => c.id === 430), uid: 'pietra-test' };
            const mago = { ...cardDatabase.find((c) => c.id === 2), uid: 'mago-test' };
            gameState.botMonsterField = [{ card: maga, position: 'attack', isFaceDown: false }, null, null, null, null];
            gameState.botHand = [pietra];
            gameState.botDeck = [mago];
            const pietraAttivabile = DuelEngine.getDefinition(430)
                .canActivate(DuelEngine.makeContext('bot', { card: pietra, zone: 'hand', handIndex: 0 }));

            const dimensione = { ...cardDatabase.find((c) => c.id === 362), uid: 'dimensione-test' };
            const elfa = { ...cardDatabase.find((c) => c.id === 391), uid: 'elfa-test' };
            gameState.botMonsterField = [{ card: elfa, position: 'attack', isFaceDown: false }, null, null, null, null];
            gameState.botSTField = [null, null, null, null, null];
            gameState.botHand = [dimensione, mago];
            gameState.currentPlayer = 'bot';
            gameState.phase = 'main1';
            const dimensioneAttivabile = DuelEngine.canActivate('bot', 'hand', 0);
            const sceltaDimensione = AI_MEDIUM.chooseNextSpellTrapAction(gameState, {}, 'bot');

            const slifer = { ...cardDatabase.find((c) => c.id === 31), uid: 'slifer-test' };
            const kuriboh = (n) => ({ ...cardDatabase.find((c) => c.id === 22), uid: `kuriboh-${n}` });
            const magia = (id, n) => ({ ...cardDatabase.find((c) => c.id === id), uid: `magia-${n}` });
            gameState.botMonsterField = [0, 1, 2].map((n) => ({ card: kuriboh(n), position: 'attack', isFaceDown: false }));
            gameState.botMonsterField.push(null, null);
            gameState.botHand = [slifer, magia(8, 1), magia(35, 2), magia(36, 3), magia(147, 4)];
            gameState.playerMonsterField = [null, null, null, null, null];
            gameState.personaggioPerPosto = { player: null, bot: 'yamiYugi' };
            const scelta = AI_HARD.chooseSummon(gameState, 'bot');

            return {
                maghi: ['easy', 'medium', 'hard'].map((l) => quantita(l, 2)),
                slifer: ['easy', 'medium', 'hard'].map((l) => quantita(l, 31)),
                totali: ['easy', 'medium', 'hard'].map(totale),
                pietraAttivabile,
                dimensioneAttivabile,
                sceltaDimensione: sceltaDimensione && sceltaDimensione.card.id,
                sceltaSlifer: scelta && scelta.card.id,
                tributiSlifer: scelta && scelta.tributeIndices.length,
                posizioneSlifer: scelta && scelta.position
            };
        });

        t.assert(risultato.maghi.every((q) => q === 1),
            `Yami Yugi deve avere un solo Mago Nero per livello: ${risultato.maghi.join('/')}`);
        t.assert(risultato.slifer.join('/') === '0/0/1',
            `Slifer deve comparire soltanto a Difficile: ${risultato.slifer.join('/')}`);
        t.assert(risultato.totali.every((n) => n === 40),
            `I tre Main Deck devono restare da 40 carte: ${risultato.totali.join('/')}`);
        t.assert(risultato.pietraAttivabile,
            'Pietra del Saggio deve riconoscere la Maga Oscura id 188 e il Mago Nero nel Deck');
        t.assert(risultato.sceltaDimensione === 362,
            `L'IA Media deve riconoscere Dimensione Magica come linea per evocare Mago Nero: ${JSON.stringify(risultato)}`);
        t.assert(risultato.sceltaSlifer === 31 && risultato.tributiSlifer === 3,
            `L'IA Difficile deve scegliere Slifer con tre Tributi quando è conveniente: ${JSON.stringify(risultato)}`);
        t.assert(risultato.posizioneSlifer === 'attack',
            `L'IA deve valutare l'ATK futuro di Slifer e sceglierlo in Attacco: ${risultato.posizioneSlifer}`);
    }
};
