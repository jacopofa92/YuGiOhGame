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
 * suonato il resto del gioco. `music` su una singola tappa, se c'è,
 * vince su `musicaDuello` — serve per il duello che merita un tema suo
 * (lo scontro finale) dentro una campagna che per il resto ne ha uno
 * solo.
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
const storyCampaignsDatabase = [
    {
        id: 'anime',
        nome: 'Il Regno delle Ombre',
        sottotitolo: 'La storia di Yugi Muto',
        icona: '🧩',
        // Sfondo della mappa: la stessa immagine usata come arena, così la
        // campagna ha l'aria del mondo in cui si gioca.
        sfondo: ['images/maps/storia_anime_1.jpeg', 'images/fields/mobile/rovine_1.jpg'],
        // A duellare non è Yugi: è l'altro, quello che si sveglia quando il
        // Puzzle è al collo. È tutto il punto della serie.
        protagonista: { name: 'Yami Yugi', title: 'Il Re dei Giochi', image: 'images/characters/yamiYugi.jpg', icon: '🧩' },
        descrizione: 'Dal giorno in cui Yugi completa il Puzzle del Millennio fino al Duello Cerimoniale: il Regno dei Duellanti, Battle City e tutto quello che c\'è in mezzo.',
        // Solo Yu-Gi-Oh: e' la storia del gioco vero, e un Bersagliere
        // in mezzo al Regno dei Duellanti la spezzerebbe.
        carteAmmesse: { origini: ['yu-gi-oh'] },
        larghezza: 1400,
        altezza: 2600,
        capitoli: [
            {
                id: 'puzzle',
                nome: 'Il Puzzle del Millennio',
                testo: 'Il negozio del nonno e le prime regole, imparate contro chi ti vuole bene prima che contro chi non ti conosce.',
                tappe: [
                    {
                        id: 'anime-1-scena', kind: 'scene', icona: '🧩',
                        label: 'Otto anni dopo', x: 200, y: 2450,
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
                        id: 'anime-1-nonno', kind: 'duel', icona: '🎴',
                        label: 'Nonno Solomon', x: 460, y: 2330,
                        characterId: 'solomonMuto', difficulty: 'Medio'
                    },
                    {
                        id: 'anime-1-joey', kind: 'duel', icona: '🎲',
                        label: 'Joey Wheeler', x: 720, y: 2400,
                        characterId: 'joey', difficulty: 'Medio'
                    },
                    {
                        id: 'anime-1-tristan', kind: 'duel', icona: '🔧',
                        label: 'Tristan Taylor', x: 960, y: 2290,
                        characterId: 'tristan', difficulty: 'Medio'
                    },
                    {
                        id: 'anime-1-tea', kind: 'duel', icona: '💫',
                        label: 'Téa Gardner', x: 1180, y: 2380,
                        characterId: 'tea', difficulty: 'Medio'
                    }
                ]
            },
            {
                id: 'regno',
                nome: 'Il Regno dei Duellanti',
                testo: 'L\'isola di Pegasus: otto duellanti fra te e il castello, e due Stelle dell\'Esagono che non bastano mai.',
                tappe: [
                    {
                        id: 'anime-2-scena', kind: 'scene', icona: '🏝️',
                        label: 'L\'invito', x: 1150, y: 2120,
                        chi: 'Maximillion Pegasus', chiId: 'pegasus',
                        testo: [
                            'Un videotape, un invito e un nonno che non si sveglia più.',
                            'Sul nastro c\'era il duello, e alla fine del duello l\'anima di Solomon Muto dentro una cassetta. Non una minaccia: una ricevuta.',
                            'L\'isola di Pegasus aspetta, e le Stelle dell\'Esagono non si regalano a nessuno: due per entrare nel castello, e nessuno che te le presti.',
                            'Al molo sbarcano in centinaia. Alla fine del torneo resterà un solo duellante in piedi, e sarà quello che Pegasus ha invitato per primo.',
                            'Sali sulla nave, Yugi. Il tuo nonno è già arrivato prima di te.'
                        ]
                    },
                    {
                        id: 'anime-2-weevil', kind: 'duel', icona: '🐛',
                        label: 'Weevil Underwood', x: 900, y: 2010,
                        characterId: 'weevil', difficulty: 'Medio'
                    },
                    {
                        id: 'anime-2-rex', kind: 'duel', icona: '🦖',
                        label: 'Rex Raptor', x: 640, y: 1930,
                        characterId: 'rex', difficulty: 'Medio'
                    },
                    {
                        id: 'anime-2-mako', kind: 'duel', icona: '🌊',
                        label: 'Mako Tsunami', x: 380, y: 1840,
                        characterId: 'mako', difficulty: 'Medio'
                    },
                    {
                        id: 'anime-2-panik', kind: 'duel', icona: '🕯️',
                        label: 'Panik', x: 260, y: 1660,
                        characterId: 'panik', difficulty: 'Difficile'
                    },
                    {
                        id: 'anime-2-mai', kind: 'duel', icona: '🦋',
                        label: 'Mai Valentine', x: 520, y: 1570,
                        characterId: 'mai', difficulty: 'Difficile'
                    },
                    {
                        id: 'anime-2-keith', kind: 'duel', icona: '🇺🇸',
                        label: 'Bandit Keith', x: 800, y: 1640,
                        characterId: 'bandit_keith', difficulty: 'Difficile'
                    },
                    {
                        id: 'anime-2-kaiba', kind: 'duel', icona: '🐉',
                        label: 'Seto Kaiba', x: 1060, y: 1520,
                        characterId: 'kaiba', difficulty: 'Difficile'
                    },
                    {
                        id: 'anime-2-pegasus', kind: 'duel', icona: '👁️',
                        label: 'Maximillion Pegasus', x: 1200, y: 1330,
                        characterId: 'pegasus', difficulty: 'Difficile'
                    }
                ]
            },
            {
                id: 'battlecity',
                nome: 'Battle City',
                testo: 'Kaiba apre la città e mette in palio le carte più rare. Fra gli iscritti c\'è chi non è venuto per il torneo.',
                tappe: [
                    {
                        id: 'anime-3-scena', kind: 'scene', icona: '🏙️',
                        label: 'Domino City', x: 960, y: 1180,
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
                        id: 'anime-3-espa', kind: 'duel', icona: '🔮',
                        label: 'Espa Roba', x: 700, y: 1090,
                        characterId: 'espaRoba', difficulty: 'Medio'
                    },
                    {
                        id: 'anime-3-arkana', kind: 'duel', icona: '🎭',
                        label: 'Arkana', x: 440, y: 1170,
                        characterId: 'arkana', difficulty: 'Difficile'
                    },
                    {
                        id: 'anime-3-bakura', kind: 'duel', icona: '💍',
                        label: 'Ryo Bakura', x: 250, y: 1010,
                        characterId: 'bakura', difficulty: 'Difficile'
                    },
                    {
                        id: 'anime-3-ishizu', kind: 'duel', icona: '📿',
                        label: 'Ishizu Ishtar', x: 480, y: 890,
                        characterId: 'ishizu', difficulty: 'Difficile'
                    },
                    {
                        id: 'anime-3-odion', kind: 'duel', icona: '🔥',
                        label: 'Odion', x: 760, y: 820,
                        characterId: 'odion', difficulty: 'Difficile'
                    }
                ]
            },
            {
                id: 'finale',
                nome: 'La Finale di Battle City',
                testo: 'Otto duellanti su un dirigibile, e sotto nessun posto dove scendere.',
                tappe: [
                    {
                        id: 'anime-4-scena', kind: 'scene', icona: '🛩️',
                        label: 'Sul dirigibile', x: 1020, y: 700,
                        io: true,
                        testo: [
                            'Otto duellanti, un dirigibile, e nessuna via d\'uscita fino alla fine. Gli abbinamenti li decide una ruota, e la ruota non guarda in faccia nessuno.',
                            'Quassù non si può scendere a prendere aria. Si duella, si aspetta il proprio turno, e si guarda negli occhi chi toccherà dopo.',
                            'Joey ha promesso che non si farà da parte. Non gli ho chiesto io di prometterlo.',
                            'Kaiba non ha promesso niente, come sempre. Ma è lui che ha costruito questa cosa e l\'ha fatta volare, e questo vale più di una promessa.',
                            'E Marik è a bordo con noi. Non c\'è più un posto dove il torneo finisce e comincia il resto: è tutto la stessa cosa, ormai.'
                        ]
                    },
                    {
                        id: 'anime-4-joey', kind: 'duel', icona: '🎲',
                        label: 'Joey Wheeler', x: 1210, y: 560,
                        characterId: 'joey', difficulty: 'Difficile'
                    },
                    {
                        id: 'anime-4-kaiba', kind: 'duel', icona: '🐉',
                        label: 'Seto Kaiba', x: 960, y: 470,
                        characterId: 'kaiba', difficulty: 'Difficile'
                    },
                    {
                        id: 'anime-4-marik', kind: 'duel', icona: '🌑',
                        label: 'Marik Ishtar', x: 680, y: 400,
                        characterId: 'marik', difficulty: 'Difficile'
                    }
                ]
            },
            {
                id: 'cerimoniale',
                nome: 'Il Duello Cerimoniale',
                testo: 'L\'ultimo duello non si gioca per vincere: si gioca per lasciarlo andare.',
                tappe: [
                    {
                        id: 'anime-5-scena', kind: 'scene', icona: '🏛️',
                        label: 'L\'ultima porta', x: 420, y: 300,
                        chi: 'Il Faraone',
                        testo: [
                            'Resta un solo duello, e non è contro un nemico.',
                            'Ha ritrovato il suo nome, e con il nome la porta si è aperta. Manca soltanto che qualcuno lo accompagni fin lì.',
                            'Per lasciarlo andare devi batterlo. Non c\'è una formula, non c\'è un rito: c\'è una partita, giocata sul serio, come tutte le altre.',
                            'E dovrai giocarla per vincere. Lasciarti battere sarebbe tenerlo qui, ed è l\'unica cosa che non gli si può fare.',
                            'È l\'ultimo duello del Faraone. Gli hai insegnato tu a giocarlo.'
                        ]
                    },
                    {
                        id: 'anime-5-yamiyugi', kind: 'duel', icona: '👑',
                        label: 'Yami Yugi', x: 700, y: 150,
                        characterId: 'yamiYugi', difficulty: 'Difficile'
                    }
                ]
            }
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
        protagonista: { name: 'Atem', title: 'Il Faraone senza memoria', image: 'images/characters/yamiYugi.jpg', icon: '👑' },
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
                        field: 'images/fields/mobile/anticoEgittoRovinePalazzo.jpg',
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
                        field: 'images/fields/mobile/anticoEgittoGiorno_1.jpg',
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
                        field: 'images/fields/mobile/anticoEgittoGiorno_1.jpg',
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
                        field: 'images/fields/mobile/anticoEgittoRovinePalazzo.jpg',
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
                        field: 'images/fields/mobile/anticoEgittoNotte_1.jpg',
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
                        field: 'images/fields/mobile/anticoEgittoNotte_1.jpg',
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
                            sfondo: ['images/maps/storia_torneo_kaiba_1.jpeg', 'images/fields/mobile/kaibaStadium_1.jpg'],
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
                                field: 'images/fields/mobile/kaibaStadium_1.jpg',
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
                                field: 'images/fields/mobile/kaibaStadium_1.jpg',
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
                                field: 'images/fields/mobile/kaibaStadium_1.jpg',
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
                                field: 'images/fields/mobile/kaibaStadium_1.jpg',
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
                                field: 'images/fields/mobile/kaibaStadium_1.jpg',
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
                                field: 'images/fields/mobile/kaibaStadium_1.jpg',
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
                                field: 'images/fields/mobile/kaibaStadium_1.jpg',
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
                                field: 'images/fields/mobile/kaibaStadium_1.jpg',
                                dialogo: [
                                    { chi: 'ishizu', testo: 'La Collana del Millennio mostra quello che deve accadere. Ho visto questo duello molto prima di sederti davanti.' },
                                    { io: true, testo: 'E come finisce?' },
                                    { chi: 'ishizu', testo: 'Con te che vinci. Ma vedere la fine non è viverla: la mia famiglia custodisce da tremila anni il nome che tu hai dimenticato, e te lo restituisco solo se arrivi in fondo da solo.' },
                                    { chi: 'ishizu', testo: 'Quindi giocherò per vincere. Sarebbe un insulto fare altrimenti.' }
                                ]
                            },
                            {
                                id: 'fm-3t-kaiba', kind: 'duel', icona: '🐉',
                                label: 'Finale · lo Scettro', x: 1000, y: 1240,
                                characterId: 'kaiba', difficulty: 'Difficile',
                                field: 'images/fields/mobile/kaibaStadium_1.jpg',
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
                        field: 'images/fields/mobile/anticoEgittoGiorno_2.jpg',
                        dialogo: [
                            { chi: 'oceanMage', testo: 'Le secche sembrano basse. Lo sembrano sempre, finche\' l\'acqua non decide diversamente.' },
                            { io: true, testo: 'Passo comunque.' }
                        ]
                    },
                    {
                        id: 'fm-4-secmeton', kind: 'duel', icona: '🔱',
                        label: 'High Mage Secmeton', x: 1980, y: 1640,
                        characterId: 'highMageSecmeton', difficulty: 'Difficile',
                        field: 'images/fields/mobile/anticoEgittoNotte_2.jpg',
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
                        field: 'images/fields/mobile/rovine_2.jpg',
                        dialogo: [
                            { chi: 'mountainMage', testo: 'Da qui in su l\'aria si fa corta. Chi non e\' abituato duella con meta\' fiato.' },
                            { io: true, testo: 'Allora sbrighiamoci.' }
                        ]
                    },
                    {
                        id: 'fm-4-atenza', kind: 'duel', icona: '🐲',
                        label: 'High Mage Atenza', x: 500, y: 1400,
                        characterId: 'highMageAtenza', difficulty: 'Difficile',
                        field: 'images/fields/mobile/rovine_2.jpg',
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
                        field: 'images/fields/mobile/anticoEgittoGiorno_2.jpg',
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
                        field: 'images/fields/mobile/anticoEgittoNotte_2.jpg',
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
                        field: 'images/fields/mobile/anticoEgittoGiorno_1.jpg',
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
                        field: 'images/fields/mobile/anticoEgittoGiorno_1.jpg',
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
                        field: 'images/fields/mobile/anticoEgittoGiorno_2.jpg',
                        dialogo: [
                            { chi: 'meadowMage', testo: 'Kepura ha detto di aprirti il prato. Non ha detto di lasciarti attraversare.' },
                            { io: true, testo: 'E\' la stessa cosa, alla fine.' }
                        ]
                    },
                    {
                        id: 'fm-4-kepura', kind: 'duel', icona: '🦌',
                        label: 'High Mage Kepura', x: 620, y: 820,
                        characterId: 'highMageKepura', difficulty: 'Difficile',
                        field: 'images/fields/mobile/anticoEgittoNotte_3.jpg',
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
                        field: 'images/fields/mobile/anticoEgittoNotte_2.jpg',
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
                        field: 'images/fields/mobile/anticoEgittoNotte_3.jpg',
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
                        field: 'images/fields/mobile/anticoEgittoNotte_3.jpg',
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
                        field: 'images/fields/mobile/anticoEgittoRovinePalazzo.jpg',
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
                        field: 'images/fields/mobile/anticoEgittoRovinePalazzo.jpg',
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
                        id: 'fm-7-darknite', kind: 'duel', icona: '😈',
                        label: 'DarkNite', x: 3060, y: 210,
                        characterId: 'darkNite', difficulty: 'Difficile',
                        field: 'images/fields/mobile/anticoEgittoNotte_1.jpg',
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
                        field: 'images/fields/mobile/anticoEgittoNotte_3.jpg',
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
        premioFinale: { credits: 3000, starChips: 5, locatorCards: 5, millenniumCards: 4 }
    },

    {
        id: 'freedom',
        nome: 'Freedom: La Corona del Millennio',
        sottotitolo: 'Roberto Giacobbo, oltre il confine',
        icona: '🎥',
        sfondo: ['images/maps/storia_freedom_1.jpeg', 'images/fields/mobile/anticoEgittoGiorno_1.jpg'],
        // Il conduttore in persona: la campagna è la sua puntata, e da metà
        // in poi anche il suo problema.
        protagonista: { name: 'Roberto Giacobbo', title: 'Il conduttore', image: 'images/characters/rg.jpg', icon: '🎥' },
        descrizione: 'Una troupe televisiva scende in Egitto per girare una puntata come tante. Sotto la sabbia trova qualcosa che nessun archeologo aveva messo in conto, e il conduttore non torna a casa come ne era partito.',
        // Qui le fanmade ci stanno: e' la campagna goliardica, e
        // Giacobbo non e' materia da regolamento ufficiale.
        carteAmmesse: { origini: ['yu-gi-oh', 'fanmade'] },
        larghezza: 2700,
        altezza: 1800,
        capitoli: [
            {
                id: 'freedom-riprese',
                nome: 'Si gira',
                testo: 'Egitto, permessi in regola, telecamere accese. Per ora è una puntata come le altre.',
                tappe: [
                    {
                        id: 'freedom-1-scena', kind: 'scene', icona: '🎬',
                        label: 'Prima puntata', x: 366, y: 1660,
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
                        label: 'Ishizu Ishtar', x: 849, y: 1560,
                        characterId: 'ishizu', difficulty: 'Medio',
                        field: 'images/fields/mobile/anticoEgittoGiorno_1.jpg'
                    },
                    {
                        id: 'freedom-1-odion', kind: 'duel', icona: '🔥',
                        label: 'Odion', x: 1350, y: 1640,
                        characterId: 'odion', difficulty: 'Medio',
                        field: 'images/fields/mobile/anticoEgittoGiorno_2.jpg'
                    },
                    {
                        id: 'freedom-1-shadi', kind: 'duel', icona: '🗝️',
                        label: 'Shadi', x: 1832, y: 1530,
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
                        id: 'freedom-2-scena', kind: 'scene', icona: '🕯️',
                        label: 'Il corridoio', x: 2276, y: 1390,
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
                        label: 'Labyrinth Mage', x: 1851, y: 1240,
                        characterId: 'labyrinthMage', difficulty: 'Difficile',
                        field: 'images/fields/mobile/anticoEgittoNotte_2.jpg'
                    },
                    {
                        id: 'freedom-2-anubisius', kind: 'duel', icona: '🐺',
                        label: 'High Mage Anubisius', x: 1331, y: 1150,
                        characterId: 'highMageAnubisius', difficulty: 'Difficile',
                        field: 'images/fields/mobile/anticoEgittoNotte_2.jpg'
                    },
                    {
                        id: 'freedom-2-sebek', kind: 'duel', icona: '🐊',
                        label: 'Sebek', x: 810, y: 1240,
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
                        id: 'freedom-3-scena', kind: 'scene', icona: '👑',
                        label: 'La Corona', x: 444, y: 1010,
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
                        label: 'Sacerdotessa Isis', x: 964, y: 900,
                        characterId: 'priestessIsis', difficulty: 'Difficile',
                        field: 'images/fields/mobile/anticoEgittoRovinePalazzo.jpg'
                    },
                    {
                        id: 'freedom-3-seto', kind: 'duel', icona: '🔺',
                        label: 'Sacerdote Seto', x: 1504, y: 820,
                        characterId: 'priestSeto', difficulty: 'Difficile',
                        field: 'images/fields/mobile/anticoEgittoRovinePalazzo.jpg'
                    },
                    {
                        id: 'freedom-3-heishin', kind: 'duel', icona: '🏛️',
                        label: 'Heishin', x: 2044, y: 900,
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
                        id: 'freedom-4-scena', kind: 'scene', icona: '⚡',
                        label: 'Fuori dal confine', x: 2334, y: 660,
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
                        label: 'DarkNite', x: 1813, y: 520,
                        characterId: 'darkNite', difficulty: 'Difficile',
                        field: 'images/fields/mobile/anticoEgittoNotte_3.jpg'
                    },
                    {
                        id: 'freedom-4-giacobbo', kind: 'duel', icona: '🎥',
                        label: 'Roberto Giacobbo I', x: 1234, y: 380,
                        characterId: 'robertoGiacobbo', difficulty: 'Difficile',
                        field: 'images/fields/mobile/anticoEgittoRovinePalazzo.jpg'
                    },
                    {
                        id: 'freedom-4-finale', kind: 'scene', icona: '☀️',
                        label: 'Titoli di coda', x: 656, y: 240,
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
        // L'unica campagna in cui il protagonista NON è una persona: di
        // qua dal Piave non c'è un eroe con un nome, c'è un esercito. Al
        // posto del ritratto, quindi, la bandiera.
        protagonista: { name: 'Regio Esercito', title: 'Fronte italiano', image: 'images/characters/ww1_regio_esercito.jpg', icon: '🇮🇹' },
        // La descrizione parla della GUERRA, non del set di carte: quella
        // che c'era prima ("campagna a tema, con il set dedicato già
        // presente nel gioco") raccontava lo stato del database al
        // giocatore, che è l'unica persona a cui non interessa.
        descrizione: 'Tre anni e mezzo su una linea che nessuno aveva mai pensato di dover attaccare: undici battaglie sull\'Isonzo per pochi chilometri di carso, la Strafexpedition che scende dagli Altipiani alle spalle, la rotta di Caporetto, e poi un fiume dietro cui non c\'era più niente su cui fermarsi. Si gioca col Regio Esercito — fanti, Alpini, Bersaglieri, Arditi, con Baracca nel cielo e Diaz al comando — e con nessun altro.',
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
                        chi: 'Il Comando Supremo',
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
                        chi: 'Armando Diaz',
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
                tappe: [
                    {
                        id: 'ww1-5-scena', kind: 'scene', icona: '🌙',
                        label: '15 giugno 1918', x: 2354, y: 1273,
                        chi: 'Il Comando Supremo',
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
                tappe: [
                    {
                        id: 'ww1-6-scena', kind: 'scene', icona: '⚔️',
                        label: '24 ottobre 1918', x: 823, y: 1340,
                        chi: 'Armando Diaz',
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
