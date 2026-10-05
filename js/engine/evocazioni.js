/**
 * evocazioni.js — Evocare, Posizionare, cambiare Posizione, sacrificare.
 * =====================================================================
 * Nucleo senza testa (piano di attacco, Priorità 2). Sono le mosse che
 * cambiano il Terreno secondo le regole (summonMonster, setSpellTrap,
 * setFieldSpell, changeMonsterPosition, i Sacrifici, lo scarto per il
 * limite di mano). Vivevano in actions.js insieme ai prompt che le
 * chiedono al giocatore, che lì restano: qui c'è il "cosa succede", là il
 * "come lo si chiede".
 *
 * Script classico: le funzioni restano globali come prima. Caricato prima
 * di game-flow.js e actions.js (gruppo "partita" in
 * scripts/gruppi-script.js); qui ci sono solo dichiarazioni.
 *
 * Spostate parola per parola da actions.js (tools/sposta-funzioni.js);
 * impronta di tools/impronta-funzioni.js uguale prima e dopo.
 */

/**
 * Quanto dura l'animazione di sacrificio, e quindi quanto si aspetta
 * prima di togliere davvero le carte dal Terreno. Viaggia anche
 * sull'azione di rete (`delayMs`, vedi il broadcast qui sotto): i due
 * client devono cambiare stato NELLO STESSO ISTANTE, perché il
 * conteggio di Cimitero e Terreno entra nel checksum anti-desync — se
 * l'avversario togliesse le carte prima o dopo di noi, una qualunque
 * mossa inviata nel frattempo sembrerebbe arrivare da uno stato diverso.
 */
const TRIBUTE_SACRIFICE_ANIM_MS = 700;

/**
 * Esegue il sacrificio: gioca l'animazione su ogni mostro selezionato,
 * poi li rimuove dal Terreno (spostandoli nel Cimitero) e apre il modale
 * per scegliere la posizione del mostro da Evocare.
 */
function performTributeSacrifice() {
    const pending = gameState.pendingTributeSummon;
    if (!pending) return;

    pending.sacrificing = true;
    const indices = [...pending.selected];
    if (window.MP_broadcast && !window.MP_applyingRemote) {
        // `summonedCard` NON è ridondante con il messaggio 'summon' che
        // arriverà fra poco: serve PRIMA, perché una carta sacrificata può
        // reagire al mostro per cui viene sacrificata (Skull Knight #2 id
        // 1128, "se Tributi questa carta per l'Evocazione Tributo di un
        // mostro Tipo Demone") — vedi notifySacrificedForTribute in
        // js/engine/duel-engine.js.
        window.MP_broadcast({
            kind: 'tribute',
            indices,
            delayMs: TRIBUTE_SACRIFICE_ANIM_MS,
            summonedCard: pending.card
        });
    }
    PortaUI.queryAll('#playerFieldBoard .field-slot.tribute-highlight').forEach(el => {
        el.classList.remove('tribute-highlight', 'tribute-selected');
    });
    EventiDuello.emetti('prompt-tributo-chiuso');

    addToLog('🔻 Sacrificio in corso...');
    if (window.SFX) SFX.tribute();
    indices.forEach(idx => {
        const cardEl = PortaUI.query(`#playerFieldBoard .field-slot[data-owner="player"][data-type="monster"][data-index="${idx}"] .card`);
        if (cardEl && window.FX) FX.playTributeSacrifice(cardEl);
    });

    setTimeout(() => {
        // Chimera Gadjiltron Ingranaggio Antico (id 825): "guadagna gli
        // effetti appropriati se la Evochi Normalmente sacrificando
        // questi mostri: Gadget Verde/Rosso/Giallo" — gli id delle carte
        // sacrificate qui vengono salvati su pending.card._tributedCardIds
        // PRIMA di svuotare gli slot (stessa carta, stesso riferimento,
        // che poi finisce su gameState.playerMonsterField[slotIndex].card
        // dentro summonMonster più sotto): l'unico punto in cui questo
        // motore sa DAVVERO quali carte sono state sacrificate per
        // un'Evocazione Tributo, non solo quante.
        pending.card._tributedCardIds = indices
            .map((idx) => gameState.playerMonsterField[idx] && gameState.playerMonsterField[idx].card.id)
            .filter((id) => id !== undefined && id !== null);
        indices.forEach(idx => {
            const slot = gameState.playerMonsterField[idx];
            if (slot) {
                gameState.playerGraveyard.push(slot.card);
                gameState.playerMonsterField[idx] = null;
                if (window.DuelEngine) {
                    DuelEngine.notifyOwnMonsterSentToGraveyard('player', slot.card);
                    DuelEngine.notifySacrificedForTribute('player', slot.card, pending.card);
                }
            }
        });
        updateUI();

        const { card, handIndex, fromRect } = pending;
        gameState.pendingTributeSummon = null;
        EventiDuello.emetti('evocazione-tributo-pronta', card, handIndex, fromRect);
    }, TRIBUTE_SACRIFICE_ANIM_MS);
}

function performHandDiscard() {
    const pending = gameState.pendingHandDiscard;
    if (!pending) return;
    EventiDuello.emetti('prompt-scarto-chiuso');

    // Dagli indici più alti ai più bassi: rimuovere prima un indice basso
    // sposterebbe (di uno) gli indici più alti già raccolti in `selected`,
    // facendo scartare la carta sbagliata.
    const indices = [...pending.selected].sort((a, b) => b - a);
    const discardedNames = [];
    // ctx.discardChosenFromHand (duel-engine.js) invece di uno splice/push
    // manuale: fa scattare def.onSentToGraveyardFromHand (es. Roc dalla
    // Valle della Foschia id 781, che nel testo reale reagisce a QUALUNQUE
    // scarto diretto dalla mano, incluso questo — non solo quello causato
    // dall'avversario) e notifyOwnMonsterSentToGraveyard, come ogni altro
    // scarto del motore. discardedByOwner = 'player' (auto-inflitto dal
    // giocatore stesso, non dall'avversario).
    indices.forEach((idx) => {
        const card = DuelEngine.actions.discardChosenFromHand.call({ owner: 'player' }, 'player', idx);
        if (card) discardedNames.push(card.name);
    });
    addToLog(`🗑️ Hai scartato: ${discardedNames.join(', ')}.`);
    if (window.SFX) SFX.place();

    gameState.pendingHandDiscard = null;
    updateUI();

    // In Multiplayer questo scarto non viaggiava: l'avversario continuava
    // a contare la mano di prima, e il conteggio della mano entra nel
    // checksum. Si manda la fotografia a scelta fatta — anche il Cimitero
    // cambia, e queste carte sono comunque pubbliche una volta scartate.
    // Vedi broadcastLocalStatePush in js/engine/duel-engine.js.
    if (window.DuelEngine && typeof DuelEngine.broadcastLocalStatePush === 'function') {
        DuelEngine.broadcastLocalStatePush(null);
    }

    if (typeof pending.onComplete === 'function') pending.onComplete();
}

function summonMonster(card, slotIndex, position, handIndex = gameState.selectedCard.index, fromRect = null) {
    if (gameState.hasNormalSummoned) {
        addToLog('❌ Hai già effettuato un\'Evocazione Normale in questo turno.');
        return;
    }
    // Luce dell'Intervento (id 634, gameState.monsterSetBlocked): ogni Set
    // deve avvenire scoperto — la Posizione (Difesa) resta quella scelta,
    // solo la carta non risulta più coperta (isFaceDown), come da testo
    // reale della carta ("deve invece essere Evocata Normalmente scoperta
    // in Posizione di Difesa").
    let forceFaceUp = false;
    if (position === 'defense' && gameState.monsterSetBlocked) {
        forceFaceUp = true;
        addToLog('☀️ Luce dell\'Intervento impedisce il Set: evocato scoperto in Posizione di Difesa!');
    }
    // "Non può essere Posizionato Normalmente" (es. i 3 Dei Egizi id
    // 30/31/472): stesso trattamento di forceFaceUp qui sopra, ma
    // per-CARTA invece che globale — la Posizione (Difesa) scelta resta
    // valida, solo non può restare coperta.
    if (position === 'defense' && !forceFaceUp) {
        const cardDef = window.DuelEngine && DuelEngine.getDefinition(card.id);
        if (cardDef && cardDef.cannotBeSet) {
            forceFaceUp = true;
            addToLog(`🚫 ${card.name} non può essere Settata: Evocata scoperta in Posizione di Difesa!`);
        }
    }
    const isFaceDown = position === 'defense' && !forceFaceUp;
    // Capro Espiatorio (id 434): "non puoi Evocare altri mostri nel turno in
    // cui attivi questa carta (ma puoi Set)" — un'Evocazione scoperta è
    // vietata, un Set coperto no (gameState.noSummonTurn, vedi
    // DuelEngine.isSummonBannedThisTurn).
    if (!isFaceDown && window.DuelEngine && DuelEngine.isSummonBannedThisTurn('player')) {
        addToLog(`🚫 Capro Espiatorio impedisce di Evocare altri mostri in questo turno: ${card.name} si può solo Settare.`);
        clearSelection();
        return;
    }
    // "Puoi controllarne solo 1 scoperto" (id 899): con una copia già
    // scoperta questa si può solo Settare, come per Capro Espiatorio.
    if (!isFaceDown && window.DuelEngine && DuelEngine.isFaceUpDuplicateBlocked('player', card)) {
        addToLog(`🚫 ${card.name}: puoi controllarne solo 1 scoperto. Si può solo Settare.`);
        clearSelection();
        return;
    }
    const handEl = PortaUI.queryAll('#playerHand .card')[handIndex] || null;
    const slotEl = PortaUI.query(`.field-slot[data-owner="player"][data-type="monster"][data-index="${slotIndex}"]`);
    EventiDuello.attendi('volo-carta', { carta: card, partenza: fromRect || handEl, casella: slotEl, daNascondere: handEl, coperta: isFaceDown, posizione: position }, () => {
        const usedTribute = getTributesRequired(card) > 0;
        gameState.playerHand.splice(handIndex, 1);
        gameState.playerMonsterField[slotIndex] = { card: card, position: position, isFaceDown: isFaceDown, hasAttacked: false, canChangePosition: false, summonedOnTurn: gameState.turn };
        if (!isFaceDown && window.DuelDialogues) DuelDialogues.summon('player', card);
        gameState.hasNormalSummoned = true;
        if (window.MP_broadcast && !window.MP_applyingRemote) {
            window.MP_broadcast({ kind: 'summon', card, slotIndex, position });
        }
        addToLog(position === 'attack'
            ? `${usedTribute ? '🔺 Evocazione Tributo: ' : ''}Hai Evocato ${card.name}!`
            : `${usedTribute ? '🔺 Evocazione Tributo: ' : ''}Hai Posizionato un mostro.`);
        clearSelection();
        setTimeout(() => {
            EventiDuello.emetti('impatto-campo', 'player', slotIndex, 'monster');
            EventiDuello.emetti('cambio-posizione', 'player', slotIndex, position);
            if (window.FX) {
                const cardEl = PortaUI.query(`#playerFieldBoard .field-slot[data-type="monster"][data-index="${slotIndex}"] .card`);
                FX.playMonsterSummonEffect(card, cardEl);
            }
            // Effetto audio DEDICATO per questa carta (audio/evocazioni/<id>.mp3
            // — vedi js/audio/audio-library.js), se esiste; altrimenti il suono
            // di Evocazione standard di sempre.
            // I Livelli 7+ scelgono l'audio DOPO la ricerca del filmato
            // dentro playMonsterSummonEffect: video dedicato oppure
            // evocation.mp3, mai summon() sovrapposto a entrambi.
            if ((card.level || 0) < 7 && !(window.AudioLibrary && AudioLibrary.tryPlayCardSound(card, 'evocazioni'))) {
                if (window.SFX) SFX.summon(position);
            }
        }, 30);

        // Finestra per un'eventuale risposta dell'avversario (es. Buco
        // Trappola) — vedi js/engine/duel-engine.js. È "fire and forget": se la
        // risposta distrugge il mostro appena Evocato, updateUI() nella
        // callback lo riflette subito a schermo.
        const summonCtx = DuelEngine.makeContext('player', { summonedCard: card, summonedSlotIndex: slotIndex, summonedPosition: position });
        DuelEngine.fireTrigger(DuelEngine.TRIGGER.ON_NORMAL_SUMMON, summonCtx, () => updateUI());
    });
}

function changeMonsterPosition(slotIndex) {
    const monsterSlot = gameState.playerMonsterField[slotIndex];
    if (!monsterSlot || !monsterSlot.canChangePosition) return;
    // Divieto di cambio Posizione per QUESTO SOLO mostro — es. Incantesimo
    // Ombra (id 439): vedi gameState.cannotChangePositionUids, stesso
    // meccanismo (ricalcolato ad ogni render) del divieto d'attacco in
    // resolveAttack() più sopra in questo file.
    if (gameState.cannotChangePositionUids && gameState.cannotChangePositionUids[monsterSlot.card.uid]) {
        addToLog(`🚫 ${monsterSlot.card.name} non può cambiare Posizione in questo momento.`);
        return;
    }
    // Stesso divieto qui sopra, ma "fino a fine turno" invece che
    // ricalcolato ad ogni render — per un effetto ONE-SHOT come
    // Maledizione di Anubis (id 655), non continuo come Incantesimo
    // Ombra. Vedi gameState.cannotChangePositionUidsThisTurn in
    // game-flow.js (changeTurn()) per il perché serve un Set separato.
    if (gameState.cannotChangePositionUidsThisTurn && gameState.cannotChangePositionUidsThisTurn.has(monsterSlot.card.uid)) {
        addToLog(`🚫 ${monsterSlot.card.name} non può cambiare Posizione in questo momento.`);
        return;
    }
    // Divieto per TUTTI i propri mostri fino a un certo turno (es.
    // Controllo Mesmerico, id 814) — gameState.cannotChangePositionFor[owner]
    // è il numero del turno oltre il quale il divieto scade, non un booleano.
    if (gameState.cannotChangePositionFor && gameState.cannotChangePositionFor.player && gameState.turn <= gameState.cannotChangePositionFor.player) {
        addToLog('🚫 Non puoi cambiare la Posizione dei tuoi mostri in questo turno (Controllo Mesmerico).');
        return;
    }
    // Un mostro coperto (isFaceDown) che passa in Attacco è un Flip
    // Summon manuale (catturato PRIMA del cambio qui sotto, che azzera
    // isFaceDown) — a differenza di un flip subito attaccando
    // (resolveBattleDamage in questo stesso file), questo caso non
    // scatenava MAI TRIGGER.ON_FLIP: bug corretto qui sotto, stesso
    // aggancio già usato per l'altro caso.
    const isManualFlipSummon = monsterSlot.isFaceDown;
    const newPosition = monsterSlot.position === 'attack' ? 'defense' : 'attack';
    DuelEngine.actions.changePosition('player', slotIndex, newPosition);
    if (monsterSlot.position === 'attack') monsterSlot.isFaceDown = false;
    monsterSlot.canChangePosition = false;
    if (isManualFlipSummon && monsterSlot.position === 'attack') {
        monsterSlot.summonedViaFlip = true;
        if (window.DuelEngine) {
            const flipCtx = DuelEngine.makeContext('player', { card: monsterSlot.card, slotIndex: slotIndex });
            DuelEngine.fireTrigger(DuelEngine.TRIGGER.ON_FLIP, flipCtx);
        }
    }
    if (window.MP_broadcast && !window.MP_applyingRemote) {
        window.MP_broadcast({ kind: 'position', slotIndex, position: monsterSlot.position });
    }
    addToLog(`Hai cambiato ${monsterSlot.card.name} in Posizione di ${monsterSlot.position}.`);
    if (window.SFX) SFX.place();
    clearSelection();
    // Flip Summon: la carta si GIRA davvero in 3D invece di passare da
    // dorso a fronte fra un render e l'altro, che a schermo si legge come
    // una sostituzione istantanea — cioè il momento più teatrale del
    // gioco (scoprire un mostro coperto) buttato via.
    //
    // L'animazione esisteva già (CardRenderer.playFlipReveal, usata da
    // resolveBattleDamage quando un attacco rivela un mostro coperto) ma
    // NON era mai agganciata al Flip Summon fatto dal giocatore: stessa
    // situazione a schermo, due strade diverse nel codice, una sola delle
    // due animata.
    //
    // Va DOPO clearSelection(), che ridisegna il Terreno: chiamarla prima
    // vorrebbe dire costruire l'elemento che gira e vederselo buttare via
    // dal render successivo un istante dopo.
    if (isManualFlipSummon && monsterSlot.position === 'attack'
        && window.CardRenderer && typeof CardRenderer.playFlipReveal === 'function') {
        const slotEl = PortaUI.query(`#playerFieldBoard .field-slot[data-owner="player"][data-type="monster"][data-index="${slotIndex}"]`);
        if (slotEl) CardRenderer.playFlipReveal(slotEl, monsterSlot.card, monsterSlot.position);
    }
    setTimeout(() => EventiDuello.emetti('cambio-posizione', 'player', slotIndex, monsterSlot.position), 60);
}

function setSpellTrap(card, slotIndex, handIndex = gameState.selectedCard.index, fromRect = null) {
    // Onda Sismica (id 818): la Zona bersagliata non può essere usata —
    // vedi DuelEngine.isSTZoneLocked/findFreeSTSlot (duel-engine.js).
    if (window.DuelEngine && DuelEngine.isSTZoneLocked('player', slotIndex)) {
        addToLog('❌ Quella Zona Magia/Trappola non può essere usata (Onda Sismica).');
        clearSelection();
        return;
    }
    const handEl = PortaUI.queryAll('#playerHand .card')[handIndex] || null;
    const slotEl = PortaUI.query(`.field-slot[data-owner="player"][data-type="st"][data-index="${slotIndex}"]`);
    EventiDuello.attendi('volo-carta', { carta: card, partenza: fromRect || handEl, casella: slotEl, daNascondere: handEl, coperta: true }, () => {
        addToLog(`🪄 ${card.name} è stata piazzata sul Terreno.`);
        if (window.SFX) SFX.place();
        gameState.playerHand.splice(handIndex, 1);
        // setOnTurn ricorda in che turno è stata piazzata: serve al motore
        // effetti (js/engine/duel-engine.js) per applicare la regola classica "una
        // Trappola Set non si può attivare nello stesso turno in cui è stata
        // piazzata".
        gameState.playerSTField[slotIndex] = { card: card, isFaceDown: true, setOnTurn: gameState.turn };
        if (window.MP_broadcast && !window.MP_applyingRemote) {
            window.MP_broadcast({ kind: 'spelltrap', card, slotIndex });
        }
        clearSelection();
        // L'ATTERRAGGIO. Il volo dalla mano c'era gia' (flyCardToSlot qui
        // sopra), ma la carta arrivava e si fermava di colpo: nessun
        // tonfo, nessun peso. Stesso trattamento gia' riservato a un
        // mostro Evocato (triggerFieldImpact), piu' un velo di polvere.
        // Dopo clearSelection(), che ridisegna: triggerFieldImpact ha un
        // suo ritentativo per ritrovare la casella appena ricreata.
        EventiDuello.emetti('impatto-campo', 'player', slotIndex, 'st');
        if (window.FX && typeof FX.playCardSet === 'function') {
            const postoEl = PortaUI.query(`#playerFieldBoard .field-slot[data-owner="player"][data-type="st"][data-index="${slotIndex}"]`);
            FX.playCardSet(postoEl);
        }
    });
}

/**
 * Come setSpellTrap qui sopra, ma per una Magia Terreno: va SEMPRE nella
 * sua zona dedicata (gameState.playerFieldSpell, un solo oggetto, non un
 * array di 5 caselle) — mai in una delle 5 caselle Magia/Trappola comuni.
 * Se c'era già una Magia Terreno lì, va al Cimitero: attivarne una nuova
 * sostituisce sempre quella vecchia, come da regola vera.
 */
function setFieldSpell(card, handIndex = gameState.selectedCard.index, fromRect = null) {
    const handEl = PortaUI.queryAll('#playerHand .card')[handIndex] || null;
    const slotEl = PortaUI.query('.field-slot[data-owner="player"][data-type="field-spell"]');
    EventiDuello.attendi('volo-carta', { carta: card, partenza: fromRect || handEl, casella: slotEl, daNascondere: handEl, coperta: true }, () => {
        const existing = gameState.playerFieldSpell;
        if (existing) {
            gameState.playerGraveyard.push(existing.card);
            addToLog(`🌍 ${existing.card.name} lascia il Terreno, sostituita da ${card.name}.`);
        }
        addToLog(`🌍 ${card.name} è stata piazzata sulla zona Terreno.`);
        if (window.SFX) SFX.place();
        gameState.playerHand.splice(handIndex, 1);
        gameState.playerFieldSpell = { card: card, isFaceDown: true, setOnTurn: gameState.turn };
        if (window.MP_broadcast && !window.MP_applyingRemote) {
            window.MP_broadcast({ kind: 'fieldspell', card });
        }
        clearSelection();
    });
}
