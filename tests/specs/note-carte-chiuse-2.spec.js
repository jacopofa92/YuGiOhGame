// Quattro carte chiuse dalla revisione dei missingEffectNote:
//   899  Capo dei Guardiani della Tomba — solo 1 copia SCOPERTA
//   142  Castello delle Illusioni Oscure — +200 al flip, poi +200 a ogni
//        propria Standby Phase per 4 volte (max +1000), solo da FLIP
//   511  Cannone Drago XY — scarta 1 carta: distruggi 1 Magia/Trappola scoperta
//   512  Cannone Drago XYZ — scarta 1 carta: distruggi 1 carta qualsiasi
// Si sorveglia il COMPORTAMENTO, cosi' una nota non puo' tornare vera in silenzio.
module.exports = {
    name: 'Note chiuse (2): 899 unicita\', 142 escalation, 511/512 scarta e distruggi',
    async run(t) {
        // --- 899: una seconda copia scoperta non si puo' mettere -------
        const capo = await t.evaluate(() => {
            const base = cardDatabase.find((c) => c.id === 899);
            const prima = { ...base, uid: 'capo-1' };
            const seconda = { ...base, uid: 'capo-2' };
            gameState.playerMonsterField = [{ card: prima, position: 'attack', isFaceDown: false }, null, null, null, null];
            const scoperta = DuelEngine.isFaceUpDuplicateBlocked('player', seconda);
            // Con la prima COPERTA non c'e' nessun blocco.
            gameState.playerMonsterField[0].isFaceDown = true;
            const conCoperta = DuelEngine.isFaceUpDuplicateBlocked('player', seconda);
            // Un'altra carta qualunque non e' mai bloccata.
            gameState.playerMonsterField[0].isFaceDown = false;
            const altra = { ...cardDatabase.find((c) => c.type === 'monster' && c.id !== 899 && !c.extraDeck), uid: 'altra-1' };
            const altraBloccata = DuelEngine.isFaceUpDuplicateBlocked('player', altra);
            // Special Summon: la seconda copia finisce al Cimitero, non in campo.
            gameState.playerGraveyard = [];
            gameState.playerMonsterField = [{ card: prima, position: 'attack', isFaceDown: false }, null, null, null, null];
            const esito = DuelEngine.actions.specialSummon('player', seconda, 1, 'attack', 'hand');
            return {
                scoperta, conCoperta, altraBloccata,
                esito,
                inCampo: gameState.playerMonsterField.some((s) => s && s.card.uid === 'capo-2')
            };
        });
        t.assert(capo.scoperta === true, 'Con una copia scoperta in campo la seconda non puo\' comparire scoperta');
        t.assert(capo.conCoperta === false, 'Con la prima copia COPERTA la seconda e\' libera (un Set non conta come scoperta)');
        t.assert(capo.altraBloccata === false, 'Il divieto vale solo per le copie dello stesso nome');
        t.assert(capo.esito === false && !capo.inCampo, 'Una Special Summon della seconda copia scoperta deve fallire');

        // --- 142: escalation +200 per passo, tetto a 5 passi, solo da FLIP
        const castello = await t.evaluate(() => {
            const zombie = { ...cardDatabase.find((c) => c.race === 'Zombie' && c.type === 'monster' && c.id !== 142), uid: 'zombie-1' };
            const castle = { ...cardDatabase.find((c) => c.id === 142), uid: 'castle-1' };
            gameState.atkDefBonus = {};
            gameState.playerMonsterField = [
                { card: castle, position: 'attack', isFaceDown: false },
                { card: zombie, position: 'attack', isFaceDown: false }, null, null, null
            ];
            gameState.botMonsterField = [null, null, null, null, null];
            const def = DuelEngine.getDefinition(142);
            const ctxStatic = () => DuelEngine.makeContext('player', { card: castle, slot: gameState.playerMonsterField[0], slotIndex: 0 });
            const bonus = () => { gameState.atkDefBonus = {}; def.static(ctxStatic()); return (gameState.atkDefBonus['zombie-1'] || { atk: 0 }).atk; };

            // Scoperta senza essersi girata: nessun bonus.
            const senzaFlip = bonus();
            def.onFlip(ctxStatic());
            const dopoFlip = bonus();
            const serie = [dopoFlip];
            for (let i = 0; i < 6; i++) { def.onStandbyPhase(ctxStatic()); serie.push(bonus()); }
            return { senzaFlip, serie };
        });
        t.assert(castello.senzaFlip === 0, `Senza FLIP il Castello non da' nulla (dato ${castello.senzaFlip})`);
        t.assert(JSON.stringify(castello.serie) === JSON.stringify([200, 400, 600, 800, 1000, 1000, 1000]),
            `+200 al flip, poi +200 per 4 Standby Phase e basta: ${JSON.stringify(castello.serie)}`);

        // --- 511/512: scarta 1 carta per distruggere --------------------
        const cannoni = await t.evaluate(() => {
            const nuovaCarta = (id, uid) => ({ ...cardDatabase.find((c) => c.id === id), uid: uid });
            const trappola = (uid) => ({ card: { ...cardDatabase.find((c) => c.type === 'trap'), uid: uid }, isFaceDown: false });
            const prepara = (id, coperta) => {
                gameState.playerMonsterField = [{ card: nuovaCarta(id, 'cannone'), position: 'attack', isFaceDown: false }, null, null, null, null];
                gameState.botMonsterField = [null, null, null, null, null];
                gameState.playerSTField = [null, null, null, null, null];
                gameState.botSTField = [trappola('t-scoperta'), { ...trappola('t-coperta'), isFaceDown: coperta }, null, null, null];
                gameState.playerHand = [{ ...cardDatabase.find((c) => c.type === 'monster' && !c.extraDeck), uid: 'scarto-1' }];
                gameState.playerGraveyard = [];
                gameState.botGraveyard = [];
            };
            const ctx = (id) => DuelEngine.makeContext('player', { card: gameState.playerMonsterField[0].card, zone: 'monster', index: 0, slot: gameState.playerMonsterField[0] });

            // 511: solo la Magia/Trappola SCOPERTA e' bersaglio valido.
            prepara(511, true);
            const d511 = DuelEngine.getDefinition(511);
            const can511 = d511.canActivate(ctx(511));
            d511.activate(ctx(511));
            const r511 = {
                can: can511,
                scartata: gameState.playerGraveyard.some((c) => c.uid === 'scarto-1'),
                scopertaDistrutta: !gameState.botSTField.some((s) => s && s.card.uid === 't-scoperta'),
                copertaIntatta: gameState.botSTField.some((s) => s && s.card.uid === 't-coperta')
            };

            // 511 senza nulla da colpire (solo coperte): non e' attivabile.
            prepara(511, true);
            gameState.botSTField[0] = null;
            const canVuoto = d511.canActivate(ctx(511));

            // 512: qualsiasi carta, anche coperta.
            prepara(512, true);
            gameState.botSTField[0] = null;
            const d512 = DuelEngine.getDefinition(512);
            const can512 = d512.canActivate(ctx(512));
            d512.activate(ctx(512));
            const r512 = {
                can: can512,
                scartata: gameState.playerGraveyard.some((c) => c.uid === 'scarto-1'),
                copertaDistrutta: !gameState.botSTField.some((s) => s && s.card.uid === 't-coperta')
            };

            // Senza carte in mano non si puo' pagare il costo.
            prepara(512, false);
            gameState.playerHand = [];
            const canSenzaMano = d512.canActivate(ctx(512));
            return { r511, canVuoto, r512, canSenzaMano };
        });
        t.assert(cannoni.r511.can && cannoni.r511.scartata && cannoni.r511.scopertaDistrutta,
            `Cannone XY: scarta e distrugge la Magia/Trappola scoperta (${JSON.stringify(cannoni.r511)})`);
        t.assert(cannoni.r511.copertaIntatta, 'Cannone XY non deve toccare la Magia/Trappola COPERTA (il testo dice scoperta)');
        t.assert(cannoni.canVuoto === false, 'Cannone XY non e\' attivabile se non ci sono Magie/Trappole scoperte avversarie');
        t.assert(cannoni.r512.can && cannoni.r512.scartata && cannoni.r512.copertaDistrutta,
            `Cannone XYZ: scarta e distrugge una carta qualsiasi, anche coperta (${JSON.stringify(cannoni.r512)})`);
        t.assert(cannoni.canSenzaMano === false, 'Senza carte in mano il costo non si puo\' pagare: non attivabile');
    }
};
