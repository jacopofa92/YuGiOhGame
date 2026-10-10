// Abile Mago Oscuro (id 736) e i Segnalini Magia.
//
// Domanda dell'utente: "funzionano bene i segnalini su di esso?". No, e i
// difetti erano cinque:
//  1. i Segnalini stavano in `spellCounters`, mentre il badge col numero
//     sopra la carta legge solo `counters` (convenzione in cima a
//     js/engine/card-effects.js): si accumulavano ma non si vedevano —
//     stesso difetto su Bestia Mitica Cerbero (734), Mago dell'Esplosione
//     (742) e Biblioteca Magica Reale (615);
//  2. con 3 Segnalini l'effetto risultava attivabile anche senza alcun
//     Mago Nero disponibile, e non faceva nulla;
//  3. prendeva il Mago Nero sempre nell'ordine mano -> Deck -> Cimitero,
//     senza lasciar scegliere da dove;
//  4. Mago Apprendista (737) poteva dargli un quarto Segnalino;
//  5. i Segnalini restavano sulla carta nel Cimitero, e una volta rianimata
//     ripartiva già carica.
//
// Gira in Node sul duello senza testa: si provano le regole, non i modali.
const path = require('path');
const vm = require('vm');

module.exports = {
    name: 'Abile Mago Oscuro: Segnalini visibili, massimo 3, scelta della provenienza, azzerati in campo',
    standalone: true,
    async run({ assert }) {
        const { creaContesto } = require(path.join(__dirname, '..', '..', 'tools', 'duello-senza-testa.js'));
        const { contesto } = creaContesto({ seme: 3, avversario: 'kaiba', livello: 'hard' });
        const r = vm.runInContext(`(function () {
            resetGameState();
            const out = {};
            const carta = (id, uid) => Object.assign({}, cardDatabase.find((c) => c.id === id), { uid: uid });
            const def = DuelEngine.getDefinition(736);
            const mago = carta(736, 'abile');
            gameState.playerMonsterField = [{ card: mago, position: 'attack', isFaceDown: false }, null, null, null, null];
            gameState.playerHand = [];
            gameState.playerDeck = [];
            gameState.playerGraveyard = [];
            const ctxMago = () => DuelEngine.makeContext('player', { card: mago, slot: gameState.playerMonsterField[0], slotIndex: 0 });
            const magia = carta(36, 'vaso');

            // 1+4. Quattro Magie attivate: si ferma a 3, sul campo che il badge legge.
            for (let i = 0; i < 4; i++) {
                const c = DuelEngine.makeContext('player', { card: mago, activatedCard: magia, activatedOwner: 'player' });
                if (def.canActivateOnCardActivated(c)) def.onCardActivated(c);
            }
            out.segnalini = mago.counters;
            out.vecchioCampo = mago.spellCounters;
            const apprendista = carta(737, 'apprendista');
            DuelEngine.getDefinition(737).onSummon(DuelEngine.makeContext('player', { card: apprendista, slotIndex: -1 }));
            out.dopoApprendista = mago.counters;

            // 2. Senza un Mago Nero da nessuna parte: non attivabile.
            out.attivabileSenzaMago = def.canActivate(ctxMago());

            // 3. Mago Nero in mano, nel Deck e nel Cimitero: si sceglie il Cimitero.
            gameState.playerHand = [carta(2, 'mn-mano')];
            gameState.playerDeck = [carta(2, 'mn-deck')];
            gameState.playerDeckCount = 1;
            gameState.playerGraveyard = [carta(2, 'mn-cimitero')];
            out.attivabileConMago = def.canActivate(ctxMago());
            const togli = EventiDuello.ascolta('decisione', () => {});
            def.activate(ctxMago());
            const sospesa = Decisioni.inSospeso();
            out.opzioni = sospesa ? sospesa.candidati.map((o) => o.value) : null;
            if (sospesa) Decisioni.rispondi(sospesa.candidati.findIndex((o) => o.value === 'graveyard'));
            togli();
            const inCampo = gameState.playerMonsterField.filter(Boolean).map((s) => s.card.uid);
            out.evocato = inCampo.includes('mn-cimitero');
            out.maniIntatte = gameState.playerHand.length === 1 && gameState.playerDeck.length === 1;
            out.magoNelCimitero = gameState.playerGraveyard.some((c) => c.uid === 'abile');
            out.segniniNelCimitero = mago.counters;

            // 5. Rianimato con dei Segnalini rimasti attaccati: riparte da zero.
            mago.counters = 3;
            gameState.playerGraveyard = gameState.playerGraveyard.filter((c) => c.uid !== 'abile');
            const slotLibero = gameState.playerMonsterField.findIndex((s) => !s);
            DuelEngine.makeContext('player', { card: mago }).specialSummon('player', mago, slotLibero, 'attack', 'graveyard');
            out.dopoRianimazione = mago.counters;

            // Il bot, con più provenienze, prende il Mago Nero dal Deck.
            const magoBot = carta(736, 'abile-bot');
            magoBot.counters = 3;
            gameState.botMonsterField = [{ card: magoBot, position: 'attack', isFaceDown: false }, null, null, null, null];
            gameState.botHand = [carta(2, 'bot-mano')];
            gameState.botDeck = [carta(2, 'bot-deck')];
            gameState.botDeckCount = 1;
            gameState.botGraveyard = [];
            def.activate(DuelEngine.makeContext('bot', { card: magoBot, slot: gameState.botMonsterField[0], slotIndex: 0 }));
            out.botDalDeck = gameState.botMonsterField.some((s) => s && s.card.uid === 'bot-deck') && gameState.botHand.length === 1;

            // Gli altri tre sullo stesso campo.
            out.altriSulCampoGiusto = [734, 742, 615].every((id) => DuelEngine.getDefinition(id).acceptsSpellCounters === 'counters');
            return out;
        })()`, contesto);

        assert(r.segnalini === 3 && r.vecchioCampo === undefined,
            `I Segnalini vanno su card.counters (quello che il badge mostra) e si fermano a 3: ${JSON.stringify(r)}`);
        assert(r.dopoApprendista === 3, `Mago Apprendista non deve superare il massimo di 3: ${r.dopoApprendista}`);
        assert(r.attivabileSenzaMago === false, 'Senza un Mago Nero disponibile l\'effetto non deve essere attivabile');
        assert(r.attivabileConMago === true, 'Con 3 Segnalini e un Mago Nero l\'effetto deve essere attivabile');
        assert(JSON.stringify(r.opzioni) === JSON.stringify(['hand', 'deck', 'graveyard']),
            `Il giocatore deve poter scegliere fra mano, Deck e Cimitero: ${JSON.stringify(r.opzioni)}`);
        assert(r.evocato && r.maniIntatte && r.magoNelCimitero,
            `Scegliendo il Cimitero va in campo quel Mago Nero, gli altri restano dove sono: ${JSON.stringify(r)}`);
        assert(r.segniniNelCimitero === 0, 'Sacrificato, Abile Mago Oscuro non deve portarsi i Segnalini nel Cimitero');
        assert(r.dopoRianimazione === 0, `Rianimato deve ripartire da zero Segnalini: ${r.dopoRianimazione}`);
        assert(r.botDalDeck, 'Il bot deve prendere il Mago Nero dal Deck e tenere quello in mano');
        assert(r.altriSulCampoGiusto, 'Cerbero, Mago dell\'Esplosione e Biblioteca Magica Reale devono usare card.counters');
    }
};
