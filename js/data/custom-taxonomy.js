/**
 * custom-taxonomy.js — Provenienze e Tipi Mostro CREATI DALL'UTENTE in
 * crea-carta.html, oltre ai 4 valori fissi di CARD_ORIGIN_LABELS e alla
 * lista fissa MONSTER_RACES (entrambi in js/data/cards-db.js). Stesso
 * pattern di localStorage di js/data/custom-cards.js — nessun server,
 * coerente col resto del gioco.
 *
 * Perché un modulo SEPARATO da custom-cards.js: le provenienze/i tipi
 * qui dentro sono "cosa l'utente ha già inventato", usato per POPOLARE
 * le select del Card Maker con le scelte fatte in precedenza (così la
 * seconda carta "Fanteria" si SCEGLIE da un elenco, non si ridigita da
 * capo) — un dato diverso dalle carte vere e proprie salvate da
 * CustomCards. Il filtro Provenienza/Tipo Mostro di cartoteca.html/
 * creazione-deck.html NON legge invece questo modulo: deriva le proprie
 * opzioni direttamente da cardDatabase (quali valori sono DAVVERO usati
 * da una carta caricata), stesso schema già esistente lì per il filtro
 * Attributo.
 *
 * Un Tipo Mostro custom è un unico POOL GLOBALE (mai duplicato per nome,
 * confronto case-insensitive — richiesta esplicita dell'utente: "se
 * creo ad esempio 'fanteria' non devo poter crearne un altro uguale su
 * un altro tipo... perché già creato e associabile"), ASSOCIATO a una o
 * più provenienze (`raceAssociations`, provenienza -> elenco di nomi dal
 * pool globale) — mai alla provenienza 'yu-gi-oh', che nella UI di
 * crea-carta.html usa sempre e SOLO MONSTER_RACES, il vero elenco
 * ufficiale del gioco, senza alcuna estensione custom.
 */
(function () {
    'use strict';

    const STORAGE_KEY = 'yugioh_custom_taxonomy_v2';
    const LEGACY_STORAGE_KEY = 'yugioh_custom_taxonomy_v1';

    /** I 6 termini standard di Yu-Gi-Oh che una provenienza può rimpiazzare — es. "Mostro"/"Mostri" -> "Unità"/"Unità" per un tema bellico. */
    const TERM_KEYS = ['monsterSingular', 'monsterPlural', 'spellSingular', 'spellPlural', 'trapSingular', 'trapPlural'];
    const DEFAULT_TERMS = {
        monsterSingular: 'Mostro', monsterPlural: 'Mostri',
        spellSingular: 'Magia', spellPlural: 'Magie',
        trapSingular: 'Trappola', trapPlural: 'Trappole'
    };

    function emptyData() {
        return { origins: [], customRaces: [], raceAssociations: {}, terminology: {} };
    }

    function loadAll() {
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            if (raw) {
                const parsed = JSON.parse(raw);
                if (parsed && typeof parsed === 'object') {
                    return {
                        origins: Array.isArray(parsed.origins) ? parsed.origins : [],
                        customRaces: Array.isArray(parsed.customRaces) ? parsed.customRaces : [],
                        raceAssociations: (parsed.raceAssociations && typeof parsed.raceAssociations === 'object') ? parsed.raceAssociations : {},
                        terminology: (parsed.terminology && typeof parsed.terminology === 'object') ? parsed.terminology : {}
                    };
                }
            }
            // Migrazione una tantum dallo schema v1 (razze già per-provenienza,
            // mai condivise) — ogni razza custom già creata diventa una voce
            // del pool globale, associata alla provenienza per cui era stata
            // creata, così nulla si perde passando al nuovo modello.
            const legacyRaw = localStorage.getItem(LEGACY_STORAGE_KEY);
            if (legacyRaw) {
                const legacy = JSON.parse(legacyRaw);
                const data = emptyData();
                data.origins = Array.isArray(legacy.origins) ? legacy.origins : [];
                const byOrigin = (legacy.racesByOrigin && typeof legacy.racesByOrigin === 'object') ? legacy.racesByOrigin : {};
                Object.keys(byOrigin).forEach((originKey) => {
                    data.raceAssociations[originKey] = [];
                    (byOrigin[originKey] || []).forEach((name) => {
                        if (!data.customRaces.some((r) => r.toLowerCase() === name.toLowerCase())) data.customRaces.push(name);
                        data.raceAssociations[originKey].push(name);
                    });
                });
                saveAll(data);
                return data;
            }
            return emptyData();
        } catch (e) {
            console.warn('[CustomTaxonomy] localStorage illeggibile, riparto da zero.', e);
            return emptyData();
        }
    }

    function saveAll(data) {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
        } catch (e) {
            console.warn('[CustomTaxonomy] impossibile salvare in localStorage.', e);
        }
    }

    /** Chiave normalizzata per usare un'etichetta libera (es. "Prima Guerra Mondiale") come key stabile di una provenienza, stesso spirito di 'yu-gi-oh'/'fanmade'. */
    function slugify(label) {
        return (label || '').toString().trim().toLowerCase()
            .normalize('NFD').replace(/\p{Diacritic}/gu, '')
            .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'provenienza';
    }

    /** Elenco delle provenienze custom salvate finora: [{ key, label }]. Non include le 4 provenienze fisse (CARD_ORIGIN_LABELS) — quelle esistono già a prescindere. */
    function listOrigins() {
        return loadAll().origins;
    }

    /** Aggiunge una nuova provenienza custom (no-op se una con lo stesso key esiste già — l'etichetta resta quella già salvata). Torna { key, label }. */
    function addOrigin(label) {
        const data = loadAll();
        const key = slugify(label);
        const existing = data.origins.find((o) => o.key === key);
        if (existing) return existing;
        const entry = { key: key, label: (label || '').toString().trim() || key };
        data.origins.push(entry);
        saveAll(data);
        return entry;
    }

    /** Rimuove una provenienza custom e le sue associazioni di Tipo Mostro (il pool globale dei nomi resta intatto: restano associabili ad altre provenienze). Una carta già salvata con quella provenienza non viene toccata. */
    function removeOrigin(originKey) {
        const data = loadAll();
        data.origins = data.origins.filter((o) => o.key !== originKey);
        delete data.raceAssociations[originKey];
        saveAll(data);
    }

    /** Pool GLOBALE di tutti i Tipi Mostro custom creati finora, indipendentemente da quale provenienza li usa. */
    function listAllCustomRaces() {
        return loadAll().customRaces;
    }

    /**
     * Aggiunge un nuovo Tipo Mostro al pool globale (no-op — confronto
     * case-insensitive — se un nome uguale esiste già, torna quello già
     * salvato: MAI un duplicato, richiesta esplicita dell'utente). Torna
     * il nome così come salvato la prima volta.
     */
    function addCustomRace(name) {
        const trimmed = (name || '').toString().trim();
        if (!trimmed) return null;
        const data = loadAll();
        const already = data.customRaces.find((r) => r.toLowerCase() === trimmed.toLowerCase());
        if (already) return already;
        data.customRaces.push(trimmed);
        saveAll(data);
        return trimmed;
    }

    /** Tipi Mostro custom ASSOCIATI a una data provenienza (sottoinsieme del pool globale) — array di stringhe, vuoto se nessuno. */
    function listRacesFor(originKey) {
        const data = loadAll();
        return Array.isArray(data.raceAssociations[originKey]) ? data.raceAssociations[originKey] : [];
    }

    /**
     * Associa un Tipo Mostro a una provenienza: se il nome non esiste
     * ancora nel pool globale lo crea al volo (addCustomRace, che
     * garantisce l'unicità), poi lo aggiunge alle associazioni di
     * `originKey` (no-op se già associato). Torna il nome canonico
     * (quello del pool, anche se `raceName` differiva solo per
     * maiuscole/minuscole).
     */
    function associateRaceToOrigin(originKey, raceName) {
        const canonical = addCustomRace(raceName);
        if (!canonical) return null;
        const data = loadAll();
        data.raceAssociations[originKey] = data.raceAssociations[originKey] || [];
        if (!data.raceAssociations[originKey].includes(canonical)) {
            data.raceAssociations[originKey].push(canonical);
            saveAll(data);
        }
        return canonical;
    }

    /** Rimuove l'associazione di un Tipo Mostro da una provenienza — il nome RESTA nel pool globale (restano associabile ad altre provenienze), viene tolto solo il legame con questa. */
    function dissociateRaceFromOrigin(originKey, raceName) {
        const data = loadAll();
        if (!Array.isArray(data.raceAssociations[originKey])) return;
        data.raceAssociations[originKey] = data.raceAssociations[originKey].filter((r) => r !== raceName);
        saveAll(data);
    }

    /**
     * Terminologia di una provenienza — i 6 termini standard (Mostro/
     * Mostri/Magia/Magie/Trappola/Trappole) SE questa provenienza li ha
     * sostituiti, altrimenti i default (mai per 'yu-gi-oh', che nella UI
     * di crea-carta.html non passa mai da qui: usa sempre i default).
     * Torna sempre un oggetto con tutte e 6 le chiavi valorizzate — mai
     * `undefined`, comodo da usare direttamente per etichettare la UI
     * senza un fallback manuale ad ogni chiamata.
     */
    function getTerminologyFor(originKey) {
        const data = loadAll();
        const override = data.terminology[originKey] || {};
        const result = {};
        TERM_KEYS.forEach((k) => { result[k] = override[k] || DEFAULT_TERMS[k]; });
        return result;
    }

    /** Solo gli override SALVATI di una provenienza (mai i default) — usato per precompilare il form di modifica: un campo senza override deve apparire VUOTO lì, non con "Mostro" già scritto (getTerminologyFor, con i default, servirebbe a mostrare/usare la terminologia altrove, non a modificarla). */
    function getRawTerminologyOverride(originKey) {
        return loadAll().terminology[originKey] || {};
    }

    /** Imposta (parzialmente: solo le chiavi presenti in `terms` vengono toccate) la terminologia custom di una provenienza. */
    function setTerminologyFor(originKey, terms) {
        const data = loadAll();
        data.terminology[originKey] = Object.assign({}, data.terminology[originKey] || {}, terms || {});
        saveAll(data);
    }

    window.CustomTaxonomy = {
        listOrigins: listOrigins,
        addOrigin: addOrigin,
        removeOrigin: removeOrigin,
        listAllCustomRaces: listAllCustomRaces,
        addCustomRace: addCustomRace,
        listRacesFor: listRacesFor,
        associateRaceToOrigin: associateRaceToOrigin,
        dissociateRaceFromOrigin: dissociateRaceFromOrigin,
        getTerminologyFor: getTerminologyFor,
        getRawTerminologyOverride: getRawTerminologyOverride,
        setTerminologyFor: setTerminologyFor,
        DEFAULT_TERMS: DEFAULT_TERMS,
        slugify: slugify
    };
})();
