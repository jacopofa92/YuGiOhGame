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
 * `reward` è ciò che il giocatore riceve completando la sfida: una mappa
 * valuta -> quantità (le valute sono quelle di js/save-manager.js:
 * credits, starChips, locatorCards, millenniumCards). Lo legge
 * `Rewards.forChallenge` (js/economy/rewards.js), che è anche l'unico
 * punto che accredita davvero — nessuna pagina assegna valute per conto
 * proprio, vedi la regola in testa a quel file. `null` significa
 * "nessun premio", non "premio da decidere".
 *
 * COME SONO TARATI I NUMERI, per non doverlo riscoprire aggiungendone
 * una nuova. Il metro di paragone è l'economia già esistente: un duello
 * vinto vale 60-90 crediti, la prima vittoria del giorno 150, completare
 * un torneo 1200 (raddoppiati la prima volta). Una Sfida è un traguardo
 * UNA TANTUM e di lungo periodo, quindi deve valere più di un duello ma
 * restare sotto un torneo — che è la cosa più impegnativa del gioco.
 * Le valute rare (Stelle, Locazione, Millennio) compaiono solo sulle
 * sfide davvero lunghe o simboliche: se le desse anche la più facile,
 * i tornei perderebbero la loro ragione d'essere.
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
        reward: { credits: 400, starChips: 2 }
    },
    {
        id: 'defeat-kaiba-10',
        icon: '🐉',
        label: 'Il Presidente Battuto',
        description: 'Sconfiggi Seto Kaiba 10 volte in Duello Libero',
        type: 'defeatCharacter',
        match: { characterId: 'kaiba' },
        target: 10,
        reward: { credits: 700, starChips: 4 }
    },
    {
        id: 'defeat-pegasus-5',
        icon: '👁️',
        label: 'Occhio del Millennio',
        description: 'Sconfiggi Maximillion Pegasus 5 volte in Duello Libero',
        type: 'defeatCharacter',
        match: { characterId: 'pegasus' },
        target: 5,
        reward: { credits: 400, starChips: 2 }
    },
    {
        id: 'defeat-marik-5',
        icon: '🌑',
        label: 'Padrone delle Ombre',
        description: 'Sconfiggi Marik Ishtar 5 volte in Duello Libero',
        type: 'defeatCharacter',
        match: { characterId: 'marik' },
        target: 5,
        reward: { credits: 400, starChips: 2 }
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
        reward: { credits: 300 }
    },
    {
        id: 'summon-dark-magician-5',
        icon: '🧙',
        label: 'Il Mago di Yugi',
        description: 'Evoca il Mago Nero 5 volte',
        type: 'summonMonster',
        match: { cardId: 2 },
        target: 5,
        reward: { credits: 300 }
    },
    {
        id: 'summon-red-eyes-3',
        icon: '🔥',
        label: 'Fiamma Scarlatta',
        description: 'Evoca il Drago Nero Occhi Rossi 3 volte',
        type: 'summonMonster',
        match: { cardId: 12 },
        target: 3,
        reward: { credits: 250 }
    },
    {
        id: 'summon-exodia-head-3',
        icon: '🧩',
        label: 'Il Proibito',
        description: 'Evoca la Testa Proibita 3 volte',
        type: 'summonMonster',
        match: { cardId: 41 },
        target: 3,
        reward: { credits: 250, locatorCards: 1 }
    },
    {
        id: 'summon-jinzo-3',
        icon: '🤖',
        label: 'Silenzio delle Trappole',
        description: 'Evoca Jinzo 3 volte',
        type: 'summonMonster',
        match: { cardId: 17 },
        target: 3,
        reward: { credits: 250 }
    },
    {
        id: 'summon-kuriboh-5',
        icon: '🟤',
        label: 'Piccolo Peloso',
        description: 'Evoca Kuriboh 5 volte',
        type: 'summonMonster',
        match: { cardId: 22 },
        target: 5,
        reward: { credits: 200 }
    },
    {
        id: 'summon-slifer-1',
        icon: '⚡',
        label: 'Un Dio in Campo',
        description: 'Evoca Slifer il Drago del Cielo',
        type: 'summonMonster',
        match: { cardId: 31 },
        target: 1,
        reward: { credits: 500, millenniumCards: 1 }
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
        reward: { credits: 100 }
    },
    {
        id: 'win-10',
        icon: '🏆',
        label: 'Duellante Esperto',
        description: 'Vinci 10 Duelli',
        type: 'winDuels',
        match: {},
        target: 10,
        reward: { credits: 300 }
    },
    {
        id: 'win-50',
        icon: '🏆',
        label: 'Leggenda dell\'Arena',
        description: 'Vinci 50 Duelli',
        type: 'winDuels',
        match: {},
        target: 50,
        reward: { credits: 1000, starChips: 5 }
    }
];

window.challengesDatabase = challengesDatabase;
