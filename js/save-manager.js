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
    // mazzo da torneo — solo 2 mostri a 5 stelle (Maledizione del Drago,
    // l'unico Livello più alto qui dentro), il resto mostri a 4 stelle o
    // meno (Evocazione libera, senza Tributi) più Magie/Trappole di
    // supporto. Chi vuole un mazzo più forte se lo costruisce da sé in
    // Creazione Deck: questo serve solo a non partire a mani vuote.
    const STARTER_DECK_MAIN = [
        { id: 15, qty: 2 },  // Maledizione del Drago — Lv5, unico mostro sopra le 4 stelle
        { id: 16, qty: 3 }, { id: 502, qty: 2 }, { id: 24, qty: 2 }, { id: 4, qty: 2 },
        { id: 237, qty: 2 }, { id: 261, qty: 2 }, { id: 391, qty: 2 }, { id: 27, qty: 2 },
        { id: 25, qty: 2 }, { id: 23, qty: 1 }, { id: 22, qty: 2 }, { id: 11, qty: 1 }, { id: 28, qty: 1 },
        { id: 7, qty: 1 }, { id: 35, qty: 1 }, { id: 36, qty: 2 }, { id: 37, qty: 1 }, { id: 243, qty: 2 }, { id: 8, qty: 1 },
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
            records: legacyRecords
        };
        writeRaw(migrated);
        return migrated;
    }

    function load() {
        const existing = readRaw();
        if (existing) return existing;
        return migrateLegacyIfNeeded();
    }

    function hasSave() {
        return !!load();
    }

    function createNew(playerName) {
        const save = {
            player: { name: (playerName || '').trim() || 'Giocatore', lastSaved: new Date().toISOString() },
            decks: [makeStarterDeck()],
            records: {}
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
        getRecord: getRecord,
        setRecord: setRecord,
        getAllRecords: getAllRecords,
        getPlayerName: getPlayerName,
        setPlayerName: setPlayerName,
        exportToFile: exportToFile,
        importFromFile: importFromFile,
        deleteSave: deleteSave,
        makeStarterDeck: makeStarterDeck
    };
})();
