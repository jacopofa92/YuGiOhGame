// Decisioni (js/engine/decisioni.js): ogni scelta del duello passa da lì.
//
// Gira in Node, sul contesto del duello senza testa (tools/duello-senza-
// testa.js carica motore e regole senza pagina): così si prova il modulo
// da solo, con un'interfaccia finta fatta di ascoltatori del canale degli
// eventi, invece che attraverso i modali veri. Controlla le tre strade:
//  1. nessuna interfaccia (o sceglie il bot): la scelta automatica, subito;
//  2. sceglie il giocatore e un'interfaccia ascolta: la decisione resta
//     IN SOSPESO (Decisioni.inSospeso) finché qualcuno non risponde
//     (Decisioni.rispondi, o l'interfaccia), con "annulla" che arriva come null;
//  3. Multiplayer con `viaggia`: se sceglie l'avversario remoto si aspetta
//     la sua scelta dalla rete; la mia si comunica sempre, anche
//     automatica, con l'annulla che viaggia come uid dedicato.
const path = require('path');
const vm = require('vm');

module.exports = {
    name: 'Decisioni: scelta automatica, decisione in sospeso, scelta che viaggia in Multiplayer',
    standalone: true,
    async run({ assert }) {
        const { creaContesto } = require(path.join(__dirname, '..', '..', 'tools', 'duello-senza-testa.js'));
        const { contesto } = creaContesto({ seme: 1, avversario: 'kaiba', livello: 'hard' });
        const r = vm.runInContext(`(function () {
            resetGameState();
            const out = {};
            const carte = [{ uid: 'a', name: 'A' }, { uid: 'b', name: 'B' }, { uid: 'c', name: 'C' }];

            // --- 1. senza interfaccia: automatica, nello stesso istante ---
            let s1 = 'non arrivata';
            Decisioni.chiedi({ chi: 'player', candidati: carte }, (x) => { s1 = x && x.uid; });
            out.senzaInterfaccia = s1;
            let s2 = 'non arrivata';
            Decisioni.chiedi({ chi: 'bot', candidati: carte, automatica: (c) => c[2] }, (x) => { s2 = x && x.uid; });
            out.botConEuristica = s2;
            let s3 = 'non arrivata';
            Decisioni.chiedi({ chi: 'bot', candidati: carte, automatica: () => null }, (x) => { s3 = x; });
            out.botRinuncia = s3;
            out.vuotoInSospeso = Decisioni.inSospeso();

            // --- 2. con un'interfaccia: in sospeso fino alla risposta ---
            const mostrate = [];
            const togli = EventiDuello.ascolta('decisione', (richiesta) => { mostrate.push(richiesta.tipo); });
            let s4 = 'non arrivata';
            Decisioni.chiedi({ chi: 'player', candidati: carte, titolo: 'Scegli' }, (x) => { s4 = x && x.uid; });
            const sospesa = Decisioni.inSospeso();
            out.sospesa = sospesa && { chi: sospesa.chi, tipo: sospesa.tipo, titolo: sospesa.titolo, n: sospesa.candidati.length };
            out.primaDellaRisposta = s4;
            out.rispostaAccettata = Decisioni.rispondi(1);
            out.dopoLaRisposta = s4;
            out.sospesaDopo = Decisioni.inSospeso();
            // Il bot non passa dall'interfaccia nemmeno se c'è.
            let s5 = 'non arrivata';
            Decisioni.chiedi({ chi: 'bot', candidati: carte }, (x) => { s5 = x && x.uid; });
            out.botConInterfaccia = s5;
            // Annullabile: null.
            let s6 = 'non arrivata';
            Decisioni.chiedi({ chi: 'player', candidati: carte, annullabile: true }, (x) => { s6 = x; });
            Decisioni.rispondi(null);
            out.annullata = s6;
            // Un solo candidato con automaticaSeUnica: niente da chiedere, e
            // NON la scelta automatica (che qui direbbe "rinuncio").
            let s7 = 'non arrivata';
            Decisioni.chiedi({ chi: 'player', candidati: [carte[0]], automaticaSeUnica: true, automatica: () => null }, (x) => { s7 = x && x.uid; });
            out.unica = s7;
            // L'interfaccia che dice "questo tipo non lo so mostrare".
            const togliSchermo = EventiDuello.ascolta('decisioni-a-schermo', (tipo) => (tipo === 'posizione' ? false : undefined));
            let s8 = 'non arrivata';
            Decisioni.chiedi({ chi: 'player', tipo: 'posizione' }, (x) => { s8 = x; });
            out.posizioneNonMostrabile = s8;
            togliSchermo();
            out.mostrate = mostrate.slice();
            togli();

            // --- 3. Multiplayer ---
            const inviati = [];
            const attese = [];
            const originali = { a: DuelEngine.awaitRemoteCardChoice, b: DuelEngine.broadcastCardChoice };
            DuelEngine.awaitRemoteCardChoice = (candidati, cb) => attese.push({ uids: candidati.map((c) => c.card.uid), cb });
            DuelEngine.broadcastCardChoice = (uid) => inviati.push(uid);
            window.MULTIPLAYER_MODE = true;
            let s9 = 'non arrivata';
            Decisioni.chiedi({ chi: 'bot', candidati: carte, annullabile: true, viaggia: (c) => c.uid }, (x) => { s9 = x && x.uid; });
            out.remotaAttesa = attese.length === 1 ? attese[0].uids : null;
            attese[0].cb({ card: { uid: 'c' }, valore: carte[2] });
            out.remotaArrivata = s9;
            let s10 = 'non arrivata';
            Decisioni.chiedi({ chi: 'player', candidati: carte, viaggia: (c) => c.uid }, (x) => { s10 = x && x.uid; });
            out.miaAutomatica = s10;
            const togli2 = EventiDuello.ascolta('decisione', () => {});
            Decisioni.chiedi({ chi: 'player', candidati: carte, annullabile: true, viaggia: (c) => c.uid }, () => {});
            Decisioni.rispondi(null);
            togli2();
            // Senza viaggia la scelta resta di qua: niente rete.
            Decisioni.chiedi({ chi: 'player', candidati: carte }, () => {});
            out.inviati = inviati.slice();
            window.MULTIPLAYER_MODE = false;
            DuelEngine.awaitRemoteCardChoice = originali.a;
            DuelEngine.broadcastCardChoice = originali.b;
            return out;
        })()`, contesto);

        assert(r.senzaInterfaccia === 'a', `Senza interfaccia sceglie da sé il primo candidato: ${r.senzaInterfaccia}`);
        assert(r.botConEuristica === 'c', `Il bot usa la scelta automatica della richiesta: ${r.botConEuristica}`);
        assert(r.botRinuncia === null, `Una scelta automatica che rinuncia resta una rinuncia (null), non il primo candidato: ${r.botRinuncia}`);
        assert(r.vuotoInSospeso === null, 'Una scelta automatica non lascia nulla in sospeso');
        assert(r.sospesa && r.sospesa.chi === 'player' && r.sospesa.tipo === 'carte' && r.sospesa.titolo === 'Scegli' && r.sospesa.n === 3,
            `Con un'interfaccia la decisione resta in sospeso e si legge: ${JSON.stringify(r.sospesa)}`);
        assert(r.primaDellaRisposta === 'non arrivata', 'Prima della risposta il risultato non è ancora arrivato');
        assert(r.rispostaAccettata === true && r.dopoLaRisposta === 'b', `Decisioni.rispondi(indice) risponde al posto della persona: ${r.dopoLaRisposta}`);
        assert(r.sospesaDopo === null, 'Dopo la risposta non resta nulla in sospeso');
        assert(r.botConInterfaccia === 'a', `Il bot non passa dall'interfaccia: ${r.botConInterfaccia}`);
        assert(r.annullata === null, `Chiudere senza scegliere arriva come null: ${r.annullata}`);
        assert(r.unica === 'a', `Un solo candidato con automaticaSeUnica: si prende quello, senza chiedere: ${r.unica}`);
        assert(r.posizioneNonMostrabile === 'attack', `Un tipo che l'interfaccia non sa mostrare passa alla scelta automatica (per una Posizione, Attacco): ${r.posizioneNonMostrabile}`);
        assert(JSON.stringify(r.mostrate) === '["carte","carte"]', `All'interfaccia arrivano solo le scelte della persona: ${JSON.stringify(r.mostrate)}`);
        assert(JSON.stringify(r.remotaAttesa) === '["a","b","c","decisione:annulla"]',
            `Se sceglie l'avversario remoto si aspetta la sua scelta (con l'annulla fra i possibili): ${JSON.stringify(r.remotaAttesa)}`);
        assert(r.remotaArrivata === 'c', `La scelta remota arriva a chi aspetta: ${r.remotaArrivata}`);
        assert(r.miaAutomatica === 'a', 'La mia scelta automatica arriva anche a me');
        assert(JSON.stringify(r.inviati) === '["a","decisione:annulla"]',
            `La mia scelta viaggia sempre, anche automatica, e l'annulla col suo uid; senza viaggia niente rete: ${JSON.stringify(r.inviati)}`);
    }
};
