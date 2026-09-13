/**
 * js/ui/card-detail.js — LA SCHEDA DI UNA CARTA, CONDIVISA
 * =====================================================================
 * Cartoteca e Creazione Deck avevano ciascuna la propria copia di questa
 * scheda, e il commento su quella di creazione-deck.html diceva:
 * «Resta una copia e non un componente condiviso [...] Se un giorno
 * servisse anche altrove, allora sì.» Quel giorno è arrivato: il Negozio
 * vende carte singole, e chi sta per spendere crediti deve poter leggere
 * cosa fa la carta prima di comprarla.
 *
 * Il modale si costruisce da sé al primo uso e non ha alcun id: si
 * innesta in qualunque pagina senza chiedere markup, e senza rischiare
 * collisioni dentro index.html, dove convivono più viste.
 *
 * Dipendenze tutte FACOLTATIVE e lette con `typeof`: createCardElement
 * per l'anteprima, getCardTerms/formatCardText per la terminologia della
 * provenienza (una carta 'ww1' è una Truppa, non un Mostro),
 * getTributesRequired per i Tributi. Se una manca, la scheda si apre lo
 * stesso con quello che ha — il sito è un insieme di file sciolti su una
 * CDN, e nei minuti dopo una pubblicazione un dispositivo può ricevere
 * questo file già aggiornato e un altro ancora vecchio.
 */
(function () {
    'use strict';

    const TYPE_ICON = { monster: '👑', spell: '✨', trap: '🌀' };
    const FALLBACK_TERMS = {
        monsterSingular: 'Mostro', spellSingular: 'Magia', trapSingular: 'Trappola'
    };

    function escapeHtml(text) {
        return String(text == null ? '' : text).replace(/[&<>"']/g, (ch) => ({
            '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
        })[ch]);
    }
    function termsOf(card) {
        return (typeof getCardTerms === 'function') ? getCardTerms(card) : FALLBACK_TERMS;
    }
    function testoDi(text, card) {
        return (typeof formatCardText === 'function') ? formatCardText(text, card) : text;
    }

    let backdrop = null;
    let preview = null;
    let info = null;

    function costruisci() {
        if (backdrop) return;
        backdrop = document.createElement('div');
        backdrop.className = 'cd-backdrop';
        const card = document.createElement('div');
        card.className = 'cd-card';
        preview = document.createElement('div');
        preview.className = 'cd-preview';
        info = document.createElement('div');
        info.className = 'cd-info';
        const chiudi = document.createElement('button');
        chiudi.type = 'button';
        chiudi.className = 'cd-close';
        chiudi.setAttribute('aria-label', 'Chiudi');
        chiudi.textContent = '×';
        chiudi.onclick = close;
        card.appendChild(chiudi);
        card.appendChild(preview);
        card.appendChild(info);
        backdrop.appendChild(card);
        // Il click FUORI dalla scheda la chiude: confronto sull'elemento
        // vero e non sull'id (un confronto per stringa è già costato un
        // bug in questo progetto, vedi CLAUDE.md).
        backdrop.addEventListener('click', (e) => { if (e.target === backdrop) close(); });
        document.body.appendChild(backdrop);
    }

    function open(card) {
        if (!card) return;
        costruisci();

        preview.innerHTML = '';
        if (typeof window.createCardElement === 'function') {
            const tile = window.createCardElement(card);
            tile.onclick = null;
            preview.appendChild(tile);
        }

        const terms = termsOf(card);
        const typeWord = card.type === 'monster' ? terms.monsterSingular
            : card.type === 'spell' ? terms.spellSingular : terms.trapSingular;
        const tags = [`${TYPE_ICON[card.type] || ''} ${typeWord}`];
        if (card.race) tags.push(card.race);
        if (card.attribute) tags.push(card.attribute);
        if (card.type === 'monster' && card.level) tags.push(`⭐ Livello ${card.level}`);
        const tributi = (typeof getTributesRequired === 'function') ? getTributesRequired(card) : 0;
        if (tributi > 0) tags.push(`Richiede ${tributi} Tribut${tributi > 1 ? 'i' : 'o'}`);
        // La rarità compare solo dove il concetto esiste (serve
        // card-rarity.js, cioè il Negozio): altrove la scheda resta
        // quella di sempre.
        if (window.CardRarity) {
            const r = CardRarity.of(card.id);
            if (r && r !== 'common') tags.push(CardRarity.label(r));
        }

        const fallbackEffetto = card.type === 'monster'
            ? `${terms.monsterSingular} normale senza effetto speciale.`
            : 'Questa carta non presenta un effetto scritto.';

        info.innerHTML = `
            <div class="cd-name">${escapeHtml(card.name)}</div>
            <div class="cd-meta">${tags.map((t) => `<span class="cd-tag">${escapeHtml(t)}</span>`).join('')}</div>
            ${card.type === 'monster' ? `
                <div class="cd-stats">
                    <span class="cd-stat atk">ATK ${card.attack}</span>
                    <span class="cd-stat def">DEF ${card.defense}</span>
                </div>
            ` : ''}
            <p class="cd-effect">${escapeHtml(testoDi(card.effect, card) || fallbackEffetto)}</p>
            ${card.missingEffectNote ? `<p class="cd-note">🟡 Effetto implementato parzialmente: ${escapeHtml(card.missingEffectNote)}</p>` : ''}
        `;
        backdrop.classList.add('open');
    }

    function close() {
        if (backdrop) backdrop.classList.remove('open');
    }

    window.CardDetail = { open: open, close: close };
})();
