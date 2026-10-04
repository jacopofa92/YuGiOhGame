// Catalogo delle musiche da duello (js/data/arena-options.js, TRACKS):
// sono selezionabili SOLO le tracce di audio/soundtracks/ che iniziano con
// 30-43 o 57 (scelta dell'utente), tutte, e ognuna ha un nome visibile —
// quello scritto nel catalogo o, se vuoto, il nome del file senza
// estensione. Analisi statica: nessun duello coinvolto.
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const NUMERI_AMMESSI = [30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 40, 41, 42, 43, 57];

module.exports = {
    name: 'Catalogo musiche da duello: solo 30-43 e 57, con nome visibile',
    async run(t) {
        const radice = path.join(__dirname, '..', '..');
        const sandbox = { window: {} };
        vm.runInNewContext(fs.readFileSync(path.join(radice, 'js/data/arena-options.js'), 'utf8'), sandbox);
        const tracce = sandbox.window.ArenaOptions.TRACKS;
        const cartella = path.join(radice, 'audio/soundtracks');
        const numero = (file) => parseInt(file, 10);

        const fuori = tracce.filter((tr) => !NUMERI_AMMESSI.includes(numero(tr.file)));
        t.assert(fuori.length === 0, `Solo tracce 30-43 e 57 (fuori elenco: ${fuori.map((x) => x.file)})`);

        const attese = fs.readdirSync(cartella).filter((f) => /\.mp3$/i.test(f) && NUMERI_AMMESSI.includes(numero(f)));
        const mancanti = attese.filter((f) => !tracce.some((tr) => tr.file === f));
        t.assert(mancanti.length === 0, `Ogni traccia ammessa è selezionabile (mancano: ${mancanti})`);

        const inesistenti = tracce.filter((tr) => !fs.existsSync(path.join(cartella, tr.file)));
        t.assert(inesistenti.length === 0, `Ogni traccia del catalogo esiste su disco (${inesistenti.map((x) => x.file)})`);

        const senzaNome = tracce.filter((tr) => !tr.nome || !tr.nome.trim());
        t.assert(senzaNome.length === 0, `Ogni traccia ha un nome visibile (${senzaNome.map((x) => x.file)})`);

        const free = tracce.find((tr) => tr.file === '39. Free Duel.mp3');
        t.assert(free && free.nome === '39. Free Duel', `Senza nome scritto, si mostra il nome del file senza estensione (${free && free.nome})`);
        t.assert(sandbox.window.ArenaOptions.nomeTraccia('39. Free Duel.mp3') === '39. Free Duel', 'nomeTraccia usa lo stesso nome visibile');
    }
};
