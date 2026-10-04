// Il nucleo senza testa: duelli interi in Node, senza browser.
//
// Traguardo della Priorità 2 del piano di attacco. tools/duello-senza-testa.js
// carica solo dati, motore, regole e IA (niente game-flow.js né actions.js,
// nessun DOM) e fa giocare duelli fino alla fine. Questo spec ne gioca
// alcuni a seme fisso, con la diagnosi accesa, e boccia se:
//  - una partita si ferma senza un vincitore (stallo del motore);
//  - una carta lancia un errore (nel browser finirebbe solo in console);
//  - un invariante si rompe (Life Points non numerici, una carta non-mostro
//    nella zona Mostri).
// Al primo giro ha trovato quattro difetti veri, presenti anche nel
// browser: gli Spirito che non tornavano in mano, quattro Magie Rituali
// che potevano Evocare la carta sbagliata, Egoista Elegante che Evocava una
// Magia, il Bozzolo dell'Evoluzione in errore ad ogni ricalcolo.
//
// Standalone: non apre pagine. Gira in pochi secondi.
const path = require('path');

const PARTITE = [
    { avversario: 'kaiba', livello: 'hard', seme: 900 },
    { avversario: 'yamiYugi', livello: 'hard', seme: 501 },
    { avversario: 'pegasus', livello: 'medium', seme: 300 },
    { avversario: 'mai', livello: 'medium', seme: 305 },
    { avversario: 'joey', livello: 'easy', seme: 302 },
    { avversario: 'marik', livello: 'hard', seme: 304 },
    { avversario: 'espa_roba', livello: 'easy', seme: 505 },
    { avversario: 'bandit_keith', livello: 'hard', seme: 204 }
];

module.exports = {
    name: 'Nucleo senza testa: duelli interi in Node, senza errori di carta né invarianti rotti',
    standalone: true,
    async run({ assert }) {
        const { giocaPartita } = require(path.join(__dirname, '..', '..', 'tools', 'duello-senza-testa.js'));
        const problemi = [];
        for (const p of PARTITE) {
            const r = await giocaPartita(Object.assign({ diagnosi: true, turni: 60 }, p), 0);
            const dove = `${p.avversario} ${p.livello} seme ${p.seme}`;
            const finita = r.esito === true || r.esito === false || r.esito === 'draw' || r.alLimite;
            if (!finita) problemi.push(`${dove}: ferma al turno ${r.turno} in fase ${r.fasi} (di turno ${r.chi})`);
            if (r.erroriCarte.length) problemi.push(`${dove}: errori di carta — ${[...new Set(r.erroriCarte)].slice(0, 3).join(' | ')}`);
            if (r.invarianti.length) problemi.push(`${dove}: ${r.invarianti.join(' | ')}`);
        }
        assert(problemi.length === 0, `Duelli senza testa:\n  - ${problemi.join('\n  - ')}`);
    }
};
