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
 *     sfondo: ['images/maps/storia_ww1_1.jpeg', 'images/fields/mobile/rovine_2.jpg']
 *
 * IL GIORNO IN CUI QUEL FILE VIENE MESSO NELLA CARTELLA, la mappa lo usa
 * da sola — nessuna riga di codice da toccare, nessun elenco da
 * aggiornare. Oggi esiste solo quella di Freedom; le altre quattro
 * aspettano lì col loro nome già pronto.
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
 * attraverso quel disegno. Memorie Proibite è fatta così; per le altre
 * vale quando arriva la loro mappa.
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
                            'Dicono che chi lo completa riceva un dono. Io dico che chi lo completa ha già dimostrato tutto quello che serve.',
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
                            'L\'isola di Pegasus aspetta, e le Stelle dell\'Esagono non si regalano a nessuno.'
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
                            'Regole nuove: si duella in città, col Duel Disk, e chi perde cede la sua carta migliore.',
                            'E da qualche parte là fuori ci sono i Cacciatori Rari, e tre Dei che non dovrebbero esistere.'
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
                        chi: 'Yugi',
                        testo: [
                            'Otto duellanti, un dirigibile, e nessuna via d\'uscita fino alla fine.',
                            'Joey ha promesso che non si farà da parte. Kaiba non ha promesso niente, come sempre.'
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
                            'Per lasciarlo andare devi batterlo. È l\'unico modo che ha di essere libero, e l\'unico modo che hai di salutarlo.'
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
                            'Prendi le carte. Finché mi batti a questo gioco, so che sei ancora sveglio.'
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
                            { nome: 'Il Principe', icona: '𓂀', testo: 'Allora facciamo in modo che la seconda non mi serva mai.' }
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
                            { nome: 'Il Principe', icona: '𓂀', testo: 'Allora insegnami qualcosa anche tu.' }
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
                            { nome: 'Il Principe', icona: '𓂀', testo: 'Non ho intenzione di farlo.' }
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
                            { nome: 'Il Principe', icona: '𓂀', testo: 'Allora comincio adesso.' }
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
                            'Io li ho presi tutti. Il trono viene dopo: è la parte facile.'
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
                            { nome: 'Il Principe', icona: '𓂀', testo: 'Ti e\' stato dato un tempio da custodire. Guarda com\'e\' ridotto.' }
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
                            { nome: 'Il Principe', icona: '𓂀', testo: 'Un ragazzo con un mazzo di carte ti ha appena raggiunto qui dentro.' }
                        ]
                    },
                    {
                        id: 'fm-2-sigillo', kind: 'scene', icona: '🧩',
                        label: 'Il sigillo', x: 1680, y: 1080,
                        chi: 'Simon Muran', chiId: 'simonMuran',
                        testo: [
                            'Non posso salvare il regno. Posso salvare te, e solo in un modo.',
                            'Ti chiudo dentro il Puzzle, mio principe. Dormirai finché qualcuno non avrà la pazienza di rimetterlo insieme.',
                            'Potrebbero volerci molti anni. Non ho un numero da darti.'
                        ]
                    }
                ]
            },
            {
                id: 'fm-presente',
                nome: 'Cinquemila anni dopo',
                testo: 'Il sigillo si spezza nel presente. Per tornare indietro manca un pezzo, e ce l\'ha qualcun altro.',
                tappe: [
                    {
                        id: 'fm-3-scena', kind: 'scene', icona: '💡',
                        label: 'L\'ultimo pezzo', x: 2270, y: 1270,
                        chi: 'Shadi', chiId: 'shadi',
                        testo: [
                            'Il Puzzle è stato completato. Dopo cinquemila anni, un ragazzo ci è riuscito — e quel ragazzo somiglia al Principe più di quanto sappia.',
                            'Gli Oggetti sono tornati a muoversi. Sei di loro dormono ancora sotto la sabbia; il settimo lo porta al collo chi ha appena finito di montarlo.',
                            'Ma prima di guardare indietro devi guardarti intorno. C\'è un ragazzo, in questa città, che tiene fra le mani una carta che apparteneva a un sacerdote.'
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
                            { nome: 'Yugi Muto', icona: '🧩', testo: 'Allora pesalo.' }
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
                        testo: 'Cinque incontri fino al presidente. Chi perde esce dal tabellone e ricomincia dal primo.',
                        mappa: {
                            sfondo: ['images/maps/storia_torneo_kaiba_1.jpeg', 'images/fields/mobile/kaibaStadium_1.jpg'],
                            larghezza: 3200,
                            altezza: 1800
                        },
                        tappe: [
                            {
                                id: 'fm-3t-weevil', kind: 'duel', icona: '🐛',
                                label: 'Weevil Underwood', x: 520, y: 1280,
                                characterId: 'weevil', difficulty: 'Medio',
                                field: 'images/fields/mobile/kaibaStadium_1.jpg',
                                dialogo: [
                                    { chi: 'weevil', testo: 'Primo turno e mi tocca il nanerottolo col ciondolo. Che fortuna.' },
                                    { chi: 'weevil', testo: 'Sai qual è il bello degli insetti? Che quando te ne accorgi hanno già mangiato tutto.' },
                                    { nome: 'Yugi Muto', icona: '🧩', testo: 'Allora comincia a masticare.' }
                                ]
                            },
                            {
                                id: 'fm-3t-rex', kind: 'duel', icona: '🦖',
                                label: 'Rex Raptor', x: 1080, y: 1420,
                                characterId: 'rex', difficulty: 'Medio',
                                field: 'images/fields/mobile/kaibaStadium_1.jpg',
                                dialogo: [
                                    { chi: 'rex', testo: 'Hai battuto l\'uomo-insetto. Congratulazioni: adesso arrivano i dinosauri.' },
                                    { chi: 'rex', testo: 'Nel mio mazzo non c\'è niente di astuto. C\'è roba grossa che passa sopra a quello che trova.' },
                                    { nome: 'Yugi Muto', icona: '🧩', testo: 'Anche i dinosauri si sono estinti.' }
                                ]
                            },
                            {
                                id: 'fm-3t-mai', kind: 'duel', icona: '🦋',
                                label: 'Mai Valentine', x: 1640, y: 1180,
                                characterId: 'mai', difficulty: 'Difficile',
                                field: 'images/fields/mobile/kaibaStadium_1.jpg',
                                dialogo: [
                                    { chi: 'mai', testo: 'Quarti di finale, tesoro. Da qui in poi non si gioca più per divertirsi.' },
                                    { chi: 'mai', testo: 'Io non leggo le carte: leggo chi le tiene in mano. E tu hai qualcosa addosso che ti pesa più del mazzo.' },
                                    { nome: 'Yugi Muto', icona: '🧩', testo: 'Non è un peso. È un debito.' }
                                ]
                            },
                            {
                                id: 'fm-3t-keith', kind: 'duel', icona: '🎰',
                                label: 'Bandit Keith', x: 2180, y: 1340,
                                characterId: 'bandit_keith', difficulty: 'Difficile',
                                field: 'images/fields/mobile/kaibaStadium_1.jpg',
                                dialogo: [
                                    { chi: 'bandit_keith', testo: 'Semifinale. Io in questo stadio ci sono già stato, e non me ne sono andato con le mani vuote.' },
                                    { chi: 'bandit_keith', testo: 'Regola numero uno: vince chi arriva in fondo. Come ci arriva non lo chiede nessuno.' },
                                    { nome: 'Yugi Muto', icona: '🧩', testo: 'Lo chiedo io.' }
                                ]
                            },
                            {
                                id: 'fm-3t-kaiba', kind: 'duel', icona: '🐉',
                                label: 'Seto Kaiba', x: 2700, y: 900,
                                characterId: 'kaiba', difficulty: 'Difficile',
                                field: 'images/fields/mobile/kaibaStadium_1.jpg',
                                dialogo: [
                                    { chi: 'kaiba', testo: 'Finale. Questo stadio è mio, il torneo è mio, e fra un minuto lo sarà anche il tuo Puzzle.' },
                                    { chi: 'kaiba', testo: 'C\'è una carta nel mio mazzo che ho comprato a un prezzo che non ti dirò. Quando la vedrai capirai perché nessuno arriva in fondo qui dentro.' },
                                    { nome: 'Yugi Muto', icona: '🧩', testo: 'Non sono venuto per il torneo, Kaiba. Sono venuto per quello che tieni e non sai di tenere.' },
                                    { chi: 'kaiba', testo: 'Allora vieni a prendertelo.' }
                                ]
                            }
                        ]
                    },
                    {
                        id: 'fm-3-ritorno', kind: 'scene', icona: '⏳',
                        label: 'Indietro', x: 2960, y: 1600,
                        chi: 'Il Principe',
                        testo: [
                            'Gli Oggetti sono sette. Uno è al collo del ragazzo, uno l\'ha appena lasciato Kaiba senza capire cosa stesse lasciando.',
                            'Gli altri cinque sono dove li ha messi Heishin: cinquemila anni fa, uno per ciascuno dei suoi maghi.',
                            'Se li voglio indietro devo andarli a prendere. Non c\'è una strada più corta.'
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
                            'Se lo batti avrai guadagnato il diritto di annegare davanti a me.'
                        ]
                    },
                    {
                        id: 'fm-4-ocean', kind: 'duel', icona: '🐚',
                        label: 'Ocean Mage', x: 2250, y: 1690,
                        characterId: 'oceanMage', difficulty: 'Medio',
                        field: 'images/fields/mobile/anticoEgittoGiorno_2.jpg',
                        dialogo: [
                            { chi: 'oceanMage', testo: 'Le secche sembrano basse. Lo sembrano sempre, finche\' l\'acqua non decide diversamente.' },
                            { nome: 'Il Principe', icona: '𓂀', testo: 'Passo comunque.' }
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
                            { nome: 'Il Principe', icona: '𓂀', testo: 'Il mare non ha mai avuto qualcosa di mio.' }
                        ]
                    },
                    {
                        id: 'fm-4-scena-mountain', kind: 'scene', icona: '⛰️',
                        label: 'Il sentiero', x: 1180, y: 1520,
                        chi: 'High Mage Atenza', chiId: 'highMageAtenza',
                        testo: [
                            'La pietra non tratta con nessuno. Sale chi ha il fiato e cade chi non ce l\'ha, e non c\'è altra regola quassù.',
                            'Mountain Mage sorveglia il sentiero. Io sorveglio quello che c\'è in cima — e non è roba per te.'
                        ]
                    },
                    {
                        id: 'fm-4-mountain', kind: 'duel', icona: '🪨',
                        label: 'Mountain Mage', x: 870, y: 1620,
                        characterId: 'mountainMage', difficulty: 'Medio',
                        field: 'images/fields/mobile/rovine_2.jpg',
                        dialogo: [
                            { chi: 'mountainMage', testo: 'Da qui in su l\'aria si fa corta. Chi non e\' abituato duella con meta\' fiato.' },
                            { nome: 'Il Principe', icona: '𓂀', testo: 'Allora sbrighiamoci.' }
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
                            { nome: 'Il Principe', icona: '𓂀', testo: 'Anche la pietra si spacca.' }
                        ]
                    },
                    {
                        id: 'fm-4-scena-forest', kind: 'scene', icona: '🌲',
                        label: 'Gli alberi', x: 430, y: 640,
                        chi: 'High Mage Anubisius', chiId: 'highMageAnubisius',
                        testo: [
                            'Sotto questi alberi non si seppellisce nessuno, Principe: la foresta preferisce tenere i suoi morti in piedi.',
                            'Forest Mage li conta ogni sera. Da stasera ne avrà uno in più da contare.'
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
                            { nome: 'Il Principe', icona: '𓂀', testo: 'Anch\'io.' }
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
                            { nome: 'Il Principe', icona: '𓂀', testo: 'Allora falli sdraiare.' }
                        ]
                    },
                    {
                        id: 'fm-4-scena-desert', kind: 'scene', icona: '🏜️',
                        label: 'La sabbia', x: 2120, y: 300,
                        chi: 'High Mage Martis', chiId: 'highMageMartis',
                        testo: [
                            'Il deserto è l\'unica delle cinque terre che non avrebbe bisogno di guardie.',
                            'Desert Mage sta là fuori soltanto perché qualcuno raccolga quello che resta.',
                            'Cammina pure, Principe. Il sole lavora per me.'
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
                            { nome: 'Il Principe', icona: '𓂀', testo: 'Oggi no.' }
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
                            { nome: 'Il Principe', icona: '𓂀', testo: 'Il deserto puo\' aspettare. Io no.' }
                        ]
                    },
                    {
                        id: 'fm-4-scena-meadow', kind: 'scene', icona: '🌻',
                        label: 'L\'ultimo prato', x: 1150, y: 800,
                        chi: 'High Mage Kepura', chiId: 'highMageKepura',
                        testo: [
                            'Ti aspettavo prima. Gli altri quattro avevano un solo compito, e nessuno l\'ha portato a termine.',
                            'Questa è l\'ultima terra e questo è l\'ultimo Oggetto: dopo di me non resta che il palazzo.',
                            'Meadow Mage, apri il prato. Vediamo quanto gli è rimasto.'
                        ]
                    },
                    {
                        id: 'fm-4-meadow', kind: 'duel', icona: '🌾',
                        label: 'Meadow Mage', x: 890, y: 900,
                        characterId: 'meadowMage', difficulty: 'Medio',
                        field: 'images/fields/mobile/anticoEgittoGiorno_2.jpg',
                        dialogo: [
                            { chi: 'meadowMage', testo: 'Kepura ha detto di aprirti il prato. Non ha detto di lasciarti attraversare.' },
                            { nome: 'Il Principe', icona: '𓂀', testo: 'E\' la stessa cosa, alla fine.' }
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
                            { nome: 'Il Principe', icona: '𓂀', testo: 'Un Oggetto alla volta.' }
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
                        chi: 'Il Principe',
                        testo: [
                            'Sei Oggetti recuperati. Il settimo è sotto il palazzo, e sotto il palazzo Heishin ha scavato.',
                            'Quello che ha messo a guardia del labirinto non è più del tutto umano.'
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
                            { nome: 'Il Principe', icona: '𓂀', testo: 'Le ho contate tutte. Questa la volevo.' }
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
                            { nome: 'Il Principe', icona: '𓂀', testo: 'Allora la chiudo io.' }
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
                            { nome: 'Il Principe', icona: '𓂀', testo: 'Nemmeno io.' }
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
                            'Ma io non li ho mai voluti per me. Li ho raccolti per QUALCUN ALTRO, e adesso che sono tutti insieme lui può finalmente passare.'
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
                            { nome: 'Il Principe', icona: '𓂀', testo: 'Allora prendilo.' }
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
                            { nome: 'Il Principe', icona: '𓂀', testo: 'Allora togliti di mezzo e lasciamelo vedere.' }
                        ]
                    },
                    {
                        id: 'fm-6-tradimento', kind: 'scene', icona: '😈',
                        label: 'Il tradimento', x: 3010, y: 410,
                        chi: 'DarkNite', chiId: 'darkNite',
                        testo: [
                            'Heishin mi ha chiamato. Heishin mi ha aperto la porta. Heishin non mi serve più.',
                            'Tu invece sì: sei l\'unico in cinquemila anni che valga la pena di battere.'
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
                            { nome: 'Il Principe', icona: '𓂀', testo: 'Non sono arrivato da solo. Ci sono voluti cinquemila anni e un ragazzo con un puzzle.' }
                        ]
                    },
                    {
                        id: 'fm-7-nitemare', kind: 'scene', icona: '🌑',
                        label: 'La vera forma', x: 2810, y: 120,
                        chi: 'DarkNite',
                        testo: [
                            'Quella era la forma che uso con chi non merita di vedere l\'altra.',
                            'Guarda bene, principe. Non ci sarà una terza forma.'
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
                            { nome: 'Il Principe', icona: '𓂀', testo: 'Il mio nome lo perdero\' comunque. Il regno no.' }
                        ]
                    },
                    {
                        id: 'fm-7-finale', kind: 'scene', icona: '🌅',
                        label: 'Le memorie', x: 2300, y: 330,
                        chi: 'Il Principe',
                        testo: [
                            'Gli Oggetti sono di nuovo sette, e di nuovo divisi. Il regno resterà in piedi.',
                            'Di me, invece, non resterà quasi niente: nemmeno il nome. Chi rimetterà insieme il Puzzle fra cinquemila anni troverà un Faraone senza memoria.',
                            'Sarà compito suo ritrovarla.'
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
                            'La troupe è pronta, le telecamere girano. Voi seguiteci: non si sa mai dove si finisce.'
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
                            'Gli egittologi che abbiamo consultato sono categorici: non può esistere. E allora, amici, cos\'è che stiamo guardando?'
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
                            'Le telecamere hanno continuato a registrare per altri quaranta minuti. Quello che hanno ripreso non è mai andato in onda.'
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
        // Nessuno degli sfondi disponibili è davvero della Grande Guerra:
        // rovine_2 è il meno fuori luogo, ma un'immagine vera del fronte
        // (trincea, montagna, il Piave) resta la prima cosa da aggiungere
        // per questa campagna. Il primo candidato è il NOME che quel file
        // dovrà avere: il giorno in cui compare, la mappa lo usa da sola.
        sfondo: ['images/maps/storia_ww1_1.jpeg', 'images/fields/mobile/rovine_2.jpg'],
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
        larghezza: 1500,
        altezza: 2400,
        capitoli: [
            {
                id: 'ww1-isonzo',
                nome: 'L\'Isonzo',
                testo: 'Undici battaglie sullo stesso fiume per pochi chilometri di carso.',
                tappe: [
                    {
                        id: 'ww1-1-scena', kind: 'scene', icona: '📯',
                        label: 'Maggio 1915', x: 200, y: 2250,
                        chi: 'Il Comando Supremo',
                        testo: [
                            'Si entra in guerra il 24 maggio. Il fronte è una linea di montagne che nessuno ha mai pensato di dover attaccare.',
                            'Di là c\'è l\'Isonzo, e dietro l\'Isonzo c\'è Boroević. Ci vorranno undici battaglie per capire quanto è caro quel fiume.'
                        ]
                    },
                    {
                        id: 'ww1-1-kaiserjager', kind: 'duel', icona: '⛰️',
                        label: 'Kaiserjäger Tirolese', x: 470, y: 2140,
                        characterId: 'ww1_kaiserjager', difficulty: 'Medio'
                    },
                    {
                        id: 'ww1-1-arigi', kind: 'duel', icona: '✈️',
                        label: 'Julius Arigi', x: 750, y: 2230,
                        characterId: 'ww1_arigi', difficulty: 'Medio'
                    },
                    {
                        id: 'ww1-1-eugenio', kind: 'duel', icona: '🎖️',
                        label: 'Arciduca Eugenio', x: 1030, y: 2120,
                        characterId: 'ww1_eugenio', difficulty: 'Difficile'
                    }
                ]
            },
            {
                id: 'ww1-strafexpedition',
                nome: 'La Strafexpedition',
                testo: 'L\'attacco scende dagli Altipiani alle spalle del fronte: se arriva in pianura, la guerra finisce.',
                tappe: [
                    {
                        id: 'ww1-2-scena', kind: 'scene', icona: '🏔️',
                        label: 'Primavera 1916', x: 1290, y: 1960,
                        chi: 'Conrad von Hötzendorf', chiId: 'ww1_conrad',
                        testo: [
                            'La chiamano "spedizione punitiva", e il nome è esatto: l\'Italia ha tradito la Triplice Alleanza e va punita.',
                            'Scendiamo dagli Altipiani alle loro spalle. Se arriviamo in pianura, la guerra finisce in un mese.'
                        ]
                    },
                    {
                        id: 'ww1-2-conrad', kind: 'duel', icona: '🗺️',
                        label: 'Conrad von Hötzendorf', x: 1040, y: 1830,
                        characterId: 'ww1_conrad', difficulty: 'Difficile'
                    },
                    {
                        id: 'ww1-2-kaiserjager', kind: 'duel', icona: '⛰️',
                        label: 'Kaiserjäger Tirolese', x: 760, y: 1900,
                        characterId: 'ww1_kaiserjager', difficulty: 'Difficile'
                    },
                    {
                        id: 'ww1-2-gorizia', kind: 'scene', icona: '🏅',
                        label: 'Agosto 1916: Gorizia', x: 480, y: 1790,
                        chi: 'Il Bollettino',
                        testo: [
                            'La Strafexpedition si è fermata sugli Altipiani. Sull\'Isonzo, per la prima volta, una città è caduta: Gorizia è nostra.',
                            'È la prima vittoria che si possa chiamare così. Ne servono ancora molte.'
                        ]
                    }
                ]
            },
            {
                id: 'ww1-caporetto',
                nome: 'Caporetto',
                testo: 'Dodici giorni, centocinquanta chilometri indietro, e un fiume dietro cui non c\'è più niente.',
                tappe: [
                    {
                        id: 'ww1-3-scena', kind: 'scene', icona: '🌧️',
                        label: '24 ottobre 1917', x: 220, y: 1620,
                        chi: 'Svetozar Boroević', chiId: 'ww1_boroevic',
                        testo: [
                            'Nebbia, gas, e una manovra che nessuno si aspetta dal punto in cui la facciamo.',
                            'In dodici giorni li abbiamo spinti indietro di centocinquanta chilometri. Un intero esercito in rotta.'
                        ]
                    },
                    {
                        id: 'ww1-3-boroevic', kind: 'duel', icona: '🦁',
                        label: 'Svetozar Boroević', x: 500, y: 1510,
                        characterId: 'ww1_boroevic', difficulty: 'Difficile'
                    },
                    {
                        id: 'ww1-3-brumowski', kind: 'duel', icona: '🛩️',
                        label: 'Godwin von Brumowski', x: 780, y: 1590,
                        characterId: 'ww1_brumowski', difficulty: 'Difficile'
                    },
                    {
                        id: 'ww1-3-ritirata', kind: 'scene', icona: '🌊',
                        label: 'Il Piave', x: 1060, y: 1470,
                        chi: 'Armando Diaz',
                        testo: [
                            'Ci siamo fermati sul Piave perché dietro il Piave non c\'è più niente su cui fermarsi.',
                            'Da qui non si arretra di un metro. Non è retorica: è che non c\'è un altro fiume.'
                        ]
                    }
                ]
            },
            {
                id: 'ww1-piave',
                nome: 'Il Piave',
                testo: 'La Battaglia del Solstizio: l\'ultimo attacco che l\'Impero può ancora permettersi.',
                tappe: [
                    {
                        id: 'ww1-4-scena', kind: 'scene', icona: '🌙',
                        label: 'Giugno 1918', x: 1300, y: 1290,
                        chi: 'Il Comando Supremo',
                        testo: [
                            'La Battaglia del Solstizio: l\'ultimo attacco che l\'Impero può ancora permettersi.',
                            'Se regge il Piave, non è più questione di se finisce, ma di quando.'
                        ]
                    },
                    {
                        id: 'ww1-4-eugenio', kind: 'duel', icona: '🎖️',
                        label: 'Arciduca Eugenio', x: 1050, y: 1160,
                        characterId: 'ww1_eugenio', difficulty: 'Difficile'
                    },
                    {
                        id: 'ww1-4-conrad', kind: 'duel', icona: '🗺️',
                        label: 'Conrad von Hötzendorf', x: 770, y: 1240,
                        characterId: 'ww1_conrad', difficulty: 'Difficile'
                    },
                    {
                        id: 'ww1-4-brumowski', kind: 'duel', icona: '🛩️',
                        label: 'Godwin von Brumowski', x: 500, y: 1130,
                        characterId: 'ww1_brumowski', difficulty: 'Difficile'
                    }
                ]
            },
            {
                id: 'ww1-vittorioveneto',
                nome: 'Vittorio Veneto',
                testo: 'Un anno esatto dopo Caporetto, stesso giorno. Questa volta attacchiamo noi.',
                tappe: [
                    {
                        id: 'ww1-5-scena', kind: 'scene', icona: '⚔️',
                        label: '24 ottobre 1918', x: 230, y: 950,
                        chi: 'Armando Diaz',
                        testo: [
                            'Un anno esatto dopo Caporetto, stesso giorno. Questa volta attacchiamo noi.',
                            'L\'esercito che abbiamo davanti è ancora forte sulla carta. Sulla carta.'
                        ]
                    },
                    {
                        id: 'ww1-5-arigi', kind: 'duel', icona: '✈️',
                        label: 'Julius Arigi', x: 510, y: 840,
                        characterId: 'ww1_arigi', difficulty: 'Difficile'
                    },
                    {
                        id: 'ww1-5-eugenio', kind: 'duel', icona: '🎖️',
                        label: 'Arciduca Eugenio', x: 790, y: 920,
                        characterId: 'ww1_eugenio', difficulty: 'Difficile'
                    },
                    {
                        id: 'ww1-5-boroevic', kind: 'duel', icona: '🦁',
                        label: 'Svetozar Boroević', x: 1070, y: 800,
                        characterId: 'ww1_boroevic', difficulty: 'Difficile'
                    },
                    {
                        id: 'ww1-5-bollettino', kind: 'scene', icona: '📜',
                        label: '4 novembre 1918', x: 1310, y: 640,
                        chi: 'Il Bollettino della Vittoria',
                        testo: [
                            'La guerra contro l\'Austria-Ungheria è vinta.',
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
