// Ogni colonna sonora nominata dal codice (audio/soundtracks/<nome>.mp3, o un
// nome di file nelle liste di musica) deve esistere davvero in
// audio/soundtracks/. Nato da una rinumerazione dei file: un nome vecchio
// rimasto in una pagina avrebbe fatto tacere quel menu senza alcun errore.
// Analisi statica, nessun browser.
const fs = require('fs');
const path = require('path');

const RADICE = path.join(__dirname, '..', '..');
const CARTELLA = path.join(RADICE, 'audio', 'soundtracks');
const SALTA = /(^|\/)(node_modules|\.git|android|vendor|tests)(\/|$)|package-lock|^CLAUDE\.md$|version\.js$|^sw\.js$/;

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
    name: 'Guardrail: ogni colonna sonora nominata nel codice esiste in audio/soundtracks/',
    async run(t) {
        const presenti = new Set(fs.readdirSync(CARTELLA).filter((n) => /\.mp3$/i.test(n)));

        // Le tracce senza numero non devono tornare: la numerazione è progressiva.
        const senzaNumero = [...presenti].filter((n) => !/^\d\d\. /.test(n));
        t.assert(senzaNumero.length === 0, `Le tracce di audio/soundtracks/ hanno un numero nel nome: senza numero ${senzaNumero.join(', ')}`);

        const mancanti = {};
        cammina(RADICE, (p, rel, nome) => {
            if (!/\.(js|html)$/.test(nome)) return;
            const testo = fs.readFileSync(p, 'utf8');
            // `audio/soundtracks/<nome>.mp3`, nel codice e nei link <preload>.
            const re = /audio\/soundtracks\/([^'"`$\n]+?\.mp3)/g;
            let m;
            while ((m = re.exec(testo))) {
                const nomeFile = m[1];
                if (nomeFile.includes('/')) continue; // sottocartelle (ww1/...): non sono tracce di questo elenco
                if (!presenti.has(nomeFile)) (mancanti[nomeFile] = mancanti[nomeFile] || new Set()).add(rel);
            }
        });

        // I file nominati dalle liste `{ file: '...mp3' }` e da `duelTrack`/`musica`.
        const elenchi = ['js/data/arena-options.js', 'js/data/characters-db.js', 'js/data/story-campaigns.js'];
        elenchi.forEach((rel) => {
            const testo = fs.readFileSync(path.join(RADICE, rel), 'utf8');
            const re = /(?:file|duelTrack|musica|music|musicaDuello)\s*:\s*(['"])([^'"\n]*?\.mp3)\1/g;
            let m;
            while ((m = re.exec(testo))) {
                // Le sottocartelle (ww1/...) sono brani della Storia che possono
                // ancora mancare (ripiego sulla musica della campagna): fuori da qui.
                if (m[2].includes('/')) continue;
                if (!presenti.has(m[2])) (mancanti[m[2]] = mancanti[m[2]] || new Set()).add(rel);
            }
        });

        const elenco = Object.entries(mancanti).map(([k, v]) => `${k} (in ${[...v].join(', ')})`);
        t.assert(elenco.length === 0, `Colonne sonore nominate ma assenti: ${elenco.slice(0, 6).join(' | ')}`);
    }
};
