// Guardrail statico sulla divisione di card-effects.js in più file.
// =====================================================================
// PERCHÉ ESISTE. Gli effetti delle carte vivevano in un unico file da
// 23.800 righe, ora divisi in js/engine/card-effects.js (gli helper
// usati da gruppi di carte lontani fra loro) più card-effects-1..8.js
// (solo blocchi register). La divisione introduce due modi nuovi di
// rompere tutto in silenzio, e questo test li chiude entrambi:
//
//  1) una carta nuova in una parte chiama un helper condiviso che QUELLA
//     parte non ha nella propria riga di import. Non è un errore di
//     sintassi e non si vede al caricamento: salta fuori come
//     ReferenceError solo quando quella carta viene davvero giocata,
//     magari fra mesi;
//  2) una pagina carica il file condiviso ma dimentica una delle parti:
//     ~100 carte diventano mute, sempre in silenzio.
//
// È un'analisi del sorgente, nessun duello coinvolto: costa pochi ms.
const fs = require('fs');
const path = require('path');

const RADICE = path.join(__dirname, '..', '..');
const DIR_MOTORE = path.join(RADICE, 'js', 'engine');
const CONDIVISO = 'js/engine/card-effects.js';

/** I nomi dichiarati al primo livello dentro l'IIFE di un file (4 spazi). */
function dichiarati(testo) {
    const fuori = new Set();
    testo.split(/\r?\n/).forEach((l) => {
        const m = l.match(/^    (?:function ([A-Za-z0-9_$]+)|const ([A-Za-z0-9_$]+)\s*=|let ([A-Za-z0-9_$]+)\s*=|var ([A-Za-z0-9_$]+)\s*=)/);
        if (m) fuori.add(m[1] || m[2] || m[3] || m[4]);
    });
    return fuori;
}

const perNome = (n) => n.replace(/\$/g, '\\$');

module.exports = {
    name: 'Guardrail: le parti di card-effects vedono tutto quello che usano',
    async run(t) {
        const parti = fs.readdirSync(DIR_MOTORE)
            .filter((f) => /^card-effects-\d+\.js$/.test(f))
            .sort((a, b) => Number(a.match(/\d+/)[0]) - Number(b.match(/\d+/)[0]));
        t.assert(parti.length >= 2,
            `Preparazione: attese più parti di card-effects, trovate ${parti.length}`);

        const testoCondiviso = fs.readFileSync(path.join(DIR_MOTORE, 'card-effects.js'), 'utf8');
        const helperCondivisi = dichiarati(testoCondiviso);

        // Ciò che il file condiviso DICHIARA e ciò che ESPORTA devono
        // coincidere: un helper dichiarato e non esportato è invisibile
        // a tutti, uno esportato e non dichiarato è undefined.
        const esportati = new Set(((testoCondiviso.match(/window\.CardEffectsShared = \{([^}]*)\}/) || [, ''])[1])
            .split(',').map((s) => s.trim()).filter(Boolean));
        const nonEsportati = [...helperCondivisi].filter((n) => !esportati.has(n));
        const fantasma = [...esportati].filter((n) => !helperCondivisi.has(n));
        t.assert(nonEsportati.length === 0,
            `Helper dichiarati nel file condiviso ma non messi in window.CardEffectsShared: ${nonEsportati.join(', ')}`);
        t.assert(fantasma.length === 0,
            `Nomi esportati da window.CardEffectsShared che nessuno dichiara: ${fantasma.join(', ')}`);

        // L'universo dei nomi di primo livello: i condivisi più i locali
        // di ogni parte.
        const localiPerParte = {};
        const universo = new Set(helperCondivisi);
        parti.forEach((f) => {
            const locali = dichiarati(fs.readFileSync(path.join(DIR_MOTORE, f), 'utf8'));
            localiPerParte[f] = locali;
            locali.forEach((n) => universo.add(n));
        });

        const problemi = [];
        parti.forEach((f) => {
            const testo = fs.readFileSync(path.join(DIR_MOTORE, f), 'utf8');
            const importati = new Set(((testo.match(/const \{([^}]*)\} = window\.CardEffectsShared/) || [, ''])[1])
                .split(',').map((s) => s.trim()).filter(Boolean));
            const visibili = new Set([...importati, ...localiPerParte[f]]);
            // La riga di import va esclusa dal corpo, o conterebbe come uso.
            const corpo = testo.split(/\r?\n/)
                .filter((l) => !/= window\.CardEffectsShared/.test(l)).join('\n');
            [...universo].forEach((n) => {
                if (visibili.has(n)) return;
                // Solo le CHIAMATE: un nome che compare in un commento non
                // è un riferimento da risolvere.
                if (new RegExp(`\\b${perNome(n)}\\s*\\(`).test(corpo)) {
                    problemi.push(`${f} chiama ${n}() ma non lo dichiara né lo importa`);
                }
            });
            const importatiFantasma = [...importati].filter((n) => !helperCondivisi.has(n));
            if (importatiFantasma.length) {
                problemi.push(`${f} importa nomi che il file condiviso non ha: ${importatiFantasma.join(', ')}`);
            }
        });

        // Il file condiviso non può dipendere da qualcosa che vive in una
        // parte: viene caricato PRIMA di tutte.
        const localiOvunque = new Set();
        Object.values(localiPerParte).forEach((s) => s.forEach((n) => localiOvunque.add(n)));
        [...localiOvunque].forEach((n) => {
            if (helperCondivisi.has(n)) return;
            if (new RegExp(`\\b${perNome(n)}\\s*\\(`).test(testoCondiviso)) {
                problemi.push(`card-effects.js (condiviso) chiama ${n}(), che però vive dentro una parte caricata dopo`);
            }
        });

        t.assert(problemi.length === 0,
            `Riferimenti non risolvibili fra le parti di card-effects:\n  - ${problemi.join('\n  - ')}`);

        // --- Nessuna pagina può caricare il condiviso e dimenticare una parte ---
        const pagine = fs.readdirSync(RADICE).filter((f) => f.endsWith('.html'));
        const dimenticate = [];
        pagine.forEach((nome) => {
            const html = fs.readFileSync(path.join(RADICE, nome), 'utf8');
            if (!html.includes(CONDIVISO)) return;
            parti.forEach((f) => {
                if (!html.includes(`js/engine/${f}`)) dimenticate.push(`${nome} non carica ${f}`);
            });
        });
        t.assert(dimenticate.length === 0,
            `Pagine che caricano gli helper condivisi ma non tutte le parti (quelle carte resterebbero mute):\n  - ${dimenticate.join('\n  - ')}`);
    }
};
