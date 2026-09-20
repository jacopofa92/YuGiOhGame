/**
 * node-map.js — Disegna un sentiero di nodi su una mappa esplorabile.
 * =====================================================================
 * Componente condiviso, come js/ui/topbar.js e js/ui/page-loader.js.
 * Prende un elenco di nodi già posizionati e li disegna: pallini
 * collegati da una linea, su uno sfondo più grande dello schermo che si
 * esplora scorrendo o trascinando.
 *
 * NON decide niente. Non sa cosa sia una campagna, un torneo o un
 * duello: riceve nodi con `x`, `y`, `icona`, `label` e uno `stato`, e
 * avvisa chi lo usa quando se ne clicca uno. Tutta la logica (cosa sia
 * sbloccato, cosa succede al click) resta di chi lo chiama.
 *
 * Perché esiste invece di copiare la mappa dei tornei: quelle tre pagine
 * generano il percorso man mano, a bivi, ed è la loro natura — la
 * sorpresa è il punto. Un sentiero di storia è invece scritto in
 * anticipo, quindi qui non c'è niente da generare, solo da disegnare. I
 * tornei potrebbero un giorno passare da qui, ma migrarli adesso
 * vorrebbe dire riscrivere tre pagine grosse senza che nessuno l'abbia
 * chiesto.
 *
 * Gli stati previsti sono tre: 'fatta' (già superata), 'corrente'
 * (l'unica su cui si può cliccare) e 'bloccata'.
 */
(function () {
    'use strict';

    /**
     * Disegna la mappa dentro `contenitore`.
     *
     * opzioni:
     *   nodi        [{ id, x, y, icona, label, stato }]
     *   larghezza   dimensioni del mondo in px (lo sfondo si ripete oltre)
     *   altezza
     *   sfondo      immagine di sfondo (facoltativa). Un percorso, oppure
     *               un ELENCO di candidati in ordine di preferenza: si usa
     *               il primo che esiste davvero. Serve a poter già puntare
     *               a un'immagine che il repository non ha ancora —
     *               "images/story/ww1.jpg" — tenendo come ripiego quella
     *               attuale: il giorno in cui il file viene aggiunto, la
     *               mappa lo usa da sola, senza toccare il codice.
     *   onSelect    chiamata col nodo cliccato
     *   cliccabili  quali stati rispondono al click. Default ['corrente'],
     *               cioè il comportamento di sempre: la sola tappa
     *               giocabile. La Storia ci aggiunge 'fatta', perché lì
     *               una tappa superata è un pezzo di racconto che si può
     *               voler rileggere — in un torneo, dove le tappe sono
     *               solo duelli già vinti, non ci sarebbe niente da
     *               riaprire.
     *
     * Un singolo nodo può smentire `cliccabili` con `apribile: false`.
     * Serve perché "superata" non vuol dire la stessa cosa per tutte le
     * tappe: nella Storia una scena già vista si rilegge volentieri, ma
     * un duello già vinto NON deve poter ripartire — lo si rigiocherebbe
     * e il suo esito verrebbe contato una seconda volta.
     */
    function render(contenitore, opzioni) {
        const el = typeof contenitore === 'string' ? document.querySelector(contenitore) : contenitore;
        if (!el) return null;
        const o = opzioni || {};
        const nodi = o.nodi || [];

        el.classList.add('nm-viewport');
        el.innerHTML = '';

        const canvas = document.createElement('div');
        canvas.className = 'nm-canvas';
        // Il mondo non è mai più piccolo della finestra, altrimenti lo
        // sfondo lascerebbe scoperto un bordo.
        const larghezza = Math.max(o.larghezza || 0, el.clientWidth || 0);
        const altezza = Math.max(o.altezza || 0, el.clientHeight || 0);
        canvas.style.width = larghezza + 'px';
        canvas.style.height = altezza + 'px';
        // Lo sfondo non blocca il disegno: la mappa compare subito sul
        // proprio fondo scuro e l'immagine si posa quando è pronta.
        primaImmagineEsistente(o.sfondo).then((src) => {
            if (!src || !canvas.isConnected) return;
            canvas.style.backgroundImage = `linear-gradient(180deg, rgba(6,7,12,0.45), rgba(6,7,12,0.65)), url('${src}')`;
        });

        // Le linee stanno in un SVG con viewBox uguale al mondo IN PX:
        // pallini e linee usano così lo stesso sistema di coordinate e
        // non possono sfasarsi quando il contenitore cambia dimensione.
        const svgNS = 'http://www.w3.org/2000/svg';
        const svg = document.createElementNS(svgNS, 'svg');
        svg.setAttribute('class', 'nm-lines');
        svg.setAttribute('viewBox', `0 0 ${larghezza} ${altezza}`);
        svg.setAttribute('preserveAspectRatio', 'none');
        for (let i = 1; i < nodi.length; i++) {
            const a = nodi[i - 1];
            const b = nodi[i];
            const linea = document.createElementNS(svgNS, 'line');
            linea.setAttribute('x1', a.x); linea.setAttribute('y1', a.y);
            linea.setAttribute('x2', b.x); linea.setAttribute('y2', b.y);
            // Una tratta è "percorsa" se porta a un nodo già superato:
            // così la linea racconta da sola fin dove sei arrivato. La
            // tratta che porta alla tappa CORRENTE è invece il passo che
            // stai per fare, e si muove: è l'unico tratto animato della
            // mappa, quindi l'occhio ci va da solo anche su un sentiero
            // lungo duemila pixel.
            let classe = 'nm-line';
            if (b.stato === 'fatta') classe += ' nm-line--fatta';
            else if (b.stato === 'corrente') classe += ' nm-line--prossima';
            linea.setAttribute('class', classe);
            svg.appendChild(linea);
        }
        canvas.appendChild(svg);

        const cliccabili = o.cliccabili || ['corrente'];
        nodi.forEach((nodo) => {
            const el2 = document.createElement('button');
            el2.type = 'button';
            const apribile = nodo.apribile === false
                ? false
                : cliccabili.indexOf(nodo.stato) !== -1;
            el2.className = `nm-node nm-node--${nodo.stato || 'bloccata'}` + (apribile ? ' nm-node--apribile' : '');
            el2.style.left = nodo.x + 'px';
            el2.style.top = nodo.y + 'px';
            el2.disabled = !apribile;
            const dot = document.createElement('span');
            dot.className = 'nm-dot';
            if (nodo.stato === 'bloccata') {
                dot.textContent = '🔒';
            } else if (nodo.immagine) {
                // Il volto di chi ti aspetta dice molto piu' di
                // un'emoji: si riconosce l'avversario prima ancora di
                // leggerne il nome. Se l'immagine non c'e' (un
                // personaggio senza ritratto), si ricade sull'icona —
                // mai su un riquadro rotto.
                const img = document.createElement('img');
                img.className = 'nm-ritratto';
                img.src = nodo.immagine;
                img.alt = '';
                img.addEventListener('error', () => {
                    img.remove();
                    dot.textContent = nodo.icona || '•';
                });
                dot.appendChild(img);
                dot.classList.add('nm-dot--ritratto');
            } else {
                dot.textContent = nodo.icona || '•';
            }
            const label = document.createElement('span');
            label.className = 'nm-label';
            // Un nodo bloccato non rivela chi ci aspetta: sarebbe come
            // leggere l'ultima pagina prima della prima.
            label.textContent = nodo.stato === 'bloccata' ? '???' : (nodo.label || '');
            el2.append(dot, label);
            if (apribile && typeof o.onSelect === 'function') {
                el2.addEventListener('click', () => {
                    if (window.NativeHaptics) NativeHaptics.light();
                    o.onSelect(nodo);
                });
            }
            canvas.appendChild(el2);
        });

        el.appendChild(canvas);
        abilitaTrascinamento(el);
        centraSu(el, nodi.find((n) => n.stato === 'corrente') || nodi[nodi.length - 1], { morbido: true });
        return canvas;
    }

    /**
     * Il primo fra i candidati che esiste davvero.
     *
     * Si prova a caricarlo invece di chiedere al server se c'è: una fetch
     * non direbbe nulla di utile su file://, dove il gioco si apre anche
     * con un doppio click. Stesso schema di `risolviSfondo` in
     * js/ui/story-cutscene.js — sono due componenti indipendenti, e
     * mettere in comune quattro righe costringerebbe a caricare l'uno per
     * avere l'altro.
     */
    function primaImmagineEsistente(candidati) {
        const lista = (Array.isArray(candidati) ? candidati : [candidati])
            .filter((v) => typeof v === 'string' && v);
        if (lista.length === 0) return Promise.resolve(null);
        return new Promise((risolvi) => {
            let i = 0;
            const prova = () => {
                if (i >= lista.length) { risolvi(null); return; }
                const src = lista[i++];
                const sonda = new Image();
                sonda.onload = () => risolvi(src);
                sonda.onerror = prova;
                sonda.src = src;
            };
            prova();
        });
    }

    /**
     * Porta il nodo indicato al centro della finestra. Senza, una mappa
     * alta duemila pixel si apre sempre in cima e il giocatore deve
     * cercarsi da solo il punto in cui era arrivato.
     *
     * Con `morbido` la camera non ci salta sopra: si posiziona un po'
     * più in basso e poi scivola in posizione. È un movimento breve, di
     * un centinaio di pixel — NON uno scorrimento animato dall'inizio
     * della mappa, che su un sentiero lungo duemila pixel durerebbe
     * secondi e sembrerebbe una pagina che scappa. Serve solo a far
     * capire che la mappa è un luogo in cui ci si muove, invece di
     * comparire già ferma.
     */
    function centraSu(viewport, nodo, opzioni) {
        if (!nodo) return;
        const x = Math.max(0, nodo.x - viewport.clientWidth / 2);
        const y = Math.max(0, nodo.y - viewport.clientHeight / 2);
        const morbido = opzioni && opzioni.morbido
            && !(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches)
            && typeof viewport.scrollTo === 'function';
        if (!morbido) {
            viewport.scrollLeft = x;
            viewport.scrollTop = y;
            return;
        }
        // Si parte da sotto il bersaglio, mai da sopra: la storia sale
        // verso l'alto della mappa, quindi arrivare dal basso è il verso
        // in cui si sta già andando.
        viewport.scrollLeft = x;
        viewport.scrollTop = Math.max(0, y + 110);
        requestAnimationFrame(() => {
            viewport.scrollTo({ left: x, top: y, behavior: 'smooth' });
        });
    }

    /**
     * Trascinamento col mouse. Su touch non serve: il browser fa già
     * scorrere un contenitore con overflow, e intercettare il tocco qui
     * romperebbe quello che funziona da solo.
     */
    function abilitaTrascinamento(viewport) {
        let attivo = false, partenzaX = 0, partenzaY = 0, scrollX = 0, scrollY = 0;
        viewport.addEventListener('pointerdown', (e) => {
            if (e.pointerType !== 'mouse') return;
            // Un click su un nodo deve restare un click, non un
            // trascinamento da zero pixel.
            if (e.target.closest('.nm-node')) return;
            attivo = true;
            partenzaX = e.clientX; partenzaY = e.clientY;
            scrollX = viewport.scrollLeft; scrollY = viewport.scrollTop;
            viewport.classList.add('nm-dragging');
        });
        window.addEventListener('pointermove', (e) => {
            if (!attivo) return;
            viewport.scrollLeft = scrollX - (e.clientX - partenzaX);
            viewport.scrollTop = scrollY - (e.clientY - partenzaY);
        });
        window.addEventListener('pointerup', () => {
            attivo = false;
            viewport.classList.remove('nm-dragging');
        });
    }

    window.NodeMap = { render: render, centraSu: centraSu };
})();
