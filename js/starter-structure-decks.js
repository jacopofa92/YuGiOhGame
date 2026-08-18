/**
 * starter-structure-decks.js — Catalogo degli Starter Deck e Structure
 * Deck "acquistabili" (in futuro, dal Negozio — vedi negozio.html).
 * ------------------------------------------------------------------
 * Ogni voce è un mazzo precostituito di sola lettura, nello stesso
 * formato { main: [{id,qty}], extra: [{id,qty}] } dei deck dei
 * personaggi (js/character-decks.js) — da Creazione Deck, se posseduto,
 * può essere clonato nella propria collezione esattamente come un deck
 * di un Duellante.
 *
 * Il possesso si stabilirà DAVVERO acquistando dal Negozio, quando
 * quella funzionalità sarà implementata (vedi SaveManager.ownsPack/
 * addOwnedPack in save-manager.js): per ora nessun pacchetto è
 * posseduto di default, quindi ogni voce qui sotto compare "bloccata"
 * in Creazione Deck finché il Negozio non vende davvero qualcosa.
 *
 * SCHELETRO: questi sono i veri Starter Deck / Structure Deck usciti
 * nel TCG occidentale (nomi, codici e anno reali), ma le liste carte
 * (main/extra) sono ancora vuote apposta — le compileremo carta per
 * carta in un secondo momento. Finché main/extra restano vuoti il
 * pacchetto resta comunque "bloccato" a schermo (Main: 0 · Extra: 0),
 * quindi non c'è alcun rischio di clonare un mazzo vuoto nel frattempo.
 */
const starterStructureDeckDatabase = [
    // --- Starter Deck -------------------------------------------------
    {
        packId: 'starter_sdy_yugi',
        kind: 'starter',
        name: 'Starter Deck: Yugi (SDY)',
        year: 2002,
        description: 'Il primo mazzo di Yugi Muto: Mago Nero ed Elfa Magica in prima linea, pensato per chi muove i primi passi nel gioco.',
        main: [],
        extra: []
    },
    {
        packId: 'starter_sdk_kaiba',
        kind: 'starter',
        name: 'Starter Deck: Kaiba (SDK)',
        year: 2002,
        description: 'Il mazzo di Seto Kaiba, costruito sulla forza bruta dei Draghi e sull\'ombra del Drago Bianco Occhi Blu.',
        main: [],
        extra: []
    },
    {
        packId: 'starter_sdj_joey',
        kind: 'starter',
        name: 'Starter Deck: Joey (SDJ)',
        year: 2003,
        description: 'Il mazzo di Joey Wheeler, aggressivo e diretto, con Guerrieri in prima linea e il fedele Drago Nero Occhi Rossi.',
        main: [],
        extra: []
    },
    {
        packId: 'starter_sdp_pegasus',
        kind: 'starter',
        name: 'Starter Deck: Pegasus (SDP)',
        year: 2003,
        description: 'Il mazzo di Maximillion Pegasus, incentrato sul Mondo dei Toon e sui suoi bizzarri mostri "cartoon".',
        main: [],
        extra: []
    },
    {
        packId: 'starter_sye_yugi_evolution',
        kind: 'starter',
        name: 'Starter Deck: Yugi Evolution (SYE)',
        year: 2004,
        description: 'Versione aggiornata del mazzo di Yugi, con carte più recenti a supporto di Mago Nero e Maga Oscura.',
        main: [],
        extra: []
    },
    {
        packId: 'starter_ske_kaiba_evolution',
        kind: 'starter',
        name: 'Starter Deck: Kaiba Evolution (SKE)',
        year: 2004,
        description: 'Versione aggiornata del mazzo di Kaiba, con nuovo supporto per i Draghi e per il Drago Bianco Occhi Blu.',
        main: [],
        extra: []
    },
    {
        packId: 'starter_2006',
        kind: 'starter',
        name: 'Starter Deck 2006',
        year: 2006,
        description: 'Il mazzo introduttivo generico del 2006, pensato per insegnare le basi del gioco a chi inizia da zero.',
        main: [],
        extra: []
    },

    // --- Structure Deck -------------------------------------------------
    {
        packId: 'structure_sd1_dragons_roar',
        kind: 'structure',
        name: 'Structure Deck: Dragon\'s Roar (SD1)',
        year: 2005,
        description: 'Mazzo tematico dedicato ai mostri Tipo Drago e alla loro potenza distruttiva.',
        main: [],
        extra: []
    },
    {
        packId: 'structure_sd2_zombie_madness',
        kind: 'structure',
        name: 'Structure Deck: Zombie Madness (SD2)',
        year: 2005,
        description: 'Mazzo tematico dedicato ai mostri Tipo Zombie e alla loro capacità di risorgere dal Cimitero.',
        main: [],
        extra: []
    },
    {
        packId: 'structure_sd3_blaze_of_destruction',
        kind: 'structure',
        name: 'Structure Deck: Blaze of Destruction (SD3)',
        year: 2005,
        description: 'Mazzo tematico dedicato ai mostri Tipo Fuoco e agli effetti di danno diretto.',
        main: [],
        extra: []
    },
    {
        packId: 'structure_sd4_fury_from_the_deep',
        kind: 'structure',
        name: 'Structure Deck: Fury from the Deep (SD4)',
        year: 2005,
        description: 'Mazzo tematico dedicato ai mostri Tipo Pesce e Serpente di Mare e al controllo del campo tramite "Umi".',
        main: [],
        extra: []
    },
    {
        packId: 'structure_sd5_warriors_triumph',
        kind: 'structure',
        name: 'Structure Deck: Warrior\'s Triumph (SD5)',
        year: 2006,
        description: 'Mazzo tematico dedicato ai mostri Tipo Guerriero e alle Magie/Trappole di supporto diretto.',
        main: [],
        extra: []
    },
    {
        packId: 'structure_sd6_spellcasters_judgment',
        kind: 'structure',
        name: 'Structure Deck: Spellcaster\'s Judgment (SD6)',
        year: 2006,
        description: 'Mazzo tematico dedicato ai mostri Tipo Incantatore, con Mago Nero e Maga Oscura come punte di diamante.',
        main: [],
        extra: []
    },
    {
        packId: 'structure_sd7_invincible_fortress',
        kind: 'structure',
        name: 'Structure Deck: Invincible Fortress (SD7)',
        year: 2006,
        description: 'Mazzo tematico difensivo, costruito attorno a mostri resistenti e a Trappole di controllo del campo.',
        main: [],
        extra: []
    },
    {
        packId: 'structure_sd8_lord_of_the_storm',
        kind: 'structure',
        name: 'Structure Deck: Lord of the Storm (SD8)',
        year: 2007,
        description: 'Mazzo tematico dedicato ai mostri Tipo Bestia Alata e agli effetti legati all\'Attributo VENTO.',
        main: [],
        extra: []
    },
    {
        packId: 'structure_sd9_dinosaurs_rage',
        kind: 'structure',
        name: 'Structure Deck: Dinosaur\'s Rage (SD9)',
        year: 2007,
        description: 'Mazzo tematico dedicato ai mostri Tipo Dinosauro e alla loro forza d\'attacco brutale.',
        main: [],
        extra: []
    },
    {
        packId: 'structure_sd10_machine_revolt',
        kind: 'structure',
        name: 'Structure Deck: Machine Re-Volt (SD10)',
        year: 2007,
        description: 'Mazzo tematico dedicato ai mostri Tipo Macchina e alle loro combinazioni Union.',
        main: [],
        extra: []
    }
];

function getStarterStructureDeck(packId) {
    return starterStructureDeckDatabase.find((d) => d.packId === packId) || null;
}
