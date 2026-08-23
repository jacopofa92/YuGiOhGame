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
    { id: 'kaiba', name: 'Seto Kaiba', title: 'Presidente della Kaiba Corporation', image: 'images/characters/setoKaiba.jpg', series: 'main' },
    { id: 'rex', name: 'Rex Raptor', title: 'Domatore di Dinosauri', image: 'images/characters/rexRaptor.jpg', series: 'main' },
    { id: 'weevil', name: 'Weevil Underwood', title: 'Maestro degli Insetti', image: 'images/characters/weevilUnderwood.jpg', series: 'main' },
    { id: 'mako', name: 'Mako Tsunami', title: 'Il Duellante dei Mari', image: 'images/characters/makoTsunami.jpg', series: 'main' },
    { id: 'panik', name: 'Panik', title: 'L\'Illusionista di Pegasus', image: 'images/characters/panik.jpg', series: 'main' },
    { id: 'bonz', name: 'Bonz', title: 'La Guida del Cimitero', image: 'images/characters/bonz.jpg', series: 'main' },
    { id: 'paradoxBrothers', name: 'Fratelli Paradosso', title: 'I Guardiani del Labirinto', image: 'images/characters/paradoxBrothers.jpg', series: 'main' },
    { id: 'mai', name: 'Mai Valentine', title: 'La Regina delle Trappole', image: 'images/characters/maiValentine.jpg', series: 'main' },
    { id: 'bandit_keith', name: 'Bandit Keith', title: 'Il Duellante Imbroglione', image: 'images/characters/banditKeith.jpg', series: 'main' },
    { id: 'pegasus', name: 'Maximillion Pegasus', title: 'Creatore del Duel Monsters', image: 'images/characters/maximillionPegasus.jpg', series: 'main' },
    { id: 'tristan', name: 'Tristan Taylor', title: "L'Amico Leale", image: 'images/characters/tristanTaylor.jpg', series: 'main' },
    { id: 'serenity', name: 'Serenity Wheeler', title: 'La Sorella di Joey', image: 'images/characters/serenityWheeler.jpg', series: 'main' },
    { id: 'duke', name: 'Duke Devlin', title: 'Il Creatore di Dungeon Dice Monsters', image: 'images/characters/dukeDevlin.jpg', series: 'main' },
    { id: 'espaRoba', name: 'Espa Roba', title: 'Il Duellante Psichico', image: 'images/characters/espaRoba.jpg', series: 'main' },
    { id: 'arkana', name: 'Arkana', title: 'Il Prestigiatore Oscuro', image: 'images/characters/arkana.jpg', series: 'main' },
    { id: 'bakura', name: 'Ryo Bakura', title: 'Il Duellante Oscuro', image: 'images/characters/yamiBakura.jpg', series: 'main' },
    { id: 'ishizu', name: 'Ishizu Ishtar', title: 'Guardiana della collana del millennio', image: 'images/characters/ishizuIshtar.jpg', series: 'main' },
    { id: 'odion', name: 'Odion', title: 'Il Guardiano di Marik', image: 'images/characters/odion.jpg', series: 'main' },
    { id: 'marik', name: 'Marik Ishtar', title: 'Il Padrone delle Ombre', image: 'images/characters/yamiMarik.jpg', series: 'main' },
    // ===== Yu-Gi-Oh! Forbidden Memories (PS1, 2002) =====
    // L'antico Egitto e il torneo moderno del videogioco: personaggi
    // esclusivi di questo gioco (le controparti dell'antico Egitto di
    // Yugi/Joey/Téa/Kaiba si chiamano Atem/Jono/Teana/Sacerdote Seto), più
    // il cast originale della sua trama (Simon Muran, Heishin, DarkNite,
    // il superboss segreto Duel Master K).
    { id: 'simonMuran', name: 'Simon Muran', title: 'Il Tutore del Principe', image: 'images/characters/simonMuran.jpg', series: 'forbiddenMemories' },
    { id: 'jono', name: 'Jono', title: 'L\'Amico d\'Infanzia del Principe', image: 'images/characters/jono.jpg', series: 'forbiddenMemories' },
    { id: 'teana', name: 'Teana', title: 'L\'Amica d\'Infanzia del Principe', image: 'images/characters/teana.jpg', series: 'forbiddenMemories' },
    { id: 'priestSeto', name: 'Sacerdote Seto', title: 'Il Sommo Sacerdote', image: 'images/characters/priestSeto.jpg', series: 'forbiddenMemories' },
    { id: 'shadi', name: 'Shadi', title: 'Il Guardiano dell\'Equilibrio', image: 'images/characters/shadi.jpg', series: 'forbiddenMemories' },
    { id: 'priestessIsis', name: 'Sacerdotessa Isis', title: 'La Veggente della collana del millennio', image: 'images/characters/priestessIsis.jpg', series: 'forbiddenMemories' },
    { id: 'heishin', name: 'Heishin', title: 'L\'Usurpatore del Trono', image: 'images/characters/heishin.jpg', series: 'forbiddenMemories' },
    { id: 'darkNite', name: 'DarkNite', title: 'Lo Spirito di Nitemare', image: 'images/characters/darkNite.jpg', series: 'forbiddenMemories' },
    { id: 'duelMasterK', name: 'Duel Master K', title: 'Il Boss Segreto', image: 'images/characters/duelMasterK.jpg', series: 'forbiddenMemories' },
    // "Te Stesso": un avversario speciale che dà il tuo stesso deck salvato
    // al bot, invece di un mazzo a tema fisso — vedi resetGameState() in
    // js/engine/game-flow.js, che riconosce questo id come caso speciale.
    { id: 'mirror', name: 'Te Stesso', title: 'Il Tuo Riflesso', image: 'images/characters/mirror.jpg', series: 'main' },
    { id: 'robertoGiacobbo', name: 'Roberto Giacobbo I', title: 'Divinità egizia', image: 'images/characters/rg.jpg', series: 'extra' },
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
