// Livello Facile: mazzi avversari più deboli, richiesti esplicitamente
// dall'utente ("a inizio partita con i deck base è molto difficile...
// gli avversari hanno deck troppo forti al di là della IA normale o
// difficile"). Vedi js/data/character-decks.js#applyEasyTierDowngrade
// per il modello completo (perché 'easy' condivide l'IA con 'medium',
// e la storia del vecchio "Facile" rimosso in passato per un motivo
// diverso — troppo poco distinguibile come IA, non come mazzo).
//
// Qui si sorveglia che la trasformazione sia SICURA su tutto il roster
// (mai una carta persa o duplicata oltre le 3 copie) e che le regole
// esplicite dell'utente valgano davvero:
//   - nessun mostro con ATK esattamente 1800/1900 (tranne la carta
//     simbolo del personaggio, protetta come sempre — verificato qui
//     con un personaggio la cui carta simbolo NON è a quell'ATK, cioè
//     Kaiba/Drago Bianco Occhi Blu 3000, dove la regola deve valere
//     senza eccezioni);
//   - i mostri Union "cannone" di Kaiba spariscono da Facile;
//   - Forza dello Specchio lascia il posto a Nega Attacco;
//   - ogni difficoltà (incluso 'easy', appena aggiunta) paga crediti
//     alla vittoria — bug reale preso scrivendo questa stessa modifica:
//     js/economy/rewards.js#WIN_CREDITS non aveva una voce 'Facile', e
//     una lookup mancante vale `undefined` -> 0 crediti, in silenzio.
const path = require('path');

module.exports = {
    name: 'Livello Facile: mazzi più deboli su tutto il roster, mai sotto le 40 carte',
    async run(t) {
        const RADICE = path.join(__dirname, '..', '..');
        await t.page.waitForFunction(
            () => typeof characterDeckDatabase !== 'undefined' && typeof getCharacterDeck === 'function' && typeof cardDatabase !== 'undefined',
            null, { timeout: 20000 }
        );

        const esito = await t.evaluate(() => {
            const UNION_CANNON_IDS = [510, 511, 512, 513, 515];
            const problemi = [];
            const personaggi = Object.keys(characterDeckDatabase);
            personaggi.forEach((id) => {
                ['easy', 'medium', 'hard'].forEach((difficolta) => {
                    const deck = getCharacterDeck(id, difficolta);
                    if (!deck || !deck.main || deck.main.length === 0) return; // mazzi vuoti/non compilati: fuori scope
                    const totale = deck.main.reduce((s, e) => s + e.qty, 0);
                    if (totale !== 40) problemi.push(`${id}[${difficolta}] totale=${totale}`);
                    const idsVisti = new Set();
                    deck.main.forEach((e) => {
                        if (e.qty > 3) problemi.push(`${id}[${difficolta}] ${e.id} ha ${e.qty} copie`);
                        if (idsVisti.has(e.id)) problemi.push(`${id}[${difficolta}] ${e.id} duplicato`);
                        idsVisti.add(e.id);
                        if (!cardDatabase.some((c) => c.id === e.id)) problemi.push(`${id}[${difficolta}] id ${e.id} inesistente`);
                    });
                });
            });
            return { problemi: problemi, personaggiTotali: personaggi.length };
        });
        t.assert(esito.personaggiTotali > 30, `Il roster sembra vuoto (${esito.personaggiTotali} personaggi)`);
        t.assert(esito.problemi.length === 0, `Mazzi non validi:\n${esito.problemi.join('\n')}`);

        // Kaiba: caso pulito senza l'eccezione "carta simbolo a 1800/1900"
        // (la sua è Drago Bianco Occhi Blu, 3000 ATK) — qui le regole di
        // Facile devono valere SENZA eccezioni.
        const kaiba = await t.evaluate(() => {
            const deck = getCharacterDeck('kaiba', 'easy');
            const vietati = deck.main.filter((e) => {
                const c = cardDatabase.find((x) => x.id === e.id);
                return c && c.type === 'monster' && (c.attack === 1800 || c.attack === 1900);
            });
            const cannoni = deck.main.filter((e) => [510, 511, 512, 513, 515].includes(e.id));
            const forzaSpecchio = deck.main.find((e) => e.id === 382);
            const negaAttacco = deck.main.find((e) => e.id === 820);
            return {
                vietati: vietati.map((e) => e.id),
                cannoni: cannoni.map((e) => e.id),
                forzaSpecchioPresente: !!forzaSpecchio,
                negaAttaccoCopie: negaAttacco ? negaAttacco.qty : 0
            };
        });
        t.assert(kaiba.vietati.length === 0, `Kaiba/Facile non deve avere mostri a 1800/1900 ATK: ${kaiba.vietati}`);
        t.assert(kaiba.cannoni.length === 0, `Kaiba/Facile non deve avere i mostri Union "cannone": ${kaiba.cannoni}`);
        t.assert(!kaiba.forzaSpecchioPresente, 'Kaiba/Facile non deve avere Forza dello Specchio');
        t.assert(kaiba.negaAttaccoCopie > 0, 'Kaiba/Facile deve avere almeno 1 copia di Nega Attacco al posto delle carte tolte');

        // Difficile: i mostri Union "cannone" di Kaiba restano interi da
        // Normale in su — richiesta esplicita dell'utente ("usali da
        // difficoltà normale e difficile").
        const kaibaDifficile = await t.evaluate(() => {
            const base = characterDeckDatabase.kaiba;
            const hard = getCharacterDeck('kaiba', 'hard');
            const cannoniBase = base.main.filter((e) => [510, 511, 512, 513, 515].includes(e.id));
            const cannoniHard = hard.main.filter((e) => [510, 511, 512, 513, 515].includes(e.id));
            return { base: cannoniBase.length, hard: cannoniHard.length };
        });
        if (kaibaDifficile.base > 0) {
            t.assert(kaibaDifficile.hard === kaibaDifficile.base,
                `I mostri cannone di Kaiba devono restare intatti in Difficile (base ${kaibaDifficile.base}, difficile ${kaibaDifficile.hard})`);
        }

        // Il bug reale preso scrivendo questa feature: ogni difficoltà
        // deve pagare crediti alla vittoria, 'Facile' compresa.
        const crediti = await t.evaluate(() => window.Rewards ? Rewards.rulesSummary().find((r) => /[Dd]uello vinto/.test(r.titolo)) : null);
        t.assert(crediti && /[Ff]acile/.test(crediti.testo) && /\+\d+ crediti contro un avversario [Ff]acile/.test(crediti.testo),
            `Il duello vinto deve pagare qualcosa anche contro un avversario Facile: ${JSON.stringify(crediti)}`);

        t.assert(true);
    }
};
