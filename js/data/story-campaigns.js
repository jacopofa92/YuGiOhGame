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
 * `x` e `y` sono la posizione della tappa sulla mappa, in px dentro il
 * mondo della campagna (`larghezza`/`altezza`). Sono scritti a mano, non
 * calcolati: un sentiero disegnato a mano racconta qualcosa (si sale
 * verso il castello, si torna indietro), una fila di pallini equidistanti
 * no.
 *
 * AGGIUNGERE UNA CAMPAGNA non richiede di toccare nient'altro: basta una
 * voce in questo elenco. Le altre due previste (Forbidden Memories e la
 * campagna WW1) sono dichiarate in fondo come "in arrivo", senza tappe:
 * la pagina le mostra bloccate invece di far finta che non esistano.
 */
const storyCampaignsDatabase = [
    {
        id: 'anime',
        nome: 'Il Regno delle Ombre',
        sottotitolo: 'La storia di Yugi Muto',
        icona: '🧩',
        // Sfondo della mappa: la stessa immagine usata come arena, così la
        // campagna ha l'aria del mondo in cui si gioca.
        sfondo: 'images/fields/mobile/rovine_1.jpg',
        descrizione: 'Dal giorno in cui Yugi completa il Puzzle del Millennio fino al Duello Cerimoniale: il Regno dei Duellanti, Battle City e tutto quello che c\'è in mezzo.',
        larghezza: 1400,
        altezza: 2600,
        capitoli: [
            {
                id: 'puzzle',
                nome: 'Il Puzzle del Millennio',
                tappe: [
                    {
                        id: 'anime-1-scena', kind: 'scene', icona: '🧩',
                        label: 'Otto anni dopo', x: 200, y: 2450,
                        chi: 'Solomon Muto',
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
                tappe: [
                    {
                        id: 'anime-2-scena', kind: 'scene', icona: '🏝️',
                        label: 'L\'invito', x: 1150, y: 2120,
                        chi: 'Maximillion Pegasus',
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
                tappe: [
                    {
                        id: 'anime-3-scena', kind: 'scene', icona: '🏙️',
                        label: 'Domino City', x: 960, y: 1180,
                        chi: 'Seto Kaiba',
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

    // Le due campagne ancora da scrivere. Dichiarate qui, senza capitoli:
    // la pagina le mostra bloccate con la loro descrizione, che e' piu'
    // onesto (e piu' utile) che non nominarle affatto.
    {
        id: 'forbiddenMemories',
        nome: 'Memorie Proibite',
        sottotitolo: 'Il Principe e i Cinque Grandi Maghi',
        icona: '🏺',
        sfondo: 'images/fields/mobile/rovine_1.jpg',
        descrizione: 'La trama di Yu-Gi-Oh! Forbidden Memories: Egitto antico, Heishin e i Maghi del dungeon del Labirinto.',
        larghezza: 1400,
        altezza: 1200,
        capitoli: [],
        premioFinale: null
    },
    {
        id: 'ww1',
        nome: 'Grande Guerra',
        sottotitolo: 'Campagna extra',
        icona: '🎖️',
        sfondo: 'images/fields/mobile/rovine_1.jpg',
        descrizione: 'Campagna a tema Prima Guerra Mondiale, con il set di carte dedicato.',
        larghezza: 1400,
        altezza: 1200,
        capitoli: [],
        premioFinale: null
    }
];

window.storyCampaignsDatabase = storyCampaignsDatabase;
