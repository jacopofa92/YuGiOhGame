/**
 * save-manager.js — Salvataggio locale unificato del giocatore.
 * =====================================================================
 * Un solo oggetto JSON, in localStorage sotto SAVE_KEY, raccoglie tutto
 * quello che prima viveva sparso in chiavi separate:
 *   - nome del giocatore + data dell'ultimo salvataggio
 *   - i deck creati (prima in 'duelArenaDecks', vedi creazione-deck.html)
 *   - il record vittorie/sconfitte per personaggio di Duello Libero
 *     (prima in 'duelArenaRecord_<id>', vedi js/characters-db.js)
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

    // Deck iniziale di ogni nuovo giocatore: volutamente MODESTO, non un
    // mazzo da torneo — quasi tutti mostri a 4 stelle o meno (Evocazione
    // libera, senza Tributi), con solo un pugno di mostri da Tributo
    // Livello 5/6 (Maledizione del Drago, Teschio Evocato, Uomo Giudice
    // — questi ultimi due sono i soli sopra i 2000 ATK, fino a 2500, per
    // dare comunque una minaccia credibile senza esagerare) più
    // Magie/Trappole di supporto BASILARI: niente Buco Nero né Raigeki
    // (spazzano via interi Terreni, troppo forti per un mazzo da
    // principianti), sostituiti da Dian Keto la Maestra delle Cure, un
    // semplice recupero di Life Points. Chi vuole un mazzo più forte se
    // lo costruisce da sé in Creazione Deck: questo serve solo a non
    // partire a mani vuote.
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

    function makeStarterDeck() {
        return {
            id: makeDeckId(),
            name: 'Mazzo Iniziale',
            main: STARTER_DECK_MAIN.map((e) => ({ ...e })),
            extra: [],
            updatedAt: Date.now()
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
            ownedPacks: []
        };
        writeRaw(migrated);
        return migrated;
    }

    // Valute del giocatore: crediti, stelle (star chips) e carte locazione
    // (locator cards) — per ora solo accumulabili, la spesa (Negozio) è
    // prevista in futuro. Tutti i salvataggi, anche quelli creati prima
    // dell'introduzione di questo campo, vengono retrocompatibilizzati da
    // load() così da non perdere mai il resto dei dati.
    function makeDefaultCurrency() {
        return { credits: 0, starChips: 0, locatorCards: 0 };
    }

    function load() {
        let save = readRaw();
        if (!save) save = migrateLegacyIfNeeded();
        if (!save) return save;
        let dirty = false;
        if (!save.currency) { save.currency = makeDefaultCurrency(); dirty = true; }
        // Starter/Structure Deck posseduti (js/starter-structure-decks.js):
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
        if (dirty) writeRaw(save);
        return save;
    }

    function hasSave() {
        return !!load();
    }

    function createNew(playerName) {
        const starterDeck = makeStarterDeck();
        const save = {
            player: { name: (playerName || '').trim() || 'Giocatore', lastSaved: new Date().toISOString() },
            decks: [starterDeck],
            activeDeckId: starterDeck.id,
            records: {},
            currency: makeDefaultCurrency(),
            ownedPacks: []
        };
        writeRaw(save);
        return save;
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

    function getOwnedPacks() {
        const save = load();
        return (save && save.ownedPacks) || [];
    }

    function ownsPack(packId) {
        // Gli Starter Deck (js/starter-structure-decks.js, kind: 'starter')
        // sono considerati già sbloccati per ogni giocatore PER ORA,
        // finché il Negozio non li vende davvero — istruzione esplicita
        // dell'utente, separata dagli Structure Deck (kind: 'structure'),
        // che restano bloccati come da comportamento originale finché non
        // risultano davvero posseduti. Rimuovere questo blocco quando gli
        // Starter Deck torneranno ad essere acquistabili sul serio.
        // starterStructureDeckDatabase è dichiarato con const in
        // starter-structure-decks.js: NON diventa window.starterStructureDeckDatabase
        // (un const/let di primo livello non si aggancia mai a window, come
        // gameState in game-flow.js) — va letto come variabile libera,
        // accessibile qui perché entrambi gli script condividono lo stesso
        // scope globale classico.
        if (typeof starterStructureDeckDatabase !== 'undefined') {
            const pack = starterStructureDeckDatabase.find((p) => p.packId === packId);
            if (pack && pack.kind === 'starter') return true;
        }
        return getOwnedPacks().indexOf(packId) !== -1;
    }

    /** Segna uno Starter/Structure Deck (js/starter-structure-decks.js) come posseduto — verrà chiamata dal Negozio quando l'acquisto sarà implementato davvero. */
    function addOwnedPack(packId) {
        const save = load() || createNew();
        save.ownedPacks = save.ownedPacks || [];
        if (save.ownedPacks.indexOf(packId) === -1) save.ownedPacks.push(packId);
        touch(save);
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

    /** Legge un file scelto dall'utente (es. da un <input type="file">) e lo rende il salvataggio attivo. */
    function importFromFile(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => {
                try {
                    const parsed = JSON.parse(reader.result);
                    if (!parsed || typeof parsed !== 'object' || !Array.isArray(parsed.decks)) {
                        reject(new Error('Il file non è un salvataggio valido.'));
                        return;
                    }
                    parsed.player = parsed.player || { name: 'Giocatore' };
                    parsed.player.lastSaved = new Date().toISOString();
                    parsed.records = parsed.records || {};
                    parsed.currency = parsed.currency || makeDefaultCurrency();
                    parsed.ownedPacks = parsed.ownedPacks || [];
                    if (parsed.activeDeckId == null || !parsed.decks.some((d) => d.id === parsed.activeDeckId)) {
                        parsed.activeDeckId = parsed.decks[0] ? parsed.decks[0].id : null;
                    }
                    writeRaw(parsed);
                    resolve(parsed);
                } catch (e) {
                    reject(new Error('Il file non è un JSON valido.'));
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
        getPlayerName: getPlayerName,
        setPlayerName: setPlayerName,
        getCurrency: getCurrency,
        addCurrency: addCurrency,
        getOwnedPacks: getOwnedPacks,
        ownsPack: ownsPack,
        addOwnedPack: addOwnedPack,
        exportToFile: exportToFile,
        importFromFile: importFromFile,
        deleteSave: deleteSave,
        makeStarterDeck: makeStarterDeck
    };
})();
