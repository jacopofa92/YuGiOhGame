/**
 * check-syntax.js — controlla che OGNI file .js del progetto sia
 * sintatticamente valido, senza aprire un browser.
 * =====================================================================
 *
 * PERCHÉ ESISTE. Questo gioco non ha né bundler né linting: i file .js
 * vengono serviti così come sono, con tag <script> in ordine fisso. Un
 * singolo errore di sintassi in un file non rompe "una funzione": rompe
 * l'INTERO file, e con lui ogni pagina che lo carica — quindi il gioco.
 *
 * Non è teorico. È già successo: un commento JSDoc che citava un nome di
 * variabile terminante per asterisco ha formato accidentalmente la
 * sequenza di chiusura di un commento a metà frase, trasformando il resto
 * del blocco in codice vero. Tutti i test della suite fallirono insieme
 * con un messaggio criptico ("Unexpected token '*'"), che è il sintomo
 * tipico di un errore a monte comune a ogni pagina, non di un bug in una
 * singola carta.
 *
 * `node --check` trova quel guasto in una frazione di secondo e dice
 * ESATTAMENTE file e riga, mentre la suite Playwright impiega ~8 minuti
 * per dire soltanto che tutto è rotto. È la rete di sicurezza più
 * economica del progetto, ed è per questo che in CI gira per prima.
 *
 * Cosa NON è: un linter. Non giudica stile, variabili inutilizzate o
 * cattive abitudini — solo "questo file è JavaScript valido". Un linter
 * vero resta una cosa desiderabile e separata.
 *
 * Uso: `npm run check` (o `node scripts/check-syntax.js`).
 */
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const RADICE = path.join(__dirname, '..');

// js/vendor/ sono librerie di terze parti minificate (gsap, howler, pixi,
// supabase): non le scriviamo noi, e minificate possono usare costrutti
// che non ha senso giudicare qui. node_modules per gli stessi motivi.
const CARTELLE_ESCLUSE = new Set(['node_modules', '.git', 'vendor']);

function raccogliFile(dir, trovati) {
    for (const voce of fs.readdirSync(dir, { withFileTypes: true })) {
        if (voce.isDirectory()) {
            if (CARTELLE_ESCLUSE.has(voce.name)) continue;
            raccogliFile(path.join(dir, voce.name), trovati);
        } else if (voce.name.endsWith('.js')) {
            trovati.push(path.join(dir, voce.name));
        }
    }
    return trovati;
}

const file = raccogliFile(RADICE, []);
const guasti = [];

for (const f of file) {
    try {
        execFileSync(process.execPath, ['--check', f], { stdio: 'pipe' });
    } catch (err) {
        // `node --check` scrive il dettaglio (file, riga, colonna, e la
        // riga incriminata) su stderr: è esattamente ciò che serve, va
        // riportato tale e quale invece di riassumerlo.
        const dettaglio = (err.stderr || Buffer.from('')).toString().trim();
        guasti.push({ file: path.relative(RADICE, f), dettaglio });
    }
}

console.log(`Controllati ${file.length} file .js (esclusi js/vendor e node_modules).`);

if (guasti.length === 0) {
    console.log('Sintassi a posto.');
    process.exit(0);
}

console.error(`\n${guasti.length} file con errori di sintassi:\n`);
guasti.forEach((g) => {
    console.error(`--- ${g.file} ---`);
    console.error(g.dettaglio);
    console.error('');
});
process.exit(1);
