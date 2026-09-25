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
 * IL MODELLO — perché non è "salva sul cloud" e cosa succede alle modifiche:
 * Questo gioco non ha un backend per i CONTENUTI (le campagne sono un file
 * JS statico, js/data/story-campaigns.js, versionato con git) — solo per
 * account/salvataggi. Un editor "vivo" può quindi lavorare SOLO sulla
 * copia in memoria di questa scheda: sposta, crea, modifica e cancella
 * DAVVERO (si vede subito sulla mappa, sopravvive a un giro nell'area e
 * ritorno), ma torna quella del file appena si ricarica la pagina. Il
 * pulsante "📋 Esporta codice" stampa l'array aggiornato pronto da
 * incollare in story-campaigns.js: è quello il modo in cui una modifica
 * diventa permanente per tutti i giocatori, non un salvataggio automatico
 * che finirebbe per mentire su cosa vede chi non è amministratore.
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
        return {
            livello: 'torneo', campagna: campagna, campaignId: campaignId, torneoId: torneoId, torneo: torneo,
            voci: torneo.tappe.map((t) => ({ tappa: t, arrayGrezzo: torneo.tappe })),
            larghezza: torneo.mappa.larghezza, altezza: torneo.mappa.altezza, sfondo: torneo.mappa.sfondo
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
                    aggiornaSuggerimento(`Spostato a x:${tappa.x} y:${tappa.y} — resta in questa scheda finché non lo esporti.`);
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
            <span class="sme-suggerimento" id="smeSuggerimento"></span>
            <span class="sme-spazio"></span>
            <button type="button" class="sme-btn" id="smeAggiungi">➕ Aggiungi nodo</button>
            <button type="button" class="sme-btn" id="smeEsporta">📋 Esporta codice</button>
            <button type="button" class="sme-btn sme-btn--chiudi" id="smeChiudi">✖ Chiudi editor</button>
        `;
        document.body.appendChild(barra);
        document.getElementById('smeAggiungi').addEventListener('click', () => {
            modalitaAggiungiArmata = true;
            aggiornaSuggerimento('Tocca un punto vuoto della mappa per posizionare il nuovo nodo lì.');
        });
        document.getElementById('smeEsporta').addEventListener('click', () => apriEsportazione(ctx));
        document.getElementById('smeChiudi').addEventListener('click', () => {
            if (confirm('Chiudere l\'editor? Le modifiche non esportate andranno perse (tornano quelle del file al prossimo caricamento).')) {
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
    // Pannello di modifica / creazione — un piccolo modulo autonomo
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
            .sme-spazio { flex: 1; }
            .sme-btn { padding: 6px 12px; border-radius: 999px; border: 1px solid rgba(255,255,255,0.5);
                background: rgba(0,0,0,0.35); color: #fff; font: inherit; font-weight: 700; cursor: pointer; }
            .sme-btn:hover { background: rgba(0,0,0,0.55); }
            .sme-btn--chiudi { border-color: rgba(231,76,60,0.7); }
            .sme-btn--accendi { position: fixed; right: 14px; bottom: 14px; z-index: 9998;
                background: rgba(93,45,10,0.95); border-color: rgba(247,215,116,0.7); }
            .sme-node { outline: 2px dashed #5dade2 !important; outline-offset: 2px; cursor: grab; }
            .sme-node:active { cursor: grabbing; }
            .sme-overlay { position: fixed; inset: 0; z-index: 9999; display: flex; align-items: center;
                justify-content: center; background: rgba(4,5,8,0.75); padding: 16px; }
            .sme-pannello { width: 100%; max-width: 440px; max-height: 88vh; overflow: auto;
                background: #1c1620; border: 2px solid rgba(247,215,116,0.45); border-radius: 16px;
                padding: 20px; color: #e8e2d0; font: 14px/1.4 system-ui, sans-serif; }
            .sme-pannello h3 { margin: 0 0 12px; color: #f7d774; font-size: 1.05rem; }
            .sme-campo { display: flex; flex-direction: column; gap: 4px; margin-bottom: 12px; }
            .sme-campo label { font-size: 0.72rem; text-transform: uppercase; letter-spacing: 0.06em; opacity: 0.75; }
            .sme-campo input, .sme-campo select, .sme-campo textarea {
                background: rgba(255,255,255,0.08); border: 1px solid rgba(247,215,116,0.3); border-radius: 8px;
                padding: 7px 9px; color: #fff; font: inherit; }
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
        `;
        document.head.appendChild(s);
    }
    function escapeHtml(s) {
        return String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({
            '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
        }[c]));
    }
    function chiudiOverlay() {
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

    /** Campi comuni a QUALUNQUE tipo di tappa, più quelli specifici del kind. */
    function campiPerKind(kind, tappa) {
        const t = tappa || {};
        if (kind === 'duel') {
            const opzioniPersonaggi = (typeof characterDatabase !== 'undefined' ? characterDatabase : [])
                .map((p) => `<option value="${escapeHtml(p.id)}">${escapeHtml(p.name)}</option>`).join('');
            return `
                <div class="sme-campo">
                    <label>Personaggio (characterId)</label>
                    <input list="smeListaPersonaggi" id="smeCharacterId" value="${escapeHtml(t.characterId || '')}">
                    <datalist id="smeListaPersonaggi">${opzioniPersonaggi}</datalist>
                </div>
                <div class="sme-campo">
                    <label>Difficoltà</label>
                    <select id="smeDifficulty">
                        <option value="Medio" ${t.difficulty === 'Medio' ? 'selected' : ''}>Medio</option>
                        <option value="Difficile" ${t.difficulty === 'Difficile' ? 'selected' : ''}>Difficile</option>
                    </select>
                </div>`;
        }
        if (kind === 'scene') {
            return `
                <div class="sme-riga2">
                    <div class="sme-campo"><label>Chi parla</label><input id="smeChi" value="${escapeHtml(t.chi || '')}"></div>
                    <div class="sme-campo"><label>chiId (roster, opzionale)</label><input id="smeChiId" value="${escapeHtml(t.chiId || '')}"></div>
                </div>
                <div class="sme-campo">
                    <label><input type="checkbox" id="smeIo" ${t.io ? 'checked' : ''}> È il protagonista (io: true)</label>
                </div>
                <div class="sme-campo">
                    <label>Battute (una per riga)</label>
                    <textarea id="smeTesto">${escapeHtml((t.testo || []).join('\n'))}</textarea>
                </div>`;
        }
        if (kind === 'area' || kind === 'torneo') {
            return `
                <div class="sme-campo"><label>Nome (titolo della sua mappa)</label><input id="smeNome" value="${escapeHtml(t.nome || '')}"></div>
                <div class="sme-campo"><label>Testo introduttivo</label><textarea id="smeTestoArea">${escapeHtml(t.testo || '')}</textarea></div>
                <p class="sme-nota">Le tappe DENTRO quest'area si modificano aprendo la sua mappa (tocca il nodo qui sotto una volta salvato, mentre l'editor resta acceso).</p>`;
        }
        return '';
    }

    function leggiCampiPerKind(kind, tappa) {
        if (kind === 'duel') {
            tappa.characterId = document.getElementById('smeCharacterId').value.trim();
            tappa.difficulty = document.getElementById('smeDifficulty').value;
        } else if (kind === 'scene') {
            tappa.chi = document.getElementById('smeChi').value.trim();
            const chiId = document.getElementById('smeChiId').value.trim();
            if (chiId) tappa.chiId = chiId; else delete tappa.chiId;
            const io = document.getElementById('smeIo').checked;
            if (io) tappa.io = true; else delete tappa.io;
            tappa.testo = document.getElementById('smeTesto').value.split('\n').map((r) => r.trim()).filter((r) => r);
        } else if (kind === 'area' || kind === 'torneo') {
            tappa.nome = document.getElementById('smeNome').value.trim();
            tappa.testo = document.getElementById('smeTestoArea').value.trim();
        }
    }

    /** Modifica di un nodo ESISTENTE (id e kind non cambiano: cancella e ricrea, per quei due). */
    function apriPannello(ctx, voce) {
        assicuraStile();
        const t = voce.tappa;
        apriOverlay(`
            <h3>Modifica nodo</h3>
            <p class="sme-nota">${escapeHtml(t.kind)} · id <code>${escapeHtml(t.id)}</code> (non modificabile qui: cancella e ricrea per cambiarlo)</p>
            <div class="sme-campo"><label>Etichetta (label)</label><input id="smeLabel" value="${escapeHtml(t.label || '')}"></div>
            <div class="sme-riga2">
                <div class="sme-campo"><label>Icona (emoji)</label><input id="smeIcona" value="${escapeHtml(t.icona || '')}"></div>
                <div class="sme-campo"><label>x</label><input id="smeX" type="number" value="${t.x}"></div>
                <div class="sme-campo"><label>y</label><input id="smeY" type="number" value="${t.y}"></div>
            </div>
            ${campiPerKind(t.kind, t)}
            <div class="sme-azioni">
                <button type="button" class="sme-btn sme-btn--elimina" id="smeElimina">🗑️ Elimina</button>
                <button type="button" class="sme-btn" id="smeAnnulla">Annulla</button>
                <button type="button" class="sme-btn sme-btn--salva" id="smeSalva">💾 Salva</button>
                ${(t.kind === 'area' || t.kind === 'torneo') ? '<button type="button" class="sme-btn" id="smeApriMappa">🔎 Apri la sua mappa</button>' : ''}
            </div>
        `);
        document.getElementById('smeAnnulla').addEventListener('click', chiudiOverlay);
        document.getElementById('smeElimina').addEventListener('click', () => {
            if (!confirm(`Eliminare "${t.label || t.id}"? Solo in questa scheda finché non riesporti.`)) return;
            const i = voce.arrayGrezzo.indexOf(t);
            if (i !== -1) voce.arrayGrezzo.splice(i, 1);
            chiudiOverlay();
            ridisegna();
        });
        document.getElementById('smeSalva').addEventListener('click', () => {
            t.label = document.getElementById('smeLabel').value.trim();
            t.icona = document.getElementById('smeIcona').value.trim();
            t.x = Number(document.getElementById('smeX').value) || 0;
            t.y = Number(document.getElementById('smeY').value) || 0;
            leggiCampiPerKind(t.kind, t);
            chiudiOverlay();
            ridisegna();
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
            ? `<option value="area">area (una mappa dentro la mappa)</option><option value="scene">scene</option><option value="duel">duel</option>`
            : `<option value="duel">duel</option><option value="scene">scene</option>`;
        apriOverlay(`
            <h3>Nuovo nodo</h3>
            <p class="sme-nota">Posizione: x:${x} y:${y}</p>
            <div class="sme-campo"><label>id (univoco, es. anime-99-prova)</label><input id="smeNuovoId"></div>
            <div class="sme-campo"><label>Tipo (kind)</label><select id="smeNuovoKind">${opzioniKind}</select></div>
            ${opzioniCapitolo}
            <div class="sme-campo"><label>Etichetta (label)</label><input id="smeNuovoLabel"></div>
            <div class="sme-campo"><label>Icona (emoji)</label><input id="smeNuovoIcona" value="⭐"></div>
            <div id="smeNuovoExtra"></div>
            <div class="sme-azioni">
                <button type="button" class="sme-btn" id="smeAnnullaNuovo">Annulla</button>
                <button type="button" class="sme-btn sme-btn--salva" id="smeCreaNuovo">➕ Crea</button>
            </div>
        `);
        const selKind = document.getElementById('smeNuovoKind');
        const extra = document.getElementById('smeNuovoExtra');
        const aggiornaExtra = () => { extra.innerHTML = campiPerKind(selKind.value, {}); };
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
            leggiCampiPerKind(kind, nuovaTappa);
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
            arrayDiDestinazione.push(nuovaTappa);
            chiudiOverlay();
            ridisegna();
        });
    }

    // ================================================================
    // Esportazione: stampa un array JS pronto da incollare nel file.
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
            <p class="sme-nota">Incolla questo dentro js/data/story-campaigns.js al posto dell'array corrispondente
            (i commenti originali non ci sono più: rimettili a mano se servono). Finché non lo fai, questa resta
            una modifica visibile solo in questa scheda.</p>
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
