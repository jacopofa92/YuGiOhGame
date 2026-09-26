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
//   - i mostri deboli devono essere davvero PREVALENTI su Facile (più
//     copie deboli che forti, non solo "presenti") su TUTTO il roster —
//     è il controllo che mancava quando l'utente ha segnalato "hai fatto
//     finta di sistemare i deck": la prima versione di
//     applyEasyTierDowngrade rispettava ogni regola scritta (niente
//     1800/1900, niente cannoni, Nega Attacco al posto delle staple) ma
//     si fermava a un tetto fisso di 5 scambi, lasciando i mostri deboli
//     una minoranza marginale in un mazzo come quello di Kaiba — un
//     controllo di sola "assenza di carte vietate" non l'avrebbe mai
//     preso, serve un controllo di VERA prevalenza;
//   - nessun mostro con ATK esattamente 1800/1900 (tranne la carta
//     simbolo del personaggio, protetta come sempre — verificato qui
//     con un personaggio la cui carta simbolo NON è a quell'ATK, cioè
//     Kaiba/Drago Bianco Occhi Blu 3000, dove la regola deve valere
//     senza eccezioni);
//   - i mostri Union "cannone" spariscono da Facile — verificato su
//     Bandit Keith, che in QUESTO dataset è chi li possiede davvero
//     (Kaiba non li ha mai avuti: la richiesta originale li citava per
//     lui, ma character-decks.js li assegna a Bandit Keith, più fedele
//     al canone — vedi il commento sopra applyEasyTierDowngrade);
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

        // Vera prevalenza dei mostri deboli su Facile, su TUTTO il roster:
        // le copie di mostri ATK<=1300 (esclusa la carta simbolo) devono
        // superare quelle dei mostri più forti, non solo esisterne alcune.
        // È il controllo che la versione precedente di questa funzione
        // avrebbe fallito silenziosamente (si fermava a un tetto fisso di
        // 5 scambi): una regressione a quel comportamento deve far
        // fallire questo test, non passare inosservata come prima.
        const prevalenza = await t.evaluate(() => {
            const WEAK_CEIL = 1300;
            const fallite = [];
            Object.keys(characterDeckDatabase).forEach((id) => {
                const base = characterDeckDatabase[id];
                const monsterEntriesBase = base.main
                    .map((e) => ({ entry: e, card: cardDatabase.find((c) => c.id === e.id) }))
                    .filter((x) => x.card && x.card.type === 'monster');
                if (!monsterEntriesBase.length) return;
                const flagshipId = [...monsterEntriesBase].sort((a, b) => b.card.attack - a.card.attack)[0].entry.id;
                const easy = getCharacterDeck(id, 'easy');
                const easyMonsters = easy.main
                    .map((e) => ({ entry: e, card: cardDatabase.find((c) => c.id === e.id) }))
                    .filter((x) => x.card && x.card.type === 'monster' && x.entry.id !== flagshipId);
                const copieDeboli = easyMonsters.filter((x) => x.card.attack <= WEAK_CEIL).reduce((s, x) => s + x.entry.qty, 0);
                const copieForti = easyMonsters.filter((x) => x.card.attack > WEAK_CEIL).reduce((s, x) => s + x.entry.qty, 0);
                // Un mazzo senza alcun mostro "forte" rimasto supera comunque
                // la richiesta (nessuna minaccia a cui essere prevalenti).
                if (copieForti > 0 && copieDeboli <= copieForti) {
                    fallite.push(`${id}: deboli=${copieDeboli} forti=${copieForti}`);
                }
            });
            return fallite;
        });
        t.assert(prevalenza.length === 0, `Mostri deboli non prevalenti su Facile:\n${prevalenza.join('\n')}`);

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

        // Bandit Keith: chi possiede DAVVERO i mostri Union "cannone" in
        // questo dataset (Kaiba non li ha mai avuti, vedi sopra) — qui il
        // test è significativo, non vacuo. Devono sparire da Facile e
        // restare interi da Normale in su ("usali da difficoltà normale e
        // difficile").
        const banditKeith = await t.evaluate(() => {
            const CANNONI = [510, 511, 512, 513, 515];
            const base = characterDeckDatabase.bandit_keith;
            const easy = getCharacterDeck('bandit_keith', 'easy');
            const hard = getCharacterDeck('bandit_keith', 'hard');
            return {
                base: base.main.filter((e) => CANNONI.includes(e.id)).length,
                easy: easy.main.filter((e) => CANNONI.includes(e.id)).length,
                hard: hard.main.filter((e) => CANNONI.includes(e.id)).length
            };
        });
        t.assert(banditKeith.base > 0, 'Il mazzo base di Bandit Keith dovrebbe contenere i mostri Union "cannone" (dataset cambiato?)');
        t.assert(banditKeith.easy === 0, `Bandit Keith/Facile non deve avere i mostri Union "cannone": ${banditKeith.easy} presenti`);
        t.assert(banditKeith.hard === banditKeith.base,
            `I mostri cannone di Bandit Keith devono restare intatti in Difficile (base ${banditKeith.base}, difficile ${banditKeith.hard})`);

        // Il bug reale preso scrivendo questa feature: ogni difficoltà
        // deve pagare crediti alla vittoria, 'Facile' compresa.
        const crediti = await t.evaluate(() => window.Rewards ? Rewards.rulesSummary().find((r) => /[Dd]uello vinto/.test(r.titolo)) : null);
        t.assert(crediti && /[Ff]acile/.test(crediti.testo) && /\+\d+ crediti contro un avversario [Ff]acile/.test(crediti.testo),
            `Il duello vinto deve pagare qualcosa anche contro un avversario Facile: ${JSON.stringify(crediti)}`);

        t.assert(true);
    }
};
