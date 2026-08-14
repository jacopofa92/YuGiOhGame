/**
 * characters-db.js — Database dei Duellanti sfidabili in "Duello Libero"
 * ------------------------------------------------------------------
 * Ogni personaggio ha un nome, un titolo/soprannome e un'immagine
 * (con fallback grafico se il file manca, stessa convenzione già
 * usata per le immagini delle carte in game-flow.js).
 *
 * Il record vittorie/sconfitte vive nel salvataggio unificato del
 * giocatore (vedi js/save-manager.js), così resta persistente tra una
 * sessione e l'altra insieme a nome giocatore e deck.
 */
const characterDatabase = [
    { id: 'yugiMuto', name: 'Yugi Muto', title: 'Il Re dei Giochi', image: 'images/characters/yugiMuto.jpg' },
    { id: 'yamiYugi', name: 'Yami Yugi', title: 'Il Faraone', image: 'images/characters/yamiYugi.jpg' },
    { id: 'kaiba', name: 'Seto Kaiba', title: 'Presidente della Kaiba Corporation', image: 'images/characters/setoKaiba.jpg' },
    { id: 'joey', name: 'Joey Wheeler', title: 'Il Duellante di Strada', image: 'images/characters/joeyWheeler.jpg' },
    { id: 'mai', name: 'Mai Valentine', title: 'La Regina delle Trappole', image: 'images/characters/maiValentine.jpg' },
    { id: 'pegasus', name: 'Maximillion Pegasus', title: 'Creatore del Duel Monsters', image: 'images/characters/maximillionPegasus.jpg' },
    { id: 'bakura', name: 'Ryo Bakura', title: 'Il Duellante Oscuro', image: 'images/characters/bakura.jpg' },
    { id: 'marik', name: 'Marik Ishtar', title: 'Il Padrone delle Ombre', image: 'images/characters/marik.jpg' },
    { id: 'mako', name: 'Mako Tsunami', title: 'Il Duellante dei Mari', image: 'images/characters/mako.jpg' },
    { id: 'weevil', name: 'Weevil Underwood', title: 'Maestro degli Insetti', image: 'images/characters/weevil.jpg' },
    { id: 'rex', name: 'Rex Raptor', title: 'Domatore di Dinosauri', image: 'images/characters/rex.jpg' },
    // ===== Resto del cast della PRIMA SERIE — Duelist Kingdom =====
    { id: 'bandit_keith', name: 'Bandit Keith', title: 'Il Duellante Imbroglione', image: 'images/characters/bandit_keith.jpg' },
    { id: 'panik', name: 'Panik', title: 'L\'Illusionista di Pegasus', image: 'images/characters/panik.jpg' },
    { id: 'bonz', name: 'Bonz', title: 'La Guida del Cimitero', image: 'images/characters/bonz.jpg' },
    // ===== Resto del cast della PRIMA SERIE — Battle City =====
    // Niente Doma/Waking the Dragons (Rafael, Alister, Valon...), che è la
    // stagione successiva: qui solo i duellanti veri dell'arco di Battle
    // City nell'anime originale.
    { id: 'odion', name: 'Odion', title: 'Il Guardiano di Marik', image: 'images/characters/odion.jpg' },
    { id: 'ishizu', name: 'Ishizu Ishtar', title: 'Guardiana del Necklace del Millennium', image: 'images/characters/ishizu.jpg' },
    { id: 'espaRoba', name: 'Espa Roba', title: 'Il Duellante Psichico', image: 'images/characters/espaRoba.jpg' },
    { id: 'arkana', name: 'Arkana', title: 'Il Prestigiatore Oscuro', image: 'images/characters/arkana.jpg' },
    { id: 'paradoxBrothers', name: 'Fratelli Paradosso', title: 'I Guardiani del Labirinto', image: 'images/characters/paradoxBrothers.jpg' },
    // "Te Stesso": un avversario speciale che dà il tuo stesso deck salvato
    // al bot, invece di un mazzo a tema fisso — vedi resetGameState() in
    // js/game-flow.js, che riconosce questo id come caso speciale.
    { id: 'mirror', name: 'Te Stesso', title: 'Il Tuo Riflesso', image: 'images/characters/mirror.jpg' },
    { id: 'robertoGiacobbo', name: 'Roberto Giacobbo I', title: 'Divinità egizia', image: 'images/characters/rg.jpg' },
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
