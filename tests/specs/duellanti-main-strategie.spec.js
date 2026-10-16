// Guardrail per i piani emersi dall'audit completo dei duellanti anime.
// Protegge la strategia, non una percentuale casuale della simulazione.
module.exports = {
    name: 'Strategie anime: Strings prepara Slifer e Gozaburo seppellisce Exodia',
    async run(t) {
        const risultato = await t.evaluate(() => {
            const copia = (id, uid) => ({ ...cardDatabase.find((c) => c.id === id), uid });
            const slot = (card) => ({ card, position: 'attack', isFaceDown: false, canChangePosition: true });

            resetGameState();
            Tavolo.imposta({ player: 'ia', bot: 'ia' });
            gameState.currentPlayer = 'bot';
            gameState.phase = 'main1';
            gameState.personaggioPerPosto = { player: 'yamiYugi', bot: 'strings' };
            gameState.botMonsterField = [
                slot(copia(1089, 'melma-1')),
                slot(copia(1089, 'melma-2')),
                slot(copia(302, 'melma-3')),
                null, null
            ];
            gameState.botHand = [copia(31, 'slifer'), copia(96, 'aqua')];
            const evocaSlifer = AI_HARD.chooseSummon(gameState, 'bot');

            // Con due corpi non deve consumarli per un altro Tributo mentre
            // sta costruendo il campo richiesto dal Dio.
            gameState.botMonsterField = gameState.botMonsterField.slice(0, 2).concat([null, null, null]);
            gameState.botHand = [copia(31, 'slifer-attesa'), copia(1123, 'tributo-alternativo'), copia(96, 'corpo')];
            const preparaSlifer = AI_HARD.chooseSummon(gameState, 'bot');

            // Dopo l'Evocazione, svuotare la mano abbasserebbe direttamente
            // l'ATK/DEF di Slifer: Strings deve conservare Waboku, ma può
            // ancora usare una pescata a vantaggio netto.
            gameState.botMonsterField = [slot(copia(31, 'slifer-campo')), null, null, null, null];
            gameState.botSTField = [null, null, null, null, null];
            gameState.botHand = [copia(503, 'waboku-mano')];
            const conservaManoSlifer = AI_HARD.chooseNextSpellTrapAction(gameState, {}, 'bot');
            gameState.botHand = [copia(36, 'vaso-mano')];
            const pescaConSlifer = AI_HARD.chooseNextSpellTrapAction(gameState, {}, 'bot');

            resetGameState();
            Tavolo.imposta({ player: 'ia', bot: 'ia' });
            gameState.personaggioPerPosto = { player: 'yamiYugi', bot: 'gozaburo' };
            const normale = copia(54, 'mostro-casuale');
            const testa = copia(41, 'testa-exodia');
            gameState.botDeck = [normale, testa];
            gameState.botDeckCount = 2;
            gameState.botGraveyard = [];
            const sepoltura = copia(251, 'sepoltura');
            DuelEngine.getDefinition(251).activate(DuelEngine.makeContext('bot', { card: sepoltura }));
            const gozaburoCimitero = gameState.botGraveyard.map((card) => card.id);
            const gozaburoDeck = gameState.botDeck.map((card) => card.id);

            resetGameState();
            Tavolo.imposta({ player: 'ia', bot: 'ia' });
            gameState.personaggioPerPosto = { player: 'yamiYugi', bot: 'odion' };
            gameState.livelloIA = { player: 'hard', bot: 'medium' };
            gameState.botSTField = [null, null, null, null, null];
            gameState.botHand = [copia(40, 'trappola-1'), copia(503, 'trappola-2'), copia(820, 'trappola-3')];
            const usoOdion = {};
            const primaTrappola = AI_MEDIUM.chooseNextSpellTrapAction(gameState, usoOdion, 'bot');
            gameState.botHand.splice(primaTrappola.handIndex, 1);
            const secondaTrappola = AI_MEDIUM.chooseNextSpellTrapAction(gameState, usoOdion, 'bot');
            gameState.botHand.splice(secondaTrappola.handIndex, 1);
            const terzaTrappola = AI_MEDIUM.chooseNextSpellTrapAction(gameState, usoOdion, 'bot');

            return {
                evocaSlifer: evocaSlifer && evocaSlifer.card.id,
                preparaSlifer: preparaSlifer && preparaSlifer.card.id,
                conservaManoSlifer: conservaManoSlifer && conservaManoSlifer.action,
                pescaConSlifer: pescaConSlifer && pescaConSlifer.card.id,
                cimitero: gozaburoCimitero,
                deck: gozaburoDeck,
                setOdion: [primaTrappola && primaTrappola.action, secondaTrappola && secondaTrappola.action],
                terzaTrappola: terzaTrappola && terzaTrappola.action,
                stringsMediumFusion: characterDeckDatabase.strings.medium.main.some((voce) => voce.id === 38),
                stringsHardFusion: characterDeckDatabase.strings.hard.main.some((voce) => voce.id === 38)
            };
        });

        t.assert(risultato.evocaSlifer === 31,
            `Strings deve scegliere Slifer con tre Tributi (scelto ${risultato.evocaSlifer})`);
        t.assert(risultato.preparaSlifer === 96,
            `Strings deve aggiungere un corpo senza consumare i due presenti (scelto ${risultato.preparaSlifer})`);
        t.assert(risultato.conservaManoSlifer === null,
            'Strings non deve ridurre Slifer Settando l’ultima carta della mano');
        t.assert(risultato.pescaConSlifer === 36,
            'Strings può ancora attivare una pescata a vantaggio netto con Slifer scoperto');
        t.assert(risultato.cimitero.includes(41),
            `Gozaburo deve mandare un pezzo di Exodia al Cimitero (${risultato.cimitero})`);
        t.assert(risultato.deck.includes(54),
            'Sepoltura Sciocca non deve scegliere il primo mostro casuale per Gozaburo');
        t.assert(risultato.setOdion[0] === 'set' && risultato.setOdion[1] === 'set',
            `Odion Medio deve poter preparare due Trappole (${risultato.setOdion})`);
        t.assert(risultato.terzaTrappola === null,
            'Odion Medio deve fermarsi dopo due Set nello stesso turno');
        t.assert(risultato.stringsMediumFusion && risultato.stringsHardFusion,
            'Strings Medio/Hard deve avere Fusione per il Drago Verme Umanoide');
    }
};
