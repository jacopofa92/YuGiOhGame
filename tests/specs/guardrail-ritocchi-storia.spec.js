// Analisi statica, nessun duello coinvolto.
//
// Le modifiche dell'Editor Mappa vivono in js/data/story-ritocchi.js e le
// applica js/story/story-ritocchi.js. Una pagina che carica il catalogo
// delle storie (js/data/story-campaigns.js) senza quei due file non dà
// errore: vede semplicemente le storie SENZA le modifiche — il duello con
// l'arena e la musica vecchie, le Sfide con un numero di tappe sbagliato.
// Qui si controlla, per ogni pagina (comprese quelle che verranno), che ci
// siano tutti e tre e in quest'ordine: catalogo, dati dei ritocchi,
// applicatore — l'applicatore legge gli altri due nel momento in cui gira.
const fs = require('fs');
const path = require('path');

const RADICE = path.join(__dirname, '..', '..');
const ORDINE = ['js/data/story-campaigns.js', 'js/data/story-ritocchi.js', 'js/story/story-ritocchi.js'];

module.exports = {
    name: 'Guardrail: ogni pagina col catalogo delle storie carica anche i ritocchi, nell\'ordine giusto',
    standalone: true,
    async run(t) {
        const problemi = [];
        let controllate = 0;
        fs.readdirSync(RADICE).filter((f) => f.endsWith('.html')).forEach((pagina) => {
            const html = fs.readFileSync(path.join(RADICE, pagina), 'utf8');
            // Tag statici e elenchi caricati al volo (index.html): conta la
            // prima comparsa del percorso fra virgolette.
            const posizione = (p) => {
                const m = html.match(new RegExp(`["']${p.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&')}["']`));
                return m ? m.index : -1;
            };
            if (posizione(ORDINE[0]) === -1) return;
            controllate++;
            const pos = ORDINE.map(posizione);
            const mancano = ORDINE.filter((p, i) => pos[i] === -1);
            if (mancano.length) { problemi.push(`${pagina}: carica il catalogo ma non ${mancano.join(' e ')}`); return; }
            if (!(pos[0] < pos[1] && pos[1] < pos[2])) problemi.push(`${pagina}: ordine sbagliato (serve ${ORDINE.join(' → ')})`);
        });
        // Erano 5 quando il controllo è nato (storia, duello, menu, sfide,
        // admin): la soglia serve solo a capire se ha smesso di leggere.
        t.assert(controllate >= 4, `attese almeno 4 pagine col catalogo, trovate ${controllate}: il controllo non legge più le pagine?`);
        t.assert(!problemi.length, problemi.join('\n'));
    }
};
