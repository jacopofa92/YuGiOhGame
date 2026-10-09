/**
 * js/ui/card-detail.js — LA SCHEDA DI UNA CARTA, CONDIVISA
 * =====================================================================
 * L'UNICA scheda di dettaglio carta del gioco: Cartoteca (pagina e vista
 * del menu), Creazione Deck, Negozio e sbustamento aprono tutti questa,
 * con CardDetail.open(card). Prima ce n'erano quattro copie scritte a
 * mano, andate alla deriva fra loro: la copia nel menu aveva perso il
 * riquadro "Come si ottiene", due non proteggevano il nome della carta
 * (una carta personalizzata è testo libero dell'utente, e finiva in
 * innerHTML così com'era). Una funzione nuova della scheda va aggiunta
 * qui, e la vedono tutti.
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
    let scheda = null;
    let preview = null;
    let info = null;
    let azioniBox = null;
    // Le opzioni della scheda aperta adesso: servono ad aggiorna(), che
    // ridisegna riepilogo e pulsanti dopo un'azione senza riaprire tutto.
    let opzioniCorrenti = null;

    function costruisci() {
        if (backdrop) return;
        backdrop = document.createElement('div');
        backdrop.className = 'cd-backdrop';
        scheda = document.createElement('div');
        scheda.className = 'cd-card';
        preview = document.createElement('div');
        preview.className = 'cd-preview';
        info = document.createElement('div');
        info.className = 'cd-info';
        // Pulsanti d'azione (facoltativi, vedi open): figlio DIRETTO della
        // scheda e non di .cd-info, perché è la scheda a scorrere. Solo così
        // la barra può restare incollata in fondo (position: sticky) anche
        // su un telefono, dove l'anteprima grande spinge il testo sotto.
        azioniBox = document.createElement('div');
        azioniBox.className = 'cd-azioni';
        const chiudi = document.createElement('button');
        chiudi.type = 'button';
        chiudi.className = 'cd-close';
        chiudi.setAttribute('aria-label', 'Chiudi');
        chiudi.textContent = '×';
        chiudi.onclick = close;
        scheda.appendChild(chiudi);
        scheda.appendChild(preview);
        scheda.appendChild(info);
        scheda.appendChild(azioniBox);
        backdrop.appendChild(scheda);
        // Il click FUORI dalla scheda la chiude: confronto sull'elemento
        // vero e non sull'id (un confronto per stringa è già costato un
        // bug in questo progetto, vedi CLAUDE.md).
        backdrop.addEventListener('click', (e) => { if (e.target === backdrop) close(); });
        document.body.appendChild(backdrop);
        // Esc chiude la scheda, e SOLO lei: in fase di cattura e fermando
        // l'evento, così un ascoltatore della pagina (Creazione Deck chiude
        // con Esc la lista carte che sta sotto la scheda) non chiude anche
        // la finestra di sotto con lo stesso tasto. Una schermata per volta,
        // dalla più in alto.
        window.addEventListener('keydown', (e) => {
            if (e.key !== 'Escape' || !isOpen()) return;
            e.stopPropagation();
            close();
        }, true);
    }

    /**
     * Apre la scheda di `card`. `opzioni` (facoltativo) aggiunge in fondo
     * una barra d'azione, per le pagine in cui dalla scheda si FA qualcosa
     * (Creazione Deck: aggiungi al mazzo / togli una copia):
     *   riepilogo: () => testo   una riga sopra i pulsanti (es. le copie)
     *   azioni:    () => [{ testo, onClick, stile, disabilitata, motivo }]
     *              stile: 'primaria' | 'pericolo' | '' ; `motivo` compare
     *              come suggerimento su un pulsante disabilitato.
     * Sono FUNZIONI e non valori: dopo ogni tocco la barra si ridisegna da
     * sola richiamandole, così i conteggi e i pulsanti disabilitati restano
     * veri senza che la pagina debba riaprire la scheda.
     */
    function open(card, opzioni) {
        if (!card) return;
        costruisci();
        opzioniCorrenti = opzioni || null;

        preview.innerHTML = '';
        if (typeof window.createCardElement === 'function') {
            const tile = window.createCardElement(card);
            tile.onclick = null;
            preview.appendChild(tile);
            // La carta protagonista della scheda si inclina e riflette la
            // luce secondo la sua rarità (js/ui/card-renderer.js): il mouse
            // si ascolta su tutta l'anteprima, sul telefono il giroscopio.
            if (window.CartaViva) CartaViva.rendi(tile, card, { modo: 'grande', area: preview });
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
            ${window.CardAcquisition ? `<div class="cd-acquisition"><strong>Come si ottiene</strong><span>${escapeHtml(CardAcquisition.sourceFor(card.id))}</span>${CardAcquisition.progressFor && CardAcquisition.progressFor(card.id) ? `<small>Progresso: ${escapeHtml(CardAcquisition.progressFor(card.id))}</small>` : ''}</div>` : ''}
            ${card.missingEffectNote ? `<p class="cd-note">🟡 Effetto implementato parzialmente: ${escapeHtml(card.missingEffectNote)}</p>` : ''}
        `;
        aggiorna();
        backdrop.classList.add('open');
    }

    /** Ridisegna riepilogo e pulsanti della scheda aperta (dopo un'azione, o quando la pagina cambia qualcosa sotto). */
    function aggiorna() {
        if (!azioniBox) return;
        const o = opzioniCorrenti;
        const azioni = o && typeof o.azioni === 'function' ? (o.azioni() || []) : [];
        const riepilogo = o && typeof o.riepilogo === 'function' ? o.riepilogo() : '';
        scheda.classList.toggle('cd-con-azioni', azioni.length > 0);
        azioniBox.innerHTML = '';
        if (!azioni.length) return;
        if (riepilogo) {
            const r = document.createElement('div');
            r.className = 'cd-riepilogo';
            r.textContent = riepilogo;
            azioniBox.appendChild(r);
        }
        const fila = document.createElement('div');
        fila.className = 'cd-azioni-fila';
        azioni.forEach((a) => {
            const b = document.createElement('button');
            b.type = 'button';
            b.className = 'cd-azione' + (a.stile ? ' cd-azione--' + a.stile : '');
            b.textContent = a.testo;
            b.disabled = !!a.disabilitata;
            if (a.motivo) b.title = a.motivo;
            b.onclick = () => {
                if (typeof a.onClick === 'function') a.onClick(b);
                aggiorna();
            };
            fila.appendChild(b);
        });
        azioniBox.appendChild(fila);
        // Il motivo di un pulsante spento si LEGGE anche col dito: su un
        // telefono un title non compare mai.
        const motivi = azioni.filter((a) => a.disabilitata && a.motivo).map((a) => a.motivo);
        if (motivi.length) {
            const m = document.createElement('div');
            m.className = 'cd-motivo';
            m.textContent = motivi[0];
            azioniBox.appendChild(m);
        }
    }

    function close() {
        if (backdrop) backdrop.classList.remove('open');
        opzioniCorrenti = null;
    }

    function isOpen() {
        return !!backdrop && backdrop.classList.contains('open');
    }

    /** L'anteprima della carta nella scheda aperta: chi anima un'azione la usa come punto di partenza. */
    function anteprima() {
        return isOpen() && preview ? preview.querySelector('.card') : null;
    }

    window.CardDetail = { open: open, close: close, isOpen: isOpen, aggiorna: aggiorna, anteprima: anteprima };
})();
