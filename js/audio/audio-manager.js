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
        //
        // Il seek avviene sull'evento 'canplay' e non su 'loadedmetadata'
        // (che pure è il punto dove la durata diventa nota): a
        // 'loadedmetadata' il browser ha letto solo l'intestazione del
        // file, senza ancora abbastanza dati bufferizzati per spostarsi
        // davvero alla posizione richiesta — se si prova a farlo lì,
        // l'assegnazione a currentTime viene silenziosamente ignorata e
        // resta a 0 (verificato empiricamente: leggere currentTime subito
        // dopo l'assegnazione lo confermava già 0 su 'loadedmetadata', ma
        // funzionava correttamente su 'canplay'). 'canplay' garantisce che
        // ci sia abbastanza buffer per un seek affidabile.
        const needsResume = savedTrack === trackSrc && savedTime > 0;
        if (needsResume) {
            audio.addEventListener('canplay', function onReady() {
                audio.removeEventListener('canplay', onReady);
                if (savedTime < audio.duration) {
                    audio.currentTime = savedTime;
                }
                // Il play() parte SOLO da qui (dopo il seek), non anche
                // subito dopo audio.src = trackSrc più sotto: altrimenti i
                // due punti vanno in "gara" — la traccia parte
                // percepibilmente da 0 e poi "salta" alla posizione
                // corretta un istante dopo, che è proprio lo scarto
                // udibile che si sente ad ogni cambio pagina.
                if (!muted && options.autoplay !== false) {
                    tryPlay();
                }
            });
        }

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

        function tryPlay() {
            const playPromise = audio.play();
            if (playPromise && typeof playPromise.catch === 'function') {
                playPromise.catch(() => {
                    // L'autoplay bloccato dal browser (comune su file://,
                    // vedi il commento su ensureMusicHintElement più sopra)
                    // non è transitorio: resta bloccato finché l'utente non
                    // interagisce DAVVERO con QUESTA pagina, quindi l'hint
                    // resta visibile finché non succede — non un timeout
                    // fisso che sparirebbe anche se nessuno ha ancora
                    // toccato nulla, lasciando l'utente senza alcun segnale.
                    showHint();
                    const startOnInteraction = () => {
                        audio.play().then(hideHint).catch(() => {});
                        document.removeEventListener('pointerdown', startOnInteraction);
                        document.removeEventListener('keydown', startOnInteraction);
                    };
                    document.addEventListener('pointerdown', startOnInteraction, { once: true });
                    document.addEventListener('keydown', startOnInteraction, { once: true });
                });
            }
        }

        // Se c'è una posizione da ripristinare, il play() parte dal listener
        // 'loadedmetadata' qui sopra (dopo il seek): qui partiamo solo nel
        // caso "pulito" senza posizione salvata, per non far gareggiare i
        // due avvii tra loro (vedi commento sopra).
        if (!needsResume && !muted && options.autoplay !== false) {
            tryPlay();
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
