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

    const DEFAULT_TRACK = 'audio/soundtrack/mainTheme.mp3';
    const KEY_MUTED = 'duelArenaMusicMuted';
    const KEY_TIME = 'duelArenaMusicTime';
    const KEY_TRACK = 'duelArenaMusicTrack';

    function initAudioManager(options) {
        options = options || {};
        const trackSrc = options.trackSrc || DEFAULT_TRACK;

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

        audio.volume = 0.55;
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

        function showHint() {
            const hint = document.getElementById('musicHint');
            if (!hint) return;
            hint.classList.add('show');
            setTimeout(() => hint.classList.remove('show'), 3500);
        }

        function tryPlay() {
            const playPromise = audio.play();
            if (playPromise && typeof playPromise.catch === 'function') {
                playPromise.catch(() => {
                    showHint();
                    const startOnInteraction = () => {
                        audio.play().catch(() => {});
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
