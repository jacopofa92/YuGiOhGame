/**
 * starter-structure-decks.js — Catalogo degli Starter Deck e Structure
 * Deck "acquistabili" (in futuro, dal Negozio — vedi negozio.html).
 * ------------------------------------------------------------------
 * Ogni voce è un mazzo precostituito di sola lettura, nello stesso
 * formato { main: [{id,qty}], extra: [{id,qty}] } dei deck dei
 * personaggi (js/character-decks.js, da cui riusa direttamente le liste
 * carte per restare coerente con mazzi già verificati validi) — da
 * Creazione Deck, se posseduto, può essere clonato nella propria
 * collezione esattamente come un deck di un Duellante.
 *
 * Il possesso si stabilirà DAVVERO acquistando dal Negozio, quando
 * quella funzionalità sarà implementata (vedi SaveManager.ownsPack/
 * addOwnedPack in save-manager.js): per ora nessun pacchetto è
 * posseduto di default, quindi ogni voce qui sotto compare "bloccata"
 * in Creazione Deck finché il Negozio non vende davvero qualcosa.
 */
const starterStructureDeckDatabase = [
    {
        packId: 'starter_duelist',
        kind: 'starter',
        name: 'Starter Deck: Il Duellante',
        description: 'Un mazzo equilibrato tra Guerrieri e Incantatori, pensato per chi inizia.',
        main: characterDeckDatabase.yugi.main,
        extra: characterDeckDatabase.yugi.extra
    },
    {
        packId: 'starter_beast_warrior',
        kind: 'starter',
        name: 'Starter Deck: Il Combattente',
        description: 'Guerrieri e Guerrieri Bestia in prima linea, con supporto diretto e aggressivo.',
        main: characterDeckDatabase.joey.main,
        extra: characterDeckDatabase.joey.extra
    },
    {
        packId: 'structure_dragons_roar',
        kind: 'structure',
        name: 'Structure Deck: Furia dei Draghi',
        description: 'Un mazzo tematico dedicato ai mostri Tipo Drago più potenti e ai loro Draghi Bianchi.',
        main: characterDeckDatabase.kaiba.main,
        extra: characterDeckDatabase.kaiba.extra
    },
    {
        packId: 'structure_dark_magic',
        kind: 'structure',
        name: 'Structure Deck: Magia Suprema',
        description: 'Un mazzo tematico incentrato su Mago Nero, Maga Oscura e la loro corte di Incantatori.',
        main: characterDeckDatabase.pegasus.main,
        extra: characterDeckDatabase.pegasus.extra
    }
];

function getStarterStructureDeck(packId) {
    return starterStructureDeckDatabase.find((d) => d.packId === packId) || null;
}
