module.exports = {
    name: 'Distruzione Magie/Trappole: frattura olografica senza esplosione da mostro',
    async run(t) {
        const result = await t.evaluate(() => {
            const spell = { ...cardDatabase.find((c) => c.type === 'spell'), uid: 'st-fx-spell' };
            const trap = { ...cardDatabase.find((c) => c.type === 'trap'), uid: 'st-fx-trap' };
            gameState.playerSTField = [
                { card: spell, isFaceDown: false },
                { card: trap, isFaceDown: false },
                null, null, null
            ];
            gameState.playerGraveyard = [];
            updateUI();
            DuelEngine.actions.destroySpellTrap.call({ owner: 'bot' }, 'player', 0);
            DuelEngine.actions.destroySpellTrap.call({ owner: 'bot' }, 'player', 1);
            const spellFx = document.querySelector('.fx-st-shatter--spell');
            const trapFx = document.querySelector('.fx-st-shatter--trap');
            return {
                spellFx: !!spellFx,
                trapFx: !!trapFx,
                spellColor: spellFx && spellFx.style.getPropertyValue('--fx-st-color'),
                trapColor: trapFx && trapFx.style.getPropertyValue('--fx-st-color'),
                scans: document.querySelectorAll('.fx-st-shatter-scan').length,
                shards: document.querySelectorAll('.fx-st-energy-shard').length,
                monsterExplosion: document.querySelectorAll('.fx-explosion-burst, .fx-destroy-rays, .fx-gsap-destroy-flash').length,
                graveyard: gameState.playerGraveyard.length,
                empty: gameState.playerSTField[0] === null && gameState.playerSTField[1] === null
            };
        });
        t.assert(result.spellFx && result.trapFx && result.spellColor !== result.trapColor,
            'Magia e Trappola devono usare due smaterializzazioni cromaticamente distinte');
        t.assert(result.scans === 2 && result.shards === 20,
            'Ogni carta distrutta deve produrre scansione e frammenti energetici');
        t.assert(result.monsterExplosion === 0,
            'La distruzione Magia/Trappola non deve creare elementi dell’esplosione dei mostri');
        t.assert(result.graveyard === 2 && result.empty,
            'L’animazione non deve alterare la corretta risoluzione verso il Cimitero');
    }
};
