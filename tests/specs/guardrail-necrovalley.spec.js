// Guardrail statico (nessun duello): ogni carta che toglie una carta dal
// Cimitero scrivendolo a mano (`grave.splice(...)`) deve far passare
// Necrovalley (id 890: "nega ogni effetto che sposterebbe una carta nel
// Cimitero in un posto diverso").
//
// Prima di questo controllo, uno splice scritto a mano sfuggiva sempre a
// Necrovalley, e la sua nota in cards.json lo ammetteva. Il censimento
// (1.0.35) ha trovato 28 punti, sistemati con ACTIONS.graveyardMoveNegated.
// Questo test impedisce che una carta nuova, scritta copiando una vecchia,
// riapra il buco senza che nessuno se ne accorga.
//
// Uno splice è a posto se:
//  - nelle righe PRIMA c'è `graveyardMoveNegated` (il controllo vero);
//  - oppure nelle righe DOPO la carta finisce in un passaggio che controlla
//    Necrovalley da sé: specialSummon (fromZone 'graveyard'), oppure
//    reviveFromGraveyardWithCountdown (controllato al momento della
//    rinascita, processDelayedGraveyardRevivals);
//  - oppure è nell'elenco chiuso qui sotto, ognuno col suo motivo.
const fs = require('fs');
const path = require('path');

const RADICE = path.resolve(__dirname, '..', '..');
const FILE = fs.readdirSync(path.join(RADICE, 'js', 'engine'))
    .filter((f) => /^card-effects.*\.js$|^game-flow\.js$/.test(f))
    .map((f) => path.join('js', 'engine', f));

// "file: testo della riga" → perché non serve il controllo.
const ECCEZIONI = {
    'removeNegatedCardFromCurrentZone': 'parte della risoluzione di una negazione in Catena: la carta negata non è "nel Cimitero" per le regole, ci passa solo mentre questo motore risolve',
    'cimiteroBloccato': 'Barattolo di Fibra: lo splice è già dentro il ramo che controlla Necrovalley',
    'register(849': 'Roccaforte la Fortezza Mobile: Trappola ATTIVATA che diventa mostro (fromZone \'field\'), non una carta che lascia il Cimitero — il motore la parcheggia lì solo mentre si risolve'
};

// splice, ma anche pop/shift: Ritorno dei Dannati (418) riprendeva l'ultima
// carta del Cimitero con un pop() che il primo censimento non vedeva.
const SPLICE = /(graveyard\([^)]*\)|grave|Graveyard|gy)\.(splice|pop|shift)\(/;
const RIGHE_PRIMA = 30;
const RIGHE_DOPO = 12;

module.exports = {
    name: 'Guardrail: ogni spostamento dal Cimitero scritto a mano passa da Necrovalley',
    standalone: true,
    async run(t) {
        const scoperti = [];
        let totali = 0;
        for (const rel of FILE) {
            const righe = fs.readFileSync(path.join(RADICE, rel), 'utf8').split(/\r?\n/);
            righe.forEach((r, i) => {
                if (!SPLICE.test(r)) return;
                if (/^\s*(\/\/|\*)/.test(r)) return; // commento
                totali++;
                const prima = righe.slice(Math.max(0, i - RIGHE_PRIMA), i + 1).join('\n');
                const dopo = righe.slice(i, i + RIGHE_DOPO).join('\n');
                if (/graveyardMoveNegated/.test(prima)) return;
                if (/specialSummon\(/.test(dopo)) return;
                if (/reviveFromGraveyardWithCountdown\(/.test(dopo)) return;
                if (Object.keys(ECCEZIONI).some((k) => prima.includes(k) || r.includes(k))) return;
                scoperti.push(`${rel}:${i + 1}  ${r.trim()}`);
            });
        }
        t.assert(totali > 20, `Il guardrail deve trovare gli splice dal Cimitero (ne ha trovati ${totali}): se sono spariti tutti, è cambiato il modo di scriverli e il test va aggiornato`);
        t.assert(scoperti.length === 0,
            `Spostamenti dal Cimitero che Necrovalley non vede — aggiungere \`if (ctx.graveyardMoveNegated(<chi>)) return;\` prima dello splice:\n  ${scoperti.join('\n  ')}`);
    }
};
