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
     *   sfondo      url dell'immagine di sfondo (facoltativa)
     *   onSelect    chiamata col nodo cliccato — solo per lo stato 'corrente'
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
        if (o.sfondo) canvas.style.backgroundImage = `linear-gradient(180deg, rgba(6,7,12,0.45), rgba(6,7,12,0.65)), url('${o.sfondo}')`;

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
            // così la linea racconta da sola fin dove sei arrivato.
            linea.setAttribute('class', 'nm-line' + (b.stato === 'fatta' ? ' nm-line--fatta' : ''));
            svg.appendChild(linea);
        }
        canvas.appendChild(svg);

        nodi.forEach((nodo) => {
            const el2 = document.createElement('button');
            el2.type = 'button';
            el2.className = `nm-node nm-node--${nodo.stato || 'bloccata'}`;
            el2.style.left = nodo.x + 'px';
            el2.style.top = nodo.y + 'px';
            el2.disabled = nodo.stato !== 'corrente';
            const dot = document.createElement('span');
            dot.className = 'nm-dot';
            dot.textContent = nodo.stato === 'bloccata' ? '🔒' : (nodo.icona || '•');
            const label = document.createElement('span');
            label.className = 'nm-label';
            // Un nodo bloccato non rivela chi ci aspetta: sarebbe come
            // leggere l'ultima pagina prima della prima.
            label.textContent = nodo.stato === 'bloccata' ? '???' : (nodo.label || '');
            el2.append(dot, label);
            if (nodo.stato === 'corrente' && typeof o.onSelect === 'function') {
                el2.addEventListener('click', () => o.onSelect(nodo));
            }
            canvas.appendChild(el2);
        });

        el.appendChild(canvas);
        abilitaTrascinamento(el);
        centraSu(el, nodi.find((n) => n.stato === 'corrente') || nodi[nodi.length - 1]);
        return canvas;
    }

    /**
     * Porta il nodo indicato al centro della finestra. Senza, una mappa
     * alta duemila pixel si apre sempre in cima e il giocatore deve
     * cercarsi da solo il punto in cui era arrivato.
     */
    function centraSu(viewport, nodo) {
        if (!nodo) return;
        viewport.scrollLeft = Math.max(0, nodo.x - viewport.clientWidth / 2);
        viewport.scrollTop = Math.max(0, nodo.y - viewport.clientHeight / 2);
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
