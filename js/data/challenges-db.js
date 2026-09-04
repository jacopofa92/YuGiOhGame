/**
 * challenges-db.js — Catalogo delle Sfide (obiettivi da completare
 * giocando, vedi sfide.html). Solo dati statici, nessuna logica di
 * tracking qui: quella vive in js/challenges/challenge-tracker.js, che
 * fa il matching generico type+match invece di avere una funzione
 * dedicata per ogni singola sfida — stesso principio di separazione
 * dati/motore già usato per characters-db.js/cards-db.js.
 *
 * Ogni sfida ha un `type` che dice A COSA si aggancia:
 *   - 'defeatCharacter': N vittorie contro un personaggio specifico di
 *     Duello Libero/Storia (match: { characterId }, id da
 *     js/data/characters-db.js) — incrementata in js/duel-session.js
 *     (funzione finish()), MAI contro il Bot generico del Duello Demo
 *     (che non ha un characterId).
 *   - 'winDuels': N Duelli vinti in totale, contro qualunque avversario
 *     reale (match: {}) — stesso punto di aggancio di 'defeatCharacter'.
 *   - 'summonMonster': N Evocazioni (Normali O Speciali, sommate insieme)
 *     di una carta specifica per id (match: { cardId }, id da
 *     data/cards.json) del solo giocatore umano — incrementata nel
 *     dispatcher condiviso ON_NORMAL_SUMMON/ON_SPECIAL_SUMMON in
 *     js/engine/duel-engine.js.
 *
 * `reward` è un segnaposto per un sistema di ricompense futuro (richiesta
 * esplicita dell'utente: "in futuro sbloccheranno anche dei premi", non
 * ancora implementato) — il campo esiste già nel modello dati così una
 * futura sfida non richiede di migrare quelle esistenti; nessun codice
 * lo legge ancora.
 */
const challengesDatabase = [
    // --- Sconfiggi un Duellante N volte (Duello Libero) ---
    {
        id: 'defeat-yugi-5',
        icon: '🃏',
        label: 'Il Re dei Giochi',
        description: 'Sconfiggi Yugi Muto 5 volte in Duello Libero',
        type: 'defeatCharacter',
        match: { characterId: 'yugiMuto' },
        target: 5,
        reward: null
    },
    {
        id: 'defeat-kaiba-10',
        icon: '🐉',
        label: 'Il Presidente Battuto',
        description: 'Sconfiggi Seto Kaiba 10 volte in Duello Libero',
        type: 'defeatCharacter',
        match: { characterId: 'kaiba' },
        target: 10,
        reward: null
    },
    {
        id: 'defeat-pegasus-5',
        icon: '👁️',
        label: 'Occhio del Millennio',
        description: 'Sconfiggi Maximillion Pegasus 5 volte in Duello Libero',
        type: 'defeatCharacter',
        match: { characterId: 'pegasus' },
        target: 5,
        reward: null
    },
    {
        id: 'defeat-marik-5',
        icon: '🌑',
        label: 'Padrone delle Ombre',
        description: 'Sconfiggi Marik Ishtar 5 volte in Duello Libero',
        type: 'defeatCharacter',
        match: { characterId: 'marik' },
        target: 5,
        reward: null
    },

    // --- Evoca una carta specifica N volte (qualunque modalità) ---
    {
        id: 'summon-blue-eyes-5',
        icon: '🐲',
        label: 'Drago Leggendario',
        description: 'Evoca il Drago Bianco Occhi Blu 5 volte',
        type: 'summonMonster',
        match: { cardId: 1 },
        target: 5,
        reward: null
    },
    {
        id: 'summon-dark-magician-5',
        icon: '🧙',
        label: 'Il Mago di Yugi',
        description: 'Evoca il Mago Nero 5 volte',
        type: 'summonMonster',
        match: { cardId: 2 },
        target: 5,
        reward: null
    },
    {
        id: 'summon-red-eyes-3',
        icon: '🔥',
        label: 'Fiamma Scarlatta',
        description: 'Evoca il Drago Nero Occhi Rossi 3 volte',
        type: 'summonMonster',
        match: { cardId: 12 },
        target: 3,
        reward: null
    },
    {
        id: 'summon-exodia-head-3',
        icon: '🧩',
        label: 'Il Proibito',
        description: 'Evoca la Testa Proibita 3 volte',
        type: 'summonMonster',
        match: { cardId: 41 },
        target: 3,
        reward: null
    },
    {
        id: 'summon-jinzo-3',
        icon: '🤖',
        label: 'Silenzio delle Trappole',
        description: 'Evoca Jinzo 3 volte',
        type: 'summonMonster',
        match: { cardId: 17 },
        target: 3,
        reward: null
    },
    {
        id: 'summon-kuriboh-5',
        icon: '🟤',
        label: 'Piccolo Peloso',
        description: 'Evoca Kuriboh 5 volte',
        type: 'summonMonster',
        match: { cardId: 22 },
        target: 5,
        reward: null
    },
    {
        id: 'summon-slifer-1',
        icon: '⚡',
        label: 'Un Dio in Campo',
        description: 'Evoca Slifer il Drago del Cielo',
        type: 'summonMonster',
        match: { cardId: 31 },
        target: 1,
        reward: null
    },

    // --- Traguardi generali ---
    {
        id: 'win-1',
        icon: '🏆',
        label: 'Prima Vittoria',
        description: 'Vinci il tuo primo Duello',
        type: 'winDuels',
        match: {},
        target: 1,
        reward: null
    },
    {
        id: 'win-10',
        icon: '🏆',
        label: 'Duellante Esperto',
        description: 'Vinci 10 Duelli',
        type: 'winDuels',
        match: {},
        target: 10,
        reward: null
    },
    {
        id: 'win-50',
        icon: '🏆',
        label: 'Leggenda dell\'Arena',
        description: 'Vinci 50 Duelli',
        type: 'winDuels',
        match: {},
        target: 50,
        reward: null
    }
];

window.challengesDatabase = challengesDatabase;
