/**
 * characters-db.js — Database dei Duellanti sfidabili in "Duello Libero"
 * ------------------------------------------------------------------
 * Ogni personaggio ha un nome, un titolo/soprannome e un'immagine
 * (con fallback grafico se il file manca, stessa convenzione già
 * usata per le immagini delle carte in game-flow.js).
 *
 * Il record vittorie/sconfitte è salvato in localStorage per
 * personaggio, così resta persistente tra una sessione e l'altra.
 * Per ora nessuna battaglia reale aggiorna questi numeri (si parte
 * sempre da 0-0): recordCharacterResult() è già pronta per quando le
 * battaglie vere e proprie verranno implementate.
 */
const characterDatabase = [
    { id: 'yugi', name: 'Yugi Muto', title: 'Il Re dei Giochi', image: 'images/characters/yugi.jpg' },
    { id: 'kaiba', name: 'Seto Kaiba', title: 'Presidente della Kaiba Corporation', image: 'images/characters/kaiba.jpg' },
    { id: 'joey', name: 'Joey Wheeler', title: 'Il Duellante di Strada', image: 'images/characters/joey.jpg' },
    { id: 'mai', name: 'Mai Valentine', title: 'La Regina delle Trappole', image: 'images/characters/mai.jpg' },
    { id: 'pegasus', name: 'Maximillion Pegasus', title: 'Creatore del Duel Monsters', image: 'images/characters/pegasus.jpg' },
    { id: 'bakura', name: 'Ryo Bakura', title: 'Il Duellante Oscuro', image: 'images/characters/bakura.jpg' },
    { id: 'marik', name: 'Marik Ishtar', title: 'Il Padrone delle Ombre', image: 'images/characters/marik.jpg' },
    { id: 'mako', name: 'Mako Tsunami', title: 'Il Duellante dei Mari', image: 'images/characters/mako.jpg' },
    { id: 'weevil', name: 'Weevil Underwood', title: 'Maestro degli Insetti', image: 'images/characters/weevil.jpg' },
    { id: 'rex', name: 'Rex Raptor', title: 'Domatore di Dinosauri', image: 'images/characters/rex.jpg' },
];

function getCharacterRecord(characterId) {
    try {
        const raw = localStorage.getItem('duelArenaRecord_' + characterId);
        if (raw) return JSON.parse(raw);
    } catch (e) { /* noop */ }
    return { wins: 0, losses: 0 };
}

function recordCharacterResult(characterId, won) {
    const record = getCharacterRecord(characterId);
    if (won) record.wins += 1; else record.losses += 1;
    try {
        localStorage.setItem('duelArenaRecord_' + characterId, JSON.stringify(record));
    } catch (e) { /* noop */ }
    return record;
}
