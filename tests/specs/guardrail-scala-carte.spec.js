// Analisi statica, nessun duello coinvolto.
//
// Fuori dal duello le carte prendono la larghezza da un NOME della scala in
// js/ui/card.css ("SCALA DELLE MISURE DELLE CARTE"), mai da una formula
// scritta sul posto. Prima le formule erano una ventina, metà nel CSS delle
// pagine e metà nel JS di Negozio e sbustamento, e una di loro schiacciava
// davvero le carte di Crea Carta (larghezza 130px, altezza rimasta quella di
// default: 130x146). Questo controllo impedisce che tornino a moltiplicarsi.
//
// Il DUELLO è escluso di proposito: le sue misure (Terreno, mano, Catena,
// pannello info, picker) sono calcolate per far entrare il campo nello
// schermo e vivono in duelMonstersCore.html.
const fs = require('fs');
const path = require('path');

const RADICE = path.join(__dirname, '..', '..');
const ESCLUSI = new Set(['duelMonstersCore.html', 'multiplayer.html', 'duello-sandbox.html']);
const NOME_SCALA = /^var\(--carta-[a-z-]+\)$/;

function fileDaControllare() {
    const html = fs.readdirSync(RADICE).filter((f) => f.endsWith('.html') && !ESCLUSI.has(f));
    const economia = fs.readdirSync(path.join(RADICE, 'js', 'economy')).map((f) => 'js/economy/' + f);
    return [...html, ...economia, 'js/ui/card-detail.css', 'js/ui/card-detail.js'];
}

module.exports = {
    name: 'Guardrail: fuori dal duello le carte usano la scala di card.css',
    standalone: true,
    async run(t) {
        const problemi = [];
        const card = fs.readFileSync(path.join(RADICE, 'js/ui/card.css'), 'utf8');
        t.assert(/--carta-griglia:/.test(card) && /--carta-anteprima:/.test(card), 'la scala delle misure non è più in js/ui/card.css');

        for (const f of fileDaControllare()) {
            const testo = fs.readFileSync(path.join(RADICE, f), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
            // CSS: ogni --card-w dichiarata deve essere un nome della scala.
            for (const m of testo.matchAll(/--card-w\s*:\s*([^;}]+)/g)) {
                const valore = m[1].trim();
                if (!NOME_SCALA.test(valore)) problemi.push(`${f}: --card-w: ${valore}`);
            }
            // Una larghezza fissa su una carta (la causa della carta schiacciata).
            for (const m of testo.matchAll(/\.card\s*\{[^}]*\bwidth\s*:\s*(\d+px)/g)) problemi.push(`${f}: .card { width: ${m[1]} }`);
            // JS: le misure passate a chi costruisce le carte.
            for (const m of testo.matchAll(/(?:nodoCarta|miniatura)\([^,()]+,\s*'([^']+)'\)/g)) {
                if (!NOME_SCALA.test(m[1])) problemi.push(`${f}: misura '${m[1]}'`);
            }
            for (const m of testo.matchAll(/const CARD_W\s*=\s*'([^']+)'/g)) {
                if (!NOME_SCALA.test(m[1])) problemi.push(`${f}: CARD_W = '${m[1]}'`);
            }
        }
        t.assert(!problemi.length, 'misure di carta scritte sul posto invece che dalla scala:\n' + problemi.join('\n'));
    }
};
