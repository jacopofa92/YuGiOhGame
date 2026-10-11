// @ts-check
/**
 * puzzles-db.js — I puzzle "Vinci in questo turno" (puzzle.html).
 * =====================================================================
 * Solo dati: ogni voce descrive una situazione di duello già pronta, e
 * js/modes/puzzle-mode.js la mette sul Terreno al posto della mano
 * iniziale. Il duello poi lo gioca il motore di sempre, senza sapere che
 * è un puzzle: si vince portando a zero i Life Point dell'avversario
 * prima di passare il turno.
 *
 * COME SI SCRIVE UN PUZZLE NUOVO (nessun codice da toccare):
 *   mano              id delle carte nella tua mano;
 *   mostri            i tuoi mostri: [id, 'attacco' | 'difesa' | 'coperto'];
 *   magieTrappole     le tue Magie/Trappole: [id, 'coperta' | 'scoperta'];
 *   cimitero, extra   il tuo Cimitero e il tuo Extra Deck;
 *   avversario        { mostri, magieTrappole, cimitero, mano } con le
 *                     stesse forme; le sue Trappole coperte le attiva
 *                     l'IA vera, quando può;
 *   lp / lpAvversario Life Point di partenza (8000 se assenti);
 *   pescata           la carta che peschi a inizio turno (Dian Keto, che
 *                     non infligge danni, se assente: così la pescata non
 *                     risolve mai un puzzle per caso);
 *   personaggio       chi si fa vedere come avversario (characters-db.js).
 *
 * Una regola per tenerli onesti: la soluzione deve essere UNA idea, e le
 * strade "ovvie" sbagliate devono restare corte di almeno un po' di LP.
 * Ogni puzzle di questo file ha la sua soluzione provata dallo spec
 * tests/specs/modalita-puzzle.spec.js: un puzzle nuovo va aggiunto anche
 * lì, o nessuno si accorgerebbe se smettesse di essere risolvibile.
 */
/** @type {PuzzleDef[]} Forma di ogni voce: types/modalita.d.ts. */
const puzzlesDatabase = [
    {
        id: 'ascia',
        titolo: 'Il primo colpo',
        emblema: '🪓',
        difficolta: 1,
        personaggio: 'bandit_keith',
        descrizione: 'L\'avversario ha il campo vuoto e 2700 Life Point. Ti basta un attacco ben armato… o due.',
        suggerimento: 'Un\'Equipaggiamento rende più forte un mostro, ma ti resta anche l\'Evocazione Normale del turno.',
        lpAvversario: 2700,
        mano: [618, 526],               // Ascia della Disperazione, Skull Servant
        mostri: [[4, 'attacco']],       // Guerriero Celtico
        avversario: {}
    },
    {
        id: 'fusione',
        titolo: 'Due mostri, una leggenda',
        emblema: '🌀',
        difficolta: 1,
        personaggio: 'rex',
        descrizione: 'Hai in mano due mostri troppo forti per essere evocati senza Tributi. L\'avversario ha 2600 Life Point.',
        suggerimento: 'Guarda il tuo Extra Deck: certi mostri non hanno bisogno di Tributi.',
        lpAvversario: 2600,
        mano: [14, 15, 38],             // Gaia il Cavaliere Feroce, Maledizione del Drago, Fusione
        extra: [254],                   // Gaia il Campione dei Draghi
        avversario: {}
    },
    {
        id: 'flip',
        titolo: 'La trappola con le zampe',
        emblema: '🐛',
        difficolta: 1,
        personaggio: 'weevil',
        descrizione: 'Un Drago Bianco Occhi Blu ti sbarra la strada, e all\'avversario restano 2350 Life Point.',
        suggerimento: 'Il tuo mostro coperto ha un effetto FLIP: scoprilo con un\'Evocazione Flip.',
        lpAvversario: 2350,
        mostri: [[23, 'coperto'], [24, 'attacco']],   // Insetto Divoratore, Elfi Gemelli
        avversario: {
            mostri: [[1, 'attacco']]                  // Drago Bianco Occhi Blu
        }
    },
    {
        id: 'cilindro',
        titolo: 'Occhio alla carta coperta',
        emblema: '🎩',
        difficolta: 2,
        personaggio: 'pegasus',
        descrizione: 'Il campo avversario è vuoto, se non fosse per una carta coperta. 2500 Life Point lo separano dalla sconfitta.',
        suggerimento: 'Attaccare alla cieca contro una Trappola coperta può costarti caro.',
        lpAvversario: 2500,
        mano: [607],                    // Tifone dello Spazio Mistico
        mostri: [[2, 'attacco']],       // Mago Nero
        avversario: {
            magieTrappole: [[10, 'coperta']]          // Cilindro Magico
        }
    },
    {
        id: 'cuore',
        titolo: 'Il cuore cambia',
        emblema: '💗',
        difficolta: 2,
        personaggio: 'kaiba',
        descrizione: 'Non hai mostri, l\'avversario ne ha due e 3000 Life Point. In mano hai due Magie fortissime.',
        suggerimento: 'L\'ordine in cui giochi le carte conta quanto le carte stesse.',
        lpAvversario: 3000,
        mano: [147, 409],               // Cambio di Cuore, Raigeki
        avversario: {
            mostri: [[1, 'attacco'], [24, 'attacco']] // Drago Bianco Occhi Blu, Elfi Gemelli
        }
    },
    {
        id: 'rinascita',
        titolo: 'Un drago in prestito',
        emblema: '♻️',
        difficolta: 2,
        personaggio: 'kaiba',
        descrizione: 'All\'avversario restano 3500 Life Point e un Guerriero Celtico. Nel tuo Cimitero riposa il Mago Nero.',
        suggerimento: 'Rinascita del Mostro non guarda solo nel tuo Cimitero.',
        lpAvversario: 3500,
        mano: [35],                     // Rinascita del Mostro
        mostri: [[24, 'attacco']],      // Elfi Gemelli
        cimitero: [2],                  // Mago Nero
        avversario: {
            mostri: [[4, 'attacco']],   // Guerriero Celtico
            cimitero: [1]               // Drago Bianco Occhi Blu
        }
    },
    {
        id: 'megamorfosi',
        titolo: 'Con le spalle al muro',
        emblema: '🔮',
        difficolta: 3,
        personaggio: 'marik',
        descrizione: 'Ti restano 1000 Life Point, all\'avversario 4000. Il tuo Mago Nero da solo non basta.',
        suggerimento: 'C\'è una carta che diventa più forte proprio quando sei in svantaggio.',
        lp: 1000,
        lpAvversario: 4000,
        mano: [631, 618],               // Megamorfosi, Ascia della Disperazione
        mostri: [[2, 'attacco']],       // Mago Nero
        avversario: {}
    },
    {
        id: 'tempesta',
        titolo: 'Specchi e cilindri',
        emblema: '🌪️',
        difficolta: 3,
        personaggio: 'mai',
        descrizione: 'Due carte coperte proteggono l\'avversario, che ha 3900 Life Point. Ti servono entrambi i tuoi attacchi.',
        suggerimento: 'Togliere una sola carta coperta non basta: l\'altra scatterebbe comunque.',
        lpAvversario: 3900,
        mano: [607, 646],               // Tifone dello Spazio Mistico, Tempesta Pesante
        mostri: [[2, 'attacco'], [4, 'attacco']],     // Mago Nero, Guerriero Celtico
        avversario: {
            magieTrappole: [[382, 'coperta'], [10, 'coperta']]   // Forza dello Specchio, Cilindro Magico
        }
    }
];

window.puzzlesDatabase = puzzlesDatabase;
