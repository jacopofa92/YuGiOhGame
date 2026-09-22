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
 *   - 'activateCard': N attivazioni riuscite di una Magia/Trappola/effetto
 *     per id (match: { cardId }), sempre del solo giocatore —
 *     finishActivateCard in js/engine/duel-engine.js, cioè il punto in cui
 *     l'attivazione è davvero andata a buon fine e non solo tentata.
 *   - 'winInstantly': N vittorie per condizione alternativa
 *     (match: { kind: 'exodia' | 'destinyBoard' | 'flyingElephant' }) —
 *     triggerInstantWin in js/engine/game-flow.js, da cui passano TUTTE.
 *   - 'perfectWin': N duelli vinti senza perdere un solo Life Point
 *     (match: {}) — js/duel-session.js, accanto a 'winDuels'.
 *   - 'completeTournament': N tornei portati a termine
 *     (match: { tournamentId }, oppure {} per "uno qualsiasi") —
 *     Rewards.forTournament, l'unico punto attraversato da tutte e tre le
 *     pagine torneo.
 *   - 'winMillenniumItem': un Oggetto del Millennio vinto
 *     (match: { itemId }, oppure {} per "uno qualsiasi") — dentro
 *     Rewards.forDuel, dove l'Oggetto viene registrato.
 *
 * AGGIUNGERNE UNA con un `type` già esistente non richiede di toccare
 * nulla fuori da questo file: il tracker fa il matching generico
 * type+match. Un type NUOVO costa una sola chiamata a
 * ChallengeTracker.recordProgress nel punto giusto del motore — e va
 * messa in un punto UNICO già attraversato da tutti i casi, come quelli
 * elencati qui sopra, non in ogni pagina che potrebbe provocarlo.
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
    {
        id: 'defeat-joey-5',
        icon: '🎲',
        label: 'Più Fortuna che Bravura',
        description: 'Sconfiggi Joey Wheeler 5 volte in Duello Libero',
        type: 'defeatCharacter',
        match: { characterId: 'joey' },
        target: 5,
        reward: { credits: 300 }
    },
    {
        id: 'defeat-mai-5',
        icon: '🦋',
        label: 'Il Profumo delle Carte',
        description: 'Sconfiggi Mai Valentine 5 volte in Duello Libero',
        type: 'defeatCharacter',
        match: { characterId: 'mai' },
        target: 5,
        reward: { credits: 300 }
    },
    {
        id: 'defeat-bakura-5',
        icon: '💍',
        label: 'L\'Anello del Millennio',
        description: 'Sconfiggi Ryo Bakura 5 volte in Duello Libero',
        type: 'defeatCharacter',
        match: { characterId: 'bakura' },
        target: 5,
        reward: { credits: 350 }
    },
    {
        id: 'defeat-ishizu-3',
        icon: '📿',
        label: 'Contro la Profezia',
        description: 'Sconfiggi Ishizu Ishtar 3 volte in Duello Libero',
        type: 'defeatCharacter',
        match: { characterId: 'ishizu' },
        target: 3,
        reward: { credits: 350 }
    },
    {
        id: 'defeat-yamiYugi-10',
        icon: '👑',
        label: 'Battere il Faraone',
        description: 'Sconfiggi Yami Yugi 10 volte in Duello Libero',
        type: 'defeatCharacter',
        match: { characterId: 'yamiYugi' },
        target: 10,
        reward: { credits: 800, starChips: 4 }
    },
    {
        id: 'defeat-bandit-keith-5',
        icon: '🇺🇸',
        label: 'Niente Trucchi',
        description: 'Sconfiggi Bandit Keith 5 volte in Duello Libero',
        type: 'defeatCharacter',
        match: { characterId: 'bandit_keith' },
        target: 5,
        reward: { credits: 300 }
    },
    {
        id: 'defeat-rex-weevil-5',
        icon: '🦖',
        label: 'Il Cacciatore di Dinosauri',
        description: 'Sconfiggi Rex Raptor 5 volte in Duello Libero',
        type: 'defeatCharacter',
        match: { characterId: 'rex' },
        target: 5,
        reward: { credits: 250 }
    },
    {
        id: 'defeat-weevil-5',
        icon: '🐛',
        label: 'Disinfestazione',
        description: 'Sconfiggi Weevil Underwood 5 volte in Duello Libero',
        type: 'defeatCharacter',
        match: { characterId: 'weevil' },
        target: 5,
        reward: { credits: 250 }
    },
    {
        id: 'defeat-mako-5',
        icon: '🌊',
        label: 'Pesca Grossa',
        description: 'Sconfiggi Mako Tsunami 5 volte in Duello Libero',
        type: 'defeatCharacter',
        match: { characterId: 'mako' },
        target: 5,
        reward: { credits: 250 }
    },
    {
        id: 'defeat-panik-3',
        icon: '🕯️',
        label: 'Nessuna Paura',
        description: 'Sconfiggi Panik 3 volte in Duello Libero',
        type: 'defeatCharacter',
        match: { characterId: 'panik' },
        target: 3,
        reward: { credits: 250 }
    },
    {
        id: 'defeat-bonz-3',
        icon: '💀',
        label: 'Riposino in Pace',
        description: 'Sconfiggi Bonz 3 volte in Duello Libero',
        type: 'defeatCharacter',
        match: { characterId: 'bonz' },
        target: 3,
        reward: { credits: 250 }
    },
    {
        id: 'defeat-paradox-3',
        icon: '🧱',
        label: 'Il Labirinto Risolto',
        description: 'Sconfiggi i Fratelli Paradosso 3 volte in Duello Libero',
        type: 'defeatCharacter',
        match: { characterId: 'paradoxBrothers' },
        target: 3,
        reward: { credits: 300 }
    },
    {
        id: 'defeat-heishin-3',
        icon: '🏛️',
        label: 'L\'Usurpatore',
        description: 'Sconfiggi Heishin 3 volte in Duello Libero',
        type: 'defeatCharacter',
        match: { characterId: 'heishin' },
        target: 3,
        reward: { credits: 450, locatorCards: 1 }
    },
    {
        id: 'defeat-darknite-1',
        icon: '😈',
        label: 'Oltre l\'Ultimo Duellante',
        description: 'Sconfiggi DarkNite',
        type: 'defeatCharacter',
        match: { characterId: 'darkNite' },
        target: 1,
        reward: { credits: 700, millenniumCards: 1 }
    },
    {
        id: 'defeat-priestSeto-3',
        icon: '🔺',
        label: 'Il Sacerdote del Passato',
        description: 'Sconfiggi il Sacerdote Seto 3 volte in Duello Libero',
        type: 'defeatCharacter',
        match: { characterId: 'priestSeto' },
        target: 3,
        reward: { credits: 400 }
    },
    {
        id: 'defeat-mirror-1',
        icon: '🪞',
        label: 'Conosci Te Stesso',
        description: 'Sconfiggi Te Stesso',
        type: 'defeatCharacter',
        match: { characterId: 'mirror' },
        target: 1,
        reward: { credits: 400, starChips: 1 }
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
    {
        id: 'summon-obelisk-1',
        icon: '🗿',
        label: 'Il Tormentatore',
        description: 'Evoca Obelisk il Tormentatore',
        type: 'summonMonster',
        match: { cardId: 30 },
        target: 1,
        reward: { credits: 500, millenniumCards: 1 }
    },
    {
        id: 'summon-ra-1',
        icon: '☀️',
        label: 'Il Drago Alato',
        description: 'Evoca Il Drago Alato di Ra',
        type: 'summonMonster',
        match: { cardId: 472 },
        target: 1,
        reward: { credits: 500, millenniumCards: 1 }
    },
    {
        id: 'summon-three-gods',
        icon: '🔺',
        label: 'Il Cielo, la Terra e il Sole',
        description: 'Evoca 3 volte un Dio Egizio (Slifer, Obelisk o Ra)',
        type: 'summonMonster',
        // Elenco, non un id solo: vale una qualunque delle tre Evocazioni
        // (vedi matchesDef in js/challenges/challenge-tracker.js).
        match: { cardId: [31, 30, 472] },
        target: 3,
        reward: { credits: 900, millenniumCards: 2 }
    },
    {
        id: 'summon-blue-eyes-ultimate-1',
        icon: '🐉',
        label: 'Le Tre Teste',
        description: 'Evoca il Drago Bianco Definitivo',
        type: 'summonMonster',
        match: { cardId: 29 },
        target: 1,
        reward: { credits: 600, starChips: 2 }
    },
    {
        id: 'summon-dark-magician-chaos-1',
        icon: '🌀',
        label: 'Magia del Caos',
        description: 'Evoca il Mago del Caos Nero',
        type: 'summonMonster',
        match: { cardId: 854 },
        target: 1,
        reward: { credits: 500, locatorCards: 1 }
    },
    {
        id: 'summon-exodia-necross-1',
        icon: '⛓️',
        label: 'Ciò che Torna',
        description: 'Evoca Exodia Necross',
        type: 'summonMonster',
        match: { cardId: 230 },
        target: 1,
        reward: { credits: 600, millenniumCards: 1 }
    },
    {
        id: 'summon-blue-eyes-20',
        icon: '🐲',
        label: 'Il Mazzo di Kaiba',
        description: 'Evoca il Drago Bianco Occhi Blu 20 volte',
        type: 'summonMonster',
        match: { cardId: 1 },
        target: 20,
        reward: { credits: 900, starChips: 4 }
    },
    {
        id: 'summon-dark-magician-20',
        icon: '🧙',
        label: 'Fedele al Mago',
        description: 'Evoca il Mago Nero 20 volte',
        type: 'summonMonster',
        match: { cardId: 2 },
        target: 20,
        reward: { credits: 900, starChips: 4 }
    },
    {
        id: 'summon-kuriboh-20',
        icon: '🟤',
        label: 'Una Palla di Pelo alla Volta',
        description: 'Evoca Kuriboh 20 volte',
        type: 'summonMonster',
        match: { cardId: 22 },
        target: 20,
        reward: { credits: 500, locatorCards: 1 }
    },
    {
        id: 'summon-flying-elephant-1',
        icon: '🐘',
        label: 'Ma Esiste Davvero?',
        description: 'Evoca l\'Elefante Volante',
        type: 'summonMonster',
        match: { cardId: 246 },
        target: 1,
        reward: { credits: 400 }
    },

    // --- Attiva una carta N volte (Magie, Trappole, effetti) ---
    {
        id: 'activate-dark-hole-10',
        icon: '🕳️',
        label: 'Tabula Rasa',
        description: 'Attiva Buco Nero 10 volte',
        type: 'activateCard',
        match: { cardId: 7 },
        target: 10,
        reward: { credits: 350 }
    },
    {
        id: 'activate-mirror-force-5',
        icon: '🛡️',
        label: 'Rimandato al Mittente',
        description: 'Attiva Forza dello Specchio 5 volte',
        type: 'activateCard',
        match: { cardId: 382 },
        target: 5,
        reward: { credits: 350 }
    },
    {
        id: 'activate-magic-cylinder-5',
        icon: '🎩',
        label: 'Il Tuo Stesso Attacco',
        description: 'Attiva Cilindro Magico 5 volte',
        type: 'activateCard',
        match: { cardId: 10 },
        target: 5,
        reward: { credits: 350 }
    },
    {
        id: 'activate-monster-reborn-10',
        icon: '♻️',
        label: 'Seconda Vita',
        description: 'Attiva Rinascita del Mostro 10 volte',
        type: 'activateCard',
        match: { cardId: 35 },
        target: 10,
        reward: { credits: 350 }
    },
    {
        id: 'activate-pot-of-greed-10',
        icon: '🏺',
        label: 'Ma Cosa Fa Questa Carta?',
        description: 'Attiva Vaso dell\'Avidità 10 volte',
        type: 'activateCard',
        match: { cardId: 36 },
        target: 10,
        reward: { credits: 300 }
    },
    {
        id: 'activate-harpies-feather-duster-5',
        icon: '🪶',
        label: 'Campo Ripulito',
        description: 'Attiva Tempesta di Piume delle Arpie 5 volte',
        type: 'activateCard',
        match: { cardId: 292 },
        target: 5,
        reward: { credits: 350 }
    },
    {
        id: 'activate-destiny-board-1',
        icon: '🔮',
        label: 'La Prima Lettera',
        description: 'Attiva Destiny Board',
        type: 'activateCard',
        match: { cardId: 866 },
        target: 1,
        reward: { credits: 400, locatorCards: 1 }
    },

    // --- Vittorie per condizione alternativa ---
    {
        id: 'win-exodia-1',
        icon: '🧩',
        label: 'Exodia, Obliteralo!',
        description: 'Vinci un Duello riunendo i 5 pezzi di Exodia',
        type: 'winInstantly',
        match: { kind: 'exodia' },
        target: 1,
        reward: { credits: 800, millenniumCards: 1 }
    },
    {
        id: 'win-destiny-board-1',
        icon: '👻',
        label: 'F-I-N-A-L-E',
        description: 'Vinci un Duello completando Destiny Board',
        type: 'winInstantly',
        match: { kind: 'destinyBoard' },
        target: 1,
        reward: { credits: 800, millenniumCards: 1 }
    },
    {
        id: 'win-flying-elephant-1',
        icon: '🐘',
        label: 'La Vittoria più Assurda',
        description: 'Vinci un Duello con l\'Elefante Volante',
        type: 'winInstantly',
        match: { kind: 'flyingElephant' },
        target: 1,
        reward: { credits: 800, millenniumCards: 1 }
    },
    {
        id: 'win-instantly-5',
        icon: '✨',
        label: 'Mai per Vie Normali',
        description: 'Vinci 5 Duelli per condizione alternativa, in qualunque modo',
        type: 'winInstantly',
        match: {},
        target: 5,
        reward: { credits: 1000, millenniumCards: 2 }
    },

    // --- Vittorie senza subire danni ---
    {
        id: 'perfect-win-1',
        icon: '💎',
        label: 'Senza un Graffio',
        description: 'Vinci un Duello con tutti e 8000 i Life Points intatti',
        type: 'perfectWin',
        match: {},
        target: 1,
        reward: { credits: 400 }
    },
    {
        id: 'perfect-win-5',
        icon: '💎',
        label: 'Intoccabile',
        description: 'Vinci 5 Duelli senza perdere un solo Life Point',
        type: 'perfectWin',
        match: {},
        target: 5,
        reward: { credits: 700, starChips: 3 }
    },
    {
        id: 'perfect-win-20',
        icon: '💎',
        label: 'Muro Invalicabile',
        description: 'Vinci 20 Duelli senza perdere un solo Life Point',
        type: 'perfectWin',
        match: {},
        target: 20,
        reward: { credits: 1000, millenniumCards: 1 }
    },

    // --- Tornei ---
    {
        id: 'tournament-duelistKingdom-1',
        icon: '🏝️',
        label: 'Il Regno Conquistato',
        description: 'Completa il Regno dei Duellanti',
        type: 'completeTournament',
        match: { tournamentId: 'duelistKingdom' },
        target: 1,
        reward: { credits: 600, starChips: 3 }
    },
    {
        id: 'tournament-battleCity-1',
        icon: '🏙️',
        label: 'Campione di Battle City',
        description: 'Completa Battle City',
        type: 'completeTournament',
        match: { tournamentId: 'battleCity' },
        target: 1,
        reward: { credits: 600, locatorCards: 3 }
    },
    {
        id: 'tournament-kaiba-1',
        icon: '🎮',
        label: 'Il Campionato di Kaiba',
        description: 'Completa il Torneo Kaiba',
        type: 'completeTournament',
        match: { tournamentId: 'kaibaTournament' },
        target: 1,
        reward: { credits: 600, millenniumCards: 2 }
    },
    {
        id: 'tournament-any-5',
        icon: '🏟️',
        label: 'Habitué dei Tornei',
        description: 'Completa 5 tornei, di qualunque tipo',
        type: 'completeTournament',
        match: {},
        target: 5,
        reward: { credits: 1000, starChips: 3, locatorCards: 3 }
    },
    {
        id: 'tournament-any-15',
        icon: '🏟️',
        label: 'Nato per Vincere',
        description: 'Completa 15 tornei, di qualunque tipo',
        type: 'completeTournament',
        match: {},
        target: 15,
        reward: { credits: 2000, millenniumCards: 3 }
    },

    // --- Oggetti del Millennio ---
    {
        id: 'item-eye',
        icon: '👁️',
        label: 'L\'Occhio di Pegasus',
        description: 'Vinci l\'Occhio del Millennio',
        type: 'winMillenniumItem',
        match: { itemId: 'millenniumEye' },
        target: 1,
        reward: { credits: 800, millenniumCards: 1 }
    },
    {
        id: 'item-rod',
        icon: '🪄',
        label: 'Il Bastone di Marik',
        description: 'Vinci il Bastone del Millennio',
        type: 'winMillenniumItem',
        match: { itemId: 'millenniumRod' },
        target: 1,
        reward: { credits: 800, millenniumCards: 1 }
    },
    {
        id: 'item-necklace',
        icon: '📿',
        label: 'La Collana di Ishizu',
        description: 'Vinci la Collana del Millennio',
        type: 'winMillenniumItem',
        match: { itemId: 'millenniumNecklace' },
        target: 1,
        reward: { credits: 800, millenniumCards: 1 }
    },
    {
        id: 'item-all-three',
        icon: '🔱',
        label: 'Collezionista del Millennio',
        description: 'Vinci tutti e tre gli Oggetti del Millennio',
        type: 'winMillenniumItem',
        match: {},
        target: 3,
        reward: { credits: 2000, millenniumCards: 3 }
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
        id: 'win-25',
        icon: '🏆',
        label: 'Habitué dell\'Arena',
        description: 'Vinci 25 Duelli',
        type: 'winDuels',
        match: {},
        target: 25,
        reward: { credits: 600, starChips: 2 }
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
    },
    {
        id: 'win-100',
        icon: '👑',
        label: 'Cento Duelli',
        description: 'Vinci 100 Duelli',
        type: 'winDuels',
        match: {},
        target: 100,
        reward: { credits: 2000, starChips: 5, millenniumCards: 2 }
    },
    {
        id: 'win-250',
        icon: '🌟',
        label: 'Il Duellante Definitivo',
        description: 'Vinci 250 Duelli',
        type: 'winDuels',
        match: {},
        target: 250,
        reward: { credits: 4000, starChips: 10, locatorCards: 10, millenniumCards: 5 }
    },

    // =================================================================
    // SFIDE DELLE STORIE — una sezione per campagna
    // =================================================================
    // Hanno `sezione: 'storia'` e un `campaignId`: sfide.html le raggruppa
    // sotto la campagna a cui appartengono invece di mescolarle alle
    // generiche, perché rispondono a una domanda diversa — "quanto sono
    // avanti in QUESTA storia", non "quanto ho giocato".
    //
    // Il tipo 'storyProgress' conta le tappe superate di una campagna
    // (match: { campaignId }), e si aggancia in un punto solo: avanza()
    // in js/story/story-progress.js, da cui passa ogni tappa superata,
    // scena o duello che sia. `target` è quindi un numero di tappe.
    //
    // I premi salgono con la campagna e non con la fatica del singolo
    // passo: arrivare a metà di una storia vale poco più di qualche
    // duello, finirla vale come un torneo — che è la cosa più impegnativa
    // del gioco, e il metro con cui tutto il resto è tarato.
    {
        id: 'storia-anime-meta', sezione: 'storia', campaignId: 'anime',
        icon: '🧩', label: 'Il Regno delle Ombre: a metà strada',
        description: 'Supera 13 tappe de Il Regno delle Ombre',
        type: 'storyProgress', match: { campaignId: 'anime' },
        target: 13, reward: { credits: 700, starChips: 1 }
    },
    {
        id: 'storia-anime-fine', sezione: 'storia', campaignId: 'anime',
        icon: '👑', label: 'Il Duello Cerimoniale',
        description: 'Completa Il Regno delle Ombre',
        type: 'storyProgress', match: { campaignId: 'anime' },
        target: 26, reward: { credits: 2000, starChips: 4, millenniumCards: 2 }
    },
    {
        id: 'storia-fm-presente', sezione: 'storia', campaignId: 'forbiddenMemories',
        icon: '🏺', label: 'Cinquemila anni dopo',
        description: 'Arriva al presente in Memorie Proibite',
        type: 'storyProgress', match: { campaignId: 'forbiddenMemories' },
        target: 9, reward: { credits: 600 }
    },
    {
        id: 'storia-fm-maghi', sezione: 'storia', campaignId: 'forbiddenMemories',
        icon: '🔮', label: 'I Cinque Maghi Guerrieri',
        description: 'Supera 28 tappe di Memorie Proibite',
        type: 'storyProgress', match: { campaignId: 'forbiddenMemories' },
        target: 28, reward: { credits: 1200, starChips: 2, locatorCards: 1 }
    },
    {
        id: 'storia-fm-fine', sezione: 'storia', campaignId: 'forbiddenMemories',
        icon: '🌑', label: 'Le memorie ritrovate',
        description: 'Completa Memorie Proibite',
        type: 'storyProgress', match: { campaignId: 'forbiddenMemories' },
        target: 41, reward: { credits: 2500, starChips: 4, millenniumCards: 3 }
    },
    {
        id: 'storia-freedom-corridoio', sezione: 'storia', campaignId: 'freedom',
        icon: '🎥', label: 'Oltre la crepa',
        description: 'Supera 8 tappe di Freedom',
        type: 'storyProgress', match: { campaignId: 'freedom' },
        target: 8, reward: { credits: 600 }
    },
    {
        id: 'storia-freedom-fine', sezione: 'storia', campaignId: 'freedom',
        icon: '👑', label: 'La Corona del Millennio',
        description: 'Completa Freedom',
        type: 'storyProgress', match: { campaignId: 'freedom' },
        target: 16, reward: { credits: 1800, starChips: 3, millenniumCards: 2 }
    },
    {
        id: 'storia-ww1-piave', sezione: 'storia', campaignId: 'ww1',
        icon: '🌊', label: 'Di qua dal Piave',
        description: 'Arriva alla difesa del Piave nella Grande Guerra',
        type: 'storyProgress', match: { campaignId: 'ww1' },
        target: 14, reward: { credits: 700, starChips: 1 }
    },
    {
        id: 'storia-ww1-fine', sezione: 'storia', campaignId: 'ww1',
        icon: '🎖️', label: 'Il Bollettino della Vittoria',
        description: 'Completa la Grande Guerra',
        type: 'storyProgress', match: { campaignId: 'ww1' },
        target: 23, reward: { credits: 2000, starChips: 4, locatorCards: 2, millenniumCards: 1 }
    }
];

window.challengesDatabase = challengesDatabase;
