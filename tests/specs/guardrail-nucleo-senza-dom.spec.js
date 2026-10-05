// Guardrail statico: i file di REGOLA del duello non toccano la pagina.
//
// Nucleo senza testa (piano di attacco, Priorità 2): perché le regole
// girino anche in Node (simulazioni bot contro bot, test veloci, un domani
// un'interfaccia diversa) non devono usare `document` né creare elementi.
// Quando serve un elemento della pagina per un'animazione si chiede a
// PortaUI (js/engine/porta-ui.js), che in Node risponde "nessun elemento".
//
// I file di regola sono quelli che carica tools/duello-senza-testa.js (una
// definizione sola: un file nuovo del nucleo entra qui da solo), tranne
// porta-ui.js, che è proprio il punto in cui la pagina si tocca. I
// commenti non contano (si tolgono prima del controllo).
const fs = require('fs');
const path = require('path');

const FILE_DI_REGOLA = require(path.join(__dirname, '..', '..', 'tools', 'duello-senza-testa.js')).SCRIPT
    .filter((f) => /^js\/(engine|ai)\//.test(f) && f !== 'js/engine/porta-ui.js');

function senzaCommenti(testo) {
    return testo.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:'"`\\])\/\/.*$/gm, '$1');
}

module.exports = {
    name: 'Guardrail: i file di regola del duello non toccano la pagina (document)',
    async run(t) {
        const radice = path.join(__dirname, '..', '..');
        const problemi = [];
        FILE_DI_REGOLA.forEach((f) => {
            const testo = senzaCommenti(fs.readFileSync(path.join(radice, f), 'utf8'));
            testo.split(/\r?\n/).forEach((riga, i) => {
                if (/\bdocument\.|\bcreateElement\(/.test(riga)) problemi.push(`${f}:${i + 1} → ${riga.trim().slice(0, 100)}`);
            });
        });
        t.assert(problemi.length === 0, `Accessi alla pagina nei file di regola (usare PortaUI, js/engine/porta-ui.js):\n  - ${problemi.join('\n  - ')}`);
    }
};
