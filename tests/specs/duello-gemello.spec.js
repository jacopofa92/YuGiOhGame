// Il duello gemello: due motori che si parlano come due telefoni.
//
// Priorità 3 del piano, Multiplayer "a passo comune" (js/engine/passo-comune.js).
// tools/duello-gemello.js fa girare due copie complete del motore sullo
// stesso orologio virtuale; su ciascuna il posto 'player' è l'IA e il posto
// 'bot' è l'altra copia, raggiunta passando per JSON con una latenza
// variabile. Ogni comando porta l'impronta intera dello stato di chi lo manda
// e chi lo riceve la confronta con la propria: la partita è "allineata" se
// non diverge mai, finisce con lo stesso stato sui due lati e con esiti
// rovesciati coerenti.
//
// Le partite qui sotto sono quelle che hanno trovato i difetti veri mentre il
// passo comune nasceva, più qualche partita qualunque:
//  - seme 44, Yami/Kaiba: Kaiser Glider sceglie a metà di Buco Nero, e la
//    scelta cadeva in due punti diversi (chi decide all'istante la
//    applicava dentro il ciclo, chi la riceveva dopo);
//  - seme 45, Yami/Kaiba: la scelta già arrivata veniva servita dentro
//    chiedi(), e Cerchio Ammaliante restava senza bersaglio da una parte sola;
//  - seme 670, Yugi/Espa Roba: Exodia alla pescata, e l'IA proseguiva in
//    Standby Phase dopo la vittoria;
//  - seme 544, Joey/Mai: Scatola delle Fate porta i LP a 0 in Standby, e l'IA
//    entrava lo stesso in Main Phase 1;
//  - seme 9447, Bandit Keith/Bakura: la Catena che resta in volo a duello finito.
// Verificato al contrario: togliendo la differita delle decisioni prese
// all'istante (Decisioni.chiedi), le partite 44 e 45 divergono.
//
// Standalone: non apre pagine.
const path = require('path');

const PARTITE = [
    { host: 'yamiYugi', ospite: 'kaiba', livello: 'hard', seme: 42 },
    { host: 'yamiYugi', ospite: 'kaiba', livello: 'hard', seme: 44 },
    { host: 'yamiYugi', ospite: 'kaiba', livello: 'hard', seme: 45 },
    { host: 'yugiMuto', ospite: 'espaRoba', livello: 'hard', seme: 670 },
    { host: 'joey', ospite: 'mai', livello: 'easy', seme: 544 },
    { host: 'bandit_keith', ospite: 'bakura', livello: 'hard', seme: 9447 },
    { host: 'pegasus', ospite: 'marik', livello: 'medium', seme: 300 },
    { host: 'weevil', ospite: 'rex', livello: 'easy', seme: 301 }
];

module.exports = {
    name: 'Duello gemello: due motori a passo comune restano allineati per tutta la partita',
    standalone: true,
    async run({ assert }) {
        const { giocaGemello } = require(path.join(__dirname, '..', '..', 'tools', 'duello-gemello.js'));
        const problemi = [];
        let decisioniViaggiate = 0;
        for (const p of PARTITE) {
            const r = await giocaGemello({
                host: p.host, ospite: p.ospite, livelloHost: p.livello, livelloOspite: p.livello,
                seme: p.seme, turni: 60
            }, 0);
            const dove = `${p.host}/${p.ospite} ${p.livello} seme ${p.seme}`;
            if (r.motivoStop !== 'fine' && r.motivoStop !== 'limite') {
                problemi.push(`${dove}: fermata (${r.motivoStop}) al turno ${r.host.turno}, host non fermo per "${r.host.nonFermo}", ospite per "${r.ospite.nonFermo}"`);
            }
            r.divergenze.slice(0, 2).forEach((d) => problemi.push(`${dove}: ${d.slice(0, 400)}`));
            r.altriErrori.slice(0, 2).forEach((d) => problemi.push(`${dove}: errore ${d.slice(0, 300)}`));
            if (!r.esitiCoerenti) problemi.push(`${dove}: esiti incoerenti (host ${r.host.esito}, ospite ${r.ospite.esito})`);
            if (r.motivoStop === 'fine' && !r.finaliUguali) problemi.push(`${dove}: stato a fine duello diverso fra i due lati`);
            // Comandi e decisioni mandati da ciascun lato contro quelli
            // ricevuti dall'altro: lo scarto sono le decisioni (le risposte in
            // Catena, le scelte di bersaglio), che devono esserci davvero.
            decisioniViaggiate += r.host.passo.inviati + r.ospite.passo.inviati;
        }
        assert(problemi.length === 0, `Duello gemello:\n  - ${problemi.join('\n  - ')}`);
        assert(decisioniViaggiate > 100, `Fra le due copie è passato troppo poco (${decisioniViaggiate} messaggi): il passo comune era davvero acceso?`);
    }
};
