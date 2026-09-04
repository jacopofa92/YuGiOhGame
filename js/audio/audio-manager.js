/**
 * audio-manager.js — Musica di sottofondo condivisa tra le pagine.
 * ---------------------------------------------------------------
 * Il progetto è multi-pagina (non una SPA): ogni file .html è un
 * documento a sé, quindi normalmente l'audio si interromperebbe a
 * ogni navigazione. Per dare la sensazione di continuità, questo
 * modulo salva in sessionStorage la posizione di riproduzione e lo
 * stato "muto", e li ripristina a ogni nuovo caricamento di pagina
 * che include questo script — così la traccia prosegue (con al più
 * un impercettibile scarto) invece di ripartire da capo.
 *
 * Per ora la traccia è "cablata" su un solo brano (mainTheme.mp3),
 * usato ovunque. In futuro basterà passare un trackSrc diverso a
 * initAudioManager() (es. per una colonna sonora dedicata alle
 * battaglie) perché il resto — continuità, mute, salvataggio — resti
 * invariato.
 *
 * Volutamente SEMPLICE: nessuna dissolvenza di volume, nessun banner
 * o pulsante di recupero, nessun gating del caricamento della pagina
 * sull'audio — richiesta esplicita dell'utente dopo alcuni giri di
 * "miglioramenti" che avevano introdotto più bug di quanti ne
 * risolvessero. L'unica parte non ovvia è il gesto di recupero in
 * CAPTURE PHASE più sotto (vedi tryPlay()): quella è un fix reale e
 * verificato, non un ornamento — senza, le due interazioni più comuni
 * di un duello (trascinare una carta) non sbloccano mai l'autoplay
 * bloccato.
 */
(function () {
    'use strict';

    const DEFAULT_TRACK = 'audio/soundtracks/mainTheme.mp3';
    const KEY_MUTED = 'duelArenaMusicMuted';
    const KEY_TIME = 'duelArenaMusicTime';
    const KEY_TRACK = 'duelArenaMusicTrack';
    // Il volume, a differenza di posizione/traccia (sessionStorage: valgono
    // solo "per questa sessione di navigazione"), vive in localStorage:
    // è una preferenza del giocatore che deve restare identica anche
    // riaprendo il browser un altro giorno — vedi impostazioni.html.
    const KEY_VOLUME = 'duelArenaMusicVolume';

    // ============================================================
    // window.DuelSFX — volume/mute degli EFFETTI SONORI (js/audio/sfx.js,
    // js/audio/audio-library.js), separato dalla musica di sottofondo qui sopra
    // su richiesta esplicita dell'utente: prima js/audio/sfx.js e
    // js/audio/audio-library.js leggevano il volume/mute di DuelMusic (un solo
    // cursore per tutto), ora ne hanno uno proprio. Vive qui (non in un
    // file a parte) perché questo è già l'hub condiviso per le
    // impostazioni audio tra le pagine, stesso spirito di DuelMusic sopra.
    // Sempre disponibile (non richiede initAudioManager()), in localStorage
    // come il volume musica: una preferenza del giocatore, non legata a
    // una singola sessione di navigazione.
    // ============================================================
    const KEY_SFX_MUTED = 'duelArenaSfxMuted';
    const KEY_SFX_VOLUME = 'duelArenaSfxVolume';

    let sfxVolume = 0.6;
    try {
        const saved = parseFloat(localStorage.getItem(KEY_SFX_VOLUME));
        if (!isNaN(saved) && saved >= 0 && saved <= 1) sfxVolume = saved;
    } catch (e) { /* noop */ }
    let sfxMuted = false;
    try { sfxMuted = localStorage.getItem(KEY_SFX_MUTED) === 'true'; } catch (e) { /* noop */ }

    window.DuelSFX = {
        getVolume: function () { return sfxVolume; },
        /** 0..1. Persiste in localStorage: resta la stessa in ogni pagina e sessione futura. */
        setVolume: function (value) {
            sfxVolume = Math.min(1, Math.max(0, value));
            try { localStorage.setItem(KEY_SFX_VOLUME, String(sfxVolume)); } catch (e) { /* noop */ }
        },
        isMuted: function () { return sfxMuted; },
        setMuted: function (value) {
            sfxMuted = !!value;
            try { localStorage.setItem(KEY_SFX_MUTED, String(sfxMuted)); } catch (e) { /* noop */ }
        },
        toggleMute: function () {
            window.DuelSFX.setMuted(!sfxMuted);
            return sfxMuted;
        }
    };

    /**
     * Transizione nativa del browser tra due pagine dello stesso sito
     * (Chrome/Edge 126+, "Cross-Document View Transitions" — nessun
     * fallback necessario: sui browser che non la conoscono questa
     * regola CSS viene semplicemente ignorata, navigazione identica a
     * prima). Attiva un dissolvenza automatica per OGNI navigazione,
     * sia un click su un `<a href>` sia un `location.href = ...`
     * impostato da JS (es. duello-libero.html, duel-session.js) — un
     * puro miglioramento CSS, mai serve intercettare i click a mano né
     * toccare uno qualunque degli onclick/handler di navigazione già
     * esistenti (rischio zero di romperli). Iniettata da qui perché
     * initAudioManager() gira già su ogni pagina "menu" del gioco: un
     * solo punto invece di aggiungere lo stesso `<style>` a mano su
     * ognuna.
     */
    function ensureViewTransitionStyle() {
        if (document.getElementById('viewTransitionStyle')) return;
        const style = document.createElement('style');
        style.id = 'viewTransitionStyle';
        style.textContent = '@view-transition { navigation: auto; }';
        document.head.appendChild(style);
    }

    /**
     * Integrazione con l'app Android impacchettata (Capacitor — vedi
     * C:\AndroidDev\YuGiOhGameAndroid, un WebView nativo che carica queste
     * stesse pagine da un server di sviluppo, non un browser). `window.Capacitor`
     * esiste SOLO dentro quell'app, mai in un browser normale: ogni cosa qui
     * dentro è quindi un no-op silenzioso per chiunque giochi da browser,
     * zero rischio per l'esperienza web esistente.
     *
     * Due cose, entrambe richieste esplicitamente dall'utente dopo aver
     * provato l'app impacchettata:
     * 1) Orientamento LIBERO (nessun lock) su OGNI pagina eccetto
     *    duelMonstersCore.html — segue il sensore del telefono, quindi
     *    l'app può ruotare a piacere E parte già nell'orientamento
     *    fisico corrente del telefono all'apertura, invece di forzare
     *    sempre verticale (prima versione di questa funzione, cambiata
     *    su richiesta esplicita: "dai la possibilità... di poter
     *    ruotare lo schermo e/o di partire con l'app già in orizzontale
     *    in base allo stato attuale del telefono"). duelMonstersCore.html
     *    resta l'unica eccezione: il proprio blocco dedicato (vedi lì)
     *    gira DOPO questo e forza l'orizzontale, sovrascrivendo lo sblocco
     *    appena fatto qui.
     * 2) La musica si ferma quando l'app va in background (Home, cambio
     *    app, schermo spento) e riprende quando torna in primo piano —
     *    altrimenti continuerebbe a suonare invisibile, cosa che in un
     *    browser normale non può succedere (la scheda in background dei
     *    browser mette comunque in pausa i tab non attivi), ma un WebView
     *    nativo non lo fa da solo.
     */
    function ensureCapacitorAppIntegration(audio) {
        if (!window.Capacitor || !Capacitor.isNativePlatform || !Capacitor.isNativePlatform()) return;
        const plugins = Capacitor.Plugins || {};

        if (plugins.ScreenOrientation && typeof plugins.ScreenOrientation.unlock === 'function') {
            plugins.ScreenOrientation.unlock().catch(() => {});
        }

        if (plugins.App && typeof plugins.App.addListener === 'function') {
            plugins.App.addListener('appStateChange', (state) => {
                if (!state || !state.isActive) {
                    audio.pause();
                } else if (!audio.muted) {
                    audio.play().catch(() => {});
                }
            });
        }
    }

    function initAudioManager(options) {
        options = options || {};
        const trackSrc = options.trackSrc || DEFAULT_TRACK;

        ensureViewTransitionStyle();

        let audio = document.getElementById('bgMusicAudio');
        if (!audio) {
            audio = document.createElement('audio');
            audio.id = 'bgMusicAudio';
            audio.loop = true;
            audio.preload = 'auto';
            document.body.appendChild(audio);
        }

        ensureCapacitorAppIntegration(audio);

        let muted = false;
        try { muted = sessionStorage.getItem(KEY_MUTED) === 'true'; } catch (e) { /* noop */ }

        let savedTrack = null;
        let savedTime = 0;
        try {
            savedTrack = sessionStorage.getItem(KEY_TRACK);
            savedTime = parseFloat(sessionStorage.getItem(KEY_TIME) || '0') || 0;
        } catch (e) { /* noop */ }

        let volume = 0.55;
        try {
            const savedVolume = parseFloat(localStorage.getItem(KEY_VOLUME));
            if (!isNaN(savedVolume) && savedVolume >= 0 && savedVolume <= 1) volume = savedVolume;
        } catch (e) { /* noop */ }
        audio.volume = volume;
        audio.muted = muted;
        audio.src = trackSrc;

        // Riprende dalla posizione salvata SOLO se la pagina precedente
        // stava suonando la stessa traccia (continuità reale, non un salto
        // a caso se in futuro cambia il brano).
        const needsResume = savedTrack === trackSrc && savedTime > 0;

        // tryPlay() va chiamata SOLO dopo 'canplay', MAI subito dopo aver
        // assegnato audio.src qui sopra — verificato empiricamente: un
        // play() tentato a readyState 0 (nessun dato ancora bufferizzato)
        // viene rifiutato dal browser come se mancasse un gesto
        // dell'utente, ANCHE se muted, mentre lo stesso identico play() a
        // readyState 4 (dopo 'canplay') va sempre a buon fine senza
        // bisogno di alcuna interazione. Stesso motivo per cui il seek
        // alla posizione salvata deve aspettare 'canplay' (non
        // 'loadedmetadata': a quel punto il buffer non è ancora
        // sufficiente per un seek affidabile) — un solo listener per
        // entrambi invece di farli gareggiare fra loro.
        audio.addEventListener('canplay', function onReady() {
            audio.removeEventListener('canplay', onReady);
            if (needsResume && savedTime < audio.duration) {
                audio.currentTime = savedTime;
            }
            if (!muted && options.autoplay !== false) {
                tryPlay();
            }
        }, { once: true });

        function persistState() {
            try {
                sessionStorage.setItem(KEY_TRACK, trackSrc);
                sessionStorage.setItem(KEY_TIME, String(audio.currentTime || 0));
            } catch (e) { /* noop */ }
        }
        audio.addEventListener('timeupdate', persistState);
        window.addEventListener('pagehide', persistState);
        window.addEventListener('beforeunload', persistState);

        // Pulsante "Indietro" (history.back()) o navigazione avanti/indietro
        // del browser: la pagina può tornare dalla bfcache invece di
        // ricaricarsi da zero — in quel caso questo script NON riparte
        // (è la stessa istanza già in memoria), ma il browser ha comunque
        // messo in pausa l'audio quando la pagina è stata nascosta. Senza
        // questo listener la musica restava mutamente ferma finché non si
        // cambiava di nuovo pagina (un vero reload). 'persisted' è true
        // solo per un ripristino da bfcache, mai per un caricamento normale
        // (dove initAudioManager() gira comunque da capo, quindi qui non
        // farebbe nulla di nuovo).
        window.addEventListener('pageshow', (event) => {
            if (event.persisted && !audio.muted && audio.paused && options.autoplay !== false) {
                tryPlay();
            }
        });

        /**
         * L'autoplay bloccato dal browser senza un gesto dell'utente è una
         * vera policy di sicurezza, non un bug — nessun trucco client-side
         * la aggira. Se play() viene rifiutato, resta un solo modo
         * legittimo per ripartire: il PRIMO gesto reale dell'utente su
         * QUESTA pagina, qualunque esso sia. Ascoltato in fase di CAPTURE
         * (4° argomento `true`), non bubble: due interazioni molto comuni
         * del duello (trascinare una carta dalla mano — startHandCardDrag
         * in js/engine/actions.js — e trascinare un mostro per attaccare —
         * startAttackDrag in js/engine/game-flow.js) chiamano ENTRAMBE
         * event.stopPropagation() proprio sull'evento 'pointerdown' (per
         * evitare un click sintetico duplicato su mobile). Un listener in
         * fase di bubble su `document` non riceverebbe mai quell'evento;
         * la fase di capture scorre invece da `document` VERSO il
         * bersaglio, PRIMA che l'evento arrivi lì, quindi nessuno
         * stopPropagation() a valle può fermarla. Nessuna UI: nessun
         * banner, nessun pulsante — solo un ascolto silenzioso del primo
         * gesto reale.
         */
        function tryPlay() {
            const playPromise = audio.play();
            if (!playPromise || typeof playPromise.catch !== 'function') return;

            playPromise.catch(() => {
                const startOnInteraction = () => {
                    audio.play().catch(() => {});
                    document.removeEventListener('pointerdown', startOnInteraction, true);
                    document.removeEventListener('keydown', startOnInteraction, true);
                    document.removeEventListener('wheel', startOnInteraction, true);
                    document.removeEventListener('touchstart', startOnInteraction, true);
                };
                document.addEventListener('pointerdown', startOnInteraction, { once: true, passive: true, capture: true });
                document.addEventListener('keydown', startOnInteraction, { once: true, capture: true });
                document.addEventListener('wheel', startOnInteraction, { once: true, passive: true, capture: true });
                document.addEventListener('touchstart', startOnInteraction, { once: true, passive: true, capture: true });
            });
        }

        function updateToggleButton() {
            const btn = document.getElementById('musicToggleBtn');
            if (!btn) return;
            btn.textContent = audio.muted ? '🔇' : '🔊';
            btn.classList.toggle('muted', audio.muted);
        }
        updateToggleButton();

        window.DuelMusic = {
            audio: audio,
            isMuted: function () { return audio.muted; },
            toggleMute: function () {
                audio.muted = !audio.muted;
                try { sessionStorage.setItem(KEY_MUTED, String(audio.muted)); } catch (e) { /* noop */ }
                if (!audio.muted && audio.paused) tryPlay();
                updateToggleButton();
                return audio.muted;
            },
            setMuted: function (value) {
                audio.muted = !!value;
                try { sessionStorage.setItem(KEY_MUTED, String(audio.muted)); } catch (e) { /* noop */ }
                if (!audio.muted && audio.paused) tryPlay();
                updateToggleButton();
            },
            getVolume: function () { return audio.volume; },
            /** 0..1. Persiste in localStorage: resta la stessa in ogni pagina e sessione futura. */
            setVolume: function (value) {
                audio.volume = Math.min(1, Math.max(0, value));
                try { localStorage.setItem(KEY_VOLUME, String(audio.volume)); } catch (e) { /* noop */ }
            },
            /**
             * Riproduce UNA VOLTA sola (niente loop) un effetto/stacchetto —
             * es. il jingle di Vittoria/Game Over a fine duello — su un
             * <audio> separato, così non tocca posizione/continuità della
             * musica di sottofondo condivisa. Per default SFUMA (fade out,
             * non uno stop secco) quella di sottofondo mentre il jingle
             * parte subito sopra — passare { pauseMusic: false } per
             * lasciare la musica di sottofondo intatta, o { fadeMs: 0 } per
             * uno stop immediato senza dissolvenza. Rispetta mute/volume
             * correnti, come la musica di sottofondo.
             */
            playOneShot: function (src, options) {
                options = options || {};
                const fadeMs = options.fadeMs !== undefined ? options.fadeMs : 500;
                const baseVolume = audio.volume;

                if (options.pauseMusic !== false) {
                    if (fadeMs > 0 && !audio.paused) {
                        const steps = 12;
                        let step = 0;
                        const fadeTimer = setInterval(() => {
                            step++;
                            audio.volume = Math.max(0, baseVolume * (1 - step / steps));
                            if (step >= steps) {
                                clearInterval(fadeTimer);
                                audio.pause();
                                audio.volume = baseVolume; // pronta per la prossima pagina/riproduzione
                            }
                        }, fadeMs / steps);
                    } else {
                        audio.pause();
                    }
                }

                const sfx = new Audio(src);
                sfx.loop = false;
                sfx.volume = baseVolume;
                if (!audio.muted) sfx.play().catch(() => {});
                return sfx;
            }
        };

        const btn = document.getElementById('musicToggleBtn');
        if (btn) {
            btn.addEventListener('click', (event) => {
                event.stopPropagation();
                window.DuelMusic.toggleMute();
            });
        }
    }

    window.initAudioManager = initAudioManager;
})();
