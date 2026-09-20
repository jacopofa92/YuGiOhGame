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
 * UNA TAPPA è di due specie:
 *   - `kind: 'duel'`   — un duello. `characterId` (js/data/characters-db.js),
 *     `difficulty` ('Medio' | 'Difficile'), e facoltativamente `field` e
 *     `music` per l'ambientazione.
 *   - `kind: 'scene'`  — una schermata di racconto, nessun duello: `testo`
 *     (una o più righe) e facoltativamente `chi` (chi parla). Serve a dare
 *     respiro fra un duello e l'altro e a spiegare perché si sta
 *     duellando, che è l'unica cosa che distingue una Storia da una fila
 *     di Duelli Liberi.
 *
 * `sfondo` è l'immagine della mappa, e può essere un ELENCO di candidati
 * in ordine di preferenza: si usa il primo che esiste davvero. Serve per
 * l'arte che ancora non c'è. Ogni campagna dichiara come primo candidato
 * `images/story/<id della campagna>.jpg`, che oggi non esiste, e come
 * secondo l'immagine presa in prestito che si vede adesso:
 *
 *     sfondo: ['images/story/ww1.jpg', 'images/fields/mobile/rovine_2.jpg']
 *
 * IL GIORNO IN CUI QUEL FILE VIENE MESSO NELLA CARTELLA, la mappa lo usa
 * da sola — nessuna riga di codice da toccare, nessun elenco da
 * aggiornare. Lo stesso vale per i RITRATTI: un personaggio si aspetta
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
        sfondo: ['images/story/anime.jpg', 'images/fields/mobile/rovine_1.jpg'],
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
        sfondo: ['images/story/forbiddenMemories.jpg', 'images/fields/mobile/anticoEgittoGiorno_2.jpg'],
        descrizione: 'La trama di Yu-Gi-Oh! Forbidden Memories, seguita da vicino: il colpo di stato di Heishin, il sigillo nel Puzzle del Millennio, il risveglio cinquemila anni dopo e il ritorno nel passato per riprendersi gli Oggetti, uno alla volta.',
        carteAmmesse: { origini: ['yu-gi-oh'] },
        larghezza: 1500,
        altezza: 3400,
        capitoli: [
            {
                id: 'fm-principe',
                nome: 'Il Regno del Principe',
                testo: 'Tremila anni prima di tutto: un regno in pace, un maestro, e tre amici con cui esercitarsi.',
                tappe: [
                    {
                        id: 'fm-1-scena', kind: 'scene', icona: '🏛️',
                        label: 'La lezione', x: 210, y: 3250,
                        chi: 'Simon Muran', chiId: 'simonMuran',
                        testo: [
                            'Mio principe, il regno è in pace e tu sei annoiato. È esattamente quando un sovrano è più in pericolo.',
                            'Prendi le carte. Finché mi batti a questo gioco, so che sei ancora sveglio.'
                        ]
                    },
                    {
                        id: 'fm-1-simon', kind: 'duel', icona: '📜',
                        label: 'Simon Muran', x: 470, y: 3140,
                        characterId: 'simonMuran', difficulty: 'Medio',
                        field: 'images/fields/mobile/anticoEgittoRovinePalazzo.jpg'
                    },
                    {
                        id: 'fm-1-jono', kind: 'duel', icona: '🗡️',
                        label: 'Jono', x: 740, y: 3230,
                        characterId: 'jono', difficulty: 'Medio',
                        field: 'images/fields/mobile/anticoEgittoGiorno_1.jpg'
                    },
                    {
                        id: 'fm-1-teana', kind: 'duel', icona: '🌾',
                        label: 'Teana', x: 1010, y: 3120,
                        characterId: 'teana', difficulty: 'Medio',
                        field: 'images/fields/mobile/anticoEgittoGiorno_1.jpg'
                    },
                    {
                        id: 'fm-1-isis', kind: 'duel', icona: '🔮',
                        label: 'Sacerdotessa Isis', x: 1270, y: 3220,
                        characterId: 'priestessIsis', difficulty: 'Medio',
                        field: 'images/fields/mobile/anticoEgittoRovinePalazzo.jpg'
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
                        label: 'Il colpo di stato', x: 1280, y: 2960,
                        chi: 'Heishin', chiId: 'heishin',
                        testo: [
                            'Sette Oggetti del Millennio. Sette. E voi ne tenevate uno ciascuno, come fossero gioielli.',
                            'Io li ho presi tutti. Il trono viene dopo: è la parte facile.'
                        ]
                    },
                    {
                        id: 'fm-2-seto', kind: 'duel', icona: '🔺',
                        label: 'Sacerdote Seto', x: 1010, y: 2850,
                        characterId: 'priestSeto', difficulty: 'Difficile',
                        field: 'images/fields/mobile/anticoEgittoNotte_1.jpg'
                    },
                    {
                        id: 'fm-2-heishin', kind: 'duel', icona: '🏛️',
                        label: 'Heishin', x: 740, y: 2940,
                        characterId: 'heishin', difficulty: 'Difficile',
                        field: 'images/fields/mobile/anticoEgittoNotte_1.jpg'
                    },
                    {
                        id: 'fm-2-sigillo', kind: 'scene', icona: '🧩',
                        label: 'Il sigillo', x: 470, y: 2830,
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
                        label: 'L\'ultimo pezzo', x: 230, y: 2650,
                        chi: 'Shadi', chiId: 'shadi',
                        testo: [
                            'Il Puzzle è stato completato. Dopo cinquemila anni, qualcuno ci è riuscito.',
                            'Gli Oggetti sono tornati a muoversi, e non tutti sono in buone mani. Uno lo tiene un ragazzo che possiede un\'intera azienda.'
                        ]
                    },
                    {
                        id: 'fm-3-shadi', kind: 'duel', icona: '🗝️',
                        label: 'Shadi', x: 500, y: 2540,
                        characterId: 'shadi', difficulty: 'Difficile',
                        field: 'images/fields/mobile/rovine_1.jpg'
                    },
                    {
                        id: 'fm-3-kaiba', kind: 'duel', icona: '🐉',
                        label: 'Seto Kaiba', x: 780, y: 2630,
                        characterId: 'kaiba', difficulty: 'Difficile',
                        field: 'images/fields/mobile/kaibaStadium_1.jpg'
                    },
                    {
                        id: 'fm-3-ritorno', kind: 'scene', icona: '⏳',
                        label: 'Indietro', x: 1060, y: 2520,
                        chi: 'Il Principe',
                        testo: [
                            'Gli Oggetti sono sette, e sei di loro sono ancora là dove li ha lasciati Heishin: cinquemila anni fa.',
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
                        label: 'Le secche', x: 1310, y: 2390,
                        chi: 'High Mage Secmeton', chiId: 'highMageSecmeton',
                        testo: [
                            'Heishin ha diviso i Sette Oggetti fra noi cinque. A me è toccato il mare, e con il mare non si discute.',
                            'Alla mia torre non arriva nessuno senza passare prima dalle secche: là ti aspetta Ocean Mage.',
                            'Se lo batti avrai guadagnato il diritto di annegare davanti a me.'
                        ]
                    },
                    {
                        id: 'fm-4-ocean', kind: 'duel', icona: '🐚',
                        label: 'Ocean Mage', x: 1000, y: 2390,
                        characterId: 'oceanMage', difficulty: 'Medio',
                        field: 'images/fields/mobile/anticoEgittoGiorno_2.jpg'
                    },
                    {
                        id: 'fm-4-secmeton', kind: 'duel', icona: '🔱',
                        label: 'High Mage Secmeton', x: 690, y: 2390,
                        characterId: 'highMageSecmeton', difficulty: 'Difficile',
                        field: 'images/fields/mobile/anticoEgittoNotte_2.jpg'
                    },
                    {
                        id: 'fm-4-scena-forest', kind: 'scene', icona: '🌲',
                        label: 'Gli alberi', x: 380, y: 2240,
                        chi: 'High Mage Anubisius', chiId: 'highMageAnubisius',
                        testo: [
                            'Sotto questi alberi non si seppellisce nessuno, Principe: la foresta preferisce tenere i suoi morti in piedi.',
                            'Forest Mage li conta ogni sera. Da stasera ne avrà uno in più da contare.'
                        ]
                    },
                    {
                        id: 'fm-4-forest', kind: 'duel', icona: '🍃',
                        label: 'Forest Mage', x: 690, y: 2240,
                        characterId: 'forestMage', difficulty: 'Medio',
                        field: 'images/fields/mobile/anticoEgittoGiorno_2.jpg'
                    },
                    {
                        id: 'fm-4-anubisius', kind: 'duel', icona: '🐺',
                        label: 'High Mage Anubisius', x: 1000, y: 2240,
                        characterId: 'highMageAnubisius', difficulty: 'Difficile',
                        field: 'images/fields/mobile/anticoEgittoNotte_2.jpg'
                    },
                    {
                        id: 'fm-4-scena-mountain', kind: 'scene', icona: '⛰️',
                        label: 'Il sentiero', x: 1310, y: 2090,
                        chi: 'High Mage Atenza', chiId: 'highMageAtenza',
                        testo: [
                            'La pietra non tratta con nessuno. Sale chi ha il fiato e cade chi non ce l\'ha, e non c\'è altra regola quassù.',
                            'Mountain Mage sorveglia il sentiero. Io sorveglio quello che c\'è in cima — e non è roba per te.'
                        ]
                    },
                    {
                        id: 'fm-4-mountain', kind: 'duel', icona: '🪨',
                        label: 'Mountain Mage', x: 1000, y: 2090,
                        characterId: 'mountainMage', difficulty: 'Medio',
                        field: 'images/fields/mobile/rovine_2.jpg'
                    },
                    {
                        id: 'fm-4-atenza', kind: 'duel', icona: '🐲',
                        label: 'High Mage Atenza', x: 690, y: 2090,
                        characterId: 'highMageAtenza', difficulty: 'Difficile',
                        field: 'images/fields/mobile/rovine_2.jpg'
                    },
                    {
                        id: 'fm-4-scena-desert', kind: 'scene', icona: '🏜️',
                        label: 'La sabbia', x: 380, y: 1940,
                        chi: 'High Mage Martis', chiId: 'highMageMartis',
                        testo: [
                            'Il deserto è l\'unica delle cinque terre che non avrebbe bisogno di guardie.',
                            'Desert Mage sta là fuori soltanto perché qualcuno raccolga quello che resta.',
                            'Cammina pure, Principe. Il sole lavora per me.'
                        ]
                    },
                    {
                        id: 'fm-4-desert', kind: 'duel', icona: '🦂',
                        label: 'Desert Mage', x: 690, y: 1940,
                        characterId: 'desertMage', difficulty: 'Medio',
                        field: 'images/fields/mobile/anticoEgittoGiorno_1.jpg'
                    },
                    {
                        id: 'fm-4-martis', kind: 'duel', icona: '🦅',
                        label: 'High Mage Martis', x: 1000, y: 1940,
                        characterId: 'highMageMartis', difficulty: 'Difficile',
                        field: 'images/fields/mobile/anticoEgittoGiorno_1.jpg'
                    },
                    {
                        id: 'fm-4-scena-meadow', kind: 'scene', icona: '🌻',
                        label: 'L\'ultimo prato', x: 1310, y: 1790,
                        chi: 'High Mage Kepura', chiId: 'highMageKepura',
                        testo: [
                            'Ti aspettavo prima. Gli altri quattro avevano un solo compito, e nessuno l\'ha portato a termine.',
                            'Questa è l\'ultima terra e questo è l\'ultimo Oggetto: dopo di me non resta che il palazzo.',
                            'Meadow Mage, apri il prato. Vediamo quanto gli è rimasto.'
                        ]
                    },
                    {
                        id: 'fm-4-meadow', kind: 'duel', icona: '🌾',
                        label: 'Meadow Mage', x: 1000, y: 1790,
                        characterId: 'meadowMage', difficulty: 'Medio',
                        field: 'images/fields/mobile/anticoEgittoGiorno_2.jpg'
                    },
                    {
                        id: 'fm-4-kepura', kind: 'duel', icona: '🦌',
                        label: 'High Mage Kepura', x: 690, y: 1790,
                        characterId: 'highMageKepura', difficulty: 'Difficile',
                        field: 'images/fields/mobile/anticoEgittoNotte_3.jpg'
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
                        label: 'Sotto il palazzo', x: 380, y: 1640,
                        chi: 'Il Principe',
                        testo: [
                            'Sei Oggetti recuperati. Il settimo è sotto il palazzo, e sotto il palazzo Heishin ha scavato.',
                            'Quello che ha messo a guardia del labirinto non è più del tutto umano.'
                        ]
                    },
                    {
                        id: 'fm-5-labirinto', kind: 'duel', icona: '🧱',
                        label: 'Labyrinth Mage', x: 660, y: 1560,
                        characterId: 'labyrinthMage', difficulty: 'Difficile',
                        field: 'images/fields/mobile/anticoEgittoNotte_2.jpg'
                    },
                    {
                        id: 'fm-5-sebek', kind: 'duel', icona: '🐊',
                        label: 'Sebek', x: 940, y: 1640,
                        characterId: 'sebek', difficulty: 'Difficile',
                        field: 'images/fields/mobile/anticoEgittoNotte_3.jpg'
                    },
                    {
                        id: 'fm-5-neku', kind: 'duel', icona: '🛡️',
                        label: 'Neku', x: 1220, y: 1560,
                        characterId: 'neku', difficulty: 'Difficile',
                        field: 'images/fields/mobile/anticoEgittoNotte_3.jpg'
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
                        label: 'Sette su sette', x: 1330, y: 1420,
                        chi: 'Heishin', chiId: 'heishin',
                        testo: [
                            'Hai ripreso i miei Oggetti uno a uno. Ammirevole. Davvero.',
                            'Ma io non li ho mai voluti per me. Li ho raccolti per QUALCUN ALTRO, e adesso che sono tutti insieme lui può finalmente passare.'
                        ]
                    },
                    {
                        id: 'fm-6-heishin', kind: 'duel', icona: '🏛️',
                        label: 'Heishin', x: 1060, y: 1330,
                        characterId: 'heishin', difficulty: 'Difficile',
                        field: 'images/fields/mobile/anticoEgittoRovinePalazzo.jpg'
                    },
                    {
                        id: 'fm-6-seto', kind: 'duel', icona: '🔺',
                        label: 'Sacerdote Seto', x: 790, y: 1420,
                        characterId: 'priestSeto', difficulty: 'Difficile',
                        field: 'images/fields/mobile/anticoEgittoRovinePalazzo.jpg'
                    },
                    {
                        id: 'fm-6-tradimento', kind: 'scene', icona: '😈',
                        label: 'Il tradimento', x: 520, y: 1330,
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
                        label: 'DarkNite', x: 250, y: 1240,
                        characterId: 'darkNite', difficulty: 'Difficile',
                        field: 'images/fields/mobile/anticoEgittoNotte_1.jpg'
                    },
                    {
                        id: 'fm-7-nitemare', kind: 'scene', icona: '🌑',
                        label: 'La vera forma', x: 400, y: 1080,
                        chi: 'DarkNite',
                        testo: [
                            'Quella era la forma che uso con chi non merita di vedere l\'altra.',
                            'Guarda bene, principe. Non ci sarà una terza forma.'
                        ]
                    },
                    {
                        id: 'fm-7-finale-duello', kind: 'duel', icona: '👑',
                        label: 'Nitemare', x: 700, y: 980,
                        characterId: 'darkNite', difficulty: 'Difficile',
                        field: 'images/fields/mobile/anticoEgittoNotte_3.jpg'
                    },
                    {
                        id: 'fm-7-finale', kind: 'scene', icona: '🌅',
                        label: 'Le memorie', x: 990, y: 880,
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
        sfondo: ['images/story/freedom.jpg', 'images/fields/mobile/anticoEgittoGiorno_1.jpg'],
        descrizione: 'Una troupe televisiva scende in Egitto per girare una puntata come tante. Sotto la sabbia trova qualcosa che nessun archeologo aveva messo in conto, e il conduttore non torna a casa come ne era partito.',
        // Qui le fanmade ci stanno: e' la campagna goliardica, e
        // Giacobbo non e' materia da regolamento ufficiale.
        carteAmmesse: { origini: ['yu-gi-oh', 'fanmade'] },
        larghezza: 1400,
        altezza: 1800,
        capitoli: [
            {
                id: 'freedom-riprese',
                nome: 'Si gira',
                testo: 'Egitto, permessi in regola, telecamere accese. Per ora è una puntata come le altre.',
                tappe: [
                    {
                        id: 'freedom-1-scena', kind: 'scene', icona: '🎬',
                        label: 'Prima puntata', x: 190, y: 1660,
                        chi: 'Roberto Giacobbo', chiId: 'robertoGiacobbo',
                        testo: [
                            'Amici, benvenuti. Oggi siamo in Egitto, e la domanda che ci poniamo è semplice: e se quello che abbiamo letto sui libri fosse solo metà della storia?',
                            'La troupe è pronta, le telecamere girano. Voi seguiteci: non si sa mai dove si finisce.'
                        ]
                    },
                    {
                        id: 'freedom-1-ishizu', kind: 'duel', icona: '📿',
                        label: 'Ishizu Ishtar', x: 440, y: 1560,
                        characterId: 'ishizu', difficulty: 'Medio',
                        field: 'images/fields/mobile/anticoEgittoGiorno_1.jpg'
                    },
                    {
                        id: 'freedom-1-odion', kind: 'duel', icona: '🔥',
                        label: 'Odion', x: 700, y: 1640,
                        characterId: 'odion', difficulty: 'Medio',
                        field: 'images/fields/mobile/anticoEgittoGiorno_2.jpg'
                    },
                    {
                        id: 'freedom-1-shadi', kind: 'duel', icona: '🗝️',
                        label: 'Shadi', x: 950, y: 1530,
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
                        label: 'Il corridoio', x: 1180, y: 1390,
                        chi: 'Roberto Giacobbo', chiId: 'robertoGiacobbo',
                        testo: [
                            'Il nostro operatore ha inquadrato una crepa nella parete. Dietro la crepa, un corridoio che nessuna mappa riporta.',
                            'Vi confesso una cosa: a questo punto della puntata di solito sappiamo già come va a finire. Oggi no.'
                        ]
                    },
                    {
                        id: 'freedom-2-labirinto', kind: 'duel', icona: '🧱',
                        label: 'Labyrinth Mage', x: 960, y: 1240,
                        characterId: 'labyrinthMage', difficulty: 'Difficile',
                        field: 'images/fields/mobile/anticoEgittoNotte_2.jpg'
                    },
                    {
                        id: 'freedom-2-anubisius', kind: 'duel', icona: '🐺',
                        label: 'High Mage Anubisius', x: 690, y: 1150,
                        characterId: 'highMageAnubisius', difficulty: 'Difficile',
                        field: 'images/fields/mobile/anticoEgittoNotte_2.jpg'
                    },
                    {
                        id: 'freedom-2-sebek', kind: 'duel', icona: '🐊',
                        label: 'Sebek', x: 420, y: 1240,
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
                        label: 'La Corona', x: 230, y: 1010,
                        chi: 'Roberto Giacobbo', chiId: 'robertoGiacobbo',
                        testo: [
                            'Al centro della camera c\'è un oggetto che non compare in nessun catalogo: una corona.',
                            'Gli egittologi che abbiamo consultato sono categorici: non può esistere. E allora, amici, cos\'è che stiamo guardando?'
                        ]
                    },
                    {
                        id: 'freedom-3-isis', kind: 'duel', icona: '🔮',
                        label: 'Sacerdotessa Isis', x: 500, y: 900,
                        characterId: 'priestessIsis', difficulty: 'Difficile',
                        field: 'images/fields/mobile/anticoEgittoRovinePalazzo.jpg'
                    },
                    {
                        id: 'freedom-3-seto', kind: 'duel', icona: '🔺',
                        label: 'Sacerdote Seto', x: 780, y: 820,
                        characterId: 'priestSeto', difficulty: 'Difficile',
                        field: 'images/fields/mobile/anticoEgittoRovinePalazzo.jpg'
                    },
                    {
                        id: 'freedom-3-heishin', kind: 'duel', icona: '🏛️',
                        label: 'Heishin', x: 1060, y: 900,
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
                        label: 'Fuori dal confine', x: 1210, y: 660,
                        chi: 'La troupe',
                        testo: [
                            'Roberto, quella cosa non si tocca. Roberto. ROBERTO.',
                            'Le telecamere hanno continuato a registrare per altri quaranta minuti. Quello che hanno ripreso non è mai andato in onda.'
                        ]
                    },
                    {
                        id: 'freedom-4-darknite', kind: 'duel', icona: '😈',
                        label: 'DarkNite', x: 940, y: 520,
                        characterId: 'darkNite', difficulty: 'Difficile',
                        field: 'images/fields/mobile/anticoEgittoNotte_3.jpg'
                    },
                    {
                        id: 'freedom-4-giacobbo', kind: 'duel', icona: '🎥',
                        label: 'Roberto Giacobbo I', x: 640, y: 380,
                        characterId: 'robertoGiacobbo', difficulty: 'Difficile',
                        field: 'images/fields/mobile/anticoEgittoRovinePalazzo.jpg'
                    },
                    {
                        id: 'freedom-4-finale', kind: 'scene', icona: '☀️',
                        label: 'Titoli di coda', x: 340, y: 240,
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
        sfondo: ['images/story/ww1.jpg', 'images/fields/mobile/rovine_2.jpg'],
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
        sfondo: ['images/story/ww2.jpg', 'images/fields/mobile/rovine_2.jpg'],
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
