/**
 * story-map-editor.js — TOOLBOX DA AMMINISTRATORE PER LA MAPPA DELLA STORIA
 * =====================================================================
 * Richiesto esplicitamente dall'utente dopo aver dovuto misurare a mano,
 * ritagliando screenshot, il centro delle arene della mappa anime: uno
 * strumento per spostare/modificare/cancellare/creare un nodo di QUALUNQUE
 * storia direttamente dentro il gioco, invece che a colpi di coordinate
 * indovinate e commit di prova.
 *
 * STESSO SCHEMA DI SICUREZZA DI js/dev/test-shortcuts.js (StoryAutowin):
 * due condizioni insieme, ricontrollate ad ogni chiamata e mai decise una
 * volta sola al caricamento —
 *   1. l'interruttore acceso su QUESTO dispositivo (localStorage), che si
 *      trova nel Pannello Admin (admin.html);
 *   2. l'account in uso deve essere DAVVERO un amministratore
 *      (CloudSync.isAdmin()).
 * Di default è spento: un amministratore che non l'ha mai acceso vede la
 * Storia come chiunque altro.
 *
 * DOVE FINISCONO LE MODIFICHE. L'editor lavora sugli oggetti veri del
 * catalogo in memoria (si vede subito sulla mappa). Per renderle
 * permanenti c'è "📂 Collega file": si sceglie UNA volta a sessione il
 * file js/data/story-ritocchi.js (File System Access API di Chrome/Edge,
 * che funziona anche aprendo il gioco a doppio clic) e da lì ogni modifica
 * lo riscrive per intero con le differenze rispetto al catalogo — vedi
 * js/story/story-ritocchi.js, che le applica in ogni pagina.
 *
 * Perché un file a parte invece del catalogo stesso
 * (js/data/story-campaigns.js): il catalogo è scritto a mano, con
 * commenti e più proprietà sulla stessa riga, e riscriverlo a pezzi da un
 * browser rischierebbe di romperlo — la prima versione di questo editor lo
 * faceva solo per field/music, proprio per quel rischio. Il file dei
 * ritocchi invece è tutto generato: riscriverlo per intero non può rompere
 * niente. "📋 Esporta codice" resta per consolidare i ritocchi nel
 * catalogo quando lo si vuole fare a mano.
 *
 * COME SI AGGANCIA ALLA PAGINA — zero righe toccate in storia.html:
 * si avvolge `NodeMap.render` (come test-shortcuts.js avvolge
 * `StoryProgress.urlDuello`): quando la modalità editor è spenta la
 * funzione originale gira invariata; quando è accesa questo file ignora
 * gli argomenti che storia.html passerebbe (calcolati da
 * StoryProgress.getTappeConStato, che CLONA le tappe e nasconde quelle
 * bloccate: inadatti a un editor, che deve vedere e scrivere sugli
 * oggetti VERI) e ridisegna da sé, leggendo `campaignId`/`torneoId`
 * dall'URL — la stessa fonte che usa storia.html — e risalendo da lì
 * fino agli oggetti originali dentro `storyCampaignsDatabase`.
 */
(function () {
    'use strict';

    // ================================================================
    // L'interruttore (stesso schema di StoryAutowin in test-shortcuts.js)
    // ================================================================
    const CHIAVE_INTERRUTTORE = 'ygoStoryMapEditor';
    // La modalità (accesa/spenta in QUESTA scheda) sopravvive a un
    // drill-in/drill-out da un'area — altrimenti ogni click su un nodo
    // 'area' per aprirne la mappa spegnerebbe l'editor e costringerebbe a
    // riaccenderlo ad ogni livello.
    const CHIAVE_SESSIONE = 'ygoStoryMapEditorSessione';

    function interruttoreAcceso() {
        try { return localStorage.getItem(CHIAVE_INTERRUTTORE) === 'on'; } catch (e) { return false; }
    }
    function sonoAdmin() {
        return !!(window.CloudSync && typeof CloudSync.isAdmin === 'function' && CloudSync.isAdmin());
    }
    function editorDisponibile() { return interruttoreAcceso() && sonoAdmin(); }

    function modalitaAttiva() {
        try { return editorDisponibile() && sessionStorage.getItem(CHIAVE_SESSIONE) === 'on'; }
        catch (e) { return false; }
    }
    function impostaModalita(on) {
        try { sessionStorage.setItem(CHIAVE_SESSIONE, on ? 'on' : 'off'); } catch (e) { /* niente da fare */ }
    }

    // API per il Pannello Admin (admin.html) — stessa forma di StoryAutowin.
    window.StoryMapEditor = {
        disponibile: sonoAdmin,
        acceso: interruttoreAcceso,
        imposta: function (on) {
            try { localStorage.setItem(CHIAVE_INTERRUTTORE, on ? 'on' : 'off'); } catch (e) { /* niente da fare */ }
            if (!on) impostaModalita(false);
            return interruttoreAcceso();
        }
    };

    // Il resto del file serve solo su storia.html, e solo dopo che
    // NodeMap esiste (deve caricarsi PRIMA — vedi il tag <script> in
    // storia.html, subito dopo test-shortcuts.js).
    if (!/storia\.html/.test(location.pathname) || !window.NodeMap) return;

    // ================================================================
    // Accesso ai dati GREZZI (non i cloni con lo stato di
    // js/story/story-progress.js): serve scrivere sugli oggetti veri.
    // ================================================================
    function datiGrezzi() {
        if (typeof storyCampaignsDatabase !== 'undefined') return storyCampaignsDatabase;
        return Array.isArray(window.storyCampaignsDatabase) ? window.storyCampaignsDatabase : [];
    }
    function personaggi() {
        if (typeof characterDatabase !== 'undefined') return characterDatabase;
        return Array.isArray(window.characterDatabase) ? window.characterDatabase : [];
    }

    /**
     * Risolve, per l'URL corrente, un contesto con l'array VERO su cui
     * scrivere. `voci` è un elenco di `{ tappa, arrayGrezzo }`:
     * `arrayGrezzo` è l'array che contiene DAVVERO quella tappa (il
     * `tappe` del capitolo per il livello campagna, il `tappe` del
     * torneo/area per il livello sotto) — serve a poter aggiungere e
     * togliere, non solo spostare (spostare basta mutare x/y sull'oggetto
     * stesso, che è già lo stesso ovunque venga letto).
     */
    function contestoCorrente() {
        const params = new URLSearchParams(location.search);
        const campaignId = params.get('campaign');
        const torneoId = params.get('torneo');
        if (!campaignId) return null;
        const campagna = datiGrezzi().find((c) => c.id === campaignId);
        if (!campagna) return null;

        const primoLivello = [];
        (campagna.capitoli || []).forEach((cap) => {
            cap.tappe = cap.tappe || [];
            cap.tappe.forEach((t) => primoLivello.push({ tappa: t, arrayGrezzo: cap.tappe }));
        });

        if (!torneoId) {
            return {
                livello: 'campagna', campagna: campagna, campaignId: campaignId, torneoId: null,
                voci: primoLivello,
                larghezza: campagna.larghezza, altezza: campagna.altezza, sfondo: campagna.sfondo,
                // Per il modulo "aggiungi": in quale capitolo va infilata una
                // tappa nuova, per etichetta leggibile.
                capitoli: (campagna.capitoli || []).map((c) => ({ id: c.id, nome: c.nome, arrayGrezzo: c.tappe }))
            };
        }
        const voce = primoLivello.find((v) => v.tappa.id === torneoId);
        if (!voce) return null;
        const torneo = voce.tappa;
        torneo.mappa = torneo.mappa || { sfondo: [], larghezza: 1400, altezza: 900 };
        torneo.tappe = torneo.tappe || [];
        // Un percorso può stare su più mappe (`mappeSuccessive`): si
        // mostrano solo le tappe di quella scelta (`&pagina=` nell'URL,
        // come in storia.html), sul suo disegno — le coordinate di ogni
        // tappa valgono solo sul disegno dove sta.
        const pagine = window.StoryProgress && StoryProgress.pagineDelPercorso
            ? StoryProgress.pagineDelPercorso(torneo)
            : [{ indice: 0, nome: '', mappa: torneo.mappa, da: 0, a: torneo.tappe.length }];
        const indice = Math.max(0, Math.min(pagine.length - 1, parseInt(params.get('pagina'), 10) || 0));
        const pagina = pagine[indice];
        const mappaPagina = pagina.mappa || torneo.mappa;
        return {
            livello: 'torneo', campagna: campagna, campaignId: campaignId, torneoId: torneoId, torneo: torneo,
            pagine: pagine, pagina: pagina,
            voci: torneo.tappe.slice(pagina.da, pagina.a).map((t) => ({ tappa: t, arrayGrezzo: torneo.tappe })),
            larghezza: mappaPagina.larghezza, altezza: mappaPagina.altezza, sfondo: mappaPagina.sfondo
        };
    }

    // ================================================================
    // Aggancio: si avvolge NodeMap.render, storia.html resta invariata.
    // ================================================================
    const renderOriginale = NodeMap.render;
    NodeMap.render = function (contenitore, opzioni) {
        if (modalitaAttiva()) {
            const ctx = contestoCorrente();
            if (ctx) return disegnaModalitaEditor(contenitore, ctx);
        }
        return renderOriginale.call(NodeMap, contenitore, opzioni);
    };

    /** Ridisegna la mappa CORRENTE in modalità editor (dopo ogni modifica). */
    function ridisegna() {
        const ctx = contestoCorrente();
        if (ctx) disegnaModalitaEditor('#mappaViewport', ctx);
    }

    function disegnaModalitaEditor(contenitore, ctx) {
        const viewportEl = typeof contenitore === 'string' ? document.querySelector(contenitore) : contenitore;
        const scrollPrima = viewportEl ? viewportEl.querySelector('.nm-scroll') : null;
        // NodeMap.render si centra da sé sul nodo 'corrente', o sull'ULTIMO
        // se non ce n'è uno — in modalità editor nessun nodo lo è mai (sono
        // tutti 'fatta' per restare tutti visibili/toccabili), quindi ad
        // ogni ridisegno la mappa si ricentrerebbe sull'ULTIMO nodo,
        // spedendo fuori schermo qualunque altro — misurato: il primo nodo
        // finiva a x negativo, invisibile e non toccabile. Si ricorda la
        // posizione di scorrimento PRIMA del ridisegno e la si ripristina
        // dopo (o, al primissimo ingresso in modalità editor, ci si centra
        // sul primo nodo invece che sull'ultimo).
        const posizionePrecedente = scrollPrima ? { left: scrollPrima.scrollLeft, top: scrollPrima.scrollTop } : null;
        const nodi = ctx.voci.map((v) => ({
            id: v.tappa.id, x: v.tappa.x, y: v.tappa.y, icona: v.tappa.icona,
            label: v.tappa.label || v.tappa.nome || v.tappa.id,
            // In modalità editor NIENTE è bloccato: l'amministratore deve
            // vedere e poter toccare ogni tappa, non solo quella corrente.
            stato: 'fatta',
            _voce: v
        }));
        // Il 'click' nativo del bottone scatta DOPO un pointerup anche
        // quando c'è stato un trascinamento vero (preventDefault sul
        // pointerdown non lo impedisce, verificato con un trascinamento
        // reale via Playwright: il pannello si riapriva subito dopo ogni
        // spostamento) — questo flag condiviso lascia che
        // agganciaInterazioni lo faccia tacere quando serve.
        const statoClick = { sopprimi: false };
        const canvas = renderOriginale.call(NodeMap, contenitore, {
            nodi: nodi,
            larghezza: ctx.larghezza, altezza: ctx.altezza, sfondo: ctx.sfondo,
            cliccabili: ['fatta'],
            onSelect: (nodo) => { if (!statoClick.sopprimi) apriPannello(ctx, nodo._voce); }
        });
        if (canvas) {
            canvas.classList.add('sme-canvas');
            agganciaInterazioni(contenitore, canvas, ctx, nodi, statoClick);
            // Assegnazione DIRETTA (non scrollTo con behavior:'smooth'):
            // interrompe subito lo scorrimento morbido avviato da
            // NodeMap.render verso l'ultimo nodo, invece di litigarci
            // frame dopo frame. Un ritardo basta a farla vincere sempre,
            // perché lo scorrimento morbido di NodeMap dura circa 300ms.
            setTimeout(() => {
                const scrollDopo = viewportEl ? viewportEl.querySelector('.nm-scroll') : null;
                if (!scrollDopo) return;
                if (posizionePrecedente) {
                    scrollDopo.scrollLeft = posizionePrecedente.left;
                    scrollDopo.scrollTop = posizionePrecedente.top;
                } else if (nodi[0]) {
                    NodeMap.centraSu(viewportEl, nodi[0]);
                }
            }, 350);
        }
        montaBarra(ctx);
        return canvas;
    }

    // ================================================================
    // Trascinamento dei nodi + click sul vuoto per aggiungerne uno nuovo
    // ================================================================
    let modalitaAggiungiArmata = false;

    function agganciaInterazioni(contenitoreSel, canvas, ctx, nodi, statoClick) {
        const viewportEl = typeof contenitoreSel === 'string' ? document.querySelector(contenitoreSel) : contenitoreSel;
        const bottoni = canvas.querySelectorAll('.nm-node');
        bottoni.forEach((bottone, i) => {
            const nodo = nodi[i];
            const tappa = nodo._voce.tappa;
            bottone.classList.add('sme-node');
            const coordinateNodo = document.createElement('span');
            coordinateNodo.className = 'sme-node-coordinate';
            coordinateNodo.textContent = `X ${tappa.x} · Y ${tappa.y}`;
            bottone.appendChild(coordinateNodo);
            bottone.addEventListener('pointerdown', (e) => {
                // Un click VERO (senza trascinamento) apre il pannello da
                // sé tramite il 'click' nativo che segue (vedi onSelect
                // qui sopra) — qui ci occupiamo solo del trascinamento.
                // stopPropagation basta a impedire che parta anche il
                // pan della mappa sotto (il listener su .nm-scroll).
                e.stopPropagation();
                try { bottone.setPointerCapture(e.pointerId); } catch (err) { /* niente da fare */ }
                const startX = e.clientX, startY = e.clientY;
                const origX = tappa.x, origY = tappa.y;
                let mosso = false;
                const onMove = (e2) => {
                    const zoom = (viewportEl && viewportEl.__nmZoom) || 1;
                    const dx = (e2.clientX - startX) / zoom;
                    const dy = (e2.clientY - startY) / zoom;
                    if (!mosso && (Math.abs(dx) > 3 || Math.abs(dy) > 3)) mosso = true;
                    if (!mosso) return;
                    tappa.x = Math.round(origX + dx);
                    tappa.y = Math.round(origY + dy);
                    nodo.x = tappa.x; nodo.y = tappa.y;
                    bottone.style.left = tappa.x + 'px';
                    bottone.style.top = tappa.y + 'px';
                    coordinateNodo.textContent = `X ${tappa.x} · Y ${tappa.y}`;
                    aggiornaCoordinate(tappa);
                    aggiornaLinee(canvas, nodi);
                };
                const onUp = () => {
                    bottone.removeEventListener('pointermove', onMove);
                    bottone.removeEventListener('pointerup', onUp);
                    if (!mosso) return; // il 'click' che segue apre già il pannello da sé
                    // Il 'click' nativo scatterà comunque fra un istante:
                    // va zittito solo per QUESTA volta, non per sempre.
                    statoClick.sopprimi = true;
                    setTimeout(() => { statoClick.sopprimi = false; }, 0);
                    aggiornaSuggerimento(`Spostato a x:${tappa.x} y:${tappa.y}.`);
                    salvaSeCollegato();
                };
                bottone.addEventListener('pointermove', onMove);
                bottone.addEventListener('pointerup', onUp);
            });
        });

        // Un click sul vuoto, con "Aggiungi" armato, crea un nodo lì.
        canvas.addEventListener('pointerdown', (e) => {
            if (!modalitaAggiungiArmata) return;
            if (e.target.closest('.nm-node')) return;
            const r = canvas.getBoundingClientRect();
            const zoom = (viewportEl && viewportEl.__nmZoom) || 1;
            const x = Math.round((e.clientX - r.left) / zoom);
            const y = Math.round((e.clientY - r.top) / zoom);
            modalitaAggiungiArmata = false;
            aggiornaSuggerimento('');
            apriPannelloNuovo(ctx, x, y);
        });
    }

    function aggiornaLinee(canvas, nodi) {
        const linee = canvas.querySelectorAll('.nm-lines line');
        linee.forEach((linea, i) => {
            const a = nodi[i], b = nodi[i + 1];
            if (!a || !b) return;
            linea.setAttribute('x1', a.x); linea.setAttribute('y1', a.y);
            linea.setAttribute('x2', b.x); linea.setAttribute('y2', b.y);
        });
    }

    // ================================================================
    // Barra degli strumenti (fissa, sopra la mappa)
    // ================================================================
    function montaBarra(ctx) {
        assicuraStile();
        rimuoviBarra();
        const barra = document.createElement('div');
        barra.id = 'smeBarra';
        barra.className = 'sme-barra';
        const titolo = ctx.livello === 'torneo' ? (ctx.torneo.nome || ctx.torneo.label) : ctx.campagna.nome;
        barra.innerHTML = `
            <span class="sme-etichetta">🛠️ Editor mappa — <strong>${escapeHtml(titolo)}</strong></span>
            <output class="sme-coordinate" id="smeCoordinate" aria-label="Coordinate del nodo trascinato">X —&nbsp;&nbsp;Y —</output>
            <span class="sme-suggerimento" id="smeSuggerimento"></span>
            <span class="sme-spazio"></span>
            ${(ctx.pagine && ctx.pagine.length > 1) ? ctx.pagine.map((p) => `<button type="button" class="sme-btn${p === ctx.pagina ? ' sme-btn--attivo' : ''}" data-sme-pagina="${p.indice}">🗺️ ${escapeHtml(p.nome || ('Mappa ' + (p.indice + 1)))}</button>`).join('') : ''}
            <button type="button" class="sme-btn" id="smeAggiungi">➕ Aggiungi nodo</button>
            <button type="button" class="sme-btn" id="smeCollegaFile" title="Scegli js/data/story-ritocchi.js: ogni modifica verrà salvata lì">📂 Collega file</button>
            <span class="sme-stato-file" id="smeStatoFile"></span>
            <button type="button" class="sme-btn" id="smeEsporta">📋 Esporta codice</button>
            <button type="button" class="sme-btn sme-btn--chiudi" id="smeChiudi">✖ Chiudi editor</button>
        `;
        document.body.appendChild(barra);
        document.getElementById('smeCollegaFile').addEventListener('click', collegaFile);
        aggiornaStatoCollegamento();
        // Cambio di mappa in un percorso a più mappe: si riscrive l'URL
        // (è da lì che contestoCorrente legge la pagina) e si ridisegna,
        // senza ricaricare — le modifiche non ancora salvate restano.
        barra.querySelectorAll('[data-sme-pagina]').forEach((b) => b.addEventListener('click', () => {
            const qs = new URLSearchParams(location.search);
            qs.set('pagina', b.getAttribute('data-sme-pagina'));
            try { history.replaceState(null, '', 'storia.html?' + qs.toString()); } catch (e) { /* file:// */ }
            ridisegna();
        }));
        document.getElementById('smeAggiungi').addEventListener('click', () => {
            modalitaAggiungiArmata = true;
            aggiornaSuggerimento('Tocca un punto vuoto della mappa per posizionare il nuovo nodo lì.');
        });
        document.getElementById('smeEsporta').addEventListener('click', () => apriEsportazione(ctx));
        document.getElementById('smeChiudi').addEventListener('click', () => {
            const avviso = fileCollegato
                ? 'Chiudere l\'editor? Le modifiche sono già salvate nel file collegato.'
                : 'Chiudere l\'editor? Senza un file collegato le modifiche andranno perse.';
            if (confirm(avviso)) {
                impostaModalita(false);
                location.reload();
            }
        });
    }
    function rimuoviBarra() {
        const b = document.getElementById('smeBarra');
        if (b) b.remove();
    }
    function aggiornaSuggerimento(testo) {
        const el = document.getElementById('smeSuggerimento');
        if (el) el.textContent = testo || '';
    }
    /**
     * Scrive le coordinate vere del mondo mappa, non quelle dello schermo:
     * zoom e scorrimento non devono cambiare i numeri che finiranno nel file.
     * L'output vive nella barra dell'editor e viene aggiornato a ogni singolo
     * pointermove, così non occorre rilasciare il nodo per leggere X/Y.
     */
    function aggiornaCoordinate(tappa) {
        const el = document.getElementById('smeCoordinate');
        if (!el || !tappa) return;
        el.textContent = `X ${tappa.x}  Y ${tappa.y}`;
    }

    /**
     * Il pulsante "🛠️ Editor Mappa" che ACCENDE la modalità: separato dalla
     * barra qui sopra (che compare solo a editor già acceso) perché deve
     * essere visibile anche prima di entrare in edit mode. Come in
     * test-shortcuts.js, si aspetta che CloudSync sappia rispondere con
     * certezza prima di deciderne la visibilità.
     */
    function montaInterruttoreIniziale() {
        let tentativi = 0;
        const attesa = setInterval(() => {
            if (editorDisponibile()) {
                clearInterval(attesa);
                if (modalitaAttiva()) return; // la barra vera arriva col prossimo render
                montaPulsanteAccensione();
            } else if (++tentativi > 40) {
                clearInterval(attesa); // 4s: o non è admin, o non lo sapremo qui
            }
        }, 100);
    }
    function montaPulsanteAccensione() {
        if (document.getElementById('smeAccendi')) return;
        assicuraStile();
        const b = document.createElement('button');
        b.id = 'smeAccendi';
        b.type = 'button';
        b.className = 'sme-btn sme-btn--accendi';
        b.textContent = '🛠️ Editor Mappa';
        b.addEventListener('click', () => {
            impostaModalita(true);
            b.remove();
            ridisegna();
        });
        document.body.appendChild(b);
    }

    // ================================================================
    // Stile
    // ================================================================
    function assicuraStile() {
        if (document.getElementById('smeStile')) return;
        const s = document.createElement('style');
        s.id = 'smeStile';
        s.textContent = `
            .sme-barra { position: fixed; top: 0; left: 0; right: 0; z-index: 9998;
                display: flex; align-items: center; gap: 10px; flex-wrap: wrap;
                padding: 8px 14px; background: rgba(93,45,10,0.95); color: #fff;
                font: 700 0.78rem/1.3 system-ui, sans-serif; border-bottom: 2px solid rgba(247,215,116,0.6); }
            .sme-suggerimento { font-weight: 400; opacity: 0.85; font-style: italic; }
            .sme-stato-file { font-weight: 600; }
            .sme-stato-file--ok { color: #9ff0b4; }
            .sme-stato-file--errore { color: #ffb3a8; }
            .sme-coordinate { flex: 0 0 auto; min-width: 128px; padding: 4px 9px;
                border: 1px solid rgba(247,215,116,0.45); border-radius: 5px;
                background: rgba(0,0,0,0.38); color: #f7d774;
                font: 700 12px/1.2 'Consolas', monospace; letter-spacing: 0.04em;
                text-align: center; font-variant-numeric: tabular-nums; }
            .sme-spazio { flex: 1; }
            .sme-btn { padding: 6px 12px; border-radius: 999px; border: 1px solid rgba(255,255,255,0.5);
                background: rgba(0,0,0,0.35); color: #fff; font: inherit; font-weight: 700; cursor: pointer; }
            .sme-btn:hover { background: rgba(0,0,0,0.55); }
            .sme-btn:focus-visible { outline: 2px solid #f7d774; outline-offset: 2px; }
            .sme-btn--chiudi { border-color: rgba(231,76,60,0.7); }
            .sme-btn--attivo { border-color: #f7d774; box-shadow: 0 0 0 1px #f7d774 inset; }
            .sme-btn--piccolo { padding: 3px 9px; font-size: 0.78rem; }
            .sme-btn--accendi { position: fixed; right: 14px; bottom: 14px; z-index: 9998;
                background: rgba(93,45,10,0.95); border-color: rgba(247,215,116,0.7); }
            .sme-node { outline: 2px dashed #5dade2 !important; outline-offset: 2px; cursor: grab; }
            .sme-node:active { cursor: grabbing; }
            .sme-node-coordinate { display: block; padding: 2px 6px; border-radius: 4px;
                border: 1px solid rgba(93,173,226,0.72); background: rgba(5,12,22,0.88);
                color: #bde8ff; box-shadow: 0 2px 7px rgba(0,0,0,0.6);
                font: 700 10px/1.2 'Consolas', monospace; white-space: nowrap;
                font-variant-numeric: tabular-nums; pointer-events: none; }
            .sme-overlay { position: fixed; inset: 0; z-index: 9999; display: flex; align-items: center;
                justify-content: center; background: rgba(4,5,8,0.75); padding: 16px; }
            .sme-pannello { width: 100%; max-width: 620px; max-height: 90vh; overflow: auto;
                background: #1c1620; border: 2px solid rgba(247,215,116,0.45); border-radius: 16px;
                padding: 20px; color: #e8e2d0; font: 14px/1.4 system-ui, sans-serif; }
            .sme-pannello h3 { margin: 0 0 12px; color: #f7d774; font-size: 1.05rem; }
            .sme-pannello h4 { margin: 18px 0 8px; color: #f7d774; font-size: 0.82rem;
                text-transform: uppercase; letter-spacing: 0.08em; }
            .sme-campo { display: flex; flex-direction: column; gap: 4px; margin-bottom: 12px; }
            .sme-campo label { font-size: 0.72rem; text-transform: uppercase; letter-spacing: 0.06em; opacity: 0.75; }
            .sme-campo input, .sme-campo select, .sme-campo textarea, .sme-battuta select,
            .sme-battuta input, .sme-battuta textarea, .sme-cerca {
                background: rgba(255,255,255,0.08); border: 1px solid rgba(247,215,116,0.3); border-radius: 8px;
                padding: 7px 9px; color: #fff; font: inherit; }
            .sme-campo select option, .sme-battuta select option { background: #1c1620; }
            .sme-campo textarea { min-height: 70px; resize: vertical; }
            .sme-riga2 { display: flex; gap: 10px; }
            .sme-riga2 .sme-campo { flex: 1; }
            .sme-azioni { display: flex; gap: 8px; justify-content: flex-end; margin-top: 16px; flex-wrap: wrap; }
            .sme-azioni .sme-btn--elimina { border-color: rgba(231,76,60,0.7); background: rgba(231,76,60,0.25); }
            .sme-azioni .sme-btn--salva { background: rgba(111,224,138,0.25); border-color: rgba(111,224,138,0.7); }
            .sme-nota { font-size: 0.78rem; opacity: 0.7; margin: -6px 0 12px; }
            textarea.sme-export { width: 100%; min-height: 220px; font: 12px/1.4 'Consolas', monospace;
                background: rgba(0,0,0,0.4); color: #b8f7c0; border: 1px solid rgba(247,215,116,0.3);
                border-radius: 8px; padding: 10px; }

            /* Scelta del personaggio: una griglia di ritratti con ricerca. */
            .sme-scelta-pg { display: flex; align-items: center; gap: 10px; }
            .sme-ritratto { width: 44px; height: 44px; border-radius: 50%; object-fit: cover; flex: 0 0 auto;
                border: 2px solid rgba(247,215,116,0.55); background: rgba(255,255,255,0.06); }
            .sme-ritratto--vuoto { display: grid; place-items: center; font-size: 1.2rem; }
            .sme-griglia-pg { margin-top: 8px; display: grid; grid-template-columns: repeat(auto-fill, minmax(78px, 1fr));
                gap: 8px; max-height: 260px; overflow: auto; padding: 4px; }
            .sme-pg { display: flex; flex-direction: column; align-items: center; gap: 4px; padding: 6px 4px;
                border-radius: 10px; border: 1px solid transparent; background: rgba(255,255,255,0.04);
                color: #e8e2d0; font: 600 0.7rem/1.2 system-ui, sans-serif; cursor: pointer; text-align: center; }
            .sme-pg img { width: 52px; height: 52px; border-radius: 50%; object-fit: cover; }
            .sme-pg:hover { border-color: rgba(247,215,116,0.5); }
            .sme-pg[aria-pressed="true"] { border-color: #f7d774; background: rgba(247,215,116,0.14); }

            /* Scelta della musica, con anteprima. */
            .sme-musiche { display: flex; flex-direction: column; gap: 4px; max-height: 240px; overflow: auto;
                padding: 4px; border: 1px solid rgba(247,215,116,0.2); border-radius: 10px; }
            .sme-musica { display: flex; align-items: center; gap: 8px; padding: 5px 8px; border-radius: 8px; }
            .sme-musica:hover { background: rgba(255,255,255,0.05); }
            .sme-musica input { accent-color: #f7d774; }
            .sme-musica label { flex: 1; cursor: pointer; font-size: 0.84rem; }
            .sme-musica--attiva { background: rgba(247,215,116,0.12); }

            /* Dialogo a battute. */
            .sme-battute { display: flex; flex-direction: column; gap: 8px; }
            .sme-battuta { display: grid; grid-template-columns: 40px 1fr auto; gap: 8px; align-items: start;
                padding: 8px; border-radius: 10px; background: rgba(255,255,255,0.04);
                border: 1px solid rgba(247,215,116,0.15); }
            .sme-battuta .sme-ritratto { width: 36px; height: 36px; }
            .sme-battuta-corpo { display: flex; flex-direction: column; gap: 6px; min-width: 0; }
            .sme-battuta-corpo textarea { min-height: 48px; resize: vertical; }
            .sme-battuta-comandi { display: flex; flex-direction: column; gap: 4px; }
            .sme-battuta-comandi .sme-btn { padding: 2px 8px; }
        `;
        document.head.appendChild(s);
    }
    function escapeHtml(s) {
        return String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({
            '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
        }[c]));
    }
    function chiudiOverlay() {
        fermaAnteprima();
        const o = document.getElementById('smeOverlay');
        if (o) o.remove();
    }
    function apriOverlay(html) {
        assicuraStile();
        chiudiOverlay();
        const overlay = document.createElement('div');
        overlay.id = 'smeOverlay';
        overlay.className = 'sme-overlay';
        overlay.innerHTML = `<div class="sme-pannello">${html}</div>`;
        overlay.addEventListener('pointerdown', (e) => { if (e.target === overlay) chiudiOverlay(); });
        document.body.appendChild(overlay);
        return overlay;
    }

    /**
     * Elenco delle Arene/Colonne Sonore (js/data/arena-options.js), che
     * storia.html non carica normalmente (serve solo a QUESTO editor).
     * Caricato una volta sola, lazy: il pannello si apre subito, gli
     * elenchi si riempiono un istante dopo (file locale, latenza nulla).
     */
    let arenaOptionsPromise = null;
    function conArenaOptions(poi) {
        if (window.ArenaOptions) { poi(window.ArenaOptions); return; }
        if (!arenaOptionsPromise) {
            arenaOptionsPromise = new Promise((risolvi) => {
                const s = document.createElement('script');
                s.src = 'js/data/arena-options.js';
                s.onload = () => risolvi(window.ArenaOptions);
                s.onerror = () => risolvi(null);
                document.body.appendChild(s);
            });
        }
        arenaOptionsPromise.then(poi);
    }

    // ================================================================
    // Componenti del pannello
    // ================================================================
    function ritrattoDi(id) {
        const p = personaggi().find((x) => x.id === id);
        return p && p.image ? p.image : '';
    }
    function ritrattoHtml(src, alt) {
        return src
            ? `<img class="sme-ritratto" src="${escapeHtml(src)}" alt="${escapeHtml(alt || '')}" onerror="this.replaceWith(Object.assign(document.createElement('span'),{className:'sme-ritratto sme-ritratto--vuoto',textContent:'?'}))">`
            : '<span class="sme-ritratto sme-ritratto--vuoto">—</span>';
    }

    /**
     * Scelta di un personaggio del roster da una griglia di ritratti, con
     * ricerca per nome. `prefisso` distingue due scelte nello stesso
     * pannello; il valore scelto sta in un <input type="hidden"> con id
     * `${prefisso}Id`, così chi legge il pannello non deve sapere com'è
     * fatta la griglia.
     */
    function sceltaPersonaggioHtml(prefisso, valore, etichetta, consentiNessuno) {
        const p = personaggi().find((x) => x.id === valore);
        return `
            <div class="sme-campo">
                <label>${escapeHtml(etichetta)}</label>
                <div class="sme-scelta-pg">
                    <span id="${prefisso}Ritratto">${ritrattoHtml(p && p.image, p && p.name)}</span>
                    <strong id="${prefisso}Nome">${escapeHtml(p ? p.name : (valore || 'Nessuno'))}</strong>
                    <input type="hidden" id="${prefisso}Id" value="${escapeHtml(valore || '')}">
                    <span class="sme-spazio"></span>
                    ${consentiNessuno ? `<button type="button" class="sme-btn sme-btn--piccolo" data-sme-nessuno="${prefisso}">Nessuno</button>` : ''}
                    <button type="button" class="sme-btn sme-btn--piccolo" data-sme-apri-griglia="${prefisso}">Scegli…</button>
                </div>
                <div id="${prefisso}Griglia" hidden>
                    <input class="sme-cerca" id="${prefisso}Cerca" placeholder="Cerca un personaggio…" style="margin-top:8px;width:100%">
                    <div class="sme-griglia-pg" id="${prefisso}Elenco"></div>
                </div>
            </div>`;
    }
    function agganciaSceltaPersonaggio(prefisso, onCambio) {
        const griglia = document.getElementById(prefisso + 'Griglia');
        if (!griglia) return;
        const elenco = document.getElementById(prefisso + 'Elenco');
        const cerca = document.getElementById(prefisso + 'Cerca');
        const valore = document.getElementById(prefisso + 'Id');
        const imposta = (id) => {
            valore.value = id || '';
            const p = personaggi().find((x) => x.id === id);
            document.getElementById(prefisso + 'Ritratto').innerHTML = ritrattoHtml(p && p.image, p && p.name);
            document.getElementById(prefisso + 'Nome').textContent = p ? p.name : 'Nessuno';
            if (onCambio) onCambio(id, p);
        };
        const disegna = () => {
            const q = cerca.value.trim().toLowerCase();
            elenco.innerHTML = personaggi()
                .filter((p) => !q || (p.name || '').toLowerCase().includes(q) || (p.id || '').toLowerCase().includes(q))
                .map((p) => `<button type="button" class="sme-pg" data-id="${escapeHtml(p.id)}" aria-pressed="${p.id === valore.value}">
                    ${p.image ? `<img src="${escapeHtml(p.image)}" alt="" loading="lazy" onerror="this.style.visibility='hidden'">` : '<span class="sme-ritratto sme-ritratto--vuoto">?</span>'}
                    <span>${escapeHtml(p.name)}</span></button>`).join('');
        };
        document.querySelector(`[data-sme-apri-griglia="${prefisso}"]`).addEventListener('click', () => {
            griglia.hidden = !griglia.hidden;
            if (!griglia.hidden) { disegna(); cerca.focus(); }
        });
        const nessuno = document.querySelector(`[data-sme-nessuno="${prefisso}"]`);
        if (nessuno) nessuno.addEventListener('click', () => { imposta(''); griglia.hidden = true; });
        cerca.addEventListener('input', disegna);
        elenco.addEventListener('click', (e) => {
            const b = e.target.closest('.sme-pg');
            if (!b) return;
            imposta(b.getAttribute('data-id'));
            griglia.hidden = true;
        });
    }

    // --- Musica con anteprima ------------------------------------------
    let anteprima = null;
    let musicaDellaPaginaInPausa = false;
    function fermaAnteprima() {
        if (anteprima) { anteprima.pause(); anteprima = null; }
        document.querySelectorAll('[data-sme-ascolta]').forEach((b) => { b.textContent = '▶'; });
        // La colonna sonora della pagina riparte da dove era.
        if (musicaDellaPaginaInPausa && window.DuelMusic && DuelMusic.audio) {
            DuelMusic.audio.play().catch(() => {});
        }
        musicaDellaPaginaInPausa = false;
    }
    function ascolta(file, bottone) {
        const stessa = anteprima && anteprima.__file === file;
        fermaAnteprima();
        if (stessa) return; // secondo clic sulla stessa traccia: stop
        if (window.DuelMusic && DuelMusic.audio && !DuelMusic.audio.paused) {
            DuelMusic.audio.pause();
            musicaDellaPaginaInPausa = true;
        }
        anteprima = new Audio('audio/soundtracks/' + file);
        anteprima.__file = file;
        anteprima.volume = 0.7;
        anteprima.play().catch(() => {});
        anteprima.addEventListener('ended', fermaAnteprima);
        if (bottone) bottone.textContent = '■';
    }

    /**
     * Le colonne sonore come elenco di scelte, ognuna con ▶ per ascoltarla.
     * La prima voce è "quella della campagna": il campo `music` si toglie e
     * il duello eredita `musicaDuello` (vedi StoryProgress.urlDuello).
     */
    function sceltaMusicaHtml(valore) {
        return `
            <div class="sme-campo">
                <label>Musica del duello</label>
                <div class="sme-musiche" id="smeMusiche"><span class="sme-nota">Caricamento elenco…</span></div>
            </div>`;
    }
    function agganciaSceltaMusica(valore) {
        conArenaOptions((AO) => {
            const box = document.getElementById('smeMusiche');
            if (!box) return;
            const tracce = (AO && AO.TRACKS) || [];
            // Una traccia scritta nel catalogo ma assente dall'elenco resta
            // scelta e visibile, invece di sparire salvando.
            const voci = [{ file: '', nome: '— Quella della campagna —' }].concat(tracce);
            if (valore && !tracce.some((t) => t.file === valore)) voci.push({ file: valore, nome: valore });
            box.innerHTML = voci.map((t, i) => `
                <div class="sme-musica${t.file === (valore || '') ? ' sme-musica--attiva' : ''}">
                    <input type="radio" name="smeMusica" id="smeMusica${i}" value="${escapeHtml(t.file)}" ${t.file === (valore || '') ? 'checked' : ''}>
                    <label for="smeMusica${i}">${escapeHtml(t.nome || t.file)}</label>
                    ${t.file ? `<button type="button" class="sme-btn sme-btn--piccolo" data-sme-ascolta="${escapeHtml(t.file)}" aria-label="Ascolta ${escapeHtml(t.nome || t.file)}">▶</button>` : ''}
                </div>`).join('');
            box.addEventListener('click', (e) => {
                const b = e.target.closest('[data-sme-ascolta]');
                if (b) ascolta(b.getAttribute('data-sme-ascolta'), b);
            });
            box.addEventListener('change', () => {
                box.querySelectorAll('.sme-musica').forEach((r) => r.classList.toggle('sme-musica--attiva', r.querySelector('input').checked));
            });
            const attiva = box.querySelector('.sme-musica--attiva');
            if (attiva) attiva.scrollIntoView({ block: 'nearest' });
        });
    }
    function leggiMusica() {
        const scelta = document.querySelector('input[name="smeMusica"]:checked');
        return scelta ? scelta.value : null; // null = elenco non ancora arrivato: non toccare
    }

    // --- Campo (arena) ---------------------------------------------------
    function sceltaCampoHtml(valore) {
        return `
            <div class="sme-campo">
                <label>Campo/Arena</label>
                <select id="smeField"><option value="">— Quello della campagna —</option>
                    ${valore ? `<option value="${escapeHtml(valore)}" selected>${escapeHtml(valore)}</option>` : ''}
                </select>
            </div>`;
    }
    function agganciaSceltaCampo(valore) {
        conArenaOptions((AO) => {
            const sel = document.getElementById('smeField');
            if (!sel || !AO) return;
            const voci = AO.FIELDS.map((f) => ({ value: 'images/fields/mobile/' + f.file, nome: f.nome }));
            sel.innerHTML = '<option value="">— Quello della campagna —</option>'
                + voci.map((v) => `<option value="${escapeHtml(v.value)}" ${v.value === valore ? 'selected' : ''}>${escapeHtml(v.nome)}</option>`).join('')
                + (valore && !voci.some((v) => v.value === valore) ? `<option value="${escapeHtml(valore)}" selected>${escapeHtml(valore)}</option>` : '');
        });
    }

    // --- Dialogo a battute -----------------------------------------------
    /**
     * Le battute di una scena (`testo`) o del dialogo prima di un duello
     * (`dialogo`), nella forma del catalogo: una STRINGA (parla la voce del
     * nodo — solo nelle scene) oppure `{ chi: <id del roster> | io: true |
     * nome: 'testo libero', testo }`. Qui diventano righe con un "chi
     * parla" esplicito, e tornano nella stessa forma salvando.
     */
    function battuteDaDati(righe) {
        return (righe || []).map((r) => {
            if (typeof r === 'string') return { voce: 'nodo', testo: r };
            if (r && r.io) return { voce: 'io', testo: r.testo || '' };
            if (r && r.chi) return { voce: 'pg', chi: r.chi, testo: r.testo || '' };
            return { voce: 'nome', nome: (r && r.nome) || '', testo: (r && r.testo) || '' };
        });
    }
    function datiDaBattute(battute) {
        return battute.filter((b) => b.testo.trim()).map((b) => {
            const testo = b.testo.trim();
            if (b.voce === 'nodo') return testo;
            if (b.voce === 'io') return { io: true, testo: testo };
            if (b.voce === 'pg') return { chi: b.chi, testo: testo };
            return { nome: b.nome.trim() || '…', testo: testo };
        });
    }
    function editorBattuteHtml(titolo, nota) {
        return `
            <h4>${escapeHtml(titolo)}</h4>
            ${nota ? `<p class="sme-nota" style="margin-top:0">${escapeHtml(nota)}</p>` : ''}
            <div class="sme-battute" id="smeBattute"></div>
            <div class="sme-azioni" style="justify-content:flex-start;margin-top:8px">
                <button type="button" class="sme-btn sme-btn--piccolo" id="smeAggiungiBattuta">➕ Aggiungi battuta</button>
            </div>`;
    }
    /**
     * Monta l'editor delle battute e torna una funzione che legge i dati.
     * `conVoceNodo`: le scene ammettono la riga semplice (la voce del
     * nodo, cioè `chi` della scena); il dialogo di un duello no.
     */
    function agganciaEditorBattute(righe, conVoceNodo) {
        const box = document.getElementById('smeBattute');
        let battute = battuteDaDati(righe);
        const opzioniVoce = (b) => {
            const pg = personaggi().map((p) => `<option value="pg:${escapeHtml(p.id)}" ${b.voce === 'pg' && b.chi === p.id ? 'selected' : ''}>${escapeHtml(p.name)}</option>`).join('');
            return (conVoceNodo ? `<option value="nodo" ${b.voce === 'nodo' ? 'selected' : ''}>Voce del nodo (chi parla, sopra)</option>` : '')
                + `<option value="io" ${b.voce === 'io' ? 'selected' : ''}>Protagonista (io)</option>`
                + `<option value="nome" ${b.voce === 'nome' ? 'selected' : ''}>Un altro nome…</option>`
                + `<optgroup label="Personaggi">${pg}</optgroup>`;
        };
        const disegna = () => {
            box.innerHTML = battute.length ? battute.map((b, i) => `
                <div class="sme-battuta" data-i="${i}">
                    ${b.voce === 'pg' ? ritrattoHtml(ritrattoDi(b.chi), '') : `<span class="sme-ritratto sme-ritratto--vuoto">${b.voce === 'io' ? '🧑' : b.voce === 'nodo' ? '🗨️' : '✎'}</span>`}
                    <div class="sme-battuta-corpo">
                        <select data-campo="voce" aria-label="Chi parla">${opzioniVoce(b)}</select>
                        ${b.voce === 'nome' ? `<input data-campo="nome" value="${escapeHtml(b.nome || '')}" placeholder="Nome di chi parla (es. Il Bollettino)">` : ''}
                        <textarea data-campo="testo" placeholder="Cosa dice…">${escapeHtml(b.testo)}</textarea>
                    </div>
                    <div class="sme-battuta-comandi">
                        <button type="button" class="sme-btn" data-azione="su" aria-label="Sposta su" ${i === 0 ? 'disabled' : ''}>↑</button>
                        <button type="button" class="sme-btn" data-azione="giu" aria-label="Sposta giù" ${i === battute.length - 1 ? 'disabled' : ''}>↓</button>
                        <button type="button" class="sme-btn" data-azione="via" aria-label="Elimina battuta">🗑</button>
                    </div>
                </div>`).join('') : '<p class="sme-nota" style="margin:0">Nessuna battuta.</p>';
        };
        box.addEventListener('input', (e) => {
            const riga = e.target.closest('.sme-battuta');
            if (!riga) return;
            const b = battute[Number(riga.getAttribute('data-i'))];
            const campo = e.target.getAttribute('data-campo');
            if (campo === 'testo') b.testo = e.target.value;
            if (campo === 'nome') b.nome = e.target.value;
        });
        box.addEventListener('change', (e) => {
            if (e.target.getAttribute('data-campo') !== 'voce') return;
            const b = battute[Number(e.target.closest('.sme-battuta').getAttribute('data-i'))];
            const v = e.target.value;
            if (v.indexOf('pg:') === 0) { b.voce = 'pg'; b.chi = v.slice(3); } else { b.voce = v; }
            disegna();
        });
        box.addEventListener('click', (e) => {
            const b = e.target.closest('[data-azione]');
            if (!b) return;
            const i = Number(b.closest('.sme-battuta').getAttribute('data-i'));
            const azione = b.getAttribute('data-azione');
            if (azione === 'via') battute.splice(i, 1);
            if (azione === 'su' && i > 0) battute.splice(i - 1, 0, battute.splice(i, 1)[0]);
            if (azione === 'giu' && i < battute.length - 1) battute.splice(i + 1, 0, battute.splice(i, 1)[0]);
            disegna();
        });
        document.getElementById('smeAggiungiBattuta').addEventListener('click', () => {
            const ultima = battute[battute.length - 1];
            battute.push(ultima ? Object.assign({}, ultima, { testo: '' }) : { voce: conVoceNodo ? 'nodo' : 'io', testo: '' });
            disegna();
            const aree = box.querySelectorAll('textarea');
            if (aree.length) aree[aree.length - 1].focus();
        });
        disegna();
        return () => datiDaBattute(battute);
    }

    // ================================================================
    // Pannello: campi per tipo di nodo
    // ================================================================
    /** Il corpo del pannello per il tipo di nodo: HTML + una funzione che aggancia e torna il lettore. */
    function campiPerKind(kind, tappa) {
        const t = tappa || {};
        if (kind === 'duel') {
            return {
                html: `
                    ${sceltaPersonaggioHtml('smePg', t.characterId || '', 'Avversario')}
                    <div class="sme-campo">
                        <label>Difficoltà (solo per le campagne senza livelli)</label>
                        <select id="smeDifficulty">
                            <option value="">— Non impostata —</option>
                            ${['Facile', 'Medio', 'Difficile'].map((d) => `<option value="${d}" ${t.difficulty === d ? 'selected' : ''}>${d}</option>`).join('')}
                        </select>
                    </div>
                    ${sceltaCampoHtml(t.field || '')}
                    ${sceltaMusicaHtml(t.music || '')}
                    ${editorBattuteHtml('Dialogo prima del duello', 'Lo scambio di battute che precede il duello. Vuoto = si va dritti al duello.')}`,
                aggancia: () => {
                    agganciaSceltaPersonaggio('smePg');
                    agganciaSceltaCampo(t.field || '');
                    agganciaSceltaMusica(t.music || '');
                    const leggiBattute = agganciaEditorBattute(t.dialogo, false);
                    return (dest) => {
                        imposta(dest, 'characterId', document.getElementById('smePgId').value);
                        imposta(dest, 'difficulty', document.getElementById('smeDifficulty').value);
                        imposta(dest, 'field', document.getElementById('smeField').value);
                        const musica = leggiMusica();
                        if (musica !== null) imposta(dest, 'music', musica);
                        const dialogo = leggiBattute();
                        if (dialogo.length) dest.dialogo = dialogo; else delete dest.dialogo;
                    };
                }
            };
        }
        if (kind === 'scene') {
            return {
                html: `
                    ${sceltaPersonaggioHtml('smeVoce', t.chiId || '', 'Voce del nodo (personaggio del roster)', true)}
                    <div class="sme-riga2">
                        <div class="sme-campo"><label>Nome mostrato</label><input id="smeChi" value="${escapeHtml(t.chi || '')}" placeholder="es. Il Bollettino"></div>
                        <div class="sme-campo" style="justify-content:flex-end">
                            <label><input type="checkbox" id="smeIo" ${t.io ? 'checked' : ''}> La voce è il protagonista</label>
                        </div>
                    </div>
                    ${sceltaCampoHtml(t.field || '')}
                    ${editorBattuteHtml('Battute', 'Ogni battuta può avere la sua voce: la voce del nodo, il protagonista, un personaggio o un nome libero.')}`,
                aggancia: () => {
                    agganciaSceltaPersonaggio('smeVoce', (id, p) => {
                        const nome = document.getElementById('smeChi');
                        if (p && !nome.value.trim()) nome.value = p.name;
                    });
                    agganciaSceltaCampo(t.field || '');
                    const leggiBattute = agganciaEditorBattute(t.testo, true);
                    return (dest) => {
                        imposta(dest, 'chi', document.getElementById('smeChi').value);
                        imposta(dest, 'chiId', document.getElementById('smeVoceId').value);
                        if (document.getElementById('smeIo').checked) dest.io = true; else delete dest.io;
                        imposta(dest, 'field', document.getElementById('smeField').value);
                        const battute = leggiBattute();
                        if (battute.length || dest.testo) dest.testo = battute;
                    };
                }
            };
        }
        if (kind === 'area' || kind === 'torneo') {
            return {
                html: `
                    <div class="sme-campo"><label>Nome (titolo della sua mappa)</label><input id="smeNome" value="${escapeHtml(t.nome || '')}"></div>
                    <div class="sme-campo"><label>Testo introduttivo</label><textarea id="smeTestoArea">${escapeHtml(t.testo || '')}</textarea></div>
                    <p class="sme-nota">Le tappe DENTRO quest'area si modificano aprendo la sua mappa.</p>`,
                aggancia: () => (dest) => {
                    imposta(dest, 'nome', document.getElementById('smeNome').value);
                    imposta(dest, 'testo', document.getElementById('smeTestoArea').value);
                }
            };
        }
        return { html: '', aggancia: () => () => {} };
    }
    /** Vuoto = la proprietà si TOGLIE (eredita dalla campagna), mai una stringa vuota. */
    function imposta(dest, chiave, valore) {
        const v = (valore || '').trim();
        if (v) dest[chiave] = v; else delete dest[chiave];
    }

    /** Modifica di un nodo ESISTENTE (id e kind non cambiano: cancella e ricrea, per quei due). */
    function apriPannello(ctx, voce) {
        assicuraStile();
        const t = voce.tappa;
        const corpo = campiPerKind(t.kind, t);
        apriOverlay(`
            <h3>Modifica nodo</h3>
            <p class="sme-nota">${escapeHtml(t.kind)} · id <code>${escapeHtml(t.id)}</code> (non modificabile qui: cancella e ricrea per cambiarlo)</p>
            <div class="sme-campo"><label>Etichetta sulla mappa</label><input id="smeLabel" value="${escapeHtml(t.label || '')}"></div>
            <div class="sme-riga2">
                <div class="sme-campo"><label>Icona (emoji)</label><input id="smeIcona" value="${escapeHtml(t.icona || '')}"></div>
                <div class="sme-campo"><label>x</label><input id="smeX" type="number" value="${t.x}"></div>
                <div class="sme-campo"><label>y</label><input id="smeY" type="number" value="${t.y}"></div>
            </div>
            ${corpo.html}
            <div class="sme-azioni">
                <button type="button" class="sme-btn sme-btn--elimina" id="smeElimina">🗑️ Elimina</button>
                <button type="button" class="sme-btn" id="smeAnnulla">Annulla</button>
                ${(t.kind === 'area' || t.kind === 'torneo') ? '<button type="button" class="sme-btn" id="smeApriMappa">🔎 Apri la sua mappa</button>' : ''}
                <button type="button" class="sme-btn sme-btn--salva" id="smeSalva">💾 Salva</button>
            </div>
        `);
        const leggi = corpo.aggancia();
        document.getElementById('smeAnnulla').addEventListener('click', chiudiOverlay);
        document.getElementById('smeElimina').addEventListener('click', () => {
            if (!confirm(`Eliminare "${t.label || t.id}"?\n\nAttenzione: l'avanzamento delle storie si salva per posizione. Togliere una tappa prima di dove è arrivato un giocatore gli sposta l'avanzamento.`)) return;
            const i = voce.arrayGrezzo.indexOf(t);
            if (i !== -1) voce.arrayGrezzo.splice(i, 1);
            chiudiOverlay();
            ridisegna();
            salvaSeCollegato();
        });
        document.getElementById('smeSalva').addEventListener('click', () => {
            imposta(t, 'label', document.getElementById('smeLabel').value);
            imposta(t, 'icona', document.getElementById('smeIcona').value);
            t.x = Number(document.getElementById('smeX').value) || 0;
            t.y = Number(document.getElementById('smeY').value) || 0;
            leggi(t);
            chiudiOverlay();
            ridisegna();
            salvaSeCollegato();
        });
        const apriMappaBtn = document.getElementById('smeApriMappa');
        if (apriMappaBtn) {
            apriMappaBtn.addEventListener('click', () => {
                location.href = 'storia.html?campaign=' + encodeURIComponent(ctx.campaignId) + '&torneo=' + encodeURIComponent(t.id);
            });
        }
    }

    /** Creazione di un nodo NUOVO, già posizionato dove si è cliccato. */
    function apriPannelloNuovo(ctx, x, y) {
        assicuraStile();
        const opzioniCapitolo = ctx.livello === 'campagna'
            ? `<div class="sme-campo"><label>Capitolo di destinazione</label>
                <select id="smeCapitolo">${ctx.capitoli.map((c) => `<option value="${escapeHtml(c.id)}">${escapeHtml(c.nome)}</option>`).join('')}</select></div>`
            : '';
        const opzioniKind = ctx.livello === 'campagna'
            ? `<option value="area">area (una mappa dentro la mappa)</option><option value="scene">scena</option><option value="duel">duello</option>`
            : `<option value="duel">duello</option><option value="scene">scena</option>`;
        apriOverlay(`
            <h3>Nuovo nodo</h3>
            <p class="sme-nota">Posizione: x:${x} y:${y}. L'avanzamento delle storie si salva per posizione: un nodo nuovo prima di dove è arrivato un giocatore gli sposta l'avanzamento.</p>
            <div class="sme-riga2">
                <div class="sme-campo"><label>id (univoco, es. anime-99-prova)</label><input id="smeNuovoId"></div>
                <div class="sme-campo"><label>Tipo</label><select id="smeNuovoKind">${opzioniKind}</select></div>
            </div>
            ${opzioniCapitolo}
            <div class="sme-riga2">
                <div class="sme-campo"><label>Etichetta sulla mappa</label><input id="smeNuovoLabel"></div>
                <div class="sme-campo"><label>Icona (emoji)</label><input id="smeNuovoIcona" value="⭐"></div>
            </div>
            <div id="smeNuovoExtra"></div>
            <div class="sme-azioni">
                <button type="button" class="sme-btn" id="smeAnnullaNuovo">Annulla</button>
                <button type="button" class="sme-btn sme-btn--salva" id="smeCreaNuovo">➕ Crea</button>
            </div>
        `);
        const selKind = document.getElementById('smeNuovoKind');
        const extra = document.getElementById('smeNuovoExtra');
        let leggi = () => {};
        const aggiornaExtra = () => {
            fermaAnteprima();
            const corpo = campiPerKind(selKind.value, {});
            extra.innerHTML = corpo.html;
            leggi = corpo.aggancia();
        };
        selKind.addEventListener('change', aggiornaExtra);
        aggiornaExtra();

        document.getElementById('smeAnnullaNuovo').addEventListener('click', chiudiOverlay);
        document.getElementById('smeCreaNuovo').addEventListener('click', () => {
            const id = document.getElementById('smeNuovoId').value.trim();
            if (!id) { alert('Serve un id.'); return; }
            const tuttiGliId = datiGrezzi().flatMap((c) => (c.capitoli || []).flatMap((cap) => (cap.tappe || [])
                .flatMap((t) => [t].concat((t.tappe || [])))))
                .map((t) => t.id);
            if (tuttiGliId.indexOf(id) !== -1) { alert('Questo id esiste già in un\'altra tappa: scegline uno diverso.'); return; }
            const kind = selKind.value;
            const nuovaTappa = {
                id: id, kind: kind, icona: document.getElementById('smeNuovoIcona').value.trim() || '⭐',
                label: document.getElementById('smeNuovoLabel').value.trim() || id,
                x: x, y: y
            };
            leggi(nuovaTappa);
            if (kind === 'area' || kind === 'torneo') {
                nuovaTappa.mappa = { sfondo: [], larghezza: 1400, altezza: 900 };
                nuovaTappa.tappe = [];
            }
            let arrayDiDestinazione;
            if (ctx.livello === 'campagna') {
                const capId = document.getElementById('smeCapitolo').value;
                const cap = ctx.capitoli.find((c) => c.id === capId);
                arrayDiDestinazione = cap ? cap.arrayGrezzo : ctx.capitoli[0].arrayGrezzo;
            } else {
                arrayDiDestinazione = ctx.torneo.tappe;
            }
            // In un percorso a più mappe la tappa nuova va in fondo alla
            // MAPPA che si sta guardando, non in fondo all'elenco: in fondo
            // all'elenco finirebbe sull'ultima mappa, con le coordinate
            // prese su questa.
            if (ctx.livello !== 'campagna' && ctx.pagina) {
                arrayDiDestinazione.splice(ctx.pagina.a, 0, nuovaTappa);
            } else {
                arrayDiDestinazione.push(nuovaTappa);
            }
            chiudiOverlay();
            ridisegna();
            salvaSeCollegato();
        });
    }

    // ================================================================
    // Salvataggio sul file dei ritocchi (js/data/story-ritocchi.js)
    // ================================================================
    /** L'handle del file collegato in QUESTA sessione (mai persistito: si ricollega ad ogni ricarica). */
    let fileCollegato = null;
    let salvataggioInCoda = null;

    /**
     * "📂 Collega file": chiede una volta il permesso di scrittura sul file
     * dei ritocchi tramite il picker nativo del browser. Fuori da
     * Chrome/Edge l'API non esiste: si avvisa e resta "Esporta codice".
     * Si controlla che il file scelto sia DAVVERO quello dei ritocchi:
     * scegliere per sbaglio il catalogo e riscriverlo per intero lo
     * cancellerebbe.
     */
    async function collegaFile() {
        if (!window.showOpenFilePicker) {
            alert('Questo browser non supporta la scrittura diretta su file (serve Chrome o Edge sul computer). Resta disponibile "📋 Esporta codice".');
            return;
        }
        try {
            const [handle] = await window.showOpenFilePicker({
                types: [{ description: 'story-ritocchi.js', accept: { 'text/javascript': ['.js'] } }],
                excludeAcceptAllOption: false
            });
            const testo = await (await handle.getFile()).text();
            if (!/window\.storyRitocchi\s*=/.test(testo)) {
                alert(`"${handle.name}" non è il file dei ritocchi. Scegli js/data/story-ritocchi.js.`);
                return;
            }
            const permesso = await handle.requestPermission({ mode: 'readwrite' });
            if (permesso !== 'granted') { alert('Permesso di scrittura negato: resta il solo "Esporta codice".'); return; }
            fileCollegato = handle;
            aggiornaStatoCollegamento();
            // Ciò che si è già modificato prima di collegare va subito sul file.
            salvaSeCollegato();
        } catch (e) {
            // L'utente ha annullato il picker: non è un errore da segnalare.
        }
    }

    /**
     * Riscrive il file dei ritocchi con le differenze ATTUALI fra catalogo
     * e memoria. Le richieste ravvicinate (un trascinamento, poi subito un
     * salva) si accorpano: conta solo l'ultimo stato.
     */
    function salvaSeCollegato() {
        if (!fileCollegato) {
            aggiornaStatoCollegamento('Modifica solo in questa scheda: collega il file per salvarla.');
            return;
        }
        if (salvataggioInCoda) clearTimeout(salvataggioInCoda);
        salvataggioInCoda = setTimeout(() => {
            salvataggioInCoda = null;
            salvaSulFile().then((esito) => aggiornaStatoCollegamento(
                esito.ok ? '💾 Salvato' : `⚠️ Non salvato: ${esito.motivo}`, esito.ok ? 'ok' : 'errore'));
        }, 150);
    }

    /** Non lancia mai: torna sempre un esito. */
    async function salvaSulFile() {
        if (!fileCollegato) return { ok: false, motivo: 'Nessun file collegato' };
        if (!window.StoryRitocchi) return { ok: false, motivo: 'js/story/story-ritocchi.js non caricato in questa pagina' };
        try {
            const permesso = await fileCollegato.queryPermission({ mode: 'readwrite' });
            if (permesso !== 'granted') {
                const chiesto = await fileCollegato.requestPermission({ mode: 'readwrite' });
                if (chiesto !== 'granted') return { ok: false, motivo: 'Permesso di scrittura non concesso' };
            }
            const testo = StoryRitocchi.testoDelFile(StoryRitocchi.attuali());
            const writable = await fileCollegato.createWritable();
            await writable.write(testo);
            await writable.close();
            return { ok: true };
        } catch (e) {
            return { ok: false, motivo: e && e.message ? e.message : String(e) };
        }
    }

    function aggiornaStatoCollegamento(messaggio, tono) {
        const el = document.getElementById('smeStatoFile');
        if (!el) return;
        el.className = 'sme-stato-file' + (tono ? ' sme-stato-file--' + tono : '');
        el.textContent = (fileCollegato ? `📂 ${fileCollegato.name}` : '') + (messaggio ? (fileCollegato ? ' · ' : '') + messaggio : '');
    }
    // Per un test automatico: finge un "file collegato" senza passare dal
    // picker nativo (che un test headless non può pilotare, essendo un
    // dialogo del sistema operativo) — basta che `handle` implementi
    // queryPermission()/requestPermission()/createWritable() come farebbe
    // un vero FileSystemFileHandle. Non pensata per admin.html.
    window.StoryMapEditor._collegaFileFinto = function (handle) { fileCollegato = handle; aggiornaStatoCollegamento(); };

    // ================================================================
    // Esportazione: stampa un array JS pronto da incollare nel catalogo.
    // ================================================================
    /** Piccolo stampatore ricorsivo: virgolette singole, chiavi senza
     * virgolette quando sono identificatori validi, 4 spazi — lo stesso
     * stile del resto del progetto. Non riporta i commenti originali
     * (non fanno parte del dato): vanno rimessi a mano nell'IDE. */
    function pretty(v, ind) {
        const pad = ' '.repeat(ind);
        const padIn = ' '.repeat(ind + 4);
        if (v === null || v === undefined) return 'null';
        if (typeof v === 'number' || typeof v === 'boolean') return String(v);
        if (typeof v === 'string') return "'" + v.replace(/\\/g, '\\\\').replace(/'/g, "\\'") + "'";
        if (Array.isArray(v)) {
            if (v.length === 0) return '[]';
            return '[\n' + v.map((x) => padIn + pretty(x, ind + 4)).join(',\n') + '\n' + pad + ']';
        }
        if (typeof v === 'object') {
            const chiavi = Object.keys(v);
            if (chiavi.length === 0) return '{}';
            return '{\n' + chiavi.map((k) => {
                const chiave = /^[A-Za-z_$][A-Za-z0-9_$]*$/.test(k) ? k : pretty(k, 0);
                return padIn + chiave + ': ' + pretty(v[k], ind + 4);
            }).join(',\n') + '\n' + pad + '}';
        }
        return String(v);
    }

    function generaEsportazione(ctx) {
        if (ctx.livello === 'torneo') {
            return `// torneo.tappe di '${ctx.torneoId}' (dentro la campagna '${ctx.campaignId}')\n`
                + 'tappe: ' + pretty(ctx.torneo.tappe, 0);
        }
        return ctx.capitoli.map((c) =>
            `// capitolo '${c.id}' — capitoli[].tappe\n` + 'tappe: ' + pretty(c.arrayGrezzo, 0)
        ).join('\n\n');
    }

    function apriEsportazione(ctx) {
        assicuraStile();
        const codice = generaEsportazione(ctx);
        apriOverlay(`
            <h3>📋 Esporta codice</h3>
            <p class="sme-nota">Per CONSOLIDARE i ritocchi nel catalogo (js/data/story-campaigns.js) a mano: incolla
            questo al posto dell'array corrispondente, poi svuota js/data/story-ritocchi.js. Per salvare e basta non serve:
            usa "📂 Collega file".</p>
            <textarea class="sme-export" id="smeExportTesto" readonly>${escapeHtml(codice)}</textarea>
            <div class="sme-azioni">
                <button type="button" class="sme-btn" id="smeChiudiExport">Chiudi</button>
                <button type="button" class="sme-btn sme-btn--salva" id="smeCopia">📋 Copia negli appunti</button>
            </div>
        `);
        document.getElementById('smeChiudiExport').addEventListener('click', chiudiOverlay);
        document.getElementById('smeCopia').addEventListener('click', () => {
            const area = document.getElementById('smeExportTesto');
            const fatto = () => { area.focus(); area.select(); };
            if (navigator.clipboard && navigator.clipboard.writeText) {
                navigator.clipboard.writeText(codice).then(fatto).catch(fatto);
            } else {
                fatto();
                try { document.execCommand('copy'); } catch (e) { /* selezionato: copia manuale con Ctrl+C */ }
            }
        });
    }

    // ================================================================
    // Avvio
    // ================================================================
    window.addEventListener('DOMContentLoaded', montaInterruttoreIniziale);
    if (document.readyState !== 'loading') montaInterruttoreIniziale();
})();
