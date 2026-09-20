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

        // Tre livelli invece di uno, e il motivo è lo ZOOM:
        //   el        .nm-viewport — ferma, ritaglia, e ospita i comandi
        //   scroll    .nm-scroll   — l'unica cosa che scorre
        //   mondo     .nm-mondo    — grande quanto il mondo PER lo zoom:
        //                            è lui a dire allo scroll quanto c'è
        //                            da percorrere
        //   canvas    .nm-canvas   — grande quanto il mondo, ingrandito
        //                            con una transform
        // I comandi dello zoom devono restare fermi in un angolo: dentro
        // il contenitore che scorre se ne andrebbero via con la mappa,
        // perché `position: absolute` in un elemento con overflow scorre
        // insieme al contenuto.
        const scroll = document.createElement('div');
        scroll.className = 'nm-scroll';
        const mondo = document.createElement('div');
        mondo.className = 'nm-mondo';
        scroll.appendChild(mondo);

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

        mondo.appendChild(canvas);
        el.appendChild(scroll);
        abilitaTrascinamento(scroll);
        abilitaZoom(el, scroll, mondo, canvas, larghezza, altezza);
        centraSu(el, nodi.find((n) => n.stato === 'corrente') || nodi[nodi.length - 1], { morbido: true });
        return canvas;
    }

    /**
     * Fin dove si può allargare, e il minimo di GUARDIA.
     *
     * Il minimo vero non è questo numero: è il più piccolo fra questo e lo
     * zoom che fa entrare tutta la mappa (vedi `minimoUtile`). Le mappe
     * della Storia sono alte fino a 3400px contro una finestra da ~600, e
     * con un minimo fisso a 0.35 il pulsante "tutta la mappa" prometteva
     * una cosa che non poteva mantenere — misurato: a 0.35 il mondo
     * restava alto 1190px in una finestra di 624.
     */
    const ZOOM_MIN_GUARDIA = 0.35;
    const ZOOM_MAX = 2.2;
    /** Di quanto cambia lo zoom a ogni tocco dei pulsanti + e −. */
    const ZOOM_PASSO = 1.25;

    /**
     * Zoom della mappa: pulsanti, rotellina col tasto Ctrl, e pizzico a
     * due dita. Il valore vive sull'elemento (`el.__nmZoom`) invece che in
     * una variabile del modulo perché ci può essere più di una mappa nella
     * stessa pagina, e perché `centraSu` — che è pubblica — deve poterlo
     * leggere per convertire le coordinate del mondo in pixel a schermo.
     *
     * Come funziona: il canvas resta grande quanto il mondo e viene
     * ingrandito con una transform (l'unica cosa che il browser sa animare
     * senza rifare il layout di centinaia di nodi); è `.nm-mondo`, il suo
     * contenitore, a crescere davvero, ed è quello a dire al contenitore
     * che scorre quanto c'è da percorrere. Ridimensionare invece ogni nodo
     * significherebbe ricalcolare il layout dell'intera mappa a ogni
     * frame di un pizzico.
     */
    function abilitaZoom(el, scroll, mondo, canvas, larghezza, altezza) {
        // Lo zoom che fa entrare TUTTA la mappa nella finestra, e il
        // minimo consentito — che è quello, se è più piccolo della
        // guardia: non avrebbe senso impedire di vedere l'intera mappa su
        // una mappa molto alta, che è proprio il caso in cui serve.
        function zoomDiAdattamento() {
            if (!scroll.clientWidth || !scroll.clientHeight) return 1;
            return Math.min(scroll.clientWidth / larghezza, scroll.clientHeight / altezza);
        }
        function minimoUtile() {
            return Math.min(ZOOM_MIN_GUARDIA, zoomDiAdattamento());
        }

        function applica(zoom, fuocoX, fuocoY) {
            const precedente = el.__nmZoom || 1;
            const nuovo = Math.min(ZOOM_MAX, Math.max(minimoUtile(), zoom));
            if (Math.abs(nuovo - precedente) < 0.0005) return;

            // Il punto del MONDO che sta sotto al centro dello sguardo (o
            // sotto le dita) deve restarci anche dopo: senza questo, ogni
            // zoom riporta la vista in un punto a caso e la mappa diventa
            // impossibile da esplorare.
            const cx = (fuocoX === undefined) ? scroll.clientWidth / 2 : fuocoX;
            const cy = (fuocoY === undefined) ? scroll.clientHeight / 2 : fuocoY;
            const mondoX = (scroll.scrollLeft + cx) / precedente;
            const mondoY = (scroll.scrollTop + cy) / precedente;

            el.__nmZoom = nuovo;
            mondo.style.width = (larghezza * nuovo) + 'px';
            mondo.style.height = (altezza * nuovo) + 'px';
            canvas.style.transform = 'scale(' + nuovo + ')';
            scroll.scrollLeft = mondoX * nuovo - cx;
            scroll.scrollTop = mondoY * nuovo - cy;
            if (etichetta) etichetta.textContent = Math.round(nuovo * 100) + '%';
        }
        el.__nmApplicaZoom = applica;

        const comandi = document.createElement('div');
        comandi.className = 'nm-zoom';
        const etichetta = document.createElement('span');
        etichetta.className = 'nm-zoom-valore';
        etichetta.textContent = '100%';

        function pulsante(testo, titolo, onClick) {
            const b = document.createElement('button');
            b.type = 'button';
            b.className = 'nm-zoom-btn';
            b.textContent = testo;
            b.title = titolo;
            b.setAttribute('aria-label', titolo);
            b.addEventListener('click', (e) => {
                e.stopPropagation();
                if (window.NativeHaptics) NativeHaptics.light();
                onClick();
            });
            return b;
        }

        comandi.append(
            pulsante('−', 'Riduci', () => applica((el.__nmZoom || 1) / ZOOM_PASSO)),
            etichetta,
            pulsante('+', 'Ingrandisci', () => applica((el.__nmZoom || 1) * ZOOM_PASSO)),
            pulsante('⤢', 'Tutta la mappa', () => {
                applica(zoomDiAdattamento(), 0, 0);
                scroll.scrollLeft = 0;
                scroll.scrollTop = 0;
            })
        );
        el.appendChild(comandi);

        // Rotellina SOLO con Ctrl/Cmd: da sola deve continuare a far
        // scorrere la mappa, che è quello che ci si aspetta da un
        // contenitore lungo. È la stessa convenzione di qualunque mappa
        // sul web.
        scroll.addEventListener('wheel', (e) => {
            if (!e.ctrlKey && !e.metaKey) return;
            e.preventDefault();
            const r = scroll.getBoundingClientRect();
            const fattore = Math.exp(-e.deltaY * 0.0015);
            applica((el.__nmZoom || 1) * fattore, e.clientX - r.left, e.clientY - r.top);
        }, { passive: false });

        // Pizzico a due dita. Si seguono i puntatori a mano invece di
        // affidarsi agli eventi `gesture*`, che esistono solo su Safari.
        const dita = new Map();
        let distanzaIniziale = 0;
        let zoomIniziale = 1;
        scroll.addEventListener('pointerdown', (e) => {
            if (e.pointerType === 'mouse') return;
            dita.set(e.pointerId, { x: e.clientX, y: e.clientY });
            if (dita.size === 2) {
                const [a, b] = [...dita.values()];
                distanzaIniziale = Math.hypot(a.x - b.x, a.y - b.y);
                zoomIniziale = el.__nmZoom || 1;
            }
        });
        scroll.addEventListener('pointermove', (e) => {
            if (!dita.has(e.pointerId)) return;
            dita.set(e.pointerId, { x: e.clientX, y: e.clientY });
            if (dita.size !== 2 || !distanzaIniziale) return;
            e.preventDefault();
            const [a, b] = [...dita.values()];
            const distanza = Math.hypot(a.x - b.x, a.y - b.y);
            const r = scroll.getBoundingClientRect();
            applica(
                zoomIniziale * (distanza / distanzaIniziale),
                (a.x + b.x) / 2 - r.left,
                (a.y + b.y) / 2 - r.top
            );
        }, { passive: false });
        const alzaDito = (e) => {
            dita.delete(e.pointerId);
            if (dita.size < 2) distanzaIniziale = 0;
        };
        scroll.addEventListener('pointerup', alzaDito);
        scroll.addEventListener('pointercancel', alzaDito);

        // Stato di partenza: grandezza naturale, cioè esattamente la mappa
        // di sempre, centrata sulla tappa corrente. Un primo tentativo
        // apriva già rimpicciolito quanto bastava a vedere tutta la
        // larghezza, ma su un telefono voleva dire aprire al 24%, con i
        // nomi delle tappe illeggibili: la richiesta era POTER cambiare
        // ingrandimento, non partire da un altro.
        el.__nmZoom = 1;
        mondo.style.width = larghezza + 'px';
        mondo.style.height = altezza + 'px';
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
        // A scorrere è il livello interno, non la finestra: chi chiama
        // passa il contenitore che conosce (#mappaViewport) e non deve
        // sapere com'è fatta la mappa dentro.
        const scroll = viewport.querySelector('.nm-scroll') || viewport;
        // Le coordinate dei nodi sono nel MONDO: con lo zoom attivo vanno
        // moltiplicate, altrimenti si centra su un punto sbagliato tanto
        // quanto lo zoom è lontano da 1.
        const zoom = viewport.__nmZoom || 1;
        const x = Math.max(0, nodo.x * zoom - scroll.clientWidth / 2);
        const y = Math.max(0, nodo.y * zoom - scroll.clientHeight / 2);
        const morbido = opzioni && opzioni.morbido
            && !(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches)
            && typeof scroll.scrollTo === 'function';
        if (!morbido) {
            scroll.scrollLeft = x;
            scroll.scrollTop = y;
            return;
        }
        // Si parte da sotto il bersaglio, mai da sopra: la storia sale
        // verso l'alto della mappa, quindi arrivare dal basso è il verso
        // in cui si sta già andando.
        scroll.scrollLeft = x;
        scroll.scrollTop = Math.max(0, y + 110);
        requestAnimationFrame(() => {
            scroll.scrollTo({ left: x, top: y, behavior: 'smooth' });
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
