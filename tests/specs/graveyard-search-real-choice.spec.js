// Continuazione dell'audit "cerca dal Deck/Cimitero senza vera scelta"
// (stessa famiglia di deck-search-real-choice.spec.js, qui sul
// Cimitero): Maschera dell'Oscurità (602), Sepoltura Prematura (633),
// Il Guerriero Ritorna in Vita (725), Fata della Primavera (728), Onda
// Sismica (818), Officina dell'Ingranaggio Antico (837), Richiamo degli
// Infestati (136), Capo dei Guardiani della Tomba (899), La Fanciulla
// Indulgente (901), Lanciere Sciocco (1036), Fushioh Richie (1130),
// Gilford la Leggenda (709, equip in sequenza), Spada Divina - Lama
// della Fenice (722, 2 scelte in sequenza), Libro della Vita (669, 2
// Cimiteri diversi + bug reale corretto: bandiva sempre oppGrave[0]
// senza filtrare c.type==='monster'), Cerchio degli Inferi (498) e
// Fabbrica dell'Ingranaggio Antico (841, rivelazione + bando a soglia
// di Livello) prendevano tutte il primo candidato trovato nel Cimitero
// invece di offrire una vera scelta.
//
// BUG REALE trovato scrivendo QUESTO test (non segnalato dall'utente):
// Lanciere Sciocco (1036) reagisce al proprio onDestroy, ma
// destroyMonster (duel-engine.js) manda GIÀ la carta stessa al proprio
// Cimitero PRIMA di sparare onDestroy — un filtro "c.type === 'monster'"
// senza escludere ctx.card.uid trova quindi SE STESSA come falso
// candidato aggiuntivo, aprendo un picker con una scelta fasulla (2
// "candidati" invece di 1) invece di auto-selezionare l'unico vero
// mostro da rianimare. Corretto aggiungendo `c.uid !== ctx.card.uid` al
// filtro — verificato qui esplicitamente con 2 VERI candidati diversi
// nel Cimitero (oltre a se stessa) per assicurarsi che il conteggio dei
// candidati non includa mai la carta appena distrutta.
//
// SECONDO BUG REALE trovato scrivendo QUESTO test: searchZoneWithChoice/
// takeCard rimuove GIÀ la carta scelta dalla zona PRIMA di chiamare
// onChosen — corretto per Spada Divina/Fabbrica dell'Ingranaggio Antico/
// Libro della Vita con il nuovo banishFromGraveyardWithChoice (che non
// rimuove nulla da solo, lascia fare a banishFromGraveyard), vedi
// card-effects.js per i dettagli completi.
//
// Nota metodologica: ogni click su un picker aspetta un vero CAMBIO di
// stato (waitForFunction sul conteggio delle righe, mai un waitForTimeout
// fisso) — sotto il carico della suite completa in parallelo, un'attesa
// fissa breve si è rivelata inaffidabile (stesso principio già
// documentato in tests/README.md).
module.exports = {
    name: 'Special Summon/recupero dal Cimitero: vera scelta (Lanciere Sciocco, Spada Divina, Gilford la Leggenda, Sepoltura Prematura)',
    async run(t) {
        // BUG DI TEST (non del motore) trovato con una riproduzione mirata:
        // freezeNaturalGameLoop() (harness.js) congela SOLO le decisioni
        // autonome del bot, MAI la cascata di transizione fase già in
        // volo dal caricamento della pagina (Draw -> Standby -> Main
        // Phase 1, vedi tests/README.md "Un'insidia reale già presa in
        // questa suite") — quella cascata può ancora completarsi DOPO il
        // freeze e PRIMA che questo test inizi a manipolare gameState,
        // interferendo con lo stato appena impostato (osservato: Gilford
        // la Leggenda scattava una seconda volta durante quella cascata
        // naturale, mentre il picker del test era già aperto). Aspettare
        // che la cascata si assesti da sola PRIMA di iniziare evita
        // l'interferenza, invece di inseguirla con timeout sempre più
        // lunghi sui passi successivi.
        await t.page.waitForTimeout(1500);
        const rowCount = () => t.page.locator('#cardListPickerRow .card-list-item').count();
        const waitForRowCountChange = async (previousCount) => {
            await t.page.waitForFunction(
                (prev) => document.querySelectorAll('#cardListPickerRow .card-list-item').length !== prev,
                previousCount,
                { timeout: 20000 }
            );
        };
        const clickAndWaitForChange = async (index, previousCount) => {
            await t.page.locator('#cardListPickerRow .card-list-item').nth(index).click();
            await waitForRowCountChange(previousCount);
        };

        // Lanciere Sciocco (1036): 2 VERI candidati nel Cimitero del
        // proprietario (oltre a se stessa, che deve essere esclusa) ->
        // vera scelta; il bot (altro lato) con 1 solo candidato auto-sceglie.
        const cretinOpen = await t.evaluate(() => {
            const filler = cardDatabase.find((c) => c.type === 'monster' && !c.extraDeck);
            const cretin = { ...cardDatabase.find((c) => c.id === 1036), uid: 'cretin-1' };
            const graveA = { ...filler, uid: 'cretin-grave-a' };
            const graveB = { ...filler, uid: 'cretin-grave-b' };
            const botGraveMonster = { ...filler, uid: 'cretin-bot-grave' };
            gameState.playerMonsterField = [{ card: cretin, position: 'attack', isFaceDown: false }, null, null, null, null];
            gameState.botMonsterField = [null, null, null, null, null];
            gameState.playerGraveyard = [graveA, graveB];
            gameState.botGraveyard = [botGraveMonster];
            DuelEngine.actions.destroyMonster('player', 0);
            return {
                modalOpen: document.getElementById('cardListPickerModal').classList.contains('open'),
                botSummoned: gameState.botMonsterField.some((s) => s && s.card.uid === 'cretin-bot-grave')
            };
        });
        t.assert(cretinOpen.modalOpen, 'Con 2 VERI candidati (esclusa se stessa) deve aprirsi un picker per il lato del giocatore');
        t.assert(cretinOpen.botSummoned, 'Il lato del bot (1 solo candidato) deve auto-selezionare senza alcun picker');
        let count = await rowCount();
        t.assert(count === 2, `Il picker deve mostrare esattamente i 2 VERI candidati, mai se stessa (rilevati ${count})`);
        await t.page.locator('#cardListPickerRow .card-list-item').nth(1).click();
        await t.page.waitForFunction(() => !document.getElementById('cardListPickerModal').classList.contains('open'), undefined, { timeout: 20000 });
        const cretinAfter = await t.evaluate(() => gameState.playerMonsterField.some((s) => s && s.card.uid === 'cretin-grave-b'));
        t.assert(cretinAfter, 'Deve Special Summonare ESATTAMENTE la carta scelta, non la prima trovata');

        // Sepoltura Prematura (633): 2 candidati nel proprio Cimitero -> vera scelta.
        const prematureOpen = await t.evaluate(() => {
            const filler = cardDatabase.find((c) => c.type === 'monster' && !c.extraDeck);
            const spell = { ...cardDatabase.find((c) => c.id === 633), uid: 'premature-1' };
            gameState.playerHand = [];
            gameState.playerLP = 8000;
            gameState.playerGraveyard = [{ ...filler, uid: 'prem-a' }, { ...filler, uid: 'prem-b' }];
            gameState.playerMonsterField = [null, null, null, null, null];
            const ctx = DuelEngine.makeContext('player', { card: spell });
            DuelEngine.getDefinition(633).activate(ctx);
            return document.getElementById('cardListPickerModal').classList.contains('open');
        });
        t.assert(prematureOpen, 'Sepoltura Prematura con 2 candidati nel Cimitero deve aprire un vero picker');
        await t.page.locator('#cardListPickerRow .card-list-item').nth(1).click();
        await t.page.waitForFunction(() => !document.getElementById('cardListPickerModal').classList.contains('open'), undefined, { timeout: 20000 });
        const prematureAfter = await t.evaluate(() => ({
            summoned: gameState.playerMonsterField.some((s) => s && s.card.uid === 'prem-b'),
            lpPaid: gameState.playerLP === 7200
        }));
        t.assert(prematureAfter.summoned, 'Deve Special Summonare la carta scelta dal Cimitero');
        t.assert(prematureAfter.lpPaid, 'Deve pagare 800 Life Points SOLO dopo la scelta (7200 attesi)');

        // Spada Divina - Lama della Fenice (722): 2 scelte in SEQUENZA
        // (banisce 2 Guerrieri, un picker alla volta, mai un ciclo sincrono).
        const phoenixOpen = await t.evaluate(() => {
            const warrior = { ...cardDatabase.find((c) => c.type === 'monster' && c.race === 'Guerriero' && !c.extraDeck) };
            const sword = { ...cardDatabase.find((c) => c.id === 722), uid: 'phoenix-1' };
            gameState.playerGraveyard = [
                { ...warrior, uid: 'warrior-a' },
                { ...warrior, uid: 'warrior-b' },
                { ...warrior, uid: 'warrior-c' },
                sword
            ];
            gameState.playerHand = [];
            gameState.playerBanished = [];
            const ctx = DuelEngine.makeContext('player', { card: sword });
            DuelEngine.getDefinition(722).activateFromGraveyardMainPhase(ctx);
            return document.getElementById('cardListPickerModal').classList.contains('open');
        });
        t.assert(phoenixOpen, 'Spada Divina con 3 Guerrieri nel Cimitero deve aprire il primo picker');
        count = await rowCount();
        t.assert(count === 3, `Il primo picker deve mostrare 3 Guerrieri (rilevati ${count})`);
        await clickAndWaitForChange(0, count);
        count = await rowCount();
        t.assert(count === 2, `Il secondo picker deve mostrare i 2 Guerrieri rimasti (rilevati ${count})`);
        await t.page.locator('#cardListPickerRow .card-list-item').nth(0).click();
        await t.page.waitForFunction(() => !document.getElementById('cardListPickerModal').classList.contains('open'), undefined, { timeout: 20000 });
        const phoenixAfter = await t.evaluate(() => ({
            banished: gameState.playerBanished.map((c) => c.uid).sort(),
            inHand: gameState.playerHand.some((c) => c.uid === 'phoenix-1')
        }));
        t.assert(JSON.stringify(phoenixAfter.banished) === JSON.stringify(['warrior-a', 'warrior-b']), `Deve bandire ESATTAMENTE i 2 Guerrieri scelti, rilevato ${JSON.stringify(phoenixAfter.banished)}`);
        t.assert(phoenixAfter.inHand, 'Deve tornare in mano dopo aver bandito 2 Guerrieri');

        // Gilford la Leggenda (709): 3 Equip nel Cimitero ma solo 2
        // caselle Magia/Trappola libere (3 già occupate su 5) -> 2 scelte
        // in sequenza, mai 3 (si ferma da sola quando le caselle finiscono).
        const gilfordOpen = await t.evaluate(() => {
            const equip = cardDatabase.find((c) => c.type === 'spell' && c.subtype === 'equip');
            const warrior = { ...cardDatabase.find((c) => c.type === 'monster' && c.race === 'Guerriero' && !c.extraDeck), uid: 'gilford-target' };
            const gilford = { ...cardDatabase.find((c) => c.id === 709), uid: 'gilford-1' };
            gameState.playerMonsterField = [{ card: warrior, position: 'attack', isFaceDown: false }, { card: gilford, position: 'attack', isFaceDown: false }, null, null, null];
            gameState.playerSTField = [null, null, { card: { ...equip, uid: 'occupied' }, isFaceDown: false }, { card: { ...equip, uid: 'occupied2' }, isFaceDown: false }, { card: { ...equip, uid: 'occupied3' }, isFaceDown: false }];
            gameState.playerGraveyard = [
                { ...equip, uid: 'equip-a' },
                { ...equip, uid: 'equip-b' },
                { ...equip, uid: 'equip-c' }
            ];
            const ctx = DuelEngine.makeContext('player', { card: gilford, summonedVia: 'normal' });
            DuelEngine.getDefinition(709).onSummon(ctx);
            return document.getElementById('cardListPickerModal').classList.contains('open');
        });
        t.assert(gilfordOpen, 'Gilford la Leggenda con Equip nel Cimitero e caselle libere deve aprire un picker');
        count = await rowCount();
        t.assert(count === 3, `Il primo picker deve mostrare le 3 Equip disponibili (rilevati ${count})`);
        await clickAndWaitForChange(0, count);
        // 1 sola casella libera resta -> un secondo picker con i 2 Equip rimasti.
        count = await rowCount();
        t.assert(count === 2, `Il secondo picker deve mostrare i 2 Equip rimasti (rilevati ${count})`);
        await t.page.locator('#cardListPickerRow .card-list-item').nth(0).click();
        await t.page.waitForFunction(() => !document.getElementById('cardListPickerModal').classList.contains('open'), undefined, { timeout: 20000 });
        const gilfordAfter = await t.evaluate(() => ({
            equippedCount: gameState.playerSTField.filter((s) => s && (s.card.uid === 'equip-a' || s.card.uid === 'equip-b' || s.card.uid === 'equip-c')).length,
            graveRemaining: gameState.playerGraveyard.filter((c) => c.uid === 'equip-a' || c.uid === 'equip-b' || c.uid === 'equip-c').length,
            modalOpen: document.getElementById('cardListPickerModal').classList.contains('open')
        }));
        t.assert(gilfordAfter.equippedCount === 2, `Deve equipaggiare ESATTAMENTE 2 Equip (le 2 caselle libere disponibili), rilevate ${gilfordAfter.equippedCount}`);
        t.assert(gilfordAfter.graveRemaining === 1, `1 Equip deve restare nel Cimitero (nessuna casella libera per lei), rilevate ${gilfordAfter.graveRemaining}`);
        t.assert(!gilfordAfter.modalOpen, 'Nessun terzo picker deve aprirsi quando le caselle libere finiscono');
    }
};
