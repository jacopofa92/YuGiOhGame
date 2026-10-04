#!/usr/bin/env node
/**
 * pre-commit.js — controlli veloci PRIMA di ogni commit.
 * =====================================================================
 * Lanciato dall'hook `.githooks/pre-commit` (attivato una volta per clone
 * con `npm run hooks`, che imposta `core.hooksPath`). Guarda solo ciò che
 * sta per entrare nel commit (l'area di stage), e in pochi secondi.
 *
 * Perché esiste: due guasti veri di questo progetto si sarebbero fermati
 * qui invece di arrivare nel repository.
 *  1. Un errore di sintassi in un .js rompe l'intero file e ogni pagina che
 *     lo carica; la suite impiega minuti per dirlo, con messaggi criptici.
 *  2. Uno script PowerShell che legge in ANSI e riscrive in UTF-8 ha
 *     corrotto ogni accento di sei file (ogni "è" diventato una A con la
 *     tilde seguita da un simbolo). Vedi CLAUDE.md, voce su `Get-Content -Raw`.
 *
 * Controlli, tutti sui soli file in stage:
 *  - sintassi dei .js (`node --check` sul contenuto IN STAGE, non su quello
 *    su disco: è il primo che finisce nel commit);
 *  - accenti corrotti nelle righe AGGIUNTE (non nei file interi: la
 *    documentazione cita apposta questi pattern per spiegarli). Una riga
 *    nuova che deve citarli davvero porta il marcatore [ok-accenti];
 *  - BOM UTF-8 in testa a un file di testo (il progetto non ne usa; un BOM
 *    nuovo è quasi sempre il segno di uno script che ha riscritto il file);
 *  - data/cards.json modificato senza rigenerare js/data/cards-data.generated.js,
 *    che è il file che il gioco carica davvero;
 *  - gruppi di <script> delle pagine (e di sw.js) non allineati alla lista
 *    unica scripts/gruppi-script.js.
 *
 * In caso di problema spiega cosa e dove, ed esce con 1 (commit fermato).
 */
'use strict';

const { execFileSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

const ESTENSIONI_TESTO = new Set(['.js', '.html', '.css', '.json', '.md', '.yml', '.yaml', '.txt', '.sql']);
// Un testo UTF-8 letto come Windows-1252 e riscritto produce coppie fisse:
// una lettera accentata diventa U+00C3 seguito da un carattere fra U+0080 e
// U+00BF; un apostrofo tipografico diventa U+00E2 U+20AC piu' un altro
// simbolo; uno spazio non separabile diventa U+00C2 piu' un carattere alto.
// In un testo italiano normale quelle lettere non sono mai seguite da quei
// caratteri. La regex si costruisce dai codici numerici apposta: scritta
// con i caratteri veri, questo stesso file conterrebbe cio' che cerca.
const C = (n) => String.fromCharCode(n);
const ACCENTO_CORROTTO = new RegExp(
    C(0xC3) + '[' + C(0x80) + '-' + C(0xBF) + ']'
    + '|' + C(0xE2) + C(0x20AC) + '[' + C(0x80) + '-' + C(0xBF) + C(0x2018) + '-' + C(0x203A) + ']'
    + '|' + C(0xC2) + '[' + C(0xA0) + '-' + C(0xBF) + ']'
);
const MARCATORE_OK = '[ok-accenti]';

// Dentro l'hook git mette se stesso nel PATH, quindi 'git' basta. Lanciato a
// mano (`npm run precommit`) su un PC dove git è un'installazione portatile
// fuori dal PATH, si indica l'eseguibile con la variabile GIT_BIN.
const GIT = process.env.GIT_BIN || 'git';

function git(args, opzioni) {
    try {
        return execFileSync(GIT, args, Object.assign({ encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 }, opzioni));
    } catch (e) {
        if (e.code === 'ENOENT') {
            console.error(`Non trovo git ("${GIT}"). Lancia il controllo con un commit (dall'hook git è sempre nel PATH) oppure imposta GIT_BIN col percorso di git.exe.`);
            process.exit(1);
        }
        throw e;
    }
}

function contenutoInStage(file) {
    return git(['show', ':' + file], { encoding: 'buffer' });
}

const problemi = [];
const inStage = git(['diff', '--cached', '--name-only', '--diff-filter=ACM', '-z'])
    .split('\0').filter(Boolean);

// --- 1. Sintassi dei .js -------------------------------------------------
const cartellaTmp = fs.mkdtempSync(path.join(os.tmpdir(), 'ygo-precommit-'));
try {
    inStage.filter((f) => f.endsWith('.js') && !f.includes('node_modules/') && !f.includes('/vendor/')).forEach((file) => {
        const tmp = path.join(cartellaTmp, file.replace(/[\\/]/g, '__'));
        fs.writeFileSync(tmp, contenutoInStage(file));
        try {
            execFileSync(process.execPath, ['--check', tmp], { stdio: 'pipe' });
        } catch (e) {
            // Solo le righe utili: posizione, riga incriminata, segno ^ e
            // messaggio — non le righe vuote né lo stack interno di Node.
            const dettaglio = String(e.stderr || e.message).split(tmp).join(file).split('\n')
                .filter((r) => r.trim() && !/^\s+at /.test(r) && !/^Node\.js v/.test(r))
                .slice(0, 5).join('\n    ');
            problemi.push(`Errore di sintassi in ${file}:\n    ${dettaglio}`);
        }
    });
} finally {
    fs.rmSync(cartellaTmp, { recursive: true, force: true });
}

// --- 2. Accenti corrotti nelle righe aggiunte ------------------------------
const testuali = inStage.filter((f) => ESTENSIONI_TESTO.has(path.extname(f).toLowerCase()));
if (testuali.length) {
    let file = null;
    let riga = 0;
    git(['diff', '--cached', '-U0', '--no-color', '--', ...testuali]).split('\n').forEach((l) => {
        if (l.startsWith('+++ ')) { file = l.slice(6); return; }
        const intestazione = l.match(/^@@ -\d+(?:,\d+)? \+(\d+)/);
        if (intestazione) { riga = Number(intestazione[1]); return; }
        if (l.startsWith('+')) {
            if (ACCENTO_CORROTTO.test(l) && !l.includes(MARCATORE_OK)) {
                problemi.push(`Accenti corrotti in ${file}:${riga} → ${l.slice(1).trim().slice(0, 90)}\n    (un file UTF-8 letto in ANSI e riscritto: vedi CLAUDE.md, voce su Get-Content -Raw)`);
            }
            riga++;
        }
    });
}

// --- 3. BOM in testa ai file di testo -------------------------------------
testuali.forEach((f) => {
    const b = contenutoInStage(f);
    if (b.length >= 3 && b[0] === 0xEF && b[1] === 0xBB && b[2] === 0xBF) {
        problemi.push(`${f} comincia con un BOM UTF-8: il progetto non li usa (di solito lo aggiunge Set-Content/Out-File di PowerShell).`);
    }
});

// --- 4. cards.json modificato senza rigenerare il file caricato dal gioco ---
if (inStage.includes('data/cards.json') && !inStage.includes('js/data/cards-data.generated.js')) {
    problemi.push('data/cards.json è in stage ma js/data/cards-data.generated.js no: lancia `node scripts/build-cards-data.js` e aggiungilo, o il gioco continua a caricare i dati vecchi.');
}

// --- 5. Gruppi di <script> allineati a scripts/gruppi-script.js ------------
// Solo se il commit tocca una pagina, sw.js o la lista stessa. Il confronto
// si fa sul contenuto IN STAGE di quei file (per gli altri, quello su disco).
const toccaGruppi = inStage.some((f) => f.endsWith('.html') || f === 'sw.js' || f === 'scripts/gruppi-script.js');
if (toccaGruppi) {
    const { riscrivi, fileCandidati } = require('./sync-script-groups');
    fileCandidati().forEach((assoluto) => {
        const relativo = path.relative(path.join(__dirname, '..'), assoluto).split(path.sep).join('/');
        const testo = inStage.includes(relativo) ? contenutoInStage(relativo).toString('utf8') : fs.readFileSync(assoluto, 'utf8');
        const r = riscrivi(testo, relativo);
        r.errori.forEach((e) => problemi.push(e));
        if (r.testo !== testo) {
            problemi.push(`${relativo}: i gruppi di <script> (${r.zone.join(', ')}) non sono allineati a scripts/gruppi-script.js — lancia \`node scripts/sync-script-groups.js\` e aggiungi il file.`);
        }
    });
}

if (problemi.length) {
    console.error('\n✋ Commit fermato dai controlli pre-commit:\n');
    problemi.forEach((p) => console.error(' - ' + p + '\n'));
    process.exit(1);
}
console.log(`✓ Controlli pre-commit passati (${inStage.length} file in stage).`);
