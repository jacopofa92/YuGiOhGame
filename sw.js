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
// v105: nuove immagini per 9 campi esistenti (anticoEgittoPiazzaGiorno/
// Notte, anticoEgittoTempio/Oscuro, arenaAnticoEgittoGiorno/Notte,
// torreDeiDuelli/Colosseo/Shadow) e 3 campi nuovi aggiunti al catalogo
// (campoAcquatico, campoForesta, campoMontagna — js/data/arena-options.js).
// v104: seconda versione dell'immagine del campo Mondo Virtuale - Arena
// di Gozaburo (l'utente l'ha ricambiata, stesso nome di file).
// v103: nuova immagine del campo Mondo Virtuale - Arena di Gozaburo
// (stesso nome di file).
// v102: nuova immagine del campo Dirigibile KaibaCorp (stesso nome di
// file). Le immagini sono cache-first: senza questo bump chi l'aveva già
// in cache continuerebbe a vedere la vecchia.
// v111: revamp della mappa di Battle City e bump esplicito della cache
// PWA/WebView, così l'APK non conserva il vecchio citta.jpg cache-first.
// Include inoltre i balloon dei dialoghi duello nell'app shell offline.
// v110: un nodo della Storia senza campo/musica propri eredita quelli del
// suo capitolo (js/story/story-progress.js, js/data/story-campaigns.js —
// entrambi già nell'app shell). Solo logica, nessun file nuovo.
// v109: nuovo campo Industria KaibaCorp (images/fields/ e fields/mobile/,
// js/data/arena-options.js). Il bump serve perché chi non l'avesse mai
// richiesto prima non trovi un 404 in cache al primo utilizzo.
// v108: ritratti veri per Noah Kaiba, Gozaburo Kaiba e i Big Five
// (Gansley/Johnson/Nesbitt/Crump/Lector) — prima ricadevano tutti sul
// sigillo dorato di ripiego, nessuna immagine esisteva ancora a questi
// nomi di file.
// v107: ritratti veri per Cadorna e Diaz (stesso nome di file, sostituiscono
// i segnaposto).
// v106: Editor Mappa: campo/musica per nodo, scrittura diretta su
// story-campaigns.js (js/dev/story-map-editor.js, solo amministratori).
// v101: Cadorna e Diaz protagonisti della Grande Guerra (story-campaigns.js,
// story-progress.js, storia.html; ritratti nuovi in images/characters/,
// MEDIA e quindi cache-first, nessuna voce da aggiungere qui).
// v100: tolti cinque campi (Dirigibile di Kaiba, Dirigibile KaibaCorp II,
// Arena Kaiba 1 e 2, Castello di Pegasus): chi li avesse in cache se li
// porterebbe dietro, e il campo di default del duello è cambiato.
// v99: Battle City a 1 Carta Locazione, Sfide dei livelli della Storia
// (storia.html carica ora il tracker), otherHandCards in card-effects.js.
// Nessun file nuovo.
// v98: statistiche del Profilo (js/ui/profile-stats.js/.css, nuovi
// nell'APP_SHELL), menu della Storia rinnovato, campo della tappa letto
// per nome di file in duelMonstersCore.html.
// v97: topbar rinnovata (js/ui/topbar.js/.css, già nell'APP_SHELL) e
// prezzi dei mazzi alzati (js/economy/shop-catalog.js). Nessun file nuovo.
// v96: la schermata Sfide diventa un componente condiviso
// (js/ui/sfide-view.js/.css, nuovi nell'APP_SHELL) montato sia da
// sfide.html sia dalla vista Sfide del menu; il Profilo del menu non
// chiede più quale salvataggio tenere (index.html).
// v95: logo nuovo (js/ui/game-logo.js/.css, nuovi nell'APP_SHELL) e
// splash d'apertura rifatto in index.html.
// v94: livelli della Storia (story-progress.js, storia.html, rewards.js,
// duel-session.js, story-campaigns.js, challenges-db.js, test-shortcuts.js).
// v93: node-map.js (mondo grande quanto il disegno), storia.html
// (rilettura delle scene, sfondo delle scene d'area), monster-hologram.js,
// duel-cinematics.css (fascia dietro "Continua").
// v92: Storia — il castello diventa la seconda mappa del Regno
// (mappeSuccessive); cambiano storia.html, node-map.js, story-progress.js,
// story-campaigns.js e l'Editor Mappa.
// v91: Storia — area del Castello di Pegasus con la mappa degli interni
// (images/maps/storia_anime_castello_pegasus.jpg); cambiano
// story-campaigns.js, story-progress.js e challenges-db.js.
// v90: Storia — mappa grande a sei isole
// (images/maps/storia_mappa_principale_sei_isole.jpg), il prologo a
// Domino City con la sua mappa (storia_anime_prologo.jpg) e la nuova
// mappa di Freedom (storia_freedom_2.jpg). Cambiano story-campaigns.js,
// story-progress.js e challenges-db.js.
// v89: 25 terreni nuovi (images/fields/ e fields/mobile/, compresi i due
// della Grande Guerra) e le mappe delle cinque aree della Storia anime
// (images/maps/storia_anime_*.jpg). Sono MEDIA, cache-first: il bump
// serve perché chi aveva in cache un 404 a quei percorsi non se lo porti
// dietro.
// v88: i mazzi dei Duellanti rifatti (tre liste per personaggio in
// js/data/character-decks.js). Nessun file nuovo.
// v87: nel Negozio, una carta della rotazione giornaliera sparisce dalla
// vetrina appena comprata (prima si poteva ricomprare più volte nello
// stesso giorno). Nessun file nuovo (shop-catalog.js/shop-ui.js/shop.css
// erano già in app shell) - il bump serve solo a far ripopolare la cache.
// v86: 3 difficolta' (Facile/Normale/Difficile) in Duello Libero e nei
// Tornei, con un mazzo dedicato per personaggio per ognuna
// (js/data/character-decks.js) e Creazione Deck che mostra anche il
// mazzo Facile. Nessun file nuovo (character-decks.js era gia' in app
// shell) - il bump serve solo a far ripopolare la cache con la versione
// nuova, non a introdurre percorsi nuovi.
// v85: images/maps/storia_mappa_principale.jpg rifatta con le 5 isole
// vere della Storia anime (MEDIA, cache-first: il bump serve a farla
// riscaricare), e i 5 nodi della mappa spostati al centro di ogni arena
// (js/data/story-campaigns.js). Nessun file di codice nuovo.
// v84: Starter/Structure Deck piu' cari e piu' progressivi
// (js/economy/shop-catalog.js/rewards.js/shop-ui.js). Nessun file nuovo.
// v83: Sfide (sfide.html) ridisegnata come griglia di riquadri con
// pannello di dettaglio, non più un elenco a righe. Nessun file nuovo.
// v82: la campagna anime torna a cinque aree (solo il percorso vero della
// prima serie — via Il Risveglio dei Draghi e il Gran Premio KC).
// Nessun file nuovo.
// v81: la campagna anime diventa una mappa di sette aree, con la sua
// immagine images/maps/storia_mappa_principale.jpg (MEDIA, cache-first:
// il bump serve a farla scaricare). Nessun file di codice nuovo.
// v80: apertura bustina rifatta (una carta alla volta, niente
// scorrimento), scatola vera per l'acquisto di un mazzo, barra di
// scorrimento nascosta a fine duello. Nessun file nuovo.
// v79: animazioni di spostamento carta (Terreno<->Cimitero, ritorno del
// controllo) e cerimonia di apertura bustina — js/economy/pack-opening.js
// e .css sono file NUOVI da aggiungere all'app shell.
// v78: salvataggio caricato sul cloud mentre si gioca (js/cloud/auto-sync.js,
// file NUOVO da aggiungere all'app shell), reset del profilo, admin con
// valute piene, e l'ora del server presa dalla funzione SQL server_now()
// invece che dall'header HTTP `Date`, che il CORS non espone.
// v77: Duellanti da sbloccare in Duello Libero.
// js/data/character-unlocks.js e' un file nuovo, aggiunto all'app shell.
// v76: l'autowin delle Storie diventa un interruttore del Pannello Admin.
// Nessun file nuovo in cache: js/dev/ resta deliberatamente FUORI
// dall'app shell (vedi guardrail-script-delle-pagine.spec.js).
// v75: schermata di fine duello — pulsante "Continua" non piu' coperto
// dalla fascia sfumata, piu' l'avviso "scorri" quando i premi non ci
// stanno tutti. Nessun file nuovo.
// v74: ologrammi piu' definiti al centro e sfumati sui bordi. Nessun file
// nuovo, ma il bump serve perche' la modifica vive tutta in
// js/ui/monster-hologram.css, che e' gia' in cache.
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
// (images/maps/storia_la_grande_guerra_1.jpg,
// audio/soundtracks/ww1/*.mp3 — tutti MEDIA, cache-first). Il bump serve
// per lo stesso motivo di sempre: chi aveva in cache un 404 a quei
// percorsi, finché non esistevano, se lo porterebbe dietro.
// v63: il torneo della Kaiba Corporation dentro Memorie Proibite, più un
// dialogo prima di ogni duello della campagna. Solo dati e logica di
// pagina (nessun file nuovo da precaricare) — la mappa del tabellone
// (images/maps/storia_torneo_kaiba_1.jpg) non c'è ancora e ricade sulla
// texture di riserva: il bump serve perché chi avesse in cache il 404 a
// quel percorso non se lo porti dietro quando l'immagine arriverà.
// v62: le tappe di Memorie Proibite posate sui luoghi veri della sua
// mappa. Solo dati (js/data/story-campaigns.js), nessun file nuovo.
// v61: prima mappa disegnata di una campagna (images/maps/, MEDIA e
// quindi cache-first). Le altre campagne puntano già al nome della
// propria, che ancora non esiste: il bump serve perché chi avesse in
// cache un 404 a quei percorsi non se lo porti dietro.
// v113: il duello concluso viene rimosso dalla cronologia, cosi' Indietro
// da browser o APK non puo' riaprire la partita precedente.
// v114: nuove cinematiche Rituale/Tornado/Piumino e relativi aggiornamenti
// di motore e stile. Il cambio forza browser e WebView dell'APK a scartare
// le copie precedenti di effects.js/effects.css e dei moduli delle carte.
// v115: nuovo font locale del logo e loader riutilizzabile nelle viste SPA
// Negozio/Cartoteca.
// v116: il carattere decorativo è sostituito da un'iscrizione romana
// geometrica, più vicina all'immaginario monumentale dell'Antico Egitto.
// v117: trattamento del titolo semplificato — niente cornici o rilievi
// metallici multipli, solo oro caldo e ombra morbida.
// v118: Rare Hunter estratti soltanto entrando nel relativo nodo.
// v119: la struttura logica della mappa Battle City torna invisibile; i nodi
// restano persistenti e soltanto il segnalino scorre fra gli isolati.
// v120: pedine 3D in SVG al posto delle emoji sulla mappa di Battle City
// (js/ui/board-pieces.js, nuovo nell'app shell) e percorsi con freccia
// verso le caselle raggiungibili.
// v121: pedine piu' ricche di Battle City (js/ui/board-pieces.js).
// v122: Duellanti ritagliati senza sfondo, solo quelli puliti
// (images/characters/pedine/: Rex, Mako, Espa Roba).
// v123: fallback automatico alla pedina standard se manca il PNG del Duellante.
// v124: PNG trasparenti dei Duellanti in images/characters/pedine/ (id.png).
// v125: Annulla/Esc e modalita' evidente per i Tributi; il bot aspetta i modali aperti.
// v126: PNG delle pedine rinominati col nome del file avatar (dukeDevlin.png).
// v127: pedine ridimensionate (max 320 px); originali in avatarTrasparenza/.
// v128: velocità del bot, schema unico delle scelte, Rare Hunter ritagliato, anti-imbroglio server.
// v129: avatar di Kaiba per contesto (Regno dei Duellanti / Forbidden Memories).
// v130: salvataggi vecchi della Storia anime azzerati invece che migrati.
// v131: ripulite le vecchie migrazioni della Storia anime.
// v132: banda delle scelte (Tributo/scarto/casella) a capo su telefono in verticale.
// v133: ritaglio di Joey per la mappa di Battle City.
// v134: divieti di Evocazione (282/434/1045) e Velocita' del bot nel menu Impostazioni.
// v135: tutte le foto sono .jpg (prima carte e mappe erano .jpeg): i nomi sono cambiati.
const CACHE_NAME = 'ygo-duel-arena-v135';

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
    'js/ui/duel-dialogues.css',
    'js/ui/topbar.css',
    'js/ui/challenge-banner.css',
    'js/ui/page-loader.css',
    'js/ui/game-logo.css',
    'assets/fonts/cinzel/Cinzel-Variable.ttf',
    'assets/fonts/cinzel/OFL.txt',
    'js/ui/sfide-view.css',
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
    'js/data/character-unlocks.js',
    'js/data/custom-cards.js',
    'js/data/custom-taxonomy.js',
    'js/data/starter-structure-decks.js',
    'js/ui/card-renderer.js',
    'js/ui/fx-gsap.js',
    'js/ui/challenge-banner.js',
    'js/ui/duel-cinematics.js',
    'js/ui/duel-rps.js',
    'js/ui/duel-dialogues.js',
    'js/ui/effects.js',
    'js/ui/error-recovery.js',
    'js/ui/icon-library.js',
    'js/ui/board-pieces.js',
    'js/ui/topbar.js',
    'js/ui/node-map.js',
    'js/ui/node-map.css',
    'js/ui/page-loader.js',
    'js/ui/game-logo.js',
    'js/ui/sfide-view.js',
    'js/ui/profile-stats.js',
    'js/ui/profile-stats.css',
    'js/ui/visual-effects-library.js',
    'js/multiplayer/mp-lobby.js',
    'js/multiplayer/multiplayer.js',
    'js/multiplayer/network.js',
    'js/cloud/auth-gate.js',
    'js/cloud/cloud-autosync.js',
    'js/cloud/cloud-sync.js',
    'js/cloud/auto-sync.js',
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
    'js/economy/pack-opening.js',
    'js/economy/pack-opening.css',
    'js/ui/deck-box.js',
    'js/ui/deck-box.css',
    'js/ui/mp-lobby.css',
    'js/ui/duel-setup.js',
    'js/ui/duel-setup.css',
    'js/ui/deck-switcher.js',
    'js/ui/deck-switcher.css',
    'js/ui/video-quality.js',
    'js/ui/bot-speed.js',
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





