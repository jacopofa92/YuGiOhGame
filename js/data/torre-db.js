// @ts-check
/**
 * torre-db.js — La Torre dei Duellanti (torre.html): i piani, i loro
 * avversari e gli oggetti che si possono raccogliere salendo.
 * =====================================================================
 * Solo dati. La logica della scalata vive in js/modes/torre.js (stato,
 * sorteggi, scelta del premio, usata da torre.html e dal duello) e la
 * preparazione del duello in js/modes/torre-mode.js.
 *
 * Venti piani. Ogni cinque un BOSS fisso; gli altri piani pescano
 * l'avversario dalla fascia del loro tratto, senza ripetizioni nella
 * stessa scalata. I Life Point NON si ricaricano fra un piano e l'altro.
 *
 * GLI OGGETTI cambiano solo la PREPARAZIONE del duello, mai le regole:
 * il motore di Duel Monsters resta quello di sempre (scelta esplicita
 * dell'utente). `max` è quante volte si può prendere lo stesso oggetto
 * nella stessa scalata.
 *
 * Forme: `PianoTorre`, `FasciaTorre`, `OggettoTorre` in types/modalita.d.ts.
 */
/** @type {{ piani: number, lpIniziali: number, recuperoLp: number, fasce: FasciaTorre[], boss: { [piano: number]: PianoTorre }, oggetti: OggettoTorre[] }} */
const torreDatabase = {
    piani: 20,
    lpIniziali: 8000,
    /** Quanti Life Point ridà il premio "Ristoro" (mai oltre i Life Point iniziali). */
    recuperoLp: 2500,
    // I tratti fra un boss e l'altro: avversari possibili, livello, campo.
    fasce: [
        { daPiano: 1, aPiano: 4, livello: 'Facile', campo: 'campoPrato.jpg',
            avversari: ['rex', 'weevil', 'mako', 'bonz', 'panik', 'tea', 'tristan'] },
        { daPiano: 6, aPiano: 9, livello: 'Medio', campo: 'arenaRegnoDeiDuellanti.jpg',
            avversari: ['mai', 'joey', 'espaRoba', 'paradoxBrothers', 'duke', 'bandit_keith'] },
        { daPiano: 11, aPiano: 14, livello: 'Medio', campo: 'citta.jpg',
            avversari: ['bakura', 'arkana', 'strings', 'odion', 'lumis', 'umbra'] },
        { daPiano: 16, aPiano: 19, livello: 'Difficile', campo: 'torreDeiDuelli.jpg',
            avversari: ['kaiba', 'ishizu', 'noah', 'gozaburo', 'joey', 'mai'] }
    ],
    boss: {
        5: { avversario: 'bandit_keith', livello: 'Medio', campo: 'stadioKaiba.jpg' },
        10: { avversario: 'pegasus', livello: 'Medio', campo: 'arenaCastelloPegasus.jpg' },
        15: { avversario: 'marik', livello: 'Difficile', campo: 'torreDeiDuelliShadow.jpg' },
        20: { avversario: 'yamiYugi', livello: 'Difficile', campo: 'torreDeiDuelliColosseo.jpg' }
    },
    oggetti: [
        { id: 'mano', icona: '🃏', nome: 'Mano più ricca', max: 2,
            descrizione: 'Ogni duello cominci con 1 carta in più in mano.' },
        { id: 'primo', icona: '⚡', nome: 'Prima mossa', max: 1,
            descrizione: 'Cominci sempre tu, senza la morra cinese.' },
        { id: 'lpAvversario', icona: '💔', nome: 'Avversario indebolito', max: 3,
            descrizione: 'Ogni avversario parte con 1000 Life Point in meno.' },
        { id: 'carta', icona: '📌', nome: 'Carta fidata', max: 1,
            descrizione: 'Scegli una carta del tuo mazzo: sarà sempre nella tua mano iniziale.' }
    ]
};

window.torreDatabase = torreDatabase;
