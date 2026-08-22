/**
 * character-decks.js — Deck a tema per ogni Duellante di "Duello Libero".
 * ------------------------------------------------------------------
 * Ogni deck è espresso come lista di { id, qty } (id = card id in
 * cardDatabase, qty = copie, massimo 3 per carta come da regola
 * standard). Questi deck sono di sola lettura: dalla pagina di
 * Creazione Deck possono essere clonati nella propria collezione
 * (fino al limite di 30 deck) per poi essere modificati liberamente.
 *
 * Rifatti da zero con l'intero pool di 809 carte disponibile (invece
 * del pool ridotto di partenza), con più cura tematica per ogni
 * personaggio. Le chiavi corrispondono agli id in js/characters-db.js
 * — 'yugiMuto' e 'yamiYugi' hanno ora ciascuno il proprio deck (prima
 * esisteva solo una chiave orfana 'yugi' che nessuno referenziava, un
 * bug reale: senza un deck corrispondente il motore ripiegava sul pool
 * casuale generico invece di un mazzo a tema).
 */
const characterDeckDatabase = {
    // ===== Prima Serie — cast principale =====
    // Yugi Muto: il duellante "fisico", Mago Nero come colonna portante
    // e le 5 parti di Exodia come minaccia a sorpresa, proprio come nei
    // primi episodi dell'anime.
    yugiMuto: {
        main: [
            { id: 2, qty: 3 }, { id: 188, qty: 2 }, { id: 391, qty: 2 }, { id: 22, qty: 3 },
            { id: 4, qty: 2 }, { id: 6, qty: 2 }, { id: 25, qty: 2 }, { id: 28, qty: 2 },
            { id: 41, qty: 1 }, { id: 42, qty: 1 }, { id: 43, qty: 1 }, { id: 44, qty: 1 },
            { id: 11, qty: 1 }, { id: 433, qty: 1 }, { id: 194, qty: 1 },
            { id: 7, qty: 1 }, { id: 35, qty: 1 }, { id: 36, qty: 2 }, { id: 434, qty: 1 },
            { id: 161, qty: 1 },
            { id: 10, qty: 2 }, { id: 40, qty: 2 }, { id: 382, qty: 2 }
        ],
        extra: []
    },
    // Yami Yugi: il Faraone, più aggressivo e potente — Mago Nero +
    // Buster Blader si fondono in Paladino Oscuro, il suo colpo di
    // grazia nell'anime.
    yamiYugi: {
        main: [
            { id: 2, qty: 3 }, { id: 20, qty: 2 }, { id: 188, qty: 2 }, { id: 391, qty: 1 },
            { id: 6, qty: 2 }, { id: 733, qty: 1 }, { id: 736, qty: 1 }, { id: 738, qty: 1 },
            { id: 740, qty: 1 }, { id: 433, qty: 1 }, { id: 22, qty: 2 }, { id: 739, qty: 1 },
            { id: 550, qty: 1 }, { id: 551, qty: 1 },
            { id: 7, qty: 1 }, { id: 35, qty: 1 }, { id: 36, qty: 1 }, { id: 38, qty: 1 },
            { id: 434, qty: 1 }, { id: 272, qty: 1 },
            { id: 10, qty: 2 }, { id: 382, qty: 2 }, { id: 448, qty: 1 }, { id: 40, qty: 2 }
        ],
        extra: [{ id: 189, qty: 1 }]
    },
    // Kaiba: Drago Bianco Occhi Blu come sempre, ora con tutta la linea
    // evolutiva Drago Armato e più supporto Drago reale a disposizione.
    kaiba: {
        main: [
            { id: 1, qty: 3 }, { id: 15, qty: 2 }, { id: 123, qty: 1 }, { id: 305, qty: 1 },
            { id: 320, qty: 1 }, { id: 321, qty: 1 }, { id: 398, qty: 2 }, { id: 14, qty: 1 },
            { id: 104, qty: 2 }, { id: 17, qty: 1 }, { id: 429, qty: 1 }, { id: 454, qty: 1 },
            { id: 640, qty: 1 }, { id: 641, qty: 1 }, { id: 629, qty: 1 }, { id: 34, qty: 2 },
            { id: 7, qty: 1 }, { id: 35, qty: 1 }, { id: 36, qty: 2 }, { id: 578, qty: 1 },
            { id: 645, qty: 1 }, { id: 434, qty: 1 },
            { id: 10, qty: 2 }, { id: 40, qty: 2 }, { id: 382, qty: 2 }, { id: 793, qty: 1 }
        ],
        extra: [{ id: 29, qty: 1 }]
    },
    // Joey: Drago Nero Occhi Rossi e la sua evoluzione, più Predone
    // Vorse e Kuriboh — Drago Nero del Teschio come fusione a sorpresa,
    // proprio come contro Rex Raptor nell'anime.
    joey: {
        main: [
            { id: 12, qty: 3 }, { id: 13, qty: 2 }, { id: 502, qty: 3 }, { id: 4, qty: 2 },
            { id: 16, qty: 2 }, { id: 14, qty: 2 }, { id: 20, qty: 1 }, { id: 717, qty: 1 },
            { id: 720, qty: 1 }, { id: 719, qty: 1 }, { id: 718, qty: 1 }, { id: 638, qty: 1 },
            { id: 22, qty: 2 },
            { id: 7, qty: 1 }, { id: 35, qty: 1 }, { id: 36, qty: 2 }, { id: 37, qty: 1 },
            { id: 434, qty: 1 }, { id: 578, qty: 1 },
            { id: 10, qty: 2 }, { id: 40, qty: 2 }, { id: 382, qty: 1 }, { id: 599, qty: 1 }
        ],
        extra: [{ id: 102, qty: 1 }]
    },
    // Mai: le sue Lady Arpia al completo (inclusi i tre cloni), più un
    // arsenale di Trappole degno della "Regina delle Trappole".
    mai: {
        main: [
            { id: 288, qty: 3 }, { id: 290, qty: 2 }, { id: 782, qty: 1 }, { id: 783, qty: 1 },
            { id: 784, qty: 1 }, { id: 293, qty: 1 }, { id: 786, qty: 1 }, { id: 24, qty: 2 },
            { id: 391, qty: 2 }, { id: 96, qty: 1 }, { id: 172, qty: 2 }, { id: 93, qty: 1 },
            { id: 458, qty: 2 },
            { id: 289, qty: 1 }, { id: 291, qty: 1 }, { id: 788, qty: 1 }, { id: 7, qty: 1 },
            { id: 36, qty: 1 }, { id: 434, qty: 1 },
            { id: 292, qty: 1 }, { id: 10, qty: 2 }, { id: 40, qty: 2 }, { id: 382, qty: 2 },
            { id: 599, qty: 1 }, { id: 819, qty: 1 }
        ],
        extra: []
    },
    // Pegasus: il regno dei Toon, con Mondo dei Toon come pilastro
    // continuo e il resto del suo repertorio da creatore del gioco.
    pegasus: {
        main: [
            { id: 481, qty: 2 }, { id: 484, qty: 2 }, { id: 486, qty: 1 }, { id: 123, qty: 1 },
            { id: 391, qty: 2 }, { id: 188, qty: 2 }, { id: 2, qty: 1 }, { id: 28, qty: 2 },
            { id: 24, qty: 2 }, { id: 237, qty: 2 }, { id: 25, qty: 2 }, { id: 13, qty: 1 },
            { id: 487, qty: 2 }, { id: 485, qty: 1 }, { id: 7, qty: 1 }, { id: 35, qty: 1 },
            { id: 36, qty: 1 }, { id: 434, qty: 1 },
            { id: 482, qty: 2 }, { id: 10, qty: 2 }, { id: 40, qty: 2 }, { id: 382, qty: 2 }
        ],
        extra: []
    },
    // Bakura: Cambio di Cuore, spiriti oscuri e trappole occulte come
    // Incantesimo Ombra — inganno puro, come il duellante oscuro che è.
    bakura: {
        main: [
            { id: 13, qty: 2 }, { id: 237, qty: 2 }, { id: 25, qty: 2 }, { id: 428, qty: 1 },
            { id: 542, qty: 1 }, { id: 544, qty: 1 }, { id: 433, qty: 1 }, { id: 6, qty: 2 },
            { id: 663, qty: 2 }, { id: 656, qty: 1 }, { id: 658, qty: 1 }, { id: 661, qty: 1 },
            { id: 547, qty: 1 }, { id: 17, qty: 1 },
            { id: 147, qty: 1 }, { id: 7, qty: 1 }, { id: 35, qty: 1 }, { id: 36, qty: 1 },
            { id: 434, qty: 1 },
            { id: 439, qty: 2 }, { id: 10, qty: 2 }, { id: 40, qty: 2 }, { id: 382, qty: 2 },
            { id: 466, qty: 1 }, { id: 136, qty: 1 }
        ],
        extra: []
    },
    // Marik: Il Drago Alato di Ra come minaccia definitiva, circondato
    // da mostri "rubati" tramite Controllo Mentale — il Padrone delle
    // Ombre non gioca pulito.
    marik: {
        main: [
            { id: 472, qty: 1 }, { id: 13, qty: 2 }, { id: 12, qty: 1 }, { id: 17, qty: 1 },
            { id: 104, qty: 1 }, { id: 237, qty: 2 }, { id: 25, qty: 2 }, { id: 663, qty: 1 },
            { id: 520, qty: 1 }, { id: 518, qty: 1 }, { id: 502, qty: 2 }, { id: 34, qty: 1 },
            { id: 335, qty: 1 }, { id: 334, qty: 1 }, { id: 6, qty: 2 },
            { id: 130, qty: 1 }, { id: 7, qty: 1 }, { id: 35, qty: 1 }, { id: 36, qty: 1 },
            { id: 434, qty: 1 },
            { id: 439, qty: 2 }, { id: 10, qty: 2 }, { id: 40, qty: 2 }, { id: 382, qty: 2 },
            { id: 599, qty: 1 }
        ],
        extra: []
    },
    // Mako Tsunami: il regno dei mari — Umi come palcoscenico e il
    // Cimitero di Balena Fortezza come colpo di scena rituale.
    mako: {
        main: [
            { id: 71, qty: 1 }, { id: 91, qty: 2 }, { id: 252, qty: 1 }, { id: 279, qty: 2 },
            { id: 583, qty: 2 }, { id: 693, qty: 2 }, { id: 694, qty: 1 }, { id: 701, qty: 2 },
            { id: 702, qty: 2 }, { id: 703, qty: 2 }, { id: 260, qty: 1 }, { id: 691, qty: 1 },
            { id: 700, qty: 1 }, { id: 692, qty: 1 }, { id: 250, qty: 1 },
            { id: 253, qty: 1 }, { id: 497, qty: 1 }, { id: 7, qty: 1 }, { id: 35, qty: 1 },
            { id: 36, qty: 1 }, { id: 434, qty: 1 },
            { id: 706, qty: 1 }, { id: 10, qty: 2 }, { id: 40, qty: 2 }, { id: 382, qty: 2 }
        ],
        extra: []
    },
    // Weevil: sciame di Insetti con la combo Bozzolo dell'Evoluzione +
    // Falena Piccola/Grande Falena come punta di diamante.
    weevil: {
        main: [
            { id: 52, qty: 1 }, { id: 157, qty: 2 }, { id: 522, qty: 2 }, { id: 218, qty: 2 },
            { id: 295, qty: 2 }, { id: 316, qty: 2 }, { id: 323, qty: 1 }, { id: 403, qty: 1 },
            { id: 114, qty: 2 }, { id: 105, qty: 2 }, { id: 345, qty: 2 }, { id: 270, qty: 1 },
            { id: 156, qty: 1 },
            { id: 310, qty: 2 }, { id: 309, qty: 1 }, { id: 7, qty: 1 }, { id: 35, qty: 1 },
            { id: 36, qty: 1 }, { id: 434, qty: 1 },
            { id: 10, qty: 2 }, { id: 40, qty: 2 }, { id: 382, qty: 2 }, { id: 158, qty: 1 }
        ],
        extra: []
    },
    // Rex Raptor: un branco di Dinosauri in Mondo Giurassico, con Colpo
    // di Coda e Istinto di Caccia a supportare la carica.
    rex: {
        main: [
            { id: 796, qty: 1 }, { id: 798, qty: 2 }, { id: 799, qty: 2 }, { id: 801, qty: 2 },
            { id: 803, qty: 2 }, { id: 807, qty: 1 }, { id: 266, qty: 2 }, { id: 284, qty: 1 },
            { id: 374, qty: 2 }, { id: 561, qty: 2 }, { id: 495, qty: 1 }, { id: 491, qty: 1 },
            { id: 367, qty: 1 }, { id: 360, qty: 1 },
            { id: 810, qty: 1 }, { id: 812, qty: 1 }, { id: 7, qty: 1 }, { id: 35, qty: 1 },
            { id: 36, qty: 1 }, { id: 434, qty: 1 },
            { id: 811, qty: 1 }, { id: 815, qty: 1 }, { id: 10, qty: 2 }, { id: 40, qty: 2 },
            { id: 382, qty: 2 }
        ],
        extra: []
    },
    // Bandit Keith: Macchine da guerra pure, dal Cannone Testa X/Testa
    // di Drago Y fino alla fusione finale Cannone Drago XYZ.
    bandit_keith: {
        main: [
            { id: 17, qty: 1 }, { id: 104, qty: 2 }, { id: 34, qty: 2 }, { id: 510, qty: 1 },
            { id: 513, qty: 1 }, { id: 515, qty: 1 }, { id: 824, qty: 1 }, { id: 832, qty: 1 },
            { id: 828, qty: 2 }, { id: 829, qty: 2 }, { id: 830, qty: 2 }, { id: 373, qty: 2 },
            { id: 377, qty: 1 }, { id: 447, qty: 1 }, { id: 359, qty: 1 },
            { id: 837, qty: 1 }, { id: 350, qty: 1 }, { id: 7, qty: 1 }, { id: 35, qty: 1 },
            { id: 36, qty: 1 }, { id: 434, qty: 1 },
            { id: 793, qty: 1 }, { id: 10, qty: 2 }, { id: 40, qty: 2 }, { id: 382, qty: 2 }
        ],
        extra: [{ id: 511, qty: 1 }, { id: 512, qty: 1 }]
    },
    // Panik: illusioni e pagliacci beffardi — Bickuribox come colpo di
    // scena della sua bara-labirinto.
    panik: {
        main: [
            { id: 306, qty: 2 }, { id: 346, qty: 1 }, { id: 431, qty: 1 }, { id: 530, qty: 1 },
            { id: 531, qty: 1 }, { id: 163, qty: 1 }, { id: 544, qty: 1 }, { id: 391, qty: 2 },
            { id: 188, qty: 2 }, { id: 24, qty: 2 }, { id: 237, qty: 2 }, { id: 13, qty: 2 },
            { id: 25, qty: 2 },
            { id: 130, qty: 1 }, { id: 7, qty: 1 }, { id: 35, qty: 1 }, { id: 36, qty: 1 },
            { id: 434, qty: 1 },
            { id: 439, qty: 2 }, { id: 10, qty: 2 }, { id: 40, qty: 2 }, { id: 382, qty: 2 },
            { id: 204, qty: 1 }, { id: 600, qty: 1 }
        ],
        extra: [{ id: 113, qty: 1 }]
    },
    // Bonz: sciame di Zombie da Cimitero con Richiamo degli Infestati
    // come cardine — Guerriero Zombie come fusione a sorpresa.
    bonz: {
        main: [
            { id: 656, qty: 2 }, { id: 658, qty: 2 }, { id: 663, qty: 2 }, { id: 664, qty: 1 },
            { id: 665, qty: 2 }, { id: 666, qty: 1 }, { id: 667, qty: 2 }, { id: 526, qty: 2 },
            { id: 108, qty: 1 }, { id: 406, qty: 1 }, { id: 437, qty: 1 }, { id: 547, qty: 1 },
            { id: 470, qty: 1 }, { id: 99, qty: 2 },
            { id: 251, qty: 1 }, { id: 7, qty: 1 }, { id: 35, qty: 1 }, { id: 36, qty: 1 },
            { id: 434, qty: 1 },
            { id: 136, qty: 2 }, { id: 10, qty: 2 }, { id: 40, qty: 2 }, { id: 382, qty: 2 },
            { id: 464, qty: 1 }, { id: 650, qty: 1 }
        ],
        extra: [{ id: 521, qty: 1 }]
    },
    // Odion: muraglia di Roccia, con Suijin/Kazejin/Sanga del Tuono
    // pronti a fondersi ne Il Guardiano del Cancello.
    odion: {
        main: [
            { id: 71, qty: 1 }, { id: 324, qty: 1 }, { id: 538, qty: 1 }, { id: 261, qty: 3 },
            { id: 756, qty: 2 }, { id: 757, qty: 2 }, { id: 760, qty: 1 }, { id: 761, qty: 1 },
            { id: 753, qty: 1 }, { id: 337, qty: 1 }, { id: 754, qty: 1 }, { id: 755, qty: 1 },
            { id: 762, qty: 1 }, { id: 759, qty: 1 }, { id: 85, qty: 1 }, { id: 112, qty: 1 },
            { id: 758, qty: 1 },
            { id: 7, qty: 1 }, { id: 35, qty: 1 }, { id: 36, qty: 1 }, { id: 434, qty: 1 },
            { id: 10, qty: 2 }, { id: 40, qty: 2 }, { id: 382, qty: 2 }, { id: 143, qty: 1 },
            { id: 707, qty: 1 }, { id: 849, qty: 1 }
        ],
        extra: [{ id: 33, qty: 1 }]
    },
    // Ishizu Ishtar: eleganza da Incantatore/Fata, con Elfa Mistica in
    // controllo e nessuna forza bruta di troppo.
    ishizu: {
        main: [
            { id: 391, qty: 3 }, { id: 458, qty: 2 }, { id: 24, qty: 2 }, { id: 188, qty: 2 },
            { id: 54, qty: 2 }, { id: 93, qty: 1 }, { id: 523, qty: 1 }, { id: 562, qty: 1 },
            { id: 442, qty: 1 }, { id: 443, qty: 1 }, { id: 234, qty: 2 }, { id: 402, qty: 1 },
            { id: 217, qty: 1 }, { id: 28, qty: 2 },
            { id: 7, qty: 1 }, { id: 35, qty: 1 }, { id: 36, qty: 1 }, { id: 434, qty: 1 },
            { id: 272, qty: 1 },
            { id: 10, qty: 2 }, { id: 40, qty: 2 }, { id: 382, qty: 2 }, { id: 448, qty: 1 },
            { id: 503, qty: 1 }
        ],
        extra: []
    },
    // Espa Roba: le 5 parti di Exodia come minaccia "predetta" psichica,
    // circondate da Demoni evocati dalla lampada.
    espaRoba: {
        main: [
            { id: 41, qty: 1 }, { id: 42, qty: 1 }, { id: 43, qty: 1 }, { id: 44, qty: 1 },
            { id: 11, qty: 1 }, { id: 335, qty: 2 }, { id: 334, qty: 2 }, { id: 25, qty: 2 },
            { id: 237, qty: 2 }, { id: 13, qty: 2 }, { id: 24, qty: 2 }, { id: 502, qty: 2 },
            { id: 34, qty: 1 }, { id: 6, qty: 2 },
            { id: 161, qty: 1 }, { id: 7, qty: 1 }, { id: 35, qty: 1 }, { id: 36, qty: 1 },
            { id: 434, qty: 1 }, { id: 272, qty: 1 },
            { id: 10, qty: 2 }, { id: 40, qty: 2 }, { id: 382, qty: 2 }, { id: 599, qty: 1 }
        ],
        extra: []
    },
    // Arkana: ossessionato dal Mago Nero, con Cambio di Cuore e
    // Incantesimo Ombra da vero prestigiatore imbroglione.
    arkana: {
        main: [
            { id: 2, qty: 1 }, { id: 188, qty: 2 }, { id: 391, qty: 2 }, { id: 54, qty: 2 },
            { id: 24, qty: 2 }, { id: 237, qty: 2 }, { id: 25, qty: 2 }, { id: 13, qty: 1 },
            { id: 736, qty: 1 }, { id: 739, qty: 1 }, { id: 544, qty: 1 }, { id: 17, qty: 1 },
            { id: 6, qty: 2 },
            { id: 147, qty: 1 }, { id: 7, qty: 1 }, { id: 35, qty: 1 }, { id: 36, qty: 1 },
            { id: 434, qty: 1 }, { id: 272, qty: 1 },
            { id: 10, qty: 2 }, { id: 40, qty: 2 }, { id: 382, qty: 2 }, { id: 439, qty: 1 },
            { id: 600, qty: 1 }
        ],
        extra: []
    },
    // Fratelli Paradosso: la loro arena-labirinto in carte — Roccia e
    // Insetto in stallo fitto di Trappole, con Giltia il Cavaliere D.
    // pronto a colpire dal Labirinto.
    paradoxBrothers: {
        main: [
            { id: 261, qty: 3 }, { id: 50, qty: 2 }, { id: 157, qty: 1 }, { id: 52, qty: 1 },
            { id: 337, qty: 1 }, { id: 535, qty: 2 }, { id: 536, qty: 2 }, { id: 603, qty: 1 },
            { id: 765, qty: 1 }, { id: 218, qty: 1 }, { id: 316, qty: 1 }, { id: 34, qty: 1 },
            { id: 295, qty: 1 }, { id: 112, qty: 1 }, { id: 85, qty: 1 },
            { id: 7, qty: 1 }, { id: 35, qty: 1 }, { id: 36, qty: 1 }, { id: 434, qty: 1 },
            { id: 272, qty: 1 },
            { id: 10, qty: 2 }, { id: 40, qty: 2 }, { id: 382, qty: 2 }, { id: 143, qty: 1 },
            { id: 333, qty: 1 }, { id: 815, qty: 1 }
        ],
        extra: [{ id: 268, qty: 1 }]
    },
    // Tristan Taylor (Honda): Guerriero aggressivo con qualche innesto
    // Macchina — riflette la sua vena da meccanico/motociclista.
    tristan: {
        main: [
            { id: 4, qty: 2 }, { id: 16, qty: 2 }, { id: 502, qty: 2 }, { id: 14, qty: 2 },
            { id: 317, qty: 2 }, { id: 47, qty: 2 }, { id: 101, qty: 1 }, { id: 108, qty: 1 },
            { id: 109, qty: 1 }, { id: 298, qty: 1 }, { id: 399, qty: 1 }, { id: 427, qty: 1 },
            { id: 477, qty: 1 }, { id: 373, qty: 1 }, { id: 97, qty: 1 },
            { id: 7, qty: 1 }, { id: 35, qty: 1 }, { id: 36, qty: 1 }, { id: 434, qty: 1 },
            { id: 272, qty: 1 },
            { id: 10, qty: 2 }, { id: 40, qty: 2 }, { id: 382, qty: 2 }, { id: 599, qty: 1 },
            { id: 600, qty: 1 }
        ],
        extra: []
    },
    // Téa Gardner (Anzu): Fata elegante e aggressiva, con Guardian Eatos
    // e la sua Spada Celeste come vero e proprio assolo.
    tea: {
        main: [
            { id: 523, qty: 2 }, { id: 82, qty: 2 }, { id: 217, qty: 2 }, { id: 442, qty: 2 },
            { id: 443, qty: 2 }, { id: 391, qty: 2 }, { id: 24, qty: 2 }, { id: 458, qty: 1 },
            { id: 283, qty: 1 }, { id: 779, qty: 1 }, { id: 562, qty: 1 }, { id: 234, qty: 1 },
            { id: 402, qty: 1 }, { id: 287, qty: 1 },
            { id: 145, qty: 1 }, { id: 7, qty: 1 }, { id: 35, qty: 1 }, { id: 36, qty: 1 },
            { id: 434, qty: 1 }, { id: 272, qty: 1 },
            { id: 10, qty: 2 }, { id: 40, qty: 2 }, { id: 382, qty: 2 }, { id: 503, qty: 1 },
            { id: 448, qty: 1 }
        ],
        extra: []
    },
    // Serenity Wheeler: la sorella di Joey, mazzo Incantatore/Fata gentile
    // e protettivo — più votato alla difesa e alla cura dei Life Points
    // che all'aggressione, come il suo temperamento.
    serenity: {
        main: [
            { id: 391, qty: 3 }, { id: 93, qty: 2 }, { id: 54, qty: 2 }, { id: 234, qty: 2 },
            { id: 402, qty: 2 }, { id: 442, qty: 1 }, { id: 443, qty: 1 }, { id: 588, qty: 1 },
            { id: 24, qty: 2 }, { id: 28, qty: 2 }, { id: 338, qty: 1 }, { id: 458, qty: 2 },
            { id: 779, qty: 1 }, { id: 217, qty: 1 },
            { id: 546, qty: 2 }, { id: 272, qty: 1 }, { id: 36, qty: 1 }, { id: 35, qty: 1 },
            { id: 434, qty: 1 },
            { id: 503, qty: 2 }, { id: 10, qty: 2 }, { id: 40, qty: 2 }, { id: 382, qty: 2 },
            { id: 819, qty: 1 }, { id: 448, qty: 1 }, { id: 771, qty: 1 }
        ],
        extra: []
    },
    // Duke Devlin: il creatore di Dungeon Dice Monsters, mazzo Guerriero
    // da "duellante d'azzardo" imperniato su lanci di dado — Dado di
    // Evocazione, Dado Aggraziato e Dado Teschio come suo marchio di
    // fabbrica, con Azzardo e Trappola Fasulla a completare il bluff.
    duke: {
        main: [
            { id: 14, qty: 1 }, { id: 317, qty: 2 }, { id: 16, qty: 2 }, { id: 502, qty: 2 },
            { id: 4, qty: 2 }, { id: 427, qty: 1 }, { id: 399, qty: 1 }, { id: 720, qty: 1 },
            { id: 719, qty: 1 }, { id: 718, qty: 1 }, { id: 717, qty: 1 }, { id: 47, qty: 1 },
            { id: 97, qty: 1 }, { id: 101, qty: 1 },
            { id: 460, qty: 2 }, { id: 273, qty: 2 }, { id: 200, qty: 1 }, { id: 197, qty: 1 },
            { id: 35, qty: 1 }, { id: 36, qty: 1 }, { id: 434, qty: 1 }, { id: 272, qty: 1 },
            { id: 445, qty: 2 }, { id: 425, qty: 1 }, { id: 255, qty: 1 }, { id: 600, qty: 1 },
            { id: 599, qty: 1 }, { id: 10, qty: 2 }, { id: 40, qty: 2 }, { id: 382, qty: 2 }
        ],
        extra: []
    },
    // Solomon Muto (Nonno Muto): mazzo "da vecchio collezionista",
    // varietà classica e senza sotto-temi precisi — proprio come nel
    // suo unico duello nell'anime.
    solomonMuto: {
        main: [
            { id: 4, qty: 2 }, { id: 93, qty: 1 }, { id: 14, qty: 1 }, { id: 260, qty: 1 },
            { id: 98, qty: 1 }, { id: 83, qty: 1 }, { id: 101, qty: 1 }, { id: 97, qty: 1 },
            { id: 108, qty: 2 }, { id: 126, qty: 1 }, { id: 27, qty: 2 }, { id: 15, qty: 1 },
            { id: 162, qty: 1 }, { id: 194, qty: 1 }, { id: 337, qty: 1 }, { id: 34, qty: 1 },
            { id: 106, qty: 1 }, { id: 107, qty: 1 }, { id: 247, qty: 1 },
            { id: 7, qty: 1 }, { id: 35, qty: 1 }, { id: 36, qty: 1 }, { id: 434, qty: 1 },
            { id: 272, qty: 1 },
            { id: 10, qty: 2 }, { id: 40, qty: 2 }, { id: 382, qty: 2 }, { id: 503, qty: 1 },
            { id: 600, qty: 1 }
        ],
        extra: []
    },
    // ===== Yu-Gi-Oh! Forbidden Memories (PS1) =====
    // Simon Muran: il saggio tutore del giovane principe, mazzo
    // Incantatore da supporto/controllo — niente fretta, solo carte solide.
    simonMuran: {
        main: [
            { id: 391, qty: 3 }, { id: 188, qty: 2 }, { id: 24, qty: 2 }, { id: 458, qty: 2 },
            { id: 54, qty: 2 }, { id: 93, qty: 1 }, { id: 28, qty: 2 }, { id: 550, qty: 1 },
            { id: 551, qty: 1 }, { id: 234, qty: 1 }, { id: 733, qty: 1 }, { id: 424, qty: 2 },
            { id: 242, qty: 1 }, { id: 338, qty: 1 },
            { id: 7, qty: 1 }, { id: 35, qty: 1 }, { id: 36, qty: 1 }, { id: 434, qty: 1 },
            { id: 272, qty: 1 },
            { id: 10, qty: 2 }, { id: 40, qty: 2 }, { id: 382, qty: 2 }, { id: 448, qty: 1 },
            { id: 503, qty: 1 }
        ],
        extra: []
    },
    // Jono: la controparte da villaggio dell'antico Egitto di Joey, mazzo
    // Guerriero/Bestia-Guerriero aggressivo come il suo omologo moderno.
    jono: {
        main: [
            { id: 4, qty: 3 }, { id: 16, qty: 2 }, { id: 502, qty: 2 }, { id: 14, qty: 2 },
            { id: 106, qty: 2 }, { id: 107, qty: 1 }, { id: 109, qty: 1 }, { id: 125, qty: 1 },
            { id: 317, qty: 2 }, { id: 47, qty: 1 }, { id: 399, qty: 1 }, { id: 427, qty: 1 },
            { id: 477, qty: 1 }, { id: 298, qty: 1 }, { id: 97, qty: 1 },
            { id: 7, qty: 1 }, { id: 35, qty: 1 }, { id: 36, qty: 1 }, { id: 434, qty: 1 },
            { id: 272, qty: 1 },
            { id: 10, qty: 2 }, { id: 40, qty: 2 }, { id: 382, qty: 2 }, { id: 599, qty: 1 },
            { id: 600, qty: 1 }
        ],
        extra: []
    },
    // Teana: la controparte da villaggio dell'antico Egitto di Téa, mazzo
    // Incantatore/Fata gentile ma solido — più votato al controllo che
    // alla versione moderna, più aggressiva.
    teana: {
        main: [
            { id: 24, qty: 3 }, { id: 391, qty: 2 }, { id: 458, qty: 2 }, { id: 188, qty: 1 },
            { id: 54, qty: 2 }, { id: 93, qty: 1 }, { id: 234, qty: 2 }, { id: 402, qty: 1 },
            { id: 442, qty: 1 }, { id: 443, qty: 1 }, { id: 28, qty: 2 }, { id: 338, qty: 1 },
            { id: 6, qty: 1 }, { id: 47, qty: 1 }, { id: 550, qty: 1 },
            { id: 7, qty: 1 }, { id: 35, qty: 1 }, { id: 36, qty: 1 }, { id: 434, qty: 1 },
            { id: 272, qty: 1 },
            { id: 10, qty: 2 }, { id: 40, qty: 2 }, { id: 382, qty: 2 }, { id: 503, qty: 1 }
        ],
        extra: []
    },
    // Sacerdote Seto: la controparte dell'antico Egitto di Kaiba e primo
    // custode del Drago Bianco Occhi Blu nel mito — stesso nucleo Drago
    // Bianco del suo omologo moderno, con qualche mostro da guerriero
    // dell'antico Egitto al posto delle Macchine troppo moderne.
    priestSeto: {
        main: [
            { id: 1, qty: 3 }, { id: 15, qty: 2 }, { id: 321, qty: 2 }, { id: 14, qty: 2 },
            { id: 13, qty: 2 }, { id: 502, qty: 2 }, { id: 429, qty: 1 }, { id: 454, qty: 1 },
            { id: 640, qty: 1 }, { id: 641, qty: 1 }, { id: 398, qty: 2 }, { id: 305, qty: 1 },
            { id: 16, qty: 1 }, { id: 4, qty: 1 },
            { id: 7, qty: 1 }, { id: 35, qty: 1 }, { id: 36, qty: 1 }, { id: 434, qty: 1 },
            { id: 578, qty: 1 },
            { id: 10, qty: 2 }, { id: 40, qty: 2 }, { id: 382, qty: 2 }, { id: 143, qty: 1 },
            { id: 793, qty: 1 }
        ],
        extra: [{ id: 29, qty: 1 }]
    },
    // Shadi: il misterioso Guardiano dell'Equilibrio, mazzo Roccia/muraglia
    // difensiva fitta di Trappole — imprevedibile e paziente, con Prova
    // del Viandante a mettere alla prova chi osa attaccarlo.
    shadi: {
        main: [
            { id: 756, qty: 2 }, { id: 761, qty: 2 }, { id: 760, qty: 1 }, { id: 757, qty: 1 },
            { id: 753, qty: 1 }, { id: 758, qty: 1 }, { id: 762, qty: 1 }, { id: 337, qty: 1 },
            { id: 603, qty: 1 }, { id: 759, qty: 1 }, { id: 754, qty: 1 }, { id: 755, qty: 1 },
            { id: 764, qty: 1 }, { id: 85, qty: 1 }, { id: 112, qty: 1 }, { id: 71, qty: 1 },
            { id: 261, qty: 2 }, { id: 766, qty: 1 },
            { id: 7, qty: 1 }, { id: 35, qty: 1 }, { id: 36, qty: 1 }, { id: 434, qty: 1 },
            { id: 272, qty: 1 },
            { id: 10, qty: 2 }, { id: 40, qty: 2 }, { id: 382, qty: 2 }, { id: 426, qty: 1 },
            { id: 771, qty: 1 }, { id: 489, qty: 1 }
        ],
        extra: []
    },
    // Sacerdotessa Isis: la veggente del Necklace del Millennium
    // nell'antico Egitto, mazzo Incantatore/Fata elegante e control-oriented,
    // controparte della sua discendente moderna Ishizu.
    priestessIsis: {
        main: [
            { id: 458, qty: 3 }, { id: 391, qty: 2 }, { id: 24, qty: 2 }, { id: 188, qty: 2 },
            { id: 54, qty: 2 }, { id: 93, qty: 1 }, { id: 523, qty: 1 }, { id: 562, qty: 1 },
            { id: 217, qty: 1 }, { id: 234, qty: 2 }, { id: 402, qty: 1 }, { id: 442, qty: 1 },
            { id: 28, qty: 2 }, { id: 338, qty: 1 }, { id: 443, qty: 1 },
            { id: 7, qty: 1 }, { id: 35, qty: 1 }, { id: 36, qty: 1 }, { id: 434, qty: 1 },
            { id: 272, qty: 1 },
            { id: 10, qty: 2 }, { id: 40, qty: 2 }, { id: 382, qty: 2 }, { id: 448, qty: 1 },
            { id: 503, qty: 1 }
        ],
        extra: []
    },
    // Heishin: il sacerdote usurpatore che rovescia il Faraone, mazzo
    // Demone/Guerriero oscuro e ambizioso.
    heishin: {
        main: [
            { id: 13, qty: 2 }, { id: 237, qty: 2 }, { id: 25, qty: 2 }, { id: 502, qty: 2 },
            { id: 6, qty: 2 }, { id: 17, qty: 1 }, { id: 104, qty: 1 }, { id: 335, qty: 1 },
            { id: 334, qty: 1 }, { id: 520, qty: 1 }, { id: 518, qty: 1 }, { id: 327, qty: 1 },
            { id: 355, qty: 1 }, { id: 428, qty: 1 }, { id: 433, qty: 1 }, { id: 663, qty: 1 },
            { id: 542, qty: 1 },
            { id: 7, qty: 1 }, { id: 35, qty: 1 }, { id: 36, qty: 1 }, { id: 434, qty: 1 },
            { id: 272, qty: 1 },
            { id: 439, qty: 2 }, { id: 10, qty: 2 }, { id: 40, qty: 2 }, { id: 382, qty: 1 },
            { id: 600, qty: 1 }
        ],
        extra: []
    },
    // DarkNite: l'antico spirito malvagio dietro Heishin (vera forma:
    // Nitemare), mazzo di grossi Draghi/Macchine/Demoni oscuri — pura forza
    // bruta da minaccia ultima, con Drago Berserk sbloccato dal suo Patto.
    darkNite: {
        main: [
            { id: 12, qty: 2 }, { id: 104, qty: 2 }, { id: 17, qty: 1 }, { id: 13, qty: 2 },
            { id: 34, qty: 2 }, { id: 493, qty: 1 }, { id: 110, qty: 1 }, { id: 638, qty: 1 },
            { id: 663, qty: 1 }, { id: 518, qty: 1 }, { id: 377, qty: 1 }, { id: 436, qty: 1 },
            { id: 520, qty: 1 }, { id: 354, qty: 1 }, { id: 429, qty: 1 }, { id: 447, qty: 1 },
            { id: 401, qty: 1 },
            { id: 78, qty: 1 }, { id: 7, qty: 1 }, { id: 35, qty: 1 }, { id: 36, qty: 1 },
            { id: 434, qty: 1 }, { id: 272, qty: 1 },
            { id: 439, qty: 1 }, { id: 10, qty: 2 }, { id: 40, qty: 2 }, { id: 382, qty: 2 },
            { id: 600, qty: 1 }
        ],
        extra: []
    },
    // Duel Master K: il boss segreto post-gioco, il più forte in assoluto —
    // unico personaggio con un Dio Egizio (Obelisk il Tormentatore) nel
    // proprio mazzo, accanto ai mostri più potenti disponibili.
    duelMasterK: {
        main: [
            { id: 30, qty: 1 }, { id: 1, qty: 3 }, { id: 20, qty: 2 }, { id: 104, qty: 2 },
            { id: 12, qty: 2 }, { id: 17, qty: 1 }, { id: 13, qty: 1 }, { id: 34, qty: 1 },
            { id: 317, qty: 2 }, { id: 267, qty: 1 }, { id: 381, qty: 1 }, { id: 733, qty: 1 },
            { id: 709, qty: 1 }, { id: 638, qty: 1 }, { id: 16, qty: 2 },
            { id: 7, qty: 1 }, { id: 35, qty: 1 }, { id: 36, qty: 1 }, { id: 434, qty: 1 },
            { id: 578, qty: 1 },
            { id: 10, qty: 2 }, { id: 40, qty: 2 }, { id: 382, qty: 2 }, { id: 448, qty: 1 },
            { id: 793, qty: 1 }
        ],
        extra: []
    },
    // Sacerdote Shada: guardiano dei sigilli dimensionali, mazzo Roccia
    // difensivo intriso di Trappole che teletrasportano/bloccano.
    priestShada: {
        main: [
            { id: 756, qty: 1 }, { id: 761, qty: 1 }, { id: 71, qty: 1 }, { id: 337, qty: 1 },
            { id: 603, qty: 1 }, { id: 759, qty: 1 }, { id: 764, qty: 1 }, { id: 754, qty: 1 },
            { id: 755, qty: 1 }, { id: 762, qty: 1 }, { id: 758, qty: 1 }, { id: 261, qty: 2 },
            { id: 757, qty: 1 }, { id: 760, qty: 1 }, { id: 753, qty: 1 }, { id: 765, qty: 1 },
            { id: 766, qty: 1 }, { id: 98, qty: 1 },
            { id: 7, qty: 1 }, { id: 35, qty: 1 }, { id: 36, qty: 1 }, { id: 434, qty: 1 },
            { id: 272, qty: 1 },
            { id: 201, qty: 1 }, { id: 312, qty: 1 }, { id: 771, qty: 1 }, { id: 10, qty: 2 },
            { id: 40, qty: 2 }, { id: 382, qty: 2 }, { id: 489, qty: 1 }, { id: 622, qty: 1 }
        ],
        extra: []
    },
    // Sacerdote Aknadin: cospiratore ambizioso divorato dall'ossessione
    // per il potere, mazzo Demone oscuro senza scrupoli.
    priestAknadin: {
        main: [
            { id: 167, qty: 1 }, { id: 13, qty: 2 }, { id: 25, qty: 2 }, { id: 237, qty: 2 },
            { id: 663, qty: 1 }, { id: 520, qty: 1 }, { id: 518, qty: 1 }, { id: 553, qty: 1 },
            { id: 564, qty: 1 }, { id: 282, qty: 1 }, { id: 210, qty: 1 }, { id: 428, qty: 1 },
            { id: 433, qty: 1 }, { id: 542, qty: 1 }, { id: 543, qty: 1 }, { id: 17, qty: 1 },
            { id: 602, qty: 1 }, { id: 589, qty: 1 },
            { id: 168, qty: 1 }, { id: 7, qty: 1 }, { id: 35, qty: 1 }, { id: 36, qty: 1 },
            { id: 434, qty: 1 }, { id: 272, qty: 1 },
            { id: 439, qty: 2 }, { id: 10, qty: 2 }, { id: 40, qty: 2 }, { id: 382, qty: 1 },
            { id: 600, qty: 1 }
        ],
        extra: []
    },
    // Sacerdote Karim: il protettore devoto associato alla Fenice —
    // mazzo Piroico/Bestia Alata infuocato, aggressivo e bruciante.
    priestKarim: {
        main: [
            { id: 672, qty: 2 }, { id: 682, qty: 2 }, { id: 354, qty: 1 }, { id: 429, qty: 1 },
            { id: 772, qty: 1 }, { id: 781, qty: 1 }, { id: 785, qty: 1 }, { id: 679, qty: 1 },
            { id: 742, qty: 1 }, { id: 744, qty: 1 }, { id: 242, qty: 1 }, { id: 539, qty: 1 },
            { id: 644, qty: 1 }, { id: 673, qty: 1 }, { id: 676, qty: 1 }, { id: 674, qty: 1 },
            { id: 681, qty: 1 }, { id: 683, qty: 1 }, { id: 684, qty: 1 },
            { id: 7, qty: 1 }, { id: 35, qty: 1 }, { id: 36, qty: 1 }, { id: 434, qty: 1 },
            { id: 570, qty: 1 }, { id: 297, qty: 1 },
            { id: 817, qty: 1 }, { id: 852, qty: 1 }, { id: 10, qty: 2 }, { id: 40, qty: 2 },
            { id: 382, qty: 2 }
        ],
        extra: []
    },
    // Rishid: il fedele guardiano-ombra della famiglia Ishtar, mazzo
    // Roccia difensivo che si sacrifica per proteggere — variante più
    // votata alle Trappole rispetto a quella di Odion.
    rishid: {
        main: [
            { id: 756, qty: 2 }, { id: 757, qty: 2 }, { id: 758, qty: 1 }, { id: 759, qty: 1 },
            { id: 760, qty: 1 }, { id: 761, qty: 1 }, { id: 762, qty: 1 }, { id: 337, qty: 1 },
            { id: 603, qty: 1 }, { id: 754, qty: 1 }, { id: 755, qty: 1 }, { id: 753, qty: 1 },
            { id: 764, qty: 1 }, { id: 765, qty: 1 }, { id: 766, qty: 1 }, { id: 85, qty: 1 },
            { id: 112, qty: 1 },
            { id: 7, qty: 1 }, { id: 35, qty: 1 }, { id: 36, qty: 1 }, { id: 434, qty: 1 },
            { id: 272, qty: 1 },
            { id: 10, qty: 2 }, { id: 40, qty: 2 }, { id: 382, qty: 2 }, { id: 503, qty: 1 },
            { id: 599, qty: 1 }, { id: 448, qty: 1 }
        ],
        extra: []
    },
    // Seena: misteriosa fanciulla mistica dell'antico Egitto, mazzo
    // Fata/Incantatore gentile e solido.
    seena: {
        main: [
            { id: 391, qty: 2 }, { id: 24, qty: 2 }, { id: 458, qty: 2 }, { id: 234, qty: 2 },
            { id: 402, qty: 1 }, { id: 442, qty: 1 }, { id: 443, qty: 1 }, { id: 283, qty: 1 },
            { id: 287, qty: 1 }, { id: 779, qty: 1 }, { id: 588, qty: 1 }, { id: 54, qty: 2 },
            { id: 93, qty: 1 }, { id: 28, qty: 2 }, { id: 338, qty: 1 },
            { id: 7, qty: 1 }, { id: 35, qty: 1 }, { id: 36, qty: 1 }, { id: 434, qty: 1 },
            { id: 272, qty: 1 },
            { id: 10, qty: 2 }, { id: 40, qty: 2 }, { id: 382, qty: 2 }, { id: 503, qty: 1 },
            { id: 448, qty: 1 }
        ],
        extra: []
    },
    // Bandit King (Bakura dell'antico Egitto): predone di tombe e spiriti
    // non-morti, mazzo Zombie/Demone aggressivo e senza pietà.
    banditKing: {
        main: [
            { id: 663, qty: 2 }, { id: 656, qty: 1 }, { id: 658, qty: 1 }, { id: 665, qty: 1 },
            { id: 666, qty: 1 }, { id: 667, qty: 1 }, { id: 13, qty: 2 }, { id: 237, qty: 2 },
            { id: 25, qty: 2 }, { id: 520, qty: 1 }, { id: 518, qty: 1 }, { id: 526, qty: 1 },
            { id: 406, qty: 1 }, { id: 99, qty: 2 }, { id: 470, qty: 1 }, { id: 547, qty: 1 },
            { id: 7, qty: 1 }, { id: 35, qty: 1 }, { id: 36, qty: 1 }, { id: 434, qty: 1 },
            { id: 272, qty: 1 },
            { id: 439, qty: 2 }, { id: 136, qty: 1 }, { id: 10, qty: 2 }, { id: 40, qty: 2 },
            { id: 382, qty: 1 }, { id: 600, qty: 1 }
        ],
        extra: []
    },
    // Roberto Giacobbo I: "Divinità egizia" — il boss easter egg, con Il
    // Drago Alato di Ra e le carte più potenti del gioco a piacimento.
    robertoGiacobbo: {
        main: [
            { id: 472, qty: 1 }, { id: 1, qty: 2 }, { id: 12, qty: 1 }, { id: 13, qty: 1 },
            { id: 17, qty: 1 }, { id: 104, qty: 1 }, { id: 733, qty: 1 }, { id: 656, qty: 1 },
            { id: 663, qty: 1 }, { id: 267, qty: 1 }, { id: 381, qty: 1 }, { id: 709, qty: 1 },
            { id: 638, qty: 1 }, { id: 20, qty: 1 }, { id: 16, qty: 2 }, { id: 14, qty: 1 },
            { id: 502, qty: 2 }, { id: 34, qty: 1 },
            { id: 7, qty: 1 }, { id: 35, qty: 1 }, { id: 36, qty: 1 }, { id: 434, qty: 1 },
            { id: 409, qty: 1 }, { id: 578, qty: 1 },
            { id: 10, qty: 2 }, { id: 40, qty: 2 }, { id: 382, qty: 2 }, { id: 448, qty: 1 },
            { id: 793, qty: 1 }
        ],
        extra: []
    }
};

function getCharacterDeck(characterId) {
    return characterDeckDatabase[characterId] || null;
}

/** Somma tutte le quantità di una lista { id, qty } */
function deckListCount(list) {
    return (list || []).reduce((sum, entry) => sum + entry.qty, 0);
}
