// Guardrail statico: le REGOLE del duello non chiamano per nome il disegno.
//
// Nucleo senza testa (piano di attacco, Priorità 2). Le funzioni di
// game-flow.js e actions.js (il disegno del campo, i click, i modali)
// esistono solo dove c'è una pagina. Un file di regola che ne nomina una
// funziona nel browser e si rompe in Node — o peggio, lo si "aggiusta"
// aggiungendo un finto nel duello senza testa, e la separazione torna
// indietro di un pezzo alla volta senza che nessuno se ne accorga.
// Le regole avvisano l'interfaccia dal canale degli eventi
// (js/engine/eventi-duello.js), e questo spec controlla tre cose:
//  1. nessun file di regola nomina una funzione o variabile di primo
//     livello di game-flow.js/actions.js (chiamata, typeof, window.X);
//  2. ogni nome di evento usato in js/ (emetti/attendi/chiedi/ascolta/
//     ascoltato) è nell'elenco chiuso EVENTI: un nome sbagliato sarebbe un
//     avviso che nessuno sente;
//  3. ogni evento dell'elenco ha chi lo emette in un file di regola e chi
//     lo ascolta: uno senza l'uno o l'altro è un residuo da togliere.
//
// I file di regola sono quelli che carica tools/duello-senza-testa.js: la
// definizione è una sola, e un file nuovo del nucleo entra qui da solo.
const fs = require('fs');
const path = require('path');

const RADICE = path.join(__dirname, '..', '..');

function dichiarazioniDiPrimoLivello(ts, file) {
    const s = ts.createSourceFile(file, fs.readFileSync(path.join(RADICE, file), 'utf8'), ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
    const nomi = [];
    s.statements.forEach((x) => {
        if (x.kind === ts.SyntaxKind.FunctionDeclaration && x.name) nomi.push(x.name.text);
        if (x.kind === ts.SyntaxKind.VariableStatement) {
            x.declarationList.declarations.forEach((d) => { if (d.name && d.name.text) nomi.push(d.name.text); });
        }
    });
    return nomi;
}

function tuttiIJs(dir) {
    return fs.readdirSync(path.join(RADICE, dir), { withFileTypes: true }).flatMap((e) => {
        const rel = dir + '/' + e.name;
        if (e.isDirectory()) return e.name === 'vendor' ? [] : tuttiIJs(rel);
        return e.name.endsWith('.js') ? [rel] : [];
    });
}

module.exports = {
    name: 'Guardrail: le regole del duello avvisano l\'interfaccia dal canale degli eventi, mai per nome',
    standalone: true,
    async run({ assert }) {
        const ts = require('typescript');
        const { SCRIPT } = require(path.join(RADICE, 'tools', 'duello-senza-testa.js'));
        const regole = SCRIPT.filter((f) => /^js\/(engine|ai)\//.test(f));
        const daRegole = new Set(regole.flatMap((f) => dichiarazioniDiPrimoLivello(ts, f)));
        const interfaccia = new Set(['js/engine/game-flow.js', 'js/engine/actions.js']
            .flatMap((f) => dichiarazioniDiPrimoLivello(ts, f))
            .filter((n) => !daRegole.has(n)));

        // --- 1. nessun nome dell'interfaccia nelle regole ---------------
        const problemi = [];
        regole.forEach((f) => {
            const s = ts.createSourceFile(f, fs.readFileSync(path.join(RADICE, f), 'utf8'), ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
            const visita = (nodo) => {
                if (nodo.kind === ts.SyntaxKind.Identifier && interfaccia.has(nodo.text)) {
                    const p = nodo.parent;
                    // `window.nome` conta (è la stessa funzione); `altro.nome`
                    // e le chiavi di un oggetto no.
                    const proprieta = p && p.kind === ts.SyntaxKind.PropertyAccessExpression && p.name === nodo
                        && !(p.expression.kind === ts.SyntaxKind.Identifier && p.expression.text === 'window');
                    const chiave = p && (p.kind === ts.SyntaxKind.PropertyAssignment || p.kind === ts.SyntaxKind.MethodDeclaration) && p.name === nodo;
                    const dichiarazione = p && (p.kind === ts.SyntaxKind.Parameter || p.kind === ts.SyntaxKind.VariableDeclaration) && p.name === nodo;
                    if (!proprieta && !chiave && !dichiarazione) {
                        problemi.push(`${f}:${s.getLineAndCharacterOfPosition(nodo.getStart()).line + 1} → ${nodo.text}`);
                    }
                }
                ts.forEachChild(nodo, visita);
            };
            visita(s);
        });
        assert(problemi.length === 0,
            `Le regole nominano funzioni dell'interfaccia (emettere un evento di js/engine/eventi-duello.js invece):\n  - ${problemi.join('\n  - ')}`);

        // --- 2 e 3. nomi degli eventi ------------------------------------
        const catalogo = fs.readFileSync(path.join(RADICE, 'js/engine/eventi-duello.js'), 'utf8');
        const blocco = catalogo.slice(catalogo.indexOf('const EVENTI = Object.freeze({'), catalogo.indexOf('});', catalogo.indexOf('const EVENTI = Object.freeze({')));
        const eventi = new Set([...blocco.matchAll(/^\s*'([a-z-]+)':/gm)].map((m) => m[1]));
        assert(eventi.size > 10, `Elenco EVENTI non letto (${eventi.size} voci): cambiata la forma di js/engine/eventi-duello.js?`);

        const usi = { emessi: new Map(), ascoltati: new Map() };
        tuttiIJs('js').forEach((f) => {
            const testo = fs.readFileSync(path.join(RADICE, f), 'utf8');
            for (const m of testo.matchAll(/EventiDuello\.(emetti|attendi|chiedi|ascolta|ascoltato)\(\s*'([^']+)'/g)) {
                const dove = m[1] === 'ascolta' ? usi.ascoltati : usi.emessi;
                if (!dove.has(m[2])) dove.set(m[2], new Set());
                dove.get(m[2]).add(f);
            }
        });
        const sconosciuti = [...usi.emessi.keys(), ...usi.ascoltati.keys()].filter((n) => !eventi.has(n));
        assert(sconosciuti.length === 0, `Eventi non nell'elenco EVENTI di js/engine/eventi-duello.js: ${[...new Set(sconosciuti)].join(', ')}`);

        const regoleSet = new Set(regole);
        const senzaEmittente = [...eventi].filter((n) => ![...(usi.emessi.get(n) || [])].some((f) => regoleSet.has(f)));
        const senzaAscolto = [...eventi].filter((n) => !usi.ascoltati.has(n));
        assert(senzaEmittente.length === 0, `Eventi che nessun file di regola emette (togliere dall'elenco?): ${senzaEmittente.join(', ')}`);
        assert(senzaAscolto.length === 0, `Eventi che nessuno ascolta (un avviso che non arriva a nessuno): ${senzaAscolto.join(', ')}`);
    }
};
