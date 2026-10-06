// Scarto scelto da CHI LO SUBISCE (victimChoosesDiscard, card-effects.js):
// Criosfinge (761) e Duo Delinquente (873). Prima ogni scelta di questo
// motore era di chi controllava l'effetto, e queste due carte ripiegavano
// su uno scarto a caso.
//
// Si controlla:
//  - vittima umana: il picker si apre sulla SUA mano anche quando l'effetto
//    è dell'avversario, e si scarta la carta scelta (la seconda, non la
//    prima: con un auto-pick sulla prima il test non proverebbe nulla);
//  - lo scarto è obbligatorio: chiudere il picker lo riapre;
//  - vittima bot: scarta la carta che vale meno per lui;
//  - Multiplayer a passo comune con vittima remota: questo motore aspetta
//    la posizione scelta dall'altro client e poi esegue lo stesso scarto.
module.exports = {
    name: 'Scelta di chi subisce lo scarto: Criosfinge (761) e Duo Delinquente (873)',
    async run(t) {
        const r = await t.evaluate(() => {
            const base = cardDatabase.find((c) => c.type === 'monster' && !c.extraDeck);
            const carta = (uid, id) => ({ ...(id ? cardDatabase.find((c) => c.id === id) : base), uid });
            const out = {};
            const origRandom = Math.random;

            // --- 873 attivata dal BOT: il giocatore sceglie la seconda carta ---
            gameState.playerHand = [carta('a'), carta('b'), carta('c')];
            gameState.playerGraveyard = [];
            gameState.botLP = 99999;
            let aperture = 0;
            window.DuelEngineUI = {
                openCardListPicker(cards, o) {
                    aperture++;
                    out.offerte = cards.map((c) => c.uid);
                    o.onSelect(cards[cards.length - 1]);
                }
            };
            Math.random = () => 0; // lo scarto a caso prende la prima carta
            DuelEngine.getDefinition(873).activate(DuelEngine.makeContext('bot', { card: carta('duo-b', 873) }));
            Math.random = origRandom;
            out.dueGiocatore = {
                aperture,
                mano: gameState.playerHand.map((c) => c.uid),
                cimitero: gameState.playerGraveyard.map((c) => c.uid)
            };

            // --- Obbligatorio: chiudere riapre ---
            gameState.playerHand = [carta('x'), carta('y')];
            gameState.playerGraveyard = [];
            let chiamate = 0;
            window.DuelEngineUI = {
                openCardListPicker(cards, o) {
                    chiamate++;
                    if (chiamate === 1) o.onCancel(); else o.onSelect(cards[1]);
                }
            };
            out.criosfingeTornaIn = null;
            DuelEngine.getDefinition(761).onAnyMonsterReturnedToHand(DuelEngine.makeContext('bot', { card: carta('crio', 761), returnedOwner: 'player' }));
            return new Promise((ok) => setTimeout(() => {
                out.obbligatorio = { chiamate, mano: gameState.playerHand.map((c) => c.uid), cimitero: gameState.playerGraveyard.map((c) => c.uid) };

                // --- 873 attivata dal GIOCATORE: il bot scarta la carta meno utile ---
                window.DuelEngineUI = null;
                const bucoNero = carta('buco', 7);
                const debole = { ...cardDatabase.find((c) => c.type === 'monster' && !c.extraDeck && !c.effect), uid: 'debole' };
                gameState.botHand = [carta('primo'), bucoNero, debole];
                gameState.botGraveyard = [];
                gameState.playerLP = 99999;
                Math.random = () => 0;
                DuelEngine.getDefinition(873).activate(DuelEngine.makeContext('player', { card: carta('duo-p', 873) }));
                Math.random = origRandom;
                out.bot = { mano: gameState.botHand.map((c) => c.uid), cimitero: gameState.botGraveyard.map((c) => c.uid) };

                // --- Multiplayer a passo comune, vittima remota ---
                window.MULTIPLAYER_MODE = true;
                Tavolo.imposta({ bot: 'remoto' });
                PassoComune.avvia({ invia: () => {} });
                gameState.botHand = [carta('r1'), carta('r2')];
                gameState.botGraveyard = [];
                const esito = CardEffectsShared.victimChoosesDiscard(DuelEngine.makeContext('player', {}), 'bot', {}, () => { out.chiamataRemota = true; });
                out.remotoPrima = {
                    esito,
                    mano: gameState.botHand.length,
                    callback: !!out.chiamataRemota,
                    attese: PassoComune.stato().decisioniAttese
                };
                PassoComune.ricevi({ tipo: 'decisione', indice: 1 });
                setTimeout(() => {
                    out.remotoDopo = {
                        mano: gameState.botHand.map((c) => c.uid),
                        cimitero: gameState.botGraveyard.map((c) => c.uid),
                        callback: !!out.chiamataRemota
                    };
                    PassoComune.ferma();
                    Tavolo.azzera();
                    window.MULTIPLAYER_MODE = false;
                    ok(out);
                }, 0);
            }, 50));
        });

        t.assert(JSON.stringify(r.offerte) === '["b","c"]', `Dopo lo scarto a caso il giocatore sceglie fra le carte rimaste: ${JSON.stringify(r.offerte)}`);
        t.assert(r.dueGiocatore.aperture === 1 && JSON.stringify(r.dueGiocatore.mano) === '["b"]'
            && JSON.stringify(r.dueGiocatore.cimitero.sort()) === '["a","c"]',
            `Duo Delinquente del bot: una carta a caso e una scelta DAL GIOCATORE: ${JSON.stringify(r.dueGiocatore)}`);
        t.assert(r.obbligatorio.chiamate === 2 && JSON.stringify(r.obbligatorio.mano) === '["x"]' && JSON.stringify(r.obbligatorio.cimitero) === '["y"]',
            `Criosfinge: chiudere il picker lo riapre, lo scarto è obbligatorio e lo sceglie chi ha ripreso il mostro: ${JSON.stringify(r.obbligatorio)}`);
        t.assert(r.bot.mano.indexOf('buco') !== -1 && r.bot.cimitero.indexOf('debole') !== -1,
            `Il bot sceglie di scartare la carta che vale meno (tiene Buco Nero): ${JSON.stringify(r.bot)}`);
        t.assert(r.remotoPrima.esito === true && r.remotoPrima.mano === 2
            && !r.remotoPrima.callback && r.remotoPrima.attese === 1,
            `Il motore aspetta davvero la scelta del client remoto: ${JSON.stringify(r.remotoPrima)}`);
        t.assert(JSON.stringify(r.remotoDopo.mano) === '["r1"]'
            && JSON.stringify(r.remotoDopo.cimitero) === '["r2"]' && r.remotoDopo.callback,
            `Ricevuta la posizione, anche questo motore esegue lo stesso scarto: ${JSON.stringify(r.remotoDopo)}`);
    }
};
