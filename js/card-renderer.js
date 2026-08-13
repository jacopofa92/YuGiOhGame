/**
 * card-renderer.js — Costruisce il DOM di una carta, uguale ovunque.
 * =====================================================================
 * File "gemello" di js/card.css (che la veste). Prima di questo file
 * esistevano 5-6 punti diversi nel progetto che ricostruivano a mano il
 * markup di una carta (mano/campo in yugioh_game.html, la Cartoteca, il
 * cercatore carte di creazione-deck.html, l'anteprima di trascinamento,
 * l'animazione di pesca...), leggermente diversi tra loro e via via
 * disallineati. Ora c'è una funzione sola, `createCardElement(...)`, e
 * tutte le pagine la richiamano.
 *
 * Include anche questo file (e js/card.css) PRIMA di qualunque script
 * di pagina che mostri carte.
 */
(function () {
    'use strict';

    // Icona-segnaposto per tipo di carta: usata sia come "arte" nel
    // fallback CSS sia (per Magia/Trappola) nel badge in alto a destra.
    const TYPE_ICON = { monster: '👑', spell: '✨', trap: '🌀' };

    // Kanji dell'Attributo come sulle vere carte Yu-Gi-Oh (光/闇/地/風/水/炎/神).
    const ATTRIBUTE_ICON = {
        'LUCE': '光',
        'OSCURITÀ': '闇',
        'TERRA': '地',
        'VENTO': '風',
        'ACQUA': '水',
        'FUOCO': '炎',
        'DIVINO': '神'
    };

    const CARD_BACK_IMAGE = 'images/cards/backCard.jpeg';
    const CARD_PILE_IMAGE = 'images/cards/backPilaCards.jpeg';

    /**
     * Percorso dell'immagine reale della carta. Convenzione: images/cards/<id>.jpeg
     * Basta aggiungere il file corrispondente (es. images/cards/1.jpeg per la
     * carta con id 1 in cards-db.js) perché venga usato automaticamente al
     * posto del fallback CSS.
     */
    function getCardImagePath(card) {
        return `images/cards/${card.id}.jpeg`;
    }

    function typeLineText(card) {
        if (card.type === 'monster') return `[${card.race || 'Mostro'}]`;
        if (card.type === 'spell') return '[Magia]';
        if (card.type === 'trap') return '[Trappola]';
        return '';
    }

    /**
     * Il fallback CSS vero e proprio: replica il layout di una carta
     * Yu-Gi-Oh reale (barra nome+attributo, stelle Livello, finestra
     * immagine con placeholder, riga razza/tipo, riga ATK/DEF). Non
     * include la descrizione/effetto testuale della carta — a queste
     * dimensioni non ci sarebbe spazio per renderla leggibile, e quel
     * testo è comunque già visibile nel pannello info carta a schermo.
     */
    function buildFallbackFrameHTML(card) {
        const isMonster = card.type === 'monster';
        const topBadge = isMonster
            ? `<div class="card-frame-attr" data-attr="${card.attribute || ''}">${ATTRIBUTE_ICON[card.attribute] || '?'}</div>`
            : `<div class="card-frame-typebadge" data-ctype="${card.type}">${TYPE_ICON[card.type] || ''}</div>`;
        const stars = isMonster && card.level
            ? `<div class="card-frame-stars">${'⭐'.repeat(card.level)}</div>`
            : '';
        const stats = isMonster
            ? `<div class="card-stats"><span>⚔️${card.attack}</span><span>🛡️${card.defense}</span></div>`
            : '';
        return `
            <div class="card-frame">
                <div class="card-frame-top">
                    <div class="card-name">${card.name}</div>
                    ${topBadge}
                </div>
                ${stars}
                <div class="card-frame-art"><div class="card-frame-art-icon">${TYPE_ICON[card.type] || ''}</div></div>
                <div class="card-frame-typeline">${typeLineText(card)}</div>
                ${stats}
            </div>
        `;
    }

    /**
     * Applica al div `el` (già con classe "card") l'aspetto di un retro
     * carta coperto: prova prima l'immagine reale (CARD_BACK_IMAGE), e se
     * manca/non carica lascia visibile il fallback CSS sottostante —
     * stesso meccanismo dell'immagine fronte-carta più sotto.
     */
    function applyCardBackVisual(el) {
        el.classList.add('face-down');
        el.innerHTML = '<div class="card-back-frame"><div class="card-back-emblem"></div></div>';
        const img = document.createElement('img');
        img.className = 'card-image';
        img.alt = 'Carta coperta';
        img.draggable = false;
        img.loading = 'lazy';
        img.onload = () => el.classList.add('has-image');
        img.onerror = () => img.remove();
        img.src = CARD_BACK_IMAGE;
        el.insertBefore(img, el.firstChild);
    }

    /**
     * Crea l'elemento DOM di una carta.
     * @param {object} card - la carta (da cards-db.js), o null per un retro "anonimo".
     * @param {boolean} isFaceDown - true per un mostro/carta coperta.
     * @param {'attack'|'defense'} position - orientamento (solo mostri).
     */
    function createCardElement(card, isFaceDown = false, position = 'attack') {
        const el = document.createElement('div');
        el.className = 'card';
        if (card) {
            el.dataset.uid = card.uid;
            el.dataset.type = card.type;
            // Solo nel duello (dove js/duel-engine.js + js/card-effects.js
            // sono caricati): un mostro con un vero effetto di gioco
            // registrato prende una tinta leggermente più arancione, uno
            // "vanilla" leggermente più gialla — vedi js/card.css. Sulle
            // altre pagine (Cartoteca, Creazione Deck) l'attributo resta
            // assente e la carta usa il colore di sempre, invariato.
            if (card.type === 'monster' && window.DuelEngine && typeof DuelEngine.getDefinition === 'function') {
                el.dataset.hasEffect = DuelEngine.getDefinition(card.id) ? 'true' : 'false';
            }
        }
        if (position === 'defense') el.classList.add('defense-pos');

        if (isFaceDown || !card) {
            applyCardBackVisual(el);
            return el;
        }

        el.innerHTML = buildFallbackFrameHTML(card);

        // Prova a caricare l'immagine reale della carta. Se manca/non carica,
        // l'<img> viene semplicemente rimossa e resta visibile il fallback
        // CSS costruito sopra.
        const img = document.createElement('img');
        img.className = 'card-image';
        img.alt = card.name;
        img.draggable = false;
        img.loading = 'lazy';
        img.onload = () => el.classList.add('has-image');
        img.onerror = () => img.remove();
        img.src = getCardImagePath(card);
        el.insertBefore(img, el.firstChild);

        return el;
    }

    /** Un retro-carta "anonimo" (nessuna carta reale dietro) — es. per una pila decorativa. */
    function renderCardBack() {
        const el = document.createElement('div');
        el.className = 'card';
        applyCardBackVisual(el);
        return el;
    }

    /**
     * Aggiunge alla zona Deck (slotEl) la visualizzazione della pila:
     * di default 3 dorsi-carta sovrapposti in CSS (le pagine che la usano
     * decidono l'offset di ciascuno con .deck-preview, vedi yugioh_game.html);
     * se esiste una vera images/cards/backPilaCards.jpeg, quella sostituisce
     * l'intero fallback CSS (non si sovrappongono).
     */
    function appendDeckPile(slotEl, layers = 3) {
        for (let i = 0; i < layers; i++) {
            const back = renderCardBack();
            back.classList.add('deck-preview');
            slotEl.appendChild(back);
        }
        const pileImg = document.createElement('img');
        pileImg.className = 'deck-pile-image';
        pileImg.alt = 'Pila di carte';
        pileImg.draggable = false;
        pileImg.loading = 'lazy';
        pileImg.onload = () => slotEl.classList.add('has-pile-image');
        pileImg.onerror = () => pileImg.remove();
        pileImg.src = CARD_PILE_IMAGE;
        slotEl.appendChild(pileImg);
    }

    window.CardRenderer = {
        TYPE_ICON,
        ATTRIBUTE_ICON,
        getCardImagePath,
        createCardElement,
        renderCardBack,
        appendDeckPile
    };
    // Alias globali: così le pagine/i file esistenti che già chiamano
    // createCardElement(...)/getCardImagePath(...) senza prefisso
    // continuano a funzionare senza modifiche.
    window.createCardElement = createCardElement;
    window.getCardImagePath = getCardImagePath;
})();
