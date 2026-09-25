/**
 * characters-db.js — Database dei Duellanti sfidabili in "Duello Libero"
 * ------------------------------------------------------------------
 * Ogni personaggio ha un nome, un titolo/soprannome, un'immagine
 * (con fallback grafico se il file manca, stessa convenzione già usata
 * per le immagini delle carte in game-flow.js) e una "series", che dice
 * da quale gioco/saga viene:
 *   'main'             — l'anime originale (Duelist Kingdom, Battle City)
 *   'forbiddenMemories' — il videogioco PS1 "Yu-Gi-Oh! Forbidden Memories"
 *   'extra'            — fuori-canone/fan-made (es. l'easter egg Giacobbo)
 *   'special'          — avversari speciali che non appartengono a una
 *                         saga vera e propria (es. "Te Stesso")
 *
 * Il record vittorie/sconfitte vive nel salvataggio unificato del
 * giocatore (vedi js/save-manager.js), così resta persistente tra una
 * sessione e l'altra insieme a nome giocatore e deck.
 *
 * `duelTrack` (facoltativo) — il TEMA DI DUELLO del personaggio: quando
 * lo si affronta suona sempre quello, in qualunque torneo e a qualunque
 * turno, invece della traccia prevista per quella fase. Richiesta
 * esplicita dell'utente per Kaiba ("nei tornei voglio che abbia sempre la
 * sua musica di duello"), estesa a Pegasus che era già trattato allo
 * stesso modo in due tornei su tre.
 *
 * Sta QUI, nell'anagrafica, e non nelle pagine dei tornei come le
 * battute: una battuta cambia col contesto (lo stesso personaggio parla
 * diversamente al Cancello del Castello e in cima alla Torre Kaiba), il
 * tema musicale no — è del personaggio, e prima viveva copiato in tre
 * file con tre valori diversi fra loro.
 */
const characterDatabase = [
    // ===== PRIMA SERIE — ordine scelto esplicitamente dall'utente, non
    // raggruppato per arco narrativo (Duelist Kingdom/Battle City/amici di
    // Domino City come prima): non modificare quest'ordine senza una
    // richiesta esplicita, è come l'utente vuole che appaia il roster. =====
    { id: 'yugiMuto', name: 'Yugi Muto', title: 'Il Re dei Giochi', image: 'images/characters/yugiMuto.jpg', series: 'main' },
    { id: 'solomonMuto', name: 'Solomon Muto', title: 'Il Nonno Collezionista', image: 'images/characters/solomonMuto.jpg', series: 'main' },
    { id: 'tea', name: 'Téa Gardner', title: "La Voce dell'Amicizia", image: 'images/characters/teaGardner.jpg', series: 'main' },
    { id: 'joey', name: 'Joey Wheeler', title: 'Il Duellante di Strada', image: 'images/characters/joeyWheeler.jpg', series: 'main' },
    { id: 'yamiYugi', name: 'Yami Yugi', title: 'Il Faraone', image: 'images/characters/yamiYugi.jpg', series: 'main' },
    { id: 'kaiba', name: 'Seto Kaiba', title: 'Presidente della Kaiba Corporation', image: 'images/characters/setoKaiba.jpg', series: 'main', duelTrack: '32. Seto Kaiba (Tournament Final).mp3' },
    { id: 'rex', name: 'Rex Raptor', title: 'Domatore di Dinosauri', image: 'images/characters/rexRaptor.jpg', series: 'main' },
    { id: 'weevil', name: 'Weevil Underwood', title: 'Maestro degli Insetti', image: 'images/characters/weevilUnderwood.jpg', series: 'main' },
    { id: 'mako', name: 'Mako Tsunami', title: 'Il Duellante dei Mari', image: 'images/characters/makoTsunami.jpg', series: 'main' },
    { id: 'panik', name: 'Panik', title: 'L\'Illusionista di Pegasus', image: 'images/characters/panik.jpg', series: 'main' },
    { id: 'bonz', name: 'Bonz', title: 'La Guida del Cimitero', image: 'images/characters/bonz.jpg', series: 'main' },
    { id: 'paradoxBrothers', name: 'Fratelli Paradosso', title: 'I Guardiani del Labirinto', image: 'images/characters/paradoxBrothers.jpg', series: 'main' },
    { id: 'mai', name: 'Mai Valentine', title: 'La Regina delle Trappole', image: 'images/characters/maiValentine.jpg', series: 'main' },
    { id: 'bandit_keith', name: 'Bandit Keith', title: 'Il Duellante Imbroglione', image: 'images/characters/banditKeith.jpg', series: 'main' },
    { id: 'pegasus', name: 'Maximillion Pegasus', title: 'Creatore del Duel Monsters', image: 'images/characters/maximillionPegasus.jpg', series: 'main', duelTrack: '35. High Mages.mp3' },
    { id: 'tristan', name: 'Tristan Taylor', title: "L'Amico Leale", image: 'images/characters/tristanTaylor.jpg', series: 'main' },
    { id: 'serenity', name: 'Serenity Wheeler', title: 'La Sorella di Joey', image: 'images/characters/serenityWheeler.jpg', series: 'main' },
    { id: 'duke', name: 'Duke Devlin', title: 'Il Creatore di Dungeon Dice Monsters', image: 'images/characters/dukeDevlin.jpg', series: 'main' },
    { id: 'espaRoba', name: 'Espa Roba', title: 'Il Duellante Psichico', image: 'images/characters/espaRoba.jpg', series: 'main' },
    { id: 'arkana', name: 'Arkana', title: 'Il Prestigiatore Oscuro', image: 'images/characters/arkana.jpg', series: 'main' },
    { id: 'bakura', name: 'Ryo Bakura', title: 'Il Duellante Oscuro', image: 'images/characters/yamiBakura.jpg', series: 'main' },
    { id: 'ishizu', name: 'Ishizu Ishtar', title: 'Guardiana della collana del millennio', image: 'images/characters/ishizuIshtar.jpg', series: 'main' },
    { id: 'odion', name: 'Odion', title: 'Il Guardiano di Marik', image: 'images/characters/odion.jpg', series: 'main' },
    { id: 'marik', name: 'Marik Ishtar', title: 'Il Padrone delle Ombre', image: 'images/characters/yamiMarik.jpg', series: 'main' },
    // --- Il Mondo Virtuale (dopo Battle City Parte 1) ---
    // Noah, Gozaburo e i Big Five: erano l'unico pezzo della prima serie
    // senza nessuno da affrontare, e infatti la campagna si fermava a
    // Battle City. RIMOSSI da questo elenco Dartz/Alister/Valon/Rafael
    // (Il Risveglio dei Draghi) e Zigfried/Leon (il Gran Premio KC): pur
    // essendo andati in onda nella stessa serie giapponese, l'utente ha
    // chiesto esplicitamente che la Storia restasse SOLO il percorso
    // Regno dei Duellanti → Battle City I → Mondo Virtuale → Battle City
    // II → viaggio nel passato — vedi js/data/story-campaigns.js. Non
    // avendo più nessuna tappa che li usi, quei sei personaggi sono stati
    // tolti anche da qui: lasciarli nel roster di Duello Libero senza che
    // nessuna Storia/Torneo li rendesse più sbloccabili li avrebbe
    // condannati a restare bloccati per sempre (vedi
    // js/data/character-unlocks.js: si sblocca SOLO vincendo in un
    // Torneo o nella Storia).
    // I ritratti dei Big Five non ci sono ancora: il gioco ripiega da
    // solo su un sigillo dorato con l'icona del personaggio (vedi
    // story-cutscene.js), e il giorno in cui l'immagine arriva basta
    // metterla in images/characters/ con questo nome — nessuna riga da
    // toccare.
    { id: 'noah', name: 'Noah Kaiba', title: 'Il Ragazzo del Mondo Virtuale', image: 'images/characters/noah.jpg', series: 'main' },
    { id: 'gansley', name: 'Gansley', title: 'Il Burattinaio della Rete', image: 'images/characters/gansley.jpg', series: 'main' },
    { id: 'johnson', name: 'Johnson', title: "Il Cacciatore della Giungla Virtuale", image: 'images/characters/johnson.jpg', series: 'main' },
    { id: 'nesbitt', name: 'Nesbitt', title: 'La Furia del Cantiere', image: 'images/characters/nesbitt.jpg', series: 'main' },
    { id: 'crump', name: 'Crump', title: "La Linea di Montaggio", image: 'images/characters/crump.jpg', series: 'main' },
    { id: 'lector', name: 'Lector', title: "L'Illusionista dei Cinque", image: 'images/characters/lector.jpg', series: 'main' },
    { id: 'gozaburo', name: 'Gozaburo Kaiba', title: 'Il Padrone della KaibaCorp', image: 'images/characters/gozaburo.jpg', series: 'main' },
    // ===== Yu-Gi-Oh! Forbidden Memories (PS1, 2002) =====
    // L'antico Egitto e il torneo moderno del videogioco: personaggi
    // esclusivi di questo gioco (le controparti dell'antico Egitto di
    // Yugi/Joey/Téa/Kaiba si chiamano Atem/Jono/Teana/Sacerdote Seto), più
    // il cast originale della sua trama (Simon Muran, Heishin, DarkNite) e
    // i guardiani del dungeon del Labirinto (i Maghi elementali/Sebek/Neku,
    // vedi il blocco qui sotto). "Duel Master K" è stato rimosso da questo
    // elenco su richiesta esplicita dell'utente.
    { id: 'simonMuran', name: 'Simon Muran', title: 'Il Tutore del Principe', image: 'images/characters/simonMuran.jpg', series: 'forbiddenMemories' },
    { id: 'jono', name: 'Jono', title: 'L\'Amico d\'Infanzia del Principe', image: 'images/characters/jono.jpg', series: 'forbiddenMemories' },
    { id: 'teana', name: 'Teana', title: 'L\'Amica d\'Infanzia del Principe', image: 'images/characters/teana.jpg', series: 'forbiddenMemories' },
    { id: 'priestSeto', name: 'Sacerdote Seto', title: 'Il Sommo Sacerdote', image: 'images/characters/priestSeto.jpg', series: 'forbiddenMemories' },
    { id: 'shadi', name: 'Shadi', title: 'Il Guardiano dell\'Equilibrio', image: 'images/characters/shadi.jpg', series: 'forbiddenMemories' },
    { id: 'priestessIsis', name: 'Sacerdotessa Isis', title: 'La Veggente della collana del millennio', image: 'images/characters/priestessIsis.jpg', series: 'forbiddenMemories' },
    // I 7 Maghi elementali del Labirinto (+ Sebek e Neku): i guardiani del
    // dungeon di Forbidden Memories tra il Cancello e i veri boss finali
    // qui sotto — richiesti esplicitamente dall'utente, posizionati subito
    // dopo Sacerdotessa Isis e prima di Heishin. Nessuna immagine reale
    // ancora disponibile per questi 13 (stesso caso già esistente per
    // "Duel Master K" prima di essere rimosso da questo elenco — vedi
    // js/data/character-decks.js): il gioco ricade già da solo su
    // un'icona generica quando il file non esiste, nessun problema.
    { id: 'oceanMage', name: 'Ocean Mage', title: 'Il Mago dell\'Oceano', image: 'images/characters/oceanMage.jpg', series: 'forbiddenMemories' },
    { id: 'highMageSecmeton', name: 'High Mage Secmeton', title: 'Il Sommo Mago dei Mari', image: 'images/characters/highMageSecmeton.jpg', series: 'forbiddenMemories' },
    { id: 'forestMage', name: 'Forest Mage', title: 'Il Mago della Foresta', image: 'images/characters/forestMage.jpg', series: 'forbiddenMemories' },
    { id: 'highMageAnubisius', name: 'High Mage Anubisius', title: 'Il Sommo Mago delle Tombe', image: 'images/characters/highMageAnubisius.jpg', series: 'forbiddenMemories' },
    { id: 'mountainMage', name: 'Mountain Mage', title: 'Il Mago della Montagna', image: 'images/characters/mountainMage.jpg', series: 'forbiddenMemories' },
    { id: 'highMageAtenza', name: 'High Mage Atenza', title: 'Il Sommo Mago dei Draghi', image: 'images/characters/highMageAtenza.jpg', series: 'forbiddenMemories' },
    { id: 'desertMage', name: 'Desert Mage', title: 'Il Mago del Deserto', image: 'images/characters/desertMage.jpg', series: 'forbiddenMemories' },
    { id: 'highMageMartis', name: 'High Mage Martis', title: 'Il Sommo Mago delle Rovine', image: 'images/characters/highMageMartis.jpg', series: 'forbiddenMemories' },
    { id: 'meadowMage', name: 'Meadow Mage', title: 'Il Mago del Prato', image: 'images/characters/meadowMage.jpg', series: 'forbiddenMemories' },
    { id: 'highMageKepura', name: 'High Mage Kepura', title: 'Il Sommo Mago della Luce', image: 'images/characters/highMageKepura.jpg', series: 'forbiddenMemories' },
    { id: 'labyrinthMage', name: 'Labyrinth Mage', title: 'Il Mago del Labirinto', image: 'images/characters/labyrinthMage.jpg', series: 'forbiddenMemories' },
    { id: 'sebek', name: 'Sebek', title: 'Il Guardiano Coccodrillo', image: 'images/characters/sebek.jpg', series: 'forbiddenMemories' },
    { id: 'neku', name: 'Neku', title: 'L\'Ultimo Guardiano', image: 'images/characters/neku.jpg', series: 'forbiddenMemories' },
    { id: 'heishin', name: 'Heishin', title: 'L\'Usurpatore del Trono', image: 'images/characters/heishin.jpg', series: 'forbiddenMemories' },
    { id: 'darkNite', name: 'DarkNite', title: 'Lo Spirito di Nitemare', image: 'images/characters/darkNite.jpg', series: 'forbiddenMemories' },
    // "Te Stesso": un avversario speciale che dà il tuo stesso deck salvato
    // al bot, invece di un mazzo a tema fisso — vedi resetGameState() in
    // js/engine/game-flow.js, che riconosce questo id come caso speciale.
    { id: 'mirror', name: 'Te Stesso', title: 'Il Tuo Riflesso', image: 'images/characters/mirror.jpg', series: 'main' },
    { id: 'robertoGiacobbo', name: 'Roberto Giacobbo I', title: 'Divinità egizia', image: 'images/characters/rg.jpg', series: 'extra' },

    // ===== Grande Guerra — comandi austro-ungarici =====
    // Gli avversari della campagna WW1 (js/data/story-campaigns.js). Sono
    // qui e non in un file a parte perché il roster è uno solo: Modalità
    // Storia, Duello Libero e Sfide leggono tutti da qui, e un secondo
    // elenco parallelo finirebbe per divergere.
    //
    // Non hanno ancora un ritratto sotto images/characters/: la mappa e il
    // duello ricadono da soli sull'icona quando l'immagine manca, quindi
    // aggiungerne uno dopo non richiede di toccare nient'altro.
    { id: 'ww1_boroevic', name: 'Svetozar Boroević', title: 'Il Leone dell\'Isonzo', image: 'images/characters/ww1_boroevic.jpg', series: 'ww1' },
    { id: 'ww1_conrad', name: 'Conrad von Hötzendorf', title: 'Capo di Stato Maggiore', image: 'images/characters/ww1_conrad.jpg', series: 'ww1' },
    { id: 'ww1_eugenio', name: 'Arciduca Eugenio d\'Asburgo', title: 'Comandante del Fronte Sud-Ovest', image: 'images/characters/ww1_eugenio.jpg', series: 'ww1' },
    { id: 'ww1_brumowski', name: 'Godwin von Brumowski', title: 'Asso Imperiale', image: 'images/characters/ww1_brumowski.jpg', series: 'ww1' },
    { id: 'ww1_arigi', name: 'Julius Arigi', title: 'Il Sergente Volante', image: 'images/characters/ww1_arigi.jpg', series: 'ww1' },
    { id: 'ww1_kaiserjager', name: 'Kaiserjäger Tirolese', title: 'La Guardia dell\'Imperatore', image: 'images/characters/ww1_kaiserjager.jpg', series: 'ww1' }
];

function getCharacterRecord(characterId) {
    if (window.SaveManager) return SaveManager.getRecord(characterId);
    // Fallback difensivo se save-manager.js non è caricato su questa pagina.
    try {
        const raw = localStorage.getItem('duelArenaRecord_' + characterId);
        if (raw) return JSON.parse(raw);
    } catch (e) { /* noop */ }
    return { wins: 0, losses: 0 };
}

function recordCharacterResult(characterId, won) {
    const record = getCharacterRecord(characterId);
    if (won) record.wins += 1; else record.losses += 1;
    if (window.SaveManager) {
        SaveManager.setRecord(characterId, record);
    } else {
        try {
            localStorage.setItem('duelArenaRecord_' + characterId, JSON.stringify(record));
        } catch (e) { /* noop */ }
    }
    return record;
}
