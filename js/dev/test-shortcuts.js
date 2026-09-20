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
 * ⚠️ AUTOWIN SEMPRE ATTIVO NELLE STORIE (richiesta esplicita, "per tutte
 * le storie, temporaneamente è autowin per i test"): vedi
 * AUTOWIN_STORIE qui sotto. È l'UNICA parte di questo file che si
 * accende da sola, senza parametri nell'URL, e per questo si spegne
 * cambiando una sola costante — oltre che, come tutto il resto,
 * revertando il commit.
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

    /**
     * ⚠️ TEMPORANEO: ogni duello lanciato dalla Modalità Storia si vince
     * da solo, senza bisogno di ?test=1 nell'URL. Serve a percorrere le
     * campagne per provarle senza giocare ottantatré duelli veri.
     *
     * Metterla a `false` (o revertare il commit di questo file) è tutto
     * quello che serve per tornare ai duelli veri: non c'è nessun altro
     * punto da toccare. Vale SOLO per la Storia — tornei, Duello Libero
     * e Multiplayer non passano di qui.
     */
    const AUTOWIN_STORIE = true;

    const params = new URLSearchParams(location.search);
    const modoProva = params.get('test') === '1';
    const autowin = params.get('autowin') === '1';
    const nellaStoria = /storia\.html/.test(location.pathname);
    const autowinStoria = AUTOWIN_STORIE && nellaStoria;
    if (!modoProva && !autowin && !autowinStoria) return;

    console.warn('[test-shortcuts] SCORCIATOIE DI PROVA ATTIVE — questo file va rimosso prima del rilascio.');

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
    if (nellaStoria && (modoProva || autowinStoria)) {
        // Ogni duello lanciato dalla mappa parte con autowin: si entra,
        // si vince, si torna. Si avvolge la funzione invece di toccare
        // storia.html, così quel file resta esattamente com'è — ed è
        // anche il motivo per cui togliere questo file basta a togliere
        // tutto, senza lasciare pezzi in giro.
        const attesaStoria = setInterval(() => {
            if (!window.StoryProgress) return;
            clearInterval(attesaStoria);
            const originale = StoryProgress.urlDuello;
            StoryProgress.urlDuello = function (campaignId, tappa) {
                const url = originale(campaignId, tappa);
                // `test=1` solo se lo si è chiesto davvero: con l'autowin
                // sempre acceso, propagarlo farebbe comparire la barra
                // rossa di prova anche a chi non l'ha invocata.
                return url + '&autowin=1' + (modoProva ? '&test=1' : '');
            };
        }, 100);

        window.addEventListener('DOMContentLoaded', montaSegnali);
        if (document.readyState !== 'loading') montaSegnali();
    }

    /**
     * Con ?test=1 si monta la barra intera; con il solo autowin sempre
     * acceso basta un segnale piccolo. Non è decorazione: senza,
     * duellare e vincere sempre senza aver giocato sembra un gioco
     * rotto, e fra una settimana nessuno ricorderebbe perché succede.
     */
    function montaSegnali() {
        if (modoProva) montaBarra();
        else montaPillolaAutowin();
    }

    function montaPillolaAutowin() {
        if (document.getElementById('testAutowinPill')) return;
        const pillola = document.createElement('div');
        pillola.id = 'testAutowinPill';
        pillola.textContent = '⚠️ AUTOWIN DI PROVA';
        pillola.title = 'I duelli della Storia si vincono da soli. Si spegne in js/dev/test-shortcuts.js (AUTOWIN_STORIE).';
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
