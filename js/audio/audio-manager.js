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

        let muted = false;
        try { muted = sessionStorage.getItem(KEY_MUTED) === 'true'; } catch (e) { /* noop */ }

        let savedTrack = null;
        let savedTime = 0;
        try {
            savedTrack = sessionStorage.getItem(KEY_TRACK);
            savedTime = parseFloat(sessionStorage.getItem(KEY_TIME) || '0') || 0;
        } catch (e) { /* noop */ }

        // `targetVolume` è la preferenza vera (letta da localStorage,
        // aggiornabile da DuelMusic.setVolume più sotto) — NON lo stesso
        // valore istantaneo di audio.volume, che invece parte da 0 e sale
        // fino a targetVolume in fadeInToTargetVolume() qui sotto, appena
        // la riproduzione comincia, invece di saltare secco al volume
        // pieno ad ogni cambio pagina (richiesta esplicita dell'utente:
        // "musica che fa un po' di fade"). La POSIZIONE riprende comunque
        // esatta (needsResume/currentTime più sotto): solo il volume
        // sfuma, la continuità del punto della traccia non cambia.
        // DuelMusic.getVolume() deve leggere QUESTA variabile (il target),
        // non audio.volume: altrimenti impostazioni.html, se aperta
        // mentre la dissolvenza è ancora in corso, mostrerebbe uno
        // slider bloccato a metà invece della vera preferenza salvata.
        let targetVolume = 0.55;
        try {
            const savedVolume = parseFloat(localStorage.getItem(KEY_VOLUME));
            if (!isNaN(savedVolume) && savedVolume >= 0 && savedVolume <= 1) targetVolume = savedVolume;
        } catch (e) { /* noop */ }
        audio.volume = 0;
        audio.muted = muted;
        audio.src = trackSrc;

        let fadeTimer = null;
        function fadeInToTargetVolume() {
            clearInterval(fadeTimer);
            if (audio.muted) { audio.volume = targetVolume; return; }
            const steps = 14;
            const stepMs = 40;
            let step = 0;
            fadeTimer = setInterval(() => {
                step++;
                audio.volume = Math.min(targetVolume, (targetVolume * step) / steps);
                if (step >= steps) clearInterval(fadeTimer);
            }, stepMs);
        }

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

        /**
         * L'autoplay bloccato dal browser senza un gesto dell'utente è una
         * vera policy di sicurezza, non un bug (vicolo cieco già verificato
         * ed esplorato a fondo in una sessione precedente: nessun trucco
         * client-side — incluso "parti muto, poi togli il muto via
         * script" — riesce ad aggirarla). MA una volta che l'utente ha
         * fatto un solo click VERO da qualche parte sul sito (es. il
         * pulsante del gate in index.html, obbligatorio per procedere),
         * Chrome ricorda che l'origine "ha già interagito con l'utente"
         * per il resto della sessione di navigazione — verificato
         * empiricamente: un audio.play() chiamato normalmente (nessun
         * evaluate()/trucco) su una pagina raggiunta con una VERA
         * navigazione successiva (click su un link/bottone, non
         * page.goto()) va a buon fine SENZA bisogno di un altro gesto
         * specifico su quella pagina. Quindi qui non serve più mostrare
         * alcun prompt "tocca per riprendere": la primissima pagina mai
         * aperta (prima di qualunque click, incluso quello sul gate) può
         * restare silenziosamente in attesa del primo gesto reale
         * dell'utente — che arriva comunque entro pochi istanti, dato che
         * il gate stesso richiede un click per procedere — mentre OGNI
         * pagina successiva riprende a suonare da sola, senza percepibile
         * "azione di sblocco" a parte.
         */
        function tryPlay() {
            const playPromise = audio.play();
            if (!playPromise || typeof playPromise.then !== 'function') { fadeInToTargetVolume(); return; }

            playPromise.then(fadeInToTargetVolume).catch(() => {
                // Bloccato dal browser (solo possibile sulla primissima
                // pagina mai aperta in questa sessione, prima di qualunque
                // click): riparte in silenzio al primo gesto reale
                // dell'utente, qualunque esso sia — nessun prompt visibile.
                const startOnInteraction = () => {
                    audio.play().then(fadeInToTargetVolume).catch(() => {});
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
                if (!audio.muted) {
                    if (audio.paused) audio.play().then(fadeInToTargetVolume).catch(() => {});
                    else fadeInToTargetVolume(); // già in riproduzione ma a volume 0 (era mutato): sale invece di saltare
                } else {
                    clearInterval(fadeTimer);
                }
                updateToggleButton();
                return audio.muted;
            },
            setMuted: function (value) {
                audio.muted = !!value;
                try { sessionStorage.setItem(KEY_MUTED, String(audio.muted)); } catch (e) { /* noop */ }
                if (!audio.muted) {
                    if (audio.paused) audio.play().then(fadeInToTargetVolume).catch(() => {});
                    else fadeInToTargetVolume();
                } else {
                    clearInterval(fadeTimer);
                }
                updateToggleButton();
            },
            /** Preferenza salvata (0..1) — non il valore istantaneo di audio.volume, che durante un fade-in può essere temporaneamente più basso (vedi fadeInToTargetVolume più sopra). */
            getVolume: function () { return targetVolume; },
            /** 0..1. Persiste in localStorage: resta la stessa in ogni pagina e sessione futura. Un controllo manuale dell'utente interrompe subito un eventuale fade-in ancora in corso. */
            setVolume: function (value) {
                clearInterval(fadeTimer);
                targetVolume = Math.min(1, Math.max(0, value));
                audio.volume = targetVolume;
                try { localStorage.setItem(KEY_VOLUME, String(targetVolume)); } catch (e) { /* noop */ }
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
