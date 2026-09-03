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
     * L'"hint" per riprendere la musica quando l'autoplay viene bloccato
     * dal browser (vedi tryPlay() più sotto) — PRIMA questa funzione
     * cercava un #musicHint che nessuna pagina del progetto aveva mai
     * davvero costruito nel proprio HTML (bug reale: silenziosamente non
     * succedeva nulla, l'utente restava senza alcun segnale del perché
     * la musica non partiva, e la ripristinava solo al PROSSIMO click a
     * caso su qualunque elemento della pagina — da cui la sensazione di
     * "ripresa in ritardo" imprevedibile). Creata qui, dinamicamente,
     * come già succede per l'elemento <audio> stesso qui sopra: nessuna
     * pagina deve più predisporre il proprio markup a mano.
     */
    function ensureMusicHintElement() {
        let hint = document.getElementById('musicHint');
        if (hint) return hint;

        if (!document.getElementById('musicHintStyle')) {
            const style = document.createElement('style');
            style.id = 'musicHintStyle';
            style.textContent = `
                #musicHint {
                    position: fixed;
                    left: 50%;
                    bottom: 18px;
                    z-index: 20000;
                    transform: translate(-50%, 12px);
                    opacity: 0;
                    pointer-events: none;
                    padding: 10px 18px;
                    border-radius: 999px;
                    font-family: Arial, sans-serif;
                    font-size: 0.85rem;
                    font-weight: 700;
                    color: #fff6dc;
                    background: linear-gradient(135deg, rgba(20,20,30,0.92), rgba(35,30,20,0.9));
                    border: 1px solid rgba(247,215,116,0.5);
                    box-shadow: 0 8px 24px rgba(0,0,0,0.45);
                    transition: opacity 0.3s ease, transform 0.3s ease;
                    white-space: nowrap;
                }
                #musicHint.show { opacity: 1; transform: translate(-50%, 0); }
            `;
            document.head.appendChild(style);
        }

        hint = document.createElement('div');
        hint.id = 'musicHint';
        hint.textContent = '🔈 Tocca lo schermo per riprendere la musica';
        document.body.appendChild(hint);
        return hint;
    }

    function initAudioManager(options) {
        options = options || {};
        const trackSrc = options.trackSrc || DEFAULT_TRACK;

        ensureViewTransitionStyle();
        ensureMusicHintElement();

        let audio = document.getElementById('bgMusicAudio');
        if (!audio) {
            audio = document.createElement('audio');
            audio.id = 'bgMusicAudio';
            audio.loop = true;
            audio.preload = 'auto';
            document.body.appendChild(audio);
        }

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

        // tryPlay() (il trucco muted->unmute per bypassare il blocco
        // autoplay, vedi il commento lì) va chiamata SOLO dopo 'canplay',
        // MAI subito dopo aver assegnato audio.src qui sopra — verificato
        // empiricamente: un play() tentato a readyState 0 (nessun dato
        // ancora bufferizzato) viene rifiutato dal browser come se
        // mancasse un gesto dell'utente, ANCHE se muted, mentre lo stesso
        // identico play() a readyState 4 (dopo 'canplay') va sempre a
        // buon fine senza bisogno di alcuna interazione. Stesso motivo
        // per cui il seek alla posizione salvata deve aspettare
        // 'canplay' (non 'loadedmetadata': a quel punto il buffer non è
        // ancora sufficiente per un seek affidabile, l'assegnazione a
        // currentTime verrebbe silenziosamente ignorata) — un solo
        // listener per entrambi invece di farli gareggiare fra loro (che
        // produrrebbe lo scarto udibile "parte da 0 poi salta" ad ogni
        // cambio pagina).
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

        function showHint() {
            const hint = document.getElementById('musicHint');
            if (!hint) return;
            hint.classList.add('show');
        }

        function hideHint() {
            const hint = document.getElementById('musicHint');
            if (hint) hint.classList.remove('show');
        }

        /**
         * NOTA per una futura sessione, per non riprovarci daccapo: un
         * trucco "parti muto (sempre permesso), poi togli il muto via
         * script senza alcun gesto" è stato provato e SCARTATO — sembrava
         * funzionare nei test con Playwright, ma solo perché
         * `page.evaluate()` di Playwright concede lui stesso un gesto
         * implicito alle chiamate `play()` fatte al suo interno (verificato:
         * perfino un `play()` NON muto, senza alcun trucco, riusciva se
         * invocato da `page.evaluate()`) — un artefatto del test, non il
         * comportamento reale. Con un audio creato ed eseguito dal normale
         * script della pagina (nessun `evaluate()` di mezzo, lo stesso
         * percorso che segue un utente vero), perfino l'autoplay MUTO
         * viene rifiutato su file:// senza un gesto reale. **Non esiste
         * un modo lato client per aggirare questo (è una policy di
         * sicurezza del browser, non un bug)** — l'unica cosa realistica
         * è reagire il più presto possibile al primo gesto vero
         * dell'utente, qui sotto.
         */
        function tryPlay() {
            const playPromise = audio.play();
            if (!playPromise || typeof playPromise.catch !== 'function') return;

            playPromise.catch(() => {
                // Bloccato dal browser: resta visibile finché l'utente
                // non interagisce DAVVERO con QUESTA pagina (non un
                // timeout fisso che sparirebbe comunque, lasciandolo
                // senza alcun segnale) — e riparte al PRIMO gesto
                // qualunque esso sia, non serve toccare l'hint stesso:
                // click, tocco, tasto o persino uno scroll bastano, così
                // nella normale navigazione (arrivi sulla pagina, clicchi
                // subito quello che sei venuto a fare) la musica riprende
                // da sola nello stesso istante, senza una vera "azione di
                // sblocco" percepita a parte.
                showHint();
                const startOnInteraction = () => {
                    audio.play().then(hideHint).catch(() => {});
                    document.removeEventListener('pointerdown', startOnInteraction);
                    document.removeEventListener('keydown', startOnInteraction);
                    document.removeEventListener('wheel', startOnInteraction);
                    document.removeEventListener('touchstart', startOnInteraction);
                };
                document.addEventListener('pointerdown', startOnInteraction, { once: true, passive: true });
                document.addEventListener('keydown', startOnInteraction, { once: true });
                document.addEventListener('wheel', startOnInteraction, { once: true, passive: true });
                document.addEventListener('touchstart', startOnInteraction, { once: true, passive: true });
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
                if (!audio.muted && audio.paused) audio.play().catch(() => {});
                updateToggleButton();
                return audio.muted;
            },
            setMuted: function (value) {
                audio.muted = !!value;
                try { sessionStorage.setItem(KEY_MUTED, String(audio.muted)); } catch (e) { /* noop */ }
                if (!audio.muted && audio.paused) audio.play().catch(() => {});
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
