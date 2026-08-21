/**
 * starter-structure-decks.js — Catalogo degli Starter Deck e Structure
 * Deck "acquistabili" (in futuro, dal Negozio — vedi negozio.html).
 * ------------------------------------------------------------------
 * Ogni voce è un mazzo precostituito di sola lettura, nello stesso
 * formato { main: [{id,qty}], extra: [{id,qty}] } dei deck dei
 * personaggi (js/character-decks.js) — da Creazione Deck, se posseduto,
 * può essere clonato nella propria collezione esattamente come un deck
 * di un Duellante.
 *
 * Il possesso si stabilirà DAVVERO acquistando dal Negozio, quando
 * quella funzionalità sarà implementata (vedi SaveManager.ownsPack/
 * addOwnedPack in save-manager.js): per ora nessun pacchetto è
 * posseduto di default, quindi ogni voce qui sotto compare "bloccata"
 * in Creazione Deck finché il Negozio non vende davvero qualcosa.
 *
 * SCHELETRO: questi sono i veri Starter Deck / Structure Deck usciti
 * nel TCG occidentale (nomi, codici e anno reali), ma le liste carte
 * (main/extra) sono ancora vuote apposta — le compileremo carta per
 * carta in un secondo momento. Finché main/extra restano vuoti il
 * pacchetto resta comunque "bloccato" a schermo (Main: 0 · Extra: 0),
 * quindi non c'è alcun rischio di clonare un mazzo vuoto nel frattempo.
 */
const starterStructureDeckDatabase = [
    // --- Starter Deck -------------------------------------------------
    {
        packId: 'starter_sdy_yugi',
        kind: 'starter',
        name: 'Starter Deck: Yugi (SDY)',
        year: 2002,
        description: 'Il primo mazzo di Yugi Muto: Mago Nero ed Elfa Mistica in prima linea, pensato per chi muove i primi passi nel gioco.',
        // Lista reale delle 50 carte della versione Nord Americana (SDY-001
        // -> SDY-050, 2002) — nessun duplicato, un solo esemplare di
        // ciascuna. Verificata carta per carta contro il database di
        // questo progetto: 31 già presenti (2 con effetto corretto in
        // questa stessa sessione: Buco Trappola id 40, Rimuovi Magia id
        // 195), 19 aggiunte apposta con id 541-559.
        main: [
            { id: 391, qty: 1 }, // SDY-001 Elfa Mistica / Mystical Elf
            { id: 237, qty: 1 }, // SDY-002 Folletto Selvaggio Feroce / Feral Imp
            { id: 507, qty: 1 }, // SDY-003 Drago Alato, Guardiano della Fortezza #1
            { id: 13, qty: 1 },  // SDY-004 Teschio Evocato / Summoned Skull
            { id: 109, qty: 1 }, // SDY-005 Castoro Guerriero / Beaver Warrior
            { id: 2, qty: 1 },   // SDY-006 Mago Nero / Dark Magician (Ultra Rare)
            { id: 14, qty: 1 },  // SDY-007 Gaia il Cavaliere Feroce
            { id: 15, qty: 1 },  // SDY-008 Maledizione del Drago / Curse of Dragon
            { id: 4, qty: 1 },   // SDY-009 Guerriero Celtico / Celtic Guardian
            { id: 367, qty: 1 }, // SDY-010 Cimitero dei Mammut / Mammoth Graveyard
            { id: 279, qty: 1 }, // SDY-011 Grande Squalo Bianco / Great White
            { id: 444, qty: 1 }, // SDY-012 Zanna d'Argento / Silver Fang
            { id: 261, qty: 1 }, // SDY-013 Soldato di Pietra Gigante / Giant Soldier of Stone
            { id: 211, qty: 1 }, // SDY-014 Drago Zombie / Dragon Zombie
            { id: 203, qty: 1 }, // SDY-015 Doma l'Angelo del Silenzio
            { id: 541, qty: 1 }, // SDY-016 Ansatsu
            { id: 542, qty: 1 }, // SDY-017 Fantasma Arguto / Witty Phantom
            { id: 543, qty: 1 }, // SDY-018 Artiglio Raggiungente / Claw Reacher
            { id: 544, qty: 1 }, // SDY-019 Pagliaccio Mistico / Mystic Clown
            { id: 545, qty: 1 }, // SDY-020 Spada della Distruzione Oscura
            { id: 127, qty: 1 }, // SDY-021 Libro delle Arti Segrete / Book of Secret Arts
            { id: 7, qty: 1 },   // SDY-022 Buco Nero / Dark Hole
            { id: 546, qty: 1 }, // SDY-023 Dian Keto la Maestra delle Cure
            { id: 93, qty: 1 },  // SDY-024 Antico Elfo / Ancient Elf
            { id: 547, qty: 1 }, // SDY-025 Fantasma Magico / Magical Ghost
            { id: 243, qty: 1 }, // SDY-026 Faglia / Fissure
            { id: 40, qty: 1 },  // SDY-027 Buco Trappola / Trap Hole
            { id: 548, qty: 1 }, // SDY-028 Attacco a Doppia Punta / Two-Pronged Attack
            { id: 195, qty: 1 }, // SDY-029 Rimuovi Magia / De-Spell
            { id: 35, qty: 1 },  // SDY-030 Rinascita del Mostro / Monster Reborn
            { id: 549, qty: 1 }, // SDY-031 Rinforzi / Reinforcements
            { id: 147, qty: 1 }, // SDY-032 Cambio di Cuore / Change of Heart
            { id: 550, qty: 1 }, // SDY-033 Il Mistico Severo / The Stern Mystic
            { id: 54, qty: 1 },  // SDY-034 Muro d'Illusione / Wall of Illusion
            { id: 551, qty: 1 }, // SDY-035 Neo lo Spadaccino Magico
            { id: 552, qty: 1 }, // SDY-036 Barone della Spada Demoniaca / Baron of the Fiend Sword
            { id: 553, qty: 1 }, // SDY-037 Forziere Divoratore / Man-Eating Treasure Chest
            { id: 554, qty: 1 }, // SDY-038 Stregone dei Dannati / Sorcerer of the Doomed
            { id: 555, qty: 1 }, // SDY-039 Ultima Volontà / Last Will
            { id: 503, qty: 1 }, // SDY-040 Waboku
            { id: 451, qty: 1 }, // SDY-041 Scambio di Anime / Soul Exchange (Super Rare)
            { id: 138, qty: 1 }, // SDY-042 Distruzione di Carte / Card Destruction (Super Rare)
            { id: 556, qty: 1 }, // SDY-043 Maestro delle Trappole / Trap Master
            { id: 206, qty: 1 }, // SDY-044 Vaso Cattura-Drago / Dragon Capture Jar
            { id: 557, qty: 1 }, // SDY-045 Yami
            { id: 23, qty: 1 },  // SDY-046 Insetto Divoratore / Man-Eater Bug
            { id: 558, qty: 1 }, // SDY-047 Trappola Inversa / Reverse Trap
            { id: 417, qty: 1 }, // SDY-048 Rimuovi Trappola / Remove Trap
            { id: 143, qty: 1 }, // SDY-049 Mura del Castello / Castle Walls
            { id: 559, qty: 1 }  // SDY-050 Offerta Suprema / Ultimate Offering
        ],
        extra: []
    },
    {
        packId: 'starter_sdk_kaiba',
        kind: 'starter',
        name: 'Starter Deck: Kaiba (SDK)',
        year: 2002,
        description: 'Il mazzo di Seto Kaiba, costruito sulla forza bruta dei Draghi e sull\'ombra del Drago Bianco Occhi Blu.',
        // Lista reale delle 50 carte della versione Nord Americana (SDK-001
        // -> SDK-050, 2002) — nessun duplicato. Verificata carta per carta
        // (nome, ATK/DEF, testo di flavor dove disponibile) contro il
        // database di questo progetto: 26 già presenti, 22 aggiunte
        // apposta con id 560-581 (id 353 "Signore dei D." già presente ma
        // con effetto ancora non implementato, come altre carte simili).
        main: [
            { id: 1, qty: 1 },   // SDK-001 Drago Bianco Occhi Blu / Blue-Eyes White Dragon
            { id: 298, qty: 1 }, // SDK-002 Gigante Un Occhio / Hitotsu-Me Giant
            { id: 25, qty: 1 },  // SDK-003 Ryu Kishin
            { id: 560, qty: 1 }, // SDK-004 La Malvagia Bestia Verme / The Wicked Worm Beast
            { id: 106, qty: 1 }, // SDK-005 Bue da Battaglia / Battle Ox
            { id: 331, qty: 1 }, // SDK-006 Drago Koumori / Koumori Dragon
            { id: 317, qty: 1 }, // SDK-007 Uomo Giudice / Judge Man
            { id: 424, qty: 1 }, // SDK-008 Bambola Canaglia / Rogue Doll
            { id: 330, qty: 1 }, // SDK-009 Kojikocy
            { id: 561, qty: 1 }, // SDK-010 Uraby
            { id: 562, qty: 1 }, // SDK-011 Gyakutenno Megami
            { id: 389, qty: 1 }, // SDK-012 Cavaliere Mistico / Mystic Horseman
            { id: 563, qty: 1 }, // SDK-013 Terra il Terribile
            { id: 564, qty: 1 }, // SDK-014 Titano Oscuro del Terrore
            { id: 180, qty: 1 }, // SDK-015 Assalitore Oscuro / Dark Assailant
            { id: 565, qty: 1 }, // SDK-016 Maestro e Allievo / Master & Expert
            { id: 566, qty: 1 }, // SDK-017 Guerriero Sconosciuto del Demone / Unknown Warrior of Fiend
            { id: 544, qty: 1 }, // SDK-018 Pagliaccio Mistico / Mystic Clown
            { id: 567, qty: 1 }, // SDK-019 Orco dell'Ombra Nera / Ogre of the Black Shadow
            { id: 568, qty: 1 }, // SDK-020 Energia Oscura / Dark Energy
            { id: 569, qty: 1 }, // SDK-021 Rinvigorimento / Invigoration
            { id: 7, qty: 1 },   // SDK-022 Buco Nero / Dark Hole
            { id: 570, qty: 1 }, // SDK-023 Ookazi
            { id: 428, qty: 1 }, // SDK-024 Ryu-Kishin Potenziato / Ryu-Kishin Powered
            { id: 6, qty: 1 },   // SDK-025 Cavaliere Oscuro / Swordstalker
            { id: 335, qty: 1 }, // SDK-026 La Jinn il Genio Mistico della Lampada
            { id: 427, qty: 1 }, // SDK-027 Rude Kaiser
            { id: 571, qty: 1 }, // SDK-028 Golem Distruttore / Destroyer Golem
            { id: 572, qty: 1 }, // SDK-029 Uccello Rosso Teschio / Skull Red Bird
            { id: 573, qty: 1 }, // SDK-030 D. Human
            { id: 574, qty: 1 }, // SDK-031 Bestia Pallida / Pale Beast
            { id: 243, qty: 1 }, // SDK-032 Faglia / Fissure
            { id: 40, qty: 1 },  // SDK-033 Buco Trappola / Trap Hole
            { id: 548, qty: 1 }, // SDK-034 Attacco a Doppia Punta / Two-Pronged Attack
            { id: 195, qty: 1 }, // SDK-035 Rimuovi Magia / De-Spell
            { id: 35, qty: 1 },  // SDK-036 Rinascita del Mostro / Monster Reborn
            { id: 575, qty: 1 }, // SDK-037 La Spia Inesperta / The Inexperienced Spy
            { id: 549, qty: 1 }, // SDK-038 Rinforzi / Reinforcements
            { id: 576, qty: 1 }, // SDK-039 Telescopio Antico / Ancient Telescope
            { id: 577, qty: 1 }, // SDK-040 Giusto Dessert / Just Desserts
            { id: 353, qty: 1 }, // SDK-041 Signore dei D. / Lord of D. (già presente, effetto ancora non implementato)
            { id: 578, qty: 1 }, // SDK-042 Il Flauto per Evocare Draghi / The Flute of Summoning Dragon
            { id: 579, qty: 1 }, // SDK-043 Misterioso Burattinaio / Mysterious Puppeteer
            { id: 556, qty: 1 }, // SDK-044 Maestro delle Trappole / Trap Master
            { id: 580, qty: 1 }, // SDK-045 Sogen
            { id: 581, qty: 1 }, // SDK-046 Hane-Hane
            { id: 558, qty: 1 }, // SDK-047 Trappola Inversa / Reverse Trap
            { id: 417, qty: 1 }, // SDK-048 Rimuovi Trappola / Remove Trap
            { id: 143, qty: 1 }, // SDK-049 Mura del Castello / Castle Walls
            { id: 559, qty: 1 }  // SDK-050 Offerta Suprema / Ultimate Offering
        ],
        extra: []
    },
    {
        packId: 'starter_sdj_joey',
        kind: 'starter',
        name: 'Starter Deck: Joey (SDJ)',
        year: 2003,
        description: 'Il mazzo di Joey Wheeler, aggressivo e diretto, con Guerrieri in prima linea e il fedele Drago Nero Occhi Rossi.',
        // Lista reale delle 50 carte della versione Nord Americana (SDJ-001
        // -> SDJ-050, 2003) — nessun duplicato. Verificata carta per carta
        // contro il database di questo progetto: 31 già presenti, 19
        // aggiunte apposta con id 582-600 (id 600 "Trappola Fasulla" con
        // effetto ancora non implementato, troppo trasversale per questo
        // motore). "Spadaccino Fiammeggiante" per Flame Swordsman era un
        // doppione (ex id 524) di una carta già presente (id 58, già
        // collegata all'Extra Deck): unificate, l'effetto reale mancante
        // (danno extra se distrugge in battaglia) è stato aggiunto a id 58.
        main: [
            { id: 12, qty: 1 },  // SDJ-001 Drago Nero Occhi Rossi / Red-Eyes Black Dragon
            { id: 463, qty: 1 }, // SDJ-002 Spadaccino di Landstar / Swordsman of Landstar
            { id: 27, qty: 1 },  // SDJ-003 Cucciolo di Drago / Baby Dragon
            { id: 458, qty: 1 }, // SDJ-004 Spirito dell'Arpa / Spirit of the Harp
            { id: 582, qty: 1 }, // SDJ-005 Tartaruga Isola / Island Turtle
            { id: 539, qty: 1 }, // SDJ-006 Signore delle Fiamme / Flame Manipulator
            { id: 369, qty: 1 }, // SDJ-007 Masaki lo Spadaccino Leggendario
            { id: 583, qty: 1 }, // SDJ-008 Pesce dai 7 Colori / 7 Colored Fish
            { id: 98, qty: 1 },  // SDJ-009 Lucertola Corazzata / Armored Lizard
            { id: 584, qty: 1 }, // SDJ-010 Soldato di Fuoco Oscuro #1 / Darkfire Soldier #1
            { id: 585, qty: 1 }, // SDJ-011 Esploratore del Cielo / Sky Scout
            { id: 16, qty: 1 },  // SDJ-012 Gearfried il Cavaliere di Ferro / Gearfried the Iron Knight
            { id: 586, qty: 1 }, // SDJ-013 Uomo Karate / Karate Man
            { id: 587, qty: 1 }, // SDJ-014 Milus Radiant
            { id: 28, qty: 1 },  // SDJ-015 Mago del Tempo / Time Wizard
            { id: 365, qty: 1 }, // SDJ-016 Maha Vailo
            { id: 588, qty: 1 }, // SDJ-017 Maga della Fede / Magician of Faith
            { id: 589, qty: 1 }, // SDJ-018 Grande Occhio / Big Eye
            { id: 433, qty: 1 }, // SDJ-019 Sangan
            { id: 590, qty: 1 }, // SDJ-020 Principessa di Tsurugi / Princess of Tsurugi
            { id: 591, qty: 1 }, // SDJ-021 Cappello Magico Bianco / White Magical Hat
            { id: 592, qty: 1 }, // SDJ-022 Soldato Pinguino / Penguin Soldier
            // SDJ-023 Drago dei Mille e SDJ-024 Spadaccino di Fuoco sono
            // Mostri Fusione: vanno nell'array extra qui sotto, non main
            // (stessa convenzione di js/character-decks.js).
            { id: 594, qty: 1 }, // SDJ-025 Coccola Malevola / Malevolent Nuzzler
            { id: 7, qty: 1 },   // SDJ-026 Buco Nero / Dark Hole
            { id: 546, qty: 1 }, // SDJ-027 Dian Keto la Maestra delle Cure
            { id: 243, qty: 1 }, // SDJ-028 Faglia / Fissure
            { id: 195, qty: 1 }, // SDJ-029 Rimuovi Magia / De-Spell
            { id: 147, qty: 1 }, // SDJ-030 Cambio di Cuore / Change of Heart
            { id: 121, qty: 1 }, // SDJ-031 Blocca Attacco / Block Attack
            { id: 262, qty: 1 }, // SDJ-032 Turbine Gigante / Giant Trunade
            { id: 595, qty: 1 }, // SDJ-033 Il Guardiano Affidabile / The Reliable Guardian
            { id: 417, qty: 1 }, // SDJ-034 Rimuovi Trappola / Remove Trap
            { id: 35, qty: 1 },  // SDJ-035 Rinascita del Mostro / Monster Reborn
            { id: 38, qty: 1 },  // SDJ-036 Fusione / Polymerization
            { id: 596, qty: 1 }, // SDJ-037 Montagna / Mountain
            { id: 597, qty: 1 }, // SDJ-038 Tesoro del Drago / Dragon Treasure
            { id: 598, qty: 1 }, // SDJ-039 Riposo Eterno / Eternal Rest
            { id: 440, qty: 1 }, // SDJ-040 Scudo e Spada / Shield & Sword
            { id: 434, qty: 1 }, // SDJ-041 Capro Espiatorio / Scapegoat
            { id: 577, qty: 1 }, // SDJ-042 Giusto Dessert / Just Desserts
            { id: 40, qty: 1 },  // SDJ-043 Buco Trappola / Trap Hole
            { id: 549, qty: 1 }, // SDJ-044 Rinforzi / Reinforcements
            { id: 143, qty: 1 }, // SDJ-045 Mura del Castello / Castle Walls
            { id: 503, qty: 1 }, // SDJ-046 Waboku
            { id: 559, qty: 1 }, // SDJ-047 Offerta Suprema / Ultimate Offering
            { id: 599, qty: 1 }, // SDJ-048 Sette Attrezzi del Bandito / Seven Tools of the Bandit
            { id: 600, qty: 1 }, // SDJ-049 Trappola Fasulla / Fake Trap
            { id: 558, qty: 1 }  // SDJ-050 Trappola Inversa / Reverse Trap
        ],
        extra: [
            { id: 593, qty: 1 }, // SDJ-023 Drago dei Mille / Thousand Dragon
            { id: 58, qty: 1 }   // SDJ-024 Spadaccino di Fuoco / Flame Swordsman
        ]
    },
    {
        packId: 'starter_sdp_pegasus',
        kind: 'starter',
        name: 'Starter Deck: Pegasus (SDP)',
        year: 2003,
        description: 'Il mazzo di Maximillion Pegasus, incentrato sul Mondo dei Toon e sui suoi bizzarri mostri "cartoon".',
        main: [
            { id: 416, qty: 1 }, // SDP-001 Abbandonato / Relinquished
            { id: 412, qty: 1 }, // SDP-002 Ragazza Arciera Rossa / Red Archery Girl
            { id: 429, qty: 1 }, // SDP-003 Ryu-Ran
            { id: 306, qty: 1 }, // SDP-004 Mago Senza Volto Illusionista / Illusionist Faceless Mage
            { id: 424, qty: 1 }, // SDP-005 Bambola Canaglia / Rogue Doll
            { id: 561, qty: 1 }, // SDP-006 Uraby
            { id: 261, qty: 1 }, // SDP-007 Giant Soldier of Stone
            { id: 96, qty: 1 },  // SDP-008 Aqua Madoor
            { id: 481, qty: 1 }, // SDP-009 Alligatore Toon / Toon Alligator
            { id: 581, qty: 1 }, // SDP-010 Hane-Hane
            { id: 601, qty: 1 }, // SDP-011 Uccello Sonico / Sonic Bird
            { id: 315, qty: 1 }, // SDP-012 Bomba a Tempo / Jigen Bakudan
            { id: 602, qty: 1 }, // SDP-013 Maschera dell'Oscurità / Mask of Darkness
            { id: 508, qty: 1 }, // SDP-014 Strega della Foresta Nera / Witch of the Black Forest
            { id: 23, qty: 1 },  // SDP-015 Insetto Divoratore / Man-Eater Bug
            { id: 603, qty: 1 }, // SDP-016 Muka Muka
            { id: 531, qty: 1 }, // SDP-017 Clown del Sogno / Dream Clown
            { id: 604, qty: 1 }, // SDP-018 Ninja Armato / Armed Ninja
            { id: 605, qty: 1 }, // SDP-019 Esploratore Ombra di Hiro / Hiro's Shadow Scout
            { id: 123, qty: 1 }, // SDP-020 Drago Toon Occhi Blu / Blue-Eyes Toon Dragon
            { id: 486, qty: 1 }, // SDP-021 Teschio Evocato Toon / Toon Summoned Skull
            { id: 606, qty: 1 }, // SDP-022 Manga Ryu-Ran
            { id: 484, qty: 1 }, // SDP-023 Sirena Toon / Toon Mermaid
            { id: 487, qty: 1 }, // SDP-024 Mondo dei Toon / Toon World
            { id: 117, qty: 1 }, // SDP-025 Ciondolo Nero / Black Pendant
            { id: 7, qty: 1 },   // SDP-026 Buco Nero / Dark Hole
            { id: 546, qty: 1 }, // SDP-027 Dian Keto la Maestra delle Cure
            { id: 243, qty: 1 }, // SDP-028 Faglia / Fissure
            { id: 195, qty: 1 }, // SDP-029 Rimuovi Magia / De-Spell
            { id: 147, qty: 1 }, // SDP-030 Cambio di Cuore / Change of Heart
            { id: 69, qty: 1 },  // SDP-031 Stop Difesa / Stop Defense
            { id: 607, qty: 1 }, // SDP-032 Tifone dello Spazio Mistico / Mystical Space Typhoon
            { id: 608, qty: 1 }, // SDP-033 Assalto Sconsiderato / Rush Recklessly
            { id: 417, qty: 1 }, // SDP-034 Rimuovi Trappola / Remove Trap
            { id: 35, qty: 1 },  // SDP-035 Rinascita del Mostro / Monster Reborn
            { id: 609, qty: 1 }, // SDP-036 Liberazione dell'Anima / Soul Release
            { id: 557, qty: 1 }, // SDP-037 Yami
            { id: 116, qty: 1 }, // SDP-038 Rito dell'Illusione Nera / Black Illusion Ritual
            { id: 420, qty: 1 }, // SDP-039 Anello Magnetico / Ring of Magnetism
            { id: 272, qty: 1 }, // SDP-040 Carità Aggraziata / Graceful Charity
            { id: 40, qty: 1 },  // SDP-041 Buco Trappola / Trap Hole
            { id: 549, qty: 1 }, // SDP-042 Reinforcements
            { id: 143, qty: 1 }, // SDP-043 Mura del Castello / Castle Walls
            { id: 503, qty: 1 }, // SDP-044 Waboku
            { id: 599, qty: 1 }, // SDP-045 Sette Attrezzi del Bandito / Seven Tools of the Bandit
            { id: 559, qty: 1 }, // SDP-046 Offerta Suprema / Ultimate Offering
            { id: 610, qty: 1 }, // SDP-047 Goblin Ladro / Robbin' Goblin
            { id: 361, qty: 1 }, // SDP-048 Interferenza Magica / Magic Jammer
            { id: 611, qty: 1 }, // SDP-049 Giavellotto Incantato / Enchanted Javelin
            { id: 612, qty: 1 }  // SDP-050 Ala di Grifone / Gryphon Wing
        ],
        extra: []
    },
    {
        packId: 'starter_sye_yugi_evolution',
        kind: 'starter',
        name: 'Starter Deck: Yugi Evolution (SYE)',
        year: 2004,
        description: 'Versione aggiornata del mazzo di Yugi, con carte più recenti a supporto di Mago Nero e Maga Oscura.',
        main: [],
        extra: []
    },
    {
        packId: 'starter_ske_kaiba_evolution',
        kind: 'starter',
        name: 'Starter Deck: Kaiba Evolution (SKE)',
        year: 2004,
        description: 'Versione aggiornata del mazzo di Kaiba, con nuovo supporto per i Draghi e per il Drago Bianco Occhi Blu.',
        main: [],
        extra: []
    },
    {
        packId: 'starter_2006',
        kind: 'starter',
        name: 'Starter Deck 2006',
        year: 2006,
        description: 'Il mazzo introduttivo generico del 2006, pensato per insegnare le basi del gioco a chi inizia da zero.',
        main: [],
        extra: []
    },

    // --- Structure Deck -------------------------------------------------
    {
        packId: 'structure_sd1_dragons_roar',
        kind: 'structure',
        name: 'Structure Deck: Dragon\'s Roar (SD1)',
        year: 2005,
        description: 'Mazzo tematico dedicato ai mostri Tipo Drago e alla loro potenza distruttiva.',
        main: [],
        extra: []
    },
    {
        packId: 'structure_sd2_zombie_madness',
        kind: 'structure',
        name: 'Structure Deck: Zombie Madness (SD2)',
        year: 2005,
        description: 'Mazzo tematico dedicato ai mostri Tipo Zombie e alla loro capacità di risorgere dal Cimitero.',
        main: [],
        extra: []
    },
    {
        packId: 'structure_sd3_blaze_of_destruction',
        kind: 'structure',
        name: 'Structure Deck: Blaze of Destruction (SD3)',
        year: 2005,
        description: 'Mazzo tematico dedicato ai mostri Tipo Fuoco e agli effetti di danno diretto.',
        main: [],
        extra: []
    },
    {
        packId: 'structure_sd4_fury_from_the_deep',
        kind: 'structure',
        name: 'Structure Deck: Fury from the Deep (SD4)',
        year: 2005,
        description: 'Mazzo tematico dedicato ai mostri Tipo Pesce e Serpente di Mare e al controllo del campo tramite "Umi".',
        main: [],
        extra: []
    },
    {
        packId: 'structure_sd5_warriors_triumph',
        kind: 'structure',
        name: 'Structure Deck: Warrior\'s Triumph (SD5)',
        year: 2006,
        description: 'Mazzo tematico dedicato ai mostri Tipo Guerriero e alle Magie/Trappole di supporto diretto.',
        main: [],
        extra: []
    },
    {
        packId: 'structure_sd6_spellcasters_judgment',
        kind: 'structure',
        name: 'Structure Deck: Spellcaster\'s Judgment (SD6)',
        year: 2006,
        description: 'Mazzo tematico dedicato ai mostri Tipo Incantatore, con Mago Nero e Maga Oscura come punte di diamante.',
        main: [],
        extra: []
    },
    {
        packId: 'structure_sd7_invincible_fortress',
        kind: 'structure',
        name: 'Structure Deck: Invincible Fortress (SD7)',
        year: 2006,
        description: 'Mazzo tematico difensivo, costruito attorno a mostri resistenti e a Trappole di controllo del campo.',
        main: [],
        extra: []
    },
    {
        packId: 'structure_sd8_lord_of_the_storm',
        kind: 'structure',
        name: 'Structure Deck: Lord of the Storm (SD8)',
        year: 2007,
        description: 'Mazzo tematico dedicato ai mostri Tipo Bestia Alata e agli effetti legati all\'Attributo VENTO.',
        main: [],
        extra: []
    },
    {
        packId: 'structure_sd9_dinosaurs_rage',
        kind: 'structure',
        name: 'Structure Deck: Dinosaur\'s Rage (SD9)',
        year: 2007,
        description: 'Mazzo tematico dedicato ai mostri Tipo Dinosauro e alla loro forza d\'attacco brutale.',
        main: [],
        extra: []
    },
    {
        packId: 'structure_sd10_machine_revolt',
        kind: 'structure',
        name: 'Structure Deck: Machine Re-Volt (SD10)',
        year: 2007,
        description: 'Mazzo tematico dedicato ai mostri Tipo Macchina e alle loro combinazioni Union.',
        main: [],
        extra: []
    }
];

function getStarterStructureDeck(packId) {
    return starterStructureDeckDatabase.find((d) => d.packId === packId) || null;
}
