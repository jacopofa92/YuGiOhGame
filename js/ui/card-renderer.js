/**
 * card-renderer.js — Costruisce il DOM di una carta, uguale ovunque.
 * =====================================================================
 * File "gemello" di js/ui/card.css (che la veste). Prima di questo file
 * esistevano 5-6 punti diversi nel progetto che ricostruivano a mano il
 * markup di una carta (mano/campo in duelMonstersCore.html, la Cartoteca, il
 * cercatore carte di creazione-deck.html, l'anteprima di trascinamento,
 * l'animazione di pesca...), leggermente diversi tra loro e via via
 * disallineati. Ora c'è una funzione sola, `createCardElement(...)`, e
 * tutte le pagine la richiamano.
 *
 * Include anche questo file (e js/ui/card.css) PRIMA di qualunque script
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
     * Percorso (o data URI) dell'immagine reale della carta. Convenzione:
     * images/cards/<id>.jpeg — basta aggiungere il file corrispondente
     * (es. images/cards/1.jpeg per la carta con id 1 in cards-db.js)
     * perché venga usato automaticamente al posto del fallback CSS.
     *
     * Una carta CUSTOM (creata in crea-carta.html, vedi js/data/custom-cards.js)
     * non ha un vero file su disco — l'immagine caricata dall'utente è
     * incorporata direttamente nel suo record come data URI JPEG
     * (card.customImage), unico modo di "caricare un'immagine" possibile
     * in un progetto senza backend/server: se presente, ha SEMPRE priorità
     * sul percorso a file.
     */
    function getCardImagePath(card) {
        if (card.customImage) return card.customImage;
        return `images/cards/${card.id}.jpeg`;
    }

    // Sottotipi di Magia/Trappola che vale la pena segnalare a colpo
    // d'occhio sulla carta (Continua/Terreno/Veloce/Equipaggiamento): gli
    // altri sottotipi (Normale, Rituale, Contatore) restano con la sola
    // etichetta generica "[Magia]"/"[Trappola]" come sempre.
    const NOTABLE_SUBTYPE_LABEL = {
        spell: { continuous: 'Magia Continua', field: 'Magia Terreno', 'quick-play': 'Magia Veloce', equip: 'Magia Equipaggiamento' },
        trap: { continuous: 'Trappola Continua' }
    };

    function typeLineText(card) {
        if (card.type === 'monster') return `[${card.race || 'Mostro'}]`;
        if (card.type === 'spell' || card.type === 'trap') {
            const label = NOTABLE_SUBTYPE_LABEL[card.type][card.subtype];
            if (label) return `[${label}]`;
            return card.type === 'spell' ? '[Magia]' : '[Trappola]';
        }
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
        // ATK/DEF "effettivo": in duello, un bonus continuo (es. "+300 ATK
        // per ogni X sul Terreno") si riflette qui esattamente come nel
        // calcolo battaglia — vedi DuelEngine.getEffectiveAtk/getEffectiveDef
        // in js/engine/duel-engine.js. Fuori da un duello (Cartoteca/Creazione
        // Deck), o se il motore non è caricato, resta il valore base.
        const hasEffectiveStats = isMonster && window.DuelEngine && typeof DuelEngine.getEffectiveAtk === 'function';
        const effAtk = hasEffectiveStats ? DuelEngine.getEffectiveAtk(card) : card.attack;
        const effDef = hasEffectiveStats ? DuelEngine.getEffectiveDef(card) : card.defense;
        const stats = isMonster
            ? `<div class="card-stats"><span>⚔️${effAtk}</span><span>🛡️${effDef}</span></div>`
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
        // alt="" (decorativa, non "Carta coperta"): con un alt non vuoto,
        // mentre l'immagine è ancora in fase di decodifica (ri-creata da
        // zero ad ogni renderFields(), che ridisegna l'intero Terreno ad
        // ogni updateUI() — anche solo un cambio fase) il browser può
        // dipingere brevemente il testo alternativo sopra la cornice CSS
        // già visibile sotto — bug reale segnalato dall'utente ("si vede
        // il testo 'carta coperta'... specialmente ai cambi fase"). Un
        // alt vuoto è lo standard per un'immagine puramente decorativa: i
        // browser non mostrano mai alcun testo per lei, né in caricamento
        // né in errore.
        img.alt = '';
        img.draggable = false;
        img.loading = 'lazy';
        img.onload = () => el.classList.add('has-image');
        img.onerror = () => img.remove();
        img.src = CARD_BACK_IMAGE;
        // renderFields() ricrea l'intero Terreno da zero ad ogni cambio
        // fase (anche per carte il cui aspetto non è affatto cambiato):
        // senza questo controllo, la STESSA immagine già mostrata un
        // istante prima riparte ogni volta dalla dissolvenza invisibile
        // (onload è sempre asincrono, anche a cache calda), causando lo
        // sfarfallio segnalato dall'utente. Se il browser la ha già
        // decodificata in cache (complete=true SINCRONO dopo aver
        // impostato src, e naturalWidth>0 per escludere un fallimento
        // già in cache), saltiamo la dissolvenza e mostriamo l'immagine
        // subito piena — visivamente indistinguibile da "non è cambiato
        // nulla".
        if (img.complete && img.naturalWidth > 0) el.classList.add('has-image');
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
            // Rituale (blu) / Fusione (viola): categoria strutturale della
            // carta stessa (card.category, da js/data/cards-db.js), quindi
            // vale ovunque — Cartoteca, Creazione Deck, duello — non solo
            // dove è caricato il motore effetti. Vedi js/ui/card.css.
            if (card.type === 'monster' && card.category) {
                el.dataset.category = card.category;
            }
            // Un mostro NORMALE (Effect Monster nel vero gioco, cioè NON
            // "vanilla" — vedi il campo card.vanilla in js/data/cards-db.js)
            // prende una tinta leggermente più arancione, un vero Normal
            // Monster leggermente più gialla — vedi js/ui/card.css. Si basa
            // sull'identità REALE della carta (card.vanilla), non su se il
            // suo effetto è già stato programmato in questo motore, quindi
            // vale ovunque — Cartoteca, Creazione Deck, duello — non solo
            // dove è caricato il motore effetti. Rituale/Fusione hanno già
            // il proprio colore sopra e non partecipano a questa
            // distinzione.
            if (card.type === 'monster' && !card.category) {
                el.dataset.hasEffect = card.vanilla ? 'false' : 'true';
            }
        }
        if (position === 'defense') el.classList.add('defense-pos');

        if (isFaceDown || !card) {
            applyCardBackVisual(el);
            return el;
        }

        el.innerHTML = buildFallbackFrameHTML(card);

        if (card.artOnly) {
            // Solo l'illustrazione (card.artOnly, vedi js/data/cards-db.js): va
            // DENTRO la finestra-immagine della cornice CSS, che resta
            // visibile intorno a lei — non sostituisce l'intera carta come
            // fa invece uno scan completo qui sotto.
            const artWindow = el.querySelector('.card-frame-art');
            const artIcon = el.querySelector('.card-frame-art-icon');
            const artImg = document.createElement('img');
            artImg.className = 'card-art-image';
            // alt="" (decorativa) — stesso motivo di applyCardBackVisual()
            // qui sopra: il nome è già leggibile in .card-name nella
            // cornice, l'alt non vuoto qui rischiava lo stesso flash di
            // testo durante il ri-render frequente del Terreno.
            artImg.alt = '';
            artImg.draggable = false;
            artImg.loading = 'lazy';
            // Dissolvenza (art-loaded aggiunge opacity:1 via CSS, vedi
            // js/ui/card.css) invece di far comparire/rimuovere l'icona
            // di riserva di scatto — stesso motivo del fade su .card-image
            // qui sotto: un pop istantaneo si nota molto di più quando le
            // immagini arrivano da un server in rete (es. l'app Android,
            // che punta a un server di sviluppo) invece che da file
            // locali. L'icona resta nel DOM finché la dissolvenza non è
            // finita (250ms) invece di sparire nello stesso istante in cui
            // l'immagine appare, altrimenti si vedrebbe comunque un buco.
            artImg.onload = () => {
                el.classList.add('art-loaded');
                if (artIcon) setTimeout(() => artIcon.remove(), 260);
            };
            artImg.onerror = () => artImg.remove();
            artImg.src = getCardImagePath(card);
            // Vedi il commento gemello in applyCardBackVisual() più sopra:
            // stesso sfarfallio, stessa causa (ricreazione totale ad ogni
            // renderFields()), stesso rimedio — se il browser ha già
            // l'illustrazione decodificata in cache, salta la dissolvenza
            // e rimuovi subito l'icona di riserva invece di farla
            // ricomparire per 260ms ad ogni cambio fase.
            if (artImg.complete && artImg.naturalWidth > 0) {
                el.classList.add('art-loaded');
                if (artIcon) artIcon.remove();
            }
            if (artWindow) artWindow.appendChild(artImg);
            return el;
        }

        // Prova a caricare l'immagine reale della carta (scan completo). Se
        // manca/non carica, l'<img> viene semplicemente rimossa e resta
        // visibile il fallback CSS costruito sopra.
        const img = document.createElement('img');
        img.className = 'card-image';
        img.alt = ''; // decorativa — stesso motivo di applyCardBackVisual() più sopra
        img.draggable = false;
        img.loading = 'lazy';
        img.onload = () => el.classList.add('has-image');
        img.onerror = () => img.remove();
        img.src = getCardImagePath(card);
        // Vedi il commento gemello in applyCardBackVisual() più sopra.
        if (img.complete && img.naturalWidth > 0) el.classList.add('has-image');
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
     * decidono l'offset di ciascuno con .deck-preview, vedi duelMonstersCore.html);
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
        pileImg.alt = ''; // decorativa — stesso motivo di applyCardBackVisual() più sopra
        pileImg.draggable = false;
        pileImg.loading = 'lazy';
        pileImg.onload = () => slotEl.classList.add('has-pile-image');
        pileImg.onerror = () => pileImg.remove();
        pileImg.src = CARD_PILE_IMAGE;
        slotEl.appendChild(pileImg);
    }

    /**
     * Anima la rivelazione di una carta coperta con un flip 3D (ruota
     * fisicamente da dorso a fronte, stile Master Duel) invece di farla
     * sparire e ricomparire scoperta al prossimo render. Costruisce due
     * facce complete (dorso + fronte, vedi createCardElement) dentro un
     * contenitore con prospettiva e sostituisce la .card coperta dentro
     * slotEl con questa struttura per la durata dell'animazione (~650ms,
     * vedi @keyframes cardFlipReveal in js/ui/card.css) — il prossimo
     * updateUI()/renderFields() la rimpiazzerà con la normale carta
     * scoperta a riposo.
     *
     * IMPORTANTE: va chiamata PRIMA di un eventuale updateUI()/renderFields()
     * successivo alla rivelazione, quando lo slot mostra ancora la carta
     * coperta — dopo quel ricalcolo lo slot conterrebbe già la carta
     * scoperta "a riposo" e non ci sarebbe più nulla da animare (stesso
     * principio del timing dell'esplosione di distruzione in
     * resolveBattleDamage/actions.js).
     *
     * @param {HTMLElement} slotEl - il .field-slot che contiene la carta coperta.
     * @param {object} card - la carta reale che si sta rivelando.
     * @param {'attack'|'defense'} position - la sua posizione sul Terreno.
     */
    function playFlipReveal(slotEl, card, position) {
        if (!slotEl || !card) return;
        const oldEl = slotEl.querySelector('.card');
        if (!oldEl) return;

        const outer = document.createElement('div');
        outer.className = 'card card-flip-outer';

        const inner = document.createElement('div');
        inner.className = 'card-flip-inner';

        const backFace = createCardElement(card, true, position);
        backFace.classList.add('card-flip-face', 'card-flip-face-back');

        const frontFace = createCardElement(card, false, position);
        frontFace.classList.add('card-flip-face', 'card-flip-face-front');

        inner.appendChild(backFace);
        inner.appendChild(frontFace);
        outer.appendChild(inner);

        oldEl.replaceWith(outer);
    }

    window.CardRenderer = {
        TYPE_ICON,
        ATTRIBUTE_ICON,
        getCardImagePath,
        createCardElement,
        renderCardBack,
        appendDeckPile,
        playFlipReveal
    };
    // Alias globali: così le pagine/i file esistenti che già chiamano
    // createCardElement(...)/getCardImagePath(...) senza prefisso
    // continuano a funzionare senza modifiche.
    window.createCardElement = createCardElement;
    window.getCardImagePath = getCardImagePath;
})();
