/**
 * sw.js — Service Worker di Yu-Gi-Oh! Duel Arena (PWA).
 * =====================================================================
 * Percorsi tutti RELATIVI (mai assoluti "/…"): GitHub Pages serve questo
 * progetto sotto un sottopercorso (https://<utente>.github.io/<repo>/),
 * non alla radice del dominio — un percorso assoluto punterebbe fuori
 * dal sito. Lo stesso vale per manifest.json e per ogni <script src>/
 * <link href> nelle pagine HTML: NON aggiungere mai uno "/" iniziale.
 *
 * Strategia in due parti, diverse per tipo di file:
 *   - APP SHELL (HTML/CSS/JS, ~3MB in tutto): "network-first" — prova
 *     sempre la rete per avere subito l'ultima versione pubblicata (utile
 *     visto lo sviluppo continuo del progetto), e ripiega sulla cache
 *     SOLO se offline. Così un aggiornamento pubblicato arriva sempre al
 *     prossimo avvio online, senza bisogno di incrementare a mano un
 *     numero di versione della cache per invalidarla (un errore classico
 *     nei Service Worker: dimenticarsi di farlo lascia gli utenti
 *     bloccati su una versione vecchia per sempre).
 *   - MEDIA (immagini/audio, centinaia di MB in tutto — troppi per
 *     precaricarli tutti in un colpo solo): "cache-first" — una volta
 *     scaricato un file la prima volta, resta in cache e non viene
 *     rifatto scaricare, ed è disponibile offline da quel momento in poi.
 *     Il gioco resta giocabile offline PIENAMENTE solo per le carte/i
 *     suoni già incontrati almeno una volta online — limite dichiarato,
 *     non finto: precaricare 114MB di immagini + 259MB di audio al primo
 *     avvio sarebbe un'esperienza pessima, specie da rete mobile.
 */

// v2: riorganizzazione di js/ in sottocartelle per contesto (motore, dati,
// IA, audio, UI, multiplayer, cloud) — bump necessario per svuotare le
// vecchie voci di cache ai vecchi percorsi piatti, altrimenti restano
// orfane in cache invece di essere ripulite da activate() qui sotto.
// v3: nuova icona dell'app (le icone sono MEDIA, non app shell — cache-
// first, vedi sopra — quindi senza questo bump chi le aveva già scaricate
// non vedrebbe mai la nuova finché non svuota la cache a mano).
const CACHE_NAME = 'ygo-duel-arena-v3';

// L'intera "app shell": tutte le pagine HTML + tutto il codice JS/CSS che
// le fa funzionare. Leggero (pochi MB in tutto), quindi si può precaricare
// per intero all'installazione — è quello che rende il gioco AVVIABILE
// offline, non solo "un po' più veloce".
const APP_SHELL = [
    './',
    'index.html',
    'cartoteca.html',
    'creazione-deck.html',
    'crea-carta.html',
    'duello-libero.html',
    'impostazioni.html',
    'multiplayer.html',
    'negozio.html',
    'profilo.html',
    'regole.html',
    'tornei.html',
    'yugioh_game.html',
    'manifest.json',
    'images/icons/icon-192.png',
    'images/icons/icon-512.png',
    'images/icons/icon-180.png',
    'images/icons/icon-32.png',
    // js/ organizzata per contesto (vedi GUIDA_RIUTILIZZO.md): motore di
    // gioco in engine/, dati carte/mazzi in data/, IA in ai/, audio in
    // audio/, presentazione in ui/, multiplayer in multiplayer/, sync
    // cloud in cloud/, librerie di terze parti in vendor/ — solo
    // save-manager.js/duel-session.js/pwa-register.js restano nella
    // radice di js/ (collante di pagina, non parte di un sottosistema).
    'js/ui/card.css',
    'js/ui/effects.css',
    'js/ui/duel-cinematics.css',
    'js/engine/actions.js',
    'js/engine/duel-engine.js',
    'js/engine/game-flow.js',
    'js/engine/card-effects.js',
    'js/engine/effect-templates.js',
    'js/ai/ai-controller.js',
    'js/ai/ai-hard.js',
    'js/ai/ai-medium.js',
    'js/ai/ai-shared.js',
    'js/ai/bot.js',
    'js/audio/audio-library.js',
    'js/audio/audio-manager.js',
    'js/audio/sfx.js',
    'js/data/cards-data.generated.js',
    'js/data/cards-db.js',
    'js/data/character-decks.js',
    'js/data/characters-db.js',
    'js/data/custom-cards.js',
    'js/data/starter-structure-decks.js',
    'js/ui/card-renderer.js',
    'js/ui/duel-cinematics.js',
    'js/ui/effects.js',
    'js/ui/icon-library.js',
    'js/ui/visual-effects-library.js',
    'js/multiplayer/mp-lobby.js',
    'js/multiplayer/multiplayer.js',
    'js/multiplayer/network.js',
    'js/cloud/cloud-sync.js',
    'js/cloud/supabase-config.js',
    'js/duel-session.js',
    'js/pwa-register.js',
    'js/save-manager.js',
    'js/vendor/gsap.min.js',
    'js/vendor/howler.min.js',
    'js/vendor/pixi.min.js',
    'js/vendor/supabase.min.js'
];

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            // addAll fallisce TUTTO se anche un solo file manca (404): meglio
            // così, un file dimenticato dalla lista qui sopra si nota subito
            // invece di restare un buco silenzioso nella cache offline.
            .then((cache) => cache.addAll(APP_SHELL))
            // Attiva subito questa versione invece di aspettare che tutte le
            // schede aperte del gioco si chiudano — chi lo installa/aggiorna
            // vuole vedere l'effetto al prossimo avvio, non prima.
            .then(() => self.skipWaiting())
    );
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys()
            .then((keys) => Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))))
            .then(() => self.clients.claim())
    );
});

/** Vero per le richieste dell'app shell (HTML/CSS/JS) — vedi la strategia network-first sopra. */
function isAppShellRequest(url) {
    return /\.(html|css|js)$/.test(url.pathname) || url.pathname.endsWith('/');
}

self.addEventListener('fetch', (event) => {
    const req = event.request;
    if (req.method !== 'GET') return; // niente cache per POST/ecc (qui non ce ne sono comunque)

    const url = new URL(req.url);
    if (url.origin !== self.location.origin) return; // mai toccare richieste verso altri domini

    if (isAppShellRequest(url)) {
        event.respondWith(
            fetch(req)
                .then((response) => {
                    const copy = response.clone();
                    caches.open(CACHE_NAME).then((cache) => cache.put(req, copy));
                    return response;
                })
                .catch(() => caches.match(req))
        );
        return;
    }

    event.respondWith(
        caches.match(req).then((cached) => {
            if (cached) return cached;
            return fetch(req).then((response) => {
                // Solo risposte valide vengono messe in cache (una 404 per
                // un'immagine mancante — caso già gestito con un fallback
                // grafico lato client — non deve "incollarsi" in cache).
                if (response && response.ok) {
                    const copy = response.clone();
                    caches.open(CACHE_NAME).then((cache) => cache.put(req, copy));
                }
                return response;
            });
        })
    );
});
