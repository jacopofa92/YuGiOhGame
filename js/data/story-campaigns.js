/**
 * story-campaigns.js — Le campagne della Modalità Storia (storia.html).
 * =====================================================================
 * Solo dati. La progressione (dove sei arrivato, cosa è sbloccato, cosa
 * succede quando vinci) vive in js/story/story-progress.js, e il disegno
 * della mappa in js/ui/node-map.js: qui non c'è nessuna logica, come per
 * characters-db.js e challenges-db.js.
 *
 * UNA CAMPAGNA è un elenco ORDINATO di capitoli, e un capitolo un elenco
 * ordinato di TAPPE. Si avanza una tappa alla volta: la successiva si
 * sblocca vincendo quella prima. Niente bivi e niente percorsi generati a
 * caso — quelli sono dei tornei, dove la sorpresa è il punto. Qui la
 * sorpresa sarebbe un difetto: una storia si racconta nell'ordine in cui
 * è scritta.
 *
 * UNA TAPPA è di tre specie:
 *   - `kind: 'duel'`   — un duello. `characterId` (js/data/characters-db.js),
 *     `difficulty` ('Medio' | 'Difficile'), e facoltativamente `field` e
 *     `music` per l'ambientazione.
 *   - `kind: 'scene'`  — una schermata di racconto, nessun duello: `testo`
 *     (una o più righe) e facoltativamente `chi` (chi parla). Serve a dare
 *     respiro fra un duello e l'altro e a spiegare perché si sta
 *     duellando, che è l'unica cosa che distingue una Storia da una fila
 *     di Duelli Liberi.
 *   - `kind: 'torneo'` — una tappa che è a sua volta un PERCORSO: ha una
 *     mappa propria (`mappa: { sfondo, larghezza, altezza }`) e un proprio
 *     elenco di `tappe`. Ci si entra cliccandola, si sale un incontro alla
 *     volta e CHI PERDE RICOMINCIA DAL PRIMO — la regola che dà peso a un
 *     torneo, e che nella campagna non vale (lì perdere costa solo il
 *     tempo di riprovare). Vinto l'ultimo incontro si torna sulla mappa
 *     della campagna, che avanza di quella sola tappa. L'avanzamento sta
 *     in `sotto` dentro il salvataggio della campagna, vedi
 *     js/story/story-progress.js.
 *
 * `dialogo` (facoltativo, su una tappa di DUELLO) è la conversazione che
 * precede l'incontro: un elenco di battute nella stessa forma degli
 * intermezzi (`{ chi: <id del roster>, testo }`, oppure `{ nome, icona,
 * testo }` per una voce che nel roster non c'è). Serve perché arrivare
 * davanti a un avversario e trovarsi dentro un duello senza che nessuno
 * abbia detto una parola fa sembrare la Storia un elenco di partite; due
 * righe in carattere bastano a ricordare chi si ha davanti e perché.
 *
 * `sfondo` è l'immagine della mappa, e può essere un ELENCO di candidati
 * in ordine di preferenza: si usa il primo che esiste davvero.
 *
 * Ogni campagna dichiara come PRIMO candidato la sua mappa disegnata,
 * `images/maps/storia_<id della campagna>_1.jpeg`, e come secondo
 * l'immagine presa in prestito da un'arena, che è il ripiego finché
 * quella mappa non c'è:
 *
 *     sfondo: ['images/maps/storia_ww2_1.jpeg', 'images/fields/mobile/rovine_2.jpg']
 *
 * IL GIORNO IN CUI QUEL FILE VIENE MESSO NELLA CARTELLA, la mappa lo usa
 * da sola — nessuna riga di codice da toccare, nessun elenco da
 * aggiornare. Una mappa arrivata con un nome diverso da quello canonico
 * si mette semplicemente davanti agli altri candidati (è il caso della
 * Grande Guerra), invece di rinominare il file: l'elenco esiste apposta.
 * Oggi hanno la loro mappa Freedom, Memorie Proibite e la Grande Guerra;
 * le altre aspettano lì col loro nome già pronto.
 *
 * Lo stesso vale per i RITRATTI: un personaggio si aspetta
 * `images/characters/<id>.jpg`, e quelli che oggi sono segnaposto
 * generati (monogramma su pietra) si sostituiscono sovrascrivendo il
 * file con lo stesso nome.
 *
 * `x` e `y` sono la posizione della tappa sulla mappa, in px dentro il
 * mondo della campagna (`larghezza`/`altezza`). Sono scritti a mano, non
 * calcolati: un sentiero disegnato a mano racconta qualcosa (si sale
 * verso il castello, si torna indietro), una fila di pallini equidistanti
 * no.
 *
 * QUANDO LA CAMPAGNA HA LA SUA MAPPA DISEGNATA, le tappe si posano sui
 * LUOGHI VERI dell'immagine: il palazzo dove c'è il palazzo, il mago del
 * bosco nel bosco, il mare dov'è disegnato il mare. È la differenza fra
 * una mappa e uno sfondo — e si vede subito, perché il percorso smette di
 * essere una serpentina appoggiata sopra un disegno e diventa un viaggio
 * attraverso quel disegno. Memorie Proibite e la Grande Guerra sono
 * fatte così; per le altre vale quando arriva la loro mappa.
 *
 * Sulla Grande Guerra l'ancoraggio porta con sé anche l'ORDINE: i
 * capitoli seguono i fatti come successero all'esercito italiano
 * (Isonzo 1915, Strafexpedition 1916, Gorizia e la Bainsizza, Caporetto,
 * il Solstizio, Vittorio Veneto), e ogni tappa sta dove quel fatto
 * avvenne. Quando i due criteri esistono entrambi — la geografia e la
 * cronologia — è la cronologia a decidere in che ordine si gioca, la
 * geografia dove si clicca.
 *
 * Due conseguenze pratiche, entrambe volute:
 *   - DUE TAPPE POSSONO STARE VICINE, anche di capitoli diversi, se la
 *     storia ripassa dalle stesse parti (il palazzo nel primo capitolo e
 *     di nuovo nella Caduta, la fortezza oscura negli ultimi due). È la
 *     mappa a dettare dove si va, non una griglia;
 *   - il mondo deve avere lo STESSO RAPPORTO dell'immagine, altrimenti
 *     stenderla la deforma. Quando è arrivata la mappa di Memorie
 *     Proibite (16:9) il mondo era 1500x3400: è stato rifatto a
 *     3200x1800 e le tappe riposizionate. Conviene quindi partire
 *     dall'arte e disporci sopra le tappe, non il contrario.
 *
 * `avatar` su una TAPPA ({ idPersonaggio: 'percorso/immagine' }) cambia
 * l'aspetto di un personaggio solo lì: nella schermata e nei dialoghi del
 * duello e nelle battute della scena. Serve quando lo stesso personaggio ha
 * più versioni nel corso della storia (Kaiba nel Regno dei Duellanti non è
 * quello di Battle City). Senza, vale il ritratto del roster. Per i tornei
 * a sé lo stesso si dichiara in CHARACTER_IMAGE_VARIANTS (characters-db.js).
 *
 * `protagonista` è CHI SEI in quella campagna: nome e ritratto che
 * prendono il posto dei tuoi nel duello, nella cinematica di presentazione
 * e nella schermata finale. Serve perché in una storia non si gioca come
 * sé stessi — nel Regno delle Ombre sei Yami Yugi, in Memorie Proibite sei
 * Atem (il nome vero del Faraone, che nel gioco originale resta il
 * "Principe" solo perché l'ha dimenticato), in Freedom sei Giacobbo, e
 * nella Grande Guerra non sei una persona ma il Regio Esercito, che infatti
 * ha una bandiera al posto della faccia.
 *
 *     protagonista: { name: 'Atem', title: 'Il Faraone senza nome',
 *                     image: 'images/characters/yamiYugi.jpg', icon: '👑' }
 *
 * Facoltativo: una campagna che non lo dichiara lascia al giocatore il
 * proprio nome e il proprio ritratto, com'è sempre stato. Il campo lo legge
 * js/duel-session.js, che carica questo stesso file — una sola fonte, così
 * non si può disallineare da quello che la mappa mostra.
 *
 * Lo stesso campo si può mettere su un CAPITOLO, e lì vince su quello
 * della campagna per tutte le sue tappe. Serve quando dentro una sola
 * storia si cambia panni: in Memorie Proibite sei Atem per tutta la
 * campagna, ma nel capitolo del presente sei Yugi Muto — il Faraone è
 * chiuso nel Puzzle, e a duellare nel torneo è il ragazzo che l'ha
 * rimesso insieme.
 *
 * `musica` e `musicaDuello` sono la colonna sonora della campagna: la
 * prima suona sulla sua mappa (storia.html la mette con
 * DuelMusic.setTrack appena la campagna si apre, e rimette quella del
 * menu appena si torna all'elenco), la seconda accompagna OGNI duello
 * della campagna. Sono percorsi relativi a `audio/soundtracks/`, anche
 * dentro una sottocartella ('ww1/La carica del Piave.mp3'). Entrambe
 * facoltative: una campagna che non le dichiara suona come ha sempre
 * suonato il resto del gioco.
 *
 * `field`/`music` (STESSE chiavi) si possono mettere anche su un
 * CAPITOLO, e lì un nodo che non li dichiara eredita quelli del suo
 * capitolo — esattamente come `protagonista` qui sopra. Vince sempre
 * l'ordine tappa → capitolo → campagna (`music` di tappa/capitolo batte
 * `musicaDuello`, `field` di tappa/capitolo batte `campoDuello`).
 * Serve soprattutto quando un capitolo È un'intera area/macromappa (un
 * capitolo per area nella campagna 'anime', vedi il commento su
 * `capitoli` più sotto): basta scrivere `music` UNA volta sul capitolo
 * perché OGNI nodo di quell'area — inclusi quelli dentro le sue prove/
 * tappe annidate — la eredati, senza ripeterla su ciascuno. Risolto in
 * un punto solo (StoryProgress.getTappe/getProveConStato), mai da
 * ricalcolare altrove.
 *
 * `campoDuello` è l'arena di ogni duello della campagna che non ne
 * dichiara una propria (né la tappa né il suo capitolo). Può essere un
 * elenco: la tappa ne riceve una scelta in modo stabile dal suo id, così
 * rigiocandola si ritrova la stessa arena. Facoltativo.
 *
 * LIVELLI. Ogni campagna si gioca a Facile, Normale e Difficile, ognuno
 * col suo avanzamento, e la difficoltà di ogni duello è quella del
 * livello — il `difficulty` scritto sulle tappe allora NON conta (vedi
 * LIVELLI in js/story/story-progress.js). `senzaLivelli: true` spegne
 * tutto questo: una partita sola, e ogni duello alla difficoltà della sua
 * tappa. Serve alle campagne i cui mazzi non hanno tre versioni.
 *
 * `carteAmmesse` dice con QUALI carte si può giocare quella campagna:
 *   { origini: ['yu-gi-oh'] }                  solo carte Yu-Gi-Oh
 *   { origini: ['yu-gi-oh', 'fanmade'] }       anche le fanmade
 *   { origini: ['ww1'], fazione: 'italiana' }  solo il set WW1, e di un
 *                                              solo schieramento
 * Le origini sono quelle di CARD_ORIGIN_LABELS (js/data/cards-db.js); la
 * `fazione` è il campo aggiunto alle carte WW1, che distingue l'esercito
 * italiano da quello austro-ungarico. Serve perché una campagna
 * raccontata da una parte non si gioca con le carte dell'altra: al
 * Piave non si schierano i Kaiserjäger.
 *
 * Il controllo vero sta in StoryProgress.carteNonAmmesse (un punto solo,
 * js/story/story-progress.js), e la pagina lo usa per non far partire un
 * duello con un mazzo che quella campagna non accetta — dicendo quali
 * carte sono di troppo, non solo che "non si può".
 *
 * `chiId` su una scena aggancia chi parla a un personaggio del roster e
 * gli mette la faccia. È facoltativo apposta: molte voci non sono
 * nessuno in particolare ("La troupe", "Il Bollettino", "Il Comando
 * Supremo") e devono restare senza.
 *
 * AGGIUNGERE UNA CAMPAGNA non richiede di toccare nient'altro: basta una
 * voce in questo elenco. Una campagna con `capitoli: []` viene mostrata
 * bloccata con la sua descrizione — dichiararla e non poterla ancora
 * giocare è più onesto che far finta che non esista, ed è lo stato in
 * cui si trova oggi la sola Seconda Guerra Mondiale.
 */

/**
 * I due comandanti della Grande Guerra, protagonisti della campagna nella
 * successione storica: Luigi Cadorna fino all'8 novembre 1917, Armando
 * Diaz dal 9 novembre (dopo Caporetto) alla vittoria. Richiesta
 * dell'utente: si vede Cadorna, poi Diaz con l'avanzare della storia.
 *
 * NON sono Duellanti: non stanno in js/data/characters-db.js, quindi non
 * si affrontano mai e non compaiono in Duello Libero — sono solo il volto
 * di chi gioca. Definiti qui una volta sola perché la campagna li usa in
 * più punti (campagna, capitoli, la tappa del passaggio di comando).
 * I ritratti sono due fotografie storiche vere, di pubblico dominio
 * (Wikimedia Commons: "Luigi Cadorna 02.jpg", 1917, e "Armando Diaz
 * 01.jpg" di Mario Nunes Vais, ante 1929 — entrambe segnalate come
 * libere da restrizioni di copyright), ritagliate a quadrato 512×512
 * sullo stesso taglio busto/spalle degli altri ritratti del roster.
 */
const WW1_COMANDANTI = {
    cadorna: { name: 'Luigi Cadorna', title: 'Capo di Stato Maggiore, 1914-1917', image: 'images/characters/ww1_cadorna.jpg', icon: '🇮🇹' },
    diaz: { name: 'Armando Diaz', title: 'Capo di Stato Maggiore, 1917-1918', image: 'images/characters/ww1_diaz.jpg', icon: '🇮🇹' }
};

const storyCampaignsDatabase = [
    {
        id: 'anime',
        nome: 'Il Regno delle Ombre',
        sottotitolo: 'La storia di Yugi Muto',
        icona: '🧩',
        // La MAPPA DELLE MAPPE: sei isole sospese, una per area, collegate
        // da frecce nello stesso ordine della storia — Domino City, il
        // Castello di Pegasus, Battle City, il Mondo Virtuale, di nuovo
        // Battle City, l'Egitto. Ogni nodo sta sulla SUA isola. Il castello
        // non ha un nodo suo: è la seconda mappa DENTRO il Regno.
        //
        // La vecchia mappa a cinque isole (`storia_mappa_principale.jpeg`)
        // NON è più fra i candidati, e non per dimenticanza: ha un altro
        // rapporto (1672x940 contro 1942x809), quindi se questa mancasse
        // e ricadesse su quella, i nodi posati per sei isole finirebbero
        // in mezzo al mare. Meglio l'arena generica qui sotto, che almeno
        // non finge di essere la mappa giusta.
        sfondo: [
            'images/maps/storia_mappa_principale_sei_isole.jpeg',
            'images/fields/mobile/rovine_1.jpg'
        ],
        musica: 'mainTheme.mp3',
        // A duellare non è Yugi: è l'altro, quello che si sveglia quando il
        // Puzzle è al collo. È tutto il punto della serie.
        protagonista: { name: 'Yami Yugi', title: 'Il Re dei Giochi', image: 'images/characters/yamiYugi.jpg', icon: '🧩' },
        descrizione: 'Dal giorno in cui Yugi completa il Puzzle del Millennio fino al Duello Cerimoniale: il Regno dei Duellanti, Battle City e tutto quello che c\'è in mezzo.',
        // Solo Yu-Gi-Oh: e' la storia del gioco vero, e un Bersagliere
        // in mezzo al Regno dei Duellanti la spezzerebbe.
        carteAmmesse: { origini: ['yu-gi-oh'] },
        // Il mondo ha le STESSE misure della mappa a sei isole (1942x809),
        // così le coordinate dei nodi sono pixel del disegno: stendere
        // un'arte panoramica su un mondo di altro rapporto la deformerebbe.
        // Vedi il commento sul rapporto in cima a questo file.
        larghezza: 1942,
        altezza: 809,
        // =============================================================
        // CINQUE AREE — SOLO LA PRIMA SERIE ORIGINALE
        // =============================================================
        // Richiesta esplicita dell'utente, dopo un primo giro a sette
        // aree: la Storia segue fedelmente SOLO il percorso della prima
        // serie animata — Il Regno dei Duellanti, Battle City Parte 1,
        // Il Mondo Virtuale (Noah, Gozaburo e i Big Five), Battle City
        // Parte 2, e il viaggio nel passato per la battaglia finale.
        // TOLTI rispetto al giro precedente: Il Risveglio dei Draghi
        // (Dartz/Orichalcos) e il Gran Premio KC (Zigfried/Leon) — pur
        // essendo andati in onda nella stessa serie giapponese, non sono
        // nell'elenco che l'utente ha chiesto, quindi restano fuori. I
        // sei personaggi che esistevano solo per quei due archi sono
        // stati tolti anche dal roster (vedi characters-db.js): senza
        // nessuna Storia/Torneo che li renda più sbloccabili sarebbero
        // rimasti bloccati per sempre in Duello Libero.
        //
        // Prima dei cinque archi c'è il PROLOGO a Domino City (il negozio
        // del nonno, la scuola, la torre della KaibaCorp): la prima isola
        // della mappa. Le sue prime cinque tappe stavano in testa al Regno
        // dei Duellanti — vedi `separazioni` qui sotto per come si porta
        // dietro il progresso di chi le aveva già giocate lì.
        //
        // Sono `kind: 'area'`, non `kind: 'torneo'`: stessa forma (mappa
        // propria + tappe proprie), ma senza la regola del torneo per cui
        // chi perde ricomincia dal primo incontro. Rispedire indietro di
        // dieci duelli chi ne perde uno trasformerebbe una storia in una
        // punizione — vedi SOTTOPERCORSI in js/story/story-progress.js.
        //
        // Ogni area dichiara la propria mappa col nome canonico
        // `images/maps/storia_anime_<area>.jpeg`. Le cinque mappe sono
        // arrivate tutte insieme: il mondo di ogni area è stato portato alle
        // proporzioni del suo disegno (16:9 per Regno e Battle City, 3:2 per
        // Mondo Virtuale e Mondo dei Ricordi) e le tappe spostate IN
        // PROPORZIONE, così nessun disegno si deforma. In ogni area le
        // tappe stanno sui luoghi veri del disegno (ritoccabili a mano
        // dall'Editor Mappa). Battle
        // City ha due mappe DISTINTE (`_battlecity1`/`_battlecity2`),
        // perché la città vista prima e dopo il Mondo Virtuale è
        // narrativamente lo stesso posto ma un momento diverso della
        // storia — due arte diverse quando arriveranno, non un file
        // condiviso.
        //
        // Un capitolo per area, così la striscia dei capitoli in alto è
        // lo specchio dei nodi della mappa grande.
        capitoli: [
            {
                id: 'prologo',
                nome: 'Prologo: Domino City',
                testo: 'Il negozio del nonno, i banchi di scuola e una torre di vetro sul mare: tutto comincia a casa.',
                music: '02. Input Name.mp3',
                tappe: [
                    {
                        id: 'anime-area-prologo', kind: 'area', icona: '🧩',
                        label: 'Domino City', x: 190, y: 360,
                        nome: 'Prologo: Domino City',
                        testo: 'Otto anni su un puzzle, tre amici da convincere, e un Drago Bianco che Kaiba non doveva toccare.',
                        mappa: { sfondo: ['images/maps/storia_anime_prologo.jpeg'], larghezza: 1672, altezza: 940 },
                        // Le PRIME CINQUE tappe qui sotto stavano in testa
                        // al Regno dei Duellanti prima che il prologo avesse
                        // un'isola sua: vedi `separazioni` in fondo alla
                        // campagna. Le tappe nate col prologo (la KaibaCorp)
                        // vanno sempre DOPO quelle cinque, mai in mezzo — è
                        // su quell'ordine che conta la migrazione.
                        //
                        // Ogni nodo sta su un luogo vero del disegno: il
                        // negozio di giochi con la tenda verde, la scuola
                        // col suo campo, il centro, il parco col laghetto,
                        // la sopraelevata e la torre della KaibaCorp.
                        tappe: [
                            {
                                id: 'anime-1-scena', kind: 'scene', icona: '🧩',
                                label: 'Otto anni dopo', x: 138, y: 600,
                                chi: 'Solomon Muto', chiId: 'solomonMuto',
                                testo: [
                                    'Ci hai messo otto anni, Yugi. Otto anni su quel puzzle.',
                                    'Me l\'hanno portato da uno scavo quando ero poco più vecchio di te, e nessuno l\'aveva mai finito. Nemmeno io ci ho provato davvero: mi bastava guardarlo.',
                                    'Dicono che chi lo completa riceva un dono. Io dico che chi lo completa ha già dimostrato tutto quello che serve.',
                                    'E adesso che l\'hai al collo, guardati bene allo specchio ogni tanto. Non si porta un oggetto così senza che lui porti qualcosa a te.',
                                    'Vieni: ti insegno a giocare davvero.'
                                ]
                            },
                            {
                                id: 'anime-1-allenamento-solomon', kind: 'duel', icona: '🎴',
                                label: 'Allenamento con il nonno', x: 198, y: 535,
                                parallelo: true, sbloccaDopo: 'anime-1-scena',
                                characterId: 'solomonMuto', difficulty: 'Facile',
                                protagonista: { name: 'Yugi Muto', title: 'Il ragazzo del Puzzle', image: 'images/characters/yugiMuto.jpg', icon: '🧩' },
                                field: 'images/fields/mobile/citta.jpg',
                                music: '07. Preliminary Face-Off.mp3',
                                dialogo: [
                                    { chi: 'solomonMuto', testo: 'Hai completato il Puzzle, ma prima di pensare ai misteri vediamo quanto ricordi di Duel Monsters.' },
                                    { io: true, testo: 'Va bene, nonno. Sarà soltanto un allenamento, ma proverò comunque a sorprenderti.' }
                                ]
                            },
                            {
                                id: 'anime-1-nonno', kind: 'scene', icona: '🎴',
                                label: 'Le regole del nonno', x: 262, y: 478,
                                chi: 'Solomon Muto', chiId: 'solomonMuto',
                                testo: [
                                    'Nel mio negozio non vendiamo soltanto carte, Yugi. Ogni carta conserva la storia di chi l’ha scelta e di chi l’ha giocata.',
                                    'Ti ho insegnato le regole di Duel Monsters, ma il rispetto per l’avversario non è scritto su nessun manuale.',
                                    'Joey vuole imparare. Non prenderlo in giro se sbaglia: aiutalo a costruire un mazzo che gli somigli.',
                                    'E ricorda il Drago Bianco Occhi Blu nella teca. Me lo affidò un amico; per questo non avrà mai un prezzo.'
                                ]
                            },
                            {
                                id: 'anime-1-joey', kind: 'scene', icona: '🎲',
                                label: 'Un nuovo amico', x: 250, y: 262,
                                chi: 'Joey Wheeler', chiId: 'joey',
                                testo: [
                                    'All’inizio ho preso in giro il Puzzle e ne ho gettato un pezzo nel canale. Non meritavo che Yugi mi chiamasse amico.',
                                    'Quando Ushio lo ha picchiato per colpa nostra, Yugi ha difeso me e Tristan senza chiedere niente in cambio.',
                                    'Ho recuperato il pezzo del Puzzle dall’acqua e suo nonno glielo ha restituito senza dirgli chi fosse stato.',
                                    'Adesso voglio imparare Duel Monsters. Se Yugi può credere in me, posso almeno provare a diventare un duellante vero.'
                                ]
                            },
                            {
                                id: 'anime-1-amichevole-joey', kind: 'duel', icona: '🎲',
                                label: 'Amichevole con Joey', x: 325, y: 245,
                                parallelo: true, sbloccaDopo: 'anime-1-joey',
                                characterId: 'joey', difficulty: 'Facile',
                                protagonista: { name: 'Yugi Muto', title: 'Il ragazzo del Puzzle', image: 'images/characters/yugiMuto.jpg', icon: '🧩' },
                                field: 'images/fields/mobile/citta.jpg',
                                music: '07. Preliminary Face-Off.mp3',
                                dialogo: [
                                    { chi: 'joey', testo: 'Conosco appena le regole, ma non imparerò mai se continuo soltanto a guardare. Facciamo un duello, Yugi.' },
                                    { io: true, testo: 'Cominciamo con calma. Ti spiegherò le mosse, ma non sceglierò le carte al posto tuo.' }
                                ]
                            },
                            {
                                id: 'anime-1-amichevole-tristan', kind: 'duel', icona: '🔧',
                                label: 'Amichevole con Tristan', x: 405, y: 270,
                                parallelo: true, sbloccaDopo: 'anime-1-amichevole-joey',
                                characterId: 'tristan', difficulty: 'Facile',
                                protagonista: { name: 'Yugi Muto', title: 'Il ragazzo del Puzzle', image: 'images/characters/yugiMuto.jpg', icon: '🧩' },
                                field: 'images/fields/mobile/citta.jpg',
                                music: '07. Preliminary Face-Off.mp3',
                                dialogo: [
                                    { chi: 'tristan', testo: 'Se Joey può imparare, posso riuscirci anch’io. Però niente strategie incomprensibili al primo turno.' },
                                    { io: true, testo: 'Ti mostrerò come costruire una combinazione semplice. Poi starà a te capire quando usarla.' }
                                ]
                            },
                            {
                                id: 'anime-1-amichevole-tea', kind: 'duel', icona: '💫',
                                label: 'Amichevole con Téa', x: 475, y: 310,
                                parallelo: true, sbloccaDopo: 'anime-1-amichevole-tristan',
                                characterId: 'tea', difficulty: 'Facile',
                                protagonista: { name: 'Yugi Muto', title: 'Il ragazzo del Puzzle', image: 'images/characters/yugiMuto.jpg', icon: '🧩' },
                                field: 'images/fields/mobile/citta.jpg',
                                music: '07. Preliminary Face-Off.mp3',
                                dialogo: [
                                    { chi: 'tea', testo: 'Non pensare che abbia accettato soltanto per fare numero. Le mie fate possono ancora sorprenderti.' },
                                    { io: true, testo: 'Non ti sottovaluterò. Un duello amichevole funziona soltanto se entrambi giochiamo seriamente.' }
                                ]
                            },
                            {
                                id: 'anime-1-tristan', kind: 'scene', icona: '🔧',
                                label: 'Il gruppo', x: 540, y: 352,
                                chi: 'Tristan Taylor', chiId: 'tristan',
                                testo: [
                                    'Joey è quello che vuole diventare un duellante. Io preferisco assicurarmi che non finisca nei guai mentre ci prova.',
                                    'Yugi ci ha perdonati quando avrebbe avuto ogni motivo per lasciarci perdere. Da quel giorno, se parte lui partiamo tutti.',
                                    'Téa conosce Yugi da più tempo di noi e capisce subito quando il Puzzle cambia qualcosa nel suo sguardo.',
                                    'Non sappiamo ancora chi sia l’altro Yugi. Sappiamo soltanto che è dalla nostra parte.'
                                ]
                            },
                            {
                                id: 'anime-1-tea', kind: 'scene', icona: '💫',
                                label: 'L’altro Yugi', x: 655, y: 592,
                                chi: 'Téa Gardner', chiId: 'tea',
                                testo: [
                                    'Da quando hai completato il Puzzle, a volte la tua voce cambia e sembri più alto, più sicuro. Poi torni a essere il Yugi che conosco.',
                                    'Non credo che quella presenza voglia farti del male. Quando i tuoi amici sono in pericolo, compare per proteggerli.',
                                    'Prima o poi dovrete capire chi è e perché si trovava nel Puzzle.',
                                    'Per adesso non devi affrontarlo da solo. Joey, Tristan e io siamo qui.'
                                ]
                            },
                            {
                                id: 'anime-1-regionale-rex', kind: 'duel', icona: '🏆',
                                label: 'Finale regionale: Weevil contro Rex', x: 735, y: 275,
                                parallelo: true, sbloccaDopo: 'anime-1-tea',
                                characterId: 'rex', difficulty: 'Medio',
                                protagonista: { name: 'Weevil Underwood', title: 'Campione regionale', image: 'images/characters/weevilUnderwood.jpg', icon: '🐛' },
                                dialogo: [
                                    { chi: 'rex', testo: 'I tuoi insetti verranno schiacciati dai miei dinosauri. Il titolo regionale è già mio.' },
                                    { io: true, testo: 'La forza non serve quando cade nella mia trappola. Questa finale farà conoscere a tutti il nome di Weevil Underwood.' }
                                ]
                            },
                            // --- La KaibaCorp: il primo duello della serie ---
                            // Nell'anime Kaiba si prende il Drago Bianco
                            // Occhi Blu del nonno battendolo a duello e lo
                            // strappa davanti a lui; Yugi lo sfida nella sua
                            // arena e lo batte con Exodia. È l'episodio 1, e
                            // il prologo senza questo duello non era un
                            // prologo.
                            {
                                id: 'anime-1-quarta-carta', kind: 'scene', icona: '🐉',
                                label: 'La quarta carta', x: 820, y: 420,
                                chi: 'Solomon Muto', chiId: 'solomonMuto',
                                testo: [
                                    'Kaiba ha riconosciuto subito il Drago Bianco Occhi Blu. Mi ha offerto denaro e poi la sua intera valigetta di carte, ma non potevo accettare.',
                                    'Quella carta è il dono di un amico. Non è rara per il suo prezzo: è insostituibile per ciò che ricorda.',
                                    'Gli uomini della KaibaCorp mi hanno portato alla torre e Kaiba mi ha costretto a giocarmela in un duello.',
                                    'Ho perso, Yugi. Adesso il quarto Drago Bianco è nelle sue mani, e Kaiba non intende conservarlo.'
                                ]
                            },
                            {
                                id: 'anime-1-kaiba-scena', kind: 'scene', icona: '🏢',
                                // Kaiba con l'aspetto del Regno dei Duellanti
                                // (vedi `avatar` in cima al file).
                                avatar: { kaiba: 'images/characters/setoKaiba_duelist_Kingdom.png' },
                                label: 'La KaibaCorp', x: 1010, y: 522,
                                chi: 'Seto Kaiba', chiId: 'kaiba',
                                music: '07. Preliminary Face-Off.mp3',
                                testo: [
                                    'Un Drago Bianco Occhi Blu in un negozietto di quartiere. Il vecchio lo teneva in una scatola come un soprammobile, e non me l\'avrebbe venduto a nessun prezzo.',
                                    'Ne esistono quattro al mondo. Tre sono miei. Il quarto non era in vendita, così ho portato qui tuo nonno e l\'ho costretto a giocarselo. Ha perso.',
                                    'E una carta che un giorno potrebbe essere usata contro di me non deve esistere. L\'ho strappata. Nient\'altro da dire.',
                                    'Vuoi rimediare? Sali in cima alla torre. Ti aspetto nella mia arena, con i miei ologrammi e il mio mazzo.'
                                ]
                            },
                            {
                                id: 'anime-1-kaiba', kind: 'duel', icona: '🐉',
                                avatar: { kaiba: 'images/characters/setoKaiba_duelist_Kingdom.png' },
                                label: 'Seto Kaiba', x: 1425, y: 470,
                                characterId: 'kaiba', difficulty: 'Medio',
                                field: 'images/fields/mobile/torreDeiDuelli.jpg',
                                music: '32. Seto Kaiba (Tournament Final) HD.mp3',
                                dialogo: [
                                    { chi: 'kaiba', testo: 'Ho sconfitto tuo nonno e strappato il suo Drago Bianco. Ora i tre esemplari rimasti risponderanno soltanto a me.' },
                                    { io: true, testo: 'Le carte di mio nonno custodiscono il cuore di chi gliele ha affidate. Te lo dimostrerò in questo duello.' }
                                ]
                            },
                            {
                                id: 'anime-1-pegasus-video', kind: 'duel', icona: '📼',
                                label: 'Il duello nel videonastro', x: 1540, y: 610,
                                characterId: 'pegasus', difficulty: 'Medio',
                                dialogo: [
                                    { chi: 'pegasus', testo: 'Ti concedo quindici minuti, Yugi-boy. Il mio Occhio vede la tua mente e, allo scadere, reclamerò una ricompensa.' },
                                    { io: true, testo: 'Non so come tu abbia dato vita alle carte attraverso un videonastro, ma vincerò e scoprirò che cosa vuoi da me.' }
                                ]
                            }
                        ]
                    }
                ]
            },
            {
                id: 'regno',
                nome: 'Il Regno dei Duellanti',
                testo: 'Un invito, un nonno chiuso dentro una videocassetta, e un\'isola intera fra te e il castello di Pegasus.',
                tappe: [
                    {
                        id: 'anime-area-regno', kind: 'area', icona: '🏝️',
                        label: 'Il Regno dei Duellanti', x: 590, y: 312,
                        nome: 'Il Regno dei Duellanti',
                        testo: 'Due Stelle dell\'Esagono alla partenza, dieci per entrare nel castello: sull\'isola ogni duello avvicina Yugi a Pegasus e all\'anima di suo nonno.',
                        // DUE MAPPE in un'area sola (vedi `mappeSuccessive`
                        // in js/story/story-progress.js): prima l'isola, poi,
                        // battuto Kaiba al cancello, gli interni del
                        // castello. Resta un percorso unico — una voce nella
                        // striscia dei capitoli, un nodo sulla mappa grande —
                        // perché è un unico torneo: il castello è dove
                        // finisce, non un posto nuovo.
                        mappa: { nome: 'L\'isola di Pegasus', sfondo: ['images/maps/storia_anime_regno.jpeg'], larghezza: 1672, altezza: 941 },
                        mappeSuccessive: [
                            {
                                daTappa: 'anime-2c-scena',
                                nome: 'Il Castello di Pegasus',
                                testo: 'Oltre il cancello le Stelle non servono più: restano quattro finalisti, e un padrone di casa che legge nel pensiero.',
                                sfondo: ['images/maps/storia_anime_castello_pegasus.jpeg'], larghezza: 1672, altezza: 941,
                                // Sull'isola il passaggio è il portone del
                                // castello, in cima alla scalinata dove
                                // aspetta Kaiba; dentro, è la scalinata
                                // esterna disegnata in alto a sinistra.
                                uscita: { x: 970, y: 215, icona: '🏰', label: 'Il Castello' },
                                ingresso: { x: 215, y: 105, icona: '🏝️', label: 'Torna sull\'isola' }
                            }
                        ],
                        // I nodi stanno sulle arene disegnate sull'isola: si
                        // sbarca al molo, si gira l'isola da un'arena
                        // all'altra e si sale al castello per la scalinata.
                        tappe: [
                            {
                                id: 'anime-2-scena', kind: 'scene', icona: '🏝️',
                                label: 'L\'invito', x: 1335, y: 378,
                                chi: 'Maximillion Pegasus', chiId: 'pegasus',
                                testo: [
                                    'Nel videonastro Pegasus ha sfidato Yugi a un duello a tempo usando l’Occhio del Millennio. Allo scadere, ha reclamato l’anima di Solomon Muto.',
                                    'Per liberarlo Yugi deve partecipare al Regno dei Duellanti e raggiungere Pegasus nel suo castello.',
                                    'Ogni concorrente riceve due Stelle dell’Esagono. Ne servono dieci per oltrepassare il cancello del castello prima che termini il torneo.',
                                    'Joey partecipa per vincere il premio e pagare l’operazione agli occhi di Serenity; Yugi gli cede una delle proprie Stelle per farlo salire sulla nave.',
                                    'Téa e Tristan si imbarcano di nascosto. Nessuno di loro intende lasciare che Yugi affronti Pegasus da solo.'
                                ]
                            },
                            {
                                id: 'anime-2-viaggio', kind: 'scene', icona: '🚢',
                                label: 'Verso il Regno', x: 1515, y: 455,
                                chi: 'Joey Wheeler', chiId: 'joey',
                                testo: [
                                    'Weevil ha chiesto di vedere le carte di Exodia e le ha gettate in mare. Io mi sono tuffato, ma le onde le hanno portate via.',
                                    'Yugi ha perso le cinque carte con cui aveva sconfitto Kaiba. Weevil pensa di aver eliminato la sua unica possibilità di vittoria.',
                                    'Sull’isola Pegasus annuncia le regole: il terreno modifica i mostri e ogni duello mette in palio le Stelle dell’Esagono.',
                                    'Weevil si allontana verso la foresta. Se voleva assicurarsi il primo vantaggio, avrà anche il primo duello.'
                                ]
                            },
                            {
                                id: 'anime-2-weevil', kind: 'duel', icona: '🐛',
                                label: 'Weevil Underwood', x: 1420, y: 548,
                                characterId: 'weevil', difficulty: 'Medio',
                                dialogo: [
                                    { chi: 'weevil', testo: 'Senza Exodia e dentro una foresta che potenzia i miei insetti, la tua fama finirà al primo duello.' },
                                    { io: true, testo: 'Hai gettato le mie carte in mare per paura di affrontarle. Vincerò con quelle che mi sono rimaste.' }
                                ]
                            },
                            {
                                id: 'anime-2-mai-primo', kind: 'duel', icona: '🦋',
                                label: 'Joey contro Mai', x: 1260, y: 610,
                                parallelo: true, sbloccaDopo: 'anime-2-weevil',
                                characterId: 'mai', difficulty: 'Medio',
                                protagonista: { name: 'Joey Wheeler', title: 'Il duellante alle prime armi', image: 'images/characters/joeyWheeler.jpg', icon: '🎲' },
                                dialogo: [
                                    { chi: 'mai', testo: 'Non ho bisogno di vedere le mie carte: profumo diverso, scelta perfetta. Un principiante non può capirlo.' },
                                    { io: true, testo: 'Forse sono un principiante, ma non sono venuto fin qui per farmi mandare a casa al primo duello.' }
                                ]
                            },
                            {
                                id: 'anime-2-rex', kind: 'duel', icona: '🦖',
                                label: 'Rex Raptor', x: 1108, y: 645,
                                parallelo: true, sbloccaDopo: 'anime-2-mai-primo',
                                characterId: 'rex', difficulty: 'Medio',
                                protagonista: { name: 'Joey Wheeler', title: 'Il duellante dal cuore indomabile', image: 'images/characters/joeyWheeler.jpg', icon: '🎲' },
                                dialogo: [
                                    { chi: 'rex', testo: 'Se vinco, Mai viene a cena con me. Se perdi, mi lasci il tuo Mago del Tempo.' },
                                    { io: true, testo: 'Non duello per una scommessa su Mai. Duello perché devo arrivare da Serenity con il premio.' }
                                ]
                            },
                            {
                                id: 'anime-2-mako', kind: 'duel', icona: '🌊',
                                label: 'Mako Tsunami', x: 798, y: 785,
                                characterId: 'mako', difficulty: 'Medio',
                                dialogo: [
                                    { chi: 'mako', testo: 'Questo mare mi ha cresciuto. Se vuoi passare, dovrai battermi dove la marea combatte al mio fianco.' },
                                    { io: true, testo: 'Non sono venuto a portarti via il mare. Sono venuto a riprendermi mio nonno.' }
                                ]
                            },
                            {
                                id: 'anime-2-bonz', kind: 'duel', icona: '🪦',
                                label: 'Joey contro Bonz', x: 925, y: 705,
                                parallelo: true, sbloccaDopo: 'anime-2-rex',
                                characterId: 'bonz', difficulty: 'Medio',
                                protagonista: { name: 'Joey Wheeler', title: 'Il duellante dal cuore indomabile', image: 'images/characters/joeyWheeler.jpg', icon: '🎲' },
                                dialogo: [
                                    { chi: 'bonz', testo: 'Nel cimitero i miei mostri tornano come zombie più forti. Quando avremo le tue Stelle, Keith ci farà entrare nel castello.' },
                                    { io: true, testo: 'Keith vi sta usando e poi vi abbandonerà. Prima uscirò da questa caverna, cominciando dal tuo Re dei Fantasmi.' }
                                ]
                            },
                            {
                                id: 'anime-2-notte', kind: 'scene', icona: '🔥',
                                label: 'Le Stelle di Mai', x: 555, y: 755,
                                chi: 'Mai Valentine', chiId: 'mai',
                                testo: [
                                    'Panik mi ha trascinata nella sua arena avvolta dalle tenebre. Mi ha intimidita finché ho perso il duello e tutte le mie Stelle dell’Esagono.',
                                    'È uno degli Eliminatori di Pegasus: non combatte per raggiungere il castello, ma per cacciare dall’isola chi è arrivato troppo vicino.',
                                    'Yugi si è fatto avanti e ha promesso di riconquistare le mie Stelle. Non gli ho chiesto di farlo, ma non posso permettere che affronti Panik senza sapere cosa lo aspetta.',
                                    'Nel buio della sua arena si intravede il Castello delle Illusioni Oscure. Panik crede che la paura abbia già deciso il duello.'
                                ]
                            },
                            {
                                id: 'anime-2-panik', kind: 'duel', icona: '🕯️',
                                label: 'Panik', x: 308, y: 655,
                                characterId: 'panik', difficulty: 'Difficile',
                                dialogo: [
                                    { chi: 'panik', testo: 'Ho già tolto a Mai tutte le sue Stelle. Nella mia arena buia perderai anche il coraggio di guardare il campo.' },
                                    { io: true, testo: 'La paura è l’unica strategia che possiedi. Riconquisterò le Stelle di Mai e distruggerò il tuo Castello delle Illusioni Oscure.' }
                                ]
                            },
                            {
                                id: 'anime-2-mai-panik', kind: 'duel', icona: '🕯️',
                                label: 'Mai contro Panik', x: 235, y: 570,
                                parallelo: true, sbloccaDopo: 'anime-2-mako',
                                characterId: 'panik', difficulty: 'Difficile',
                                protagonista: { name: 'Mai Valentine', title: 'La duellante delle Arpie', image: 'images/characters/maiValentine.jpg', icon: '🦋' },
                                dialogo: [
                                    { chi: 'panik', testo: 'Nel buio non vedrai i miei mostri crescere. Quando la paura avrà vinto, prenderò tutte le tue Stelle.' },
                                    { io: true, testo: 'Non ho bisogno di vedere il tuo volto per capire che vivi d’intimidazione. Le mie Arpie non si piegheranno.' }
                                ]
                            },
                            {
                                id: 'anime-2-kaiba-joey', kind: 'duel', icona: '🐉',
                                label: 'Kaiba contro Joey', x: 430, y: 545,
                                parallelo: true, sbloccaDopo: 'anime-2-panik',
                                characterId: 'joey', difficulty: 'Difficile',
                                protagonista: { name: 'Seto Kaiba', title: 'In cerca di Mokuba', image: 'images/characters/setoKaiba_duelist_Kingdom.png', icon: '🐉' },
                                dialogo: [
                                    { chi: 'joey', testo: 'Non passerai sopra di noi come se non esistessimo. Il mio Drago Nero affronterà il tuo Drago Bianco.' },
                                    { io: true, testo: 'Se vuoi misurarti con me, Wheeler, preparati a scoprire la differenza fra un dilettante e un campione.' }
                                ]
                            },
                            {
                                id: 'anime-2-bakura-isola', kind: 'duel', icona: '💍',
                                label: 'Il Gioco delle Ombre di Bakura', x: 485, y: 430,
                                characterId: 'bakura', difficulty: 'Difficile',
                                dialogo: [
                                    { chi: 'bakura', testo: 'Ho rinchiuso le vostre anime nelle carte preferite. Se perdo Life Point, sarete voi a pagarne il prezzo.' },
                                    { io: true, testo: 'Lo spirito dell’Anello ha preso il corpo di Bakura. Useremo le carte in cui siamo imprigionati per salvarlo senza sacrificarci.' }
                                ]
                            },
                            {
                                id: 'anime-2-falso-kaiba', kind: 'duel', icona: '👻',
                                avatar: { kaiba: 'images/characters/setoKaiba_duelist_Kingdom.png' },
                                label: 'Il fantasma di Kaiba', x: 610, y: 390,
                                characterId: 'kaiba', difficulty: 'Difficile',
                                dialogo: [
                                    { nome: 'Imitatore di Kaiba', icona: '👻', testo: 'Pegasus mi ha dato il mazzo di Kaiba e una parte della sua mente. Affronterai di nuovo i suoi tre Draghi Bianchi.' },
                                    { io: true, testo: 'Non sei Kaiba: imiti le sue carte senza comprenderne l’orgoglio. Libererò ciò che resta della sua anima da questo duello.' }
                                ]
                            },
                            {
                                id: 'anime-2-kaiba-pegasus', kind: 'duel', icona: '👁️',
                                label: 'Kaiba contro Pegasus', x: 520, y: 325,
                                parallelo: true, sbloccaDopo: 'anime-2-kaiba',
                                characterId: 'pegasus', difficulty: 'Difficile',
                                protagonista: { name: 'Seto Kaiba', title: 'In cerca di Mokuba', image: 'images/characters/setoKaiba_duelist_Kingdom.png', icon: '🐉' },
                                dialogo: [
                                    { chi: 'pegasus', testo: 'Mokuba e la KaibaCorp saranno miei, Kaiba-boy. Con l’Occhio del Millennio conosco già ogni carta che giocherai.' },
                                    { io: true, testo: 'Non mi interessa come leggi la mente. Libererai Mokuba quando i miei Draghi Bianchi avranno distrutto i tuoi Toon.' }
                                ]
                            },
                            {
                                id: 'anime-2-mai', kind: 'scene', icona: '🐉',
                                label: 'Kaiba sull’isola', x: 368, y: 335,
                                chi: 'Mokuba Kaiba', chiId: 'mokuba',
                                testo: [
                                    'Pegasus ha preso la mia anima e vuole impadronirsi della KaibaCorp e del sistema olografico costruito da Seto.',
                                    'Mio fratello è tornato sull’isola per salvarmi. Ha sconfitto Joey e ora sta cercando un modo per raggiungere Pegasus nel castello.',
                                    'Anche Yugi deve arrivare lassù, ma prima gli servono dieci Stelle e la strada passa sotto il castello.',
                                    'Nelle grotte lo aspettano due guardiani scelti da Pegasus. Non lasceranno uscire nessuno senza un duello.'
                                ]
                            },
                            {
                                id: 'anime-2-keith', kind: 'scene', icona: '🪦',
                                label: 'Sotto il cimitero', x: 748, y: 215,
                                chi: 'Joey Wheeler', chiId: 'joey',
                                testo: [
                                    'Bandit Keith ha mandato Bonz e i suoi scagnozzi a rubare le nostre Stelle. Dopo il duello ci hanno chiusi nelle grotte sotto il cimitero.',
                                    'Keith non combatte ancora in prima persona: usa gli altri, bara e aspetta che siano loro a portargli ciò che serve per entrare nel castello.',
                                    'Abbiamo trovato un’uscita, ma Pegasus l’ha affidata ai Fratelli Paradosso. Vogliono tutte le nostre Stelle in un unico duello a coppie.',
                                    'Io e Yugi entreremo insieme nel loro labirinto. Per uscirne dovremo scegliere anche la porta giusta.'
                                ]
                            },
                            {
                                id: 'anime-2-paradox', kind: 'duel', icona: '🚪',
                                label: 'I Fratelli Paradosso', x: 830, y: 275,
                                characterId: 'paradoxBrothers', difficulty: 'Difficile',
                                dialogo: [
                                    { chi: 'paradoxBrothers', testo: 'Una porta conduce al castello, l’altra di nuovo nel labirinto. Prima, però, superate il Guardiano del Cancello.' },
                                    { io: true, testo: 'Joey ed io metteremo in comune mostri e strategie. Il vostro labirinto non dividerà ciò che ci ha portati fin qui.' }
                                ]
                            },
                            {
                                id: 'anime-2-stelle', kind: 'scene', icona: '⭐',
                                label: 'L’uscita dal labirinto', x: 895, y: 255,
                                chi: 'Joey Wheeler', chiId: 'joey',
                                testo: [
                                    'I Fratelli Paradosso ci hanno sbarrato l’uscita dal labirinto sotterraneo: io e Yugi abbiamo dovuto affrontarli insieme, con tutte le nostre Stelle in palio.',
                                    'Il loro Guardiano del Cancello sembrava invincibile, ma combinando i nostri mostri abbiamo trovato la vera uscita e vinto il duello.',
                                    'Ora abbiamo entrambi dieci Stelle dell’Esagono e il diritto di entrare nel castello. Ma sulla scalinata ci aspetta Seto Kaiba.',
                                    'Pegasus ha imprigionato l’anima di Mokuba. Per sfidarlo e salvarlo, Kaiba vuole le Stelle di Yugi: nessuno dei due può permettersi di cedere.'
                                ]
                            },
                            // Kaiba sbarra la scalinata del castello: batterlo
                            // apre il portone, e con lui la seconda mappa.
                            {
                                id: 'anime-2-kaiba', kind: 'duel', icona: '🐉',
                                avatar: { kaiba: 'images/characters/setoKaiba_duelist_Kingdom.png' },
                                label: 'Seto Kaiba', x: 1030, y: 330,
                                characterId: 'kaiba', difficulty: 'Difficile',
                                dialogo: [
                                    { chi: 'kaiba', testo: 'Pegasus tiene prigioniero Mokuba. Mi servono le tue Stelle per entrare nel castello e riprendermelo.' },
                                    { io: true, testo: 'Anch’io devo entrare per salvare mio nonno, Kaiba. Nessuno dei due può rinunciare a questo duello.' }
                                ]
                            },
                            {
                                id: 'anime-2-tea-mai', kind: 'duel', icona: '💫',
                                label: 'Téa contro Mai', x: 1110, y: 285,
                                parallelo: true, sbloccaDopo: 'anime-2-kaiba',
                                characterId: 'mai', difficulty: 'Medio',
                                protagonista: { name: 'Téa Gardner', title: 'Amica di Yugi', image: 'images/characters/teaGardner.jpg', icon: '💫' },
                                dialogo: [
                                    { chi: 'mai', testo: 'Yugi ha perso le Stelle contro Kaiba. Se vuoi conquistargliele, dovrai affrontare le mie Lady Arpia.' },
                                    { io: true, testo: 'Non sono una finalista, ma non lascerò che il viaggio di Yugi finisca ai cancelli del castello.' }
                                ]
                            },
                            // --- Seconda mappa: gli interni del castello ---
                            // Si entra dalla scalinata esterna in alto a
                            // sinistra, la semifinale si gioca nell'arena al
                            // centro, Pegasus aspetta nella sala del trono.
                            // Pegasus chiudeva l'isola prima che il castello
                            // avesse una mappa: le due tappe nate col castello
                            // gli stanno DAVANTI (vedi `separazioni`).
                            {
                                id: 'anime-2c-scena', kind: 'scene', icona: '🏰',
                                label: 'Il cancello si apre', x: 170, y: 300,
                                chi: 'Croquet',
                                testo: [
                                    'Congratulazioni. Siete arrivati al cancello in quattro, con le Stelle dell\'Esagono al completo: da qui in poi l\'isola non conta più.',
                                    'Il signor Pegasus vi aspetta per le finali. Stanotte dormirete nel castello, e domani si duella nell\'arena al piano di sotto.',
                                    'Gli abbinamenti li decide il caso, come ogni cosa sotto questo tetto. O quasi.',
                                    'Una cortesia: non girate per i corridoi di notte. Le segrete di questo castello sono più antiche di chi ci abita.'
                                ]
                            },
                            // Nell'anime la semifinale di Yugi è contro Mai,
                            // una seconda volta dopo il duello sull'isola.
                            {
                                id: 'anime-2c-mai', kind: 'duel', icona: '🦋',
                                label: 'Semifinale: Mai', x: 880, y: 445,
                                characterId: 'mai', difficulty: 'Difficile',
                                dialogo: [
                                    { chi: 'mai', testo: 'Mi hai restituito le Stelle senza chiedere nulla. Proprio per questo, in semifinale non accetterò che tu ti trattenga.' },
                                    { io: true, testo: 'Ti affronterò come la duellante che ha conquistato questo posto. Il nostro duello deciderà chi continuerà.' }
                                ]
                            },
                            {
                                id: 'anime-2c-keith', kind: 'duel', icona: '🇺🇸',
                                label: 'Semifinale: Bandit Keith', x: 885, y: 365,
                                parallelo: true, sbloccaDopo: 'anime-2c-scena',
                                characterId: 'bandit_keith', difficulty: 'Difficile',
                                protagonista: { name: 'Joey Wheeler', title: 'Finalista del Regno dei Duellanti', image: 'images/characters/joeyWheeler.jpg', icon: '🎲' },
                                dialogo: [
                                    { chi: 'bandit_keith', testo: 'Ho rubato la tua carta d’ingresso. Senza Gloria della Mano del Re non puoi nemmeno sederti al tavolo.' },
                                    { io: true, testo: 'Mai me l’ha restituita. Ora resta solo il duello, Keith: niente scagnozzi e niente carte nascoste nel polsino.' }
                                ]
                            },
                            {
                                id: 'anime-2c-joey', kind: 'duel', icona: '🎲',
                                label: 'Finale: Joey Wheeler', x: 900, y: 270,
                                characterId: 'joey', difficulty: 'Difficile',
                                dialogo: [
                                    { chi: 'joey', testo: 'Siamo arrivati in finale insieme, Yugi. Adesso niente favori: voglio vedere quanto sono cresciuto davvero.' },
                                    { io: true, testo: 'È proprio perché siamo amici che duellerò con tutto ciò che ho. Il vincitore affronterà Pegasus.' }
                                ]
                            },
                            {
                                id: 'anime-2-pegasus', kind: 'duel', icona: '👁️',
                                label: 'Maximillion Pegasus', x: 905, y: 165,
                                characterId: 'pegasus', difficulty: 'Difficile',
                                dialogo: [
                                    { chi: 'pegasus', testo: 'Il mio Occhio del Millennio vede ogni carta nella tua mente, Yugi-boy. Toon World farà il resto.' },
                                    { io: true, testo: 'Non duello da solo. Alterneremo le nostre menti e combatteremo insieme per liberare nonno, Mokuba e Kaiba.' }
                                ]
                            }
                        ]
                    }
                ]
            },
            {
                id: 'battlecity1',
                nome: 'Battle City - Parte 1',
                testo: 'Kaiba apre la città, e fra gli iscritti c\'è chi non è venuto per il torneo.',
                tappe: [
                    {
                        id: 'anime-area-battlecity1', kind: 'area', icona: '🏙️',
                        label: 'Battle City - Parte 1', x: 865, y: 360,
                        nome: 'Battle City - Parte 1',
                        testo: 'Sei Carte Localizzatrici per arrivare alle finali, e tre Dei Egizi che non dovrebbero esistere.',
                        mappa: { sfondo: ['images/maps/storia_anime_battlecity1.jpeg'], larghezza: 1672, altezza: 941 },
                        tappe: [
                            {
                                id: 'anime-3-scena', kind: 'scene', icona: '🏙️',
                                label: 'Domino City', x: 180, y: 780,
                                chi: 'Seto Kaiba', chiId: 'kaiba',
                                testo: [
                                    'Regole nuove: si duella in città, col Duel Disk, e chi perde cede la sua carta migliore. Nessun molo, nessuna isola: il torneo è Domino intera.',
                                    'Servono sei Carte Localizzatrici per sapere dove si tengono le finali. Chi ne ha meno, alle finali non ci arriva e basta.',
                                    'Ho aperto io le iscrizioni, e non per generosità: c\'è qualcosa in questa città che voglio far uscire allo scoperto.',
                                    'Da qualche parte là fuori ci sono i Cacciatori Rari, che non giocano per vincere ma per prendere.',
                                    'E ci sono tre Dei Egizi che non dovrebbero esistere. Uno ce l\'ho io. Gli altri due li voglio.'
                                ]
                            },
                            {
                                id: 'anime-3-tavola-scena', kind: 'scene', icona: '🗿',
                                label: 'La tavola del Faraone', x: 260, y: 610,
                                chi: 'Ishizu Ishtar', chiId: 'ishizu',
                                testo: [
                                    'Ti ho condotto al museo per mostrarti questa tavola: raffigura un Faraone senza nome che duella contro un sacerdote simile a Seto Kaiba.',
                                    'Le tre figure sopra di loro sono gli Dei Egizi. Mio fratello Marik ha sottratto due delle loro carte e guida i Cacciatori Rari.',
                                    'Kaiba possiede Obelisk perché gliel\'ho affidato io. Sapevo che il suo desiderio di riunire gli Dei avrebbe dato inizio a Battle City.',
                                    'Entra nel torneo, Faraone. Recupera le altre carte divine e ferma Marik: soltanto allora la porta dei tuoi ricordi potrà aprirsi.'
                                ]
                            },
                            {
                                id: 'anime-3-seeker', kind: 'duel', icona: '🕶️',
                                label: 'Seeker', x: 350, y: 700,
                                characterId: 'seeker', difficulty: 'Medio',
                                dialogo: [
                                    { chi: 'seeker', testo: 'Joey ha già perso il suo Drago Nero Occhi Rossi. Adesso scommetti il Mago Nero: Exodia vuole una preda più rara.' },
                                    { io: true, testo: 'Le carte contraffatte non fanno di te un duellante. Libererò il Drago Nero e fermerò la tua caccia.' }
                                ]
                            },
                            {
                                id: 'anime-3-joey-seeker', kind: 'duel', icona: '🕶️',
                                label: 'Joey contro Seeker', x: 405, y: 765,
                                parallelo: true, sbloccaDopo: 'anime-3-tavola-scena',
                                characterId: 'seeker', difficulty: 'Medio',
                                protagonista: { name: 'Joey Wheeler', title: 'Duellante di Battle City', image: 'images/characters/joeyWheeler.jpg', icon: '🎲' },
                                dialogo: [
                                    { chi: 'seeker', testo: 'Le mie carte contraffatte completeranno Exodia prima che tu possa reagire. In cambio prenderò il tuo Drago Nero.' },
                                    { io: true, testo: 'Il Drago Nero Occhi Rossi non è merce per i Cacciatori Rari. Ti batterò prima che tu possa mettere insieme tutti i pezzi.' }
                                ]
                            },
                            {
                                id: 'anime-3-espa', kind: 'duel', icona: '🔮',
                                label: 'Espa Roba', x: 510, y: 610,
                                parallelo: true, sbloccaDopo: 'anime-3-seeker',
                                characterId: 'espaRoba', difficulty: 'Medio',
                                protagonista: { name: 'Joey Wheeler', title: 'Duellante di Battle City', image: 'images/characters/joeyWheeler.jpg', icon: '🎲' },
                                dialogo: [
                                    { chi: 'espaRoba', testo: 'I miei poteri extrasensoriali mi mostrano ogni carta che hai in mano. Jinzo metterà a tacere le tue Trappole.' },
                                    { io: true, testo: 'I tuoi fratelli stanno spiando le mie carte dai tetti. Batterò i tuoi trucchi e conquisterò Jinzo secondo le regole di Battle City.' }
                                ]
                            },
                            {
                                id: 'anime-3-mako-joey', kind: 'duel', icona: '🌊',
                                label: 'Joey contro Mako', x: 565, y: 500,
                                parallelo: true, sbloccaDopo: 'anime-3-espa',
                                characterId: 'mako', difficulty: 'Medio',
                                protagonista: { name: 'Joey Wheeler', title: 'Duellante di Battle City', image: 'images/characters/joeyWheeler.jpg', icon: '🎲' },
                                dialogo: [
                                    { chi: 'mako', testo: 'Combatto per ritrovare mio padre e il mare mi presta ancora una volta la sua forza. Metti in palio Jinzo, Joey.' },
                                    { io: true, testo: 'Io metto in palio Jinzo e tu la Fortezza Balena. Uno di noi uscirà da qui con la sua seconda Carta Localizzatrice.' }
                                ]
                            },
                            {
                                id: 'anime-3-strings', kind: 'duel', icona: '🧵',
                                label: 'Strings', x: 420, y: 460,
                                characterId: 'strings', difficulty: 'Difficile',
                                dialogo: [
                                    { chi: 'strings', testo: '...' },
                                    { nome: 'Marik', icona: '☥', testo: 'Questo burattino non ha bisogno di parlare. Nella sua mano cresce il potere di Slifer il Drago del Cielo.' },
                                    { io: true, testo: 'Puoi controllare il suo corpo, Marik, ma non il cuore delle mie carte.' }
                                ]
                            },
                            {
                                id: 'anime-3-arkana', kind: 'duel', icona: '🎭',
                                label: 'Arkana', x: 270, y: 300,
                                characterId: 'arkana', difficulty: 'Difficile',
                                dialogo: [
                                    { chi: 'arkana', testo: 'Marik mi restituirà Catherine quando il mio Mago Nero avrà sconfitto il tuo. Le seghe sotto i nostri piedi renderanno definitiva la sconfitta.' },
                                    { io: true, testo: 'Marik ti ha ingannato e tu hai maltrattato le tue carte. Ti mostrerò quale Mago Nero possiede davvero la fiducia del suo duellante.' }
                                ]
                            },
                            {
                                id: 'anime-3-lumis', kind: 'duel', icona: '☀️',
                                label: 'Lumis', x: 530, y: 230,
                                characterId: 'lumis', difficulty: 'Medio',
                                dialogo: [
                                    { chi: 'lumis', testo: 'Sul tetto non c’è spazio per fuggire. La Maschera della Luce sigillerà i tuoi tributi.' },
                                    { io: true, testo: 'Una maschera può nascondere un volto, non le intenzioni di chi la indossa.' }
                                ]
                            },
                            {
                                id: 'anime-3-umbra', kind: 'duel', icona: '🌘',
                                label: 'Umbra', x: 720, y: 300,
                                characterId: 'umbra', difficulty: 'Difficile',
                                dialogo: [
                                    { chi: 'umbra', testo: 'Lumis ha chiuso la via alla luce. Ora la mia Bestia Mascherata completerà il doppio duello.' },
                                    { io: true, testo: 'Avete separato il campo, ma avete sottovalutato il legame tra me e Kaiba.' }
                                ]
                            },
                            {
                                id: 'anime-3-joey-controllato', kind: 'duel', icona: '⚓',
                                label: 'Il duello dell’amicizia', x: 675, y: 400,
                                characterId: 'joey', difficulty: 'Difficile',
                                dialogo: [
                                    { nome: 'Marik', icona: '☥', testo: 'Joey è sotto il mio controllo. Vincerai soltanto condannando il tuo migliore amico a essere trascinato in fondo alla baia.' },
                                    { io: true, testo: 'Non combatterò contro Joey come se fosse un nemico. Userò il duello per raggiungerlo e spezzare il tuo controllo.' }
                                ]
                            },
                            {
                                id: 'anime-3-marik-molo', kind: 'scene', icona: '⚓',
                                label: 'Il duello al molo', x: 790, y: 405,
                                chi: 'Téa Gardner', chiId: 'tea',
                                testo: [
                                    'Marik ha preso il controllo della mia mente e di quella di Joey. Ci ha incatenati a un’ancora e ha costretto Yugi a sfidare il suo migliore amico.',
                                    'Ogni perdita di Life Point avvicinava uno dei due al fondo della baia. Marik voleva spezzare il Faraone obbligandolo a scegliere chi salvare.',
                                    'Yugi e Joey hanno rifiutato di trattarsi da nemici. Joey ha ritrovato se stesso e insieme sono riusciti a liberarci prima che l’ancora cadesse.',
                                    'Ora restano sei Carte Localizzatrici e il dirigibile delle finali. Marik ha fallito al molo, ma uno dei suoi servitori è già qualificato.'
                                ]
                            },
                            {
                                id: 'anime-3-bakura', kind: 'duel', icona: '💍',
                                label: 'Ryo Bakura', x: 820, y: 500,
                                characterId: 'bakura', difficulty: 'Difficile',
                                dialogo: [
                                    { chi: 'bakura', testo: 'Il mio Tavolo del Destino scandirà le cinque lettere della tua sconfitta. Nei quarti voglio il tuo Puzzle e il potere di Marik.' },
                                    { io: true, testo: 'Lo spirito dell’Anello sta usando ancora il corpo di Bakura. Vincerò prima che il Gioco delle Ombre consumi il mio amico.' }
                                ]
                            },
                            {
                                id: 'anime-3-bakura-bonz', kind: 'duel', icona: '🪦',
                                label: 'Bakura contro Bonz', x: 900, y: 575,
                                parallelo: true, sbloccaDopo: 'anime-3-marik-molo',
                                characterId: 'bonz', difficulty: 'Difficile',
                                protagonista: { name: 'Yami Bakura', title: 'Lo spirito dell’Anello', image: 'images/characters/bakura.jpg', icon: '💍' },
                                dialogo: [
                                    { chi: 'bonz', testo: 'Abbiamo tre Carte Localizzatrici e non le cederemo a uno sconosciuto incontrato nel cimitero.' },
                                    { io: true, testo: 'Non mi servono i vostri nomi. Mi servono soltanto una Carta Localizzatrice e tre anime da spedire nel Regno delle Ombre.' }
                                ]
                            },
                            {
                                id: 'anime-3-bakura-marik', kind: 'duel', icona: '🌑',
                                label: 'Bakura contro Marik', x: 940, y: 455,
                                parallelo: true, sbloccaDopo: 'anime-3-bakura-bonz',
                                characterId: 'marik', difficulty: 'Difficile',
                                protagonista: { name: 'Yami Bakura', title: 'Lo spirito dell’Anello', image: 'images/characters/bakura.jpg', icon: '💍' },
                                dialogo: [
                                    { chi: 'marik', testo: 'La mia parte debole si è alleata con te, Bakura. Quando perderai, entrambi sarete cancellati dal Gioco delle Ombre.' },
                                    { io: true, testo: 'Il ragazzo mi ha rivelato il segreto di Ra. Quando avrò sconfitto la tua parte oscura, prenderò anche la Barra del Millennio.' }
                                ]
                            },
                            {
                                id: 'anime-3-ishizu', kind: 'duel', icona: '📿',
                                label: 'Ishizu Ishtar', x: 1020, y: 620,
                                parallelo: true, sbloccaDopo: 'anime-3-bakura',
                                characterId: 'ishizu', difficulty: 'Difficile',
                                protagonista: { name: 'Seto Kaiba', title: 'Organizzatore di Battle City', image: 'images/characters/setoKaiba.jpg', icon: '🐉' },
                                dialogo: [
                                    { chi: 'ishizu', testo: 'La Collana del Millennio mi ha già mostrato la conclusione: Obelisk provocherà la tua sconfitta e io fermerò Marik.' },
                                    { io: true, testo: 'Non accetto un futuro deciso da una reliquia. Se una visione dice che perderò, sarà la mia carta a smentirla.' }
                                ]
                            },
                            {
                                id: 'anime-3-odion', kind: 'duel', icona: '🔥',
                                label: 'Odion', x: 1290, y: 520,
                                parallelo: true, sbloccaDopo: 'anime-3-bakura',
                                characterId: 'odion', difficulty: 'Difficile',
                                protagonista: { name: 'Joey Wheeler', title: 'Finalista di Battle City', image: 'images/characters/joeyWheeler.jpg', icon: '🎲' },
                                dialogo: [
                                    { chi: 'odion', testo: 'Per ordine del vero Marik, porterò il suo nome e il suo volto durante questo quarto di finale.' },
                                    { io: true, testo: 'Puoi chiamarti Marik quanto vuoi. Scoprirò chi sei davvero e mi guadagnerò la semifinale.' }
                                ]
                            },
                            {
                                id: 'anime-3-mai-marik', kind: 'duel', icona: '🌑',
                                label: 'Mai contro Marik', x: 1370, y: 430,
                                parallelo: true, sbloccaDopo: 'anime-3-bakura',
                                characterId: 'marik', difficulty: 'Difficile',
                                protagonista: { name: 'Mai Valentine', title: 'Finalista di Battle City', image: 'images/characters/maiValentine.jpg', icon: '🦋' },
                                dialogo: [
                                    { chi: 'marik', testo: 'Nel mio Gioco delle Ombre ogni mostro perduto cancellerà un ricordo. Alla fine non saprai più nemmeno perché duelli.' },
                                    { io: true, testo: 'Non sono arrivata alle finali per essere una comparsa. Prenderò Ra e dimostrerò che non ho bisogno di nessuno che mi salvi.' }
                                ]
                            },
                            {
                                id: 'anime-3-sei-carte', kind: 'scene', icona: '🃏',
                                label: 'I finalisti', x: 1450, y: 330,
                                chi: 'Yami Yugi', chiId: 'yamiYugi',
                                testo: [
                                    'Gli otto qualificati sono saliti sul dirigibile e i quarti di finale sono terminati: Joey ha superato Odion, Kaiba ha sconfitto Ishizu e io ho liberato Bakura dal suo lato oscuro.',
                                    'Marik ha sconfitto Mai in un Gioco delle Ombre e ha imprigionato la sua mente. La sua parte oscura ha ormai preso il controllo.',
                                    'Restiamo in quattro: Joey affronterà Marik e io affronterò Kaiba. Le semifinali si terranno alla Torre dei Duelli della KaibaCorp.',
                                    'Il dirigibile cambia rotta verso l’isola artificiale. Prima che possa arrivarci, una fortezza emerge dal mare e prende il controllo dei sistemi di bordo.'
                                ]
                            },
                            // Chiude la Parte 1: si sale sul dirigibile per
                            // le semifinali — ma il torneo vero riprenderà
                            // solo in "Battle City - Parte 2", DOPO il
                            // Mondo Virtuale: sul dirigibile, prima ancora
                            // che i duelli comincino, Noah trascina tutti
                            // dentro la sua rete. Vedi il commento
                            // sull'area 'virtuale' qui sotto.
                            {
                                id: 'anime-4-scena', kind: 'scene', icona: '🛩️',
                                label: 'Sul dirigibile', x: 1450, y: 105,
                                io: true,
                                testo: [
                                    'La fortezza ha agganciato il dirigibile e un ragazzo apparso sui monitor si è presentato come Noah Kaiba.',
                                    'Ha bloccato i comandi, separato le nostre coscienze dai corpi e trascinato tutti in un mondo virtuale costruito dalla KaibaCorp.',
                                    'Le semifinali restano sospese. Per tornare al torneo dobbiamo prima sopravvivere alle regole dei Deck Master e ai cinque ex dirigenti che governano questo luogo.',
                                    'Kaiba conosce quel sistema, ma il nome di Noah lo ha sorpreso. Qualunque cosa ci aspetti nella rete riguarda la sua famiglia.'
                                ]
                            }
                        ]
                    }
                ]
            },
            {
                id: 'virtuale',
                nome: 'Il Mondo Virtuale',
                testo: 'Il dirigibile non è ancora atterrato che il pavimento sparisce: dentro la rete le regole le scrive un ragazzo che non è mai cresciuto.',
                tappe: [
                    {
                        id: 'anime-area-virtuale', kind: 'area', icona: '🧊',
                        label: 'Il Mondo Virtuale', x: 1120, y: 335,
                        nome: 'Il Mondo Virtuale',
                        testo: 'Nessun corpo, nessun Duel Disk: qui si perde l\'anima e basta. Prima i Cinque, poi Noah, poi chi comanda davvero.',
                        mappa: { sfondo: ['images/maps/storia_anime_virtuale.jpeg'], larghezza: 1536, altezza: 1024 },
                        tappe: [
                            {
                                id: 'anime-6-scena', kind: 'scene', icona: '🧊',
                                label: 'Dentro la rete', x: 790, y: 540,
                                chi: 'Noah Kaiba', chiId: 'noah',
                                testo: [
                                    'Benvenuti nel mio mondo. Non è un modo di dire: questo posto l\'ho costruito io, e qui dentro decido io cosa è vero.',
                                    'Mio padre mi ha messo qui dopo l\'incidente. Ha preso quello che restava di me e l\'ha caricato in una macchina, e poi è andato avanti a vivere.',
                                    'Poi ha adottato Seto. Un ragazzino preso da un orfanotrofio, e in due anni gli ha dato tutto quello che a me non aveva potuto dare più.',
                                    'Prima di arrivare fino a me dovrete passare i Cinque: erano il consiglio d\'amministrazione di mio padre, e qui dentro sono ancora ai loro posti.',
                                    'Vediamo quanto vi piace il mio mondo.'
                                ]
                            },
                            // I cinque dirigenti/Big Five, uno alla volta.
                            {
                                id: 'anime-6-gansley', kind: 'duel', icona: '🎩',
                                label: 'Gansley', x: 250, y: 250,
                                characterId: 'gansley', difficulty: 'Difficile',
                                dialogo: [
                                    { chi: 'gansley', testo: 'Nel mondo virtuale il Deck Master combatte al tuo fianco. Il mio Guerriero degli Abissi trasformerà ogni tua scelta in un costo.' },
                                    { io: true, testo: 'Le vostre regole tengono prigioniere le anime dei miei amici. Le imparerò e userò il mio Deck Master per liberarli.' }
                                ]
                            },
                            {
                                id: 'anime-6-johnson', kind: 'duel', icona: '🦁',
                                label: 'Johnson', x: 330, y: 590,
                                parallelo: true, sbloccaDopo: 'anime-6-scena',
                                characterId: 'johnson', difficulty: 'Difficile',
                                protagonista: { name: 'Joey Wheeler', title: 'Prigioniero del mondo virtuale', image: 'images/characters/joeyWheeler.jpg', icon: '🎲' },
                                dialogo: [
                                    { chi: 'johnson', testo: 'Ero il miglior avvocato della KaibaCorp. Qui sono giudice, giuria e duellante, e la sentenza è già scritta.' },
                                    { io: true, testo: 'Hai truccato perfino la roulette del tuo Deck Master. Io non ho bisogno di una sentenza comprata per vincere.' }
                                ]
                            },
                            {
                                id: 'anime-6-nesbitt', kind: 'duel', icona: '🏗️',
                                label: 'Nesbitt', x: 760, y: 830,
                                parallelo: true, sbloccaDopo: 'anime-6-scena',
                                characterId: 'nesbitt', difficulty: 'Difficile',
                                protagonista: { name: 'Tristan Taylor', title: 'Prigioniero del mondo virtuale', image: 'images/characters/tristanTaylor.jpg', icon: '🔧' },
                                dialogo: [
                                    { chi: 'nesbitt', testo: 'Quando perderete, prenderò il corpo di Serenity e abbandonerò per sempre questa macchina.' },
                                    { io: true, testo: 'Duke, Serenity e io combatteremo insieme. Non metterai le mani sul corpo di nessuno di noi.' }
                                ]
                            },
                            {
                                id: 'anime-6-crump', kind: 'duel', icona: '⚙️',
                                label: 'Crump', x: 1270, y: 440,
                                parallelo: true, sbloccaDopo: 'anime-6-scena',
                                characterId: 'crump', difficulty: 'Difficile',
                                protagonista: { name: 'Téa Gardner', title: 'Prigioniera del mondo virtuale', image: 'images/characters/teaGardner.jpg', icon: '💫' },
                                dialogo: [
                                    { chi: 'crump', testo: 'Nel mio regno di ghiaccio i pinguini comandano e il tuo corpo sarà il biglietto con cui tornerò nel mondo reale.' },
                                    { io: true, testo: 'Ridicolizzare il mio mazzo non ti renderà meno pericoloso. Dark Magician Girl ed io usciremo da qui insieme.' }
                                ]
                            },
                            {
                                id: 'anime-6-lector', kind: 'duel', icona: '🎭',
                                label: 'Lector', x: 1230, y: 690,
                                parallelo: true, sbloccaDopo: 'anime-6-scena',
                                characterId: 'lector', difficulty: 'Difficile',
                                protagonista: { name: 'Seto Kaiba', title: 'Presidente della KaibaCorp', image: 'images/characters/setoKaiba.jpg', icon: '🐉' },
                                dialogo: [
                                    { chi: 'lector', testo: 'Hai estromesso noi Cinque dalla KaibaCorp. Con Jinzo come Deck Master prenderò il tuo corpo e anche l’azienda.' },
                                    { io: true, testo: 'Vi ho licenziati perché avete tradito la società. Ora cancellerò anche le vostre copie digitali.' }
                                ]
                            },
                            {
                                id: 'anime-6-anime-prigioni', kind: 'scene', icona: '🔗',
                                label: 'Anime prigioniere', x: 1010, y: 455,
                                chi: 'Téa Gardner', chiId: 'tea',
                                testo: [
                                    'I Cinque sono caduti, ma nessuno si è svegliato. I corpi sul dirigibile respirano; qui dentro, le loro anime restano chiuse in stanze che Noah può spostare a piacimento.',
                                    'Mokuba ha seguito la voce di un fratello che non ha mai conosciuto. Noah non vuole soltanto vendicarsi di Kaiba: vuole il corpo di Mokuba per tornare nel mondo reale.',
                                    'Le cinque isole virtuali si spengono e i ponti convergono sulla torre centrale. Non ci sono più delegati dietro cui nascondersi.',
                                    'Se Noah vince il prossimo duello, uno di noi uscirà da qui con il volto sbagliato.'
                                ]
                            },
                            // Superati i Cinque, resta Noah.
                            {
                                id: 'anime-6-noah', kind: 'duel', icona: '🧊',
                                label: 'Noah Kaiba', x: 775, y: 230,
                                characterId: 'noah', difficulty: 'Difficile',
                                dialogo: [
                                    { chi: 'noah', testo: 'Ho già sconfitto Seto e trasformato Mokuba in pietra. Con il potere di Shinato assorbirò anche le anime che hai liberato.' },
                                    { io: true, testo: 'Riprenderò i Life Point rimasti a Kaiba e continuerò il suo duello. Tutte le anime che hai imprigionato combatteranno con me.' }
                                ]
                            },
                            {
                                id: 'anime-6-kaiba-noah', kind: 'duel', icona: '🐉',
                                label: 'Kaiba contro Noah', x: 920, y: 210,
                                parallelo: true, sbloccaDopo: 'anime-6-anime-prigioni',
                                characterId: 'noah', difficulty: 'Difficile',
                                protagonista: { name: 'Seto Kaiba', title: 'Presidente della KaibaCorp', image: 'images/characters/setoKaiba.jpg', icon: '🐉' },
                                dialogo: [
                                    { chi: 'noah', testo: 'Sono il vero erede di Gozaburo. Userò Mokuba contro di te e dimostrerò che la KaibaCorp avrebbe dovuto appartenere a me.' },
                                    { io: true, testo: 'Non sei mio fratello e non sei il mio successore. Libera Mokuba: regoleremo questa faccenda nel duello che volevi.' }
                                ]
                            },
                            {
                                id: 'anime-6-scena2', kind: 'scene', icona: '🏢',
                                label: 'Il vero padrone', x: 1060, y: 300,
                                chi: 'Gozaburo Kaiba', chiId: 'gozaburo',
                                testo: [
                                    'Noah credeva che gli avrei dato il corpo di Seto. Era soltanto uno strumento per intrappolarvi qui e preparare il mio ritorno.',
                                    'Seto mi ha sottratto la KaibaCorp e l’ha trasformata da industria bellica a società di giochi. Ora prenderò il suo corpo e cancellerò ciò che ha costruito.',
                                    'La mia coscienza si diffonderà attraverso la rete e sostituirà ogni mente collegata. Il mondo reale diventerà il mio nuovo corpo.',
                                    'Non vi sfido per un torneo. Dovrete attraversare la forma che ho assunto e raggiungere l’uscita prima che la fortezza virtuale venga distrutta.'
                                ]
                            },
                            {
                                id: 'anime-6-gozaburo', kind: 'scene', icona: '🏢',
                                label: 'La fuga da Gozaburo', x: 1225, y: 140,
                                chi: 'Seto Kaiba', chiId: 'kaiba',
                                testo: [
                                    'Gozaburo non vuole un duello: sta caricando la propria coscienza su ogni rete del mondo e usa la fortezza come ponte.',
                                    'Ho ripreso il controllo del dirigibile. Dobbiamo tornare nei nostri corpi e decollare prima che il reattore virtuale collassi.',
                                    'Yugi e gli altri terranno aperta l’uscita; Mokuba viene con me. Questa volta mio padre non userà più nessuno dei due.',
                                    'La fortezza esplode dietro il dirigibile. Davanti a noi resta la Torre dei Duelli e Battle City può finalmente riprendere.'
                                ]
                            }
                        ]
                    }
                ]
            },
            {
                id: 'battlecity2',
                nome: 'Battle City - Parte 2',
                testo: 'Il dirigibile è ancora lì dove l\'avevano lasciato: il torneo riprende da dove Noah l\'aveva interrotto.',
                tappe: [
                    {
                        id: 'anime-area-battlecity2', kind: 'area', icona: '🏆',
                        label: 'Battle City - Parte 2', x: 1400, y: 355,
                        nome: 'Battle City - Parte 2',
                        testo: 'Le finali riprendono da dove Noah le aveva interrotte: mancano solo i duelli veri.',
                        mappa: { sfondo: ['images/maps/storia_anime_battlecity2.jpeg'], larghezza: 1672, altezza: 941 },
                        tappe: [
                            {
                                id: 'anime-4b-scena', kind: 'scene', icona: '🛩️',
                                label: 'Il ritorno', x: 1370, y: 140,
                                chi: 'Seto Kaiba', chiId: 'kaiba',
                                testo: [
                                    'Siamo tornati nei nostri corpi e abbiamo fatto precipitare la fortezza virtuale prima che Gozaburo potesse riversare la propria mente nella rete mondiale.',
                                    'Il dirigibile può finalmente raggiungere la Torre dei Duelli sull’isola artificiale della KaibaCorp. Le semifinali si svolgeranno lassù.',
                                    'Joey affronterà Marik; subito dopo, Yugi affronterà me. I vincitori saliranno all’ultimo piano per la finale.',
                                    'Il torneo riprende adesso. Nessun altro dirottamento, nessun’altra scusa.'
                                ]
                            },
                            {
                                id: 'anime-4-joey', kind: 'duel', icona: '🎲',
                                label: 'Semifinale: Marik', x: 1230, y: 700,
                                parallelo: true, sbloccaDopo: 'anime-4b-scena',
                                characterId: 'marik', difficulty: 'Difficile',
                                protagonista: { name: 'Joey Wheeler', title: 'Finalista di Battle City', image: 'images/characters/joeyWheeler.jpg', icon: '🎲' },
                                dialogo: [
                                    { chi: 'marik', testo: 'Ogni mostro distrutto farà soffrire il suo proprietario. Prima della fine, Ra cancellerà il tuo corpo e la tua mente.' },
                                    { io: true, testo: 'Puoi trasformare il duello in un incubo, ma non mi farai abbandonare. Ho promesso a Yugi che sarei arrivato fino in fondo.' }
                                ]
                            },
                            {
                                id: 'anime-4b-amicizia', kind: 'scene', icona: '🤝',
                                label: 'Una promessa mantenuta', x: 1120, y: 610,
                                chi: 'Joey Wheeler', chiId: 'joey',
                                testo: [
                                    'Non guardarmi così, Yugi. Marik mi ha trascinato in un Gioco delle Ombre, ma non è riuscito a farmi smettere di duellare.',
                                    'Avevo Jinzo pronto per l’ultimo attacco. Il mio corpo ha ceduto un istante prima che potessi dichiararlo: Marik è passato in finale, ma non mi ha battuto nello spirito.',
                                    'Kaiba ti aspetta più avanti. Vuole Slifer, vuole dimostrare che il destino è una scusa e probabilmente vuole anche far saltare in aria metà dell’isola.',
                                    'Vai. Io sarò qui quando torni.'
                                ]
                            },
                            {
                                id: 'anime-4-kaiba', kind: 'duel', icona: '🐉',
                                label: 'Seto Kaiba', x: 995, y: 520,
                                characterId: 'kaiba', difficulty: 'Difficile',
                                dialogo: [
                                    { chi: 'kaiba', testo: 'Obelisk contro Slifer. Il vincitore prenderà la carta divina dello sconfitto e affronterà Marik nella finale che ho costruito.' },
                                    { io: true, testo: 'La tavola egizia raffigura questo scontro da tremila anni. Oggi non sarà il passato a deciderne il risultato.' }
                                ]
                            },
                            {
                                id: 'anime-4b-tre-dei', kind: 'scene', icona: '⚡',
                                label: 'I tre Dei', x: 875, y: 360,
                                chi: 'Seto Kaiba', chiId: 'kaiba',
                                testo: [
                                    'Hai vinto la semifinale. Non significa che il destino esista; significa soltanto che oggi il tuo deck è stato meno mediocre del solito.',
                                    'Hai vinto Obelisk secondo la regola dell’ante. Contro Marik avrai bisogno di tutti e tre gli Dei, e io voglio vedere quale scusa inventerai se perderai anche con loro.',
                                    'La cima della torre è davanti a te. Ra è lassù, insieme all’uomo che ha trasformato l’intero torneo in un Gioco delle Ombre.',
                                    'Vinci, Yugi. Non per il destino. Perché questa è la mia Battle City.'
                                ]
                            },
                            {
                                id: 'anime-4-marik', kind: 'duel', icona: '🌑',
                                label: 'Marik Ishtar', x: 790, y: 220,
                                characterId: 'marik', difficulty: 'Difficile',
                                dialogo: [
                                    { chi: 'marik', testo: 'Ra diventerà una Fenice immortale e consumerà ogni ricordo del Faraone. La mia parte debole sparirà insieme a lui.' },
                                    { io: true, testo: 'Combatterò per Joey, Mai e per il vero Marik che hai imprigionato. I tre Dei porranno fine al tuo Gioco delle Ombre.' }
                                ]
                            }
                        ]
                    }
                ]
            },
            {
                id: 'cerimoniale',
                nome: 'Il Mondo dei Ricordi',
                testo: 'Battle City è finita. Resta il viaggio nel passato, per la battaglia che conta davvero.',
                tappe: [
                    {
                        id: 'anime-area-cerimoniale', kind: 'area', icona: '👁️',
                        label: 'Il Mondo dei Ricordi', x: 1765, y: 350,
                        nome: 'Il Mondo dei Ricordi',
                        testo: 'L\'ultimo duello non si gioca per vincere: si gioca per lasciarlo andare.',
                        mappa: { sfondo: ['images/maps/storia_anime_cerimoniale.jpeg'], larghezza: 1536, altezza: 1024 },
                        tappe: [
                            {
                                id: 'anime-9-scena', kind: 'scene', icona: '🏜️',
                                label: 'Verso i ricordi', x: 250, y: 830,
                                chi: 'Ishizu Ishtar', chiId: 'ishizu',
                                testo: [
                                    'Il Faraone deve tornare indietro, in Egitto, dentro i propri ricordi: è l\'unico posto dove il suo nome è ancora scritto.',
                                    'Là dentro non sarà il Re dei Giochi. Sarà un ragazzo su un trono, con dei sacerdoti attorno e un nemico che non ha ancora un volto.',
                                    'Quando il nome tornerà, la porta si aprirà. E una porta aperta non si può lasciare aperta per sempre.',
                                    'Preparati, Yugi. Quello che stai per fare non è salvarlo: è lasciarlo andare.'
                                ]
                            },
                            // --- Dentro i ricordi: il Re dei Ladri ---
                            // L'arco del Mondo dei Ricordi (Dawn of the Duel
                            // nell'anime) È lo scontro fra il Faraone e
                            // Bakura: prima come Re dei Ladri, che fa
                            // irruzione a palazzo col sarcofago del padre del
                            // Faraone, poi come padrone del Gioco delle Ombre
                            // che risveglia Zorc. Mancava del tutto, e l'arco
                            // saltava da "entra nei ricordi" a "ha ritrovato
                            // il nome" senza che succedesse niente in mezzo.
                            // Queste quattro tappe sono nate DOPO: vedi la
                            // voce 'cerimoniale-bakura' in `separazioni`.
                            // In questi duelli si gioca nei panni del
                            // Faraone (il protagonista della campagna).
                            {
                                id: 'anime-9-bakura-scena', kind: 'scene', icona: '🗝️',
                                label: 'Il Re dei Ladri', x: 1420, y: 190,
                                chi: 'Bakura', chiId: 'bakura',
                                testo: [
                                    'Tremila anni fa ero un ragazzo di Kul Elna, e Kul Elna non esiste più. L\'hanno fusa, casa per casa, per forgiare i vostri sette Oggetti d\'oro.',
                                    'Io sono sopravvissuto. E da allora mi riprendo quello che è mio, una tomba alla volta.',
                                    'Stanotte ho portato fino a palazzo il sarcofago di tuo padre, Faraone. Volevo vedere la tua faccia mentre lo aprivo.',
                                    'Il mio Ka non ha un nome che i tuoi sacerdoti conoscano. Vediamo quanto vale il sangue reale contro l\'odio di un villaggio intero.'
                                ]
                            },
                            {
                                id: 'anime-9-bakura', kind: 'duel', icona: '🗝️',
                                label: 'Il Re dei Ladri', x: 1230, y: 320,
                                characterId: 'bakura', difficulty: 'Difficile',
                                dialogo: [
                                    { chi: 'bakura', testo: 'I tuoi Dei li ho già visti cadere una volta. Non ti proteggeranno per sempre.' },
                                    { io: true, testo: 'Non ho bisogno che mi proteggano. Ho bisogno che tu lasci questo palazzo.' }
                                ]
                            },
                            {
                                id: 'anime-9-mahad', kind: 'scene', icona: '🪄',
                                label: 'Il sacrificio di Mahad', x: 560, y: 240,
                                chi: 'Mahad',
                                testo: [
                                    'Il ladro è sceso nella tomba di vostro padre, mio Faraone, e io l\'ho seguito là sotto.',
                                    'L\'Anello del Millennio gli dà un potere che la magia che conosco non basta a fermare. Allora ne userò una che non ho mai usato.',
                                    'Unirò la mia anima al mio Ka. Da stanotte non sarò più Mahad il sacerdote: diventerò il Mago Nero e continuerò a proteggervi anche oltre la morte.',
                                    'Quando avrete bisogno di me, chiamatemi. Risponderò, mio Faraone.'
                                ]
                            },
                            // Il Gioco delle Ombre: la partita che Bakura ha
                            // preparato da tremila anni, con l'Egitto come
                            // tabellone e Zorc come ultima pedina. Lo stesso
                            // avversario del duello a palazzo, un altro
                            // scontro — il `label` dice quale.
                            {
                                id: 'anime-9-zorc', kind: 'duel', icona: '🌑',
                                label: 'Il nome contro Bakura', x: 640, y: 520,
                                characterId: 'bakura', difficulty: 'Difficile',
                                protagonista: { name: 'Yugi Muto', title: 'Il ragazzo del Puzzle', image: 'images/characters/yugiMuto.jpg', icon: '🧩' },
                                dialogo: [
                                    { chi: 'bakura', testo: 'Mentre Zorc distrugge il passato, tu morirai qui senza riuscire a consegnare al Faraone il suo nome.' },
                                    { chi: 'bakura', testo: 'Ogni Life Point che perdi avvicina il presente alla stessa oscurità che sta inghiottendo l’Egitto.' },
                                    { io: true, testo: 'Ho ricomposto il cartiglio e so come leggere quel nome. Non ti permetterò di fermarmi prima che Atem possa udirlo.' }
                                ]
                            },
                            {
                                id: 'anime-9-nome', kind: 'scene', icona: '👑',
                                label: 'Atem', x: 855, y: 430,
                                chi: 'Il Faraone',
                                testo: [
                                    'Atem. Il nome attraversa il palazzo, raggiunge i sacerdoti e torna indietro come un’eco rimasta chiusa per tremila anni.',
                                    'Con il suo nome il Faraone richiama gli Dei, e i tre diventano una sola luce. Zorc non viene sconfitto dalla forza di una carta, ma dal ricordo di chi il Faraone era stato.',
                                    'Bakura perde il suo tabellone. Il Mondo dei Ricordi comincia a crollare, e la porta fra i vivi e i morti finalmente si apre.',
                                    'Atem sa adesso chi è. Per attraversare quella porta deve ancora dimostrare di essere pronto a perdere tutto ciò che lo lega al presente.'
                                ]
                            },
                            {
                                id: 'anime-5-scena', kind: 'scene', icona: '🏛️',
                                label: 'L\'ultima porta', x: 1225, y: 610,
                                chi: 'Il Faraone',
                                testo: [
                                    'Resta un solo duello, e non è contro un nemico.',
                                    'Ha ritrovato il suo nome, e con il nome la porta si è aperta. Manca soltanto che qualcuno lo accompagni fin lì.',
                                    'Per lasciarlo andare devi batterlo. Non c\'è una formula, non c\'è un rito: c\'è una partita, giocata sul serio, come tutte le altre.',
                                    'E dovrai giocarla per vincere. Lasciarti battere sarebbe tenerlo qui, ed è l\'unica cosa che non gli si può fare.',
                                    'È l\'ultimo duello del Faraone. Gli hai insegnato tu a giocarlo.'
                                ]
                            },
                            // Il Duello Cerimoniale: qui non si è il Faraone,
                            // lo si AFFRONTA. `protagonista` sulla prova vince
                            // su quello della campagna (vedi resolvePlayer in
                            // js/duel-session.js).
                            {
                                id: 'anime-5-yamiyugi', kind: 'duel', icona: '👑',
                                label: 'Il Duello Cerimoniale', x: 1060, y: 790,
                                characterId: 'yamiYugi', difficulty: 'Difficile',
                                protagonista: { name: 'Yugi Muto', title: 'Il ragazzo del Puzzle', image: 'images/characters/yugiMuto.jpg', icon: '🧩' },
                                dialogo: [
                                    { chi: 'yamiYugi', testo: 'Per aprirmi la porta dell’aldilà devi sconfiggermi mentre combatto con tutta la mia forza, compresi i tre Dei Egizi.' },
                                    { io: true, testo: 'Non proverò a trattenerti e non ti chiederò di lasciarmi vincere. Questo sarà il duello che dimostrerà quanto siamo cresciuti entrambi.' }
                                ]
                            }
                        ]
                    }
                ]
            }
        ],
        // Le aree nate STACCANDO le prime tappe di un'area che esisteva già.
        // L'avanzamento si salva per POSIZIONE (vedi story-progress.js), e
        // una tappa in più in testa sposterebbe di uno tutto quello che
        // viene dopo: chi era a metà del Regno si ritroverebbe altrove. Ogni
        // voce dice quale area è stata staccata da quale, e quante tappe si
        // è portata via; StoryProgress la applica UNA volta ai salvataggi
        // scritti prima (che non ne portano l'id) e la timbra su tutti
        // quelli scritti dopo. L'`id` non va mai cambiato né riusato.
        //
        // SALVATAGGI VECCHI: un avanzamento scritto PRIMA di questa voce
        // (cioè prima che i contatori delle aree contassero le sole prove
        // principali) non si migra più, si AZZERA: le migrazioni in
        // sequenza, applicate a salvataggi così vecchi, li riportavano in
        // un punto sbagliato della mappa (misurato: un salvataggio "davanti
        // a Pegasus" ripartiva da metà Regno). Resta salvato solo il fatto
        // di aver già ritirato il premio finale, così non si paga due volte.
        // Da questa voce in poi vale la migrazione di sempre.
        azzeraSeSenzaTimbro: 'anime-rami-paralleli',
        separazioni: [
            { id: 'prologo-domino-city', nuova: 'anime-area-prologo', da: 'anime-area-regno', quante: 5 },
            // Il castello di Pegasus è la SECONDA MAPPA del Regno, con due
            // tappe nuove (la scena d'ingresso e la semifinale con Mai)
            // davanti a Pegasus. Per un giorno è stato invece un'area a sé
            // sulla mappa grande: chi ha scritto il salvataggio in quella
            // forma porta il timbro 'castello-pegasus', e va ricucito col
            // Regno ('unione'); chi è arrivato da prima non l'ha mai avuta
            // e trova solo le due tappe in più ('inserite'). L'id
            // 'castello-pegasus' resta riservato: non riusarlo.
            // Nell'aritmetica della forma corrente si sottraggono anche le
            // due scene dell'isola aggiunte più tardi; le loro migrazioni
            // qui sotto le reinseriscono poi al punto esatto. Il vecchio
            // Castello separato continua ad avere realmente tre tappe.
            { id: 'castello-nel-regno', dalla: 'unione', vecchia: 'anime-area-castello', dentro: 'anime-area-regno', quante: 5, soloSeTimbrato: 'castello-pegasus' },
            { id: 'castello-tappe-nuove', dalla: 'inserite', area: 'anime-area-regno', prima: 'anime-2-pegasus', quante: 2, saltaSeTimbrato: 'castello-pegasus' },
            { id: 'regno-notte-isola', dalla: 'inserite', area: 'anime-area-regno', prima: 'anime-2-panik', quante: 1 },
            { id: 'regno-dieci-stelle', dalla: 'inserite', area: 'anime-area-regno', prima: 'anime-2-kaiba', quante: 1 },
            { id: 'regno-viaggio-nave', dalla: 'inserite', area: 'anime-area-regno', prima: 'anime-2-weevil', quante: 1 },
            { id: 'regno-primo-duello-mai', dalla: 'inserite', area: 'anime-area-regno', prima: 'anime-2-rex', quante: 1 },
            { id: 'regno-fratelli-paradosso', dalla: 'inserite', area: 'anime-area-regno', prima: 'anime-2-stelle', quante: 1 },
            { id: 'regno-finali-complete', dalla: 'inserite', area: 'anime-area-regno', prima: 'anime-2-pegasus', quante: 2 },
            // I quattro Rare Hunter aggiunti a Battle City in tre punti
            // diversi della sequenza. Le migrazioni evitano che un vecchio
            // salvataggio venga spostato indietro su duelli già superati.
            { id: 'battle-city-seeker', dalla: 'inserite', area: 'anime-area-battlecity1', prima: 'anime-3-espa', quante: 1 },
            { id: 'battle-city-strings', dalla: 'inserite', area: 'anime-area-battlecity1', prima: 'anime-3-arkana', quante: 1 },
            { id: 'battle-city-maschere', dalla: 'inserite', area: 'anime-area-battlecity1', prima: 'anime-3-bakura', quante: 2 },
            { id: 'anime-prologo-amici', dalla: 'inserite', area: 'anime-area-prologo', prima: 'anime-1-kaiba-scena', quante: 1 },
            { id: 'anime-battle-city-fili', dalla: 'inserite', area: 'anime-area-battlecity1', prima: 'anime-3-seeker', quante: 1 },
            { id: 'battle-city-duello-molo', dalla: 'inserite', area: 'anime-area-battlecity1', prima: 'anime-3-bakura', quante: 1 },
            { id: 'battle-city-finalisti', dalla: 'inserite', area: 'anime-area-battlecity1', prima: 'anime-4-scena', quante: 1 },
            { id: 'virtuale-anime-prigioniere', dalla: 'inserite', area: 'anime-area-virtuale', prima: 'anime-6-noah', quante: 1 },
            { id: 'battle-city-promessa-joey', dalla: 'inserite', area: 'anime-area-battlecity2', prima: 'anime-4-kaiba', quante: 1 },
            { id: 'battle-city-tre-dei', dalla: 'inserite', area: 'anime-area-battlecity2', prima: 'anime-4-marik', quante: 1 },
            // Il Mondo dei Ricordi: le quattro tappe dello scontro con Bakura
            // (Re dei Ladri, Mahad, Gioco delle Ombre) nate davanti a
            // "L'ultima porta".
            { id: 'cerimoniale-bakura', dalla: 'inserite', area: 'anime-area-cerimoniale', prima: 'anime-5-scena', quante: 5 },
            // Chi aveva già ricevuto le quattro tappe del blocco Bakura
            // deve vedere anche il nuovo raccordo sul vero nome; per i
            // salvataggi più vecchi è già compreso nelle cinque qui sopra.
            { id: 'cerimoniale-nome-atem', dalla: 'inserite', area: 'anime-area-cerimoniale', prima: 'anime-5-scena', quante: 1, soloSeTimbrato: 'cerimoniale-bakura' },
            { id: 'anime-rami-paralleli', dalla: 'laterali', aree: ['anime-area-regno', 'anime-area-battlecity1', 'anime-area-virtuale', 'anime-area-battlecity2'] },
            { id: 'anime-duello-video-pegasus', dalla: 'principali-fine', area: 'anime-area-prologo', quante: 1 },
            { id: 'anime-bakura-isola', dalla: 'principali-inserite', area: 'anime-area-regno', prima: 'anime-2-mai', quante: 1 },
            { id: 'anime-falso-kaiba', dalla: 'principali-inserite', area: 'anime-area-regno', prima: 'anime-2-mai', quante: 1 },
            { id: 'anime-duello-joey-molo', dalla: 'principali-inserite', area: 'anime-area-battlecity1', prima: 'anime-3-marik-molo', quante: 1 }
        ],
        // Premio per aver finito la campagna. Accreditato una volta sola
        // (vedi story-progress.js): rigiocarla è permesso, ripagarla no.
        premioFinale: { credits: 3000, starChips: 5, locatorCards: 5, millenniumCards: 3 }
    },

    {
        id: 'forbiddenMemories',
        nome: 'Memorie Proibite',
        sottotitolo: 'Il Principe e i Cinque Maghi Guerrieri',
        icona: '🏺',
        sfondo: ['images/maps/storia_forbidden_memories_1.jpeg', 'images/fields/mobile/anticoEgittoGiorno_2.jpg'],
        // Due brani della colonna sonora del gioco originale, scelti per
        // ora e da rivedere: la campagna li ha per non suonare come il
        // menu, non perché siano definitivi.
        musica: '02. Input Name.mp3',
        musicaDuello: '39. Free Duel.mp3',
        // ATEM, non "il Principe": nel gioco originale resta senza nome
        // per tutta la storia perché il nome se l'è dimenticato lui, non
        // perché non ce l'abbia. Chi gioca lo sa, e chiamarlo col suo nome
        // è la stessa cosa che chiamare Yami Yugi col suo.
        // Ritratto SUO e non quello di Yami Yugi: qui e' il faraone in
        // Egitto, cinquemila anni prima di finire dentro il Puzzle. Nel
        // capitolo del presente resta comunque Yugi Muto, che ha il
        // proprio `protagonista` a livello di capitolo e vince su questo.
        protagonista: { name: 'Atem', title: 'Il Faraone senza memoria', image: 'images/characters/atem.jpg', icon: '👑' },
        descrizione: 'La trama di Yu-Gi-Oh! Forbidden Memories, seguita da vicino: il colpo di stato di Heishin, il sigillo nel Puzzle del Millennio, il risveglio cinquemila anni dopo e il ritorno nel passato per riprendersi gli Oggetti, uno alla volta.',
        carteAmmesse: { origini: ['yu-gi-oh'] },
        larghezza: 3200,
        altezza: 1800,
        capitoli: [
            {
                id: 'fm-principe',
                nome: 'Il Regno del Principe',
                testo: 'Tremila anni prima di tutto: un regno in pace, un maestro, e tre amici con cui esercitarsi.',
                tappe: [
                    {
                        id: 'fm-1-scena', kind: 'scene', icona: '🏛️',
                        label: 'La lezione', x: 1640, y: 350,
                        chi: 'Simon Muran', chiId: 'simonMuran',
                        testo: [
                            'Mio principe, il regno è in pace e tu sei annoiato. È esattamente quando un sovrano è più in pericolo.',
                            'Tuo padre mi ha affidato due cose: te e i Sette Oggetti del Millennio. Della seconda si occupano i sacerdoti; della prima, purtroppo, io.',
                            'Prendi le carte. Questo gioco è vecchio quanto il regno, e non è un passatempo: si impara a leggere l\'avversario prima che muova.',
                            'Finché mi batti a questo gioco, so che sei ancora sveglio.',
                            'E un giorno ti servirà saperlo fare contro qualcuno che non ti vuole bene.'
                        ]
                    },
                    {
                        id: 'fm-1-simon', kind: 'duel', icona: '📜',
                        label: 'Simon Muran', x: 1430, y: 480,
                        characterId: 'simonMuran', difficulty: 'Medio',
                        field: 'images/fields/mobile/anticoEgittoRovinePalazzo.jpg'
,
                        dialogo: [
                            { chi: 'simonMuran', testo: 'Regola prima: un duello non si vince con le carte che hai, ma con quelle che l\'altro crede che tu abbia.' },
                            { chi: 'simonMuran', testo: 'Regola seconda, e piu\' importante: se perdi contro il tuo tutore non succede niente. Fuori da questa stanza non e\' cosi\'.' },
                            { io: true, testo: 'Allora facciamo in modo che la seconda non mi serva mai.' }
                        ]
                    },
                    {
                        id: 'fm-1-jono', kind: 'duel', icona: '🗡️',
                        label: 'Jono', x: 1230, y: 620,
                        characterId: 'jono', difficulty: 'Medio',
                        field: 'images/fields/mobile/anticoEgittoGiorno_1.jpg'
,
                        dialogo: [
                            { chi: 'jono', testo: 'Principe. Mi hanno fatto lavare tre volte prima di lasciarmi entrare qui dentro.' },
                            { chi: 'jono', testo: 'Io non ho un tutore che mi insegna le regole. Ho imparato al mercato, dove chi perde paga davvero.' },
                            { io: true, testo: 'Allora insegnami qualcosa anche tu.' }
                        ]
                    },
                    {
                        id: 'fm-1-teana', kind: 'duel', icona: '🌾',
                        label: 'Teana', x: 1460, y: 730,
                        characterId: 'teana', difficulty: 'Medio',
                        field: 'images/fields/mobile/anticoEgittoGiorno_1.jpg'
,
                        dialogo: [
                            { chi: 'teana', testo: 'Jono ti ha detto che ha imparato al mercato? Ha imparato da me, al mercato.' },
                            { chi: 'teana', testo: 'E non fare quella faccia da principe che lascia vincere. Lo vedo, sai, quando lo fai.' },
                            { io: true, testo: 'Non ho intenzione di farlo.' }
                        ]
                    },
                    {
                        id: 'fm-1-isis', kind: 'duel', icona: '🔮',
                        label: 'Sacerdotessa Isis', x: 1720, y: 660,
                        characterId: 'priestessIsis', difficulty: 'Medio',
                        field: 'images/fields/mobile/anticoEgittoRovinePalazzo.jpg'
,
                        dialogo: [
                            { chi: 'priestessIsis', testo: 'La Collana mi mostra sempre lo stesso frammento, mio principe, e non mi piace: una notte, il tempio aperto, e sette luci che se ne vanno.' },
                            { chi: 'priestessIsis', testo: 'Non so quando. So che duellerai piu\' di quanto un sovrano dovrebbe.' },
                            { io: true, testo: 'Allora comincio adesso.' }
                        ]
                    }
                ]
            },
            {
                id: 'fm-caduta',
                nome: 'La Caduta',
                testo: 'Heishin prende i Sette Oggetti in una notte sola. A Simon resta una cosa da fare, e la fa.',
                tappe: [
                    {
                        id: 'fm-2-presagio', kind: 'scene', icona: '🌘',
                        label: 'Il potere oscuro', x: 1830, y: 650,
                        chi: 'Simon Muran', chiId: 'simonMuran',
                        testo: [
                            'Ho trovato Heishin nelle rovine proibite. Dice di aver scoperto un Potere Oscuro e brandisce la Barra del Millennio come se gli appartenesse.',
                            'Quando gli ho chiesto di fermarsi mi ha colpito con la Barra. Non vuole soltanto il trono: sta cercando gli altri sei Oggetti.',
                            'I suoi uomini stanno entrando nel palazzo. Il Re e la Regina sono prigionieri, e Heishin userà le loro vite per costringerti a consegnare il Puzzle.',
                            'Se non potremo fermarlo, dovrai spezzare il Puzzle. Le nostre anime resteranno sigillate al suo interno finché qualcuno non lo ricomporrà.'
                        ]
                    },
                    {
                        id: 'fm-2-scena', kind: 'scene', icona: '⚔️',
                        label: 'Il colpo di stato', x: 1990, y: 780,
                        chi: 'Heishin', chiId: 'heishin',
                        testo: [
                            'Sette Oggetti del Millennio. Sette. E voi ne tenevate uno ciascuno, come fossero gioielli.',
                            'Un sacerdote per Oggetto, e nessuno che si chiedesse mai cosa succederebbe se fossero tutti nelle stesse mani.',
                            'Io li ho presi tutti. Il trono viene dopo: è la parte facile.',
                            'Le guardie del palazzo si sono arrese prima dell\'alba. Non per paura di me — per paura di quello che avevo in mano.',
                            'Cercate pure il principe. Io cerco altro, e ho già cominciato a scavare.'
                        ]
                    },
                    {
                        id: 'fm-2-seto', kind: 'duel', icona: '🔺',
                        label: 'Sacerdote Seto', x: 2160, y: 920,
                        characterId: 'priestSeto', difficulty: 'Difficile',
                        field: 'images/fields/mobile/anticoEgittoNotte_1.jpg'
,
                        dialogo: [
                            { chi: 'priestSeto', testo: 'Il tempio e\' aperto, le guardie sono a terra e io sono qui davanti a te. Immagino tu abbia gia\' capito da che parte sto.' },
                            { chi: 'priestSeto', testo: 'Heishin mi ha promesso il trono. Non e\' per il trono: e\' che a te il trono e\' stato dato, e a me no.' },
                            { io: true, testo: 'Ti e\' stato dato un tempio da custodire. Guarda com\'e\' ridotto.' }
                        ]
                    },
                    {
                        id: 'fm-2-heishin', kind: 'duel', icona: '🏛️',
                        label: 'Heishin', x: 1940, y: 1020,
                        characterId: 'heishin', difficulty: 'Difficile',
                        field: 'images/fields/mobile/anticoEgittoNotte_1.jpg'
,
                        dialogo: [
                            { chi: 'heishin', testo: 'Sette su sette, e il tuo sacerdote me li ha portati senza che dovessi chiedere due volte.' },
                            { chi: 'heishin', testo: 'Resti solo tu fra me e la corona, principe. E tu sei un ragazzo con un mazzo di carte.' },
                            { io: true, testo: 'Un ragazzo con un mazzo di carte ti ha appena raggiunto qui dentro.' }
                        ]
                    },
                    {
                        id: 'fm-2-sigillo', kind: 'scene', icona: '🧩',
                        label: 'Il sigillo', x: 1680, y: 1080,
                        chi: 'Simon Muran', chiId: 'simonMuran',
                        testo: [
                            'Non posso salvare il regno. Posso salvare te, e solo in un modo.',
                            'Il Puzzle è l\'unico degli Oggetti che Heishin non ha ancora. Lo smonto io stesso, adesso, e con te dentro.',
                            'Dormirai finché qualcuno non avrà la pazienza di rimetterlo insieme. Non la forza: la pazienza. È per questo che nessuno ci riuscirà presto.',
                            'Potrebbero volerci molti anni. Non ho un numero da darti.',
                            'Quando ti sveglierai, il mio nome non se lo ricorderà nessuno. Fa niente: ricordati il tuo.'
                        ]
                    }
                ]
            },
            {
                id: 'fm-presente',
                nome: 'Cinquemila anni dopo',
                testo: 'Il sigillo si spezza nel presente. Per tornare indietro manca un pezzo, e ce l\'ha qualcun altro.',
                // NEL PRESENTE NON SEI ATEM, SEI YUGI MUTO. Il Faraone è
                // dentro il Puzzle; a duellare nel torneo della Kaiba
                // Corporation è il ragazzo che quel Puzzle l'ha rimesso
                // insieme, e che a quel punto non sa ancora chi si porti al
                // collo. Il `protagonista` del CAPITOLO vince su quello
                // della campagna per tutte le sue tappe, torneo compreso.
                protagonista: { name: 'Yugi Muto', title: 'Il ragazzo del Puzzle', image: 'images/characters/yugiMuto.jpg', icon: '🧩' },
                tappe: [
                    {
                        id: 'fm-3-scena', kind: 'scene', icona: '💡',
                        label: 'L\'ultimo pezzo', x: 2270, y: 1270,
                        chi: 'Shadi', chiId: 'shadi',
                        testo: [
                            'Il Puzzle è stato completato. Dopo cinquemila anni, un ragazzo ci è riuscito — e quel ragazzo somiglia al Principe più di quanto sappia.',
                            'Gli Oggetti sono tornati a muoversi. Sei di loro dormono ancora sotto la sabbia; il settimo lo porta al collo chi ha appena finito di montarlo.',
                            'Ma prima di guardare indietro devi guardarti intorno. C\'è un ragazzo, in questa città, che tiene fra le mani una carta che apparteneva a un sacerdote.',
                            'Non lo sa, naturalmente. Nessuno di loro sa niente: giocano con la vostra storia stampata su cartoncino e la chiamano un passatempo.',
                            'Va\' a riprendertela. E non farlo da principe: falla come la fanno loro, iscrivendoti al loro torneo.'
                        ]
                    },
                    {
                        id: 'fm-3-shadi', kind: 'duel', icona: '🗝️',
                        label: 'Shadi', x: 2520, y: 1370,
                        characterId: 'shadi', difficulty: 'Difficile',
                        field: 'images/fields/mobile/rovine_1.jpg',
                        dialogo: [
                            { chi: 'shadi', testo: 'Non sono un avversario, ragazzo. Sono una prova.' },
                            { chi: 'shadi', testo: 'La Bilancia pesa ciò che uno è, non ciò che dice di essere. Se il tuo cuore non regge il peso del Puzzle, è meglio scoprirlo qui che laggiù.' },
                            { io: true, testo: 'Allora pesalo.' }
                        ]
                    },
                    // IL TORNEO DELLA KAIBA CORPORATION.
                    // Nel gioco originale il presente non è una fila di
                    // duelli qualsiasi: è un torneo, si sale un incontro
                    // alla volta e chi perde ricomincia da capo. Qui è una
                    // tappa sola della campagna che dentro ha il proprio
                    // percorso, con la propria mappa (vedi `kind: 'torneo'`
                    // nell'intestazione di questo file).
                    {
                        id: 'fm-3-torneo', kind: 'torneo', icona: '🏟️',
                        label: 'Il torneo di Kaiba', x: 2760, y: 1450,
                        nome: 'Torneo della Kaiba Corporation',
                        testo: 'Quattro preliminari e cinque finali fino al presidente. Chi perde esce dal tabellone e ricomincia dal primo.',
                        mappa: {
                            sfondo: ['images/maps/storia_torneo_kaiba_1.jpeg', 'images/fields/mobile/stadioKaiba.jpg'],
                            larghezza: 3200,
                            altezza: 1800
                        },
                        // L'ORDINE È QUELLO DEL GIOCO PS1, non una scelta:
                        // quattro preliminari (Rex, Weevil, Mai, Bandit
                        // Keith) e poi le finali (Shadi, Yami Bakura,
                        // Pegasus, Isis, Seto Kaiba). Ognuno dei cinque
                        // finalisti custodisce un Oggetto del Millennio, ed
                        // è il motivo per cui il torneo esiste: non si
                        // gioca per la coppa, si gioca per quello che hanno
                        // addosso.
                        // MARIK NON C'È, e non è una dimenticanza: in
                        // Forbidden Memories non compare affatto — il
                        // duellante oscuro di questo tabellone è Yami
                        // Bakura, che è anche quello che porta l'Anello.
                        // I nodi stanno su due file perché la mappa del
                        // tabellone non esiste ancora: quando arriverà, si
                        // poseranno sui suoi luoghi come nelle campagne.
                        tappe: [
                            {
                                id: 'fm-3t-rex', kind: 'duel', icona: '🦖',
                                label: 'Primo preliminare', x: 420, y: 560,
                                characterId: 'rex', difficulty: 'Medio',
                                field: 'images/fields/mobile/stadioKaiba.jpg',
                                dialogo: [
                                    { chi: 'rex', testo: 'Primo turno, e mi tocca il nanerottolo col ciondolo. Che fortuna.' },
                                    { chi: 'rex', testo: 'Nel mio mazzo non c\'è niente di astuto. C\'è roba grossa che passa sopra a quello che trova.' },
                                    { io: true, testo: 'Anche i dinosauri si sono estinti.' }
                                ]
                            },
                            {
                                id: 'fm-3t-weevil', kind: 'duel', icona: '🐛',
                                label: 'Secondo preliminare', x: 1000, y: 560,
                                characterId: 'weevil', difficulty: 'Medio',
                                field: 'images/fields/mobile/stadioKaiba.jpg',
                                dialogo: [
                                    { chi: 'weevil', testo: 'Hai battuto il ragazzo dei dinosauri. Roba grossa e lenta: facile.' },
                                    { chi: 'weevil', testo: 'Sai qual è il bello degli insetti? Che quando te ne accorgi hanno già mangiato tutto.' },
                                    { io: true, testo: 'Allora comincia a masticare.' }
                                ]
                            },
                            {
                                id: 'fm-3t-mai', kind: 'duel', icona: '🦋',
                                label: 'Terzo preliminare', x: 1580, y: 560,
                                characterId: 'mai', difficulty: 'Medio',
                                field: 'images/fields/mobile/stadioKaiba.jpg',
                                dialogo: [
                                    { chi: 'mai', testo: 'Terzo preliminare, tesoro. Da qui in poi non si gioca più per divertirsi.' },
                                    { chi: 'mai', testo: 'Io non leggo le carte: leggo chi le tiene in mano. E tu hai qualcosa addosso che ti pesa più del mazzo.' },
                                    { io: true, testo: 'Non è un peso. È un debito.' }
                                ]
                            },
                            {
                                id: 'fm-3t-keith', kind: 'duel', icona: '🎰',
                                label: 'Ultimo preliminare', x: 2160, y: 560,
                                characterId: 'bandit_keith', difficulty: 'Difficile',
                                field: 'images/fields/mobile/stadioKaiba.jpg',
                                dialogo: [
                                    { chi: 'bandit_keith', testo: 'Ultimo preliminare. Io in questo stadio ci sono già stato, e non me ne sono andato con le mani vuote.' },
                                    { chi: 'bandit_keith', testo: 'Regola numero uno: vince chi arriva in fondo. Come ci arriva non lo chiede nessuno.' },
                                    { io: true, testo: 'Lo chiedo io.' }
                                ]
                            },
                            {
                                id: 'fm-3t-shadi', kind: 'duel', icona: '🗝️',
                                label: 'Finali · la Chiave', x: 2740, y: 560,
                                characterId: 'shadi', difficulty: 'Difficile',
                                field: 'images/fields/mobile/stadioKaiba.jpg',
                                dialogo: [
                                    { chi: 'shadi', testo: 'Sei arrivato alle finali. Ora la parte che conta: nessuno dei quattro che ti restano davanti è qui per il torneo.' },
                                    { io: true, testo: 'E tu perché ci sei?' },
                                    { chi: 'shadi', testo: 'Per vedere se meriti quello che stai per riprenderti. Porto la Chiave del Millennio, e la Chiave apre solo a chi ha già dentro qualcosa da aprire.' },
                                    { chi: 'shadi', testo: 'Battimi, e sarà tua. Perdi, e resterai un ragazzo con un bel ciondolo.' }
                                ]
                            },
                            {
                                id: 'fm-3t-bakura', kind: 'duel', icona: '💍',
                                label: 'Finali · l\'Anello', x: 2740, y: 1240,
                                characterId: 'bakura', difficulty: 'Difficile',
                                field: 'images/fields/mobile/stadioKaiba.jpg',
                                dialogo: [
                                    { chi: 'bakura', testo: 'L\'Anello del Millennio mi ha portato qui. Dice che sei tu, e l\'Anello indica sempre la direzione giusta.' },
                                    { io: true, testo: 'E cosa ti aspetti di trovarci?' },
                                    { chi: 'bakura', testo: 'Quello che c\'è dentro il tuo Puzzle. Da cinquemila anni, e non è il ragazzo.' },
                                    { chi: 'bakura', testo: 'Fallo uscire. Sono venuto per lui, non per te.' }
                                ]
                            },
                            {
                                id: 'fm-3t-pegasus', kind: 'duel', icona: '👁️',
                                label: 'Finali · l\'Occhio', x: 2160, y: 1240,
                                characterId: 'pegasus', difficulty: 'Difficile',
                                field: 'images/fields/mobile/stadioKaiba.jpg',
                                dialogo: [
                                    { chi: 'pegasus', testo: 'Questo gioco l\'ho inventato io, ragazzo. Ogni carta che hai in mano l\'ho disegnata io, una per una.' },
                                    { chi: 'pegasus', testo: 'E con l\'Occhio del Millennio le vedo tutte comodamente da qui, mentre le giochi. Tu invece del mio mazzo non sai niente.' },
                                    { io: true, testo: 'Sapere cosa faccio non è sapere perché lo faccio.' },
                                    { chi: 'pegasus', testo: 'Ooh. Una risposta interessante. Vediamo se regge quanto il tono.' }
                                ]
                            },
                            {
                                id: 'fm-3t-isis', kind: 'duel', icona: '📿',
                                label: 'Finali · la Collana', x: 1580, y: 1240,
                                characterId: 'ishizu', difficulty: 'Difficile',
                                field: 'images/fields/mobile/stadioKaiba.jpg',
                                dialogo: [
                                    { chi: 'ishizu', testo: 'La Collana del Millennio mostra quello che deve accadere. Ho visto questo duello molto prima di sederti davanti.' },
                                    { io: true, testo: 'E come finisce?' },
                                    { chi: 'ishizu', testo: 'Con te che vinci. Ma vedere la fine non è viverla: la mia famiglia custodisce da tremila anni il nome che tu hai dimenticato, e te lo restituisco solo se arrivi in fondo da solo.' },
                                    { chi: 'ishizu', testo: 'Quindi giocherò per vincere. Sarebbe un insulto fare altrimenti.' }
                                ]
                            },
                            {
                                id: 'fm-3t-kaiba', kind: 'duel', icona: '🐉',
                                // Il Kaiba del torneo di Forbidden Memories.
                                avatar: { kaiba: 'images/characters/setoKaiba_forbiddenMemories.png' },
                                label: 'Finale · lo Scettro', x: 1000, y: 1240,
                                characterId: 'kaiba', difficulty: 'Difficile',
                                field: 'images/fields/mobile/stadioKaiba.jpg',
                                dialogo: [
                                    { chi: 'kaiba', testo: 'Finale. Questo stadio è mio, il torneo è mio, e fra un minuto lo sarà anche il tuo Puzzle.' },
                                    { chi: 'kaiba', testo: 'C\'è una carta nel mio mazzo che ho comprato a un prezzo che non ti dirò. Quando la vedrai capirai perché nessuno arriva in fondo qui dentro.' },
                                    { io: true, testo: 'Non sono venuto per il torneo, Kaiba. Sono venuto per quello scettro che tieni al fianco e di cui non sai niente.' },
                                    { chi: 'kaiba', testo: 'Un soprammobile trovato in uno scavo. Se lo vuoi, vieni a prendertelo.' }
                                ]
                            },
                            // La tappa che chiude il tabellone: vinto il
                            // torneo non si torna sulla mappa a freddo —
                            // qui si vede cos'era davvero tutto questo.
                            {
                                id: 'fm-3t-finale', kind: 'scene', icona: '🏆',
                                label: 'Sette su sette', x: 420, y: 1240,
                                io: true,
                                testo: [
                                    'Il presidente della Kaiba Corporation è a terra in mezzo al suo stadio, e non ha capito niente di quello che è appena successo.',
                                    'Non è per la coppa che sono salito su questo ring. Erano cinque, uno per finalista: la Chiave, l\'Anello, l\'Occhio, la Collana, lo Scettro.',
                                    'Cinque Oggetti del Millennio in una notte sola, più il Puzzle che il ragazzo porta al collo da quando aveva otto anni. Sei.',
                                    'Il settimo non è in questo secolo. È dove l\'ho lasciato cinquemila anni fa, insieme a tutto il resto.',
                                    'Shadi aveva ragione: nessuno di loro era qui per il torneo. Nemmeno io.'
                                ]
                            }
                        ]
                    },
                    {
                        id: 'fm-3-ritorno', kind: 'scene', icona: '⏳',
                        label: 'Indietro', x: 2960, y: 1600,
                        io: true,
                        testo: [
                            'Gli Oggetti sono sette. Uno è al collo del ragazzo, uno l\'ha appena lasciato Kaiba senza capire cosa stesse lasciando.',
                            'Gli altri cinque sono dove li ha messi Heishin: cinquemila anni fa, uno per ciascuno dei suoi maghi.',
                            'Se li voglio indietro devo andarli a prendere. Non c\'è una strada più corta.',
                            'Cinque terre, cinque Alti Maghi, e davanti a ciascuno una guardia che non mi lascerà passare per cortesia.',
                            'Shadi dice che il Puzzle può riportarmi là. Non dice se può riportarmi anche indietro.'
                        ]
                    }
                ]
            },
            {
                id: 'fm-maghi',
                nome: 'I Cinque Maghi Guerrieri',
                testo: 'Cinque terre, cinque Oggetti del Millennio, e due maghi a guardia di ognuna.',
                // Cinque terre, una per riga sulla mappa: ogni riga si apre
                // con la voce del Mago Supremo che la custodisce, poi il suo
                // guardiano, poi lui. Prima erano dieci duelli di fila senza
                // una parola in mezzo — la sola sequenza del gioco in cui non
                // si capiva più per cosa si stesse duellando, che è
                // esattamente ciò che questo file dice di non fare.
                tappe: [
                    {
                        id: 'fm-4-scena-ocean', kind: 'scene', icona: '🌊',
                        label: 'Le secche', x: 2520, y: 1660,
                        chi: 'High Mage Secmeton', chiId: 'highMageSecmeton',
                        testo: [
                            'Heishin ha diviso i Sette Oggetti fra noi cinque. A me è toccato il mare, e con il mare non si discute.',
                            'Alla mia torre non arriva nessuno senza passare prima dalle secche: là ti aspetta Ocean Mage.',
                            'Se lo batti avrai guadagnato il diritto di annegare davanti a me.',
                            'Qui l\'acqua cambia strada due volte al giorno. I miei mostri sanno quando; tu no, e lo scoprirai al momento sbagliato.',
                            'Vieni avanti, Principe. La marea non aspetta che tu sia pronto.'
                        ]
                    },
                    {
                        id: 'fm-4-ocean', kind: 'duel', icona: '🐚',
                        label: 'Ocean Mage', x: 2250, y: 1690,
                        characterId: 'oceanMage', difficulty: 'Medio',
                        field: 'images/fields/mobile/anticoEgittoGiorno_2.jpg'
,
                        dialogo: [
                            { chi: 'oceanMage', testo: 'Le secche sembrano basse. Lo sembrano sempre, finche\' l\'acqua non decide diversamente.' },
                            { io: true, testo: 'Passo comunque.' }
                        ]
                    },
                    {
                        id: 'fm-4-secmeton', kind: 'duel', icona: '🔱',
                        label: 'High Mage Secmeton', x: 1980, y: 1640,
                        characterId: 'highMageSecmeton', difficulty: 'Difficile',
                        field: 'images/fields/mobile/anticoEgittoNotte_2.jpg'
,
                        dialogo: [
                            { chi: 'highMageSecmeton', testo: 'Sei arrivato bagnato fino al collo e vuoi ancora il mio Oggetto.' },
                            { chi: 'highMageSecmeton', testo: 'Il mare non restituisce niente, principe. Io ho imparato da lui.' },
                            { io: true, testo: 'Il mare non ha mai avuto qualcosa di mio.' }
                        ]
                    },
                    {
                        id: 'fm-4-scena-mountain', kind: 'scene', icona: '⛰️',
                        label: 'Il sentiero', x: 1180, y: 1520,
                        chi: 'High Mage Atenza', chiId: 'highMageAtenza',
                        testo: [
                            'La pietra non tratta con nessuno. Sale chi ha il fiato e cade chi non ce l\'ha, e non c\'è altra regola quassù.',
                            'Heishin mi ha chiesto quale delle cinque terre volessi. Ho scelto questa perché è l\'unica che si difende da sola.',
                            'Mountain Mage sorveglia il sentiero. Io sorveglio quello che c\'è in cima — e non è roba per te.',
                            'I draghi che dormono in queste rocce sono qui da prima del tuo regno. Non sanno chi sei e non gliene importa.',
                            'Sali, se vuoi. Ogni passo è più stretto del precedente.'
                        ]
                    },
                    {
                        id: 'fm-4-mountain', kind: 'duel', icona: '🪨',
                        label: 'Mountain Mage', x: 870, y: 1620,
                        characterId: 'mountainMage', difficulty: 'Medio',
                        field: 'images/fields/mobile/rovine_2.jpg'
,
                        dialogo: [
                            { chi: 'mountainMage', testo: 'Da qui in su l\'aria si fa corta. Chi non e\' abituato duella con meta\' fiato.' },
                            { io: true, testo: 'Allora sbrighiamoci.' }
                        ]
                    },
                    {
                        id: 'fm-4-atenza', kind: 'duel', icona: '🐲',
                        label: 'High Mage Atenza', x: 500, y: 1400,
                        characterId: 'highMageAtenza', difficulty: 'Difficile',
                        field: 'images/fields/mobile/rovine_2.jpg'
,
                        dialogo: [
                            { chi: 'highMageAtenza', testo: 'Sei salito. Bene: quasi nessuno arriva a vedermi in faccia.' },
                            { chi: 'highMageAtenza', testo: 'La pietra non tratta, te l\'avevo detto. Adesso te lo dimostro.' },
                            { io: true, testo: 'Anche la pietra si spacca.' }
                        ]
                    },
                    {
                        id: 'fm-4-scena-forest', kind: 'scene', icona: '🌲',
                        label: 'Gli alberi', x: 430, y: 640,
                        chi: 'High Mage Anubisius', chiId: 'highMageAnubisius',
                        testo: [
                            'Sotto questi alberi non si seppellisce nessuno, Principe: la foresta preferisce tenere i suoi morti in piedi.',
                            'Prima di servire Heishin ho passato trent\'anni a custodire tombe. Ho imparato che una tomba ben fatta non tiene dentro nessuno — tiene fuori i vivi.',
                            'Forest Mage li conta ogni sera. Da stasera ne avrà uno in più da contare.',
                            'Cammina pure sul sentiero. È l\'unico punto in cui le radici ti lasciano passare, e non è una gentilezza: è che di là si torna indietro peggio.'
                        ]
                    },
                    {
                        id: 'fm-4-forest', kind: 'duel', icona: '🍃',
                        label: 'Forest Mage', x: 700, y: 390,
                        characterId: 'forestMage', difficulty: 'Medio',
                        field: 'images/fields/mobile/anticoEgittoGiorno_2.jpg'
,
                        dialogo: [
                            { chi: 'forestMage', testo: 'Gli alberi ti hanno lasciato passare. Non fanno sempre cosi\'.' },
                            { chi: 'forestMage', testo: 'Vuol dire che vogliono vedere come va a finire.' },
                            { io: true, testo: 'Anch\'io.' }
                        ]
                    },
                    {
                        id: 'fm-4-anubisius', kind: 'duel', icona: '🐺',
                        label: 'High Mage Anubisius', x: 320, y: 270,
                        characterId: 'highMageAnubisius', difficulty: 'Difficile',
                        field: 'images/fields/mobile/anticoEgittoNotte_2.jpg'
,
                        dialogo: [
                            { chi: 'highMageAnubisius', testo: 'Il mio guardiano li contava ogni sera, i morti di questa foresta. Adesso tocca a me, e conto anche lui.' },
                            { chi: 'highMageAnubisius', testo: 'Ti disturba? Qui nessuno se ne va davvero. Restano solo in piedi.' },
                            { io: true, testo: 'Allora falli sdraiare.' }
                        ]
                    },
                    {
                        id: 'fm-4-scena-desert', kind: 'scene', icona: '🏜️',
                        label: 'La sabbia', x: 2120, y: 300,
                        chi: 'High Mage Martis', chiId: 'highMageMartis',
                        testo: [
                            'Il deserto è l\'unica delle cinque terre che non avrebbe bisogno di guardie.',
                            'Desert Mage sta là fuori soltanto perché qualcuno raccolga quello che resta.',
                            'Cammina pure, Principe. Il sole lavora per me.',
                            'Le mie macchine non hanno bisogno d\'acqua, e i miei rapaci vedono da un\'ora di marcia. Tu hai una borraccia e due gambe.',
                            'Non ho fretta. Il deserto non l\'ha mai avuta.'
                        ]
                    },
                    {
                        id: 'fm-4-desert', kind: 'duel', icona: '🦂',
                        label: 'Desert Mage', x: 2380, y: 180,
                        characterId: 'desertMage', difficulty: 'Medio',
                        field: 'images/fields/mobile/anticoEgittoGiorno_1.jpg'
,
                        dialogo: [
                            { chi: 'desertMage', testo: 'Il mio Sommo dice che sto qui per raccogliere quello che resta di chi attraversa.' },
                            { chi: 'desertMage', testo: 'Di solito ha ragione. Di solito.' },
                            { io: true, testo: 'Oggi no.' }
                        ]
                    },
                    {
                        id: 'fm-4-martis', kind: 'duel', icona: '🦅',
                        label: 'High Mage Martis', x: 2600, y: 560,
                        characterId: 'highMageMartis', difficulty: 'Difficile',
                        field: 'images/fields/mobile/anticoEgittoGiorno_1.jpg'
,
                        dialogo: [
                            { chi: 'highMageMartis', testo: 'Sei arrivato con il sole ancora alto. Non era previsto.' },
                            { chi: 'highMageMartis', testo: 'L\'Oggetto che cerchi e\' sotto la sabbia da cinquemila anni. Se lo vuoi, mettiti in fila con il deserto.' },
                            { io: true, testo: 'Il deserto puo\' aspettare. Io no.' }
                        ]
                    },
                    {
                        id: 'fm-4-scena-meadow', kind: 'scene', icona: '🌻',
                        label: 'L\'ultimo prato', x: 1150, y: 800,
                        chi: 'High Mage Kepura', chiId: 'highMageKepura',
                        testo: [
                            'Ti aspettavo prima. Gli altri quattro avevano un solo compito, e nessuno l\'ha portato a termine.',
                            'Questa è l\'ultima terra e questo è l\'ultimo Oggetto: dopo di me non resta che il palazzo.',
                            'Meadow Mage, apri il prato. Vediamo quanto gli è rimasto.',
                            'Secmeton, Atenza, Anubisius, Martis: ognuno aveva la sua terra e la sua scusa pronta. Io non ne avrò bisogno.',
                            'Qui non c\'è niente che ti ostacoli, Principe — né acqua, né pietra, né sabbia. Solo io, e questo dovrebbe preoccuparti più di tutto il resto.'
                        ]
                    },
                    {
                        id: 'fm-4-meadow', kind: 'duel', icona: '🌾',
                        label: 'Meadow Mage', x: 890, y: 900,
                        characterId: 'meadowMage', difficulty: 'Medio',
                        field: 'images/fields/mobile/anticoEgittoGiorno_2.jpg'
,
                        dialogo: [
                            { chi: 'meadowMage', testo: 'Kepura ha detto di aprirti il prato. Non ha detto di lasciarti attraversare.' },
                            { io: true, testo: 'E\' la stessa cosa, alla fine.' }
                        ]
                    },
                    {
                        id: 'fm-4-kepura', kind: 'duel', icona: '🦌',
                        label: 'High Mage Kepura', x: 620, y: 820,
                        characterId: 'highMageKepura', difficulty: 'Difficile',
                        field: 'images/fields/mobile/anticoEgittoNotte_3.jpg'
,
                        dialogo: [
                            { chi: 'highMageKepura', testo: 'Quattro terre, quattro Oggetti, e adesso sei qui. Non avrei scommesso una moneta su di te.' },
                            { chi: 'highMageKepura', testo: 'L\'ultimo lo tengo io. Dopo di me c\'e\' il palazzo, e nel palazzo c\'e\' una cosa che nemmeno Heishin guarda in faccia.' },
                            { io: true, testo: 'Un Oggetto alla volta.' }
                        ]
                    }
                ]
            },
            {
                id: 'fm-labirinto',
                nome: 'Il Dungeon del Labirinto',
                testo: 'Sotto il palazzo, dove Heishin ha scavato e ha messo a guardia ciò che non è più del tutto umano.',
                tappe: [
                    {
                        id: 'fm-5-settimo-oggetto', kind: 'scene', icona: '🔱',
                        label: 'La via per Heishin', x: 1610, y: 1060,
                        chi: 'Sacerdote Seto', chiId: 'priestSeto',
                        testo: [
                            'Hai sconfitto i cinque Sommi Maghi e recuperato sei Oggetti. Il settimo è la Barra che Heishin porta con sé.',
                            'Ora che i santuari sono senza guardiani posso mostrarti un ingresso nascosto sotto il palazzo. Conduce direttamente al Santuario Oscuro.',
                            "Sebek e Neku sorvegliano l'ultimo corridoio. Dopo di loro troverai Heishin e potrai riprenderti la Barra.",
                            'Non fermarti a chiederti perché ti sto aiutando. Liberare il regno e riunire gli Oggetti, per il momento, sono la stessa strada.'
                        ]
                    },
                    {
                        id: 'fm-5-scena', kind: 'scene', icona: '🕯️',
                        label: 'Sotto il palazzo', x: 1430, y: 1160,
                        io: true,
                        testo: [
                            'Sei Oggetti recuperati. Il settimo è sotto il palazzo, e sotto il palazzo Heishin ha scavato.',
                            'Questo posto non c\'era, quando ci vivevo. Nessun architetto di mio padre avrebbe disegnato corridoi che si piegano così.',
                            'Non li ha scavati per nascondere un Oggetto: un Oggetto si nasconde in una stanza. Questo è un labirinto, e un labirinto serve a tenere dentro qualcosa.',
                            'Quello che ha messo a guardia non è più del tutto umano.',
                            'E più scendo, più l\'aria sa di una cosa che non ho mai sentito in vita mia.'
                        ]
                    },
                    {
                        id: 'fm-5-labirinto', kind: 'duel', icona: '🧱',
                        label: 'Labyrinth Mage', x: 1650, y: 1290,
                        characterId: 'labyrinthMage', difficulty: 'Difficile',
                        field: 'images/fields/mobile/anticoEgittoNotte_2.jpg'
,
                        dialogo: [
                            { chi: 'labyrinthMage', testo: 'Sotto il palazzo non ci sono corridoi: ci sono scelte. Heishin ne ha fatte scavare a centinaia.' },
                            { chi: 'labyrinthMage', testo: 'Tu ne hai appena fatta una sbagliata.' },
                            { io: true, testo: 'Le ho contate tutte. Questa la volevo.' }
                        ]
                    },
                    {
                        id: 'fm-5-sebek', kind: 'duel', icona: '🐊',
                        label: 'Sebek', x: 1890, y: 1190,
                        characterId: 'sebek', difficulty: 'Difficile',
                        field: 'images/fields/mobile/anticoEgittoNotte_3.jpg'
,
                        dialogo: [
                            { chi: 'sebek', testo: 'Il fiume sotterraneo passa di qui. Con lui e\' arrivato anche quello che ci viveva dentro.' },
                            { chi: 'sebek', testo: 'Heishin non mi ha messo a guardia di niente. Mi ha solo lasciato la porta aperta.' },
                            { io: true, testo: 'Allora la chiudo io.' }
                        ]
                    },
                    {
                        id: 'fm-5-neku', kind: 'duel', icona: '🛡️',
                        label: 'Neku', x: 2060, y: 1330,
                        characterId: 'neku', difficulty: 'Difficile',
                        field: 'images/fields/mobile/anticoEgittoNotte_3.jpg'
,
                        dialogo: [
                            { chi: 'neku', testo: 'L\'ultimo Oggetto e\' dietro di me, e io sono l\'ultima cosa che Heishin ha messo fra te e lui.' },
                            { chi: 'neku', testo: 'Non aspettarti parole altisonanti: non ne ho piu\' da un pezzo.' },
                            { io: true, testo: 'Nemmeno io.' }
                        ]
                    }
                ]
            },
            {
                id: 'fm-palazzo',
                nome: 'Il Palazzo di Heishin',
                testo: 'Sette Oggetti su sette. Resta solo chi te li ha portati via.',
                tappe: [
                    {
                        id: 'fm-6-scena', kind: 'scene', icona: '👁️',
                        label: 'Sette su sette', x: 2380, y: 900,
                        chi: 'Heishin', chiId: 'heishin',
                        testo: [
                            'Hai ripreso i miei Oggetti uno a uno. Ammirevole. Davvero.',
                            'Cinque Alti Maghi, cinque terre, e tu che arrivi fin qui con tutti e sette addosso. Nemmeno io ci sarei riuscito.',
                            'Ma io non li ho mai voluti per me. Che me ne faccio di un trono? Ne avevo già uno a portata di mano e l\'ho lasciato vuoto.',
                            'Li ho raccolti per QUALCUN ALTRO. E adesso che sono di nuovo tutti insieme, nello stesso posto, lui può finalmente passare.',
                            'Grazie di averli portati fin qui, Principe. Hai fatto l\'ultimo pezzo di lavoro al posto mio.'
                        ]
                    },
                    {
                        id: 'fm-6-heishin', kind: 'duel', icona: '🏛️',
                        label: 'Heishin', x: 2620, y: 730,
                        characterId: 'heishin', difficulty: 'Difficile',
                        field: 'images/fields/mobile/anticoEgittoRovinePalazzo.jpg'
,
                        dialogo: [
                            { chi: 'heishin', testo: 'Sette Oggetti, di nuovo tutti in una stanza. Questa volta pero\' li ho portati io, e nel posto giusto.' },
                            { chi: 'heishin', testo: 'Credevi di venire a riprenderteli. Sei venuto a consegnarmi l\'ultimo pezzo.' },
                            { io: true, testo: 'Allora prendilo.' }
                        ]
                    },
                    {
                        id: 'fm-6-seto', kind: 'duel', icona: '🔺',
                        label: 'Sacerdote Seto', x: 2840, y: 570,
                        characterId: 'priestSeto', difficulty: 'Difficile',
                        field: 'images/fields/mobile/anticoEgittoRovinePalazzo.jpg'
,
                        dialogo: [
                            { chi: 'priestSeto', testo: 'Cinquemila anni fa ti ho aperto il tempio. Oggi sono qui a sbarrarti una porta, e non e\' piu\' la mia.' },
                            { chi: 'priestSeto', testo: 'Heishin non comanda piu\' nulla, principe. Comanda quello che ha chiamato.' },
                            { io: true, testo: 'Allora togliti di mezzo e lasciamelo vedere.' }
                        ]
                    },
                    {
                        id: 'fm-6-tradimento', kind: 'scene', icona: '😈',
                        label: 'Il tradimento', x: 3010, y: 410,
                        chi: 'DarkNite', chiId: 'darkNite',
                        testo: [
                            'Heishin mi ha chiamato. Heishin mi ha aperto la porta. Heishin non mi serve più.',
                            'Credeva di comandarmi. Tutti quelli che mi chiamano lo credono: è la prima cosa che smettono di credere.',
                            'Il suo regno, il suo colpo di stato, i suoi cinque maghi in cinque terre — piccolezze. Serviva solo che i Sette tornassero insieme, e lui ci ha messo una vita.',
                            'Tu invece sì: sei l\'unico in cinquemila anni che valga la pena di battere.',
                            'Hai attraversato due epoche per arrivare qui. Sarebbe scortese non giocare sul serio.'
                        ]
                    }
                ]
            },
            {
                id: 'fm-nitemare',
                nome: 'L\'Ultimo Duello',
                testo: 'Heishin non era il padrone: era la porta.',
                tappe: [
                    {
                        id: 'fm-7-porta', kind: 'scene', icona: '🚪',
                        label: 'Il patto rifiutato', x: 2900, y: 310,
                        chi: 'DarkNite', chiId: 'darkNite',
                        testo: [
                            'Heishin ha deposto i sette Oggetti sulla statua e mi ha chiamato, convinto che questo bastasse a comandarmi.',
                            'Ma non porta con sé la prova del patto. Non possiede più gli Oggetti: li ha consumati per aprire la porta.',
                            'Un uomo senza autorità non dà ordini a DarkNite. La sua ricompensa sarà diventare una carta e bruciare insieme alla propria ambizione.',
                            'Tu invece porti le carte che nel futuro hanno raccolto gli Oggetti. Mostramele, Principe, e difendi in duello il diritto di restare vivo.'
                        ]
                    },
                    {
                        id: 'fm-7-darknite', kind: 'duel', icona: '😈',
                        label: 'DarkNite', x: 3060, y: 210,
                        characterId: 'darkNite', difficulty: 'Difficile',
                        field: 'images/fields/mobile/anticoEgittoNotte_1.jpg'
,
                        dialogo: [
                            { chi: 'darkNite', testo: 'Cinquemila anni ad aspettare una porta, e me l\'ha aperta un uomo che voleva un trono.' },
                            { chi: 'darkNite', testo: 'Lui l\'ho gia\' dimenticato. Tu invece sei arrivato fin qui da solo: e\' molto piu\' interessante.' },
                            { io: true, testo: 'Non sono arrivato da solo. Ci sono voluti cinquemila anni e un ragazzo con un puzzle.' }
                        ]
                    },
                    {
                        id: 'fm-7-nitemare', kind: 'scene', icona: '🌑',
                        label: 'La vera forma', x: 2810, y: 120,
                        chi: 'DarkNite',
                        testo: [
                            'Quella era la forma che uso con chi non merita di vedere l\'altra.',
                            'In cinquemila anni l\'ho cambiata tre volte. Due per noia. Questa no.',
                            'Guarda bene, Principe. Non ci sarà una terza forma.',
                            'E quando avremo finito, di questa notte non resterà un testimone: né il tuo regno, né il tuo nome, né la parte di te che è arrivata fin qui dall\'altra epoca.'
                        ]
                    },
                    {
                        id: 'fm-7-finale-duello', kind: 'duel', icona: '👑',
                        label: 'Nitemare', x: 2560, y: 200,
                        characterId: 'darkNite', difficulty: 'Difficile',
                        field: 'images/fields/mobile/anticoEgittoNotte_3.jpg'
,
                        dialogo: [
                            { chi: 'darkNite', nome: 'Nitemare', testo: 'Nessuno mi aveva mai costretto a mostrare questa forma. Nessuno.' },
                            { chi: 'darkNite', nome: 'Nitemare', testo: 'Quando avro\' finito con te non resterai nemmeno nei racconti, principe. Sara\' come se il tuo nome non fosse mai esistito.' },
                            { io: true, testo: 'Il mio nome lo perdero\' comunque. Il regno no.' }
                        ]
                    },
                    {
                        id: 'fm-7-finale', kind: 'scene', icona: '🌅',
                        label: 'Le memorie', x: 2300, y: 330,
                        io: true,
                        testo: [
                            'Gli Oggetti sono di nuovo sette, e di nuovo divisi. Il regno resterà in piedi.',
                            'Di me, invece, non resterà quasi niente: nemmeno il nome. Chi rimetterà insieme il Puzzle fra cinquemila anni troverà un Faraone senza memoria.',
                            'Sarà compito suo ritrovarla.',
                            'Simon mi disse che non aveva un numero da darmi. Adesso so che erano cinquemila anni, e che li ho fatti due volte: una dormendo, una camminando all\'indietro.',
                            'Al ragazzo che ha finito il Puzzle non dirò niente. Imparerà giocando, come ho imparato io.'
                        ]
                    }
                ]
            }
        ],
        separazioni: [
            { id: 'fm-presagio-caduta', dalla: 'tappe', nuove: ['fm-2-presagio'], prima: 'fm-2-scena' },
            { id: 'fm-peso-settimo', dalla: 'tappe', nuove: ['fm-5-settimo-oggetto'], prima: 'fm-5-scena' },
            { id: 'fm-porta-darknite', dalla: 'tappe', nuove: ['fm-7-porta'], prima: 'fm-7-darknite' }
        ],
        premioFinale: { credits: 3000, starChips: 5, locatorCards: 5, millenniumCards: 4 }
    },

    {
        id: 'freedom',
        nome: 'Freedom: La Corona del Millennio',
        sottotitolo: 'Roberto Giacobbo, oltre il confine',
        icona: '🎥',
        // La valle del Nilo al tramonto: si parte dalle rovine in primo
        // piano, dove la troupe monta le telecamere, si scende nelle tombe
        // scavate nella rupe e lungo il fiume, si risale al tempio centrale
        // e al palazzo, e si finisce fra la Sfinge e le piramidi. I nodi
        // stanno su quei luoghi, nell'ordine della puntata.
        // La prima versione (`storia_freedom_1.jpeg`, 2700x1800) non è più
        // fra i candidati: altro rapporto, e i nodi di adesso ci
        // cadrebbero sopra a caso.
        sfondo: ['images/maps/storia_freedom_2.jpeg', 'images/fields/mobile/anticoEgittoGiorno_1.jpg'],
        // Il conduttore in persona: la campagna è la sua puntata, e da metà
        // in poi anche il suo problema.
        protagonista: { name: 'Roberto Giacobbo', title: 'Il conduttore', image: 'images/characters/rg.jpg', icon: '🎥' },
        descrizione: 'Una troupe televisiva scende in Egitto per girare una puntata come tante. Sotto la sabbia trova qualcosa che nessun archeologo aveva messo in conto, e il conduttore non torna a casa come ne era partito.',
        // Qui le fanmade ci stanno: e' la campagna goliardica, e
        // Giacobbo non e' materia da regolamento ufficiale.
        carteAmmesse: { origini: ['yu-gi-oh', 'fanmade'] },
        // Le misure del disegno (1672x941): le coordinate sono i suoi pixel.
        larghezza: 1672,
        altezza: 941,
        capitoli: [
            {
                id: 'freedom-riprese',
                nome: 'Si gira',
                testo: 'Egitto, permessi in regola, telecamere accese. Per ora è una puntata come le altre.',
                tappe: [
                    {
                        id: 'freedom-1-scena', kind: 'scene', icona: '🎬',
                        label: 'Prima puntata', x: 300, y: 598,
                        chi: 'Roberto Giacobbo', chiId: 'robertoGiacobbo',
                        testo: [
                            'Amici, benvenuti. Oggi siamo in Egitto, e la domanda che ci poniamo è semplice: e se quello che abbiamo letto sui libri fosse solo metà della storia?',
                            'Dietro di me c\'è un sito che nelle guide non compare. Ci hanno concesso tre giorni di riprese, e ci hanno chiesto di non filmare il settore est. Naturalmente ci andremo.',
                            'La troupe è pronta, le telecamere girano. Voi seguiteci: non si sa mai dove si finisce.',
                            'E se qualcuno, a casa, sta pensando "ma questo se le inventa"... be\', anche noi. Fino a stamattina.'
                        ]
                    },
                    {
                        id: 'freedom-1-ishizu', kind: 'duel', icona: '📿',
                        label: 'Ishizu Ishtar', x: 488, y: 640,
                        characterId: 'ishizu', difficulty: 'Medio',
                        field: 'images/fields/mobile/anticoEgittoGiorno_1.jpg'
                    },
                    {
                        id: 'freedom-1-odion', kind: 'duel', icona: '🔥',
                        label: 'Odion', x: 742, y: 772,
                        characterId: 'odion', difficulty: 'Medio',
                        field: 'images/fields/mobile/anticoEgittoGiorno_2.jpg'
                    },
                    {
                        id: 'freedom-1-shadi', kind: 'duel', icona: '🗝️',
                        label: 'Shadi', x: 1185, y: 655,
                        characterId: 'shadi', difficulty: 'Difficile',
                        field: 'images/fields/mobile/anticoEgittoNotte_1.jpg'
                    }
                ]
            },
            {
                id: 'freedom-sottosabbia',
                nome: 'Sotto la sabbia',
                testo: 'Un corridoio che nessuna mappa riporta, e una troupe che per la prima volta non sa come va a finire.',
                tappe: [
                    {
                        id: 'freedom-2-girato', kind: 'scene', icona: '📼',
                        label: 'Riguardando il girato', x: 1710, y: 720,
                        chi: 'La regista',
                        testo: [
                            "Abbiamo riguardato le immagini dei tre duelli. In campo c'era Roberto, ma nei riflessi delle custodie metalliche compariva sempre una figura più alta, con una corona.",
                            "L'audio ha registrato una seconda voce mezzo secondo prima di ogni sua frase. Diceva le stesse parole, come se gliele suggerisse.",
                            "Ho proposto di fermare le riprese. Roberto ha sorriso e ha indicato la crepa nella parete: ieri, nelle fotografie, non c'era.",
                            'La produzione vuole una puntata. Io vorrei soltanto che tutti quelli entrati qui tornassero fuori con la stessa ombra.'
                        ]
                    },
                    {
                        id: 'freedom-2-scena', kind: 'scene', icona: '🕯️',
                        label: 'Il corridoio', x: 1545, y: 610,
                        chi: 'Roberto Giacobbo', chiId: 'robertoGiacobbo',
                        testo: [
                            'Il nostro operatore ha inquadrato una crepa nella parete. Dietro la crepa, un corridoio che nessuna mappa riporta.',
                            'L\'aria che esce di là è più fredda di quella qui fuori. Di diciassette gradi, dice il termometro della troupe. Diciassette.',
                            'E poi c\'è il dettaglio che mi ha convinto: il corridoio è INTONACATO. Nessuno intonaca una cosa che non intende usare.',
                            'Vi confesso una cosa: a questo punto della puntata di solito sappiamo già come va a finire. Oggi no.'
                        ]
                    },
                    {
                        id: 'freedom-2-labirinto', kind: 'duel', icona: '🧱',
                        label: 'Labyrinth Mage', x: 1455, y: 445,
                        characterId: 'labyrinthMage', difficulty: 'Difficile',
                        field: 'images/fields/mobile/anticoEgittoNotte_2.jpg'
                    },
                    {
                        id: 'freedom-2-anubisius', kind: 'duel', icona: '🐺',
                        label: 'High Mage Anubisius', x: 1238, y: 470,
                        characterId: 'highMageAnubisius', difficulty: 'Difficile',
                        field: 'images/fields/mobile/anticoEgittoNotte_2.jpg'
                    },
                    {
                        id: 'freedom-2-sebek', kind: 'duel', icona: '🐊',
                        label: 'Sebek', x: 1045, y: 575,
                        characterId: 'sebek', difficulty: 'Difficile',
                        field: 'images/fields/mobile/anticoEgittoNotte_3.jpg'
                    }
                ]
            },
            {
                id: 'freedom-camera',
                nome: 'La camera sigillata',
                testo: 'In fondo al corridoio c\'è un oggetto che gli egittologi consultati dicono non possa esistere.',
                tappe: [
                    {
                        id: 'freedom-3-radio', kind: 'scene', icona: '📻',
                        label: 'Silenzio radio', x: 1110, y: 560,
                        chi: 'Il fonico',
                        testo: [
                            "Il segnale con l'esterno è sparito da ventitré minuti, ma nelle cuffie continuo a sentire una trasmissione.",
                            'È la voce di Roberto. Descrive una camera che non abbiamo ancora raggiunto e conta sette nicchie sulle pareti.',
                            'Ogni volta che provo a registrarla il file risulta vuoto. Ogni volta che tolgo le cuffie la voce esce dagli altoparlanti spenti.',
                            "Davanti a noi c'è una porta senza maniglia. La voce ha appena detto che Roberto sa come aprirla."
                        ]
                    },
                    {
                        id: 'freedom-3-scena', kind: 'scene', icona: '👑',
                        label: 'La Corona', x: 900, y: 440,
                        chi: 'Roberto Giacobbo', chiId: 'robertoGiacobbo',
                        testo: [
                            'Al centro della camera c\'è un oggetto che non compare in nessun catalogo: una corona.',
                            'Non è appoggiata: è sospesa. A tre centimetri dal piano, e sotto non c\'è niente. L\'abbiamo filmata da quattro angolazioni diverse per essere sicuri di non sbagliarci.',
                            'Gli egittologi che abbiamo consultato sono categorici: non può esistere.',
                            'E allora, amici, cos\'è che stiamo guardando?',
                            'Perché una cosa alla volta possiamo accettarla. Ma o si sbagliano loro, o si sbaglia la telecamera, o si sbaglia qualcos\'altro che abbiamo dato per buono fin qui.'
                        ]
                    },
                    {
                        id: 'freedom-3-isis', kind: 'duel', icona: '🔮',
                        label: 'Sacerdotessa Isis', x: 600, y: 440,
                        characterId: 'priestessIsis', difficulty: 'Difficile',
                        field: 'images/fields/mobile/anticoEgittoRovinePalazzo.jpg'
                    },
                    {
                        id: 'freedom-3-seto', kind: 'duel', icona: '🔺',
                        label: 'Sacerdote Seto', x: 392, y: 330,
                        characterId: 'priestSeto', difficulty: 'Difficile',
                        field: 'images/fields/mobile/anticoEgittoRovinePalazzo.jpg'
                    },
                    {
                        id: 'freedom-3-heishin', kind: 'duel', icona: '🏛️',
                        label: 'Heishin', x: 178, y: 212,
                        characterId: 'heishin', difficulty: 'Difficile',
                        field: 'images/fields/mobile/anticoEgittoNotte_1.jpg'
                    }
                ]
            },
            {
                id: 'freedom-corona',
                nome: 'La Corona del Millennio',
                testo: 'Quaranta minuti di girato che non sono mai andati in onda.',
                tappe: [
                    {
                        id: 'freedom-4-riflesso', kind: 'scene', icona: '🪞',
                        label: 'Il riflesso rimasto indietro', x: 245, y: 230,
                        chi: 'La troupe',
                        testo: [
                            'Roberto cammina davanti a noi, ma la sua ombra è rimasta nella camera sigillata. La vediamo ancora sul monitor della telecamera lasciata lì.',
                            'Nel corridoio non parla più. Ogni tanto muove le labbra e le luci si abbassano, come se il generatore dovesse ascoltarlo.',
                            "La Corona non è più sul piedistallo. Nessuno l'ha vista spostarsi e nessuno vuole chiedergli dove sia finita.",
                            "Poi Roberto si ferma davanti all'uscita e dice che non possiamo ancora tornare: qualcuno ci sta aspettando dall'altra parte."
                        ]
                    },
                    {
                        id: 'freedom-4-scena', kind: 'scene', icona: '⚡',
                        label: 'Fuori dal confine', x: 402, y: 122,
                        chi: 'La troupe',
                        testo: [
                            'Roberto, quella cosa non si tocca. Roberto. ROBERTO.',
                            'Il fonico giura di avergli visto allungare la mano e di non aver sentito nessun rumore, nemmeno il proprio.',
                            'Le telecamere hanno continuato a registrare per altri quaranta minuti. Quello che hanno ripreso non è mai andato in onda.',
                            'Sul nastro lui c\'è ancora, e parla. Ma non parla a noi, e non parla in italiano.',
                            'Abbiamo riportato le attrezzature al campo base. Della camera, il giorno dopo, non c\'era più nemmeno la crepa.'
                        ]
                    },
                    {
                        id: 'freedom-4-darknite', kind: 'duel', icona: '😈',
                        label: 'DarkNite', x: 665, y: 168,
                        characterId: 'darkNite', difficulty: 'Difficile',
                        field: 'images/fields/mobile/anticoEgittoNotte_3.jpg'
                    },
                    {
                        id: 'freedom-4-incoronazione', kind: 'scene', icona: '👑',
                        label: 'L’incoronazione', x: 830, y: 135,
                        chi: 'Roberto Giacobbo I', chiId: 'robertoGiacobbo',
                        testo: [
                            'DarkNite è caduto, ma la sua ombra non è scomparsa. È salita lungo le pareti e si è raccolta sopra la mia testa.',
                            'Adesso capisco la Corona: non cercava un faraone, cercava qualcuno disposto a fare domande anche quando la risposta divora chi la pronuncia.',
                            'Voi vedete ancora Roberto Giacobbo. Io vedo tutti i corridoi insieme, quelli scavati e quelli che esisteranno soltanto fra mille anni.',
                            'Per uscire dovrete affrontarmi. Non per liberarmi: per dimostrare che siete ancora capaci di distinguermi da ciò che ho trovato.'
                        ]
                    },
                    {
                        id: 'freedom-4-giacobbo', kind: 'duel', icona: '🎥',
                        label: 'Roberto Giacobbo I', x: 990, y: 105,
                        characterId: 'robertoGiacobbo', difficulty: 'Difficile',
                        field: 'images/fields/mobile/anticoEgittoRovinePalazzo.jpg'
                    },
                    {
                        id: 'freedom-4-finale', kind: 'scene', icona: '☀️',
                        label: 'Titoli di coda', x: 1548, y: 112,
                        chi: 'Roberto Giacobbo I', chiId: 'robertoGiacobbo',
                        testo: [
                            'Amici, la puntata finisce qui. Io, temo, no.',
                            'La Corona ha scelto, e certe domande è meglio farsele da questa parte del confine.',
                            'Ho passato trent\'anni a chiedermi cosa ci fosse dall\'altra parte delle pareti. Nessuno mi aveva avvertito che le pareti hanno un\'opinione in merito.',
                            'Alla troupe dico solo questo: montate la puntata, mandatela in onda, e tagliate gli ultimi quaranta minuti. Non per censura — perché non li capirebbe nessuno.',
                            'Alla prossima. Anche se "prossima", ormai, per me vuol dire un\'altra cosa.'
                        ]
                    }
                ]
            }
        ],
        separazioni: [
            { id: 'freedom-girato-anomalo', dalla: 'tappe', nuove: ['freedom-2-girato'], prima: 'freedom-2-scena' },
            { id: 'freedom-silenzio-radio', dalla: 'tappe', nuove: ['freedom-3-radio'], prima: 'freedom-3-scena' },
            { id: 'freedom-riflesso', dalla: 'tappe', nuove: ['freedom-4-riflesso'], prima: 'freedom-4-scena' },
            { id: 'freedom-incoronazione', dalla: 'tappe', nuove: ['freedom-4-incoronazione'], prima: 'freedom-4-giacobbo' }
        ],
        premioFinale: { credits: 2500, starChips: 4, locatorCards: 4, millenniumCards: 2 }
    },

    // Le campagne ancora da scrivere. Dichiarate qui, senza capitoli: la
    // pagina le mostra bloccate con la loro descrizione, che e' piu'
    // onesto (e piu' utile) che non nominarle affatto. Scriverle vuol dire
    // riempire `capitoli`, e nient'altro da nessuna parte.
    {
        id: 'ww1',
        nome: 'Grande Guerra',
        sottotitolo: 'Il fronte italiano, 1915-1918',
        icona: '🎖️',
        // Nessun livello Facile/Normale/Difficile (vedi LIVELLI in
        // js/story/story-progress.js), per scelta esplicita dell'utente: i
        // mazzi della Grande Guerra sono congelati e non hanno tre versioni,
        // quindi ogni duello resta alla difficoltà scritta sulla sua tappa.
        senzaLivelli: true,
        // La mappa disegnata del fronte italiano. Il nome del file non
        // segue la convenzione `storia_<id>_1.jpeg` (l'id della campagna è
        // 'ww1', il file si chiama col nome per esteso): resta com'è
        // arrivato invece di rinominarlo, e il nome canonico gli sta
        // dietro come secondo candidato — così un file messo lì domani con
        // quel nome funziona lo stesso, senza toccare niente.
        sfondo: [
            'images/maps/storia_la_grande_guerra_1.jpeg',
            'images/maps/storia_ww1_1.jpeg',
            'images/fields/mobile/rovine_2.jpg'
        ],
        // Due canti del fronte italiano invece della colonna sonora di
        // Yu-Gi-Oh: uno sulla mappa, l'altro sotto i duelli.
        musica: 'ww1/Alba sul Montello.mp3',
        musicaDuello: 'ww1/La carica del Piave.mp3',
        // E un campo di battaglia della guerra sotto ogni duello, invece
        // delle arene di Yu-Gi-Oh: quello di GIORNO, perché di giorno si
        // combatte quasi ogni battaglia della campagna. Le poche che il
        // testo colloca di notte (il Carso "sotto la luna", l'arrivo a
        // Trieste "stasera") dichiarano il campo notturno sulla tappa, e
        // lì vince il loro.
        campoDuello: 'images/fields/mobile/grandeGuerraCampoDiBattagliaGiorno.jpg',
        // Chi gioca è il Comando Supremo, cioè il suo capo: Cadorna per
        // i primi quattro capitoli (è lui al comando dall'Isonzo alla rotta
        // di Caporetto), Diaz dal Piave in poi — vedi WW1_COMANDANTI in
        // cima al file. Qui il valore di partenza; i capitoli di Diaz e la
        // tappa del passaggio di comando dichiarano il loro.
        protagonista: WW1_COMANDANTI.cadorna,
        // La descrizione parla della GUERRA, non del set di carte: quella
        // che c'era prima ("campagna a tema, con il set dedicato già
        // presente nel gioco") raccontava lo stato del database al
        // giocatore, che è l'unica persona a cui non interessa.
        descrizione: 'Tre anni e mezzo su una linea che nessuno aveva mai pensato di dover attaccare: undici battaglie sull\'Isonzo per pochi chilometri di carso, la Strafexpedition che scende dagli Altipiani alle spalle, la rotta di Caporetto, e poi un fiume dietro cui non c\'era più niente su cui fermarsi. Si gioca col Regio Esercito — fanti, Alpini, Bersaglieri, Arditi, con Baracca nel cielo — al comando prima di Cadorna, poi di Diaz.',
        // Solo il set WW1, e solo lo schieramento italiano: la
        // campagna e' raccontata da quella parte del fronte, e al
        // Piave non si schierano i Kaiserjager.
        carteAmmesse: { origini: ['ww1'], fazione: 'italiana' },
        // Il mazzo con cui si gioca: senza dirlo, un giocatore che apre
        // questa campagna si becca il divieto e non sa cosa farsene.
        mazzoConsigliato: 'ww1_regio_esercito',
        // Il mondo ha il rapporto della mappa (1672x940, cioè 16:9): steso
        // su proporzioni diverse il fronte si deformerebbe, e un fiume
        // storto su una carta geografica si vede subito.
        larghezza: 3200,
        altezza: 1800,
        capitoli: [
            {
                id: 'ww1-isonzo',
                nome: 'L\'Isonzo',
                testo: 'Maggio 1915: si passa il confine. Quattro battaglie in sette mesi per il Monte Nero e il Carso.',
                tappe: [
                    {
                        id: 'ww1-1-scena', kind: 'scene', icona: '📯',
                        label: '24 maggio 1915', x: 2527, y: 479,
                        // Il Comando Supremo È il protagonista: parla
                        // Cadorna, col suo volto (vedi WW1_COMANDANTI).
                        io: true,
                        testo: [
                            'Si entra in guerra il 24 maggio. Il fronte è una linea di montagne che nessuno ha mai pensato di dover attaccare.',
                            'Seicento chilometri di confine, e per trent\'anni li abbiamo studiati come una frontiera da difendere, non da passare. Le carte buone le ha l\'altro.',
                            'Di là c\'è l\'Isonzo, e dietro l\'Isonzo c\'è Boroević.',
                            'Ci vorranno undici battaglie per capire quanto è caro quel fiume. Alla prima nessuno lo sa ancora, e si parte pensando di essere a Trieste per l\'autunno.',
                            'Avanti, allora. Il Monte Nero prima che faccia buio.'
                        ]
                    },
                    {
                        id: 'ww1-1-boroevic', kind: 'duel', icona: '🦁',
                        label: 'La linea dell\'Isonzo', x: 2756, y: 670,
                        characterId: 'ww1_boroevic', difficulty: 'Medio',
                        dialogo: [
                            { chi: 'ww1_boroevic', testo: 'Avete dichiarato guerra il 23 e attaccato il 24. Un giorno intero: gentile da parte vostra.' },
                            { io: true, testo: 'Ci hanno detto che il fiume si passa in una settimana.' },
                            { chi: 'ww1_boroevic', testo: 'Ve l\'hanno detto uomini che l\'Isonzo l\'hanno visto solo su una carta. Io ci vivo sopra da un mese, e ogni pietra è dove l\'ho messa io.' }
                        ]
                    },
                    {
                        id: 'ww1-1-kaiserjager', kind: 'duel', icona: '⛰️',
                        label: 'Il Carso', x: 3024, y: 756,
                        characterId: 'ww1_kaiserjager', difficulty: 'Medio',
                        // Di notte: "Allora avanzeremo di notte" — "il sasso è bianco sotto la luna".
                        field: 'images/fields/mobile/grandeGuerraCampoDiBattagliaNotte.jpg',
                        dialogo: [
                            { chi: 'ww1_kaiserjager', testo: 'Il Carso non è terra: è sasso. Non si scava, si fa saltare — e ogni granata moltiplica le schegge per cento.' },
                            { io: true, testo: 'Allora avanzeremo di notte.' },
                            { chi: 'ww1_kaiserjager', testo: 'Di notte il sasso è bianco sotto la luna, e voi sopra siete neri. Venite pure.' }
                        ]
                    },
                    {
                        id: 'ww1-1-arigi', kind: 'duel', icona: '✈️',
                        label: 'Cieli dell\'Isonzo', x: 2871, y: 900,
                        characterId: 'ww1_arigi', difficulty: 'Medio',
                        dialogo: [
                            { chi: 'ww1_arigi', testo: 'Sono un sergente, non un barone. Volo da quando voi ancora contavate i cavalli.' },
                            { io: true, testo: 'E cosa vedi, da lassù?' },
                            { chi: 'ww1_arigi', testo: 'Vedo le vostre trincee come una riga di matita, e i vostri rincalzi che salgono in fila. Vedo tutto quello che i vostri generali credono nascosto.' }
                        ]
                    }
                ]
            },
            {
                id: 'ww1-strafexpedition',
                nome: 'La Strafexpedition',
                testo: 'Maggio 1916: l\'attacco scende dagli Altipiani alle spalle del fronte. Se arriva in pianura, la guerra finisce.',
                tappe: [
                    {
                        id: 'ww1-2-scena', kind: 'scene', icona: '🏔️',
                        label: 'Da Trento, maggio 1916', x: 612, y: 670,
                        chi: 'Conrad von Hötzendorf', chiId: 'ww1_conrad',
                        testo: [
                            'La chiamano "spedizione punitiva", e il nome è esatto: l\'Italia ha tradito la Triplice Alleanza e va punita.',
                            'Ho tolto quattordici divisioni al fronte russo per averne abbastanza quassù. I tedeschi mi hanno detto che è una follia. I tedeschi non sono mai stati nostri alleati per davvero.',
                            'Scendiamo dagli Altipiani alle loro spalle. Se arriviamo in pianura, tutto il fronte dell\'Isonzo resta tagliato fuori e la guerra finisce in un mese.',
                            'Duemila cannoni su un fronte di quaranta chilometri. Ad Asiago non resterà in piedi un muro.',
                            'È l\'offensiva che chiedo da cinque anni. Se riesce, nessuno ricorderà che l\'ho chiesta tardi.'
                        ]
                    },
                    {
                        id: 'ww1-2-conrad', kind: 'duel', icona: '🗺️',
                        label: 'La Valsugana', x: 766, y: 823,
                        characterId: 'ww1_conrad', difficulty: 'Medio',
                        dialogo: [
                            { chi: 'ww1_conrad', testo: 'Questa offensiva la volevo nel 1911, quando eravate ancora alleati. Mi dissero che era prematura.' },
                            { io: true, testo: 'E adesso?' },
                            { chi: 'ww1_conrad', testo: 'Adesso è tardi di cinque anni, e la faccio lo stesso. Scendo dagli Altipiani: sotto di voi, non davanti.' }
                        ]
                    },
                    {
                        id: 'ww1-2-kaiserjager', kind: 'duel', icona: '⛰️',
                        label: 'Altopiano dei Sette Comuni', x: 1148, y: 948,
                        characterId: 'ww1_kaiserjager', difficulty: 'Difficile',
                        dialogo: [
                            { chi: 'ww1_kaiserjager', testo: 'Asiago è cenere. Da qui alla pianura c\'è solo il ciglio dell\'altopiano, e dietro il ciglio non avete più niente.' },
                            { io: true, testo: 'Abbiamo la Prima Armata. E abbiamo il ciglio.' },
                            { chi: 'ww1_kaiserjager', testo: 'Allora tenetelo. Perché se cede qui, l\'Isonzo non serve più a nessuno.' }
                        ]
                    }
                ]
            },
            {
                id: 'ww1-gorizia',
                nome: 'Gorizia e la Bainsizza',
                testo: 'Agosto 1916: cade la prima città. Un anno dopo si arriva sull\'altopiano della Bainsizza, e lì ci si ferma.',
                tappe: [
                    {
                        id: 'ww1-3-scena', kind: 'scene', icona: '🏅',
                        label: '9 agosto 1916: Gorizia', x: 2622, y: 871,
                        chi: 'Il Bollettino',
                        testo: [
                            'La Strafexpedition si è fermata sugli Altipiani, e la Terza Armata è tornata sull\'Isonzo in dieci giorni di treni.',
                            'Sabotino, Podgora, e poi il ponte. Per la prima volta in quattordici mesi una città è caduta: Gorizia è nostra.',
                            'È la prima vittoria che si possa chiamare così. Ne servono ancora molte.',
                            'Perché oltre Gorizia comincia la Bainsizza, e oltre la Bainsizza comincia un altro altopiano, e così via fino a Lubiana.',
                            'Un anno dopo saremo lassù, con centoquarantamila uomini in meno e venti chilometri in più. Questo il bollettino di oggi non lo dice.'
                        ]
                    },
                    {
                        id: 'ww1-3-eugenio', kind: 'duel', icona: '🎖️',
                        label: 'La testa di ponte', x: 2440, y: 881,
                        characterId: 'ww1_eugenio', difficulty: 'Difficile',
                        dialogo: [
                            { chi: 'ww1_eugenio', testo: 'Vi lascio Gorizia. Una città vuota, con le finestre aperte e nessuno dentro.' },
                            { io: true, testo: 'È comunque la prima.' },
                            { chi: 'ww1_eugenio', testo: 'È la prima, sì. E dietro ce ne sono altre venti, ognuna con un altare di sassi davanti. Contate pure.' }
                        ]
                    },
                    {
                        id: 'ww1-3-boroevic', kind: 'duel', icona: '🦁',
                        label: 'L\'altopiano della Bainsizza', x: 2393, y: 661,
                        characterId: 'ww1_boroevic', difficulty: 'Difficile',
                        dialogo: [
                            { io: true, testo: 'Undicesima battaglia. Siamo sulla Bainsizza: l\'altopiano è nostro.' },
                            { chi: 'ww1_boroevic', testo: 'L\'altopiano è vostro perché io mi sono ritirato sulla linea dietro. Voi avete preso venti chilometri di sassi e centoquarantamila uomini in meno.' },
                            { chi: 'ww1_boroevic', testo: 'E adesso siete lunghi, stanchi e senza strade. È esattamente dove vi volevo.' }
                        ]
                    }
                ]
            },
            {
                id: 'ww1-caporetto',
                nome: 'Caporetto',
                testo: '24 ottobre 1917: dodici giorni, centocinquanta chilometri indietro, e un fiume dietro cui non c\'è più niente.',
                tappe: [
                    {
                        id: 'ww1-4-scena', kind: 'scene', icona: '🌧️',
                        label: '24 ottobre 1917', x: 1866, y: 632,
                        chi: 'Svetozar Boroević', chiId: 'ww1_boroevic',
                        testo: [
                            'Nebbia, gas, e una manovra che nessuno si aspetta dal punto in cui la facciamo: non sul Carso, dove vi siete preparati per due anni. Quassù, a Plezzo e a Tolmino.',
                            'E non veniamo soli: per la prima volta in questa guerra ci sono sette divisioni tedesche accanto alle mie.',
                            'Non sfondiamo la linea: ci passiamo dentro e proseguiamo, lasciandovi i capisaldi alle spalle. Le vostre riserve sono ammassate troppo avanti, e non serviranno a niente.',
                            'In dodici giorni un intero esercito in rotta. Non l\'abbiamo battuto: l\'abbiamo scavalcato.',
                            'Trecentomila prigionieri, e mezzo milione di persone sulle strade che non sono soldati. Non è più una battaglia, è un paese che si sposta.'
                        ]
                    },
                    {
                        id: 'ww1-4-brumowski', kind: 'duel', icona: '🛩️',
                        label: 'Sopra la rotta', x: 2086, y: 766,
                        characterId: 'ww1_brumowski', difficulty: 'Difficile',
                        dialogo: [
                            { chi: 'ww1_brumowski', testo: 'Ho volato basso sulle strade per Udine. Non ho contato soldati: ho contato carri, muli, donne e bambini. Una fila lunga un giorno di volo.' },
                            { io: true, testo: 'Quella è gente che scappa, non un esercito.' },
                            { chi: 'ww1_brumowski', testo: 'Lo so. È per questo che non ho sparato. Ma il prossimo che passa di qui sparerà.' }
                        ]
                    },
                    {
                        id: 'ww1-4-kaiserjager', kind: 'duel', icona: '⛰️',
                        label: 'La retroguardia', x: 2144, y: 1072,
                        characterId: 'ww1_kaiserjager', difficulty: 'Difficile',
                        dialogo: [
                            { io: true, testo: 'Ordine: tenere il ponte finché non è passata la Seconda Armata. Poi farlo saltare.' },
                            { chi: 'ww1_kaiserjager', testo: 'Sapete quanto vi resta? Due ore. E lo sapete anche voi che nessuno viene a darvi il cambio.' },
                            { io: true, testo: 'Due ore ci bastano.' }
                        ]
                    },
                    {
                        id: 'ww1-4-ritirata', kind: 'scene', icona: '🌊',
                        label: 'Novembre 1917: il Piave', x: 1493, y: 1503,
                        // Il passaggio di comando: il 9 novembre 1917
                        // Diaz sostituisce Cadorna. Questa tappa sta ancora
                        // nel capitolo di Caporetto, ma a parlare è già lui,
                        // ed è da qui che il volto del protagonista cambia.
                        protagonista: WW1_COMANDANTI.diaz,
                        io: true,
                        testo: [
                            'Ci siamo fermati sul Piave perché dietro il Piave non c\'è più niente su cui fermarsi.',
                            'Da qui non si arretra di un metro. Non è retorica: è che non c\'è un altro fiume.',
                            'Il Grappa ha tenuto per tutto dicembre, e i ragazzi del \'99 hanno diciott\'anni.',
                            'Adesso la linea è corta: dallo Stelvio al mare erano seicento chilometri, adesso sono poco più di duecento. Li possiamo tenere tutti.',
                            'E la difendiamo diversamente da prima. Meno ordini da lontano, più licenze, più caffè, meno fucilazioni. Un esercito che sa perché è lì si fa tenere meglio di uno che ha solo paura del proprio comando.'
                        ]
                    }
                ]
            },
            {
                id: 'ww1-piave',
                nome: 'La Battaglia del Solstizio',
                testo: 'Giugno 1918: l\'ultimo attacco che l\'Impero può ancora permettersi. Nove giorni, e il fiume in piena.',
                // Dal Piave alla fine, al comando c'è Diaz.
                protagonista: WW1_COMANDANTI.diaz,
                tappe: [
                    {
                        id: 'ww1-5-scena', kind: 'scene', icona: '🌙',
                        label: '15 giugno 1918', x: 2354, y: 1273,
                        io: true,
                        testo: [
                            'Sanno che attaccano, sappiamo che attaccano, e sappiamo anche l\'ora: i disertori cechi l\'hanno detta a memoria.',
                            'Alle due e mezza la nostra artiglieria spara per prima, sulle loro trincee ancora piene. Poi si vedrà.',
                            'Se regge il Piave, non è più questione di se finisce, ma di quando.',
                            'Perché loro attaccano in due direzioni per non scontentare nessuno dei due comandanti, e chi attacca in due direzioni non ne sfonda nessuna.',
                            'E dietro di loro c\'è un fiume che in questa stagione può salire di due metri in una notte. I ponti li abbiamo studiati uno per uno.'
                        ]
                    },
                    {
                        id: 'ww1-5-eugenio', kind: 'duel', icona: '🎖️',
                        label: 'Il basso Piave', x: 2029, y: 1360,
                        characterId: 'ww1_eugenio', difficulty: 'Difficile',
                        dialogo: [
                            { chi: 'ww1_eugenio', testo: 'Abbiamo passato il fiume in tre punti. Ci siamo dentro per otto chilometri.' },
                            { io: true, testo: 'Dentro, sì. Con il fiume alle spalle e i ponti sotto il nostro tiro.' },
                            { chi: 'ww1_eugenio', testo: '...e con la piena che sale da stanotte. Sì. Ho fatto i conti anch\'io.' }
                        ]
                    },
                    // Le tre tappe risalgono il fiume da valle verso monte,
                    // e sono in quest'ordine per quello: l'offensiva
                    // avvenne tutta insieme lungo tutto il Piave, quindi
                    // nessuna cronologia impone una sequenza — a decidere
                    // resta allora la mappa, e un percorso che va e torna
                    // indietro sulla stessa riva si legge come un errore.
                    {
                        id: 'ww1-5-brumowski', kind: 'duel', icona: '🛩️',
                        label: 'Sopra i ponti', x: 1378, y: 1149,
                        characterId: 'ww1_brumowski', difficulty: 'Difficile',
                        dialogo: [
                            { chi: 'ww1_brumowski', testo: 'Ottantacinque aerei sul Montello stamattina. I ponti vanno protetti: se saltano, la testa di ponte muore di fame in due giorni.' },
                            { io: true, testo: 'Allora saltano oggi.' },
                            { chi: 'ww1_brumowski', testo: 'Ci provate da tre giorni. Ma oggi avete anche il fiume dalla vostra: è salito di due metri in una notte.' }
                        ]
                    },
                    {
                        id: 'ww1-5-conrad', kind: 'duel', icona: '🗺️',
                        label: 'Il Montello', x: 1225, y: 1302,
                        characterId: 'ww1_conrad', difficulty: 'Difficile',
                        dialogo: [
                            { chi: 'ww1_conrad', testo: 'Ho chiesto un solo attacco, concentrato. Mi hanno dato due offensive separate, una mia e una di Boroević, per non offendere nessuno.' },
                            { io: true, testo: 'E così ne avete due deboli invece di una forte.' },
                            { chi: 'ww1_conrad', testo: 'Questo è un impero, non un esercito. Si perde anche per cortesia.' }
                        ]
                    }
                ]
            },
            {
                id: 'ww1-vittorioveneto',
                nome: 'Vittorio Veneto',
                testo: '24 ottobre 1918: un anno esatto dopo Caporetto, stesso giorno. Questa volta attacchiamo noi.',
                protagonista: WW1_COMANDANTI.diaz,
                tappe: [
                    {
                        id: 'ww1-6-scena', kind: 'scene', icona: '⚔️',
                        label: '24 ottobre 1918', x: 823, y: 1340,
                        io: true,
                        testo: [
                            'Un anno esatto dopo Caporetto, stesso giorno. Questa volta attacchiamo noi.',
                            'La Quarta Armata parte dal Grappa e tiene lì le loro riserve; le altre passano il Piave più a valle e puntano a Vittorio Veneto, che è la cerniera fra i loro due eserciti.',
                            'L\'esercito che abbiamo davanti è ancora forte sulla carta. Sulla carta.',
                            'Nei fatti gli ungheresi chiedono di tornare a casa, i cechi hanno un governo nuovo a cui rispondere, e i reggimenti si sciolgono da soli prima che li tocchiamo.',
                            'Fra dodici giorni si firma a Villa Giusti. Nessuno di noi, stamattina, lo sa ancora.'
                        ]
                    },
                    {
                        id: 'ww1-6-kaiserjager', kind: 'duel', icona: '⛰️',
                        label: 'Il Monte Grappa', x: 785, y: 1130,
                        characterId: 'ww1_kaiserjager', difficulty: 'Difficile',
                        dialogo: [
                            { chi: 'ww1_kaiserjager', testo: 'Sul Grappa non passate. Ci abbiamo provato noi un anno fa e non siamo passati; adesso tocca a voi non passare.' },
                            { io: true, testo: 'Non dobbiamo passare. Dobbiamo tenervi qui.' },
                            { chi: 'ww1_kaiserjager', testo: '...tutte le riserve. Su una montagna. Mentre gli altri passano il fiume. Chi ve l\'ha insegnato?' },
                            { io: true, testo: 'Voi. A Caporetto.' }
                        ]
                    },
                    {
                        id: 'ww1-6-boroevic', kind: 'duel', icona: '🦁',
                        label: 'Vittorio Veneto', x: 1034, y: 1168,
                        characterId: 'ww1_boroevic', difficulty: 'Difficile',
                        dialogo: [
                            { chi: 'ww1_boroevic', testo: 'Ho chiesto rinforzi a Vienna. Mi hanno risposto che gli ungheresi tornano a casa a fare il raccolto, e i cechi hanno un parlamento nuovo.' },
                            { io: true, testo: 'Siamo passati fra le vostre due armate. La linea è tagliata in due.' },
                            { chi: 'ww1_boroevic', testo: 'Ho tenuto quel fiume per tre anni e mezzo contro undici battaglie. Non mi batte il vostro esercito: mi batte il mio, che non esiste più.' }
                        ]
                    },
                    {
                        id: 'ww1-6-eugenio', kind: 'duel', icona: '🎖️',
                        label: 'Verso Trieste', x: 2833, y: 1177,
                        characterId: 'ww1_eugenio', difficulty: 'Difficile',
                        // Di notte: "voi arrivate a Trieste stasera".
                        field: 'images/fields/mobile/grandeGuerraCampoDiBattagliaNotte.jpg',
                        dialogo: [
                            { chi: 'ww1_eugenio', testo: 'A Villa Giusti stanno firmando. Fra poche ore questo non sarà più un fronte, sarà un confine.' },
                            { io: true, testo: 'Allora perché combattere ancora?' },
                            { chi: 'ww1_eugenio', testo: 'Perché l\'armistizio entra in vigore domani alle quindici, e voi arrivate a Trieste stasera. Un impero si perde anche così, per una questione di orari.' }
                        ]
                    },
                    {
                        id: 'ww1-6-bollettino', kind: 'scene', icona: '📜',
                        label: '4 novembre 1918', x: 3043, y: 996,
                        chi: 'Il Bollettino della Vittoria',
                        testo: [
                            'La guerra contro l\'Austria-Ungheria è vinta.',
                            'La battaglia gigantesca, ingaggiata il 24 ottobre, è terminata con la resa incondizionata del nemico.',
                            'I resti di quello che fu uno dei più potenti eserciti del mondo risalgono in disordine e senza speranza le valli che avevano disceso con orgogliosa sicurezza.',
                            'Firmato: Armando Diaz.'
                        ]
                    }
                ]
            }
        ],
        premioFinale: { credits: 2500, starChips: 4, locatorCards: 4, millenniumCards: 2 }
    },
    {
        id: 'ww2',
        nome: 'Seconda Guerra Mondiale',
        sottotitolo: 'Campagna extra',
        icona: '✈️',
        // Come la Grande Guerra: una storia di guerra, senza livelli.
        senzaLivelli: true,
        sfondo: ['images/maps/storia_ww2_1.jpeg', 'images/fields/mobile/rovine_2.jpg'],
        // A differenza della Grande Guerra, un set di carte dedicato alla
        // Seconda NON esiste ancora: la descrizione non lo promette.
        descrizione: 'Campagna a tema Seconda Guerra Mondiale, seguito ideale della Grande Guerra.',
        carteAmmesse: { origini: ['ww2'] },
        larghezza: 1400,
        altezza: 1200,
        capitoli: [],
        premioFinale: null
    }
];

window.storyCampaignsDatabase = storyCampaignsDatabase;
