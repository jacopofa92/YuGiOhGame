/**
 * topbar.js — Genera il markup della topbar condivisa (vedi
 * js/ui/topbar.css per lo stile) invece di farlo scrivere a mano, quasi
 * identico, su ogni pagina "menu" del gioco. Nato da un audit che ha
 * trovato lo stesso blocco duplicato in ~9 pagine con piccole derive già
 * in corso (z-index diverso tra cartoteca/creazione-deck, breakpoint
 * mobile mancanti del tutto in duello-sandbox.html) — lo stesso rischio
 * di drift già documentato in CLAUDE.md per i tag <script>, qui per il
 * markup invece che per il codice.
 *
 * Uso, in ogni pagina che vuole la topbar standard (al posto del <div
 * class="topbar">...</div> scritto a mano):
 *
 *   <div id="topbarMount"></div>
 *   <script src="js/ui/topbar.js"></script>
 *   <script>
 *       PageTopbar.render('#topbarMount', { icon: 'shop', title: 'Negozio' });
 *   </script>
 *
 * Va chiamata PRIMA di Icons.hydrate() (di norma già verso l'inizio
 * dello script della pagina): l'icona è inserita come normale
 * <span data-icon="…"> (stessa convenzione di icon-library.js, vedi
 * lì), quindi la successiva hydrate() la sostituisce con l'SVG vero
 * insieme a tutte le altre icone della pagina — questo file non chiama
 * Icons.hydrate() da sé, per non farlo girare due volte.
 */
(function () {
    'use strict';

    /**
     * @param {string} mountSelector - selettore CSS di un elemento vuoto
     *   già presente in pagina, che questa funzione sostituisce con la
     *   topbar vera.
     * @param {object} opts
     * @param {string} opts.icon - nome icona per icon-library.js (es. 'shop').
     * @param {string} opts.title - testo del titolo.
     * @param {string} [opts.subtitle] - sottotitolo opzionale sotto il titolo
     *   (es. "Scegli un duellante da sfidare" in duello-libero.html).
     * @param {string} [opts.backHref='index.html'] - destinazione FISSA
     *   del pulsante Indietro: il genitore logico di questa pagina
     *   nell'ALBERO dell'applicazione (quasi sempre il menu principale),
     *   non "qualunque pagina da cui si è arrivati". Deliberatamente MAI
     *   basato su document.referrer (rimosso da questo file dopo un bug
     *   reale segnalato dall'utente: "l'attuale pulsante indietro porta
     *   alla pagina precedente [del browser]... voglio che ragioni a
     *   livello di applicazione") — un back-button che segue la cronologia
     *   di navigazione reale porta a destinazioni diverse a seconda di
     *   COME si è arrivati alla pagina (es. Negozio raggiunto da
     *   Creazione Deck riporterebbe a Creazione Deck invece che al menu),
     *   invece di riflettere sempre lo stesso posto logico in cui quella
     *   pagina "vive" nella gerarchia del gioco.
     * @param {function} [opts.onBack] - handler onclick personalizzato per
     *   una destinazione calcolata a runtime (es. showMenuFromView() per
     *   le viste SPA fuse dentro index.html) invece di un href fisso —
     *   deve tornare `false` per impedire la normale navigazione via
     *   href, come un onclick HTML qualunque.
     * @returns {HTMLElement|undefined} l'elemento .topbar appena creato
     *   (undefined se mountSelector non trova nulla) — utile per
     *   aggiungerci altro contenuto extra, vedi il commento più sotto.
     */
    function render(mountSelector, opts) {
        const mount = typeof mountSelector === 'string' ? document.querySelector(mountSelector) : mountSelector;
        if (!mount) return undefined;
        const backHref = (opts && opts.backHref) || 'index.html';

        const topbar = document.createElement('div');
        topbar.className = 'topbar';

        const backBtn = document.createElement('a');
        backBtn.className = 'back-btn';
        backBtn.title = 'Indietro';
        backBtn.href = backHref;
        backBtn.textContent = '‹';
        if (opts && typeof opts.onBack === 'function') {
            backBtn.onclick = opts.onBack;
        }
        // Nessun else: senza onBack, il click naviga semplicemente verso
        // backHref via il normale href dell'ancora — nessun handler JS
        // necessario per il caso comune.
        topbar.appendChild(backBtn);

        const titleWrap = document.createElement('div');
        titleWrap.className = 'topbar-title';
        if (opts && opts.icon) {
            const iconSpan = document.createElement('span');
            iconSpan.dataset.icon = opts.icon;
            titleWrap.appendChild(iconSpan);
            titleWrap.appendChild(document.createTextNode(' ' + ((opts && opts.title) || '')));
        } else {
            titleWrap.textContent = (opts && opts.title) || '';
        }
        topbar.appendChild(titleWrap);

        if (opts && opts.subtitle) {
            // SIBLING di .topbar-title, non annidato — stesso markup
            // originale di duello-libero.html (.page-subtitle era un
            // <span> fratello, non un figlio del titolo).
            const subtitleEl = document.createElement('span');
            subtitleEl.className = 'topbar-subtitle';
            subtitleEl.textContent = opts.subtitle;
            topbar.appendChild(subtitleEl);
        }

        mount.replaceWith(topbar);
        // Tornata utile a chi ha bisogno di aggiungere QUALCOSA in più
        // nella topbar oltre a icona/titolo/sottotitolo (es. il badge
        // "0/30 Deck" di creazione-deck.html): topbar.appendChild(...)
        // sull'elemento restituito, invece di reinventare l'intera
        // topbar a mano per un singolo elemento extra.
        return topbar;
    }

    window.PageTopbar = { render: render };
})();
