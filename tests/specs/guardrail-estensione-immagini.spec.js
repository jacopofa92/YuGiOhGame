// Tutte le foto del gioco hanno estensione .jpg: mai .jpeg. Prima convivevano
// (carte e mappe in .jpeg, personaggi/arene in .jpg) e ogni file nuovo
// obbligava a ricordarsi quale delle due usare nel punto giusto del codice.
//
// Analisi statica, nessun browser. Tre regole:
//   1) nessun file .jpeg (né maiuscolo) sotto images/;
//   2) nessun riferimento testuale a un nome file .jpeg nel codice;
//   3) ogni riferimento letterale `images/....jpg` punta a un file che
//      esiste — tranne una lista CHIUSA di file opzionali, voluti assenti
//      (il gioco ricade su un ripiego se mancano). Un riferimento nuovo
//      che non è né un file vero né in quella lista è quasi certamente un
//      errore di battitura nel nome o nell'estensione.
const fs = require('fs');
const path = require('path');

const RADICE = path.join(__dirname, '..', '..');
const SALTA = /(^|\/)(node_modules|\.git|android|vendor)(\/|$)|package-lock/;

// File che il codice nomina ma che possono non esistere: ognuno ha un
// ripiego dichiarato accanto al punto d'uso.
const OPZIONALI = new Set([
    'images/cards/backCard.jpg', 'images/cards/backPilaCards.jpg', // dorso carta/mazzo: sostituiscono la cornice CSS se presenti
    'images/maps/storia_torneo_kaiba_1.jpg', 'images/maps/storia_ww1_1.jpg', 'images/maps/storia_ww2_1.jpg', // mappe delle storie ancora da disegnare
    'images/maps/regno_dei_duellanti_castello_pegasus.jpg', // candidato di una lista: i successivi esistono
    'images/characters/bakura.jpg', 'images/story/ww1.jpg', 'images/fields/torreKaiba.jpg', // candidati di ripiego
    'images/fields/mobile/x.jpg' // esempio nel testo di CLAUDE.md
]);
const SOLO_NEI_TEST = /^images\/(characters\/__non_esiste__|fields\/mobile\/(campoProva|campoSostituito|dalPulsanteSalva))\.jpg$/;

function cammina(dir, f) {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
        const p = path.join(dir, e.name);
        const rel = path.relative(RADICE, p).replace(/\\/g, '/');
        if (SALTA.test(rel)) continue;
        if (e.isDirectory()) cammina(p, f); else f(p, rel, e.name);
    }
}

module.exports = {
    standalone: true,
    name: 'Guardrail: immagini sempre .jpg, e ogni riferimento a images/ punta a un file vero',
    async run(t) {
        const fuori = [];
        cammina(path.join(RADICE, 'images'), (p, rel, nome) => {
            if (/\.jpe?g$/i.test(nome) && !/\.jpg$/.test(nome)) fuori.push(rel);
        });
        t.assert(fuori.length === 0, `Sotto images/ ci devono essere solo .jpg minuscoli (${fuori.length} fuori regola, es. ${fuori.slice(0, 3).join(', ')})`);

        const jpeg = []; const inesistenti = {};
        cammina(RADICE, (p, rel, nome) => {
            if (!/\.(js|html|css|md|json|yml|xml)$/.test(nome)) return;
            if (rel === 'tests/specs/guardrail-estensione-immagini.spec.js' || rel.endsWith('local-servers.js')) return;
            const testo = fs.readFileSync(p, 'utf8');
            // Solo un NOME FILE (un carattere di nome/segnaposto subito prima
            // del punto): la parola ".jpeg" in una frase, per spiegare la
            // storia di questa regola, non è un riferimento a un file.
            if (/[A-Za-z0-9_\->}]\.jpeg\b/.test(testo)) jpeg.push(rel);
            const re = /images\/[A-Za-z0-9_\-./]+\.jpg\b/g;
            let m;
            while ((m = re.exec(testo))) {
                if (fs.existsSync(path.join(RADICE, m[0]))) continue;
                if (OPZIONALI.has(m[0]) || SOLO_NEI_TEST.test(m[0])) continue;
                (inesistenti[m[0]] = inesistenti[m[0]] || new Set()).add(rel);
            }
        });
        t.assert(jpeg.length === 0, `Nessun file di testo deve nominare un .jpeg: ${jpeg.join(', ')}`);
        const elenco = Object.entries(inesistenti).map(([k, v]) => `${k} (in ${[...v].join(', ')})`);
        t.assert(elenco.length === 0, `Riferimenti a immagini che non esistono (errore di nome/estensione?): ${elenco.slice(0, 5).join(' | ')}`);
    }
};
