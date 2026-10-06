// Strategia della cache PWA verificata senza browser: esegue sw.js in un
// contesto con Cache Storage e rete finte. Protegge due invarianti che una
// semplice ricerca nel sorgente non dimostrerebbe:
//  - un 404/500 non deve avvelenare una copia valida già installata;
//  - la risposta intercettata resta pendente finché cache.put non termina,
//    così il browser non può sospendere il worker a scrittura incompleta.
const fs = require('fs');
const path = require('path');
const vm = require('vm');

module.exports = {
    name: 'Service worker: risposte valide attese in cache, errori HTTP mai persistiti',
    standalone: true,
    async run({ assert }) {
        const sorgente = fs.readFileSync(path.join(__dirname, '..', '..', 'sw.js'), 'utf8');
        const gestori = {};
        const scritture = [];
        let rispostaInCache = null;
        let rispostaDiRete = null;
        let risolviScrittura = null;
        let chiamateRete = 0;

        const cache = {
            match: async () => rispostaInCache,
            put: (richiesta, risposta) => {
                scritture.push({ richiesta, risposta });
                return new Promise((resolve) => { risolviScrittura = resolve; });
            }
        };
        const contesto = {
            console,
            URL,
            Request,
            self: {
                location: { origin: 'https://gioco.test' },
                addEventListener: (nome, fn) => { gestori[nome] = fn; },
                skipWaiting: async () => {},
                clients: { claim: async () => {} }
            },
            caches: {
                open: async () => cache,
                match: async () => rispostaInCache,
                keys: async () => [],
                delete: async () => true
            },
            fetch: async () => { chiamateRete++; return rispostaDiRete; }
        };
        vm.runInNewContext(sorgente, contesto, { filename: 'sw.js' });
        assert(typeof gestori.fetch === 'function', 'sw.js deve registrare il gestore fetch');

        function risposta(ok, etichetta) {
            return { ok, etichetta, clone: () => ({ copiaDi: etichetta }) };
        }

        function intercetta(percorso) {
            let promessa;
            gestori.fetch({
                request: { method: 'GET', url: `https://gioco.test/${percorso}` },
                respondWith: (p) => { promessa = Promise.resolve(p); }
            });
            return promessa;
        }

        // App shell valida: viene scritta e la risposta non si conclude
        // finché la scrittura controllata non è stata risolta.
        rispostaDiRete = risposta(true, 'js-nuovo');
        const richiestaJs = intercetta('js/version.js');
        let jsConcluso = false;
        richiestaJs.then(() => { jsConcluso = true; });
        await new Promise((resolve) => setImmediate(resolve));
        assert(scritture.length === 1, 'Un JS valido deve aggiornare la Cache Storage');
        assert(!jsConcluso, 'La risposta JS deve attendere cache.put');
        risolviScrittura();
        const jsRestituito = await richiestaJs;
        assert(jsConcluso && jsRestituito === rispostaDiRete, 'Dopo cache.put viene restituita la risposta di rete originale');

        // App shell non valida: passa al chiamante, ma non sovrascrive la
        // copia buona che servirà al prossimo avvio offline.
        rispostaDiRete = risposta(false, 'errore-500');
        const primaErrore = scritture.length;
        const erroreRestituito = await intercetta('js/version.js');
        assert(erroreRestituito === rispostaDiRete, 'Online resta visibile la risposta HTTP non valida');
        assert(scritture.length === primaErrore, 'Una risposta HTTP non valida non deve entrare in cache');

        // Media già presente: cache-first puro, senza chiamare la rete.
        rispostaInCache = risposta(true, 'campo-in-cache');
        const retePrima = chiamateRete;
        const mediaRestituito = await intercetta('images/fields/arena.jpg');
        assert(mediaRestituito === rispostaInCache, 'Un media già memorizzato viene servito dalla cache');
        assert(chiamateRete === retePrima, 'Con un media in cache la rete non viene interrogata');

        // Media nuovo valido: stessa garanzia sulla scrittura completata.
        rispostaInCache = null;
        rispostaDiRete = risposta(true, 'campo-nuovo');
        const richiestaMedia = intercetta('images/fields/nuovo.jpg');
        let mediaConcluso = false;
        richiestaMedia.then(() => { mediaConcluso = true; });
        await new Promise((resolve) => setImmediate(resolve));
        assert(scritture.length === primaErrore + 1, 'Un media nuovo e valido viene memorizzato al primo uso');
        assert(!mediaConcluso, 'Anche la risposta media deve attendere cache.put');
        risolviScrittura();
        await richiestaMedia;
        assert(mediaConcluso, 'La richiesta media termina dopo la scrittura');
    }
};
