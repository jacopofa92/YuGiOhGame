/**
 * character-decks.js — Deck a tema per ogni Duellante di "Duello Libero".
 * ------------------------------------------------------------------
 * Ogni deck è espresso come lista di { id, qty } (id = card id in
 * cardDatabase, qty = copie, massimo 3 per carta come da regola
 * standard). Questi deck sono di sola lettura: dalla pagina di
 * Creazione Deck possono essere clonati nella propria collezione
 * (fino al limite di 30 deck) per poi essere modificati liberamente.
 */
const characterDeckDatabase = {
    yugi: {
        main: [
            { id: 2, qty: 3 }, { id: 19, qty: 2 }, { id: 3, qty: 2 }, { id: 11, qty: 2 },
            { id: 28, qty: 3 }, { id: 24, qty: 2 }, { id: 6, qty: 2 }, { id: 22, qty: 3 },
            { id: 4, qty: 2 }, { id: 16, qty: 2 }, { id: 25, qty: 2 }, { id: 23, qty: 2 },
            { id: 7, qty: 1 }, { id: 8, qty: 1 }, { id: 35, qty: 1 }, { id: 36, qty: 2 },
            { id: 39, qty: 2 }, { id: 9, qty: 2 }, { id: 10, qty: 2 }, { id: 40, qty: 2 }
        ],
        extra: []
    },
    kaiba: {
        main: [
            { id: 1, qty: 3 }, { id: 15, qty: 3 }, { id: 27, qty: 3 }, { id: 17, qty: 2 },
            { id: 21, qty: 2 }, { id: 34, qty: 2 }, { id: 13, qty: 2 }, { id: 5, qty: 2 },
            { id: 4, qty: 3 }, { id: 16, qty: 3 }, { id: 20, qty: 3 }, { id: 7, qty: 2 },
            { id: 35, qty: 2 }, { id: 37, qty: 2 }, { id: 39, qty: 2 }, { id: 9, qty: 2 },
            { id: 10, qty: 2 }, { id: 40, qty: 2 }
        ],
        extra: [{ id: 33, qty: 1 }, { id: 29, qty: 1 }]
    },
    joey: {
        main: [
            { id: 12, qty: 2 }, { id: 4, qty: 3 }, { id: 16, qty: 3 }, { id: 18, qty: 3 },
            { id: 14, qty: 2 }, { id: 20, qty: 2 }, { id: 22, qty: 3 }, { id: 23, qty: 2 },
            { id: 25, qty: 3 }, { id: 26, qty: 3 }, { id: 5, qty: 2 }, { id: 6, qty: 2 },
            { id: 3, qty: 2 }, { id: 7, qty: 1 }, { id: 37, qty: 1 }, { id: 9, qty: 2 },
            { id: 10, qty: 2 }, { id: 40, qty: 2 }
        ],
        extra: []
    },
    mai: {
        main: [
            { id: 24, qty: 3 }, { id: 3, qty: 3 }, { id: 19, qty: 3 }, { id: 28, qty: 3 },
            { id: 6, qty: 2 }, { id: 4, qty: 2 }, { id: 16, qty: 2 }, { id: 25, qty: 2 },
            { id: 23, qty: 2 }, { id: 22, qty: 2 }, { id: 5, qty: 2 }, { id: 7, qty: 1 },
            { id: 8, qty: 1 }, { id: 35, qty: 1 }, { id: 9, qty: 3 }, { id: 10, qty: 3 },
            { id: 40, qty: 3 }, { id: 39, qty: 2 }
        ],
        extra: []
    },
    pegasus: {
        main: [
            { id: 19, qty: 3 }, { id: 2, qty: 3 }, { id: 28, qty: 3 }, { id: 3, qty: 3 },
            { id: 24, qty: 2 }, { id: 11, qty: 3 }, { id: 22, qty: 2 }, { id: 13, qty: 3 },
            { id: 26, qty: 2 }, { id: 25, qty: 2 }, { id: 7, qty: 2 }, { id: 8, qty: 2 },
            { id: 35, qty: 2 }, { id: 36, qty: 2 }, { id: 39, qty: 2 }, { id: 9, qty: 2 },
            { id: 10, qty: 2 }
        ],
        extra: []
    },
    bakura: {
        main: [
            { id: 13, qty: 3 }, { id: 26, qty: 3 }, { id: 25, qty: 3 }, { id: 22, qty: 2 },
            { id: 6, qty: 3 }, { id: 12, qty: 2 }, { id: 17, qty: 2 }, { id: 21, qty: 3 },
            { id: 18, qty: 3 }, { id: 11, qty: 2 }, { id: 23, qty: 2 }, { id: 5, qty: 2 },
            { id: 7, qty: 2 }, { id: 37, qty: 1 }, { id: 9, qty: 3 }, { id: 10, qty: 2 },
            { id: 40, qty: 2 }
        ],
        extra: []
    },
    marik: {
        main: [
            { id: 12, qty: 3 }, { id: 13, qty: 3 }, { id: 17, qty: 3 }, { id: 21, qty: 3 },
            { id: 26, qty: 3 }, { id: 18, qty: 3 }, { id: 6, qty: 2 }, { id: 25, qty: 2 },
            { id: 34, qty: 2 }, { id: 5, qty: 3 }, { id: 22, qty: 1 }, { id: 7, qty: 2 },
            { id: 37, qty: 2 }, { id: 39, qty: 2 }, { id: 9, qty: 2 }, { id: 10, qty: 2 },
            { id: 40, qty: 2 }
        ],
        extra: []
    },
    mako: {
        main: [
            { id: 5, qty: 3 }, { id: 23, qty: 3 }, { id: 34, qty: 3 }, { id: 3, qty: 3 },
            { id: 24, qty: 2 }, { id: 4, qty: 3 }, { id: 16, qty: 3 }, { id: 14, qty: 3 },
            { id: 25, qty: 3 }, { id: 22, qty: 2 }, { id: 6, qty: 2 }, { id: 7, qty: 1 },
            { id: 35, qty: 1 }, { id: 9, qty: 3 }, { id: 10, qty: 3 }, { id: 40, qty: 2 }
        ],
        extra: [{ id: 33, qty: 1 }]
    },
    weevil: {
        main: [
            { id: 23, qty: 3 }, { id: 3, qty: 2 }, { id: 24, qty: 3 }, { id: 5, qty: 3 },
            { id: 25, qty: 3 }, { id: 26, qty: 3 }, { id: 4, qty: 2 }, { id: 16, qty: 2 },
            { id: 22, qty: 2 }, { id: 6, qty: 2 }, { id: 13, qty: 2 }, { id: 18, qty: 3 },
            { id: 7, qty: 1 }, { id: 39, qty: 2 }, { id: 9, qty: 3 }, { id: 10, qty: 2 },
            { id: 40, qty: 2 }
        ],
        extra: []
    },
    rex: {
        main: [
            { id: 5, qty: 3 }, { id: 18, qty: 3 }, { id: 14, qty: 3 }, { id: 34, qty: 3 },
            { id: 4, qty: 3 }, { id: 16, qty: 3 }, { id: 20, qty: 3 }, { id: 25, qty: 3 },
            { id: 26, qty: 3 }, { id: 22, qty: 2 }, { id: 6, qty: 2 }, { id: 7, qty: 1 },
            { id: 37, qty: 1 }, { id: 9, qty: 3 }, { id: 10, qty: 2 }, { id: 40, qty: 2 }
        ],
        extra: []
    },
    // Bandit Keith: mazzo Macchina/Guerriero aggressivo e senza fronzoli,
    // con Jinzo a rendere inutili le Trappole dell'avversario — sleale
    // quanto il personaggio, come nell'anime.
    bandit_keith: {
        main: [
            { id: 21, qty: 2 }, { id: 34, qty: 3 }, { id: 17, qty: 2 }, { id: 16, qty: 3 },
            { id: 18, qty: 2 }, { id: 6, qty: 2 }, { id: 4, qty: 2 }, { id: 5, qty: 2 },
            { id: 13, qty: 2 }, { id: 24, qty: 2 }, { id: 37, qty: 1 }, { id: 7, qty: 1 },
            { id: 39, qty: 2 }, { id: 9, qty: 2 }, { id: 10, qty: 2 }, { id: 40, qty: 2 },
            { id: 35, qty: 1 }, { id: 22, qty: 2 }, { id: 36, qty: 2 }, { id: 23, qty: 3 }
        ],
        extra: []
    },
    // Panik: l'illusionista di Pegasus, mazzo Incantatore/Demone da
    // prestigiatore — inganna con posizioni e trappole più che con la
    // forza bruta.
    panik: {
        main: [
            { id: 19, qty: 3 }, { id: 3, qty: 3 }, { id: 28, qty: 3 }, { id: 24, qty: 2 },
            { id: 25, qty: 3 }, { id: 26, qty: 2 }, { id: 13, qty: 2 }, { id: 6, qty: 2 },
            { id: 11, qty: 2 }, { id: 35, qty: 1 }, { id: 36, qty: 2 }, { id: 39, qty: 2 },
            { id: 9, qty: 2 }, { id: 10, qty: 2 }, { id: 40, qty: 2 }, { id: 22, qty: 3 },
            { id: 23, qty: 3 }, { id: 7, qty: 1 }
        ],
        extra: []
    },
    // Bonz: la guida (auto-proclamata) del Cimitero, mazzo Demone da stallo
    // difensivo con Rinascita del Mostro come pezzo forte — a tema con il
    // suo "tour" macabro nell'anime.
    bonz: {
        main: [
            { id: 13, qty: 3 }, { id: 25, qty: 3 }, { id: 26, qty: 3 }, { id: 22, qty: 3 },
            { id: 3, qty: 2 }, { id: 5, qty: 2 }, { id: 35, qty: 2 }, { id: 36, qty: 2 },
            { id: 39, qty: 2 }, { id: 9, qty: 2 }, { id: 10, qty: 2 }, { id: 40, qty: 3 },
            { id: 8, qty: 1 }, { id: 6, qty: 3 }, { id: 18, qty: 3 }, { id: 24, qty: 2 },
            { id: 7, qty: 1 }, { id: 11, qty: 1 }
        ],
        extra: []
    },
    // Odion: il fedele guardiano di Marik, mazzo Roccia/difensivo da
    // muraglia — con Suijin (il vero "guardiano" delle carte) e Il
    // Guardiano del Cancello come pezzo forte in Extra Deck, a tema con il
    // suo ruolo di protettore nell'anime.
    odion: {
        main: [
            { id: 71, qty: 3 }, { id: 5, qty: 3 }, { id: 54, qty: 2 }, { id: 51, qty: 2 },
            { id: 68, qty: 2 }, { id: 3, qty: 2 }, { id: 45, qty: 2 }, { id: 4, qty: 2 },
            { id: 16, qty: 2 }, { id: 74, qty: 2 }, { id: 6, qty: 2 }, { id: 47, qty: 2 },
            { id: 53, qty: 1 }, { id: 35, qty: 1 }, { id: 9, qty: 2 }, { id: 10, qty: 2 },
            { id: 40, qty: 2 }, { id: 39, qty: 2 }, { id: 7, qty: 1 }, { id: 37, qty: 1 },
            { id: 36, qty: 1 }, { id: 24, qty: 1 }
        ],
        extra: [{ id: 33, qty: 1 }]
    },
    // Ishizu Ishtar: esperta d'Egitto e del Millennium Necklace, mazzo
    // Incantatore/Fata elegante e control-oriented — niente forza bruta,
    // solo carte solide e trappole di risposta.
    ishizu: {
        main: [
            { id: 3, qty: 3 }, { id: 68, qty: 3 }, { id: 24, qty: 3 }, { id: 19, qty: 3 },
            { id: 28, qty: 2 }, { id: 54, qty: 2 }, { id: 5, qty: 2 }, { id: 45, qty: 2 },
            { id: 4, qty: 2 }, { id: 16, qty: 2 }, { id: 51, qty: 2 }, { id: 69, qty: 1 },
            { id: 64, qty: 1 }, { id: 35, qty: 1 }, { id: 9, qty: 2 }, { id: 10, qty: 2 },
            { id: 40, qty: 2 }, { id: 39, qty: 2 }, { id: 7, qty: 1 }, { id: 37, qty: 1 },
            { id: 36, qty: 1 }
        ],
        extra: []
    },
    // Espa Roba: il duellante "psichico" di Battle City, mazzo Demone/Terra
    // imperniato sui pezzi di Exodia (che lui stesso reclamizza di poter
    // "prevedere") in mano come minaccia extra oltre al combattimento.
    espaRoba: {
        main: [
            { id: 24, qty: 3 }, { id: 25, qty: 3 }, { id: 46, qty: 3 }, { id: 26, qty: 3 },
            { id: 41, qty: 1 }, { id: 42, qty: 1 }, { id: 43, qty: 1 }, { id: 44, qty: 1 },
            { id: 22, qty: 3 }, { id: 6, qty: 2 }, { id: 13, qty: 2 }, { id: 18, qty: 2 },
            { id: 4, qty: 2 }, { id: 5, qty: 2 }, { id: 34, qty: 2 }, { id: 7, qty: 1 },
            { id: 36, qty: 2 }, { id: 9, qty: 2 }, { id: 10, qty: 2 }, { id: 40, qty: 2 }
        ],
        extra: []
    },
    // Arkana: il prestigiatore oscuro dei Rare Hunter, mazzo Incantatore
    // ossessionato dal Mago Nero (che nell'anime odia e imita) con trappole
    // da vero illusionista.
    arkana: {
        main: [
            { id: 19, qty: 3 }, { id: 2, qty: 1 }, { id: 3, qty: 3 }, { id: 28, qty: 3 },
            { id: 24, qty: 3 }, { id: 54, qty: 3 }, { id: 26, qty: 3 }, { id: 25, qty: 3 },
            { id: 13, qty: 2 }, { id: 6, qty: 2 }, { id: 11, qty: 1 }, { id: 41, qty: 1 },
            { id: 35, qty: 1 }, { id: 36, qty: 1 }, { id: 9, qty: 2 }, { id: 10, qty: 2 },
            { id: 40, qty: 2 }, { id: 39, qty: 2 }, { id: 7, qty: 1 }, { id: 37, qty: 1 }
        ],
        extra: []
    },
    // Fratelli Paradosso: i guardiani del Labirinto, mazzo Roccia/Insetto
    // da stallo fitto di Trappole — vincono a sfinimento, come nella loro
    // arena-labirinto nell'anime.
    paradoxBrothers: {
        main: [
            { id: 5, qty: 3 }, { id: 23, qty: 3 }, { id: 49, qty: 2 }, { id: 50, qty: 2 },
            { id: 51, qty: 2 }, { id: 52, qty: 2 }, { id: 34, qty: 3 }, { id: 54, qty: 2 },
            { id: 4, qty: 2 }, { id: 18, qty: 2 }, { id: 53, qty: 2 }, { id: 9, qty: 3 },
            { id: 10, qty: 3 }, { id: 40, qty: 3 }, { id: 39, qty: 2 }, { id: 7, qty: 1 },
            { id: 37, qty: 1 }, { id: 35, qty: 1 }, { id: 36, qty: 1 }
        ],
        extra: []
    }
};

function getCharacterDeck(characterId) {
    return characterDeckDatabase[characterId] || null;
}

/** Somma tutte le quantità di una lista { id, qty } */
function deckListCount(list) {
    return (list || []).reduce((sum, entry) => sum + entry.qty, 0);
}
