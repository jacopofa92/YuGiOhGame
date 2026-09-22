/**
 * save-manager.js — Salvataggio locale unificato del giocatore.
 * =====================================================================
 * Un solo oggetto JSON, in localStorage sotto SAVE_KEY, raccoglie tutto
 * quello che prima viveva sparso in chiavi separate:
 *   - nome del giocatore + data dell'ultimo salvataggio
 *   - i deck creati (prima in 'duelArenaDecks', vedi creazione-deck.html)
 *   - il record vittorie/sconfitte per personaggio di Duello Libero
 *     (prima in 'duelArenaRecord_<id>', vedi js/data/characters-db.js)
 *
 * "In JSON locale" qui vuol dire: nel localStorage del browser — lo
 * stesso meccanismo già usato in questo progetto per deck/record, che
 * continua a funzionare aprendo semplicemente i file .html, senza
 * bisogno di un server (vedi README.md). Chi vuole un vero file su disco
 * può usare exportToFile()/importFromFile(), che scaricano/caricano un
 * file save_yugioh.json.
 *
 * Migrazione: se non esiste ancora un salvataggio unificato ma esistono
 * dati sotto le vecchie chiavi separate, load() li raccoglie in un nuovo
 * salvataggio automaticamente al primo utilizzo, così chi aveva già
 * deck/record prima di questo sistema non perde nulla.
 */
(function () {
    'use strict';

    const SAVE_KEY = 'yugiohDuelArenaSave';
    const LEGACY_DECKS_KEY = 'duelArenaDecks';
    const LEGACY_RECORD_PREFIX = 'duelArenaRecord_';
    const EXPORT_FILENAME = 'save_yugioh.json';

    // Deck di ripiego se starter-structure-decks.js non fosse caricato per
    // qualche motivo (vedi makeStarterDeck sotto, che normalmente usa
    // invece il vero Starter Deck di Yugi, packId 'starter_sdy_yugi'):
    // volutamente MODESTO, non un mazzo da torneo — quasi tutti mostri a 4
    // stelle o meno (Evocazione libera, senza Tributi), con solo un pugno
    // di mostri da Tributo Livello 5/6 (Maledizione del Drago, Teschio
    // Evocato, Uomo Giudice — questi ultimi due sono i soli sopra i 2000
    // ATK, fino a 2500, per dare comunque una minaccia credibile senza
    // esagerare) più Magie/Trappole di supporto BASILARI: niente Buco Nero
    // né Raigeki (spazzano via interi Terreni, troppo forti per un mazzo
    // da principianti), sostituiti da Dian Keto la Maestra delle Cure, un
    // semplice recupero di Life Points.
    const STARTER_DECK_MAIN = [
        { id: 15, qty: 2 },  // Maledizione del Drago — Lv5, 2000 ATK
        { id: 13, qty: 2 }, // Teschio Evocato — Lv6, 2500 ATK
        { id: 317, qty: 1 }, // Uomo Giudice — Lv6, 2200 ATK
        { id: 16, qty: 3 }, { id: 502, qty: 2 }, { id: 24, qty: 2 }, { id: 4, qty: 2 },
        { id: 237, qty: 2 }, { id: 261, qty: 2 }, { id: 391, qty: 2 }, { id: 27, qty: 2 },
        { id: 25, qty: 2 }, { id: 23, qty: 1 }, { id: 22, qty: 2 }, { id: 11, qty: 1 }, { id: 28, qty: 1 },
        { id: 546, qty: 1 }, { id: 35, qty: 1 }, { id: 36, qty: 2 }, { id: 37, qty: 1 }, { id: 243, qty: 2 }, { id: 8, qty: 1 },
        { id: 382, qty: 2 }, { id: 10, qty: 2 }, { id: 40, qty: 2 }
    ];

    function makeDeckId() {
        return 'deck_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8);
    }

    /**
     * Il mazzo con cui ogni nuovo giocatore parte è il vero Starter Deck
     * di Yugi (SDY, 2002 — vedi js/data/starter-structure-decks.js): 50
     * carte reali, non un mazzo di ripiego inventato — su richiesta
     * esplicita, per iniziare con lo stesso mazzo "storico" di Yugi Muto.
     * Copiato qui come deck PERSONALE del giocatore (indipendente dal
     * possesso del pacchetto lato Negozio, gestito a parte da
     * ownsPack/addOwnedPack): se per qualche motivo quel file non fosse
     * caricato, ripiega sul vecchio STARTER_DECK_MAIN qui sopra invece di
     * lasciare il giocatore senza alcun mazzo.
     */
    /** Il pacchetto che fa da mazzo iniziale quando il giocatore non ne sceglie uno. */
    const DEFAULT_STARTER_PACK = 'starter_sdy_yugi';

    /**
     * Il mazzo con cui comincia un giocatore nuovo.
     *
     * `packId` arriva dalla scelta fatta all'inizio (vedi
     * js/ui/onboarding.js: il nonno di Yugi fa scegliere fra il mazzo di
     * Yugi e quello di Kaiba). Senza, vale quello di Yugi come è sempre
     * stato — così ogni altro chiamante di createNew() resta invariato.
     */
    function makeStarterDeck(packId) {
        const voluto = packId || DEFAULT_STARTER_PACK;
        let pack = null;
        if (typeof starterStructureDeckDatabase !== 'undefined') {
            pack = starterStructureDeckDatabase.find((d) => d.packId === voluto)
                // Un packId sconosciuto non deve lasciare il giocatore
                // senza carte: si ricade sul mazzo di sempre.
                || starterStructureDeckDatabase.find((d) => d.packId === DEFAULT_STARTER_PACK);
        }
        return {
            id: makeDeckId(),
            name: pack ? pack.name : 'Mazzo Iniziale',
            main: (pack ? pack.main : STARTER_DECK_MAIN).map((e) => ({ ...e })),
            extra: (pack && pack.extra ? pack.extra : []).map((e) => ({ ...e })),
            updatedAt: Date.now(),
            /** Da quale pacchetto viene: serve a segnarlo come posseduto (vedi createNew). */
            fromPackId: pack ? pack.packId : null
        };
    }

    function readRaw() {
        try {
            const raw = localStorage.getItem(SAVE_KEY);
            return raw ? JSON.parse(raw) : null;
        } catch (e) {
            return null;
        }
    }

    function writeRaw(data) {
        try {
            localStorage.setItem(SAVE_KEY, JSON.stringify(data));
        } catch (e) { /* storage pieno o non disponibile: niente da fare */ }
        // Backup resiliente su storage nativo, SOLO dentro l'APK — vedi
        // js/native/native-save-backup.js (no-op su web/pagine che non
        // lo caricano). Fire-and-forget: non condiziona in alcun modo
        // questa funzione, che resta sincrona come il resto del motore
        // si aspetta.
        if (window.NativeSaveBackup) NativeSaveBackup.mirror(data);
    }

    /**
     * Se non esiste ancora un salvataggio unificato ma esistono dati sotto
     * le VECCHIE chiavi separate (deck e/o record), li raccoglie in un
     * nuovo salvataggio invece di farli sparire. Ritorna null se non c'era
     * proprio nulla da migrare (giocatore davvero nuovo).
     */
    function migrateLegacyIfNeeded() {
        let legacyDecks = [];
        try {
            const raw = localStorage.getItem(LEGACY_DECKS_KEY);
            if (raw) legacyDecks = JSON.parse(raw) || [];
        } catch (e) { /* noop */ }

        const legacyRecords = {};
        let hasLegacyRecords = false;
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && key.indexOf(LEGACY_RECORD_PREFIX) === 0) {
                try {
                    const record = JSON.parse(localStorage.getItem(key));
                    if (record && (record.wins || record.losses)) {
                        legacyRecords[key.slice(LEGACY_RECORD_PREFIX.length)] = record;
                        hasLegacyRecords = true;
                    }
                } catch (e) { /* noop */ }
            }
        }

        if (legacyDecks.length === 0 && !hasLegacyRecords) return null;

        const migrated = {
            player: { name: 'Giocatore', lastSaved: new Date().toISOString() },
            decks: legacyDecks.length > 0 ? legacyDecks : [makeStarterDeck()],
            records: legacyRecords,
            currency: makeDefaultCurrency(),
            ownedPacks: [],
            challenges: {}
        };
        writeRaw(migrated);
        return migrated;
    }

    // Valute del giocatore. Ognuna apre una porta DIVERSA del Negozio, e
    // nessuna sostituisce le altre — è questo a tenere in piedi
    // l'economia, altrimenti basterebbe accumulare una valuta sola e
    // tutto il resto diventerebbe superfluo:
    //   credits         — si guadagnano ovunque; comprano le carte del
    //                     giorno e le buste della settimana;
    //   starChips       — quasi solo dai tornei (soprattutto il Regno dei
    //                     Duellanti); comprano SOLO gli Starter/Structure
    //                     Deck, che non si possono avere coi crediti;
    //   locatorCards    — soprattutto da Battle City; comprano SOLO la
    //                     busta Leggendaria;
    //   millenniumCards — soprattutto dal Torneo Kaiba, rarissime dai
    //                     duelli liberi; comprano la carta RARA del giorno
    //                     a colpo sicuro, saltando la casualità delle
    //                     buste (è il "pity system" del gioco).
    // Tutti i salvataggi, anche quelli creati prima dell'introduzione di
    // una di queste voci, vengono retrocompatibilizzati da load() così da
    // non perdere mai il resto dei dati.
    function makeDefaultCurrency() {
        return { credits: 0, starChips: 0, locatorCards: 0, millenniumCards: 0 };
    }

    function load() {
        let save = readRaw();
        if (!save) save = migrateLegacyIfNeeded();
        if (!save) return save;
        let dirty = false;
        if (!save.currency) { save.currency = makeDefaultCurrency(); dirty = true; }
        // Backfill delle SINGOLE voci, non solo dell'oggetto intero: un
        // salvataggio creato prima che esistesse una valuta ha già
        // `currency`, quindi il controllo qui sopra non scatterebbe mai e
        // la voce nuova resterebbe undefined per sempre (rompendo ogni
        // somma che la tocca). Vale per millenniumCards, e varrà da sé per
        // qualunque valuta futura.
        Object.keys(makeDefaultCurrency()).forEach((voce) => {
            if (typeof save.currency[voce] !== 'number') { save.currency[voce] = 0; dirty = true; }
        });
        // Starter/Structure Deck posseduti (js/data/starter-structure-decks.js):
        // array di packId, vuoto finché il Negozio non vende davvero
        // qualcosa — vedi ownsPack/addOwnedPack qui sotto.
        if (!save.ownedPacks) { save.ownedPacks = []; dirty = true; }
        // Mazzo "corrente" scelto dal giocatore per i Duelli (prima non
        // esisteva: si usava sempre e solo decks[0], senza alcun modo di
        // sceglierne un altro) — se manca o punta a un deck non più
        // esistente (es. cancellato), ripiega sul primo disponibile.
        if (save.activeDeckId == null || !save.decks.some((d) => d.id === save.activeDeckId)) {
            save.activeDeckId = save.decks[0] ? save.decks[0].id : null;
            dirty = true;
        }
        // Progresso Sfide (js/data/challenges-db.js + js/challenges/challenge-tracker.js):
        // { [challengeId]: { count, completed, completedAt } } — assente in
        // ogni salvataggio creato prima di questa funzionalità.
        if (!save.challenges) { save.challenges = {}; dirty = true; }
        // Missioni a rotazione (giornaliere/settimanali): stesso backfill
        // retrocompatibile di ogni campo aggiunto dopo — un salvataggio
        // creato prima non le ha, e senza questa riga ogni lettura
        // troverebbe undefined.
        if (!save.missions) { save.missions = {}; dirty = true; }
        // Duellanti sbloccati per il Duello Libero (vedi
        // js/data/character-unlocks.js). Contiene SOLO quelli guadagnati
        // vincendo: i due di partenza stanno nel codice, non qui, così un
        // salvataggio creato prima di questa regola non si ritrova il
        // Duello Libero vuoto.
        if (!Array.isArray(save.unlockedCharacters)) { save.unlockedCharacters = []; dirty = true; }
        // Progresso Tornei (es. torneo-regno-duellanti.html): un oggetto
        // per torneo, chiave = id del torneo ('duelistKingdom', in
        // futuro 'battleCity' ecc.) — vedi getTournamentState/
        // setTournamentState più sotto. Ogni torneo definisce da sé la
        // forma del proprio stato, questo file non la conosce.
        if (!save.tournaments) { save.tournaments = {}; dirty = true; }
        // Statistiche PERSISTENTI per torneo ({ [tournamentId]: { attempts,
        // completions } }) — a differenza di save.tournaments qui sopra
        // (la partita IN CORSO, azzerata da Abbandona/Ricomincia), questo
        // contatore non viene mai toccato da un reset: un torneo è
        // liberamente ripetibile quante volte si vuole (nessun limite), ma
        // il numero di tentativi/completamenti resta comunque visibile.
        if (!save.tournamentStats) { save.tournamentStats = {}; dirty = true; }
        // Oggetti del Millennio vinti nei tornei ({ [itemId]: { wonAt,
        // fromCharacter, tournamentId } }) - vedi getMillenniumItems piu'
        // sotto. Assente in ogni salvataggio precedente a questa
        // funzionalita': si parte semplicemente senza nessuno.
        if (!save.millenniumItems) { save.millenniumItems = {}; dirty = true; }
        // Avanzamento della Modalita' Storia ({ [campaignId]: stato }),
        // contenitore generico come save.tournaments - vedi
        // getStoryState piu' sotto. Assente in ogni salvataggio
        // precedente alla Modalita' Storia.
        if (!save.story) { save.story = {}; dirty = true; }
        // Collezione: quante copie di ciascuna carta il giocatore POSSIEDE
        // davvero ({ [cardId]: copie }). Una carta assente vale 0 copie,
        // quindi un giocatore nuovo parte senza nulla e l'oggetto resta
        // piccolo. Vedi getOwnedCount/addOwnedCards più sotto.
        // Assente = salvataggio precedente a questa funzionalità: gli si
        // accreditano le carte dei mazzi che ha GIÀ, altrimenti dopo
        // l'aggiornamento si ritroverebbe ogni suo mazzo inutilizzabile
        // (0 copie di tutto) senza aver fatto nulla di sbagliato.
        if (!save.collection) {
            save.collection = {};
            (save.decks || []).forEach((deck) => {
                const fromDeck = collectionFromDeck(deck);
                Object.keys(fromDeck).forEach((id) => {
                    save.collection[id] = Math.max(save.collection[id] || 0, fromDeck[id]);
                });
            });
            dirty = true;
        }
        if (dirty) writeRaw(save);
        return save;
    }

    function hasSave() {
        return !!load();
    }

    /**
     * `starterPackId` (facoltativo): quale Starter Deck il giocatore ha
     * scelto all'inizio, fra quelli proposti dal nonno di Yugi (vedi
     * js/ui/onboarding.js). Omesso, vale il mazzo di Yugi come sempre.
     */
    function createNew(playerName, starterPackId) {
        const starterDeck = makeStarterDeck(starterPackId);
        const save = {
            player: { name: (playerName || '').trim() || 'Giocatore', lastSaved: new Date().toISOString() },
            decks: [starterDeck],
            activeDeckId: starterDeck.id,
            records: {},
            currency: makeDefaultCurrency(),
            // Il mazzo iniziale è a tutti gli effetti un pacchetto
            // POSSEDUTO: senza segnarlo qui, Creazione Deck lo mostrerebbe
            // ancora col lucchetto e il Negozio proverebbe a rivendere al
            // giocatore le carte che ha già in mano (vedi ownsPack).
            ownedPacks: starterDeck.fromPackId ? [starterDeck.fromPackId] : [],
            challenges: {},
            tournaments: {},
            tournamentStats: {},
        millenniumItems: {},
        story: {},
            // Un giocatore nuovo non possiede NESSUNA carta, tranne quelle
            // del mazzo iniziale che il gioco stesso gli mette in mano
            // qui sopra: senza queste non potrebbe costruire nemmeno un
            // mazzo legale, quindi non potrebbe giocare né guadagnare
            // crediti per comprarne — sarebbe bloccato in partenza.
            collection: collectionFromDeck(starterDeck)
        };
        writeRaw(save);
        return save;
    }

    /** { [cardId]: copie } a partire dalle liste main/extra di un mazzo. */
    function collectionFromDeck(deck) {
        const collection = {};
        [...((deck && deck.main) || []), ...((deck && deck.extra) || [])].forEach((entry) => {
            collection[entry.id] = Math.min(CARD_COPY_CAP, (collection[entry.id] || 0) + (entry.qty || 0));
        });
        return collection;
    }

    function touch(save) {
        save.player = save.player || {};
        save.player.lastSaved = new Date().toISOString();
        writeRaw(save);
        return save;
    }

    function getDecks() {
        const save = load();
        return save ? save.decks : [];
    }

    function setDecks(decks) {
        const save = load() || createNew();
        save.decks = decks;
        touch(save);
    }

    /** Id del mazzo scelto dal giocatore come "corrente" per i Duelli. */
    function getActiveDeckId() {
        const save = load();
        return save ? save.activeDeckId : null;
    }

    /** Il mazzo "corrente" per intero (oggetto {id, name, main, extra, ...}), o null se il giocatore non ha ancora nessun deck. */
    function getActiveDeck() {
        const save = load();
        if (!save) return null;
        return save.decks.find((d) => d.id === save.activeDeckId) || save.decks[0] || null;
    }

    /** Imposta quale mazzo salvato usare nei Duelli — deckId deve esistere tra SaveManager.getDecks(). */
    function setActiveDeckId(deckId) {
        const save = load() || createNew();
        if (!save.decks.some((d) => d.id === deckId)) return false;
        save.activeDeckId = deckId;
        touch(save);
        return true;
    }

    function getRecord(characterId) {
        const save = load();
        return (save && save.records && save.records[characterId]) || { wins: 0, losses: 0 };
    }

    function setRecord(characterId, record) {
        const save = load() || createNew();
        save.records = save.records || {};
        save.records[characterId] = record;
        touch(save);
    }

    function getAllRecords() {
        const save = load();
        return (save && save.records) || {};
    }

    /** Progresso di UNA sfida (js/data/challenges-db.js) — { count, completed, completedAt }, mai null. */
    function getChallengeProgress(challengeId) {
        const save = load();
        return (save && save.challenges && save.challenges[challengeId]) || { count: 0, completed: false, completedAt: null };
    }

    function setChallengeProgress(challengeId, progress) {
        const save = load() || createNew();
        save.challenges = save.challenges || {};
        save.challenges[challengeId] = progress;
        touch(save);
    }

    // ================================================================
    // DUELLANTI SBLOCCATI
    // ================================================================
    // Un elenco di id e non una mappa id->qualcosa: l'unica informazione
    // è "c'è o non c'è". Quando (e come) sia stato sbloccato lo racconta
    // già il record V/S del personaggio, che esiste da sempre.

    /** Gli id guadagnati vincendo. NON comprende i due di partenza — quelli li sa js/data/character-unlocks.js. */
    function getUnlockedCharacters() {
        const save = load();
        return (save && Array.isArray(save.unlockedCharacters)) ? save.unlockedCharacters.slice() : [];
    }

    function unlockCharacter(characterId) {
        if (!characterId) return;
        const save = load() || createNew();
        if (!Array.isArray(save.unlockedCharacters)) save.unlockedCharacters = [];
        if (save.unlockedCharacters.indexOf(characterId) !== -1) return;
        save.unlockedCharacters.push(characterId);
        touch(save);
    }

    function getAllChallengeProgress() {
        const save = load();
        return (save && save.challenges) || {};
    }

    // ================================================================
    // MISSIONI A ROTAZIONE (giornaliere e settimanali)
    // ================================================================
    // Sono un'altra cosa dalle Sfide, e vivono in un contenitore a parte
    // apposta. Una Sfida è un traguardo UNA TANTUM: si completa e resta
    // completata per sempre, quindi il suo progresso si accumula in
    // `save.challenges` senza scadere mai. Una missione invece appartiene
    // a un PERIODO: quando il giorno (o la settimana) cambia, quella
    // vecchia non esiste più e il conto riparte.
    //
    // Per questo il contenitore tiene la CHIAVE del periodo insieme al
    // progresso: `{ chiave: '2026-09-22', progresso: { [id]: {...} } }`.
    // Cambiata la chiave, il progresso si butta — così il salvataggio non
    // cresce all'infinito accumulando un blocco per ogni giorno passato,
    // che è quello che sarebbe successo usando `save.challenges` con un id
    // composito tipo `mission:x:2026-09-22`.
    function contenitoreMissioni(save, ambito) {
        save.missions = save.missions || {};
        save.missions[ambito] = save.missions[ambito] || { chiave: null, progresso: {} };
        return save.missions[ambito];
    }

    /**
     * Il progresso delle missioni del periodo corrente, azzerato da sé se
     * il periodo è cambiato. `ambito` è 'daily' o 'weekly', `chiave` la
     * chiave del periodo secondo il SERVER (js/cloud/server-date.js) — mai
     * l'orologio del dispositivo, che si può spostare a piacere.
     */
    function getMissionProgress(ambito, chiave) {
        const save = load();
        const c = (save && save.missions && save.missions[ambito]) || null;
        if (!c || c.chiave !== chiave) return {};
        return c.progresso || {};
    }

    function setMissionProgress(ambito, chiave, missionId, progress) {
        const save = load() || createNew();
        const c = contenitoreMissioni(save, ambito);
        // Periodo cambiato: si riparte da zero, senza portarsi dietro
        // niente di quello vecchio.
        if (c.chiave !== chiave) { c.chiave = chiave; c.progresso = {}; }
        c.progresso[missionId] = progress;
        touch(save);
    }

    /** Segna quali missioni sono state SORTEGGIATE per questo periodo, così la pagina non deve ripescarle a ogni apertura. */
    function setMissionRoster(ambito, chiave, ids) {
        const save = load() || createNew();
        const c = contenitoreMissioni(save, ambito);
        if (c.chiave !== chiave) { c.chiave = chiave; c.progresso = {}; }
        // Un roster non valido non deve far cadere la pagina: si cancella
        // e basta, e al prossimo giro verrà risorteggiato.
        c.roster = Array.isArray(ids) ? ids.slice() : null;
        touch(save);
    }

    function getMissionRoster(ambito, chiave) {
        const save = load();
        const c = (save && save.missions && save.missions[ambito]) || null;
        return (c && c.chiave === chiave && Array.isArray(c.roster)) ? c.roster.slice() : null;
    }

    function getPlayerName() {
        const save = load();
        return (save && save.player && save.player.name) || 'Giocatore';
    }

    function setPlayerName(name) {
        const save = load() || createNew();
        save.player = save.player || {};
        save.player.name = (name || '').trim() || 'Giocatore';
        touch(save);
        return save.player.name;
    }

    // ================================================================
    // Collezione: quante copie di ciascuna carta il giocatore possiede.
    // ================================================================
    /** Tetto massimo di copie possedute della stessa carta. */
    const CARD_COPY_CAP = 99;

    /**
     * Un amministratore possiede SEMPRE tutto al massimo, senza che il
     * suo salvataggio debba contenere una riga per ognuna delle oltre
     * mille carte: è una regola calcolata al volo, non un dato scritto.
     * Così non c'è nulla da rigenerare quando si aggiungono carte nuove,
     * e un account che smette di essere admin torna alla sua collezione
     * reale invece di restare con un salvataggio "gonfiato".
     */
    function isAdminUser() {
        return !!(window.CloudSync && typeof CloudSync.isAdmin === 'function' && CloudSync.isAdmin());
    }

    /** Copie possedute di una carta (0 se non la si possiede affatto). */
    function getOwnedCount(cardId) {
        if (isAdminUser()) return CARD_COPY_CAP;
        const save = load();
        if (!save || !save.collection) return 0;
        const n = Number(save.collection[cardId]);
        return Number.isFinite(n) && n > 0 ? Math.min(CARD_COPY_CAP, n) : 0;
    }

    /**
     * Aggiunge (o toglie, con qty negativa) copie di una carta, sempre
     * entro 0..CARD_COPY_CAP. È il punto da cui passano il Negozio
     * futuro e l'acquisizione di uno Starter/Structure Deck.
     */
    function addOwnedCards(cardId, qty) {
        const save = load() || createNew();
        save.collection = save.collection || {};
        const current = Number(save.collection[cardId]) || 0;
        const next = Math.max(0, Math.min(CARD_COPY_CAP, current + (Number(qty) || 0)));
        if (next === 0) delete save.collection[cardId];
        else save.collection[cardId] = next;
        touch(save);
        return next;
    }

    /** Aggiunge in blocco tutte le carte di un mazzo/pacchetto. */
    function addOwnedCardsFromDeck(deck) {
        const save = load() || createNew();
        save.collection = save.collection || {};
        [...((deck && deck.main) || []), ...((deck && deck.extra) || [])].forEach((entry) => {
            const current = Number(save.collection[entry.id]) || 0;
            save.collection[entry.id] = Math.max(0, Math.min(CARD_COPY_CAP, current + (entry.qty || 0)));
        });
        touch(save);
        return save.collection;
    }

    function getCollection() {
        const save = load();
        return (save && save.collection) || {};
    }

    function getCurrency() {
        const save = load();
        return (save && save.currency) || makeDefaultCurrency();
    }

    /** Somma (o sottrae, con amount negativo) una quantità a una valuta: 'credits' | 'starChips' | 'locatorCards'. */
    function addCurrency(type, amount) {
        const save = load() || createNew();
        save.currency = save.currency || makeDefaultCurrency();
        save.currency[type] = Math.max(0, (save.currency[type] || 0) + amount);
        touch(save);
        return save.currency;
    }

    /**
     * Stato persistente di UN torneo (es. 'duelistKingdom') — ogni pagina
     * torneo definisce da sola la FORMA del proprio oggetto stato (mappa
     * percorsa, passo attuale, ecc.), questo file si limita a
     * leggerlo/scriverlo sotto save.tournaments[tournamentId] esattamente
     * come fa per un salvataggio intero, senza validarne il contenuto.
     * Torna null se quel torneo non è mai stato iniziato (nessuna
     * partita in corso da riprendere).
     */
    function getTournamentState(tournamentId) {
        const save = load();
        return (save && save.tournaments && save.tournaments[tournamentId]) || null;
    }

    /** Sovrascrive lo stato di UN torneo — vedi getTournamentState qui sopra. `state` null/undefined lo azzera (torneo abbandonato/ricominciato). */
    function setTournamentState(tournamentId, state) {
        const save = load() || createNew();
        save.tournaments = save.tournaments || {};
        if (state == null) {
            delete save.tournaments[tournamentId];
        } else {
            save.tournaments[tournamentId] = state;
        }
        touch(save);
        return state;
    }

    /** Statistiche persistenti di UN torneo: { attempts, completions }, mai null — sopravvivono ad Abbandona/Ricomincia (vedi il commento su save.tournamentStats in load()). */
    function getTournamentStats(tournamentId) {
        const save = load();
        return (save && save.tournamentStats && save.tournamentStats[tournamentId]) || { attempts: 0, completions: 0 };
    }

    /** Incrementa di 1 il contatore 'attempts' o 'completions' di UN torneo e torna la nuova coppia {attempts, completions}. */
    function incrementTournamentStat(tournamentId, statName) {
        const save = load() || createNew();
        save.tournamentStats = save.tournamentStats || {};
        const current = save.tournamentStats[tournamentId] || { attempts: 0, completions: 0 };
        current[statName] = (current[statName] || 0) + 1;
        save.tournamentStats[tournamentId] = current;
        touch(save);
        return current;
    }

    /**
     * Avanzamento di UNA campagna della Modalità Storia (storia.html):
     * { [campaignId]: <forma libera decisa dalla campagna> }, null se
     * non è mai stata iniziata.
     *
     * Contenitore generico come save.tournaments, e per lo stesso motivo:
     * questo file non sa (e non deve sapere) com'è fatto dentro. Vive in
     * un campo SUO e non dentro save.tournaments perché una campagna e un
     * torneo non sono la stessa cosa e non devono potersi pestare i piedi
     * per una collisione di id.
     */
    function getStoryState(campaignId) {
        const save = load();
        return (save && save.story && save.story[campaignId]) || null;
    }

    /** Sovrascrive l'avanzamento di UNA campagna. `state` null la cancella (ricominciare da capo). */
    function setStoryState(campaignId, state) {
        const save = load() || createNew();
        save.story = save.story || {};
        if (state == null) {
            delete save.story[campaignId];
        } else {
            save.story[campaignId] = state;
        }
        touch(save);
    }

    /**
     * Oggetti del Millennio posseduti: { [itemId]: { wonAt, fromCharacter,
     * tournamentId } }.
     *
     * NON sono una valuta e non passano da addCurrency: ognuno esiste in
     * copia unica, quindi la domanda che si fa il gioco non e' "quanti ne
     * ho" ma "ce l'ho". Per questo la chiave e' l'id dell'oggetto e il
     * valore racconta DOVE l'hai preso — un oggetto vinto mesi prima deve
     * poter ancora dire da chi, come ogni altro premio di questo gioco.
     */
    function getMillenniumItems() {
        const save = load();
        return (save && save.millenniumItems) || {};
    }

    /** Vero se quell'Oggetto del Millennio e' gia' stato vinto. */
    function ownsMillenniumItem(itemId) {
        return !!getMillenniumItems()[itemId];
    }

    /**
     * Registra un Oggetto del Millennio appena vinto. Torna false se era
     * gia' posseduto, senza sovrascrivere: il primo ritrovamento e' quello
     * vero, e una seconda registrazione ne perderebbe la storia.
     */
    function addMillenniumItem(itemId, info) {
        const save = load() || createNew();
        save.millenniumItems = save.millenniumItems || {};
        if (save.millenniumItems[itemId]) return false;
        save.millenniumItems[itemId] = Object.assign({ wonAt: new Date().toISOString() }, info || {});
        touch(save);
        return true;
    }

    /**
     * Contatori dell'economia che si azzerano ogni giorno — oggi il numero
     * di duelli vinti nella giornata, che serve al bonus "prima vittoria
     * del giorno" e ai rendimenti decrescenti (vedi js/economy/rewards.js).
     * `dayKey` è la giornata a cui si riferiscono, in UTC e presa dal
     * SERVER (js/cloud/server-date.js): appena cambia, i contatori
     * ripartono da zero da soli, senza bisogno di alcuna pulizia
     * programmata. Chi legge passa il proprio dayKey, così questo file non
     * ha bisogno di sapere da dove arrivi la data.
     */
    function getDailyEconomy(dayKey) {
        const save = load();
        const d = (save && save.dailyEconomy) || null;
        if (!d || d.dayKey !== dayKey) return { dayKey: dayKey, wins: 0 };
        return d;
    }

    /** Registra una vittoria nella giornata `dayKey` e torna i contatori aggiornati. */
    function recordDailyWin(dayKey) {
        const save = load() || createNew();
        const current = (save.dailyEconomy && save.dailyEconomy.dayKey === dayKey)
            ? save.dailyEconomy
            : { dayKey: dayKey, wins: 0 };
        current.wins += 1;
        save.dailyEconomy = current;
        touch(save);
        return current;
    }

    function getOwnedPacks() {
        const save = load();
        return (save && save.ownedPacks) || [];
    }

    /**
     * L'UNICA risposta a "il giocatore ha questo pacchetto?". La danno
     * sia Creazione Deck (per decidere se si può clonare) sia il Negozio
     * (per decidere se si può comprare): devono per forza essere
     * d'accordo.
     *
     * Qui c'era un blocco che considerava OGNI Starter/Structure già
     * posseduto, messo quando il Negozio non li vendeva ancora e
     * accompagnato dalla nota "rimuovere quando torneranno ad essere
     * acquistabili sul serio". Quel momento è arrivato — il Negozio ora
     * chiama davvero addOwnedPack — e finché il blocco è rimasto le due
     * schermate si contraddicevano: Creazione Deck mostrava ogni mazzo
     * come già tuo e clonabile gratis, mentre il Negozio te lo vendeva
     * lo stesso per Stelle e Crediti, perché leggeva l'elenco grezzo
     * invece di passare da qui.
     */
    function ownsPack(packId) {
        return getOwnedPacks().indexOf(packId) !== -1;
    }

    /**
     * Segna uno Starter/Structure Deck (js/data/starter-structure-decks.js)
     * come posseduto — verrà chiamata dal Negozio quando l'acquisto sarà
     * implementato davvero. Acquisire un pacchetto significa anche
     * RICEVERNE LE CARTE: il contatore di copie possedute viene alimentato
     * qui, così non c'è modo di "possedere" un pacchetto senza avere le
     * carte che contiene (e il Negozio futuro non dovrà ricordarsene).
     */
    function addOwnedPack(packId) {
        const save = load() || createNew();
        save.ownedPacks = save.ownedPacks || [];
        const isNew = save.ownedPacks.indexOf(packId) === -1;
        if (isNew) save.ownedPacks.push(packId);
        touch(save);
        if (isNew && typeof starterStructureDeckDatabase !== 'undefined') {
            const pack = starterStructureDeckDatabase.find((p) => p.packId === packId);
            if (pack) addOwnedCardsFromDeck(pack);
        }
        return save.ownedPacks;
    }

    function exportToFile() {
        const save = load();
        if (!save) return false;
        const blob = new Blob([JSON.stringify(save, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = EXPORT_FILENAME;
        document.body.appendChild(a);
        a.click();
        a.remove();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
        return true;
    }

    /**
     * Valida e applica un salvataggio ESTERNO (da un file importato, o da
     * js/cloud/cloud-sync.js dopo aver scaricato quello sincronizzato) come
     * salvataggio attivo — stessa logica di backfill/retrocompatibilità
     * di load() qui sopra, così un salvataggio esterno più vecchio (es.
     * senza ancora activeDeckId) viene "riparato" allo stesso modo.
     * Lancia un Error con messaggio parlante se `parsed` non è un
     * salvataggio valido, così chi chiama può mostrarlo com'è.
     */
    function applyExternalSave(parsed) {
        if (!parsed || typeof parsed !== 'object' || !Array.isArray(parsed.decks)) {
            throw new Error('Il file non è un salvataggio valido.');
        }
        parsed.player = parsed.player || { name: 'Giocatore' };
        parsed.player.lastSaved = new Date().toISOString();
        parsed.records = parsed.records || {};
        parsed.currency = parsed.currency || makeDefaultCurrency();
        parsed.ownedPacks = parsed.ownedPacks || [];
        parsed.challenges = parsed.challenges || {};
        parsed.missions = parsed.missions || {};
        parsed.unlockedCharacters = Array.isArray(parsed.unlockedCharacters) ? parsed.unlockedCharacters : [];
        parsed.tournaments = parsed.tournaments || {};
        parsed.tournamentStats = parsed.tournamentStats || {};
        parsed.millenniumItems = parsed.millenniumItems || {};
        parsed.story = parsed.story || {};
        // Collezione assente = salvataggio creato prima che le copie
        // possedute esistessero: gli si accreditano le carte dei mazzi che
        // ha già, altrimenti si ritroverebbe i propri mazzi tutti
        // inutilizzabili (0 copie di tutto) dopo l'aggiornamento.
        if (!parsed.collection) {
            parsed.collection = {};
            (parsed.decks || []).forEach((deck) => {
                const fromDeck = collectionFromDeck(deck);
                Object.keys(fromDeck).forEach((id) => {
                    parsed.collection[id] = Math.max(parsed.collection[id] || 0, fromDeck[id]);
                });
            });
        }
        if (parsed.activeDeckId == null || !parsed.decks.some((d) => d.id === parsed.activeDeckId)) {
            parsed.activeDeckId = parsed.decks[0] ? parsed.decks[0].id : null;
        }
        writeRaw(parsed);
        return parsed;
    }

    /** Legge un file scelto dall'utente (es. da un <input type="file">) e lo rende il salvataggio attivo. */
    function importFromFile(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => {
                try {
                    resolve(applyExternalSave(JSON.parse(reader.result)));
                } catch (e) {
                    reject(e instanceof SyntaxError ? new Error('Il file non è un JSON valido.') : e);
                }
            };
            reader.onerror = () => reject(new Error('Impossibile leggere il file.'));
            reader.readAsText(file);
        });
    }

    function deleteSave() {
        try { localStorage.removeItem(SAVE_KEY); } catch (e) { /* noop */ }
    }

    window.SaveManager = {
        hasSave: hasSave,
        load: load,
        createNew: createNew,
        touch: touch,
        getDecks: getDecks,
        setDecks: setDecks,
        getActiveDeckId: getActiveDeckId,
        getActiveDeck: getActiveDeck,
        setActiveDeckId: setActiveDeckId,
        getRecord: getRecord,
        setRecord: setRecord,
        getAllRecords: getAllRecords,
        getChallengeProgress: getChallengeProgress,
        setChallengeProgress: setChallengeProgress,
        getAllChallengeProgress: getAllChallengeProgress,
        // Duellanti sbloccati per il Duello Libero.
        getUnlockedCharacters: getUnlockedCharacters,
        unlockCharacter: unlockCharacter,
        // Missioni a rotazione: progresso e roster del periodo corrente.
        getMissionProgress: getMissionProgress,
        setMissionProgress: setMissionProgress,
        getMissionRoster: getMissionRoster,
        setMissionRoster: setMissionRoster,
        getPlayerName: getPlayerName,
        setPlayerName: setPlayerName,
        getCurrency: getCurrency,
        addCurrency: addCurrency,
        CARD_COPY_CAP: CARD_COPY_CAP,
        getOwnedCount: getOwnedCount,
        addOwnedCards: addOwnedCards,
        addOwnedCardsFromDeck: addOwnedCardsFromDeck,
        getCollection: getCollection,
        getTournamentState: getTournamentState,
        setTournamentState: setTournamentState,
        getTournamentStats: getTournamentStats,
        getStoryState: getStoryState,
        setStoryState: setStoryState,
        getMillenniumItems: getMillenniumItems,
        ownsMillenniumItem: ownsMillenniumItem,
        addMillenniumItem: addMillenniumItem,
        incrementTournamentStat: incrementTournamentStat,
        getDailyEconomy: getDailyEconomy,
        recordDailyWin: recordDailyWin,
        getOwnedPacks: getOwnedPacks,
        ownsPack: ownsPack,
        addOwnedPack: addOwnedPack,
        exportToFile: exportToFile,
        importFromFile: importFromFile,
        applyExternalSave: applyExternalSave,
        deleteSave: deleteSave,
        makeStarterDeck: makeStarterDeck
    };
})();
