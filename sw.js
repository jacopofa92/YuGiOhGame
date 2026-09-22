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
// v4: pagina Sfide (sfide.html) + i suoi file nuovi (challenges-db.js,
// challenge-tracker.js, challenge-banner.js/.css).
// v5: pagina Torneo "Regno dei Duellanti" (torneo-regno-duellanti.html) +
// i file js/native/*.js aggiunti per l'APK Android (no-op sul web, ma
// caricati da quasi ogni pagina) + js/ui/error-recovery.js/js/version.js.
// v6: backgroundMainMenu.png/backgroundMenu.png (MEDIA, cache-first)
// convertiti in .jpg per alleggerirli (~85% più leggeri, stessa qualità
// visiva) — bump per svuotare le vecchie voci .png orfane in cache, mai
// più referenziate da nessuna pagina.
// v7: images/fields/*.jpg ripristinate alla qualità originale (su
// richiesta esplicita: niente compressione del Terreno su desktop) e
// nuova cartella images/fields/mobile/ con le versioni compresse per
// schermi touch — bump NECESSARIO (non solo igiene): senza, chi aveva
// già in cache le v6 (compresse, allo STESSO percorso) continuerebbe a
// vedersele servite dalla cache-first anche su desktop, ignorando il
// ripristino appena fatto.
// v8: nuova schermata di caricamento condivisa ad ogni cambio pagina
// (js/ui/page-loader.js/.css, sostituisce il vecchio #preIntroCover
// statico di duelMonstersCore.html) — file nuovi da aggiungere all'app
// shell.
// v9: accesso con approvazione admin OBBLIGATORIO per giocare (replica
// del meccanismo del progetto Fioxify) — js/cloud/auth-gate.js nuovo,
// admin.html nuova pagina. Aggiunta anche duello-sandbox.html, mancante
// dall'app shell da prima di questa sessione (gap preesistente, corretto
// qui insieme al resto visto che questo file andava comunque toccato).
// v16: sei pagine menu fuse in index.html come viste SPA (Sfide, Tornei,
// Negozio, Impostazioni, Regole, Cartoteca). Nessun file nuovo da
// aggiungere — quelli che le viste caricano alla prima apertura
// (cards-data.generated.js, duel-engine.js, card-effects.js,
// card-renderer.js, challenges-db.js...) erano già tutti nell'app shell
// perché usati dalle pagine autonome, quindi la fusione funziona anche
// offline. Il bump serve solo a far ripopolare la cache con il nuovo
// index.html, cresciuto di parecchio.
// v17: js/ui/fx-gsap.js, backend di animazione opzionale per il duello.
// v18: pagina Torneo "Battle City" (torneo-battle-city.html).
// v19: pagina Torneo "Kaiba" (torneo-kaiba.html).
// v20: economia + Negozio — js/data/card-rarity.js, js/cloud/server-date.js,
// js/economy/* (rewards, shop-catalog, shop-ui e i due CSS).
// v21: componenti condivisi estratti per il Negozio — js/ui/deck-box.*
// (la scatola 3D, prima dentro creazione-deck.html) e js/ui/card-detail.*
// (la scheda di una carta, prima duplicata in Cartoteca e Creazione Deck).
// v22: Multiplayer online — la lobby punta al server pubblico (vedi
// render.yaml), e js/multiplayer/network.js insiste alla prima
// connessione mentre quel server si risveglia.
// v23: Sala d'Attesa del Multiplayer — js/ui/mp-lobby.css e
// js/data/arena-options.js (catalogo di arene e colonne sonore).
// v24: selettore condiviso di mazzo/arena/musica (js/ui/duel-setup.*),
// usato dalla Sala d'Attesa e ora anche dal Duello Libero.
// v25: le "Carte ammesse" entrano nello stesso selettore, quindi anche in
// Multiplayer, dove viaggiano all'avversario come regola del duello.
// v26: la Sala d'Attesa torna nella tavolozza del gioco (oro su pietra
// egizia), col ciano ridotto alla sola voce del sistema.
// v27: ritratto e mazzo corrente nella barra in alto del Duello Libero,
// con il selettore a scorrimento (js/ui/deck-switcher.*).
// v28: ritratto in ogni barra (mazzo solo dove si duella), e pulsanti
// arrotondati come il resto del gioco al posto degli spigoli tagliati.
// v29: via l'evidenziazione azzurrina del browser al tocco su ogni
// pagina, con lo stato premuto dei pulsanti a farne le veci.
// v30: il controllo sulle carte ammesse ora avviene PRIMA di entrare
// nell'arena (js/data/deck-legality.js + card-origins.generated.js).
// v31: mazzi mostrati come scatole 3D anche nel Profilo, interruttore
// della vibrazione in Impostazioni, e niente rimbalzo elastico ai bordi
// della pagina su telefono.
// v32: schermata Tornei rifatta (arte dell'arena, avanzamento, mazzo in
// barra), nessun premio per un duello abbandonato, interruttori Musica/
// Effetti che dicono "attivo" invece di "muto", e la nuova impostazione
// Dettagli video (js/ui/video-quality.js).
// v33: raffiche di sabbia nelle arene egizie con i Dettagli video su
// "Alti" (js/ui/field-ambience.*), il primo effetto di quel livello.
// v34: folate vere (a ondate) invece di un velo trascinato, più due
// ambienti nuovi — vento d'alta quota sul Dirigibile di Kaiba e campo
// olografico nelle Arene Kaiba.
// v35: nuova arena "Castello di Pegasus" (usata dai duelli dentro il
// Castello nel Regno dei Duellanti) e nuova immagine del Dirigibile di
// Kaiba, entrambe con la loro variante in images/fields/mobile/.
// v36: folate di sabbia e vento più marcate, con la grana della sabbia
// disegnata su canvas invece che con gradienti ripetuti (a piena
// intensità i granelli si leggevano come una griglia).
// v37: intermezzi narrativi nei tre tornei (js/ui/story-cutscene.* +
// js/data/tournament-dialogues.js): dialoghi in carattere ai passaggi di
// fase — dirigibile, Torre Kaiba, Castello di Pegasus, finali.
// v38: gli intermezzi non sono più su fondo nero — ogni scena mostra il
// LUOGO in cui si svolge (dirigibile, Castello, arena KaibaCorp).
// v39: il bot non gioca più sotto a un filmato di Evocazione, Kaiba ha
// sempre il suo tema di duello in ogni torneo, i dialoghi raccontano il
// tabellone vero (altra semifinale, avversario in finale) e dal Regno dei
// Duellanti si può rigiocare senza passare da "Abbandona".
// v40: il duello in Multiplayer riceve davvero il CSS e tutti gli
// elementi dell'arena; il primo avvio passa dal negozio del nonno
// (js/ui/onboarding.*); e in sala d'attesa si parte solo quando entrambi
// premono "Pronto", con conto alla rovescia e morra cinese fra i due.
// v41: la sala d'attesa del Multiplayer si accorge se l'avversario se ne
// va — prima restava a mostrarlo "Pronto" e si poteva far partire un
// duello contro nessuno — e uscire dalla pagina libera il posto subito
// invece di tenerlo occupato per i 45 secondi di grazia del server.
// v42: in Multiplayer un Tributo fa ora scattare gli stessi avvisi del
// motore su tutti e due i client, il sacrificio pagato per attaccare non
// disallinea più i due lati, e il Castello dell'Ingranaggio Antico
// sacrificato viaggia finalmente sulla rete.
// v43: in Multiplayer l'attivazione di una carta viene annunciata PRIMA
// della finestra di risposta (prima ogni Magia restava ferma 30 secondi e
// poi rimbalzava fra i due client), le Magie giocate dalla mano arrivano
// davvero all'avversario, e Special Summon dalla mano / Evocazione
// dall'Extra Deck / scarto per il limite di mano non lasciano più i due
// lati con due partite diverse.
// v44: in Multiplayer la carta dell'avversario non si risolve più "come
// se fosse mia" (il campo owner del messaggio ribaltava il proprietario
// dell'effetto), e la scelta del bersaglio viaggia invece di essere
// indovinata dalla copia che gira dall'altra parte.
// v45: il contesto di un effetto non è più sovrascrivibile dai dati del
// momento, e le prime dieci carte che promettevano una scelta al
// giocatore (Richiamo della Mummia, Cambio di Cuore, Controllo Mentale…)
// ora gliela fanno davvero fare invece di decidere da sole.
// v46: ologrammi in finto 3D sopra i mostri scoperti
// (js/ui/monster-hologram.*), stile Master Duel, con i Dettagli video su
// "Alti" — generici per tutte le carte, e fuori dal Terreno perché questo
// viene ricostruito da zero circa una volta al secondo.
// v47: gli ologrammi hanno un'impostazione tutta loro, "Visualizzazione
// ologramma" (js/ui/hologram-setting.js), accesa di default e accanto ai
// Dettagli video nelle Impostazioni.
// v48: aggiunto js/engine/duel-sandbox.js, che mancava dall'app shell
// pur essendo caricato da duelMonstersCore.html — chi aveva già la v47
// in cache deve riscaricare, o offline resterebbe con la lista vecchia.
// (v49-v54: bump fatti senza lasciare una nota qui. Non li ricostruisco a
// posteriori inventandomeli: sono stati incrementi di routine per far
// ripopolare la cache dopo modifiche a file già presenti nell'app shell,
// non aggiunte di file nuovi. Da qui in avanti la nota si scrive.)
// v55: i menu non scorrono più in orizzontale — la stella del logo
// (`.menu-logo-eyecatch`, index.html) pulsando allargava la propria
// scatola oltre il bordo dello schermo.
// v56: Modalità Storia arricchita — descrizione per ogni capitolo e
// cinque scene nuove nel capitolo dei Cinque Maghi Guerrieri. Nessun file
// nuovo: cambiano solo storia.html, js/data/story-campaigns.js e
// js/story/story-progress.js, già tutti nell'app shell.
// v57: le scene della Storia diventano intermezzi a dialoghi (storia.html
// carica ora js/ui/story-cutscene.* e js/ui/video-quality.js, già
// nell'app shell perché usati da index.html e dai tornei), e arrivano
// diciannove ritratti PROVVISORI in images/characters/. Quelli sono
// MEDIA, quindi cache-first: il bump serve perché chi aveva già in cache
// un 404 a quei percorsi non se lo porti dietro.
// v58: zoom sulla mappa a nodi (js/ui/node-map.*), mappa alta quanto lo
// schermo e informazioni sulla campagna pieghevoli su telefono
// (storia.html). Nessun file nuovo.
// v59: lo zoom non scende più sotto il punto in cui la mappa smette di
// riempire lo schermo, e si riadatta alla rotazione. Nessun file nuovo.
// v60: Storia — ritorno alla mappa della campagna a fine duello, tappe
// rigiocabili, conferma prima di ricominciare. Nessun file nuovo.
// v73: revamp delle Sfide. js/data/missions-db.js e' un file nuovo da
// aggiungere all'app shell; sfide.html carica ora anche server-date.js e
// story-campaigns.js.
// v72: mappa del Castello di Pegasus nel Regno dei Duellanti (immagine
// gia' presente, ora usata anche come mondo della mappa a nodi) e Stelle
// del torneo indipendenti dal portafoglio.
// v71: tolto js/ui/tilt-setting.js (il campo inclinato, rimosso su
// richiesta); portale nella carta sotto l'ologramma, pila della Catena a
// sinistra su schermo largo, bagliore sulla carta che si attiva.
// v70: le due scelte di resa (ologramma, campo inclinato) erano finite
// solo in impostazioni.html e mancavano dalla vista Impostazioni di
// index.html, cioe' dall'unica che si apre dal menu. Il bump serve a far
// ripulire la copia in cache del vecchio index.html: l'app shell e'
// network-first e in teoria non ne avrebbe bisogno, ma un Service Worker
// gia' installato e' esattamente il caso in cui "in teoria" non basta
// (vedi il giro di debug via adb documentato in CLAUDE.md).
// v69: nuova impostazione "Campo inclinato" (js/ui/tilt-setting.js, file
// nuovo da aggiungere all'app shell) e ologrammi piu' grandi su schermo
// largo.
// v68: i tredici ritratti di Forbidden Memories che erano ancora
// segnaposto (i Maghi, Sebek, Neku). Sono MEDIA, cache-first: il bump
// serve perche' chi aveva in cache il monogramma a quegli stessi
// percorsi non se lo porti dietro.
// v67: tabellone del torneo di Memorie Proibite completo (nove incontri
// piu' una scena) e ritratto del protagonista nelle cutscene. Solo dati
// e logica di pagina, nessun file nuovo.
// v66: ritratti storici dei sei comandanti della Grande Guerra e
// bandiera del Regio Esercito (MEDIA, cache-first: il bump serve perche'
// chi aveva in cache i vecchi segnaposto a quegli stessi percorsi non se
// li porti dietro). duelMonstersCore.html carica ora anche
// js/data/story-campaigns.js, per sapere chi sei in una campagna.
// v65: le scene della Storia allungate e dodici tappe della Grande
// Guerra rimesse sul posto giusto (solo dati in
// js/data/story-campaigns.js), piu' il fix alla lista delle storie in
// storia.html. Nessun file nuovo.
// v64: la mappa disegnata della Grande Guerra e i due canti del fronte
// (images/maps/storia_la_grande_guerra_1.jpeg,
// audio/soundtracks/ww1/*.mp3 — tutti MEDIA, cache-first). Il bump serve
// per lo stesso motivo di sempre: chi aveva in cache un 404 a quei
// percorsi, finché non esistevano, se lo porterebbe dietro.
// v63: il torneo della Kaiba Corporation dentro Memorie Proibite, più un
// dialogo prima di ogni duello della campagna. Solo dati e logica di
// pagina (nessun file nuovo da precaricare) — la mappa del tabellone
// (images/maps/storia_torneo_kaiba_1.jpeg) non c'è ancora e ricade sulla
// texture di riserva: il bump serve perché chi avesse in cache il 404 a
// quel percorso non se lo porti dietro quando l'immagine arriverà.
// v62: le tappe di Memorie Proibite posate sui luoghi veri della sua
// mappa. Solo dati (js/data/story-campaigns.js), nessun file nuovo.
// v61: prima mappa disegnata di una campagna (images/maps/, MEDIA e
// quindi cache-first). Le altre campagne puntano già al nome della
// propria, che ancora non esiste: il bump serve perché chi avesse in
// cache un 404 a quei percorsi non se lo porti dietro.
const CACHE_NAME = 'ygo-duel-arena-v73';

// L'intera "app shell": tutte le pagine HTML + tutto il codice JS/CSS che
// le fa funzionare. Leggero (pochi MB in tutto), quindi si può precaricare
// per intero all'installazione — è quello che rende il gioco AVVIABILE
// offline, non solo "un po' più veloce".
const APP_SHELL = [
    './',
    'index.html',
    'admin.html',
    'cartoteca.html',
    'creazione-deck.html',
    'crea-carta.html',
    'duello-libero.html',
    'duello-sandbox.html',
    'impostazioni.html',
    'multiplayer.html',
    'negozio.html',
    'profilo.html',
    'regole.html',
    'sfide.html',
    'storia.html',
    'tornei.html',
    'torneo-regno-duellanti.html',
    'torneo-battle-city.html',
    'torneo-kaiba.html',
    'duelMonstersCore.html',
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
    'js/ui/duel-rps.css',
    'js/ui/topbar.css',
    'js/ui/challenge-banner.css',
    'js/ui/page-loader.css',
    'js/engine/actions.js',
    'js/engine/duel-engine.js',
    'js/engine/game-flow.js',
    'js/engine/card-effects.js',
    'js/engine/card-effects-1.js',
    'js/engine/card-effects-2.js',
    'js/engine/card-effects-3.js',
    'js/engine/card-effects-4.js',
    'js/engine/card-effects-5.js',
    'js/engine/card-effects-6.js',
    'js/engine/card-effects-7.js',
    'js/engine/card-effects-8.js',
    'js/engine/effect-templates.js',
    // Mancava: duelMonstersCore.html lo carica (è quello che allestisce
    // lo stato iniziale del "Duello Demo"), ma non era mai finito qui,
    // quindi offline la pagina del duello si apriva monca. Trovato dal
    // guardrail tests/specs/guardrail-script-delle-pagine.spec.js, al
    // suo primo giro — è esattamente il buco silenzioso per cui esiste.
    'js/engine/duel-sandbox.js',
    'js/ai/ai-controller.js',
    'js/ai/ai-hard.js',
    'js/ai/ai-medium.js',
    'js/ai/ai-shared.js',
    'js/ai/bot.js',
    'js/audio/audio-library.js',
    'js/audio/audio-manager.js',
    'js/audio/sfx.js',
    'js/challenges/challenge-tracker.js',
    'js/story/story-progress.js',
    'js/data/cards-data.generated.js',
    'js/data/cards-db.js',
    'js/data/challenges-db.js',
    'js/data/missions-db.js',
    'js/data/story-campaigns.js',
    'js/data/character-decks.js',
    'js/data/characters-db.js',
    'js/data/custom-cards.js',
    'js/data/custom-taxonomy.js',
    'js/data/starter-structure-decks.js',
    'js/ui/card-renderer.js',
    'js/ui/fx-gsap.js',
    'js/ui/challenge-banner.js',
    'js/ui/duel-cinematics.js',
    'js/ui/duel-rps.js',
    'js/ui/effects.js',
    'js/ui/error-recovery.js',
    'js/ui/icon-library.js',
    'js/ui/topbar.js',
    'js/ui/node-map.js',
    'js/ui/node-map.css',
    'js/ui/page-loader.js',
    'js/ui/visual-effects-library.js',
    'js/multiplayer/mp-lobby.js',
    'js/multiplayer/multiplayer.js',
    'js/multiplayer/network.js',
    'js/cloud/auth-gate.js',
    'js/cloud/cloud-autosync.js',
    'js/cloud/cloud-sync.js',
    'js/cloud/supabase-config.js',
    'js/native/app-back-button.js',
    'js/native/haptics.js',
    'js/native/keep-awake.js',
    'js/native/native-save-backup.js',
    'js/duel-session.js',
    'js/pwa-register.js',
    'js/save-manager.js',
    // Economia e Negozio
    'js/cloud/server-date.js',
    'js/data/card-rarity.js',
    'js/economy/rewards.js',
    'js/economy/rewards.css',
    'js/economy/shop-catalog.js',
    'js/economy/shop-ui.js',
    'js/economy/shop.css',
    'js/ui/deck-box.js',
    'js/ui/deck-box.css',
    'js/ui/mp-lobby.css',
    'js/ui/duel-setup.js',
    'js/ui/duel-setup.css',
    'js/ui/deck-switcher.js',
    'js/ui/deck-switcher.css',
    'js/ui/video-quality.js',
    'js/ui/onboarding.js',
    'js/ui/onboarding.css',
    'js/ui/story-cutscene.js',
    'js/ui/story-cutscene.css',
    'js/data/tournament-dialogues.js',
    'js/ui/field-ambience.js',
    'js/ui/field-ambience.css',
    'js/ui/monster-hologram.js',
    'js/ui/monster-hologram.css',
    'js/ui/hologram-setting.js',
    'js/data/arena-options.js',
    'js/data/card-origins.generated.js',
    'js/data/deck-legality.js',
    'js/ui/card-detail.js',
    'js/ui/card-detail.css',
    'js/version.js',
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
            // cache: 'reload' su ogni richiesta per lo stesso motivo per cui
            // lo usa la strategia network-first più sotto: queste fetch le
            // fa il Service Worker, quindi NON passano dal proprio handler e
            // userebbero la cache HTTP del browser — una cache appena creata
            // si riempirebbe di copie vecchie fino a qualche minuto, e
            // basta che UNO dei file sia indietro rispetto all'.html che lo
            // usa perché la pagina si apra con un errore (visto davvero su
            // telefono: "getCardTerms is not defined", .html nuovo e
            // cards-db.js vecchio).
            .then((cache) => cache.addAll(APP_SHELL.map((url) => new Request(url, { cache: 'reload' }))))
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
            // cache: 'reload' forza il bypass della cache HTTP del BROWSER
            // (quella governata dagli header Cache-Control del server, uno
            // strato SOTTO la Cache Storage di questo Service Worker):
            // senza, un fetch() "network-first" può comunque tornare una
            // risposta stantia se il browser la considera ancora valida
            // per i suoi header (GitHub Pages ne manda con qualche minuto
            // di validità) — proprio il caso che questa strategia vuole
            // escludere, un aggiornamento appena pubblicato deve arrivare
            // SEMPRE al prossimo avvio online, non "quando scade la cache
            // HTTP".
            fetch(req, { cache: 'reload' })
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





