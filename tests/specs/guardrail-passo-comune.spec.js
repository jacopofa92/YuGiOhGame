// Guardrail statico: le regole restano deterministiche fra i due telefoni.
//
// Multiplayer "a passo comune" (Priorità 3 del piano): i due client
// eseguono l'intera partita ciascuno per conto suo e devono arrivare allo
// stesso stato. Due modi di rompere tutto in silenzio, vietati qui nei
// file di regola (quelli che carica tools/duello-senza-testa.js, tranne
// l'IA, che in Multiplayer non gioca):
//  1. Math.random: ogni client tirerebbe un numero diverso. La casualità di
//     gioco passa da Casuale (js/engine/casuale.js), che in Multiplayer
//     esce da un seme condiviso e offline è proprio Math.random.
//  2. ['player', 'bot'] come ordine dei posti: ogni telefono chiama
//     "player" sé stesso, quindi lo stesso ciclo girerebbe in ordine opposto
//     sui due client. Si scrive Tavolo.ordine() (o ordineInverso()), che
//     offline è proprio ['player', 'bot'].
// Un effetto visivo può usare Math.random (vive fuori dai file di regola):
// lì non conta che i due schermi tirino gli stessi numeri.
const fs = require('fs');
const path = require('path');

const RADICE = path.join(__dirname, '..', '..');

module.exports = {
    name: 'Guardrail: le regole restano deterministiche fra due telefoni (Casuale, Tavolo.ordine)',
    standalone: true,
    async run({ assert }) {
        const { SCRIPT } = require(path.join(RADICE, 'tools', 'duello-senza-testa.js'));
        const regole = SCRIPT.filter((f) => /^js\/engine\//.test(f) && f !== 'js/engine/casuale.js').concat(['js/data/cards-db.js']);
        const casuali = [];
        const ordini = [];
        regole.forEach((f) => {
            fs.readFileSync(path.join(RADICE, f), 'utf8').split(/\r?\n/).forEach((riga, i) => {
                if (/^\s*(\/\/|\*|\/\*)/.test(riga)) return;
                const dove = `${f}:${i + 1} → ${riga.trim().slice(0, 110)}`;
                // cards-db.js costruisce ancora uid fatti di ora e caso per
                // le partite offline: lì Math.random dentro un uid è lecito
                // (in Multiplayer gli uid arrivano da opzioni.prefissoUid).
                // E il ripiego di casualeDiGioco, per le pagine senza
                // motore: la riga che nomina anche Casuale.
                if (/Math\.random\(\)/.test(riga) && !/Casuale/.test(riga) && !(f === 'js/data/cards-db.js' && /uid/.test(riga))) casuali.push(dove);
                // tavolo.js è chi definisce i posti e il loro ordine.
                if (f !== 'js/engine/tavolo.js' && /\[\s*'(player|bot)'\s*,\s*'(player|bot)'\s*\]/.test(riga)) ordini.push(dove);
            });
        });
        assert(casuali.length === 0, `Math.random nelle regole (usare Casuale, js/engine/casuale.js):\n  - ${casuali.join('\n  - ')}`);
        assert(ordini.length === 0, `Ordine fisso dei posti nelle regole (usare Tavolo.ordine()):\n  - ${ordini.join('\n  - ')}`);
    }
};
