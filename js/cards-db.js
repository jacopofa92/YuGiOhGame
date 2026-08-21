/**
 * cards-db.js — Funzioni di supporto sul database carte.
 *
 * L'ANAGRAFICA VERA E PROPRIA (le 508 carte) NON è più qui: vive in
 * data/cards.json (fonte di verità editabile a mano) e viene caricata
 * tramite js/cards-data.generated.js — un file generato automaticamente
 * da data/cards.json con `node scripts/build-cards-data.js`, caricato
 * PRIMA di questo file (vedi l'ordine degli <script> in yugioh_game.html/
 * cartoteca.html/creazione-deck.html). Questo file resta un normale
 * <script> sincrono (niente fetch()): il Duello Demo e la Cartoteca sono
 * pensati per funzionare aprendo i file .html direttamente, e un fetch()
 * di un file locale viene bloccato dal browser sotto il protocollo
 * file:// — vedi il commento in cima a scripts/build-cards-data.js.
 *
 * PER AGGIUNGERE O MODIFICARE UNA CARTA: modifica data/cards.json (un
 * array di oggetti con gli stessi campi descritti sotto), poi esegui
 * `node scripts/build-cards-data.js` e ricarica la pagina — non serve
 * toccare questo file né il motore.
 *
 * Guida ai campi di ogni carta in data/cards.json:
 *
 * Ogni mostro ha un campo "level" (stelle) che determina se serve un
 * Tributo per essere Evocato Normalmente:
 *   - Level 7+   -> richiede 2 Tributi (sacrifica 2 mostri sul Terreno)
 *   - Level 5-6  -> richiede 1 Tributo (sacrifica 1 mostro sul Terreno)
 *   - Level 1-4  -> nessun Tributo, evocazione libera
 *
 * "origin" (provenienza): a cosa appartiene la carta, usato dal filtro
 * Provenienza in cartoteca.html e mostrato nel riepilogo di un deck in
 * creazione-deck.html — pensato per futuri duelli con restrizioni (es.
 * "solo carte Yu-Gi-Oh"). Valori usati finora: 'yu-gi-oh' (tutte le
 * carte qui sotto, il gioco base), 'fanmade' (carte originali di questo
 * progetto, non ancora presenti), 'ww1'/'ww2' (set a tema storico,
 * anch'essi non ancora presenti) — la tassonomia è già pronta per quando
 * arriveranno.
 *
 * "subtype" (solo Magie/Trappole): il vero sottotipo ufficiale della
 * carta — 'normal'/'continuous'/'quick-play'/'ritual'/'field'/'equip' per
 * le Magie, 'normal'/'continuous'/'counter' per le Trappole. Usato dal
 * filtro Sottotipo in cartoteca.html/creazione-deck.html. È un dato di
 * IDENTITÀ della carta (cosa è davvero nel gioco vero), indipendente da
 * come questo motore la implementa internamente — es. Spada Rivelatrice
 * è una Magia Normale ufficiale anche se qui resta scoperta sul Terreno
 * con `continuous: true` in js/card-effects.js per comodità di
 * implementazione (vedi il commento lì).
 *
 * "artOnly" (opzionale, solo se true): l'immagine in images/cards/<id>.jpeg
 * è SOLO l'illustrazione ritagliata (niente scan completo della carta —
 * nessun nome/stelle/ATK-DEF disegnati dentro il file), a differenza delle
 * altre immagini di questo set che sono scan completi pronti da mostrare
 * così come sono. js/card-renderer.js usa questo flag per decidere DOVE
 * mettere l'immagine: uno scan completo copre l'intera carta (nasconde la
 * cornice CSS, che sarebbe ridondante); un'illustrazione va invece DENTRO
 * la finestra-immagine della cornice CSS (.card-frame-art), che resta
 * visibile intorno a lei con nome/stelle/ATK-DEF disegnati a CSS.
 *
 * "vanilla" (solo mostri Normali/Rituali/Fusione non-Rituale/non-Fusione,
 * opzionale, solo se true): vero se questa carta è un vero Normal Monster
 * nel gioco reale (nessun effetto di carta, solo testo descrittivo), per
 * distinguerla da un vero Effect Monster — è un dato di IDENTITÀ della
 * carta, indipendente dal fatto che il suo effetto sia già stato
 * programmato in questo motore o resti data-only (stesso spirito del
 * campo "subtype" sopra). js/card-renderer.js lo usa per la tinta
 * arancione (Effect Monster) contro gialla (Normal Monster) dello sfondo
 * carta — vedi js/card.css — assente su Rituali/Fusioni, che hanno già il
 * proprio colore strutturale (blu/viola) indipendente da questa
 * distinzione. Le 5 carte di Exodia (id 11, 41-44) sono vanilla: true
 * anche se il loro testo descrive la vittoria automatica, perché sulla
 * carta reale quella non è un "effetto" ma una regola speciale legata al
 * possedere tutti e 5 i pezzi in mano.
 *
 * Campi predisposti per usi futuri (facoltativi, non ancora popolati da
 * nessuna carta — vedi roadmap "evocazioni con filmati"/"audio dedicato"):
 * "summonVideo"/"spellEffectFile"/"trapEffectFile"/"audioOverride".
 */

/** Etichette leggibili per il filtro Provenienza di cartoteca.html e il riepilogo deck di creazione-deck.html. */
const CARD_ORIGIN_LABELS = {
    'yu-gi-oh': 'Yu-Gi-Oh!',
    'fanmade': 'Fanmade',
    'ww1': 'WW1',
    'ww2': 'WW2'
};

/** Etichette leggibili per il filtro Categoria Mostro di cartoteca.html/creazione-deck.html. */
const MONSTER_CATEGORY_LABELS = {
    normal: '⚪ Normale',
    effect: '🟠 Con Effetto',
    fusion: '🟣 Fusione',
    ritual: '🔵 Rituale'
};

/**
 * Elenco completo dei Tipi Mostro (razze) ufficiali di Yu-Gi-Oh, per il
 * filtro "Tipo Mostro" di cartoteca.html/creazione-deck.html — un elenco
 * FISSO, non derivato dalle sole carte già presenti nel database, così il
 * filtro mostra sempre tutte le opzioni previste dal gioco vero anche per
 * i tipi non ancora rappresentati da nessuna carta qui dentro. Limitato ai
 * tipi già esistenti nell'era della prima serie (niente Psichico/Cyberse/
 * Wyrm/Dio Creatore, introdotti da espansioni molto più recenti).
 */
const MONSTER_RACES = [
    'Guerriero', 'Incantatore', 'Fata', 'Demone', 'Zombie', 'Macchina',
    'Acquatico', 'Piroico', 'Roccia', 'Bestia Alata', 'Pianta', 'Insetto',
    'Tuono', 'Drago', 'Bestia', 'Bestia-Guerriero', 'Dinosauro', 'Pesce',
    'Serpente di Mare', 'Rettile', 'Essere Divino', 'Illusione'
];

/** Etichette leggibili per il filtro Sottotipo Magia (card.subtype quando type === 'spell'). */
const SPELL_SUBTYPE_LABELS = {
    normal: 'Normale',
    continuous: 'Continua',
    'quick-play': 'Veloce',
    ritual: 'Rituale',
    field: 'Campo',
    equip: 'Equipaggiamento'
};

/** Etichette leggibili per il filtro Sottotipo Trappola (card.subtype quando type === 'trap'). */
const TRAP_SUBTYPE_LABELS = {
    normal: 'Normale',
    continuous: 'Continua',
    counter: 'Contatore'
};

/**
 * Categoria filtro di un mostro: 'fusion'/'ritual' vengono da card.category
 * (js/cards-db.js), 'effect' richiede che js/duel-engine.js + js/card-effects.js
 * siano caricati (solo nel duello vero — su Cartoteca/Creazione Deck vengono
 * caricati apposta SOLO per questo, vedi i rispettivi <script>). Se il motore
 * effetti non è disponibile, ogni mostro senza categoria strutturale ricade
 * su 'normal' anziché rompere il filtro.
 */
function getMonsterFilterCategory(card) {
    if (!card || card.type !== 'monster') return null;
    if (card.category === 'fusion') return 'fusion';
    if (card.category === 'ritual') return 'ritual';
    if (window.DuelEngine && typeof DuelEngine.getDefinition === 'function' && DuelEngine.getDefinition(card.id)) {
        return 'effect';
    }
    return 'normal';
}

// Pool per il pescaggio casuale del Duello Demo (nessun vero mazzo salvato,
// vedi createRandomCard sotto): esclude le carte extraDeck:true (Fusione/
// Rituale), che non si pescano mai normalmente — calcolato una sola volta,
// non ad ogni pescata.
let _randomDrawPool = null;
function getRandomDrawPool() {
    if (!_randomDrawPool) {
        _randomDrawPool = cardDatabase.filter((c) => !c.extraDeck);
    }
    return _randomDrawPool;
}

function createRandomCard() {
    const pool = getRandomDrawPool();
    const template = pool[Math.floor(Math.random() * pool.length)];
    return { ...template, uid: Date.now() + Math.random() };
}

/**
 * Espande un deck salvato/a tema — { main: [{id, qty}, ...] } (vedi
 * js/save-manager.js e js/character-decks.js) — in un mazzo REALE
 * mescolato: un array di carte pronte da pescare una alla volta con
 * .pop(), ognuna con il proprio uid. Solo il Main Deck: l'Extra Deck
 * (Fusione) non si pesca mai normalmente, quindi resta ignorato qui —
 * usato da resetGameState() in js/game-flow.js per le partite offline.
 * Ritorna null se lo spec non è valido, così chi chiama può ricadere sul
 * vecchio pool casuale invece di un mazzo vuoto.
 */
function buildDeckFromSpec(deckSpec) {
    if (!deckSpec || !Array.isArray(deckSpec.main) || deckSpec.main.length === 0) return null;
    const cards = [];
    deckSpec.main.forEach((entry) => {
        const template = cardDatabase.find((c) => c.id === entry.id);
        if (!template) return;
        for (let i = 0; i < entry.qty; i++) {
            cards.push({ ...template, uid: `${Date.now()}_${Math.random().toString(36).slice(2)}_${cards.length}` });
        }
    });
    if (cards.length === 0) return null;
    // Fisher-Yates
    for (let i = cards.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [cards[i], cards[j]] = [cards[j], cards[i]];
    }
    return cards;
}

/**
 * Espande la parte Extra Deck di un deck salvato/a tema — { extra: [{id,
 * qty}, ...] }, stesso formato di deckSpec.main qui sopra. A differenza
 * del Main Deck NON viene mescolato (non si pesca mai a caso dall'Extra
 * Deck, ci si guarda dentro e si sceglie) — usato da resetGameState() in
 * js/game-flow.js per popolare gameState.playerExtraDeck/botExtraDeck,
 * la riserva da cui pesca l'Evocazione Fusione (vedi ACTIONS.fusionSummon
 * in js/duel-engine.js). Ritorna sempre un array (mai null): un deck
 * senza Extra Deck è normalissimo, non un errore.
 */
function buildExtraDeckFromSpec(deckSpec) {
    if (!deckSpec || !Array.isArray(deckSpec.extra) || deckSpec.extra.length === 0) return [];
    const cards = [];
    deckSpec.extra.forEach((entry) => {
        const template = cardDatabase.find((c) => c.id === entry.id);
        if (!template) return;
        for (let i = 0; i < entry.qty; i++) {
            cards.push({ ...template, uid: `${Date.now()}_${Math.random().toString(36).slice(2)}_ed${cards.length}` });
        }
    });
    return cards;
}

/**
 * Calcola quanti Tributi servono per Evocare Normalmente un dato mostro,
 * in base al suo Livello (stelle).
 */
function getTributesRequired(card) {
    if (!card || card.type !== 'monster' || !card.level) return 0;
    if (card.level >= 7) return 2;
    if (card.level >= 5) return 1;
    return 0;
}
