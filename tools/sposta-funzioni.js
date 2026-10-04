#!/usr/bin/env node
/**
 * sposta-funzioni.js — sposta funzioni di primo livello da un file a un
 * altro, PAROLA PER PAROLA, con i loro commenti.
 * =====================================================================
 * Usa il parser di TypeScript (devDependency) per trovare i confini esatti
 * di ogni dichiarazione: contare le graffe a mano sbaglia con stringhe,
 * template literal ed espressioni regolari. Il testo spostato è identico
 * all'originale; la prova che nulla è cambiato la dà
 * tools/impronta-funzioni.js (stesso fn.toString() prima e dopo).
 *
 * Uso:
 *   node tools/sposta-funzioni.js elenca <file>
 *       elenca le istruzioni di primo livello (funzioni e non)
 *   node tools/sposta-funzioni.js sposta <origine> <destinazione> nome1 nome2 ...
 *       sposta le funzioni nominate in fondo a <destinazione> (che deve
 *       esistere), nell'ordine in cui compaiono in <origine>
 */
'use strict';

const fs = require('fs');
const ts = require('typescript');

function analizza(file) {
    const testo = fs.readFileSync(file, 'utf8');
    const sorgente = ts.createSourceFile(file, testo, ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
    return { testo, sorgente };
}

/** Inizio del blocco da spostare: il primo commento attaccato alla dichiarazione (niente righe vuote in mezzo), o la dichiarazione stessa. */
function inizioConCommenti(testo, nodo) {
    const commenti = ts.getLeadingCommentRanges(testo, nodo.pos) || [];
    let inizio = nodo.getStart();
    // Si risale dai commenti più vicini: ci si ferma alla prima riga vuota,
    // così un titolo di sezione staccato da una riga bianca resta dov'è.
    for (let i = commenti.length - 1; i >= 0; i--) {
        const fra = testo.slice(commenti[i].end, inizio);
        if (/\n\s*\n/.test(fra)) break;
        inizio = commenti[i].pos;
    }
    // Fino all'inizio della riga.
    while (inizio > 0 && testo[inizio - 1] !== '\n') inizio--;
    return inizio;
}

function elenca(file) {
    const { sorgente } = analizza(file);
    sorgente.statements.forEach((s) => {
        const riga = sorgente.getLineAndCharacterOfPosition(s.getStart()).line + 1;
        const tipo = ts.SyntaxKind[s.kind];
        const nome = s.name ? s.name.text : (s.declarationList ? s.declarationList.declarations.map((d) => d.name.getText()).join(',') : '');
        console.log(`${riga}\t${tipo}\t${nome}`);
    });
}

function sposta(origine, destinazione, nomi) {
    const { testo, sorgente } = analizza(origine);
    const eol = testo.includes('\r\n') ? '\r\n' : '\n';
    const trovate = [];
    sorgente.statements.forEach((s) => {
        // Funzioni per nome, e dichiarazioni di variabili (let/const/var di
        // primo livello) se UNO dei nomi dichiarati è fra quelli chiesti.
        let nome = null;
        if (s.kind === ts.SyntaxKind.FunctionDeclaration && s.name && nomi.includes(s.name.text)) nome = s.name.text;
        if (s.kind === ts.SyntaxKind.VariableStatement) {
            const dichiarati = s.declarationList.declarations.map((d) => d.name.getText());
            nome = dichiarati.find((n) => nomi.includes(n)) || null;
            if (nome && dichiarati.length > 1) {
                dichiarati.forEach((n) => { if (!nomi.includes(n)) throw new Error(`"${nome}" è dichiarato insieme a "${n}": vanno spostati insieme`); });
            }
        }
        if (!nome) return;
        let fine = s.getEnd();
        // Si porta via anche il fine riga che chiude la dichiarazione.
        if (testo.startsWith('\r\n', fine)) fine += 2; else if (testo[fine] === '\n') fine += 1;
        trovate.push({ nome, inizio: inizioConCommenti(testo, s), fine });
    });
    const mancanti = nomi.filter((n) => !trovate.some((t) => t.nome === n));
    if (mancanti.length) throw new Error('Funzioni non trovate in ' + origine + ': ' + mancanti.join(', '));
    // Blocchi spostati nell'ordine originale, separati da una riga vuota.
    const blocchi = trovate.map((t) => testo.slice(t.inizio, t.fine).replace(/\s+$/, ''));
    // Rimozione dall'origine dal fondo, così gli indici restano validi.
    let nuovaOrigine = testo;
    trovate.slice().sort((a, b) => b.inizio - a.inizio).forEach((t) => {
        let fine = t.fine;
        // Una riga vuota rimasta orfana dopo il blocco se ne va con lui.
        if (nuovaOrigine.startsWith(eol, fine) && (t.inizio === 0 || nuovaOrigine.slice(t.inizio - eol.length * 2, t.inizio) === eol + eol)) fine += eol.length;
        nuovaOrigine = nuovaOrigine.slice(0, t.inizio) + nuovaOrigine.slice(fine);
    });
    const dest = fs.readFileSync(destinazione, 'utf8');
    const eolDest = dest.includes('\r\n') ? '\r\n' : '\n';
    const aggiunta = blocchi.map((b) => b.split(/\r?\n/).join(eolDest)).join(eolDest + eolDest);
    fs.writeFileSync(destinazione, dest.replace(/\s*$/, '') + eolDest + eolDest + aggiunta + eolDest);
    fs.writeFileSync(origine, nuovaOrigine);
    console.log(`Spostate ${trovate.length} funzioni da ${origine} a ${destinazione}: ${trovate.map((t) => t.nome).join(', ')}`);
}

const [cmd, a, b, ...resto] = process.argv.slice(2);
if (cmd === 'elenca' && a) elenca(a);
else if (cmd === 'sposta' && a && b && resto.length) sposta(a, b, resto);
else { console.error('Uso: elenca <file> | sposta <origine> <destinazione> nome1 nome2 ...'); process.exit(1); }
