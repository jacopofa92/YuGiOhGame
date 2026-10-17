// Ogni campo (arena) e ogni musica che i cataloghi di Storia, personaggi e
// modalità nominano deve ESISTERE, scritto esattamente come il file: il sito
// gira su un server Linux (Cloudflare), dove "Egyptian duel.mp3" e
// "Egyptian Duel.mp3" sono due file diversi, mentre su Windows no — un
// errore di maiuscole qui si vede solo dopo la pubblicazione.
// E ogni duello della Storia deve poter risolvere sia un campo sia una
// musica (da tappa, capitolo, campagna o tema dell'avversario): senza, il
// duello ricade sul brano di ripiego e sull'arena di default, come
// succedeva ai duelli di Freedom prima di `musicaDuello`.
//
// Analisi statica, nessun browser. I cataloghi si caricano in una sandbox
// di Node (sono script globali senza dipendenze).
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const RADICE = path.join(__dirname, '..', '..');
const leggi = (rel) => fs.readFileSync(path.join(RADICE, rel), 'utf8');

/** Tutti i file sotto una cartella, come percorsi relativi con "/" (confronto ESATTO). */
function elenca(rel) {
    const out = new Set();
    (function giro(dir, prefisso) {
        for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
            if (e.isDirectory()) giro(path.join(dir, e.name), prefisso + e.name + '/');
            else out.add(prefisso + e.name);
        }
    })(path.join(RADICE, rel), '');
    return out;
}

module.exports = {
    name: 'Campi e musiche nominati dalla Storia e dai tornei esistono (maiuscole comprese)',
    async run(t) {
        const campi = elenca('images/fields');
        const campiMobile = elenca('images/fields/mobile');
        const musiche = elenca('audio/soundtracks');
        const problemi = [];
        const controllaCampo = (v, dove) => [].concat(v).forEach((x) => {
            const nome = String(x).split('/').pop();
            if (!campi.has(nome)) problemi.push(`campo "${x}" non esiste (${dove})`);
            else if (!campiMobile.has(nome)) problemi.push(`campo "${nome}" senza versione mobile (${dove})`);
        });
        const controllaMusica = (v, dove) => [].concat(v).forEach((x) => {
            if (!musiche.has(String(x))) problemi.push(`musica "${x}" non esiste in audio/soundtracks (${dove})`);
        });

        // --- I cataloghi, caricati in una sandbox ---
        const ctx = { window: {}, console, document: {}, localStorage: { getItem() { return null; } }, navigator: {} };
        ctx.globalThis = ctx;
        vm.createContext(ctx);
        ['js/data/characters-db.js', 'js/data/story-campaigns.js', 'js/data/story-ritocchi.js', 'js/data/torre-db.js', 'js/data/rivincite-db.js']
            .forEach((f) => { if (fs.existsSync(path.join(RADICE, f))) vm.runInContext(leggi(f), ctx, { filename: f }); });
        const prendi = (n) => vm.runInContext(`typeof ${n} !== 'undefined' ? ${n} : null`, ctx);
        const campagne = prendi('storyCampaignsDatabase') || [];
        const personaggi = prendi('characterDatabase') || [];

        const CHIAVI_CAMPO = new Set(['field', 'campoDuello']);
        const CHIAVI_MUSICA = new Set(['music', 'musicaDuello', 'musica', 'duelTrack']);
        const visti = new Set();
        (function cammina(o, dove) {
            if (!o || typeof o !== 'object' || visti.has(o)) return;
            visti.add(o);
            if (Array.isArray(o)) { o.forEach((x, i) => cammina(x, dove + '[' + ((x && x.id) || i) + ']')); return; }
            for (const [k, v] of Object.entries(o)) {
                const qui = dove + (o.id ? `(${o.id})` : '') + '.' + k;
                if (CHIAVI_CAMPO.has(k) && (typeof v === 'string' || Array.isArray(v))) controllaCampo(v, qui);
                else if (CHIAVI_MUSICA.has(k) && (typeof v === 'string' || Array.isArray(v))) controllaMusica(v, qui);
                else if (v && typeof v === 'object') cammina(v, qui);
            }
        })({ campagne, personaggi, torre: prendi('torreDatabase') || prendi('TORRE_DB'), rivincite: prendi('rivinciteDatabase') || prendi('RIVINCITE_DB') }, 'catalogo');

        // --- Le liste di scelta (Duello Libero, Multiplayer, Editor Mappa) ---
        [...leggi('js/data/arena-options.js').matchAll(/file:\s*'((?:[^'\\]|\\.)*)'/g)]
            .map((m) => m[1].replace(/\\'/g, "'"))
            .forEach((f) => {
                if (/\.mp3$/i.test(f)) controllaMusica(f, 'arena-options');
                else controllaCampo(f, 'arena-options');
            });

        // --- Le tracce scritte nelle pagine dei tornei e nei dati ---
        const reMp3 = /(['"])((?:\\.|(?!\1)[^\\\n])*\.mp3)\1/g;
        const sorgenti = fs.readdirSync(RADICE).filter((f) => /^(torneo|tornei).*\.html$/.test(f))
            .concat(fs.readdirSync(path.join(RADICE, 'js/data')).filter((f) => f.endsWith('.js') && !/cards-data|cards-db/.test(f)).map((f) => 'js/data/' + f));
        sorgenti.forEach((rel) => {
            let m;
            const testo = leggi(rel);
            while ((m = reMp3.exec(testo))) {
                const nome = m[2].replace(/\\'/g, "'");
                if (/^(audio|https?:|\$\{)/.test(nome) || nome.includes('${')) continue;
                // Un brano può stare in audio/soundtracks (tornei) o in audio/standard.
                if (!musiche.has(nome) && !fs.existsSync(path.join(RADICE, 'audio/standard', nome))) {
                    problemi.push(`musica "${nome}" non esiste (${rel})`);
                }
            }
        });

        // --- Ogni duello della Storia risolve un campo e una musica ---
        function duelli(nodo, ereditato, percorso, out) {
            if (!nodo || typeof nodo !== 'object') return;
            if (Array.isArray(nodo)) { nodo.forEach((n) => duelli(n, ereditato, percorso, out)); return; }
            const e = { campo: nodo.field || ereditato.campo, musica: nodo.music || ereditato.musica };
            if (nodo.kind === 'duel' || (nodo.characterId && nodo.kind !== 'scene')) out.push({ id: nodo.id, char: nodo.characterId, ...e });
            ['tappe', 'capitoli', 'prove'].forEach((k) => { if (nodo[k]) duelli(nodo[k], e, percorso + '>' + (nodo.id || k), out); });
        }
        campagne.forEach((c) => {
            const lista = [];
            duelli(c.capitoli || c.tappe || [], { campo: c.campoDuello, musica: c.musicaDuello }, c.id, lista);
            lista.forEach((d) => {
                const p = personaggi.find((x) => x.id === d.char);
                const conTema = p && p.duelTrack && (p.duelTrackAutomatico || p.duelTrackSempre);
                if (!d.campo) problemi.push(`duello ${d.id} (${c.id}) senza campo: né suo, né del capitolo, né della campagna`);
                if (!d.musica && !conTema) problemi.push(`duello ${d.id} (${c.id}, ${d.char}) senza musica: né sua, né del capitolo, né della campagna, né un tema dell'avversario`);
            });
        });

        t.assert(problemi.length === 0, `Campi/musiche da correggere (${problemi.length}): ${problemi.slice(0, 6).join(' | ')}`);
    }
};
