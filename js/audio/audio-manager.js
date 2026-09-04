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
         * script" — riesce ad aggirarla). Una volta che l'utente ha fatto
         * un click VERO da qualche parte sul sito, Chrome ricorda che
         * l'origine "ha già interagito con l'utente" per il resto della
         * sessione di navigazione, e le pagine successive raggiunte con
         * una VERA navigazione (click su un link/bottone) partono da sole.
         *
         * MA "Duello Demo" (duelMonstersCore.html) è il banco di prova
         * standard di questo progetto (vedi CLAUDE.md) e si apre spesso
         * DIRETTAMENTE, senza passare dal gate di index.html — la
         * primissima pagina di una sessione, quindi SENZA alcun click
         * pregresso — e il ciclo naturale della demo gioca DA SOLO
         * (bot/pescate automatiche) senza richiedere alcun click
         * dell'utente per un bel po'. Restare in attesa silenziosa del
         * primo gesto in quel caso significa restare MUTI a tempo
         * indefinito, senza che l'utente capisca perché (bug reale
         * segnalato dall'utente: "non c'è più la musica"). Il pulsantino
         * di recupero qui sotto (ensureFallbackButton) copre esattamente
         * questo caso: appare SOLO quando l'autoplay è davvero bloccato
         * (mai altrimenti), piccolo e in un angolo, non un banner a piena
         * larghezza col testo "tocca per riprendere" come nella versione
         * precedente — quella era l'unica cosa contestata, non l'idea di
         * un recupero visibile in sé.
         */
        // Un solo tentativo "in volo" alla volta: se sia il listener
        // generico (pointerdown/keydown/...) SIA un chiamante esplicito
        // (es. il click su "Clicca per saltare" dell'intro, vedi
        // DuelMusic.ensurePlaying più sotto) scattano quasi nello stesso
        // istante, non deve partire un secondo audio.play() ridondante.
        let playAttemptInFlight = false;

        /**
         * Un vero tentativo di avvio, riusabile sia dal primo giro
         * automatico (canplay) sia da QUALUNQUE gesto reale successivo —
         * incluso un chiamante ESPLICITO come il click sul pulsante
         * "Clicca per saltare" dell'intro (js/ui/duel-cinematics.js), che
         * non deve dipendere dal solo listener generico qui sotto (più
         * fragile: un gestore di un'altra carta/elemento potrebbe fermare
         * la propagazione dell'evento prima che arrivi a `document`).
         * Idempotente: chiamarla quando l'audio sta già suonando non fa
         * nulla di dannoso (audio.play() su un elemento già in
         * riproduzione risolve subito, senza riavviare nulla).
         */
        function attemptPlay() {
            if (playAttemptInFlight) return;
            playAttemptInFlight = true;
            const playPromise = audio.play();
            if (!playPromise || typeof playPromise.then !== 'function') {
                playAttemptInFlight = false;
                fadeInToTargetVolume();
                hideFallbackButton();
                return;
            }
            playPromise.then(() => {
                playAttemptInFlight = false;
                fadeInToTargetVolume();
                hideFallbackButton();
            }).catch(() => {
                playAttemptInFlight = false;
                onPlayBlocked();
            });
        }

        function onPlayBlocked() {
            const fallbackBtn = ensureFallbackButton();
            const startOnInteraction = () => {
                attemptPlay();
                document.removeEventListener('pointerdown', startOnInteraction);
                document.removeEventListener('keydown', startOnInteraction);
                document.removeEventListener('wheel', startOnInteraction);
                document.removeEventListener('touchstart', startOnInteraction);
            };
            document.addEventListener('pointerdown', startOnInteraction, { once: true, passive: true });
            document.addEventListener('keydown', startOnInteraction, { once: true });
            document.addEventListener('wheel', startOnInteraction, { once: true, passive: true });
            document.addEventListener('touchstart', startOnInteraction, { once: true, passive: true });
            // Il pulsantino stesso è un click reale: se l'utente lo preme,
            // parte subito da lì (startOnInteraction sopra lo catturerebbe
            // comunque via pointerdown, ma un onclick diretto è più
            // immediato e non lascia dubbi su cosa sia successo).
            if (fallbackBtn) fallbackBtn.onclick = startOnInteraction;
        }

        function tryPlay() {
            attemptPlay();
        }

        /**
         * Pulsantino "🔈" in basso a destra (mai in alto a destra: lì vive
         * il banner delle Sfide, js/ui/challenge-banner.js — nessuna
         * sovrapposizione), creato SOLO quando serve davvero (autoplay
         * bloccato) e rimosso non appena la musica riparte. Piccolo e
         * silenzioso apposta: un'icona sola, nessun testo, per non
         * ripetere l'errore del prompt "tocca per riprendere" precedente
         * (contestato dall'utente) pur restando un recupero DAVVERO
         * visibile invece di un'attesa muta indefinita.
         */
        function ensureFallbackButton() {
            let btn = document.getElementById('musicFallbackBtn');
            if (btn) return btn;
            btn = document.createElement('button');
            btn.id = 'musicFallbackBtn';
            btn.type = 'button';
            btn.title = 'Avvia la musica';
            btn.textContent = '🔈';
            if (!document.getElementById('musicFallbackBtnStyle')) {
                const style = document.createElement('style');
                style.id = 'musicFallbackBtnStyle';
                style.textContent = `
                    #musicFallbackBtn {
                        position: fixed;
                        /* right/bottom: 16px sarebbe la scelta ovvia, ma in
                           duelMonstersCore.html si sovrappone al pulsante
                           "Clicca per saltare" dell'intro
                           (.di-skip in js/ui/duel-cinematics.css, right:22px
                           bottom:20px — stesso angolo, stessa fascia
                           verticale). Spostato più in alto per restare
                           libero anche lì, unico punto in cui questo
                           pulsante condiviso può comparire mentre un altro
                           overlay a schermo intero è ancora attivo. */
                        right: 16px;
                        bottom: 74px;
                        z-index: 99999;
                        width: 42px;
                        height: 42px;
                        border-radius: 50%;
                        border: 1px solid rgba(247,215,116,0.5);
                        background: linear-gradient(145deg, #1f2a44, #304060);
                        color: #fff;
                        font-size: 1.1rem;
                        cursor: pointer;
                        box-shadow: 0 6px 18px rgba(0,0,0,0.45);
                        animation: musicFallbackPulse 1800ms ease-in-out infinite;
                    }
                    @keyframes musicFallbackPulse {
                        0%, 100% { box-shadow: 0 6px 18px rgba(0,0,0,0.45); }
                        50% { box-shadow: 0 6px 18px rgba(0,0,0,0.45), 0 0 0 6px rgba(243,156,18,0.18); }
                    }
                `;
                document.head.appendChild(style);
            }
            document.body.appendChild(btn);
            return btn;
        }

        function hideFallbackButton() {
            const btn = document.getElementById('musicFallbackBtn');
            if (btn) btn.remove();
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
                    if (audio.paused) attemptPlay();
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
                    if (audio.paused) attemptPlay();
                    else fadeInToTargetVolume();
                } else {
                    clearInterval(fadeTimer);
                }
                updateToggleButton();
            },
            /**
             * Tentativo ESPLICITO di avvio, richiamabile da un gesto reale
             * DI CUI SI HA GIÀ CERTEZZA (es. il click su "Clicca per
             * saltare" dell'intro in js/ui/duel-cinematics.js) invece di
             * fare affidamento SOLO sui listener generici pointerdown/
             * keydown/... su `document` qui sopra — quei listener
             * dipendono dalla propagazione dell'evento fino a document, che
             * un altro gestore potrebbe fermare prima (event.stopPropagation()
             * è un pattern comune in questo motore, es. sulle carte).
             * Chiamarla quando la musica sta già suonando non fa nulla di
             * dannoso (idempotente).
             */
            ensurePlaying: function () {
                if (!audio.muted) attemptPlay();
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
