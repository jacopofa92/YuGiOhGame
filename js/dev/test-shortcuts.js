/**
 * test-shortcuts.js — SCORCIATOIE DI PROVA. DA RIMUOVERE.
 * =====================================================================
 * ⚠️  QUESTO FILE NON DEVE RESTARE NEL GIOCO FINITO.  ⚠️
 *
 * Serve solo a provare la Modalità Storia senza giocare ventisei duelli
 * veri. È stato aggiunto in un COMMIT DEDICATO, che tocca soltanto
 * questo file più i due tag <script> che lo caricano: per toglierlo
 * basta revertare quel commit, senza andare a caccia di pezzi sparsi.
 *
 * Non fa NULLA se non glielo si chiede: tutto passa da un parametro
 * nell'URL, quindi aprendo il gioco normalmente questo file si carica e
 * se ne sta zitto. Non c'è nessun percorso in cui possa attivarsi da
 * solo.
 *
 * AUTOWIN NELLE STORIE: era acceso per tutti e sempre (una costante nel
 * codice), quindi chiunque avesse aperto una campagna avrebbe vinto ogni
 * duello senza giocarlo. Ora è un INTERRUTTORE DELL'AMMINISTRATORE, e
 * per accendersi servono DUE cose insieme:
 *   1. l'interruttore acceso su QUESTO dispositivo (localStorage), che si
 *      trova nel Pannello Admin (admin.html);
 *   2. l'account in uso deve essere davvero un amministratore
 *      (CloudSync.isAdmin(), cioè `is_admin` su public.profiles — non una
 *      chiave di localStorage che chiunque potrebbe scriversi da sé).
 * Di default è SPENTO: un giocatore normale gioca i duelli veri anche se
 * questo file resta nel gioco, che è il motivo per cui l'interruttore
 * esiste. Vedi StoryAutowin in fondo al file per l'API che il Pannello
 * Admin usa per leggerlo e cambiarlo.
 *
 * COME SI USA
 *   storia.html?campaign=anime&test=1
 *     Compare una barretta in basso con "Supera tappa" e "Torna
 *     indietro". Serve a camminare sulla mappa in fretta.
 *     In questa modalità ogni duello parte già con autowin, quindi
 *     cliccare un pallino entra nel duello e lo vince da solo: è il modo
 *     di provare il PERCORSO VERO (premi, breadcrolla, ritorno alla
 *     mappa), che il pulsante "Supera tappa" invece scavalca.
 *
 *   duelMonstersCore.html?...&autowin=1
 *     Il duello si chiude da solo con una vittoria appena è pronto,
 *     passando da endDuel() come una vittoria normale.
 *
 * PERCHÉ DUE MODI E NON UNO: "Supera tappa" è più veloce ma salta tutto
 * quello che succede fra la mappa e il ritorno dalla mappa, che è
 * esattamente la parte più facile da rompere. L'autowin è più lento ma
 * prova la catena intera.
 */
(function () {
    'use strict';

    // L'interruttore sta sul DISPOSITIVO e non nel salvataggio: è una
    // comodità di chi sta collaudando qui e ora, non una proprietà
    // dell'account che abbia senso portarsi dietro sul telefono o
    // sincronizzare sul cloud insieme ai progressi.
    const CHIAVE_INTERRUTTORE = 'ygoStoryAutowin';

    function interruttoreAcceso() {
        try { return localStorage.getItem(CHIAVE_INTERRUTTORE) === 'on'; } catch (e) { return false; }
    }
    function sonoAdmin() {
        return !!(window.CloudSync && typeof CloudSync.isAdmin === 'function' && CloudSync.isAdmin());
    }
    /**
     * Le DUE condizioni insieme. Si ricontrolla ad ogni chiamata invece
     * di deciderlo una volta al caricamento: `CloudSync.isAdmin()` può
     * ancora rispondere "no" nei primissimi istanti di pagina (il profilo
     * arriva dal database in modo asincrono; risponde subito solo a un
     * amministratore già riconosciuto su questo dispositivo), e decidere
     * troppo presto vorrebbe dire spegnere l'autowin proprio a chi ha
     * appena fatto accesso.
     */
    function autowinStorieAttivo() {
        return interruttoreAcceso() && sonoAdmin();
    }

    // API per il Pannello Admin (admin.html). Esposta PRIMA di qualunque
    // uscita anticipata: la pagina dell'amministratore deve poter leggere
    // e cambiare l'interruttore anche se lì le scorciatoie non servono a
    // niente.
    window.StoryAutowin = {
        attivo: autowinStorieAttivo,
        acceso: interruttoreAcceso,
        disponibile: sonoAdmin,
        imposta: function (on) {
            try { localStorage.setItem(CHIAVE_INTERRUTTORE, on ? 'on' : 'off'); } catch (e) { /* niente da fare */ }
            return interruttoreAcceso();
        }
    };

    const params = new URLSearchParams(location.search);
    const modoProva = params.get('test') === '1';
    const autowin = params.get('autowin') === '1';
    const nellaStoria = /storia\.html/.test(location.pathname);
    // Sulla mappa della Storia si prosegue SEMPRE, anche a interruttore
    // spento: quello che si installa lì è solo un involucro attorno a
    // StoryProgress.urlDuello, che decide caso per caso al momento di
    // entrare in un duello. Deciderlo qui, al caricamento, vorrebbe dire
    // che accendere l'interruttore nel Pannello Admin non ha effetto
    // finché non si ricarica la mappa — e soprattutto che si deciderebbe
    // in un istante in cui CloudSync non sa ancora dire se l'account è di
    // un amministratore.
    if (!modoProva && !autowin && !nellaStoria) return;

    if (modoProva || autowin) {
        console.warn('[test-shortcuts] SCORCIATOIE DI PROVA ATTIVE — questo file va rimosso prima del rilascio.');
    }

    // ================================================================
    // Duello: vinci da solo
    // ================================================================
    // Con l'autowin la morra cinese non ha senso: decide chi gioca per
    // primo in una partita che finisce da sola al primo istante, e ti
    // costringe a un clic prima di ogni duello proprio mentre stai
    // scorrendo una campagna per collaudarla. Si spegne con l'interruttore
    // che quel modulo espone già (js/ui/duel-rps.js). Quell'interruttore
    // viene letto DENTRO play(), non al caricamento, e play() viene
    // chiamata solo dopo la cinematica VS: impostarlo qui arriva in
    // tempo anche se questo file è l'ultimo script della pagina, come in
    // duelMonstersCore.html.
    if (autowin) window.DUEL_RPS_SKIP = true;

    if (autowin && typeof endDuel === 'function') {
        // Si aspetta che il duello sia davvero avviato: endDuel chiamata
        // troppo presto troverebbe gameState a metà costruzione. Il
        // controllo è a intervalli invece che su un evento perché non
        // esiste un evento "duello pronto" — e questo file non deve
        // aggiungerne uno, visto che deve sparire.
        const attesa = setInterval(() => {
            const pronto = typeof gameState !== 'undefined' && gameState
                && window.DuelSession && DuelSession.started && !gameState.gameOver;
            if (!pronto) return;
            clearInterval(attesa);
            setTimeout(() => endDuel(true), 400);
        }, 200);
        // Rete di sicurezza: se per qualche motivo il duello non si
        // avvia, si smette di controllare invece di girare all'infinito.
        setTimeout(() => clearInterval(attesa), 30000);
    }

    // ================================================================
    // Storia: barretta di prova
    // ================================================================
    if (nellaStoria) {
        // Ogni duello lanciato dalla mappa parte con autowin: si entra,
        // si vince, si torna. Si avvolge la funzione invece di toccare
        // storia.html, così quel file resta esattamente com'è — ed è
        // anche il motivo per cui togliere questo file basta a togliere
        // tutto, senza lasciare pezzi in giro.
        const attesaStoria = setInterval(() => {
            if (!window.StoryProgress) return;
            clearInterval(attesaStoria);
            const originale = StoryProgress.urlDuello;
            StoryProgress.urlDuello = function () {
                // `apply(arguments)` e non due parametri nominati: questa
                // funzione ne ha un terzo (le opzioni, fra cui "è una
                // tappa rigiocata") e un giorno potrebbe averne un quarto.
                // Elencarli a mano li avrebbe silenziosamente buttati via
                // — ed è successo davvero: con l'autowin acceso il segno
                // della rigiocata spariva, e rivincere una tappa già
                // superata faceva avanzare la campagna.
                const url = originale.apply(this, arguments);
                // La decisione si prende QUI, al momento in cui si sta
                // per entrare in un duello, non al caricamento della
                // pagina: è l'ultimo istante utile, quindi il più
                // informato — l'interruttore può essere stato spento nel
                // frattempo in un'altra scheda, e soprattutto CloudSync
                // ha ormai avuto tutto il tempo di dire se questo account
                // è davvero di un amministratore.
                if (!modoProva && !autowinStorieAttivo()) return url;
                // `test=1` solo se lo si è chiesto davvero: propagarlo
                // farebbe comparire la barra rossa di prova anche a chi
                // ha acceso il solo autowin.
                return url + '&autowin=1' + (modoProva ? '&test=1' : '');
            };
        }, 100);

        window.addEventListener('DOMContentLoaded', montaSegnali);
        if (document.readyState !== 'loading') montaSegnali();
    }

    /**
     * Con ?test=1 si monta la barra intera; col solo autowin basta un
     * segnale piccolo. Non è decorazione: senza, duellare e vincere
     * sempre senza aver giocato sembra un gioco rotto, e fra una
     * settimana nessuno ricorderebbe perché succede.
     *
     * La pillola aspetta di sapere se l'account è di un amministratore.
     * Appenderla subito vorrebbe dire mostrarla anche a chi ha la chiave
     * in localStorage ma non i permessi — e quello vedrebbe un avviso di
     * autowin che poi non succede, cioè il peggiore dei due mondi.
     */
    function montaSegnali() {
        if (modoProva) { montaBarra(); return; }
        let tentativi = 0;
        const attesaAdmin = setInterval(() => {
            if (autowinStorieAttivo()) {
                clearInterval(attesaAdmin);
                montaPillolaAutowin();
            } else if (++tentativi > 40) {
                // Quattro secondi: passati quelli, o non è un
                // amministratore o non lo sapremo mai. Nessuna pillola,
                // e la mappa resta quella di un giocatore qualunque.
                clearInterval(attesaAdmin);
            }
        }, 100);
    }

    function montaPillolaAutowin() {
        if (document.getElementById('testAutowinPill')) return;
        const pillola = document.createElement('div');
        pillola.id = 'testAutowinPill';
        pillola.textContent = '⚠️ AUTOWIN DI PROVA';
        pillola.title = 'I duelli della Storia si vincono da soli. Si spegne dal Pannello Admin (admin.html).';
        pillola.style.cssText = [
            'position:fixed', 'left:10px', 'bottom:10px', 'z-index:9999',
            'padding:6px 11px', 'border-radius:999px',
            'background:rgba(120,20,20,0.9)', 'color:#fff',
            'border:1px solid rgba(255,255,255,0.35)',
            'font:800 0.64rem/1 system-ui,sans-serif', 'letter-spacing:1px',
            'pointer-events:none'
        ].join(';');
        document.body.appendChild(pillola);
    }

    function montaBarra() {
        if (document.getElementById('testShortcutsBar')) return;
        const campaignId = params.get('campaign');
        if (!campaignId) return;

        const barra = document.createElement('div');
        barra.id = 'testShortcutsBar';
        barra.style.cssText = [
            'position:fixed', 'left:0', 'right:0', 'bottom:0', 'z-index:9999',
            'display:flex', 'gap:8px', 'align-items:center', 'justify-content:center',
            'padding:8px', 'background:rgba(120,20,20,0.92)', 'color:#fff',
            'font:700 0.72rem/1.2 system-ui,sans-serif', 'letter-spacing:1px'
        ].join(';');

        const etichetta = document.createElement('span');
        etichetta.textContent = '⚠️ MODO PROVA';
        barra.appendChild(etichetta);

        barra.appendChild(pulsante('⏭️ Supera tappa', () => {
            StoryProgress.avanza(campaignId);
            location.reload();
        }));
        barra.appendChild(pulsante('↩️ Indietro di una', () => {
            const p = StoryProgress.getProgress(campaignId);
            SaveManager.setStoryState(campaignId, {
                completate: Math.max(0, p.completate - 1),
                finita: false,
                premiata: p.premiata
            });
            location.reload();
        }));
        barra.appendChild(pulsante('🔄 Ricomincia', () => {
            StoryProgress.ricomincia(campaignId);
            location.reload();
        }));
        barra.appendChild(pulsante('🏁 Salta alla fine', () => {
            const tappe = StoryProgress.getTappe(campaignId);
            // Una tappa PRIMA della fine: così l'ultima si supera
            // davvero, ed è l'unico modo di vedere la schermata finale
            // (e il premio) passando dalla strada normale.
            SaveManager.setStoryState(campaignId, {
                completate: Math.max(0, tappe.length - 1), finita: false, premiata: false
            });
            location.reload();
        }));

        document.body.appendChild(barra);
    }

    function pulsante(testo, onClick) {
        const b = document.createElement('button');
        b.type = 'button';
        b.textContent = testo;
        b.style.cssText = 'padding:6px 10px;border-radius:999px;border:1px solid rgba(255,255,255,0.5);background:rgba(0,0,0,0.35);color:#fff;font:inherit;cursor:pointer';
        b.addEventListener('click', onClick);
        return b;
    }
})();
