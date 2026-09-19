/**
 * monster-hologram.js — un ologramma in finto 3D sopra ogni mostro
 * scoperto sul Terreno, stile Master Duel.
 * =====================================================================
 *
 * GENERICO PER TUTTE LE CARTE, NESSUN LAVORO PER CARTA. Serve solo
 * l'illustrazione — che `getCardImagePath(card)` (js/ui/card-renderer.js)
 * risolve già centralmente per id, comprese le carte personalizzate e i
 * set non-Yu-Gi-Oh — più la posizione dello slot a schermo. Non c'è nulla
 * da dichiarare sulla singola carta, né oggi né per una carta aggiunta
 * domani. (Se un giorno servisse un trattamento dedicato per UNA carta,
 * il precedente esiste già: `VisualEffects.getVideoFor` usa un filmato
 * dedicato se c'è e ricade sul generico altrimenti.)
 *
 * PERCHÉ VIVE FUORI DAL TERRENO, ed è la parte che conta davvero.
 * `renderFields()` (game-flow.js) ricostruisce l'INTERO Terreno da zero
 * ad ogni `updateUI()`. Misurato su un duello vero: 23 ricostruzioni in
 * 27,5 secondi — circa una al secondo — con 277 elementi carta ricreati.
 * Un ologramma appeso allo slot verrebbe quindi distrutto e ricreato di
 * continuo: l'animazione ripartirebbe da capo ogni volta e si vedrebbe
 * uno sfarfallio costante (è la stessa causa del lampo "Carta coperta"
 * già corretto altrove).
 *
 * Quindi: livello tutto suo (`#monsterHologramLayer`, `position: fixed`
 * fuori dal campo) e aggiornamento INCREMENTALE per uid — si creano solo
 * gli ologrammi dei mostri nuovi, si tolgono solo quelli spariti, e per
 * tutti gli altri si aggiorna la sola posizione. Gli elementi
 * sopravvivono intatti alle ricostruzioni del Terreno, animazione
 * compresa. Stesso principio di posizionamento per `data-uid` già usato
 * da `renderEquipLinks()`.
 *
 * QUANDO SI VEDE. Ha un'impostazione TUTTA SUA, "Visualizzazione
 * ologramma" (js/ui/hologram-setting.js), accesa di default e
 * indipendente dai "Dettagli video" — vedi lì il perché non è agganciata
 * a quelli. Resta comunque disattivabile: è un effetto continuo e ce ne
 * possono essere fino a 10 insieme.
 */
(function () {
    'use strict';

    const LAYER_ID = 'monsterHologramLayer';
    // Geometria, trovata guardando il risultato invece che a tavolino.
    // Primo tentativo: stessa larghezza della carta e altezza 1.9× —
    // l'illustrazione (all'incirca quadrata) veniva ritagliata a una
    // striscia verticale e leggeva come una seconda copia della carta,
    // non come una proiezione. Ora è LARGA più della carta e poco più
    // alta, con l'arte contenuta invece che ritagliata.
    const LARGHEZZA_RELATIVA = 1.5;
    const ALTEZZA_RELATIVA = 1.25;
    // Quanto la figura sale sopra la carta, in frazioni dell'altezza
    // della carta stessa. Le righe del Terreno sono strette: alzarla
    // troppo la farebbe finire addosso alla fila di sopra.
    const SOLLEVAMENTO = 0.55;

    /** Gli ologrammi vivi adesso, per uid — è questa mappa a evitare i redraw. */
    const vivi = new Map();

    function layer() {
        let el = document.getElementById(LAYER_ID);
        if (!el) {
            el = document.createElement('div');
            el.id = LAYER_ID;
            document.body.appendChild(el);
        }
        return el;
    }

    function attivo() {
        // Impostazione DEDICATA (js/ui/hologram-setting.js), non più i
        // "Dettagli video": quelli partono da "Normali", e agganciarci un
        // effetto che deve essere acceso di default lo avrebbe lasciato
        // invisibile alla stragrande maggioranza dei giocatori.
        // Se il modulo non è caricato l'effetto resta spento: una pagina
        // che non lo include non deve ritrovarselo addosso.
        return !!(window.HologramSetting && typeof HologramSetting.isAttivo === 'function' && HologramSetting.isAttivo());
    }

    function creaOlogramma(card, owner) {
        const item = document.createElement('div');
        item.className = 'mh-item';
        item.dataset.uid = card.uid;
        item.dataset.owner = owner;

        const corpo = document.createElement('div');
        corpo.className = 'mh-corpo';

        const art = document.createElement('img');
        art.className = 'mh-art';
        // alt vuoto: immagine dichiaratamente decorativa (la carta vera è
        // lì sotto, leggibile). Stessa ragione già applicata alle <img>
        // di card-renderer.js — un alt non vuoto viene DIPINTO mentre
        // l'immagine carica, e qui apparirebbe a mezz'aria.
        art.alt = '';
        art.src = window.getCardImagePath ? getCardImagePath(card) : '';
        // Se l'illustrazione non esiste, niente ologramma: una figura
        // vuota sarebbe peggio dell'assenza.
        art.onerror = () => rimuovi(card.uid);

        const scan = document.createElement('div');
        scan.className = 'mh-scan';
        const base = document.createElement('div');
        base.className = 'mh-base';

        corpo.appendChild(art);
        corpo.appendChild(scan);
        item.appendChild(corpo);
        item.appendChild(base);
        layer().appendChild(item);
        return item;
    }

    function rimuovi(uid) {
        const item = vivi.get(uid);
        if (item && item.parentNode) item.parentNode.removeChild(item);
        vivi.delete(uid);
    }

    /** Riporta l'ologramma sopra la carta, senza toccarne le animazioni. */
    function posiziona(item, cardEl) {
        const r = cardEl.getBoundingClientRect();
        // Un rect a 0x0 (carta non ancora disposta dal layout) darebbe un
        // ologramma grande zero in alto a sinistra: si salta, stesso
        // accorgimento di renderEquipLinks().
        if (r.width === 0 && r.height === 0) return false;
        const w = r.width * LARGHEZZA_RELATIVA;
        const h = r.height * ALTEZZA_RELATIVA;
        // Centrato sulla carta e sollevato: la base del fascio resta
        // dentro la carta, così la figura sembra uscire DA LÌ.
        item.style.left = `${Math.round(r.left + (r.width - w) / 2)}px`;
        item.style.width = `${Math.round(w)}px`;
        item.style.height = `${Math.round(h)}px`;
        item.style.top = `${Math.round(r.bottom - h - r.height * SOLLEVAMENTO)}px`;
        return true;
    }

    /**
     * Allinea gli ologrammi allo stato attuale del Terreno. Chiamata alla
     * fine di updateUI() e sul resize — mai un "ridisegna tutto": crea,
     * toglie e riposiziona solo ciò che è cambiato davvero.
     */
    function sync() {
        if (!attivo()) {
            if (vivi.size) { vivi.forEach((_, uid) => rimuovi(uid)); }
            return;
        }
        if (typeof gameState === 'undefined' || !gameState || !gameState.playerMonsterField || !gameState.botMonsterField) return;

        const attesi = new Set();
        ['player', 'bot'].forEach((owner) => {
            const campo = owner === 'player' ? gameState.playerMonsterField : gameState.botMonsterField;
            campo.forEach((slot) => {
                // Solo mostri SCOPERTI: una carta coperta è
                // un'informazione nascosta, proiettarla la rivelerebbe.
                if (!slot || slot.isFaceDown || !slot.card || !slot.card.uid) return;
                // MAI un querySelector sull'intero documento: lo stesso
                // uid vive anche nelle carte che il picker delle scelte
                // lascia nel DOM a modale chiuso, larghe zero — e
                // trovando quelle l'ologramma non nasceva affatto (bug
                // reale su Richiamo della Mummia). Vedi il commento
                // completo su findFieldCardElementByUid in game-flow.js.
                const cardEl = typeof findFieldCardElementByUid === 'function'
                    ? findFieldCardElementByUid(slot.card.uid)
                    : document.querySelector(`#${owner === 'player' ? 'playerFieldBoard' : 'botFieldBoard'} .card[data-uid="${slot.card.uid}"]`);
                if (!cardEl) return;
                let item = vivi.get(slot.card.uid);
                if (!item) {
                    item = creaOlogramma(slot.card, owner);
                    vivi.set(slot.card.uid, item);
                } else if (item.dataset.owner !== owner) {
                    // Il mostro ha cambiato lato (Cambio di Cuore e
                    // simili): cambia solo l'attributo, così l'inclinazione
                    // si gira senza ricreare nulla.
                    item.dataset.owner = owner;
                }
                if (posiziona(item, cardEl)) attesi.add(slot.card.uid);
            });
        });

        // Spariti dal Terreno (distrutti, tornati in mano, girati coperti).
        vivi.forEach((_, uid) => { if (!attesi.has(uid)) rimuovi(uid); });
    }

    let timerResize = null;
    window.addEventListener('resize', () => {
        clearTimeout(timerResize);
        timerResize = setTimeout(sync, 120);
    });

    window.MonsterHolograms = { sync: sync, isAttivo: attivo };
})();
