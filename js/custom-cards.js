/**
 * custom-cards.js — Carte create dall'utente, dati per un futuro Card
 * Maker (nessuna UI qui: solo l'API che una futura schermata "Crea
 * Carta" userà). Stesso pattern di js/save-manager.js: un array JSON in
 * localStorage, niente server (coerente col resto del gioco, che apre i
 * file .html direttamente — vedi il commento in js/cards-db.js).
 *
 * Una carta custom usa ESATTAMENTE lo stesso schema di data/cards.json,
 * con in più gli agganci opzionali alle librerie riutilizzabili:
 *   "effectTemplate": { "name": ..., "params": {...} }  — vedi js/effect-templates.js
 *   "cloneEffectOf": <id di un'altra carta già registrata>
 *   "visualEffect": "glow-oro"                           — vedi js/visual-effects-library.js
 * Il loader in fondo a js/card-effects.js registra automaticamente
 * effectTemplate/cloneEffectOf per QUALUNQUE carta in cardDatabase,
 * comprese queste — una carta custom gioca quindi esattamente come una
 * carta "vera", senza nessun trattamento speciale nel motore.
 *
 * Id riservati: 100000+, così una carta custom non può MAI collidere con
 * le 508 carte base di data/cards.json (assegnato automaticamente da
 * add(), mai scelto da chi chiama).
 */
(function () {
    'use strict';

    const STORAGE_KEY = 'yugioh_custom_cards_v1';
    const ID_BASE = 100000;

    function loadAll() {
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            const parsed = raw ? JSON.parse(raw) : [];
            return Array.isArray(parsed) ? parsed : [];
        } catch (e) {
            console.warn('[CustomCards] localStorage illeggibile, riparto da zero.', e);
            return [];
        }
    }

    function saveAll(cards) {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(cards));
        } catch (e) {
            console.warn('[CustomCards] impossibile salvare in localStorage.', e);
        }
    }

    function nextId(existing) {
        const maxId = existing.reduce((max, c) => Math.max(max, c.id || 0), ID_BASE - 1);
        return maxId + 1;
    }

    /**
     * Aggiunge una carta custom. `cardData` è lo stesso schema di
     * data/cards.json (name, type, attributi, stats...), con gli agganci
     * opzionali descritti in testa al file — nessun campo è obbligatorio
     * oltre a name/type, così anche una carta "solo testo" (senza motore
     * dietro, come tante carte artOnly già in data/cards.json) è valida.
     * Ritorna la carta salvata (con l'id assegnato) o null se cardData
     * non è valida.
     */
    function add(cardData) {
        if (!cardData || !cardData.name || !['monster', 'spell', 'trap'].includes(cardData.type)) {
            console.warn('[CustomCards] carta non valida (serve almeno name + type):', cardData);
            return null;
        }
        const existing = loadAll();
        const card = Object.assign({}, cardData, {
            id: nextId(existing),
            origin: cardData.origin || 'fanmade',
            custom: true
        });
        existing.push(card);
        saveAll(existing);
        return card;
    }

    /** Elenca tutte le carte custom salvate (array vuoto se nessuna). */
    function list() {
        return loadAll();
    }

    /** Rimuove una carta custom per id. */
    function remove(id) {
        saveAll(loadAll().filter((c) => c.id !== id));
    }

    /**
     * Fonde le carte custom salvate in cardDatabase — va chiamata una
     * sola volta all'avvio, subito dopo che cardDatabase esiste (vedi
     * l'ordine degli <script> in yugioh_game.html/cartoteca.html/
     * creazione-deck.html: questo file va DOPO js/cards-data.generated.js
     * e js/cards-db.js). Idempotente: non duplica una carta già presente
     * (utile se questo script girasse più di una volta per errore).
     */
    function mergeIntoCardDatabase() {
        if (typeof cardDatabase === 'undefined' || !Array.isArray(cardDatabase)) return;
        loadAll().forEach((card) => {
            if (!cardDatabase.some((c) => c.id === card.id)) cardDatabase.push(card);
        });
    }

    window.CustomCards = { add: add, list: list, remove: remove, mergeIntoCardDatabase: mergeIntoCardDatabase };

    mergeIntoCardDatabase();
})();
