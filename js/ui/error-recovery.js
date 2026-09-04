/**
 * error-recovery.js — ultima rete di sicurezza VISIBILE per un errore
 * JS non gestito da nient'altro: senza questo, l'unico segnale che
 * qualcosa è andato storto era una riga in console (invisibile
 * all'utente) — la pagina restava silenziosamente "morta" (bottoni che
 * non rispondono più, un caricamento che non finisce mai) senza alcuna
 * indicazione visibile.
 *
 * Caricato per PRIMO su ogni pagina (subito dopo js/pwa-register.js, in
 * cima al documento — vedi l'ordine dei tag <script>), così cattura
 * anche un errore che avviene DURANTE l'inizializzazione di uno degli
 * script pesanti caricati dopo. Vale sia sul web sia nell'APK: non è
 * una feature nativa, un errore JS non gestito è ugualmente invisibile
 * in entrambi i casi.
 *
 * Coesiste con la rete di sicurezza dedicata al duello in
 * js/engine/duel-engine.js (che scrive un messaggio più specifico nel
 * Game Log, quando esiste): più listener sullo stesso evento sono
 * normali e non si escludono a vicenda — questo file aggiunge un
 * banner visibile anche sulle pagine SENZA un Game Log (Cartoteca,
 * Negozio, Creazione Deck, ecc.), dove altrimenti l'errore del motore
 * duello non avrebbe alcun canale.
 *
 * Mostrato UNA SOLA volta per pagina (anche se altri errori seguono):
 * un banner piccolo e non bloccante in fondo allo schermo, non un
 * modale a pieno schermo invasivo — la maggior parte degli errori
 * intercettati qui non impedisce di continuare a usare la pagina.
 * Offre solo due azioni concrete: ricaricare, o tornare al menu.
 */
(function () {
    'use strict';

    let shown = false;

    function renderBanner() {
        if (shown) return;
        shown = true;

        const style = document.createElement('style');
        style.textContent = `
            #globalErrorBanner {
                position: fixed; left: 50%; bottom: 16px; transform: translateX(-50%);
                z-index: 999999; max-width: min(92vw, 480px); width: max-content;
                background: linear-gradient(135deg, rgba(40,10,10,0.97), rgba(60,15,15,0.97));
                border: 1px solid rgba(255,110,110,0.5);
                box-shadow: 0 6px 24px rgba(0,0,0,0.5);
                border-radius: 10px; padding: 12px 14px; color: #ffe0e0;
                font: 500 0.82rem/1.4 system-ui, -apple-system, sans-serif;
                display: flex; flex-direction: column; gap: 8px;
            }
            #globalErrorBanner .global-error-banner-actions { display: flex; gap: 8px; justify-content: flex-end; }
            #globalErrorBanner button {
                font: inherit; cursor: pointer; border-radius: 6px; padding: 5px 10px;
                border: 1px solid rgba(255,255,255,0.25); background: rgba(255,255,255,0.08); color: inherit;
            }
            #globalErrorBanner button:hover { background: rgba(255,255,255,0.18); }
        `;

        const banner = document.createElement('div');
        banner.id = 'globalErrorBanner';
        banner.innerHTML = `
            <span>⚠️ Si è verificato un errore imprevisto. La pagina potrebbe non rispondere più correttamente.</span>
            <div class="global-error-banner-actions">
                <button type="button" id="globalErrorReloadBtn">Ricarica</button>
                <button type="button" id="globalErrorMenuBtn">Torna al menu</button>
                <button type="button" id="globalErrorDismissBtn">Ignora</button>
            </div>
        `;

        document.head.appendChild(style);
        document.body.appendChild(banner);

        document.getElementById('globalErrorReloadBtn').onclick = () => window.location.reload();
        document.getElementById('globalErrorMenuBtn').onclick = () => { window.location.href = 'index.html'; };
        document.getElementById('globalErrorDismissBtn').onclick = () => banner.remove();
    }

    function showBanner() {
        // Se questo script (deliberatamente il PRIMO caricato, vedi sopra)
        // intercetta un errore prima ancora che <body> esista, si aspetta
        // che il DOM sia pronto invece di fallire nel costruire il banner.
        if (document.body) {
            renderBanner();
        } else {
            document.addEventListener('DOMContentLoaded', renderBanner, { once: true });
        }
    }

    window.addEventListener('error', (event) => {
        console.error('[error-recovery] Errore non gestito:', event.error || event.message);
        showBanner();
    });
    window.addEventListener('unhandledrejection', (event) => {
        console.error('[error-recovery] Promise non gestita:', event.reason);
        showBanner();
    });
})();
