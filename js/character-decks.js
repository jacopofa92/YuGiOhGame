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
    }
};

function getCharacterDeck(characterId) {
    return characterDeckDatabase[characterId] || null;
}

/** Somma tutte le quantità di una lista { id, qty } */
function deckListCount(list) {
    return (list || []).reduce((sum, entry) => sum + entry.qty, 0);
}
