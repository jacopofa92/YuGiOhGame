#!/usr/bin/env node
/**
 * sync-script-groups.js — riscrive nelle pagine i gruppi di <script>
 * dichiarati in scripts/gruppi-script.js.
 * =====================================================================
 * Uso:
 *   node scripts/sync-script-groups.js          riscrive i file
 *   node scripts/sync-script-groups.js --check  non scrive nulla: elenca le
 *                                               zone non allineate ed esce 1
 *
 * Tocca SOLO le righe fra i due marcatori di un gruppo (vedi l'intestazione
 * di gruppi-script.js): il resto del file resta byte per byte com'era,
 * fine riga compresa (CRLF o LF, quello che il file usa già). Le righe
 * generate prendono l'indentazione del marcatore di apertura.
 *
 * Due forme, riconosciute dal marcatore:
 *   <!-- gruppo-script:NOME -->  -> una riga <script src="..."></script> per file
 *   // gruppo-script:NOME        -> una riga 'percorso', per file (array JS)
 */
'use strict';

const fs = require('fs');
const path = require('path');

const RADICE = path.join(__dirname, '..');
const GRUPPI = require('./gruppi-script');

const APERTURA_HTML = /^(\s*)<!--\s*gruppo-script:([\w-]+)\s*-->\s*$/;
const CHIUSURA_HTML = /^\s*<!--\s*\/gruppo-script:([\w-]+)\s*-->\s*$/;
const APERTURA_JS = /^(\s*)\/\/\s*gruppo-script:([\w-]+)\s*$/;
const CHIUSURA_JS = /^\s*\/\/\s*\/gruppo-script:([\w-]+)\s*$/;

/** I file in cui cercare i marcatori: le pagine in radice più sw.js. */
function fileCandidati() {
    return fs.readdirSync(RADICE)
        .filter((f) => f.endsWith('.html') || f === 'sw.js')
        .map((f) => path.join(RADICE, f));
}

/**
 * Torna { testo, zone, errori } con il testo riscritto. `zone` elenca i
 * gruppi trovati (per il controllo), `errori` i marcatori non chiusi o i
 * gruppi sconosciuti.
 */
function riscrivi(testo, nomeFile) {
    const eol = testo.includes('\r\n') ? '\r\n' : '\n';
    const righe = testo.split(eol);
    const out = [];
    const zone = [];
    const errori = [];
    for (let i = 0; i < righe.length; i++) {
        const riga = righe[i];
        const html = riga.match(APERTURA_HTML);
        const js = riga.match(APERTURA_JS);
        if (!html && !js) { out.push(riga); continue; }
        const indent = (html || js)[1];
        const nome = (html || js)[2];
        const chiusura = html ? CHIUSURA_HTML : CHIUSURA_JS;
        let j = i + 1;
        while (j < righe.length && !(chiusura.test(righe[j]) && righe[j].match(chiusura)[1] === nome)) j++;
        if (j >= righe.length) {
            errori.push(`${nomeFile}: il gruppo "${nome}" si apre alla riga ${i + 1} ma non si chiude`);
            out.push(riga);
            continue;
        }
        const lista = GRUPPI[nome];
        if (!lista) {
            errori.push(`${nomeFile}: gruppo "${nome}" sconosciuto (non è in scripts/gruppi-script.js)`);
            for (let k = i; k <= j; k++) out.push(righe[k]);
            i = j;
            continue;
        }
        out.push(riga);
        lista.forEach((f) => out.push(html ? `${indent}<script src="${f}"></script>` : `${indent}'${f}',`));
        out.push(righe[j]);
        zone.push(nome);
        i = j;
    }
    return { testo: out.join(eol), zone, errori };
}

function main() {
    const soloControllo = process.argv.includes('--check');
    const nonAllineati = [];
    const errori = [];
    let zoneTotali = 0;
    fileCandidati().forEach((file) => {
        const prima = fs.readFileSync(file, 'utf8');
        const nome = path.basename(file);
        const r = riscrivi(prima, nome);
        errori.push(...r.errori);
        zoneTotali += r.zone.length;
        if (r.testo === prima) return;
        if (soloControllo) nonAllineati.push(`${nome} (${r.zone.join(', ')})`);
        else fs.writeFileSync(file, r.testo);
    });
    if (errori.length) {
        console.error('Marcatori dei gruppi di script non validi:\n  - ' + errori.join('\n  - '));
        process.exit(1);
    }
    if (soloControllo && nonAllineati.length) {
        console.error('Pagine non allineate a scripts/gruppi-script.js (lancia `node scripts/sync-script-groups.js`):\n  - ' + nonAllineati.join('\n  - '));
        process.exit(1);
    }
    console.log(soloControllo
        ? `✓ Gruppi di script allineati (${zoneTotali} zone).`
        : `✓ Gruppi di script riscritti (${zoneTotali} zone).`);
}

if (require.main === module) main();
module.exports = { riscrivi, fileCandidati };
