/**
 * duel-engine.js — Motore generico degli effetti-carta.
 * =====================================================================
 * ATTENZIONE A NON CONFONDERLO CON js/ui/effects.js: quel file (oggetto
 * globale `FX`) è una libreria di effetti VISIVI (particelle, flash,
 * animazioni) e non sa nulla delle regole di gioco. Questo file invece
 * è il motore delle regole vere e proprie — "cosa succede quando una
 * carta fa qualcosa" — e non disegna nulla sullo schermo (per gli
 * effetti visivi richiama comunque `FX.*`, ma la logica è tutta qui).
 *
 * Come funziona in breve (leggi anche il commento in cima a
 * js/engine/card-effects.js, che è il file "gemello" con gli effetti delle
 * singole carte):
 *
 *   1) js/engine/card-effects.js registra un "effetto" per ogni carta che ne
 *      ha uno, chiamando CardEffects.register(idCarta, { ... }).
 *   2) Il resto del gioco (actions.js, bot.js, game-flow.js) richiama
 *      DuelEngine.fireTrigger(...) nei punti giusti (dopo un'Evocazione,
 *      prima di risolvere un attacco, ecc.) e DuelEngine.activateCard(...)
 *      quando il giocatore attiva manualmente una Magia/Trappola/effetto.
 *   3) Questo file si occupa di TROVARE quali carte hanno un effetto
 *      pertinente a quel momento, chiederglielo, ed ESEGUIRLO tramite
 *      gli "helper d'azione" qui sotto (distruggere un mostro, infliggere
 *      danno, pescare carte, ecc.) così che ogni effetto-carta in
 *      card-effects.js resti poche righe leggibili, senza dover
 *      reinventare ogni volta "come si distrugge un mostro".
 *
 * CHAIN SYSTEM (stile Master Duel): quando succede un evento importante
 * (Evocazione, Attacco Dichiarato) o quando un giocatore attiva
 * manualmente una Magia/Trappola/effetto Ignition, si apre una vera
 * finestra di priorità: l'avversario (e, per le attivazioni manuali,
 * anche chi ha attivato per primo) può incatenare più carte proprie una
 * dopo l'altra, finché entrambi passano di fila. Le carte incatenate si
 * RISOLVONO in ordine LIFO (l'ultima attivata è la prima a risolversi),
 * esattamente come nel gioco vero. Vedi `gameState.chain`,
 * `openTriggerWindow`, `openActivationWindow` e `resolveChain` più sotto
 * per l'implementazione.
 *
 * SEMPLIFICAZIONE DELIBERATA tuttora in vigore, per restare leggibile:
 * niente Chain "annidate" (un effetto che si risolve non può aprirne
 * una nuova al suo interno — nessuna carta di questo set ne ha
 * bisogno, vedi l'audit citato in `maxChainRounds` più sotto), e in
 * Multiplayer la finestra resta limitata a un solo round per lato
 * finché il protocollo di rete non trasmette la singola decisione di
 * risposta invece di farla ricalcolare in modo indipendente da
 * entrambi i client (vedi il commento su `maxChainRounds`).
 */
(function () {
    'use strict';

    // ============================================================
    // Costanti dei "trigger": i momenti della partita in cui il motore
    // controlla se qualche carta ha un effetto automatico da eseguire.
    // ============================================================
    const TRIGGER = {
        ON_NORMAL_SUMMON: 'onNormalSummon',   // subito dopo un'Evocazione Normale (Tributo incluso)
        ON_SPECIAL_SUMMON: 'onSpecialSummon', // subito dopo una Special Summon (es. da Rinascita del Mostro)
        ON_FLIP: 'onFlip',                    // quando un mostro coperto viene girato scoperto
        ON_ATTACK_DECLARE: 'onAttackDeclare', // dopo che un attacco è stato dichiarato, PRIMA del calcolo danni
        ON_DESTROY: 'onDestroy',              // subito dopo che un mostro viene distrutto e va al Cimitero
        ON_STANDBY_PHASE: 'onStandbyPhase',   // durante la Standby Phase del giocatore di turno (proprie carte)
        ON_END_PHASE: 'onEndPhase',           // durante la End Phase del giocatore di turno (proprie carte)
        ON_POSITION_CHANGE: 'onPositionChange', // subito dopo che un mostro scoperto cambia Posizione di Battaglia (Attacco<->Difesa), da qualunque fonte
        ON_CARD_ACTIVATED: 'onCardActivated', // subito dopo che una Magia/Trappola/effetto Ignition viene attivato tramite activateCard() (da chiunque)
        // Una sola volta per CHIAMATA a drawCardsToHand (game-flow.js), non
        // per singola carta pescata — così un "pesca 3 carte" in un colpo
        // solo (es. Vaso dell'Ingordigia) scatena questo hook una volta
        // sola, coerente con l'idioma reale "each time you draw a card (or
        // cards)" di Desideri Solenni (id 875), la prima carta di questo
        // dataset a usarlo. Nato qui invece che come caso speciale hardcoded
        // in drawCardsToHand proprio per restare riusabile da qualunque
        // futura carta reattiva alla propria pesca.
        ON_DRAW_CARDS: 'onDrawCards'
    };

    // Registro carte -> definizione effetto. Chiave = id carta (da cards-db.js).
    const registry = new Map();

    /**
     * Registra l'effetto di una carta. `definition` è un oggetto con solo
     * le proprietà che servono a quella carta specifica — vedi il commento
     * in testa a card-effects.js per la lista completa dei campi supportati
     * (static, onSummon, onFlip, onAttackDeclare, canActivate, activate).
     */
    function register(cardId, definition) {
        registry.set(cardId, definition);
    }

    function getDefinition(cardId) {
        return registry.get(cardId) || null;
    }

    /**
     * Chiama l'handler di UNA SPECIFICA carta (activate/static/onXXX)
     * dentro un try/catch: se quella carta ha un bug (un riferimento a
     * undefined, un caso non gestito), il problema resta isolato a lei —
     * un log chiaro sia in console sia nel Game Log, invece di
     * un'eccezione non gestita che risale e blocca l'INTERO motore (una
     * Chain che non si chiude mai perché resolveChain si interrompe a
     * metà, un render che smette di aggiornarsi perché
     * recomputeStaticEffects si è fermato su una carta). Non "ripara"
     * l'effetto rotto — lo salta e basta, l'unica cosa sicura da fare
     * senza sapere cosa quell'effetto avrebbe dovuto completare. Usata ai
     * punti che processano PIÙ carte in sequenza (resolveChain,
     * recomputeStaticEffects): qui un errore non gestito avrebbe un
     * effetto a catena su OGNI carta successiva nello stesso ciclo, non
     * solo su quella rotta.
     */
    function safeCallCardHandler(card, handlerLabel, fn) {
        try {
            return fn();
        } catch (err) {
            const name = card ? card.name : '?';
            console.error(`[CardEffects] ${name} (${handlerLabel}) ha lanciato un errore, l'effetto è stato saltato:`, err);
            if (typeof addToLog === 'function') {
                addToLog(`⚠️ ${name}: effetto non valido (${handlerLabel}), saltato.`);
            }
            return undefined;
        }
    }

    // ============================================================
    // Contesto: l'oggetto che ogni effetto-carta riceve come parametro.
    // Raccoglie tutto ciò che serve per leggere/modificare la partita
    // senza che ogni singolo effetto debba conoscere i dettagli interni
    // di gameState (nomi dei campi, come loggare, ecc.).
    // ============================================================
    function opponentOf(owner) {
        return owner === 'player' ? 'bot' : 'player';
    }

    function fieldOf(owner) {
        return owner === 'player' ? gameState.playerMonsterField : gameState.botMonsterField;
    }

    function stFieldOf(owner) {
        return owner === 'player' ? gameState.playerSTField : gameState.botSTField;
    }

    /**
     * Vero se la casella Magia/Trappola all'indice `index` di `owner` è
     * bloccata (Onda Sismica, id 818: "scegli 3 Zone Magia/Trappola
     * inutilizzate dell'avversario. Quelle Zone non possono essere
     * usate.") — gameState.lockedSTZonesFor[owner] è un Set di indici,
     * popolato SOLO da id 818 (activate()) e svuotato quando quella carta
     * lascia il campo (onDestroy). Nessun'altra carta di questo dataset
     * usa questo meccanismo, ma è generico per indice/proprietario, non
     * legato a id 818 in alcun modo hardcoded.
     */
    function isSTZoneLocked(owner, index) {
        return !!(gameState.lockedSTZonesFor && gameState.lockedSTZonesFor[owner] && gameState.lockedSTZonesFor[owner].has(index));
    }

    /** Prima casella Magia/Trappola libera E non bloccata (vedi isSTZoneLocked) di `owner`, o -1 se nessuna. */
    function findFreeSTSlot(owner) {
        return stFieldOf(owner).findIndex((slot, index) => slot === null && !isSTZoneLocked(owner, index));
    }

    function handOf(owner) {
        return owner === 'player' ? gameState.playerHand : gameState.botHand;
    }

    function graveyardOf(owner) {
        return owner === 'player' ? gameState.playerGraveyard : gameState.botGraveyard;
    }

    /**
     * Necrovalley (id 890) è scoperta sul Terreno di uno qualunque dei due
     * giocatori? Effetto di campo GLOBALE (come Umi/Un Oceano Leggendario):
     * "le carte nel Cimitero non possono essere bandite" vale per ENTRAMBI
     * i Cimiteri, non solo quello del controllore di Necrovalley — usata da
     * ACTIONS.banishFromGraveyard, mai da un controllo scritto a mano per
     * ogni singola carta che banisce dal Cimitero.
     */
    function isNecrovalleyOnField() {
        return ['playerFieldSpell', 'botFieldSpell'].some((key) => {
            const fs = gameState[key];
            return fs && !fs.isFaceDown && fs.card.id === 890;
        });
    }

    /**
     * Necrovalley protegge DAVVERO il Cimitero di `owner` dal bando in
     * questo momento? Capo dei Guardiani della Tomba (id 899): "Il tuo
     * Cimitero non è influenzato da Necrovalley" — un'ECCEZIONE per-owner
     * alla protezione globale qui sopra, controllata SOLO da
     * ACTIONS.banishFromGraveyard (mai da isNecrovalleyOnField
     * direttamente, che resta il controllo "è scoperta in campo?" puro e
     * semplice per chi non ha bisogno di quest'eccezione, es. Assalitore
     * dei Guardiani della Tomba id 895).
     */
    function isNecrovalleyProtectingGraveyard(owner) {
        if (!isNecrovalleyOnField()) return false;
        return !fieldOf(owner).some((s) => s && !s.isFaceDown && s.card.id === 899);
    }

    /** Zona Bandite di `owner` — informazione pubblica come il Cimitero, vedi ACTIONS.banish. */
    function banishedOf(owner) {
        return owner === 'player' ? gameState.playerBanished : gameState.botBanished;
    }

    /**
     * Toglie `card` dalla zona Bandite di `owner` (per uid) — usata da chi
     * gestisce un ritorno programmato di un bando TEMPORANEO
     * (banishTemporarily/banishFromHandWithCountdown) quando la carta
     * smette di essere bandita, per qualunque motivo (torna in campo/mano,
     * o finisce comunque al Cimitero perché il Terreno era pieno). Non
     * chiamata per un bando PERMANENTE (ACTIONS.banish): quella carta ci
     * resta per il resto del Duello.
     */
    function removeFromBanished(owner, card) {
        const list = banishedOf(owner);
        const idx = list.findIndex((c) => c.uid === card.uid);
        if (idx !== -1) list.splice(idx, 1);
    }

    /**
     * Se `card` porta il flag PER-ISTANZA `mustBanishOnLeavingField` (es.
     * Cerchio degli Inferi, id 498: "Special Summon 1 mostro dal
     * Cimitero... ma bandiscilo quando lascia il campo" — il mostro è
     * scelto ARBITRARIAMENTE dal Cimitero al momento della Standby
     * Phase, quindi impossibile da agganciare con un
     * def.onDestroy/onSTDestroyed per un id fisso come si fa di solito
     * in questo file: non è "questa carta specifica ha sempre questo
     * comportamento", è "questa singola copia, SOLO perché è stata
     * Special Summonata da Cerchio degli Inferi, deve finire bandita
     * invece che nella sua destinazione normale"), sposta `card` dal
     * Cimitero di `owner` (dove il chiamante l'ha GIÀ mandata, un
     * istante fa — stesso ordine "prima rimuovi, poi reagisci" di ogni
     * altro hook di questo file) alla zona Bandite invece.
     *
     * Va chiamata SUBITO DOPO ogni punto di questo motore che manda un
     * MOSTRO al Cimitero: `destroyMonster` e `notifySacrificedForTribute`
     * qui sotto, più ciascuno dei ~6 punti di resolveBattleDamage
     * (js/engine/actions.js) che fanno la stessa cosa "a mano" per la
     * distruzione in battaglia (mai centralizzata in questo motore, a
     * differenza della distruzione da effetto Carta) — un singolo helper
     * condiviso invece di duplicare il controllo in ognuno. Per il
     * ritorno in mano (`returnMonsterToHand` qui sotto, che non passa
     * MAI dal Cimitero) serve invece un controllo dedicato, non questo:
     * vedi lì. Additivo per costruzione: per qualunque carta senza
     * questo flag (la stragrande maggioranza) `redirectToBanishIfFlagged`
     * non fa nulla.
     */
    function redirectToBanishIfFlagged(owner, card) {
        if (!card.mustBanishOnLeavingField) return;
        const grave = graveyardOf(owner);
        const idx = grave.findIndex((c) => c.uid === card.uid);
        if (idx === -1) return;
        grave.splice(idx, 1);
        banishedOf(owner).push(card);
        // Messaggio generico, non più legato a Cerchio degli Inferi (il
        // primo caso d'uso, id 498) da quando questo helper è stato esteso
        // ANCHE a destroySpellTrap (Nobile dello Sterminio, id 881) — il
        // nome della carta è già abbastanza chiaro senza dover elencare
        // ogni possibile fonte.
        addToLog(`⭕ ${card.name} viene bandita invece di andare al Cimitero!`);
    }

    /**
     * La zona Magia Terreno (gameState.playerFieldSpell/botFieldSpell): a
     * differenza di stFieldOf() qui sopra NON è un array di 5 caselle ma
     * UN SOLO oggetto { card, isFaceDown, setOnTurn } o null — al massimo
     * una Magia Terreno per lato, come da regola vera.
     */
    function fieldSpellOf(owner) {
        return owner === 'player' ? gameState.playerFieldSpell : gameState.botFieldSpell;
    }

    function lpKeyOf(owner) {
        return owner === 'player' ? 'playerLP' : 'botLP';
    }

    /**
     * Costruisce il contesto passato a static()/onX()/activate(). `extra`
     * porta i dati specifici del momento (es. per onAttackDeclare: chi
     * attacca, chi difende, il danno previsto).
     */
    function makeContext(owner, extra) {
        return Object.assign({
            owner: owner,
            opponent: opponentOf(owner),
            gameState: gameState,
            log: addToLog,
            // Helper di lettura rapidi, così un effetto-carta scrive
            // ctx.field(ctx.owner) invece di dover sapere che il campo del
            // giocatore si chiama "playerMonsterField".
            field: fieldOf,
            stField: stFieldOf,
            hand: handOf,
            graveyard: graveyardOf,
            banished: banishedOf
        }, ACTIONS, extra || {});
    }

    // ============================================================
    // Helper d'azione: le "mosse" di base che un effetto può compiere.
    // Ogni funzione qui aggiorna gameState E fa anche il log/refresh UI
    // necessario, così un effetto-carta in card-effects.js resta un
    // elenco di 2-3 chiamate a questi helper, leggibile a colpo d'occhio.
    // ============================================================
    const ACTIONS = {
        /**
         * Distrugge il mostro nello slot indicato (owner+index, il
         * CONTROLLORE attuale) e lo manda al Cimitero — del vero
         * proprietario originale (slot.originalOwner) se questo mostro è
         * sotto controllo temporaneo (vedi ACTIONS.takeControl più sotto),
         * altrimenti di owner stesso come sempre.
         */
        destroyMonster(owner, index) {
            const field = fieldOf(owner);
            const slot = field[index];
            if (!slot) return;
            // Chi ha causato QUESTA distruzione (es. Signore dei Vampiri,
            // id 658: "distrutta da un effetto DELL'AVVERSARIO") — letto da
            // `this.owner`, valido perché ogni chiamata da un effetto-carta
            // passa sempre da ctx.destroyMonster(...)/ctx.destroyAllMonsters(...)/
            // ctx.destroyAllCards(...) (con `this` === quel ctx, dato che
            // sono invocate come METODI di ctx — vedi la stessa catena
            // this.destroyMonster/this.destroyAllMonsters qui sotto, che la
            // preserva anche attraverso le distruzioni di massa). null per
            // le chiamate interne senza un vero ctx dietro (es.
            // clearTemporaryAtkDefBonus, dove "chi ha causato" non ha senso
            // concettualmente: è un buff temporaneo che scade da solo).
            const destroyerOwner = (this && this.owner) || null;
            // La carta SORGENTE della distruzione (es. Bambola della
            // Rovina, id 202: "mandata al Cimitero dall'effetto di una
            // Magia Continua" — controlla destroyedByCard.subtype ===
            // 'continuous') — stesso `this`-binding di destroyerOwner qui
            // sopra, solo la carta intera invece del solo owner.
            const destroyerCard = (this && this.card) || null;
            // "Non può essere distrutta [...] dall'effetto di una Magia/
            // Trappola" (es. Exodia Necross, id 230) — per-carta, sempre
            // vera (SEMPLIFICAZIONE: la carta reale esclude solo gli
            // effetti dell'AVVERSARIO, qui blocca ogni distruzione da
            // effetto Carta, anche del proprio controllore — nessun caso
            // di questo dataset avrebbe bisogno di distruggere la
            // propria carta protetta). Diverso da cannotBeDestroyedByBattle
            // (resolveBattleDamage/actions.js): quello copre solo la
            // battaglia, questo solo gli effetti Carta — insieme
            // coprono l'intero testo reale.
            if (getDefinition(slot.card.id)?.cannotBeDestroyedByCardEffect) {
                addToLog(`🛡️ ${slot.card.name} non può essere distrutta da un effetto Carta!`);
                return;
            }
            // Stessa protezione qui sopra, ma per-ISTANZA (uid) invece che
            // per-DEFINIZIONE — vedi il commento su
            // gameState.cannotBeDestroyedByCardEffectUids in
            // recomputeStaticEffects (nato per Artigli di Drago, id 208).
            if (gameState.cannotBeDestroyedByCardEffectUids && gameState.cannotBeDestroyedByCardEffectUids[slot.card.uid]) {
                addToLog(`🛡️ ${slot.card.name} non può essere distrutta da un effetto Carta!`);
                return;
            }
            // 395 — Orgoth l'Implacabile: indistruttibilità temporanea per
            // uid (lancio dado 1-2), copre sia la battaglia
            // (cardIsIndestructibleByBattle, actions.js) sia gli effetti
            // Carta qui — vedi gameState.orgothIndestructibleUids.
            if (gameState.orgothIndestructibleUids && gameState.orgothIndestructibleUids.has(slot.card.uid)) {
                addToLog(`🛡️ ${slot.card.name} non può essere distrutta (Orgoth l'Implacabile)!`);
                return;
            }
            // 246 — Elefante Volante: "una volta per turno dell'avversario,
            // se dovrebbe essere distrutta da un suo effetto: non viene
            // distrutta" — indestructibilità condizionata (opt-in
            // def.preventsDestructionByOpponentEffectOncePerTurn), SOLO
            // contro un effetto Carta causato dall'AVVERSARIO del
            // controllore (destroyerOwner noto e diverso da owner — un
            // effetto del proprio controllore, o una distruzione senza
            // "chi l'ha causata" tipo clearTemporaryAtkDefBonus, non
            // conta), una volta per turno dell'avversario: chiave
            // uid+turno (gameState.turn cambia ad ogni changeTurn, quindi
            // una nuova chiave per ogni turno è già "una volta a turno"
            // senza bisogno di azzerarla esplicitamente altrove, stesso
            // idioma di ctx.hasUsedOncePerTurn). Se la prevenzione scatta
            // durante la End Phase dell'avversario, arma la condizione di
            // vittoria automatica (gameState.flyingElephantWinPendingUids,
            // consumata da onDealsBattleDamage in card-effects.js/id 246 e
            // poi da checkGameOver in game-flow.js).
            const flyingElephantDef = getDefinition(slot.card.id);
            if (flyingElephantDef?.preventsDestructionByOpponentEffectOncePerTurn && destroyerOwner && destroyerOwner !== owner) {
                gameState.flyingElephantUsedThisOpponentTurn = gameState.flyingElephantUsedThisOpponentTurn || {};
                const turnKey = slot.card.uid + ':' + gameState.turn;
                if (!gameState.flyingElephantUsedThisOpponentTurn[turnKey]) {
                    gameState.flyingElephantUsedThisOpponentTurn[turnKey] = true;
                    addToLog(`🐘 ${slot.card.name} non viene distrutta dall'effetto avversario!`);
                    if (gameState.phase === 'end') {
                        gameState.flyingElephantWinPendingUids = gameState.flyingElephantWinPendingUids || new Set();
                        gameState.flyingElephantWinPendingUids.add(slot.card.uid);
                    }
                    return;
                }
            }
            // Mostri Union (def.isUnion — es. Testa di Drago Y id 513,
            // Carro Armato Metallico Z id 515): "se il mostro equipaggiato
            // dovrebbe essere distrutto, questa carta viene distrutta al
            // suo posto" — testo generico di TUTTI i Mostri Union, non solo
            // di queste 2, quindi controllato qui a livello generico
            // (def.isUnion) invece che per singola carta. Copre sia la
            // distruzione da effetto Carta (qui) sia da BATTAGLIA
            // (tryRedirectUnionDestroy chiamata anche da resolveBattleDamage,
            // actions.js).
            if (tryRedirectUnionDestroy(owner, slot.card.uid, slot.card.name)) return;
            const destroyedCard = slot.card;
            // Posizione/coperta al momento della distruzione (es. Falena
            // della Sabbia, id 766: "se distrutta coperta in Posizione di
            // Difesa, tranne che in battaglia") — va letta QUI, PRIMA di
            // svuotare field[index], perché onDestroy riceve solo la carta
            // già nel Cimitero, non più lo slot originale.
            const wasFaceDown = slot.isFaceDown;
            const wasPosition = slot.position;
            graveyardOf(slot.originalOwner || owner).push(destroyedCard);
            redirectToBanishIfFlagged(slot.originalOwner || owner, destroyedCard);
            field[index] = null;
            if (typeof triggerDestroyEffect === 'function') {
                triggerDestroyEffect(owner, index, 'monster');
            }
            // ctx.card = la carta appena distrutta (serve a fireTrigger per
            // trovarne la definizione — vedi il ramo TRIGGER.ON_DESTROY qui
            // sotto), non più recuperabile da field[index] dato che è già
            // stato svuotato qui sopra.
            fireTrigger(TRIGGER.ON_DESTROY, makeContext(owner, { slotIndex: index, card: destroyedCard, wasFaceDown: wasFaceDown, wasPosition: wasPosition, destroyedByOwner: destroyerOwner, destroyedByCard: destroyerCard }));
        },

        /**
         * Distrugge la Magia/Trappola nello slot indicato (owner+index) e
         * la manda al Cimitero — equivalente di destroyMonster qui sopra,
         * ma per la zona 'st' (es. Bara Oscura, id 792: "quando questa
         * carta SET viene distrutta [da un'altra fonte]..."). Stesso
         * schema `this.owner` per destroyedByOwner (chi ha causato la
         * distruzione), stesso motivo per cui def.onSTDestroyed(ctx) è
         * chiamata direttamente qui invece che tramite fireTrigger:
         * nessuna Chain/finestra di risposta serve per un auto-effetto
         * della carta appena distrutta su se stessa.
         *
         * `batchToken` (opzionale, quinto... terzo parametro — un semplice
         * oggetto `{}` creato UNA volta dal chiamante) collega tra loro più
         * chiamate a questa funzione che fanno parte della STESSA
         * attivazione (es. Piumino delle Arpie id 291: "distruggi tutte le
         * Magie/Trappole dell'avversario", un destroySpellTrap per carta
         * nello stesso forEach) — senza, ogni chiamata è un evento isolato
         * che non sa nulla delle altre. Serve a Trappola Fasulla (id 600,
         * redirectsTrapDestroyToSelf): "quando l'avversario attiverebbe un
         * effetto che distruggerebbe 1+ Trappole che controlli, distruggi
         * questa carta AL LORO POSTO" — cioè protegge OGNI Trappola dello
         * stesso lotto, non solo la prima colpita. Un chiamante che non lo
         * passa (la stragrande maggioranza — un solo bersaglio alla volta)
         * si comporta esattamente come prima: `batchToken` resta
         * `undefined`, ogni `if (batchToken...)` qui sotto è no-op.
         */
        destroySpellTrap(owner, index, batchToken) {
            const field = stFieldOf(owner);
            const slot = field[index];
            if (!slot) return;
            const destroyerOwner = (this && this.owner) || null;
            // Effetto SOSTITUTIVO (es. Trappola Fasulla, id 600): "quando
            // l'AVVERSARIO attiverebbe un effetto che distruggerebbe 1+
            // Trappole che controlli: distruggi questa carta al loro
            // posto" — def.redirectsTrapDestroyToSelf (opt-in per-carta),
            // controllato SOLO quando è davvero l'avversario a causare la
            // distruzione (destroyerOwner !== owner: mai contro una
            // propria auto-distruzione), su una Trappola bersaglio
            // (slot.card.type === 'trap'). Un batchToken già rediretto da
            // una chiamata precedente nello STESSO lotto protegge anche
            // questa Trappola, senza cercare di nuovo un sostituto (la
            // Trappola Fasulla che ha già sostituito la prima è già andata
            // al Cimitero: cercarla di nuovo qui non la troverebbe mai) —
            // una Magia dello stesso lotto (slot.card.type !== 'trap')
            // invece NON è mai protetta: il testo reale di Trappola
            // Fasulla copre solo le Trappole.
            if (slot.card.type === 'trap' && batchToken && batchToken.redirected) return;
            if (slot.card.type === 'trap' && destroyerOwner && destroyerOwner !== owner) {
                // Se la Trappola bersaglio di QUESTA chiamata è essa stessa
                // una Trappola Fasulla-style (redirectsTrapDestroyToSelf) e
                // fa parte del lotto colpito, non serve cercare un
                // sostituto: si distrugge e basta, per costruzione (il
                // "AL LORO POSTO" del testo reale è già soddisfatto — è
                // proprio lei quella carta) — ma marca comunque il lotto
                // come coperto, PRIMA di proseguire con la distruzione
                // normale qui sotto, così ogni altra Trappola dello stesso
                // lotto (elaborata prima o dopo, l'ordine non conta) resta
                // protetta.
                if (batchToken && getDefinition(slot.card.id)?.redirectsTrapDestroyToSelf) {
                    batchToken.redirected = true;
                } else {
                    // Deve restare COPERTA finché non scatta (esattamente
                    // come una Trappola normale, incluso il divieto di
                    // rispondere nel turno in cui è stata Set) — non ancora
                    // "attivata" nel senso di questo motore (mai passata da
                    // activateCard), ecco perché sceglie da sola quale carta
                    // sostituire invece di passare dalla Chain: stesso
                    // spirito semplificato di onOwnMonsterDestroyed/
                    // onSTDestroyed qui sotto.
                    const substituteIndex = field.findIndex((s, i) => s && s.isFaceDown && s.setOnTurn !== gameState.turn && i !== index && getDefinition(s.card.id)?.redirectsTrapDestroyToSelf);
                    if (substituteIndex !== -1) {
                        const substituteCard = field[substituteIndex].card;
                        field[substituteIndex] = null;
                        graveyardOf(owner).push(substituteCard);
                        addToLog(`🔀 ${substituteCard.name} si distrugge al posto di ${slot.card.name}!`);
                        const subDef = getDefinition(substituteCard.id);
                        if (subDef && typeof subDef.onSTDestroyed === 'function') {
                            safeCallCardHandler(substituteCard, 'onSTDestroyed', () => subDef.onSTDestroyed(makeContext(owner, { card: substituteCard, wasFaceDown: true, destroyedByOwner: destroyerOwner })));
                        }
                        if (batchToken) batchToken.redirected = true;
                        return;
                    }
                }
            }
            // "Finché è equipaggiata a un mostro, questa carta non può
            // essere distrutta da effetti Carta" (es. Spada Fusione Lama
            // Murasame, id 726) — per-carta, solo mentre risulta
            // AGGANCIATA a un bersaglio (equippedToUid impostato: se il
            // bersaglio è appena diventato non valido, il consueto
            // controllo di pulizia in recomputeStaticEffects la manda al
            // Cimitero comunque, PRIMA che questo controllo la veda più
            // "equipaggiata" — nessun conflitto).
            if (getDefinition(slot.card.id)?.cannotBeDestroyedByCardEffectWhileEquipped && slot.card.equippedToUid) {
                addToLog(`🛡️ ${slot.card.name} non può essere distrutta da un effetto Carta finché resta equipaggiata!`);
                return;
            }
            const destroyedCard = slot.card;
            const wasFaceDown = slot.isFaceDown;
            graveyardOf(owner).push(destroyedCard);
            field[index] = null;
            // Nobile dello Sterminio (id 881): "distruggi E bandisci" una
            // Magia/Trappola coperta — stesso flag PER-ISTANZA
            // (card.mustBanishOnLeavingField) già usato per i mostri
            // (destroyMonster/notifySacrificedForTribute/resolveBattleDamage),
            // esteso qui per la prima volta a una Magia/Trappola.
            redirectToBanishIfFlagged(owner, destroyedCard);
            const def = getDefinition(destroyedCard.id);
            if (def && typeof def.onSTDestroyed === 'function') {
                safeCallCardHandler(destroyedCard, 'onSTDestroyed', () => def.onSTDestroyed(makeContext(owner, { card: destroyedCard, wasFaceDown: wasFaceDown, destroyedByOwner: destroyerOwner })));
            }
            // "Quando una TUA Trappola viene distrutta e mandata al
            // Cimitero da un effetto dell'AVVERSARIO" (es. Neve Battente,
            // id 215) — a differenza di def.onSTDestroyed qui sopra (solo
            // la carta distrutta reagisce a se stessa), qui è un'ALTRA
            // Trappola Set dello stesso proprietario a reagire. Stesso
            // identico schema/stessa SEMPLIFICAZIONE (un solo rispondente
            // automatico, niente vera finestra di priorità) già usato per
            // onOwnMonsterDestroyed nel ramo TRIGGER.ON_DESTROY di
            // fireTrigger qui sopra, solo per la zona 'st' invece che
            // 'monster' — richiede esplicitamente che sia stato
            // l'AVVERSARIO a causare la distruzione (destroyerOwner),
            // niente reazione se il proprietario distrugge la propria
            // Trappola da sé.
            if (destroyerOwner && destroyerOwner !== owner) {
                const reactCandidates = [];
                stFieldOf(owner).forEach((slot, idx) => {
                    if (!slot) return;
                    if (slot.card.type === 'trap' && slot.setOnTurn === gameState.turn) return;
                    if (slot.card.type === 'trap' && areTrapsNegatedFor(owner)) return;
                    const rdef = getDefinition(slot.card.id);
                    if (rdef && typeof rdef.onOwnSpellTrapDestroyed === 'function') {
                        reactCandidates.push({ index: idx, card: slot.card, def: rdef });
                    }
                });
                const reactCtx = (choice) => makeContext(owner, { card: choice.card, zone: 'st', index: choice.index, destroyedCard: destroyedCard, destroyedByOwner: destroyerOwner });
                const eligible = reactCandidates.filter((c) => !c.def.canActivate || c.def.canActivate(reactCtx(c)));
                if (eligible.length > 0) {
                    const choice = eligible[0];
                    if (choice.def.continuous) {
                        stFieldOf(owner)[choice.index].isFaceDown = false;
                    } else {
                        stFieldOf(owner)[choice.index] = null;
                        graveyardOf(owner).push(choice.card);
                    }
                    addToLog(`💀 ${owner === 'player' ? 'Hai' : 'Il bot ha'} attivato ${choice.card.name}!`);
                    if (window.FX) FX.playCardActivateCenterScreen(choice.card);
                    safeCallCardHandler(choice.card, 'onOwnSpellTrapDestroyed', () => choice.def.onOwnSpellTrapDestroyed(reactCtx(choice)));
                }
            }
        },

        /**
         * Cambia la Posizione di Battaglia (Attacco<->Difesa) del mostro
         * nello slot indicato e scatena TRIGGER.ON_POSITION_CHANGE — usato
         * SIA dal cambio manuale del giocatore (changeMonsterPosition in
         * actions.js) SIA da ogni effetto-carta che forza un cambio di
         * Posizione (es. Stop Difesa id 69, Vaso Cattura-Drago id 206),
         * così un mostro con un proprio onPositionChange (es. Clown
         * Stupido/Clown del Sogno, id 530/531) reagisce indipendentemente
         * da COSA gli ha cambiato la Posizione. Non tocca isFaceDown: chi
         * chiama questa funzione se ne occupa a parte, se serve.
         */
        changePosition(owner, index, newPosition) {
            const slot = fieldOf(owner)[index];
            if (!slot || slot.position === newPosition) return;
            const fromPosition = slot.position;
            slot.position = newPosition;
            fireTrigger(TRIGGER.ON_POSITION_CHANGE, makeContext(owner, {
                card: slot.card, slot: slot, slotIndex: index, fromPosition: fromPosition, toPosition: newPosition
            }));
        },

        /**
         * Tracciamento generico "una volta per turno" per un effetto che
         * NON è un Ignition di un mostro (che ha già gameState.usedIgnitionThisTurn) —
         * es. l'effetto ricorrente di Signore del Rosso (id 354), che va
         * tracciato per singola carta (uid) E per singolo beneficiario,
         * non solo per carta. `key` è una stringa scelta da chi chiama
         * (di solito `${card.uid}:qualcosa:${owner}`). Resettato ad ogni
         * cambio turno in changeTurn() (game-flow.js), come usedIgnitionThisTurn.
         */
        hasUsedOncePerTurn(key) {
            return !!(gameState.usedOncePerTurnEffect && gameState.usedOncePerTurnEffect[key]);
        },
        markUsedOncePerTurn(key) {
            gameState.usedOncePerTurnEffect = gameState.usedOncePerTurnEffect || {};
            gameState.usedOncePerTurnEffect[key] = true;
        },

        /**
         * Come hasUsedOncePerTurn/markUsedOncePerTurn qui sopra, ma per un
         * effetto "una volta per Duello" (es. Tartaruga Elettromagnetica,
         * id 223) — MAI azzerato da changeTurn() (a differenza di quello),
         * dato che un Duello dura finché non ne inizia uno nuovo (che
         * ricrea gameState da zero comunque).
         */
        hasUsedOncePerDuel(key) {
            return !!(gameState.usedOncePerDuelEffect && gameState.usedOncePerDuelEffect[key]);
        },
        markUsedOncePerDuel(key) {
            gameState.usedOncePerDuelEffect = gameState.usedOncePerDuelEffect || {};
            gameState.usedOncePerDuelEffect[key] = true;
        },

        /**
         * Termina immediatamente la Battle Phase in corso (es. Tartaruga
         * Elettromagnetica, id 223, attivata come Quick Effect dal
         * Cimitero durante la Battle Phase dell'avversario): salta
         * direttamente a Main Phase 2, come se il giocatore di turno
         * l'avesse scelto da sé. Non fa nulla se non si è già in Battle
         * Phase (difesa contro un doppio uso nella stessa Chain).
         */
        endBattlePhase() {
            if (gameState.phase !== 'battle') return;
            gameState.phase = 'main2';
            addToLog('⏹️ La Battle Phase termina qui!');
        },

        /**
         * Dichiara un bersaglio scelto da QUESTO effetto (this.card/this.owner)
         * PRIMA di agire su di esso — vedi declareCardEffectTarget più
         * sotto per la logica completa (Signore dei D., Gran Scudo Gardna,
         * Specchietto della Fata, Mago Comando del Caos). Un effetto-carta
         * che sceglie davvero un bersaglio (non un auto-pick euristico, non
         * un "distruggi tutti") dovrebbe chiamare ctx.declareTarget(owner,
         * index) e SEMPRE usare i valori restituiti (target.targetOwner/
         * targetIndex), fermandosi subito se target.allowed è false.
         */
        declareTarget(targetOwner, targetIndex, options) {
            return declareCardEffectTarget(this, targetOwner, targetIndex, options);
        },

        /**
         * Combina declareTarget(...) + destroyMonster(...) in UNA sola
         * chiamata — il caso più comune di "un effetto sceglie 1 mostro
         * come bersaglio e lo distrugge" (decine di carte in questo
         * dataset). Nato per eliminare la "danza in due mosse" (dichiara
         * PRIMA il bersaglio, POI distruggilo, sempre in quest'ordine) che
         * scrivendo una carta nuova a mano si può dimenticare di fare, o
         * fare nell'ordine sbagliato — un errore silenzioso: nessuna
         * eccezione, nessun log d'errore, solo il checkpoint di targeting
         * condiviso (Gran Scudo Gardna, Signore dei D. e le altre carte
         * reattive che lo consultano) che non vede mai quell'attivazione.
         * Non risolve un bug già noto di una carta specifica — è una
         * misura preventiva per il prossimo effetto "distruggi 1 mostro
         * bersaglio" che si scriverà in questo file, dopo che un audit di
         * sessione (richiesto dall'utente) ha mostrato quanto sia facile
         * lasciare indietro un dettaglio simile senza accorgersene. Da
         * preferire SEMPRE a un declareTarget+destroyMonster scritto a
         * mano quando l'effetto è "distruggi 1 mostro bersaglio", punto —
         * i due passaggi separati restano necessari solo quando serve fare
         * qualcos'altro IN MEZZO (leggere il bersaglio prima di
         * distruggerlo, es. per infliggere danno pari alla sua ATK).
         *
         * Torna { allowed, targetOwner, targetIndex, card }: allowed=false
         * se il bersaglio si è sottratto (Gran Scudo Gardna) o l'intera
         * attivazione è stata annullata — il chiamante NON deve procedere
         * oltre. `card` è il mostro EFFETTIVAMENTE distrutto (letto PRIMA
         * della rimozione dal campo, quindi resta valido per il log anche
         * dopo che destroyMonster lo ha già spostato al Cimitero) —
         * targetOwner/targetIndex possono essere stati RIDIRETTI
         * (Specchietto della Fata): sempre gli stessi valori restituiti da
         * declareTarget, mai quelli passati in ingresso.
         */
        destroyTargetedMonster(targetOwner, targetIndex, options) {
            const decl = this.declareTarget(targetOwner, targetIndex, options);
            if (!decl.allowed) return { allowed: false, targetOwner: decl.targetOwner, targetIndex: decl.targetIndex, card: null };
            const slot = this.field(decl.targetOwner)[decl.targetIndex];
            if (!slot) return { allowed: false, targetOwner: decl.targetOwner, targetIndex: decl.targetIndex, card: null };
            const card = slot.card;
            this.destroyMonster(decl.targetOwner, decl.targetIndex);
            return { allowed: true, targetOwner: decl.targetOwner, targetIndex: decl.targetIndex, card: card };
        },

        /**
         * Bonus ATK/DEF "fino alla fine di questo turno" (es. Drenaggio di
         * Energia id 227, Rimozione del Limitatore id 350) — a differenza
         * di gameState.atkDefBonus (ricalcolato da zero ad ogni render da
         * un static(), finché la carta sorgente resta scoperta in campo),
         * questo bonus si scrive UNA VOLTA sola all'attivazione e resta
         * finché non arriva la End Phase di QUESTO turno (vedi
         * clearTemporaryAtkDefBonus qui sotto, chiamata da enterEndPhase()
         * in game-flow.js), indipendentemente dal fatto che la carta che
         * l'ha causato sia ancora in campo o meno. Passa destroyAfter:
         * true se il mostro va anche distrutto in quel momento (es.
         * Rimozione del Limitatore).
         */
        grantTemporaryAtkDefBonus(card, atk, def, destroyAfter) {
            gameState.temporaryAtkDefBonus = gameState.temporaryAtkDefBonus || {};
            gameState.temporaryAtkDefBonus[card.uid] = { atk: atk || 0, def: def || 0, destroyAfter: !!destroyAfter };
        },

        /**
         * Come grantTemporaryAtkDefBonus, ma valido SOLO per il calcolo del
         * prossimo Damage Step (letto e consumato da getDamageStepBonus qui
         * sopra), non fino a fine turno — es. Fuoco di Copertura (id 852).
         */
        grantDamageStepOnlyBonus(card, atk, def) {
            gameState.damageStepOnlyBonusFor = gameState.damageStepOnlyBonusFor || {};
            gameState.damageStepOnlyBonusFor[card.uid] = { atk: atk || 0, def: def || 0 };
        },

        /**
         * Consuma tutti i bonus ATK/DEF "fino a fine turno" in sospeso:
         * applica le eventuali distruzioni previste (destroyAfter), poi
         * svuota lo store. Chiamata da enterEndPhase() ad ogni End Phase
         * (una sola per turno, quindi corretta indipendentemente da chi
         * abbia effettivamente attivato la carta che ha creato il bonus).
         */
        clearTemporaryAtkDefBonus() {
            const store = gameState.temporaryAtkDefBonus;
            if (!store) return;
            Object.keys(store).forEach((uid) => {
                if (!store[uid].destroyAfter) return;
                ['player', 'bot'].forEach((owner) => {
                    fieldOf(owner).forEach((slot, index) => {
                        if (slot && slot.card.uid === uid) ACTIONS.destroyMonster(owner, index);
                    });
                });
            });
            gameState.temporaryAtkDefBonus = {};
        },

        /**
         * Distrugge TUTTI i mostri sul campo del giocatore indicato (o di
         * entrambi, se owner è omesso). `this.destroyMonster` (non
         * `ACTIONS.destroyMonster`) apposta: se questa funzione è invocata
         * come ctx.destroyAllMonsters(...) (es. Buco Nero, id 7), `this`
         * dentro di essa è quel ctx — passarlo così, invece di richiamare
         * ACTIONS direttamente, preserva "chi ha causato la distruzione"
         * (destroyedByOwner, vedi destroyMonster più sopra) anche per una
         * distruzione di massa, non solo per una singola.
         */
        destroyAllMonsters(owner) {
            const owners = owner ? [owner] : ['player', 'bot'];
            owners.forEach((o) => {
                fieldOf(o).forEach((slot, index) => {
                    if (slot) this.destroyMonster(o, index);
                });
            });
        },

        /** Distrugge tutte le carte (mostri + magie/trappole) sul campo del giocatore indicato. */
        destroyAllCards(owner) {
            this.destroyAllMonsters(owner);
            stFieldOf(owner).forEach((slot, index) => {
                if (slot) {
                    graveyardOf(owner).push(slot.card);
                    stFieldOf(owner)[index] = null;
                }
            });
        },

        /**
         * "Considerata di Tipo X fino alla End Phase di questo turno" (es.
         * Tribù dei D. id 637, Notte Meccanica id 153) — muta direttamente
         * card.race (letto ovunque nel motore, quindi ogni controllo
         * esistente vede subito il nuovo Tipo senza bisogno di toccarlo)
         * e registra {card, originalRace} in
         * gameState.raceOverridesUntilEndOfTurn, ripristinato da
         * enterEndPhase() (game-flow.js). Se `card` ha già un override
         * attivo questo turno, l'originalRace già salvato NON viene
         * sovrascritto (altrimenti un secondo override perderebbe il vero
         * Tipo originale).
         */
        overrideRaceUntilEndOfTurn(card, newRace) {
            gameState.raceOverridesUntilEndOfTurn = gameState.raceOverridesUntilEndOfTurn || [];
            const alreadyTracked = gameState.raceOverridesUntilEndOfTurn.some((e) => e.card === card);
            if (!alreadyTracked) {
                gameState.raceOverridesUntilEndOfTurn.push({ card: card, originalRace: card.race });
            }
            card.race = newRace;
        },

        /** Infligge danno diretto ai Life Points del giocatore indicato (può essere negativo per curare). */
        dealDamage(owner, amount) {
            // Es. Carta della Rovina (id 140): "il tuo avversario non
            // subisce danni" per il resto del turno — a differenza di
            // noBattleDamageFor (solo danno da battaglia, controllato in
            // actions.js), questo blocca QUALUNQUE danno, qui nell'unico
            // punto per cui passa ogni variazione di LP. Non blocca la
            // cura (amount negativo): "non subisce danni" non impedisce
            // di guadagnare Life Points.
            if (amount > 0 && gameState.noDamageFor && gameState.noDamageFor[owner]) {
                addToLog(`🙏 ${owner === 'player' ? 'Non subisci' : 'Il bot non subisce'} alcun danno in questo turno!`);
                return;
            }
            // Virus Distruggi-Carte (id 165): "il tuo avversario non
            // subisce danni fino alla fine del turno successivo" — dura
            // OLTRE il cambio turno, a differenza di noDamageFor qui
            // sopra (azzerato ad ogni changeTurn), quindi serve un
            // conteggio "N End Phase" invece di un semplice flag —
            // gameState.pendingNoDamageExpiry, decrementato ad OGNI End
            // Phase (di chiunque, non solo di un proprietario specifico:
            // "il turno successivo" conta il primo turno che arriva,
            // chiunque lo stia giocando) da processNoDamageExpiry() più
            // sotto, chiamata da enterEndPhase() (game-flow.js).
            if (amount > 0 && gameState.pendingNoDamageExpiry && gameState.pendingNoDamageExpiry.some((e) => e.owner === owner)) {
                addToLog(`🙏 ${owner === 'player' ? 'Non subisci' : 'Il bot non subisce'} alcun danno (Virus Distruggi-Carte)!`);
                return;
            }
            gameState[lpKeyOf(owner)] -= amount;
            // Sosia (id 204, Trappola Continua): "Quando subisci danno
            // dall'effetto di un mostro controllato dal tuo avversario:
            // infliggi all'avversario lo stesso danno." Quando questo
            // metodo viene chiamato come ctx.dealDamage(...) da un
            // handler di un Mostro (stesso trucco di `this` già usato per
            // destroyMonster/discardRandomFromHand: this === ctx),
            // this.card è la carta sorgente e this.owner il suo
            // controllore. Se la carta sorgente è un Mostro, il suo
            // controllore è DIVERSO da chi riceve il danno (owner), E chi
            // lo riceve controlla Sosia scoperta, riflette subito —
            // stesso stile "live check sul campo" già usato per Canyon/
            // Statua di Pietra degli Aztechi in resolveBattleDamage
            // (actions.js), qui nell'unico punto per cui passa ogni
            // variazione di LP, senza toccare i singoli effetti mostro
            // esistenti. Chiamata come funzione semplice (non this.
            // dealDamage) apposta: evita che Sosia rifletta anche il
            // proprio danno riflesso (this.card qui sarebbe undefined).
            if (amount > 0 && this && this.card && this.card.type === 'monster' && this.owner && this.owner !== owner) {
                const hasSosia = stFieldOf(owner).some((s) => s && !s.isFaceDown && s.card.id === 204);
                if (hasSosia) {
                    addToLog('🪞 Sosia riflette il danno all\'avversario!');
                    ACTIONS.dealDamage(this.owner, amount);
                }
            }
            // Camera Oscura degli Incubi (id 686, Trappola Continua):
            // "ogni volta che il tuo avversario subisce danno da un
            // effetto Carta, eccetto questa carta: infliggigli 300
            // danni." Stesso stile "live check sul campo" di Sosia qui
            // sopra: se questo danno arriva da QUALUNQUE carta (this.card,
            // non solo un Mostro) diversa da questa stessa (evita loop) e
            // chi lo riceve ha un avversario che controlla Camera Oscura
            // scoperta, infliggi 300 danni in più — chiamata come
            // funzione semplice apposta, stesso motivo di Sosia.
            if (amount > 0 && this && this.card && this.card.id !== 686) {
                const opponentOwner = opponentOf(owner);
                const hasNightmareWheel = stFieldOf(opponentOwner).some((s) => s && !s.isFaceDown && s.card.id === 686);
                if (hasNightmareWheel) {
                    addToLog('🌑 Camera Oscura degli Incubi infligge 300 danni in più!');
                    ACTIONS.dealDamage(owner, 300);
                }
            }
            // Suono Life Points, SEMPRE (battaglia, danno diretto, effetto
            // carta — dealDamage è l'unico punto per cui passa OGNI
            // variazione di LP, sia da actions.js/resolveBattleDamage sia
            // da ctx.dealDamage in card-effects.js): un piccolo ritardo
            // apposta, così se questa chiamata arriva da una battaglia che
            // ha appena distrutto un mostro, il suono di distruzione
            // (triggerDestroyEffect, sparato subito dopo QUESTA riga,
            // sincrono, da resolveAttack in actions.js) si sente per primo
            // — ordine voluto: attacco -> distruzione -> Life Points, mai
            // il contrario. Per un danno senza distruzione (diretto, da
            // carta) il ritardo resta comunque troppo piccolo per sembrare
            // innaturale.
            if (amount !== 0 && window.SFX) {
                setTimeout(() => {
                    if (amount > 0) SFX.lifePointsLost(); else SFX.lifePointsGained();
                }, 220);
            }
            // Guadagno di Life Points (amount negativo): scatena l'eventuale
            // reazione di ogni mostro scoperto di `owner` con un proprio
            // onGainLifePoints (es. Principessa di Fuoco, id 241) — stesso
            // spirito di TRIGGER.ON_CARD_ACTIVATED in fireTrigger più sotto
            // (ogni carta idonea reagisce per conto suo), ma per un evento
            // troppo frequente/generico (qualunque cura, da qualunque
            // fonte) per meritare una voce propria in TRIGGER.
            if (amount < 0) {
                fieldOf(owner).forEach((slot, index) => {
                    if (!slot || slot.isFaceDown) return;
                    const def = getDefinition(slot.card.id);
                    if (def && typeof def.onGainLifePoints === 'function') {
                        safeCallCardHandler(slot.card, 'onGainLifePoints', () => def.onGainLifePoints(makeContext(owner, { card: slot.card, slotIndex: index, amountGained: -amount })));
                    }
                });
            }
        },

        /**
         * Nega l'attivazione della carta a cui questa risposta sta
         * rispondendo — es. Giudizio Solenne (id 448): "annulla
         * l'Evocazione o l'attivazione, e se lo fai, distruggi quella
         * carta". Va chiamata SOLO da un handler in risposta (mai dalla
         * stessa attivazione che si vorrebbe negare): resolveChain() più
         * sotto risolve la Chain in ordine LIFO, quindi quando questa
         * risposta si risolve la Chain contiene ancora, più in basso, il
         * link della carta da negare — qui lo marchiamo, resolveChain lo
         * salta invece di chiamarne l'handler (vedi lì per la pulizia
         * delle Magie/Trappole Continue negate). Torna true se c'era
         * davvero qualcosa da negare.
         */
        negateActivation() {
            const chain = ensureChainState();
            if (chain.links.length === 0) return false;
            const target = chain.links[chain.links.length - 1];
            if (target.negated) return false;
            target.negated = true;
            return true;
        },

        /**
         * Pesca `amount` carte per il giocatore indicato, riusando la stessa
         * logica del Draw Phase. L'animazione (sfilata + FX + suono) NON
         * parte da qui: va scatenata dopo che activateCard() qui sotto ha
         * già chiamato il proprio updateUI(), altrimenti quel render
         * ricostruirebbe la mano e staccherebbe i nodi appena animati dal
         * documento — vedi animateEffectDraw() in game-flow.js. Per questo
         * ci si limita ad accodare l'animazione in gameState.
         */
        drawCards(owner, amount) {
            const drawn = drawCardsToHand(owner, amount);
            if (drawn > 0) {
                const pending = gameState._pendingDrawAnimation;
                gameState._pendingDrawAnimation = {
                    owner: owner,
                    count: (pending && pending.owner === owner ? pending.count : 0) + drawn
                };
            }
            return drawn;
        },

        /**
         * Special Summon: fa entrare in campo un mostro senza consumare
         * l'Evocazione Normale del turno e senza richiedere Tributi.
         * `card` può arrivare dalla mano, dal Cimitero o dall'Extra Deck:
         * chi chiama questa funzione si occupa di toglierlo dalla zona di
         * origine PRIMA di chiamarla (vedi es. in card-effects.js).
         * `fromZone` (opzionale, es. 'graveyard') descrive da dove arriva
         * `card` — serve solo per far sapere a ctx.summonedFromZone (es.
         * Carta del Ritorno Sicuro, id 141: "quando un mostro viene
         * Special Summonato dal TUO Cimitero...") da dove veniva davvero.
         * Omesso per compatibilità da tutte le chiamate esistenti che non
         * ne hanno bisogno.
         */
        specialSummon(owner, card, slotIndex, position, fromZone) {
            const field = fieldOf(owner);
            if (field[slotIndex]) return false; // slot occupato: niente da fare
            // Guardiano Falce del Terrore (id 282): "non puoi Special
            // Summonare altri mostri finché questa carta è in campo" —
            // vedi gameState.otherMonsterSummonsBlockedFor, ricalcolato in
            // recomputeStaticEffects() qui sopra. card.id !== 282 esclude
            // esplicitamente questa stessa carta dal proprio divieto (una
            // seconda copia di 282 non è comunque bloccata dalla prima).
            // SEMPLIFICAZIONE: manda `card` al Cimitero invece di lasciarla
            // dove si trovava — quasi NESSUN chiamante di questa funzione
            // controlla il valore di ritorno (il chiamante toglie sempre
            // `card` dalla propria zona PRIMA di invocarla, per contratto
            // di questa stessa funzione, vedi il commento in cima), quindi
            // un semplice `return false` la farebbe sparire nel nulla.
            if (gameState.otherMonsterSummonsBlockedFor && gameState.otherMonsterSummonsBlockedFor[owner] && card.id !== 282) {
                addToLog(`🚫 Guardiano Falce del Terrore impedisce ogni altra Evocazione: ${card.name} non può essere Special Summonata.`);
                graveyardOf(owner).push(card);
                return false;
            }
            // def.cannotSpecialSummon (es. Yata-Garasu, id 884: "non può
            // essere Special Summonata", un Mostro Spirito Evocabile solo
            // Normalmente) — simmetrico a def.cannotNormalSummon già
            // esistente per il caso opposto (actions.js). Stesso "manda al
            // Cimitero invece di lasciarla nel nulla" del controllo qui
            // sopra, per lo stesso motivo (nessun chiamante controlla il
            // valore di ritorno).
            if (getDefinition(card.id)?.cannotSpecialSummon) {
                addToLog(`🚫 ${card.name} non può essere Special Summonata.`);
                graveyardOf(owner).push(card);
                return false;
            }
            field[slotIndex] = {
                card: card,
                position: position,
                isFaceDown: position === 'defense',
                hasAttacked: false,
                canChangePosition: false
            };
            fireTrigger(
                TRIGGER.ON_SPECIAL_SUMMON,
                makeContext(owner, { summonedCard: card, summonedSlotIndex: slotIndex, summonedPosition: position, summonedFromZone: fromZone }),
                () => {
                    if (typeof updateUI === 'function') updateUI();
                    // Le Evocazioni Speciali (Rinascita del Mostro, ecc. —
                    // OGNI carta che chiama questa funzione) non avevano
                    // ALCUN feedback visivo: la carta appariva sul Terreno
                    // col solo re-render, a differenza dell'Evocazione
                    // Normale (summonMonster, js/engine/actions.js) che ha
                    // volo dalla mano + cerchio + shockwave + audio.
                    // Centralizzato QUI (non per singola carta) perché
                    // corregge d'un colpo ogni Evocazione Speciale del
                    // motore, non solo una.
                    setTimeout(() => {
                        if (typeof triggerFieldImpact === 'function') triggerFieldImpact(owner, slotIndex, 'monster');
                        if (typeof showPositionEffect === 'function') showPositionEffect(owner, slotIndex, position);
                        const cardEl = document.querySelector(`#${owner === 'player' ? 'playerFieldBoard' : 'botFieldBoard'} .field-slot[data-type="monster"][data-index="${slotIndex}"] .card`);
                        if (cardEl && window.FX) FX.playMonsterSummonEffect(card, cardEl);
                        if (!(window.AudioLibrary && AudioLibrary.tryPlayCardSound(card, 'evocazioni')) && window.SFX) SFX.summon(position);
                    }, 30);
                }
            );
            return true;
        },

        /**
         * Trova il primo slot mostro libero E non bloccato (vedi
         * gameState.lockedMonsterZonesFor — es. Buco Dimensionale, id
         * 201: "finché il mostro resta bandito, quella Zona Mostro non
         * può essere usata", stesso schema di isSTZoneLocked/findFreeSTSlot
         * per la zona Magia/Trappola) del giocatore indicato, o -1 se il
         * campo è pieno/tutto bloccato.
         */
        findEmptyMonsterSlot(owner) {
            const locked = gameState.lockedMonsterZonesFor && gameState.lockedMonsterZonesFor[owner];
            return fieldOf(owner).findIndex((slot, index) => slot === null && !(locked && locked.has(index)));
        },

        /**
         * Crea fino a `count` Token (es. Capro Espiatorio, Moltiplicazione)
         * e li Special Summona scoperti negli slot liberi del Terreno di
         * `owner`, fermandosi prima se il Terreno si riempie — ritorna
         * quanti ne è riuscito a creare davvero. `template` è un oggetto
         * carta "finto" (name/race/attribute/level/attack/defense), MAI
         * un id di data/cards.json: ogni Token ha `id: -1` (nessuna voce
         * reale nel database — coerente con le carte vere, che non hanno
         * Token propri) e `isToken: true`, utile a chi in futuro volesse
         * escluderli da conteggi che parlano di "carte" vere e proprie.
         * SEMPLIFICAZIONE: non impedisce di sacrificarli per un'Evocazione
         * Tributo (la regola vera lo vieta) — nessun meccanismo di
         * restrizione-Tributo per-carta esiste ancora in questo motore.
         */
        createTokens(owner, count, template) {
            let created = 0;
            for (let i = 0; i < count; i++) {
                const slotIndex = ACTIONS.findEmptyMonsterSlot(owner);
                if (slotIndex === -1) break;
                const token = Object.assign({}, template, {
                    id: -1,
                    uid: `token_${Date.now()}_${Math.random().toString(36).slice(2)}_${i}`,
                    type: 'monster',
                    isToken: true
                });
                ACTIONS.specialSummon(owner, token, slotIndex, 'defense');
                created++;
            }
            return created;
        },

        /**
         * Rimescola `cards` nel Deck di `owner` (es. Recupero dei
         * Mostri, id 384) — chi chiama questa funzione toglie le carte
         * dalla loro zona di origine PRIMA di invocarla, esattamente come
         * specialSummon()/banishTemporarily() più sopra. Come
         * searchDeckToHand qui sotto, funziona SOLO se `owner` ha un vero
         * Deck salvato: nel Duello Demo (pool casuale, nessun
         * gameState.playerDeck/botDeck) non fa nulla e lo segnala nel
         * log. Ritorna true se le carte sono state davvero rimescolate.
         */
        shuffleIntoDeck(owner, cards) {
            const deck = owner === 'player' ? gameState.playerDeck : gameState.botDeck;
            if (!Array.isArray(deck) || !cards || cards.length === 0) {
                if (Array.isArray(cards) && cards.length > 0) {
                    addToLog('🔀 Nessun Deck reale da cui/in cui rimescolare in questa modalità (serve un mazzo salvato, non il pool casuale del Duello Demo).');
                }
                return false;
            }
            cards.forEach((c) => deck.push(c));
            // Fisher-Yates
            for (let i = deck.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [deck[i], deck[j]] = [deck[j], deck[i]];
            }
            return true;
        },

        /**
         * Cerca fino a `maxCount` carte nel Deck di `owner` che soddisfano
         * `matchFn(card)` e le aggiunge alla mano (es. Berfomet, Thunder
         * Dragon). Funziona SOLO se `owner` ha un vero Deck salvato
         * (gameState.playerDeck/botDeck, popolato da buildDeckFromSpec in
         * cards-db.js) — il Duello Demo pesca da un pool casuale infinito
         * invece che da un vero Deck (vedi createRandomCard in
         * cards-db.js), quindi lì questa funzione non trova nulla da
         * cercare e lo segnala nel log invece di fallire in silenzio.
         * Ritorna l'array delle carte trovate (può essere vuoto).
         */
        searchDeckToHand(owner, matchFn, maxCount) {
            const deck = owner === 'player' ? gameState.playerDeck : gameState.botDeck;
            if (!Array.isArray(deck)) {
                addToLog('🔍 Nessun Deck reale da cui cercare in questa modalità (serve un mazzo salvato, non il pool casuale del Duello Demo).');
                return [];
            }
            const found = [];
            for (let i = deck.length - 1; i >= 0 && found.length < maxCount; i--) {
                if (matchFn(deck[i])) found.push(deck.splice(i, 1)[0]);
            }
            found.forEach((card) => handOf(owner).push(card));
            if (found.length > 0) {
                addToLog(`🔍 ${owner === 'player' ? 'Hai' : 'Il bot ha'} cercato ${found.length} cart${found.length > 1 ? 'e' : 'a'} dal Deck!`);
            }
            return found;
        },

        /**
         * Evocazione Fusione: manda al Cimitero ogni Materiale da Fusione
         * (dalla mano e/o dal Terreno, in base a dove getFusableExtraDeckMonsters
         * qui sotto li ha trovati) e fa uscire il mostro scelto
         * dall'Extra Deck, scoperto in Posizione di Attacco, sul primo
         * slot Mostro libero.
         * `materialLocations`: array di { zone: 'hand'|'monster', index }
         * (vedi getFusableExtraDeckMonsters). Torna false senza fare nulla
         * se il Terreno è pieno o l'indice Extra Deck non è valido, così
         * chi chiama non deve ricontrollare da sé prima di invocarla.
         */
        fusionSummon(owner, extraDeckIndex, materialLocations) {
            const extraDeck = owner === 'player' ? gameState.playerExtraDeck : gameState.botExtraDeck;
            const fusionCard = extraDeck && extraDeck[extraDeckIndex];
            if (!fusionCard) return false;
            const slotIndex = ACTIONS.findEmptyMonsterSlot(owner);
            if (slotIndex === -1) {
                addToLog('❌ Il Terreno è pieno: impossibile Evocare per Fusione.');
                return false;
            }
            const hand = handOf(owner);
            const field = fieldOf(owner);
            const graveyard = graveyardOf(owner);
            // Indici più alti prima: rimuovere prima un indice mano basso
            // sposterebbe (di uno) un indice mano più alto ancora da
            // rimuovere. Gli indici Terreno non si spostano mai (sono
            // caselle fisse messe a null, non un array che si accorcia),
            // quindi per loro l'ordine non conta.
            const sorted = [...(materialLocations || [])].sort((a, b) => b.index - a.index);
            sorted.forEach((loc) => {
                if (loc.zone === 'hand') {
                    const [card] = hand.splice(loc.index, 1);
                    if (card) graveyard.push(card);
                } else if (loc.zone === 'monster' && field[loc.index]) {
                    graveyard.push(field[loc.index].card);
                    field[loc.index] = null;
                }
            });
            extraDeck.splice(extraDeckIndex, 1);
            ACTIONS.specialSummon(owner, fusionCard, slotIndex, 'attack');
            addToLog(`🔗 ${owner === 'player' ? 'Hai' : 'Il bot ha'} Evocato per Fusione ${fusionCard.name}!`);
            return true;
        },

        /**
         * Bando PERMANENTE (es. costo "bandisci 1 mostro dal Cimitero" per
         * una Special Summon, o "questa carta si bandisce dopo aver
         * combattuto") — il caso più semplice, senza alcun ritorno
         * programmato (a differenza di banishTemporarily/
         * banishFromHandWithCountdown qui sotto): la carta va nella zona
         * Bandite di `owner` (gameState.playerBanished/botBanished, vedi
         * banishedOf) e ci resta per il resto del Duello. Il chiamante
         * toglie `card` da dove si trovava (Cimitero, Terreno, mano) PRIMA
         * di chiamare questa funzione, esattamente come specialSummon()
         * qui sopra — questa funzione fa solo il passo finale "dove
         * finisce la carta".
         */
        banish(owner, card) {
            banishedOf(owner).push(card);
            // def.onBanished(ctx): unico punto condiviso da OGNI effetto di
            // bando del dataset (~28 chiamate diverse in card-effects.js,
            // da qualunque zona: Terreno, mano, Cimitero) — a differenza di
            // onDestroy/onSTDestroyed (solo la distruzione), copre il bando
            // come causa di "questa carta lascia il campo" per le poche
            // carte che devono reagire a QUALUNQUE modo di lasciarlo (es.
            // Amplificatore id 92, Abbandonato id 416, Festa Isterica id
            // 790). Il chiamante ha già tolto `card` dalla sua zona
            // originale PRIMA di invocare banish(), quindi non serve sapere
            // da dove veniva.
            const def = getDefinition(card.id);
            if (def && typeof def.onBanished === 'function') {
                safeCallCardHandler(card, 'onBanished', () => def.onBanished(makeContext(owner, { card: card })));
            }
        },

        /**
         * Banisce 1 carta DAL Cimitero di `owner` in un solo passo (rimozione
         * dal Cimitero + banish() sopra) — va usata SEMPRE al posto di uno
         * `grave.splice(...)` scritto a mano seguito da `ctx.banish(...)`
         * quando la carta viene DAL Cimitero (non dal Terreno/mano/Deck, che
         * restano fuori da questo controllo): è l'UNICO punto che può
         * rispettare Necrovalley (id 890, "le carte nel Cimitero non possono
         * essere bandite", valida per ENTRAMBI i giocatori finché è scoperta
         * sul Terreno di uno qualunque dei due) senza dover intercettare la
         * protezione in ~24 punti diversi sparsi in card-effects.js — stesso
         * principio già usato per `destroyTargetedMonster` (un unico
         * choke-point combinato invece di due chiamate separate facili da
         * dimenticare/scrivere fuori ordine). Torna `true` se il bando è
         * riuscito, `false` se bloccato da Necrovalley o se `card` non era
         * (più) nel Cimitero di `owner` — il chiamante deve trattare
         * `false` come "la carta resta dov'era", mai assumere che sia
         * comunque sparita.
         */
        banishFromGraveyard(owner, card) {
            const grave = graveyardOf(owner);
            const idx = grave.indexOf(card);
            if (idx === -1) return false;
            if (isNecrovalleyProtectingGraveyard(owner)) {
                addToLog(`🏺 Necrovalley impedisce che ${card.name} venga bandita dal Cimitero!`);
                return false;
            }
            grave.splice(idx, 1);
            this.banish(owner, card);
            return true;
        },

        /**
         * Bando TEMPORANEO con ritorno programmato (es. Buco Dimensionale,
         * Ninja d'Assalto) — diverso da un normale invio al Cimitero: la
         * carta esce dal Terreno ma resta "in sospeso" in
         * gameState.temporaryBanishments, e torna in campo da sola quando
         * scatta `returnTrigger`: 'standby' (alla prossima Standby Phase
         * DI `owner`) oppure 'endphase' (alla prossima End Phase, di
         * chiunque — chi bandisce durante il proprio turno la rivedrà
         * sempre entro la fine dello stesso turno). Il chiamante toglie
         * `card` dal Terreno PRIMA di chiamare questa funzione, esattamente
         * come specialSummon() qui sopra.
         */
        banishTemporarily(owner, card, returnTrigger, lockZoneIndex) {
            gameState.temporaryBanishments = gameState.temporaryBanishments || [];
            gameState.temporaryBanishments.push({ card: card, owner: owner, returnTrigger: returnTrigger, lockZoneIndex: lockZoneIndex });
            banishedOf(owner).push(card);
            // Buco Dimensionale (id 201): "finché il mostro resta
            // bandito, quella Zona Mostro non può essere usata" —
            // lockZoneIndex (opzionale, quinto parametro) blocca quello
            // slot esatto finché la carta non torna (vedi
            // findEmptyMonsterSlot qui sopra e il ritorno più sotto in
            // processTemporaryBanishmentReturns, che lo sblocca e ci
            // rimette la carta esattamente lì).
            if (lockZoneIndex != null) {
                gameState.lockedMonsterZonesFor = gameState.lockedMonsterZonesFor || { player: new Set(), bot: new Set() };
                gameState.lockedMonsterZonesFor[owner].add(lockZoneIndex);
            }
        },

        /**
         * Bando con ritorno programmato IN MANO dopo un CONTEGGIO di
         * Standby Phase di `owner` (es. Spada della Forza di Luce, id
         * 348: banisci 1 carta a caso dalla mano dell'avversario, torna
         * alla sua 4ª Standby Phase dopo l'attivazione) — diverso da
         * banishTemporarily qui sopra (quello torna sul TERRENO alla
         * PROSSIMA fase; questo torna in MANO dopo N fasi contate,
         * anche se la carta che ha bandito (una Trappola Normale, già
         * andata al Cimitero) non è più in campo a "ricordarselo" —
         * vedi processDelayedHandReturns più sotto, chiamata da
         * enterStandbyPhase() in game-flow.js.
         */
        banishFromHandWithCountdown(owner, card, standbys) {
            gameState.delayedHandReturns = gameState.delayedHandReturns || [];
            gameState.delayedHandReturns.push({ card: card, owner: owner, standbysRemaining: standbys });
            banishedOf(owner).push(card);
        },

        /**
         * Rinascita programmata dal CIMITERO al TERRENO dopo un CONTEGGIO
         * di Standby Phase di `owner` (es. Signore dei Vampiri, id 658:
         * "durante la tua prossima Standby Phase dopo che questa carta è
         * stata distrutta da un effetto dell'avversario: Special
         * Summonala" — standbys=1). Stesso identico spirito di
         * banishFromHandWithCountdown qui sopra ma verso il TERRENO
         * invece che la MANO — tenuto volutamente separato (invece di
         * generalizzare quello esistente con un parametro "destinazione")
         * per non rischiare di introdurre una regressione in un
         * meccanismo già testato e funzionante. Il chiamante toglie
         * `card` dal Cimitero PRIMA di chiamare questa funzione. Vedi
         * processDelayedGraveyardRevivals più sotto, chiamata da
         * enterStandbyPhase() in game-flow.js.
         */
        reviveFromGraveyardWithCountdown(owner, card, standbys) {
            gameState.delayedGraveyardRevivals = gameState.delayedGraveyardRevivals || [];
            gameState.delayedGraveyardRevivals.push({ card: card, owner: owner, standbysRemaining: standbys });
        },

        /**
         * Scarta 1 carta A CASO dalla mano di `owner` e la manda al suo
         * Cimitero — helper condiviso per ogni "il tuo avversario scarta 1
         * carta a caso" (es. Cappello Magico Bianco id 591, Goblin Ladro
         * id 610, Mietitore Spirituale id 661, Thestalos id 682), usato al
         * posto di uno splice/push manuale ripetuto identico in ~7 punti
         * SOLO perché così una carta scartata può reagire a se stessa
         * (es. Mummia Rigenerante id 667: "se questa carta viene mandata
         * dalla tua mano al Cimitero da un effetto dell'avversario") —
         * def.onSentToGraveyardFromHand(ctx), chiamata direttamente qui
         * (non tramite fireTrigger: nessuna Chain/finestra di risposta
         * serve per un auto-effetto della carta scartata su se stessa,
         * stesso spirito di onDestroy dentro destroyMonster più sopra).
         * ctx.discardedByOwner: chi ha causato lo scarto, letto da
         * `this.owner` come ctx.destroyedByOwner in destroyMonster —
         * null se chiamata senza un vero ctx dietro. Torna la carta
         * scartata (null se la mano era vuota), così un chiamante che
         * deve ancora ispezionarla (es. Thestalos: infliggi danni in base
         * al Livello) continua a poterlo fare.
         */
        discardRandomFromHand(owner) {
            const hand = handOf(owner);
            if (hand.length === 0) return null;
            const index = Math.floor(Math.random() * hand.length);
            const [card] = hand.splice(index, 1);
            const discardedByOwner = (this && this.owner) || null;
            graveyardOf(owner).push(card);
            const def = getDefinition(card.id);
            if (def && typeof def.onSentToGraveyardFromHand === 'function') {
                safeCallCardHandler(card, 'onSentToGraveyardFromHand', () => def.onSentToGraveyardFromHand(makeContext(owner, { card: card, discardedByOwner: discardedByOwner })));
            }
            notifyOwnMonsterSentToGraveyard(owner, card);
            return card;
        },

        /**
         * Scarta 1 carta SCELTA (per indice) dalla mano di `owner` e la
         * manda al suo Cimitero — sorella di discardRandomFromHand qui
         * sopra, stessa identica logica (def.onSentToGraveyardFromHand +
         * notifyOwnMonsterSentToGraveyard) ma per un indice preciso invece
         * che casuale: pochi effetti in questo dataset scelgono DAVVERO
         * quale carta scartare (es. Dicelops id 863) invece di scartare a
         * caso — prima di questo helper quei pochi punti scartavano con
         * splice/push manuale, senza mai far scattare i due hook sopra.
         */
        discardChosenFromHand(owner, handIndex) {
            const hand = handOf(owner);
            if (handIndex < 0 || handIndex >= hand.length) return null;
            const [card] = hand.splice(handIndex, 1);
            const discardedByOwner = (this && this.owner) || null;
            graveyardOf(owner).push(card);
            const def = getDefinition(card.id);
            if (def && typeof def.onSentToGraveyardFromHand === 'function') {
                safeCallCardHandler(card, 'onSentToGraveyardFromHand', () => def.onSentToGraveyardFromHand(makeContext(owner, { card: card, discardedByOwner: discardedByOwner })));
            }
            notifyOwnMonsterSentToGraveyard(owner, card);
            return card;
        },

        /**
         * Manda 1 carta SCELTA (per indice) dal Deck di `owner` al suo
         * Cimitero (mill) — terza sorella di discardRandomFromHand/
         * discardChosenFromHand qui sopra, stessa identica logica ma per
         * la zona Deck: scatena def.onSentToGraveyardFromDeck(ctx) (nuovo
         * hook, per le poche carte che reagiscono specificamente a
         * "mandata dal MIO Deck al Cimitero", es. Disperazione
         * dall'Oscurità id 662: "dalla mano O DAL DECK") e
         * notifyOwnMonsterSentToGraveyard (osservatori generici, stesso
         * schema delle due sorelle "dalla mano"). milledByOwner: chi ha
         * causato il mill, letto da `this.owner` come discardedByOwner
         * nelle due sorelle sopra.
         */
        millCardFromDeck(owner, deckIndex) {
            const deck = gameState[owner === 'player' ? 'playerDeck' : 'botDeck'];
            if (!Array.isArray(deck) || deckIndex < 0 || deckIndex >= deck.length) return null;
            const [card] = deck.splice(deckIndex, 1);
            gameState[owner === 'player' ? 'playerDeckCount' : 'botDeckCount'] = deck.length;
            const milledByOwner = (this && this.owner) || null;
            graveyardOf(owner).push(card);
            const def = getDefinition(card.id);
            if (def && typeof def.onSentToGraveyardFromDeck === 'function') {
                safeCallCardHandler(card, 'onSentToGraveyardFromDeck', () => def.onSentToGraveyardFromDeck(makeContext(owner, { card: card, milledByOwner: milledByOwner })));
            }
            notifyOwnMonsterSentToGraveyard(owner, card);
            return card;
        },

        /**
         * Fa tornare in mano al proprietario il mostro nello slot indicato
         * (owner+index) — helper condiviso al posto di uno
         * `field[index]=null; hand.push(card)` manuale ripetuto in ~6
         * punti (es. Tsukuyomi id 739, Maharaghi, Spirito della Polvere
         * Oscura, Cavaliere Missile, Malvagia Bestia Verme, Prova del
         * Viandante), stesso spirito di discardRandomFromHand qui sopra:
         * solo così un mostro appena tornato in mano può far scattare una
         * reazione generica (es. Criosfinge, id 761: "quando un mostro
         * ritorna dal Terreno alla mano del proprietario, quel
         * proprietario scarta 1 carta"). SEMPLIFICAZIONE dichiarata:
         * copre solo i punti migrati a usare QUESTO helper, non ogni
         * altro "torna in mano" di questo file (es. i 2 casi "dal
         * Cimitero alla mano", concettualmente diversi: non "dal
         * Terreno"). A differenza di onOwnMonsterDestroyed/
         * onOwnSpellTrapDestroyed (solo lo stesso lato), qui ENTRAMBI i
         * lati reagiscono in modo indipendente, stesso schema di
         * TRIGGER.ON_CARD_ACTIVATED in fireTrigger: Criosfinge non è
         * legata a chi controlla il mostro tornato in mano.
         */
        returnMonsterToHand(owner, index) {
            const field = fieldOf(owner);
            const slot = field[index];
            if (!slot) return null;
            const card = slot.card;
            field[index] = null;
            // Cerchio degli Inferi (id 498): "bandiscilo quando lascia il
            // campo" vale per QUALUNQUE modo di lasciarlo, incluso il
            // ritorno in mano — questo percorso non passa mai dal
            // Cimitero (a differenza di destroyMonster/
            // notifySacrificedForTribute qui sopra), quindi
            // redirectToBanishIfFlagged non si applica: controllo
            // dedicato, prima di spingere in mano. Scatena onBanished
            // (non onReturnedToHandSelf/onAnyMonsterReturnedToHand: la
            // carta non è mai arrivata davvero in mano).
            if (card.mustBanishOnLeavingField) {
                banishedOf(owner).push(card);
                addToLog(`⭕ ${card.name} viene bandita invece di tornare in mano (Cerchio degli Inferi)!`);
                const banishDef = getDefinition(card.id);
                if (banishDef && typeof banishDef.onBanished === 'function') {
                    safeCallCardHandler(card, 'onBanished', () => banishDef.onBanished(makeContext(owner, { card: card })));
                }
                return card;
            }
            handOf(owner).push(card);
            // def.onReturnedToHandSelf(ctx): la carta STESSA appena
            // rimandata in mano reagisce, a differenza di
            // onAnyMonsterReturnedToHand qui sotto (altre carte scoperte
            // che OSSERVANO l'evento) — es. Abbandonato (id 416).
            const selfDef = getDefinition(card.id);
            if (selfDef && typeof selfDef.onReturnedToHandSelf === 'function') {
                safeCallCardHandler(card, 'onReturnedToHandSelf', () => selfDef.onReturnedToHandSelf(makeContext(owner, { card: card, slotIndex: index })));
            }
            ['player', 'bot'].forEach((reactOwner) => {
                fieldOf(reactOwner).forEach((rslot, rindex) => {
                    if (!rslot || rslot.isFaceDown) return;
                    const rdef = getDefinition(rslot.card.id);
                    if (rdef && typeof rdef.onAnyMonsterReturnedToHand === 'function') {
                        safeCallCardHandler(rslot.card, 'onAnyMonsterReturnedToHand', () => rdef.onAnyMonsterReturnedToHand(makeContext(reactOwner, { card: rslot.card, slotIndex: rindex, returnedCard: card, returnedOwner: owner })));
                    }
                });
            });
            return card;
        },

        /**
         * Prende (o dà) il controllo TEMPORANEO di un mostro — stesso
         * meccanismo in entrambe le direzioni ("prendi il controllo di 1
         * mostro avversario" es. Cambio di Cuore, o "dai il controllo di
         * un tuo mostro all'avversario" es. Scatola Mistica): sposta lo
         * slot dal campo di `fromOwner` (indice `fromIndex`) al primo slot
         * libero del campo di `newOwner`, torna false senza fare nulla se
         * quel Terreno è pieno. Segna `slot.originalOwner` col vero
         * proprietario di sempre — SOLO se non è già impostato, così un
         * mostro preso di nuovo mentre è già sotto controllo (raro, ma
         * possibile con più carte "prendi il controllo" in gioco) ricorda
         * comunque il proprietario ORIGINALE, non quello intermedio.
         * ACTIONS.destroyMonster manda già la carta al Cimitero giusto
         * leggendo questo campo (vedi lì); il ritorno automatico a fine
         * turno è gestito da processTemporaryControlReturns qui sotto,
         * stesso spirito di banishTemporarily/processTemporaryBanishmentReturns.
         */
        takeControl(newOwner, fromOwner, fromIndex, permanent) {
            const fromField = fieldOf(fromOwner);
            const slot = fromField[fromIndex];
            if (!slot) return false;
            // Mataza il Fulminatore (id 717): "il controllo di questa
            // carta non può essere scambiato" — controllo centralizzato
            // qui, l'unico punto per cui passa ogni cambio di controllo
            // (Cambio di Cuore, Furto Improvviso, ecc.), invece che in
            // ciascuna delle carte che selezionano un bersaglio in
            // card-effects.js.
            const targetDef = getDefinition(slot.card.id);
            if (targetDef && targetDef.controlImmune) return false;
            const toField = fieldOf(newOwner);
            const toIndex = toField.findIndex((s) => s === null);
            if (toIndex === -1) return false;
            fromField[fromIndex] = null;
            if (slot.originalOwner === undefined) slot.originalOwner = fromOwner;
            toField[toIndex] = slot;
            // `permanent` (es. Controllo Mentale/Mind Control, id 130):
            // il controllo NON torna mai da solo a fine turno — a
            // differenza del caso di default (es. Cambio di Cuore),
            // niente entry in gameState.temporaryControls, quindi
            // processTemporaryControlReturns non la tocca mai più.
            if (!permanent) {
                gameState.temporaryControls = gameState.temporaryControls || [];
                gameState.temporaryControls.push({ uid: slot.card.uid, returnOwner: slot.originalOwner });
            }
            return true;
        }
    };

    /**
     * Fa tornare in campo, scoperte in Posizione di Attacco, tutte le
     * carte bandite temporaneamente (vedi ACTIONS.banishTemporarily) il
     * cui `returnTrigger` corrisponde alla fase appena raggiunta —
     * chiamata da enterStandbyPhase()/enterEndPhase() in game-flow.js,
     * esattamente come firePhaseTrigger(). Se il Terreno del proprietario
     * è pieno al momento del ritorno, la carta finisce nel Cimitero
     * invece di restare bandita per sempre (SEMPLIFICAZIONE: nella realtà
     * aspetterebbe il primo slot libero, ma qui il "ritorno mancato"
     * richiederebbe un secondo tracking persistente non ancora presente).
     */
    function processTemporaryBanishmentReturns(returnTrigger, currentTurnOwner) {
        if (!gameState.temporaryBanishments || gameState.temporaryBanishments.length === 0) return;
        const stillBanished = [];
        gameState.temporaryBanishments.forEach((entry) => {
            const shouldReturn = entry.returnTrigger === returnTrigger && (returnTrigger === 'endphase' || entry.owner === currentTurnOwner);
            if (!shouldReturn) { stillBanished.push(entry); return; }
            removeFromBanished(entry.owner, entry.card);
            // Buco Dimensionale (id 201): se questo bando aveva bloccato
            // una Zona Mostro precisa (lockZoneIndex), sbloccala ORA,
            // prima di cercare uno slot libero — quella stessa zona torna
            // ad essere la prima candidata naturale (era vuota apposta
            // per lei), ma qualunque altro slot libero va comunque bene
            // se nel frattempo non lo è più (nessuna carta reale di
            // questo dataset dipende dal tornare ESATTAMENTE in quella
            // zona, solo dal fatto che nessun'ALTRA carta l'abbia presa).
            if (entry.lockZoneIndex != null && gameState.lockedMonsterZonesFor && gameState.lockedMonsterZonesFor[entry.owner]) {
                gameState.lockedMonsterZonesFor[entry.owner].delete(entry.lockZoneIndex);
            }
            const slotIndex = fieldOf(entry.owner).findIndex((slot) => slot === null);
            if (slotIndex === -1) {
                graveyardOf(entry.owner).push(entry.card);
                addToLog(`⚠️ Il Terreno è pieno: ${entry.card.name} torna al Cimitero invece che in campo dal bando temporaneo.`);
                return;
            }
            fieldOf(entry.owner)[slotIndex] = { card: entry.card, position: 'attack', isFaceDown: false, hasAttacked: false, canChangePosition: false };
            addToLog(`🌀 ${entry.card.name} torna in campo dal bando temporaneo!`);
        });
        gameState.temporaryBanishments = stillBanished;
    }

    /**
     * Fa tornare in mano le carte bandite con ACTIONS.banishFromHandWithCountdown
     * (es. Spada della Forza di Luce, id 348) il cui conteggio di Standby
     * Phase di `currentTurnOwner` è arrivato a zero — chiamata da
     * enterStandbyPhase() in game-flow.js, PRIMA di firePhaseTrigger
     * (così una carta appena tornata in mano non viene comunque
     * considerata "ancora bandita" da nessun altro controllo nello
     * stesso render). Se il proprietario ha già raggiunto il turno
     * giusto, decrementa; il ritorno vero avviene solo quando il
     * conteggio tocca lo zero, non prima.
     */
    function processDelayedHandReturns(currentTurnOwner) {
        if (!gameState.delayedHandReturns || gameState.delayedHandReturns.length === 0) return;
        const stillWaiting = [];
        gameState.delayedHandReturns.forEach((entry) => {
            if (entry.owner !== currentTurnOwner) { stillWaiting.push(entry); return; }
            entry.standbysRemaining -= 1;
            if (entry.standbysRemaining > 0) { stillWaiting.push(entry); return; }
            removeFromBanished(entry.owner, entry.card);
            handOf(entry.owner).push(entry.card);
            addToLog(`🗡️ ${entry.card.name} torna in mano dal bando di Spada della Forza di Luce!`);
        });
        gameState.delayedHandReturns = stillWaiting;
    }

    /**
     * Fa rinascere dal Cimitero al Terreno le carte programmate con
     * ACTIONS.reviveFromGraveyardWithCountdown (es. Signore dei Vampiri,
     * id 658) il cui conteggio di Standby Phase di `currentTurnOwner` è
     * arrivato a zero — stesso schema di processDelayedHandReturns qui
     * sopra, ma verso il Terreno (scoperta in Posizione di Attacco,
     * niente ON_SPECIAL_SUMMON qui: stesso motivo/stessa scelta di
     * processTemporaryBanishmentReturns, un batch di fine-fase non un
     * singolo effetto-carta). Se il Terreno è pieno, resta nel Cimitero.
     */
    function processDelayedGraveyardRevivals(currentTurnOwner) {
        if (!gameState.delayedGraveyardRevivals || gameState.delayedGraveyardRevivals.length === 0) return;
        const stillWaiting = [];
        gameState.delayedGraveyardRevivals.forEach((entry) => {
            if (entry.owner !== currentTurnOwner) { stillWaiting.push(entry); return; }
            entry.standbysRemaining -= 1;
            if (entry.standbysRemaining > 0) { stillWaiting.push(entry); return; }
            const slotIndex = ACTIONS.findEmptyMonsterSlot(entry.owner);
            if (slotIndex === -1) {
                addToLog(`⚠️ Il Terreno è pieno: ${entry.card.name} resta nel Cimitero invece di rinascere.`);
                return;
            }
            fieldOf(entry.owner)[slotIndex] = { card: entry.card, position: 'attack', isFaceDown: false, hasAttacked: false, canChangePosition: false };
            addToLog(`🧟 ${entry.card.name} rinasce dal Cimitero!`);
        });
        gameState.delayedGraveyardRevivals = stillWaiting;
    }

    /**
     * Fa detonare Sfera Esplosiva/Blast Sphere (id 120) alla Standby Phase
     * di `currentTurnOwner` se corrisponde a `entry.attackerOwner` — voci
     * accodate da actions.js/resolveBattleDamage quando questa carta,
     * coperta in Posizione di Difesa, viene attaccata (invece del calcolo
     * danni normale: "si equipaggia al mostro attaccante, senza calcolo
     * dei danni"). SEMPLIFICAZIONE dichiarata: invece di modellarla
     * letteralmente come Carta Equipaggiamento nella zona Magia/Trappola
     * dell'attaccante (mai fatto in questo motore per una carta Mostro),
     * resta "in sospeso" (fuori da qualunque zona) fino alla detonazione —
     * stesso risultato funzionale, stesso schema "conteggio di Standby
     * Phase" di processDelayedGraveyardRevivals qui sopra. Se il mostro
     * equipaggiato non è più sul Terreno quando scatta (distrutto/tornato
     * in mano/bandito nel frattempo), niente distruzione né danno — Sfera
     * Esplosiva va comunque al Cimitero del suo proprietario, come una
     * vera Carta Equipaggiamento il cui bersaglio è sparito.
     */
    function processPendingBlastSphereDetonations(currentTurnOwner) {
        if (!gameState.pendingBlastSphereDetonations || gameState.pendingBlastSphereDetonations.length === 0) return;
        const stillWaiting = [];
        gameState.pendingBlastSphereDetonations.forEach((entry) => {
            if (entry.attackerOwner !== currentTurnOwner) { stillWaiting.push(entry); return; }
            entry.standbysRemaining -= 1;
            if (entry.standbysRemaining > 0) { stillWaiting.push(entry); return; }
            const attackerField = fieldOf(entry.attackerOwner);
            const attackerIndex = attackerField.findIndex((slot) => slot && slot.card.uid === entry.attackerUid);
            if (attackerIndex !== -1) {
                const attackerCard = attackerField[attackerIndex].card;
                attackerField[attackerIndex] = null;
                graveyardOf(entry.attackerOwner).push(attackerCard);
                ACTIONS.dealDamage(entry.attackerOwner, attackerCard.attack || 0);
                addToLog(`💥 ${entry.sferaCard.name} detona: distrugge ${attackerCard.name} e infligge ${attackerCard.attack || 0} danni!`);
            } else {
                addToLog(`💥 ${entry.sferaCard.name} si dissolve: il mostro equipaggiato non è più sul Terreno.`);
            }
            graveyardOf(entry.sferaOwner).push(entry.sferaCard);
        });
        gameState.pendingBlastSphereDetonations = stillWaiting;
    }

    /**
     * Autodistrugge una Magia/Trappola Continua alla N-esima End Phase
     * DELL'AVVERSARIO del suo controllore, contata da quando è stata
     * accodata (es. Grande Pillola Evolutiva, id 810: "distruggila
     * durante la 3ª End Phase del tuo avversario" — endsRemaining=3).
     * Diverso dai conteggi "N Standby/End Phase" già esistenti
     * (processDelayedGraveyardRevivals, processNoDamageExpiry): quelli
     * contano le fasi DI UN proprietario specifico o di ENTRAMBI, questo
     * conta specificamente quelle dell'AVVERSARIO del controllore della
     * carta — decrementato solo quando endPhaseOwner (chi sta vivendo
     * QUESTA End Phase, gameState.currentPlayer) è l'avversario di
     * entry.owner. Cerca la carta sia nella zona Magia/Trappola sia nella
     * Magia Terreno (Grande Pillola Evolutiva potrebbe in teoria stare in
     * entrambe le zone in questo motore, a seconda di come future carte
     * simili venissero registrate).
     */
    function processSelfDestructAtOpponentEndPhase(endPhaseOwner) {
        if (!gameState.pendingSelfDestructAtOpponentEndPhase || gameState.pendingSelfDestructAtOpponentEndPhase.length === 0) return;
        const stillWaiting = [];
        gameState.pendingSelfDestructAtOpponentEndPhase.forEach((entry) => {
            if (entry.owner === endPhaseOwner) { stillWaiting.push(entry); return; }
            entry.endsRemaining -= 1;
            if (entry.endsRemaining > 0) { stillWaiting.push(entry); return; }
            const stField = stFieldOf(entry.owner);
            const index = stField.findIndex((slot) => slot && slot.card.uid === entry.cardUid);
            if (index !== -1) {
                const card = stField[index].card;
                stField[index] = null;
                graveyardOf(entry.owner).push(card);
                addToLog(`⏳ ${card.name} si autodistrugge alla 3ª End Phase dell'avversario!`);
            }
        });
        gameState.pendingSelfDestructAtOpponentEndPhase = stillWaiting;
    }

    /**
     * Cura Life Points per Kiseitai (id 328) equipaggiata a un mostro
     * attaccante (vedi il caso speciale in resolveBattleDamage,
     * actions.js) — pari a metà dell'ATK base del mostro equipaggiato,
     * ad OGNI Standby Phase di chi lo controlla (gameState.kiseitaiEquips,
     * PERSISTENTE: a differenza di processPendingBlastSphereDetonations
     * qui sopra, nessun conto alla rovescia, si ripete ogni volta finché
     * il mostro equipaggiato resta sul Terreno). Se il mostro equipaggiato
     * non è più sul Terreno, Kiseitai va al Cimitero del suo proprietario
     * (come una vera Carta Equipaggiamento il cui bersaglio è sparito) e
     * smette di curare.
     */
    function processKiseitaiLifeGain(currentTurnOwner) {
        if (!gameState.kiseitaiEquips || gameState.kiseitaiEquips.length === 0) return;
        const stillEquipped = [];
        gameState.kiseitaiEquips.forEach((entry) => {
            if (entry.attackerOwner !== currentTurnOwner) { stillEquipped.push(entry); return; }
            const attackerField = fieldOf(entry.attackerOwner);
            const attackerSlot = attackerField.find((slot) => slot && slot.card.uid === entry.attackerUid);
            if (!attackerSlot) {
                graveyardOf(entry.kiseitaiOwner).push(entry.kiseitaiCard);
                addToLog(`🦠 ${entry.kiseitaiCard.name} si dissolve: il mostro equipaggiato non è più sul Terreno.`);
                return;
            }
            const heal = Math.floor((attackerSlot.card.attack || 0) / 2);
            ACTIONS.dealDamage(entry.kiseitaiOwner, -heal);
            addToLog(`🦠 ${entry.kiseitaiCard.name} cura ${heal} Life Points!`);
            stillEquipped.push(entry);
        });
        gameState.kiseitaiEquips = stillEquipped;
    }

    /**
     * Decrementa il conteggio "N End Phase" di Virus Distruggi-Carte (id
     * 165) — chiamata da enterEndPhase() (game-flow.js) ad OGNI End
     * Phase, di ENTRAMBI i proprietari (non solo di uno specifico: "fino
     * alla fine del turno successivo" conta il primo turno che arriva,
     * chiunque lo stia giocando, non necessariamente lo stesso
     * proprietario). SEMPLIFICAZIONE dichiarata: endsRemaining parte da
     * 2 (la End Phase di QUESTO turno, se non ancora passata, più quella
     * del turno successivo) — un'approssimazione ragionevole del vero
     * "fino alla fine del turno successivo a quando questo effetto si
     * risolve", non verificata a fondo contro ogni caso limite di
     * timing reale.
     */
    function processNoDamageExpiry() {
        if (!gameState.pendingNoDamageExpiry || gameState.pendingNoDamageExpiry.length === 0) return;
        const stillPending = [];
        gameState.pendingNoDamageExpiry.forEach((entry) => {
            entry.endsRemaining -= 1;
            if (entry.endsRemaining > 0) { stillPending.push(entry); return; }
            addToLog(`☠️ Virus Distruggi-Carte smette di fare effetto: ${entry.owner === 'player' ? 'puoi' : 'il bot può'} di nuovo subire danni.`);
        });
        gameState.pendingNoDamageExpiry = stillPending;
    }

    /**
     * Restituisce ad ogni vero proprietario (`returnOwner`) i mostri presi
     * temporaneamente sotto controllo (vedi ACTIONS.takeControl) — chiamata
     * da enterEndPhase() in game-flow.js, SEMPRE (non solo per il
     * giocatore di turno): stessa scelta già fatta per
     * clearTemporaryAtkDefBonus(), dato che "fino alla tua End Phase" è
     * sempre quella dello stesso turno in cui il controllo è stato preso.
     * Se il Terreno del proprietario originale è pieno al momento del
     * ritorno, la carta finisce nel suo Cimitero invece di restare
     * bloccata (stessa semplificazione di processTemporaryBanishmentReturns
     * qui sopra). Se il mostro è già stato distrutto nel frattempo (non
     * più trovato su nessun campo), la voce si rimuove senza fare nulla:
     * ACTIONS.destroyMonster l'ha già mandato al Cimitero giusto da sola.
     */
    function processTemporaryControlReturns() {
        if (!gameState.temporaryControls || gameState.temporaryControls.length === 0) return;
        gameState.temporaryControls.forEach((entry) => {
            ['player', 'bot'].forEach((currentOwner) => {
                const field = fieldOf(currentOwner);
                const index = field.findIndex((s) => s && s.card.uid === entry.uid);
                if (index === -1) return;
                const slot = field[index];
                field[index] = null;
                delete slot.originalOwner;
                const freeIndex = fieldOf(entry.returnOwner).findIndex((s) => s === null);
                if (freeIndex === -1) {
                    graveyardOf(entry.returnOwner).push(slot.card);
                    addToLog(`⚠️ Il Terreno è pieno: ${slot.card.name} torna al Cimitero invece che al proprio controllore originale.`);
                    return;
                }
                fieldOf(entry.returnOwner)[freeIndex] = slot;
                addToLog(`🔄 ${slot.card.name} torna sotto il controllo del suo proprietario originale.`);
            });
        });
        gameState.temporaryControls = [];
    }

    // ============================================================
    // Special Summon dalla mano su iniziativa del giocatore (es.
    // Gilasaurus, Il Demone Megacyber, i mostri Toon che dipendono da
    // "Mondo dei Toon"): diverso dall'Evocazione Normale/Tributo E da un
    // Special Summon scatenato da un'ALTRA carta (es. Rinascita del
    // Mostro) — qui è il giocatore stesso, cliccando un mostro in mano,
    // a decidere di farlo entrare in campo tramite il proprio effetto.
    // Un'eventuale conseguenza "se Special Summonata così" va scritta
    // come onSpecialSummon(ctx) sulla carta stessa: ACTIONS.specialSummon
    // qui sotto scatena comunque TRIGGER.ON_SPECIAL_SUMMON come ogni
    // altro Special Summon, quindi quell'aggancio esistente basta, senza
    // bisogno di un evento dedicato.
    // ============================================================

    /** Vero se card.id nella mano di `owner` (indice `handIndex`) ha un canSpecialSummonFromHand(ctx) e quella condizione è vera ORA. */
    function canSpecialSummonFromHand(owner, handIndex) {
        const card = handOf(owner)[handIndex];
        if (!card) return false;
        const def = getDefinition(card.id);
        if (!def || typeof def.canSpecialSummonFromHand !== 'function') return false;
        return !!def.canSpecialSummonFromHand(makeContext(owner, { card: card, handIndex: handIndex }));
    }

    /**
     * Prova a Special Summonare dalla mano la carta all'indice `handIndex`.
     * Se la carta definisce anche `paySpecialSummonCost(ctx)` (es. Teschio
     * Evocato Toon, che richiede di sacrificare 1 mostro), quella funzione
     * va chiamata PRIMA di togliere la carta dalla mano, e se ritorna
     * false l'intera Special Summon viene annullata (costo non pagabile).
     */
    function trySpecialSummonFromHand(owner, handIndex) {
        if (!canSpecialSummonFromHand(owner, handIndex)) return false;
        const hand = handOf(owner);
        const card = hand[handIndex];
        const def = getDefinition(card.id);
        const slotIndex = fieldOf(owner).findIndex((slot) => slot === null);
        if (slotIndex === -1) {
            addToLog('❌ Il Terreno è pieno: impossibile Special Summonare.');
            return false;
        }
        if (typeof def.paySpecialSummonCost === 'function') {
            const costPaid = def.paySpecialSummonCost(makeContext(owner, { card: card, handIndex: handIndex }));
            if (!costPaid) return false;
        }
        hand.splice(handIndex, 1);
        ACTIONS.specialSummon(owner, card, slotIndex, 'attack');
        addToLog(`✨ ${owner === 'player' ? 'Hai' : 'Il bot ha'} Special Summonato ${card.name} dalla mano!`);
        return true;
    }

    // ============================================================
    // Special Summon dall'EXTRA DECK bandendo materiali (es. Cannone
    // Drago XY/XYZ) — diverso dall'Evocazione Fusione vera e propria
    // (ACTIONS.fusionSummon/getFusableExtraDeckMonsters più sopra): qui
    // non c'è nessuna Magia "Fusione" di mezzo, il mostro Extra Deck ha
    // scritto sulla PROPRIA carta la condizione "bandisci questi materiali
    // che controlli", quindi il giocatore lo attiva da sé (click sulla
    // zona Fusion, vedi createSlotElement in game-flow.js) invece che
    // attivando una carta. I materiali vanno presi SOLO dal Terreno (mai
    // dalla mano — è così anche sulla carta vera) scoperti, e bandirli
    // qui significa "sparire dal Terreno senza andare al Cimitero, ma
    // finire nella zona Bandite" (ACTIONS.banish, vedi banishFusionSummon
    // qui sotto).
    // Carte che la usano dichiarano `banishFusionMaterials: [idA, idB]`
    // nella propria registrazione in card-effects.js, stesso spirito di
    // `fusionMaterials` ma per questo percorso alternativo.
    // ============================================================

    /**
     * Cerca tra i mostri dell'Extra Deck di `owner` quelli con
     * `banishFusionMaterials` per cui TUTTI i materiali richiesti sono
     * scoperti sul Terreno di `owner` ORA. Torna un array di
     * { extraDeckIndex, card, materialFieldIndices }, pronto per
     * banishFusionSummon qui sotto.
     */
    function getBanishFusableExtraDeckMonsters(owner) {
        const extraDeck = owner === 'player' ? gameState.playerExtraDeck : gameState.botExtraDeck;
        if (!extraDeck || extraDeck.length === 0) return [];
        const field = fieldOf(owner);
        const results = [];
        extraDeck.forEach((extraCard, extraDeckIndex) => {
            const def = getDefinition(extraCard.id);
            if (!def || !Array.isArray(def.banishFusionMaterials) || def.banishFusionMaterials.length === 0) return;
            const usedFieldIdx = new Set();
            const materialFieldIndices = [];
            const ok = def.banishFusionMaterials.every((materialId) => {
                // Uovo Giurassico Miracoloso (id 808): "non può essere
                // bandita finché scoperta sul Terreno" — se il materiale
                // richiesto è proprio lei, non è un materiale valido per
                // QUESTA fusione (che lo bandirebbe), esattamente come se
                // non fosse sul Terreno affatto.
                const fieldIdx = field.findIndex((s, i) => s && !s.isFaceDown && s.card.id === materialId && !usedFieldIdx.has(i) && !getDefinition(s.card.id)?.cannotBeBanishedWhileOnField);
                if (fieldIdx !== -1) {
                    usedFieldIdx.add(fieldIdx);
                    materialFieldIndices.push(fieldIdx);
                    return true;
                }
                return false;
            });
            if (ok) results.push({ extraDeckIndex, card: extraCard, materialFieldIndices });
        });
        return results;
    }

    /**
     * Esegue davvero lo Special Summon dall'Extra Deck bandendo i
     * materiali agli indici Terreno indicati (da getBanishFusableExtraDeckMonsters
     * qui sopra). Torna false senza fare nulla se il Terreno è pieno o
     * l'indice Extra Deck non è più valido.
     */
    function banishFusionSummon(owner, extraDeckIndex, materialFieldIndices) {
        const extraDeck = owner === 'player' ? gameState.playerExtraDeck : gameState.botExtraDeck;
        const fusionCard = extraDeck && extraDeck[extraDeckIndex];
        if (!fusionCard) return false;
        const slotIndex = ACTIONS.findEmptyMonsterSlot(owner);
        if (slotIndex === -1) {
            addToLog('❌ Il Terreno è pieno: impossibile Special Summonare.');
            return false;
        }
        const field = fieldOf(owner);
        (materialFieldIndices || []).forEach((idx) => {
            const materialCard = field[idx] && field[idx].card;
            field[idx] = null;
            if (materialCard) ACTIONS.banish(owner, materialCard);
        });
        extraDeck.splice(extraDeckIndex, 1);
        ACTIONS.specialSummon(owner, fusionCard, slotIndex, 'attack');
        addToLog(`🌀 ${owner === 'player' ? 'Hai' : 'Il bot ha'} Special Summonato ${fusionCard.name} bandendo i materiali!`);
        return true;
    }

    // ============================================================
    // fireTrigger: il cuore delle "finestre di risposta" spiegate sopra.
    // Ogni trigger ha due parti POSSIBILI, non sempre entrambe presenti:
    //   - un "auto-effetto" sulla carta stessa (es. un mostro Flip che
    //     si attiva quando VIENE girato scoperto lui) — sincrono, gestito
    //     dal proprietario della carta, handler `onSummon`/`onFlip`;
    //   - una "finestra di risposta" per l'AVVERSARIO, che può reagire
    //     con una Trappola Set o un effetto da mano (es. Buco Trappola
    //     scatta quando IO evoco, Cilindro Magico quando IO attacco) —
    //     può essere ASINCRONA (il giocatore umano deve rispondere a un
    //     prompt), quindi ogni chiamata a fireTrigger accetta un terzo
    //     parametro opzionale `onDone`, richiamato quando la finestra si
    //     è chiusa (con o senza risposta), così chi ha lanciato il
    //     trigger sa quando è sicuro proseguire (vedi resolveAttack in
    //     actions.js, che aspetta onDone prima di calcolare i danni).
    // ============================================================
    function fireTrigger(name, ctx, onDone) {
        const finish = typeof onDone === 'function' ? onDone : function () {};

        if (name === TRIGGER.ON_FLIP) {
            const def = getDefinition(ctx.card.id);
            // Tempesta di Piume delle Arpie (id 292): nega anche l'effetto
            // Flip, come l'Ignition qui sopra in canActivate.
            if (def && typeof def.onFlip === 'function' && !isMonsterCardEffectsNegated(ctx.owner, ctx.card.uid)) {
                if (window.FX) FX.playCardActivateCenterScreen(ctx.card);
                safeCallCardHandler(ctx.card, 'onFlip', () => def.onFlip(ctx));
            }
            reactToAnyNormalOrFlipSummon(ctx.card, 'flip');
            // Finestra di risposta per l'avversario quando un mostro viene
            // girato scoperto (Flip Summon) — es. Buco Trappola (id 40),
            // che nella regola vera scatta anche su un Flip Summon, non
            // solo su un'Evocazione Normale. Stesso meccanismo generico di
            // onOpponentSummon già usato per ON_NORMAL_SUMMON/ON_SPECIAL_SUMMON
            // più sotto — qui riadattato coi campi che quella finestra si
            // aspetta (summonedCard/summonedSlotIndex/summonedPosition).
            openTriggerWindow('onOpponentSummon', makeContext(ctx.owner, {
                summonedCard: ctx.card,
                summonedSlotIndex: ctx.slotIndex,
                summonedPosition: 'attack',
                summonedVia: 'flip'
            }), finish);
            return;
        }

        if (name === TRIGGER.ON_NORMAL_SUMMON || name === TRIGGER.ON_SPECIAL_SUMMON) {
            // ctx.summonedCard/summonedSlotIndex/summonedPosition descrivono
            // il mostro appena Evocato (NON "ctx.card": quel nome è
            // riservato, dentro openTriggerWindow, alla carta di chi RISPONDE
            // — es. Buco Trappola — per evitare l'ambiguità tra "la carta
            // evocata" e "la carta con cui rispondo all'evocazione").
            // ctx.summonedVia ('normal'|'special') distingue le due, per
            // carte che nella regola vera reagiscono solo a UNA delle due
            // (es. Buco Trappola, id 40: solo Evocazione Normale o Flip,
            // MAI Special Summon).
            ctx.summonedVia = name === TRIGGER.ON_SPECIAL_SUMMON ? 'special' : 'normal';
            if (name === TRIGGER.ON_NORMAL_SUMMON) reactToAnyNormalOrFlipSummon(ctx.summonedCard, 'normal');
            if (name === TRIGGER.ON_SPECIAL_SUMMON) reactToAnySpecialSummon(ctx.summonedCard);
            // Sfide (js/data/challenges-db.js, tipo 'summonMonster'): solo
            // Evocazioni del GIOCATORE UMANO (mai del bot), Normali o
            // Speciali sommate insieme, e mai un Token (id -1, creato da
            // ACTIONS.createTokens — non è "evocare una carta specifica").
            if (ctx.owner === 'player' && ctx.summonedCard && ctx.summonedCard.id !== -1 && window.ChallengeTracker) {
                ChallengeTracker.recordProgress('summonMonster', { cardId: ctx.summonedCard.id });
            }
            // Tribù dei D. (id 637): "Tutti i mostri sul tuo Terreno sono
            // considerati Tipo Drago fino alla End Phase" — un'Evocazione
            // (Normale o Special) di `ctx.owner` DOPO l'attivazione della
            // Trappola deve ricevere anche lei l'override, non solo lo
            // snapshot dei mostri già scoperti al momento dell'attivazione
            // (ctx.overrideRaceUntilEndOfTurn in card-effects.js). La
            // Trappola stessa è già in Cimitero quando questo scatta (non
            // riceve più trigger), quindi il floodgate vive qui, nel punto
            // condiviso da OGNI Evocazione — gameState.raceOverrideFloodgateFor,
            // impostato da CardEffects.register(637).activate() e ripulito
            // in enterEndPhase() (game-flow.js) insieme al resto.
            if (gameState.raceOverrideFloodgateFor && gameState.raceOverrideFloodgateFor[ctx.owner]) {
                ACTIONS.overrideRaceUntilEndOfTurn(ctx.summonedCard, gameState.raceOverrideFloodgateFor[ctx.owner]);
            }
            //
            // 1) Auto-effetto della carta evocata (nessuna carta del set
            //    attuale lo usa ancora, ma il punto d'aggancio è pronto
            //    per future carte "quando questa carta viene Evocata...").
            const def = getDefinition(ctx.summonedCard.id);
            const selfHandler = name === TRIGGER.ON_SPECIAL_SUMMON && def && def.onSpecialSummon ? def.onSpecialSummon : (def && def.onSummon);
            // Tempesta di Piume delle Arpie (id 292): nega anche l'auto-
            // effetto "quando questa carta viene Evocata".
            if (typeof selfHandler === 'function' && !isMonsterCardEffectsNegated(ctx.owner, ctx.summonedCard.uid)) {
                if (window.FX) FX.playCardActivateCenterScreen(ctx.summonedCard);
                safeCallCardHandler(ctx.summonedCard, name === TRIGGER.ON_SPECIAL_SUMMON ? 'onSpecialSummon' : 'onSummon', () => selfHandler(ctx));
            }

            // 1.5) Reazione delle CARTE SCOPERTE sul Terreno del
            //      proprietario del mostro appena Special Summonato dal
            //      SUO Cimitero (es. Carta del Ritorno Sicuro, id 141:
            //      "quando un mostro viene Special Summonato dal tuo
            //      Cimitero, puoi pescare 1 carta") — stesso spirito/
            //      stessa SEMPLIFICAZIONE (un solo rispondente automatico,
            //      niente vera finestra di priorità) di onOwnMonsterDestroyed
            //      più sotto in questa funzione, ma per questo evento.
            if (name === TRIGGER.ON_SPECIAL_SUMMON && ctx.summonedFromZone === 'graveyard') {
                const reactOwner = ctx.owner;
                let reactCard = null;
                let reactDef = null;
                stFieldOf(reactOwner).forEach((slot) => {
                    if (reactCard || !slot || slot.isFaceDown) return;
                    const rdef = getDefinition(slot.card.id);
                    if (rdef && typeof rdef.onOwnSpecialSummonFromGraveyard === 'function') {
                        reactCard = slot.card;
                        reactDef = rdef;
                    }
                });
                if (reactCard) {
                    safeCallCardHandler(reactCard, 'onOwnSpecialSummonFromGraveyard', () => reactDef.onOwnSpecialSummonFromGraveyard(makeContext(reactOwner, { summonedCard: ctx.summonedCard })));
                }
            }

            // 1.6) Reazione di una Magia/Trappola Continua (zona 'st') O
            //      della Magia Terreno del proprietario del mostro appena
            //      Evocato — Normale O Special, da QUALSIASI zona (a
            //      differenza del punto 1.5 qui sopra, solo dal Cimitero)
            //      — es. Terreno di Caccia delle Arpie (id 788, Magia
            //      Terreno): "se una Lady Arpia viene Evocata: distruggi 1
            //      Magia/Trappola sul Terreno". Stessa SEMPLIFICAZIONE di
            //      onOwnMonsterDestroyed più sotto in questa funzione: un
            //      solo rispondente automatico, niente vera finestra di
            //      priorità (zona 'st' controllata per prima, poi la
            //      Magia Terreno solo se nessuna carta 'st' risponde).
            {
                const summonReactOwner = ctx.owner;
                let summonReactCard = null;
                let summonReactDef = null;
                stFieldOf(summonReactOwner).forEach((slot) => {
                    if (summonReactCard || !slot || slot.isFaceDown) return;
                    const rdef = getDefinition(slot.card.id);
                    if (rdef && typeof rdef.onOwnMonsterSummoned === 'function') {
                        summonReactCard = slot.card;
                        summonReactDef = rdef;
                    }
                });
                if (!summonReactCard) {
                    const summonReactFs = fieldSpellOf(summonReactOwner);
                    if (summonReactFs && !summonReactFs.isFaceDown) {
                        const fsDef = getDefinition(summonReactFs.card.id);
                        if (fsDef && typeof fsDef.onOwnMonsterSummoned === 'function') {
                            summonReactCard = summonReactFs.card;
                            summonReactDef = fsDef;
                        }
                    }
                }
                if (summonReactCard) {
                    safeCallCardHandler(summonReactCard, 'onOwnMonsterSummoned', () => summonReactDef.onOwnMonsterSummoned(makeContext(summonReactOwner, { summonedCard: ctx.summonedCard, summonedVia: ctx.summonedVia })));
                }
            }

            // 1.7) Reazione MANDATORIA (non una Chain/scelta come il punto 2
            //      qui sotto) di un mostro scoperto sul campo
            //      dell'AVVERSARIO di chi ha appena Evocato — es. Slifer
            //      il Drago del Cielo (id 31): "se un mostro viene
            //      Evocato scoperto in Attacco sul campo dell'avversario,
            //      cambialo in Difesa; se viene Evocato in Difesa,
            //      distruggilo" — succede sempre, non è una risposta
            //      opzionale come Buco Trappola. Un solo rispondente
            //      automatico (il primo eleggibile), stesso schema di
            //      onEnemyMonsterDestroyed.
            {
                const enemyOfSummoner = opponentOf(ctx.owner);
                let enemyReactCard = null;
                let enemyReactDef = null;
                fieldOf(enemyOfSummoner).forEach((slot) => {
                    if (enemyReactCard || !slot || slot.isFaceDown) return;
                    const rdef = getDefinition(slot.card.id);
                    if (rdef && typeof rdef.onEnemyMonsterSummoned === 'function') {
                        enemyReactCard = slot.card;
                        enemyReactDef = rdef;
                    }
                });
                if (enemyReactCard) {
                    safeCallCardHandler(enemyReactCard, 'onEnemyMonsterSummoned', () => enemyReactDef.onEnemyMonsterSummoned(makeContext(enemyOfSummoner, {
                        summonedCard: ctx.summonedCard,
                        summonedOwner: ctx.owner,
                        summonedSlotIndex: ctx.summonedSlotIndex,
                        summonedPosition: ctx.summonedPosition,
                        summonedVia: ctx.summonedVia
                    })));
                }
            }

            // 2) Finestra di risposta per l'avversario (es. Buco Trappola),
            //    ora una vera Chain multi-round — vedi openTriggerWindow.
            //    ECCEZIONE: i tre Dei Egizi (Obelisk id 30, Slifer id 31, Ra
            //    id 472) leggono "quando questa carta viene Evocata
            //    Normalmente, non possono essere attivate carte o effetti" —
            //    def.blocksActivationsOnOwnNormalSummon, controllato SOLO
            //    sulla propria Evocazione Normale (mai su quella Special, né
            //    su quella di un'ALTRA carta): in quel caso preciso niente
            //    finestra di risposta, la reazione mandatoria del punto 1.7
            //    qui sopra (es. l'effetto di Slifer sui mostri Evocati
            //    dall'avversario) resta comunque intatta perché non passa
            //    da qui.
            const summonedDef = getDefinition(ctx.summonedCard.id);
            if (ctx.summonedVia === 'normal' && summonedDef && summonedDef.blocksActivationsOnOwnNormalSummon) {
                finish();
                return;
            }
            openTriggerWindow('onOpponentSummon', ctx, finish);
            return;
        }

        if (name === TRIGGER.ON_ATTACK_DECLARE) {
            // 1) Auto-effetto del mostro che dichiara l'attacco (es. Jirai
            //    Gumo, id 316: "quando questa carta dichiara un attacco:
            //    lancia una moneta...") — stesso spirito del punto 1) per
            //    ON_NORMAL_SUMMON/ON_SPECIAL_SUMMON più sopra, ma per
            //    l'ATTACCO. Nome handler diverso da 'onAttackDeclare'
            //    (quello resta riservato al DIFENSORE che risponde, es.
            //    Suijin/Kazejin/Cilindro Magico) per evitare l'ambiguità.
            const attackerSlot = fieldOf(ctx.owner)[ctx.attackerIndex];
            const attackerDef = attackerSlot && getDefinition(attackerSlot.card.id);
            // Tempesta di Piume delle Arpie (id 292): nega anche l'auto-
            // effetto "quando questa carta dichiara un attacco".
            if (attackerDef && typeof attackerDef.onOwnAttackDeclare === 'function' && !isMonsterCardEffectsNegated(ctx.owner, attackerSlot.card.uid)) {
                safeCallCardHandler(attackerSlot.card, 'onOwnAttackDeclare', () => attackerDef.onOwnAttackDeclare(ctx));
            }
            // 2) Finestra di risposta per il difensore.
            openTriggerWindow('onAttackDeclare', ctx, finish);
            return;
        }

        if (name === TRIGGER.ON_DESTROY) {
            // "Quando questa carta viene distrutta [in battaglia] e mandata
            // al Cimitero: [effetto]" — auto-effetto della carta appena
            // distrutta (ctx.card).
            const def = getDefinition(ctx.card.id);
            // Tempesta di Piume delle Arpie (id 292): nega anche l'auto-
            // effetto "quando questa carta viene distrutta".
            if (def && typeof def.onDestroy === 'function' && !isMonsterCardEffectsNegated(ctx.owner, ctx.card.uid)) {
                if (window.FX) FX.playCardActivateCenterScreen(ctx.card);
                safeCallCardHandler(ctx.card, 'onDestroy', () => def.onDestroy(ctx));
            }
            // "Quando un mostro viene mandato dal Terreno al TUO Cimitero"
            // (es. Michizure, id 380) — a differenza di def.onDestroy qui
            // sopra (solo la carta distrutta reagisce a se stessa), qui è
            // una Trappola Set del PROPRIETARIO del mostro appena distrutto
            // a reagire. SEMPLIFICAZIONE: un solo rispondente automatico
            // (il primo eleggibile), niente vera finestra di priorità —
            // nessuna carta di questo set ha bisogno di incatenarne più di una.
            const ownerOfDestroyed = ctx.owner;
            const reactCandidates = [];
            stFieldOf(ownerOfDestroyed).forEach((slot, index) => {
                if (!slot) return;
                if (slot.card.type === 'trap' && slot.setOnTurn === gameState.turn) return;
                if (slot.card.type === 'trap' && areTrapsNegatedFor(ownerOfDestroyed)) return;
                const rdef = getDefinition(slot.card.id);
                if (rdef && typeof rdef.onOwnMonsterDestroyed === 'function') {
                    reactCandidates.push({ zone: 'st', index: index, card: slot.card, def: rdef });
                }
            });
            const reactCtx = (choice) => makeContext(ownerOfDestroyed, { card: choice.card, zone: choice.zone, index: choice.index, destroyedCard: ctx.card });
            const eligible = reactCandidates.filter((c) => !c.def.canActivate || c.def.canActivate(reactCtx(c)));
            if (eligible.length > 0) {
                const choice = eligible[0];
                // Una Trappola Continua reattiva (nessuna nel dataset
                // attuale usa onOwnMonsterDestroyed così, ma il motore lo
                // supporta comunque) resta scoperta sul Terreno invece di
                // consumarsi — stessa distinzione già fatta in
                // activateCard() per le altre attivazioni continue.
                if (choice.def.continuous) {
                    stFieldOf(ownerOfDestroyed)[choice.index].isFaceDown = false;
                } else {
                    stFieldOf(ownerOfDestroyed)[choice.index] = null;
                    graveyardOf(ownerOfDestroyed).push(choice.card);
                }
                addToLog(`💀 ${ownerOfDestroyed === 'player' ? 'Hai' : 'Il bot ha'} attivato ${choice.card.name}!`);
                if (window.FX) FX.playCardActivateCenterScreen(choice.card);
                safeCallCardHandler(choice.card, 'onOwnMonsterDestroyed', () => choice.def.onOwnMonsterDestroyed(reactCtx(choice)));
            }
            // "Ogni volta che un TUO mostro (anche di un'altra carta) viene
            // mandato al Cimitero: [reagisce]" (es. Uovo Giurassico
            // Miracoloso, id 808) — a differenza di onOwnMonsterDestroyed
            // qui sopra (Trappola Set, richiede una scelta/consumo via
            // Chain), questo è un broadcast INCONDIZIONATO (nessuna scelta,
            // nessun consumo), vedi notifyOwnMonsterSentToGraveyard più
            // sopra (condivisa anche da Sacrificio/scarto, non solo
            // distruzione). ctx.destroyedByOpponentCard (null se non è
            // stata una distruzione in battaglia) passato come terzo
            // argomento, così i singoli def.onOwnMonsterDestroyedPassive
            // possono distinguere "in battaglia" da "per effetto Carta".
            notifyOwnMonsterSentToGraveyard(ownerOfDestroyed, ctx.card, ctx.destroyedByOpponentCard);
            // "Quando un mostro viene mandato al Cimitero DELL'AVVERSARIO"
            // (es. Venditore di Bare, id 158) — stesso identico schema di
            // onOwnMonsterDestroyed qui sopra, ma dal punto di vista
            // opposto: guarda il campo Magia/Trappola dell'AVVERSARIO del
            // proprietario del mostro appena distrutto (chi controlla
            // QUESTA reazione è il "nemico" di chi ha appena perso il
            // mostro), handler onEnemyMonsterDestroyed invece di
            // onOwnMonsterDestroyed.
            const enemyOfDestroyedOwner = opponentOf(ownerOfDestroyed);
            const enemyReactCandidates = [];
            stFieldOf(enemyOfDestroyedOwner).forEach((slot, index) => {
                if (!slot) return;
                if (slot.card.type === 'trap' && slot.setOnTurn === gameState.turn) return;
                if (slot.card.type === 'trap' && areTrapsNegatedFor(enemyOfDestroyedOwner)) return;
                const rdef = getDefinition(slot.card.id);
                if (rdef && typeof rdef.onEnemyMonsterDestroyed === 'function') {
                    enemyReactCandidates.push({ zone: 'st', index: index, card: slot.card, def: rdef });
                }
            });
            const enemyReactCtx = (choice) => makeContext(enemyOfDestroyedOwner, { card: choice.card, zone: choice.zone, index: choice.index, destroyedCard: ctx.card });
            const enemyEligible = enemyReactCandidates.filter((c) => !c.def.canActivate || c.def.canActivate(enemyReactCtx(c)));
            if (enemyEligible.length > 0) {
                const choice = enemyEligible[0];
                if (choice.def.continuous) {
                    stFieldOf(enemyOfDestroyedOwner)[choice.index].isFaceDown = false;
                } else {
                    stFieldOf(enemyOfDestroyedOwner)[choice.index] = null;
                    graveyardOf(enemyOfDestroyedOwner).push(choice.card);
                }
                addToLog(`💀 ${enemyOfDestroyedOwner === 'player' ? 'Hai' : 'Il bot ha'} attivato ${choice.card.name}!`);
                if (window.FX) FX.playCardActivateCenterScreen(choice.card);
                safeCallCardHandler(choice.card, 'onEnemyMonsterDestroyed', () => choice.def.onEnemyMonsterDestroyed(enemyReactCtx(choice)));
            }
            finish();
            return;
        }

        if (name === TRIGGER.ON_POSITION_CHANGE) {
            // "Quando questa carta [passa da/viene messa in] Posizione
            // di X..." — SOLO auto-effetto della carta la cui Posizione è
            // appena cambiata (ctx.card), come ON_DESTROY: nessuna carta
            // di questo set reagisce al cambio di Posizione di UN'ALTRA
            // carta tramite questo trigger.
            const def = getDefinition(ctx.card.id);
            // Tempesta di Piume delle Arpie (id 292): nega anche l'auto-
            // effetto "quando questa carta cambia Posizione".
            if (def && typeof def.onPositionChange === 'function' && !isMonsterCardEffectsNegated(ctx.owner, ctx.card.uid)) {
                if (window.FX) FX.playCardActivateCenterScreen(ctx.card);
                safeCallCardHandler(ctx.card, 'onPositionChange', () => def.onPositionChange(ctx));
            }
            finish();
            return;
        }

        if (name === TRIGGER.ON_CARD_ACTIVATED) {
            // "Quando una carta o un effetto viene attivato..." (es.
            // Signore del Rosso, id 354) — a differenza delle finestre di
            // risposta gestite da openTriggerWindow()/openActivationWindow()
            // qui sopra, NON è "un
            // solo risponditore a scelta tra tanti candidati": ogni mostro
            // scoperto sul Terreno, di ENTRAMBI i giocatori, con un
            // proprio onCardActivated reagisce per conto suo (di solito
            // filtrandosi da sé con canActivateOnCardActivated, per un
            // vincolo "una volta per turno" — vedi ctx.hasUsedOncePerTurn).
            // SEMPLIFICAZIONE: scatta solo dalle attivazioni manuali
            // tramite activateCard() (Magie, Trappole già Set, effetti
            // Ignition dei mostri) — non dalle Trappole automatiche di
            // risposta qui sotto (es. Buco Trappola), per restare un
            // aggancio semplice invece di un vero stack di Chain.
            ['player', 'bot'].forEach((fieldOwner) => {
                fieldOf(fieldOwner).forEach((slot, index) => {
                    if (!slot || slot.isFaceDown) return;
                    if (slot.card.uid === ctx.card.uid) return; // "eccetto questa carta"
                    const def = getDefinition(slot.card.id);
                    if (!def || typeof def.onCardActivated !== 'function') return;
                    const reactCtx = makeContext(fieldOwner, {
                        card: slot.card, slot: slot, slotIndex: index,
                        activatedCard: ctx.card, activatedOwner: ctx.owner
                    });
                    if (typeof def.canActivateOnCardActivated === 'function' && !def.canActivateOnCardActivated(reactCtx)) return;
                    if (window.FX) FX.playCardActivateCenterScreen(slot.card);
                    safeCallCardHandler(slot.card, 'onCardActivated', () => def.onCardActivated(reactCtx));
                });
                // Come sopra, ma per Magie/Trappole CONTINUE già scoperte sul
                // Terreno (es. Assorbimento Magico, id 749: "ogni volta che
                // una Magia viene attivata, guadagna 500 LP") — stesso
                // schema, campo st invece del campo mostri.
                stFieldOf(fieldOwner).forEach((slot, index) => {
                    if (!slot || slot.isFaceDown) return;
                    if (slot.card.uid === ctx.card.uid) return;
                    const def = getDefinition(slot.card.id);
                    if (!def || typeof def.onCardActivated !== 'function') return;
                    const reactCtx = makeContext(fieldOwner, {
                        card: slot.card, slot: slot, index: index, zone: 'st',
                        activatedCard: ctx.card, activatedOwner: ctx.owner
                    });
                    if (typeof def.canActivateOnCardActivated === 'function' && !def.canActivateOnCardActivated(reactCtx)) return;
                    if (window.FX) FX.playCardActivateCenterScreen(slot.card);
                    safeCallCardHandler(slot.card, 'onCardActivated', () => def.onCardActivated(reactCtx));
                });
            });
            finish();
            return;
        }

        finish();
    }

    // ============================================================
    // CHAIN STACK — vera Chain con priorità, stile Master Duel.
    // gameState.chain = { links: [], active: false }. Ogni link:
    // { owner, card, handlerName, def, ctx, isManualActivation, alreadyAnnounced }.
    // I link si accumulano durante una finestra di priorità (vedi
    // openTriggerWindow/openActivationWindow sotto) e si risolvono tutti
    // insieme, in ordine LIFO (l'ultimo aggiunto è il primo a risolversi),
    // dentro resolveChain().
    // ============================================================
    function ensureChainState() {
        if (!gameState.chain) gameState.chain = { links: [], active: false };
        return gameState.chain;
    }

    /** Vero mentre una finestra di priorità è aperta (in attesa di una scelta) o ci sono link non ancora risolti. */
    function isChainActive() {
        return !!(gameState.chain && gameState.chain.active);
    }

    /**
     * Quante carte in RISPOSTA (oltre all'evento/attivazione che ha aperto
     * la finestra) si possono ancora incatenare in questa finestra.
     * In locale (Duello Demo, vs Bot) la Chain è piena e senza limiti
     * pratici. In Multiplayer resta invece a UN SOLO round: il protocollo
     * di rete oggi (vedi js/multiplayer/multiplayer.js) non trasmette la singola
     * decisione "rispondo/passo" al peer, ogni client la ricalcola da
     * solo (un lato vede l'avversario come 'bot' e decide con l'euristica,
     * l'altro lo vede come 'player' e mostra il prompt umano) — un trucco
     * già usato prima di questa modifica per le finestre di evocazione/
     * attacco, che con più di un round diventerebbe un rischio di desync
     * reale invece che solo teorico. Va rimosso quando il protocollo MP
     * trasmetterà le decisioni di Chain una per una (fase "Multiplayer
     * Avanzato").
     */
    function maxChainRounds() {
        return window.MP_broadcast ? 1 : Infinity;
    }

    /**
     * Chiede al proprietario `responderOwner` di scegliere una carta tra
     * `candidates` o passare — bot in automatico, umano tramite il prompt
     * già usato per le vecchie finestre di risposta (nessuna modifica
     * richiesta a actions.js: la funzione riceve semplicemente una lista
     * più lunga o viene richiamata più volte). `triggerCard` (opzionale) è
     * la carta a cui si starebbe rispondendo — passata al prompt umano così
     * può mostrarne nome/descrizione, non solo quella con cui rispondere.
     */
    function offerChoice(responderOwner, candidates, callback, triggerCard) {
        if (responderOwner === 'bot') {
            // Decisione delegata a BotAI (js/ai/ai-controller.js — livello
            // di difficoltà attivo in gameState.botDifficulty), con ripiego
            // sulla vecchia euristica fissa ("prendi sempre la prima") se
            // per qualche motivo BotAI non è caricato (es. pagine come
            // cartoteca.html/creazione-deck.html, che caricano duel-engine.js
            // ma non bot.js/ai-controller.js e non aprono mai davvero una
            // Chain in pratica).
            callback(window.BotAI ? BotAI.chooseChainResponse(candidates) : candidates[0]);
        } else if (window.DuelEngineUI && typeof window.DuelEngineUI.promptDefenderResponse === 'function') {
            window.DuelEngineUI.promptDefenderResponse(candidates, callback, triggerCard);
        } else {
            // Nessuna UI disponibile: per sicurezza non attiva nulla,
            // invece di bloccare il duello.
            callback(null);
        }
    }

    /**
     * Il contesto di risposta riusa quello dell'evento originale (ctx),
     * con owner/opponent invertiti sul punto di vista di chi risponde:
     * così l'effetto vede comunque tutti i dati preparati da chi ha
     * lanciato il trigger (es. attackerAtk, cancelAttack, summonedCard...)
     * senza doverli ricopiare a mano.
     */
    function buildResponseCtx(ctx, responderOwner, choice) {
        return Object.assign({}, ctx, {
            owner: responderOwner,
            opponent: ctx.owner,
            card: choice.card,
            zone: choice.zone,
            index: choice.index
        });
    }

    /**
     * "Consuma" la carta scelta come farebbe activateCard(): Trappola Set
     * o carta di mano finiscono al Cimitero — TRANNE zone === 'monster'
     * (es. Suijin, Kazejin: un mostro già scoperto sul Terreno che
     * risponde con un proprio effetto non si "consuma", resta dov'è) e
     * TRANNE una Magia/Trappola CONTINUA (choice.def.continuous, es.
     * Muro dello Specchio id 383, Scatola delle Fate id 232, Offerta
     * Suprema id 559): come per la sua prima attivazione MANUALE
     * (activateCard() qui sopra, ramo `def.continuous && zone === 'st'`),
     * resta scoperta sul Terreno invece di andare al Cimitero — bug reale
     * corretto qui: prima trattava OGNI risposta da zona 'st' come una
     * Trappola Normale monouso, distruggendo per sbaglio una Continua al
     * suo primo utilizzo come rispondente (che sia la sua prima
     * attivazione da Set, o una reazione successiva già scoperta).
     */
    function consumeCandidateCard(owner, choice) {
        if (choice.zone === 'st' && choice.def && choice.def.continuous) {
            const slot = stFieldOf(owner)[choice.index];
            if (slot) slot.isFaceDown = false;
        } else if (choice.zone === 'st') {
            stFieldOf(owner)[choice.index] = null;
            graveyardOf(owner).push(choice.card);
        } else if (choice.zone === 'hand') {
            const h = handOf(owner);
            const pos = h.indexOf(choice.card);
            if (pos !== -1) h.splice(pos, 1);
            graveyardOf(owner).push(choice.card);
        } else if (choice.zone === 'graveyard') {
            // Bandita dal Cimitero come costo della propria attivazione
            // (es. Tartaruga Elettromagnetica, id 223) — passa da
            // banishFromGraveyard (rispetta Necrovalley, id 890) come ogni
            // altro bando dal Cimitero di questo motore.
            ACTIONS.banishFromGraveyard(owner, choice.card);
        }
    }

    /**
     * Cerca, sul campo Set (`stField`) e nella mano di `responderOwner`, le
     * carte che definiscono `handlerName` (es. 'onAttackDeclare' o
     * 'onOpponentSummon') e possono DAVVERO attivarsi ora (canActivate),
     * escludendo quelle già usate in questa stessa finestra (`usedUids`).
     * Ri-controllata ad ogni round, così un cambio di stato causato da un
     * link risolto/aggiunto in precedenza si riflette subito sui round
     * successivi.
     */
    function findTriggerCandidates(handlerName, ctx, responderOwner, usedUids) {
        const candidates = [];

        stFieldOf(responderOwner).forEach((slot, index) => {
            if (!slot || usedUids.has(slot.card.uid)) return;
            // Una Trappola Set non può rispondere nel turno in cui è stata piazzata,
            // e nessuna Trappola può rispondere se un effetto continuo le nega (Jinzo).
            if (slot.card.type === 'trap' && slot.setOnTurn === gameState.turn) return;
            if (slot.card.type === 'trap' && areTrapsNegatedFor(responderOwner)) return;
            const def = getDefinition(slot.card.id);
            if (def && typeof def[handlerName] === 'function') {
                candidates.push({ zone: 'st', index: index, card: slot.card, def: def });
            }
        });

        handOf(responderOwner).forEach((card, index) => {
            if (usedUids.has(card.uid)) return;
            // Una Trappola non può MAI rispondere direttamente dalla mano —
            // per regola deve prima essere Set coperta sul Terreno (vedi lo
            // scan su stFieldOf qui sopra) e solo DA LÌ diventa attivabile,
            // non prima del suo turno di Set. Senza questo controllo, una
            // Trappola con un handler reattivo (es. onAttackDeclare,
            // onOpponentSummon) finiva per essere offerta come risposta
            // anche stando ancora in mano, sia al giocatore che al bot —
            // un vero bug di regole, non una scelta di design: Magie
            // Rapide e mostri con un effetto "scarta dalla mano" (es.
            // Kuriboh) restano invece legittimamente eleggibili da qui.
            if (card.type === 'trap') return;
            const def = getDefinition(card.id);
            if (def && typeof def[handlerName] === 'function') {
                candidates.push({ zone: 'hand', index: index, card: card, def: def });
            }
        });

        // La Magia Terreno scoperta (es. Santuario Oscuro, id 192: "quando
        // un mostro dell'avversario dichiara un attacco...") — a
        // differenza dello scan su stFieldOf qui sopra, un'unica carta,
        // sempre scoperta se presente (una Magia Terreno Set-e-non-
        // attivata non ha ancora effetto). Stesso schema/stesso ruolo di
        // zona 'fieldSpell' già usato in canActivate/activateCard.
        const fs = fieldSpellOf(responderOwner);
        if (fs && !fs.isFaceDown && !usedUids.has(fs.card.uid)) {
            const def = getDefinition(fs.card.id);
            if (def && typeof def[handlerName] === 'function') {
                candidates.push({ zone: 'fieldSpell', index: -1, card: fs.card, def: def });
            }
        }

        // Carte attivabili DAL CIMITERO come Quick Effect (es. Tartaruga
        // Elettromagnetica, id 223) — opt-in esplicito via
        // `def.activatableFromGraveyard`, altrimenti ogni carta finita nel
        // Cimitero con un handler reattivo (es. onDestroy di un'altra
        // carta) verrebbe offerta come risposta qui, cosa sbagliata per
        // la stragrande maggioranza delle carte di questo dataset.
        graveyardOf(responderOwner).forEach((card, index) => {
            if (usedUids.has(card.uid)) return;
            // Bestia Ingranaggio Antico (id 833): "annulla gli effetti di un
            // mostro distrutto in battaglia da questa carta, anche nel
            // Cimitero" — gameState.negatedEffectsForeverUids, un Set
            // PERMANENTE (mai svuotato da recomputeStaticEffects, a
            // differenza di monsterEffectsNegatedUidsFor) marcato una volta
            // sola alla distruzione e mai rimosso.
            if (gameState.negatedEffectsForeverUids && gameState.negatedEffectsForeverUids.has(card.uid)) return;
            const def = getDefinition(card.id);
            if (def && def.activatableFromGraveyard && typeof def[handlerName] === 'function') {
                candidates.push({ zone: 'graveyard', index: index, card: card, def: def });
            }
        });

        // Solo per 'onAttackDeclare': anche il mostro scoperto PRESO DI
        // MIRA dall'attacco può rispondere (es. Suijin, Kazejin —
        // "quando questa carta viene attaccata..."), non solo le Magie/
        // Trappole Set e la mano del difensore. ctx.targetIndex arriva già
        // pronto nel contesto costruito da executeAttack() in actions.js.
        if (handlerName === 'onAttackDeclare' && typeof ctx.targetIndex === 'number' && ctx.targetIndex !== -1) {
            const targetSlot = fieldOf(responderOwner)[ctx.targetIndex];
            if (targetSlot && !targetSlot.isFaceDown && !usedUids.has(targetSlot.card.uid)) {
                const def = getDefinition(targetSlot.card.id);
                if (def && typeof def[handlerName] === 'function') {
                    candidates.push({ zone: 'monster', index: ctx.targetIndex, card: targetSlot.card, def: def });
                }
            }
        }

        // Solo le carte che possono DAVVERO attivarsi ora restano in lizza
        // (es. Buco Trappola non risponde se il mostro evocato ha ATK
        // troppo basso — vedi canActivate in card-effects.js).
        return candidates.filter((c) => !c.def.canActivate || c.def.canActivate(buildResponseCtx(ctx, responderOwner, c)));
    }

    /**
     * "Dichiara" un bersaglio scelto da un effetto-carta PRIMA che quello
     * agisca su di esso — checkpoint centrale per le carte che reagiscono
     * o proteggono da un vero targeting in stile Yu-Gi-Oh (es. Signore dei
     * D. id 353, Gran Scudo Gardna id 115, Specchietto della Fata id 235,
     * Mago Comando del Caos id 738). Chiamata SOLO da un effetto che sta
     * davvero SCEGLIENDO un bersaglio (non da un effetto che agisce su un
     * mostro senza sceglierlo, es. "distruggi tutti i mostri", né da un
     * auto-pick euristico senza vera scelta — SEMPLIFICAZIONE esplicita,
     * coerente con l'intero resto di questo file: solo gli effetti che
     * adottano esplicitamente questo checkpoint (opt-in, chiamandolo) ne
     * sono coperti, non ogni possibile targeting dell'intero dataset.
     *
     * A differenza di openTriggerWindow qui sotto (asincrona, apre una
     * vera finestra di risposta multi-round), questa è SINCRONA: un solo
     * rispondente automatico per categoria (il primo eleggibile), stesso
     * schema già accettato altrove in questo file (es.
     * onOwnMonsterDestroyed/onEnemyMonsterSummoned) — evita di dover
     * rendere asincrona ogni activate() che sceglie un bersaglio, un
     * cambio strutturale enormemente più rischioso per l'intero dataset.
     *
     * sourceCtx: il ctx dell'effetto che sta bersagliando (this quando
     * chiamata come ctx.declareTarget(...) — vedi ACTIONS più sotto).
     * targetOwner/targetIndex: il bersaglio scelto, sul campo Mostri.
     * options.totalTargetCount: quante carte in tutto sta bersagliando
     * QUESTA stessa attivazione (Specchietto della Fata, id 235, richiede
     * "esattamente 1 mostro e nessun'altra carta" — il chiamante deve
     * passare 1 quando è così, un altro numero altrimenti).
     *
     * Torna { allowed, targetOwner, targetIndex }: allowed=false se il
     * bersaglio è protetto o l'attivazione è stata negata (il chiamante
     * NON deve procedere), targetOwner/targetIndex possono essere stati
     * RIDIRETTI (Specchietto della Fata) — il chiamante deve sempre usare
     * i valori restituiti, mai quelli passati in ingresso.
     */
    function declareCardEffectTarget(sourceCtx, targetOwner, targetIndex, options) {
        const opts = options || {};
        let currentOwner = targetOwner;
        let currentIndex = targetIndex;

        // 1) Floodgate assoluto per RAZZA (es. Signore dei D., id 353: "nessun
        // giocatore può scegliere come bersaglio mostri Tipo Drago sul
        // Terreno con effetti di carta") — consultato PRIMA di offrire
        // qualunque risposta, su ENTRAMBI i campi indipendentemente da chi
        // controlla il mostro protettore. def.protectsRaceFromTargeting è
        // la RAZZA protetta (stringa), generico per eventuali altre carte
        // future con lo stesso schema, non hardcoded su id 353.
        const raceCheckSlot = fieldOf(currentOwner)[currentIndex];
        if (raceCheckSlot && !raceCheckSlot.isFaceDown) {
            const protectedByRace = ['player', 'bot'].some((protectorOwner) =>
                fieldOf(protectorOwner).some((slot) => slot && !slot.isFaceDown
                    && getDefinition(slot.card.id)?.protectsRaceFromTargeting === raceCheckSlot.card.race));
            if (protectedByRace) {
                addToLog(`🚫 ${raceCheckSlot.card.name} non può essere scelta come bersaglio da un effetto Carta!`);
                return { allowed: false, targetOwner: currentOwner, targetIndex: currentIndex };
            }
        }

        // 1.5) Floodgate ASSOLUTO per singola carta (es. i tre Dei Egizi, id
        // 30/31/472: "nessun giocatore può scegliere questa carta come
        // bersaglio di effetti Carta") — def.cannotBeTargetedByCardEffects
        // sulla carta bersaglio STESSA, generico per eventuali altre carte
        // future con la stessa immunità individuale. A differenza di
        // protectsRaceFromTargeting qui sopra (una carta PROTETTRICE separata
        // protegge un'intera razza), qui la carta protegge se stessa, sempre.
        if (raceCheckSlot && !raceCheckSlot.isFaceDown && getDefinition(raceCheckSlot.card.id)?.cannotBeTargetedByCardEffects) {
            addToLog(`🚫 ${raceCheckSlot.card.name} non può essere scelta come bersaglio da un effetto Carta!`);
            return { allowed: false, targetOwner: currentOwner, targetIndex: currentIndex };
        }

        // 1.55) Come sopra, ma PER-ISTANZA invece che per-definizione (es. la
        // Spirit Message Special Summonata da Santuario Oscuro, id 867-870
        // via id 192/866): gameState.immuneToCardEffectsExceptDestinyBoardUids,
        // per uid, ricalcolato ad ogni render dentro static() — vedi il
        // commento sul campo in recomputeStaticEffects.
        if (raceCheckSlot && !raceCheckSlot.isFaceDown && gameState.immuneToCardEffectsExceptDestinyBoardUids[raceCheckSlot.card.uid]) {
            addToLog(`🚫 ${raceCheckSlot.card.name} non è influenzata dagli effetti di altre carte!`);
            return { allowed: false, targetOwner: currentOwner, targetIndex: currentIndex };
        }

        // 1.6) Floodgate ASSOLUTO per singola carta, ma SOLO contro le Magie
        // (es. Guardiano Kay'est, id 285: "questa carta non è influenzata
        // dagli effetti delle Magie", clausola che include non poter essere
        // presa di mira da esse) — def.cannotBeTargetedBySpells, come
        // cannotBeTargetedByCardEffects qui sopra ma ristretto a
        // sourceCtx.card.type === 'spell' (un Trap/Monster Effect che la
        // bersaglia resta invece permesso, a differenza dei 3 Dei Egizi che
        // sono immuni a QUALUNQUE fonte). SEMPLIFICAZIONE residua: copre
        // solo il "presa di mira", non ogni Magia che la influenza SENZA
        // sceglierla come bersaglio (es. un effetto di massa "-500 ATK a
        // tutti i mostri") — nessun punto di controllo condiviso esiste per
        // quel caso più ampio in questo motore.
        if (raceCheckSlot && !raceCheckSlot.isFaceDown && getDefinition(raceCheckSlot.card.id)?.cannotBeTargetedBySpells
            && sourceCtx.card && sourceCtx.card.type === 'spell') {
            addToLog(`🚫 ${raceCheckSlot.card.name} non è influenzata dagli effetti delle Magie!`);
            return { allowed: false, targetOwner: currentOwner, targetIndex: currentIndex };
        }

        // 1.65) Come sopra, ma PER-ISTANZA invece che per-definizione (es.
        // Il Pescatore Leggendario, id 879: l'immunità dipende dalla
        // presenza di "Umi" sul Terreno, non è mai fissa) —
        // gameState.cannotBeTargetedBySpellsUids, per uid, ricalcolato ad
        // ogni render dentro static().
        if (raceCheckSlot && !raceCheckSlot.isFaceDown && gameState.cannotBeTargetedBySpellsUids[raceCheckSlot.card.uid]
            && sourceCtx.card && sourceCtx.card.type === 'spell') {
            addToLog(`🚫 ${raceCheckSlot.card.name} non è influenzata dagli effetti delle Magie!`);
            return { allowed: false, targetOwner: currentOwner, targetIndex: currentIndex };
        }

        // Handler condiviso da tutte le carte reattive (es. Gran Scudo
        // Gardna id 115, Mago Comando del Caos id 738, Specchietto della
        // Fata id 235): def.onCardEffectTargetDeclare(ctx), con ctx.cancel()
        // per negare l'effetto sorgente e ctx.redirect(newOwner, newIndex)
        // per ridirigerne il bersaglio — stesso schema cancelAttack()/
        // redirectAttack() di ON_ATTACK_DECLARE qui sopra.
        const tryReact = (ownerOfResponder, card, index, zone) => {
            const def = getDefinition(card.id);
            if (!def || typeof def.onCardEffectTargetDeclare !== 'function') return false;
            const reactCtx = makeContext(ownerOfResponder, Object.assign({}, opts, {
                card: card,
                zone: zone,
                index: index,
                sourceCard: sourceCtx.card || null,
                sourceOwner: sourceCtx.owner,
                sourceType: sourceCtx.card ? sourceCtx.card.type : null,
                targetOwner: currentOwner,
                targetIndex: currentIndex,
                totalTargetCount: opts.totalTargetCount,
                cancelled: false,
                cancel() { this.cancelled = true; },
                redirectedOwner: null,
                redirectedIndex: null,
                redirect(newOwner, newIndex) { this.redirectedOwner = newOwner; this.redirectedIndex = newIndex; }
            }));
            if (def.canActivate && !def.canActivate(reactCtx)) return false;
            if (zone === 'st' && !def.continuous) {
                // Consuma la Trappola come una vera attivazione (va al
                // Cimitero) — stesso schema di consumeCandidateCard qui sotto.
                // Una carta CONTINUA già scoperta in campo (es. Metalmorfosi
                // Rara, id 851, equipaggiata) invece non si "consuma"
                // reagendo: resta piazzata esattamente come un mostro con
                // effetto continuo che reagisce a un trigger.
                stFieldOf(ownerOfResponder)[index] = null;
                graveyardOf(ownerOfResponder).push(card);
            }
            safeCallCardHandler(card, 'onCardEffectTargetDeclare', () => def.onCardEffectTargetDeclare(reactCtx));
            if (reactCtx.cancelled) {
                currentOwner = null;
                currentIndex = null;
                return true;
            }
            if (reactCtx.redirectedOwner != null && reactCtx.redirectedIndex != null) {
                currentOwner = reactCtx.redirectedOwner;
                currentIndex = reactCtx.redirectedIndex;
            }
            return true;
        };

        // 2) Il mostro bersaglio stesso può reagire (es. Gran Scudo Gardna
        // coperto, Mago Comando del Caos scoperto) — controllato PRIMA
        // della zona ST, come Suijin/Kazejin per ON_ATTACK_DECLARE.
        const targetSlot = fieldOf(currentOwner)[currentIndex];
        let reacted = false;
        if (targetSlot) {
            reacted = tryReact(currentOwner, targetSlot.card, currentIndex, 'monster');
        }
        if (currentOwner === null) return { allowed: false, targetOwner: targetOwner, targetIndex: targetIndex };

        // 3) SOLO se il mostro bersaglio non ha già reagito lui stesso, la
        // zona ST del suo controllore può farlo (es. Specchietto della
        // Fata, una Trappola Set) — SEMPLIFICAZIONE: un solo rispondente
        // automatico, il primo eleggibile (stesso schema di
        // onOwnMonsterDestroyed/onEnemyMonsterSummoned).
        if (!reacted) {
            const stCandidates = stFieldOf(currentOwner).filter((slot) => slot
                && !(slot.card.type === 'trap' && slot.setOnTurn === gameState.turn)
                && !(slot.card.type === 'trap' && areTrapsNegatedFor(currentOwner))
                && getDefinition(slot.card.id) && typeof getDefinition(slot.card.id).onCardEffectTargetDeclare === 'function');
            if (stCandidates.length > 0) {
                const choice = stCandidates[0];
                const index = stFieldOf(currentOwner).indexOf(choice);
                tryReact(currentOwner, choice.card, index, 'st');
            }
        }
        if (currentOwner === null) return { allowed: false, targetOwner: targetOwner, targetIndex: targetIndex };

        return { allowed: true, targetOwner: currentOwner, targetIndex: currentIndex };
    }

    /**
     * Apre la finestra di risposta a un evento (Evocazione, Attacco
     * Dichiarato): l'avversario di ctx.owner può incatenare, uno alla
     * volta, tutte le proprie carte eleggibili con l'handler
     * `handlerName` (es. sia Kuriboh sia Buco Trappola, non più solo una
     * delle due) finché passa o non ne ha più — poi la Chain così
     * costruita si risolve in LIFO e si chiama `onDone`.
     *
     * Riusata sia per "un mio attacco viene dichiarato" (Forza Riflessa,
     * Cilindro Magico, Kuriboh) sia per "io evoco un mostro" (Buco
     * Trappola): stesso identico meccanismo, cambia solo il nome
     * dell'handler cercato.
     *
     * SEMPLIFICAZIONE: solo l'avversario ha carte con questi handler (nel
     * dataset attuale nessuna carta reagisce al PROPRIO attacco/evocazione
     * allo stesso modo), quindi qui la priorità non alterna davvero tra i
     * due giocatori — l'avversario continua a rispondere finché vuole/può,
     * poi la finestra si chiude. Vedi openActivationWindow sotto per la
     * priorità alternata vera, usata per le attivazioni manuali.
     */
    function openTriggerWindow(handlerName, ctx, onDone) {
        const finish = typeof onDone === 'function' ? onDone : function () {};
        const responderOwner = ctx.opponent;
        const chain = ensureChainState();
        const usedUids = new Set();
        let rounds = 0;

        const askNextRound = () => {
            const candidates = rounds < maxChainRounds()
                ? findTriggerCandidates(handlerName, ctx, responderOwner, usedUids)
                : [];
            if (candidates.length === 0) {
                resolveChain(finish);
                return;
            }
            chain.active = true;
            offerChoice(responderOwner, candidates, (choice) => {
                if (!choice) {
                    resolveChain(finish);
                    return;
                }
                usedUids.add(choice.card.uid);
                rounds++;
                consumeCandidateCard(responderOwner, choice);
                chain.links.push({
                    owner: responderOwner,
                    card: choice.card,
                    handlerName: handlerName,
                    def: choice.def,
                    ctx: buildResponseCtx(ctx, responderOwner, choice)
                    // isManualActivation assente: come da comportamento
                    // storico, una risposta a un TRIGGER (non un'attivazione
                    // manuale) non scatena a sua volta ON_CARD_ACTIVATED.
                });
                askNextRound();
            });
        };
        askNextRound();
    }

    /**
     * Apre una finestra di risposta per l'AVVERSARIO di `drawerOwner` dopo
     * la sua pescata Normale in Draw Phase (es. Fuori Gioco, id 216: "il
     * tuo avversario scarta la carta appena pescata") — stesso motore
     * generico di openTriggerWindow qui sopra, solo esposto pubblicamente
     * perché chi pesca vive in game-flow.js (enterDrawPhase), non qui.
     * `ctx.drawnCard` è la carta appena pescata, letta dall'handler
     * `onOpponentNormalDraw` registrato sulla carta che risponde.
     */
    function openDrawResponseWindow(drawerOwner, drawnCard, onDone) {
        const ctx = makeContext(drawerOwner, { drawnCard: drawnCard });
        openTriggerWindow('onOpponentNormalDraw', ctx, onDone);
    }

    /** Cerca, sul campo Set di `owner`, le Trappole che si possono attivare ORA, escluse quelle già usate in questa finestra (`usedUids`). */
    function findSetTrapCandidates(owner, usedUids) {
        const results = [];
        stFieldOf(owner).forEach((slot, index) => {
            if (!slot || slot.card.type !== 'trap' || usedUids.has(slot.card.uid)) return;
            // Una carta in risposta dev'essere una Trappola Set COPERTA:
            // di norma canActivate() già lo garantisce da sé (una Trappola/
            // Continua scoperta fallisce il controllo "già attiva"), ma
            // def.repeatableWhileContinuous (es. Offerta Suprema id 559) fa
            // apposta eccezione a QUEL controllo per permettere una
            // riattivazione manuale ripetuta — senza questo controllo
            // esplicito, una Trappola così finirebbe candidata come
            // "risposta" alla propria stessa attivazione (o a qualunque
            // altra), aprendo un'offerta di scelta che nessuno risolve mai
            // in una Chain già in corso: un vero blocco della Chain.
            if (slot.isFaceDown === false) return;
            if (!canActivate(owner, 'st', index)) return;
            results.push({ zone: 'st', index: index, card: slot.card, def: getDefinition(slot.card.id) });
        });
        return results;
    }

    /**
     * Cerca, sul campo Mostri scoperto di `owner`, i mostri con un vero
     * Effetto Veloce esplicitamente eleggibile a rispondere a
     * un'attivazione altrui — def.canRespondAsQuickEffect === true,
     * opt-in per-carta (es. Spadaccino Mistico LV6, id 865: "una volta
     * sola finché resta scoperta sul Terreno, puoi annullare
     * l'attivazione di 1 Magia bersaglio di 1 solo mostro che
     * controlli"). Per regola vera, in una Chain rispondono solo
     * Trappole Set e pochi mostri/Magie con un vero Effetto Veloce —
     * findSetTrapCandidates qui sopra copre solo le Trappole
     * (SEMPLIFICAZIONE preesistente di questo motore), quindi questo
     * flag opt-in evita che OGNI mostro con un Ignition effect diventi
     * candidato di risposta (comportamento sbagliato per la stragrande
     * maggioranza — un Ignition normale si attiva solo di propria
     * iniziativa, in Main Phase). Riusa canActivate(owner, 'monster',
     * index) — lo stesso gate generico di ogni altro Ignition effect
     * (negazioni, Posizione di Difesa, ecc.) — quindi il proprio
     * def.canActivate/def.activate restano identici a quelli di un
     * mostro attivato manualmente, cambia solo QUANDO viene offerto.
     * resolveChain() qui sotto già gestiva "zona 'monster' negata: solo
     * l'effetto si annulla, il mostro resta in campo" prima ancora di
     * questa funzione (vedi lì) — consumeCandidateCard non ha nessun
     * ramo per zone 'monster', quindi non lo tocca affatto: resta sul
     * Terreno, esattamente come da regola vera.
     */
    function findMonsterQuickEffectCandidates(owner, usedUids) {
        const results = [];
        fieldOf(owner).forEach((slot, index) => {
            if (!slot || slot.isFaceDown || usedUids.has(slot.card.uid)) return;
            const def = getDefinition(slot.card.id);
            if (!def || !def.canRespondAsQuickEffect) return;
            if (!canActivate(owner, 'monster', index)) return;
            results.push({ zone: 'monster', index: index, card: slot.card, def: def });
        });
        return results;
    }

    /**
     * Gemella di findMonsterQuickEffectCandidates qui sopra, ma per la
     * zona 'st' invece di 'monster': una Magia/Trappola Continua GIÀ
     * scoperta sul Terreno con un vero Effetto Veloce proprio, distinto
     * dalla sua attivazione manuale normale (es. Spada Sigillante di
     * Orichalcos, id 396: oltre all'aggancio e all'estensione manuale
     * "una volta per turno", ha un TERZO Effetto Veloce — "scarta 1
     * carta per distruggere 1 carta scoperta sul Terreno" — utilizzabile
     * anche durante il turno avversario). Stesso opt-in
     * def.canRespondAsQuickEffect di findMonsterQuickEffectCandidates,
     * ma qui la risposta chiama una coppia di hook DEDICATA
     * (canActivateAsQuickEffect/activateAsQuickEffect) invece della
     * stessa canActivate/activate del click manuale: una carta con più
     * abilità distinte (qui: aggancio, estensione, Effetto Veloce) non
     * può usare la stessa coppia di hook per tutte senza ambiguità su
     * quale abilità si sta davvero invocando — vedi resolveChain/
     * openActivationWindow qui sotto, che dispatcha per link.handlerName
     * a def[link.handlerName](link.ctx), generico per qualunque nome.
     */
    function findSpellTrapQuickEffectCandidates(owner, usedUids) {
        const results = [];
        stFieldOf(owner).forEach((slot, index) => {
            if (!slot || slot.isFaceDown || usedUids.has(slot.card.uid)) return;
            const def = getDefinition(slot.card.id);
            if (!def || !def.canRespondAsQuickEffect || typeof def.activateAsQuickEffect !== 'function') return;
            const ctx = makeContext(owner, { card: slot.card, zone: 'st', index: index });
            if (typeof def.canActivateAsQuickEffect === 'function' && !def.canActivateAsQuickEffect(ctx)) return;
            results.push({ zone: 'st', index: index, card: slot.card, def: def, quickEffect: true });
        });
        return results;
    }

    /**
     * Apre la finestra di priorità dopo un'attivazione MANUALE (Magia,
     * Trappola, effetto Ignition — vedi activateCard più sotto): il link
     * `initialLink` (l'attivazione stessa, già "pagata"/spostata di zona)
     * diventa il fondo della Chain, poi la priorità ALTERNA tra i due
     * giocatori — prima l'avversario, poi di nuovo chi ha attivato per
     * primo, e così via — e ciascuno può rispondere SOLO con una propria
     * Trappola già Set (niente Magie/Ignition in risposta, come da regola
     * vera), finché entrambi passano di fila. Poi la Chain si risolve in
     * LIFO e si chiama `onDone`.
     *
     * La PRIMA richiesta "vuoi rispondere?" aspetta che il pulse a centro
     * schermo dell'attivazione INIZIALE (già scatenato da activateCard,
     * initialLink.activatedAt) sia DAVVERO finito — altrimenti il prompt
     * comparirebbe sopra l'animazione ancora in corso, illeggibile insieme
     * a lei. Le richieste successive (round 2+, "vuoi rispondere ALLA
     * risposta?") non hanno bisogno di aspettare: una carta di risposta
     * non riceve il proprio pulse finché non risolve DAVVERO (dentro
     * resolveChain), mai durante questa fase di costruzione della Chain.
     */
    function openActivationWindow(initialLink, onDone) {
        const finish = typeof onDone === 'function' ? onDone : function () {};
        const chain = ensureChainState();
        chain.active = true;
        chain.links.push(initialLink);

        const usedUidsBySide = { player: new Set(), bot: new Set() };
        let consecutivePasses = 0;
        let totalRounds = 0;
        let turnToRespond = initialLink.owner === 'player' ? 'bot' : 'player';

        const askNextRound = () => {
            if (consecutivePasses >= 2 || totalRounds >= maxChainRounds()) {
                resolveChain(finish);
                return;
            }
            const responderOwner = turnToRespond;
            const candidates = [
                ...findSetTrapCandidates(responderOwner, usedUidsBySide[responderOwner]),
                ...findMonsterQuickEffectCandidates(responderOwner, usedUidsBySide[responderOwner]),
                ...findSpellTrapQuickEffectCandidates(responderOwner, usedUidsBySide[responderOwner])
            ];
            if (candidates.length === 0) {
                consecutivePasses++;
                turnToRespond = responderOwner === 'player' ? 'bot' : 'player';
                askNextRound();
                return;
            }
            // La carta a cui `responderOwner` starebbe rispondendo ORA: il
            // link più in cima allo stack (l'ultima cosa aggiunta alla
            // Chain, che sia l'attivazione iniziale o una risposta
            // precedente) — passata al prompt umano così può mostrarne
            // nome/descrizione insieme alla scelta.
            const triggerCard = chain.links[chain.links.length - 1].card;
            offerChoice(responderOwner, candidates, (choice) => {
                if (!choice) {
                    consecutivePasses++;
                    turnToRespond = responderOwner === 'player' ? 'bot' : 'player';
                    askNextRound();
                    return;
                }
                consecutivePasses = 0;
                totalRounds++;
                usedUidsBySide[responderOwner].add(choice.card.uid);
                consumeCandidateCard(responderOwner, choice);
                chain.links.push({
                    owner: responderOwner,
                    card: choice.card,
                    // choice.quickEffect (findSpellTrapQuickEffectCandidates
                    // qui sopra): dispatcha su una coppia di hook DEDICATA
                    // invece della normale activate(), vedi il commento su
                    // quella funzione per il perché.
                    handlerName: choice.quickEffect ? 'activateAsQuickEffect' : 'activate',
                    def: choice.def,
                    ctx: makeContext(responderOwner, { card: choice.card, zone: choice.zone, index: choice.index }),
                    isManualActivation: true
                });
                turnToRespond = responderOwner === 'player' ? 'bot' : 'player';
                askNextRound();
            }, triggerCard);
        };

        const duration = (window.FX && FX.ACTIVATE_CENTER_DURATION_MS) || 2000;
        const elapsed = initialLink.activatedAt ? (Date.now() - initialLink.activatedAt) : duration;
        const waitMs = Math.max(0, duration - elapsed);
        setTimeout(askNextRound, waitMs);
    }

    /**
     * Risolve tutti i link accumulati in gameState.chain, in ordine LIFO
     * (l'ultimo aggiunto è il primo a risolversi — esattamente come nel
     * gioco vero): per ognuno chiama il proprio handler, e se è
     * un'attivazione manuale (o una risposta ad essa) scatena anche
     * TRIGGER.ON_CARD_ACTIVATED (es. Signore del Rosso). Svuota lo stack e
     * chiude la finestra (chain.active = false) alla fine, poi chiama
     * `onDone`.
     *
     * ASINCRONA (un link alla volta, MAI un while sincrono): ogni link
     * aspetta prima che il proprio pulse "carta a centro schermo"
     * (FX.playCardActivateCenterScreen, ~2s — FX.ACTIVATE_CENTER_DURATION_MS)
     * sia DAVVERO finito prima di chiamare il suo handler — altrimenti
     * l'effetto si risolverebbe a metà pulse invece che dopo, illeggibile
     * (più ancora con più link in Chain, che altrimenti si accavallerebbero
     * l'uno sull'altro invece di leggersi in sequenza, un tempo alla
     * volta, come nel gioco vero). Un link con alreadyAnnounced true
     * (l'attivazione INIZIALE, il cui pulse è già partito prima in
     * activateCard) porta con sé `activatedAt`: si aspetta solo il tempo
     * RESTANTE da allora, non altri 2s pieni — probabilmente già zero, se
     * nel frattempo un giocatore umano ha impiegato del tempo a decidere
     * se rispondere. updateUI() dopo ogni singolo handler (non solo alla
     * fine) rende visibile il Terreno che cambia un passo alla volta,
     * invece di scattare tutto insieme a Chain già conclusa.
     */
    function resolveChain(onDone) {
        const finish = typeof onDone === 'function' ? onDone : function () {};
        const chain = ensureChainState();
        chain.active = true;

        const resolveNext = () => {
            if (chain.links.length === 0) {
                chain.active = false;
                finish();
                return;
            }
            const link = chain.links.pop();
            if (link.negated) {
                addToLog(`🚫 L'attivazione di ${link.card.name} è stata negata!`);
                // Una Magia/Trappola Normale negata è già finita al
                // Cimitero PRIMA di aprire questa finestra (activateCard
                // sposta la carta subito, come da regola vera "si paga il
                // costo prima"), quindi non serve altro. Una Continua
                // invece resta scoperta sul Terreno finché non risolve
                // (isFaceDown diventa false, ma la carta non si muove mai
                // di zona) — "e se lo fai, distruggi quella carta" la
                // manda al Cimitero qui. Un Effetto Ignition negato (zona
                // 'monster') non distrugge il mostro stesso: solo il suo
                // effetto non si applica, nessuna pulizia da fare.
                if (link.ctx && link.ctx.zone === 'st') {
                    const stSlot = stFieldOf(link.owner)[link.ctx.index];
                    if (stSlot && stSlot.card === link.card) {
                        stFieldOf(link.owner)[link.ctx.index] = null;
                        graveyardOf(link.owner).push(link.card);
                    }
                } else if (link.ctx && link.ctx.zone === 'fieldSpell') {
                    const fieldKey = link.owner === 'player' ? 'playerFieldSpell' : 'botFieldSpell';
                    if (gameState[fieldKey] && gameState[fieldKey].card === link.card) {
                        graveyardOf(link.owner).push(link.card);
                        gameState[fieldKey] = null;
                    }
                }
                if (typeof updateUI === 'function') updateUI();
                resolveNext();
                return;
            }

            const runHandler = () => {
                if (typeof link.def[link.handlerName] === 'function') {
                    safeCallCardHandler(link.card, link.handlerName, () => link.def[link.handlerName](link.ctx));
                }
                if (link.isManualActivation) {
                    fireTrigger(TRIGGER.ON_CARD_ACTIVATED, link.ctx);
                }
                if (typeof updateUI === 'function') updateUI();
                resolveNext();
            };

            if (!link.alreadyAnnounced) {
                addToLog(`🛡️ ${link.owner === 'player' ? 'Hai' : 'Il bot ha'} attivato ${link.card.name} in risposta!`);
                if (window.FX) FX.playCardActivateCenterScreen(link.card);
                link.activatedAt = Date.now();
            }
            const duration = (window.FX && FX.ACTIVATE_CENTER_DURATION_MS) || 2000;
            const elapsed = link.activatedAt ? (Date.now() - link.activatedAt) : duration;
            const waitMs = Math.max(0, duration - elapsed);
            setTimeout(runHandler, waitMs);
        };

        resolveNext();
    }

    // ============================================================
    // Effetti continui (static): ricalcolati ad ogni render tramite
    // recomputeStaticEffects(), chiamata da updateUI() in game-flow.js.
    // Un effetto continuo non "fa" nulla direttamente: scrive dei flag
    // su gameState (es. gameState.trapsNegatedFor) che il resto del
    // motore/gioco controlla al momento giusto.
    // ============================================================
    function recomputeStaticEffects() {
        // Reset dei flag prima di ricalcolare, altrimenti un effetto
        // continuo che sparisce (es. Jinzo distrutto) resterebbe "appiccicato".
        gameState.trapsNegatedFor = { player: false, bot: false };
        gameState.spellsNegatedFor = { player: false, bot: false };
        gameState.cannotAttackFor = { player: false, bot: false };
        gameState.revealedFor = { player: false, bot: false };
        // Luce dell'Intervento (id 634): floodgate valido per ENTRAMBI i
        // giocatori indipendentemente da chi controlla la carta (un solo
        // booleano, non per-owner come i flag sopra) — consultato in
        // summonMonster (js/engine/actions.js) per reindirizzare ogni Set
        // di un mostro verso un'Evocazione scoperta in Attacco.
        gameState.monsterSetBlocked = false;
        // Maschera della Restrizione (id 371): "nessun giocatore può
        // sacrificare carte" — floodgate valido per ENTRAMBI, come sopra.
        // SEMPLIFICAZIONE: copre solo l'Evocazione Tributo (l'unica vera
        // meccanica di "sacrificio" di questo motore), consultata in
        // attemptMonsterSummon (js/engine/actions.js).
        gameState.tributesBlocked = false;
        // Guardiano Falce del Terrore (id 282): "non puoi Evocare
        // Normalmente/Special Summonare altri mostri finché questa carta
        // è in campo" — floodgate PER PROPRIETARIO (solo chi controlla
        // 282, non l'avversario), ricalcolato ogni render controllando se
        // 282 è scoperta sul proprio Terreno. Consultato in
        // attemptMonsterSummon (Evocazione Normale/Set, actions.js) e in
        // ACTIONS.specialSummon qui sotto (unico punto condiviso da OGNI
        // Special Summon del motore).
        gameState.otherMonsterSummonsBlockedFor = { player: false, bot: false };
        ['player', 'bot'].forEach((owner) => {
            if (fieldOf(owner).some((s) => s && !s.isFaceDown && s.card.id === 282)) {
                gameState.otherMonsterSummonsBlockedFor[owner] = true;
            }
        });
        gameState.atkDefBonus = {}; // chiave = uid della carta -> {atk, def}
        // Un Oceano Leggendario (id 79): "ogni mostro ACQUA è considerato
        // di Livello inferiore di 1" — floodgate valido per ENTRAMBI i
        // giocatori (chi controlla la Magia Terreno non conta) e per
        // QUALUNQUE mostro ACQUA ovunque si trovi (Terreno, anche coperto,
        // o mano), non solo quelli scoperti sul Terreno come il bonus
        // ATK/DEF qui sopra — vedi getEffectiveLevel in cards-db.js, che
        // legge questo flag.
        gameState.legendaryOceanActive = false;
        // Divieto di attacco/cambio Posizione per UN SOLO mostro (es.
        // Incantesimo Ombra, id 439) — chiave = uid della carta, resettato
        // e ricalcolato ad ogni render come atkDefBonus qui sopra, MAI
        // scritto come proprietà persistente sullo slot (altrimenti
        // resterebbe "appiccicato" anche dopo che la carta che lo impone
        // lascia il campo, stesso identico motivo del reset qui sopra).
        gameState.cannotAttackUids = {};
        gameState.cannotChangePositionUids = {};
        // Divieto di essere scelto come BERSAGLIO di un attacco per UN
        // SOLO mostro (es. Torre d'Ossa Divora-Anime id 664, Capitano
        // Predone id 714: "l'avversario non può bersagliare i Guerrieri
        // con gli attacchi, eccetto questa carta") — stesso schema di
        // cannotAttackUids/cannotChangePositionUids qui sopra, ma sul lato
        // del DIFENSORE invece dell'attaccante, consultato in
        // resolveAttack() (js/engine/actions.js) e filtrato dalla lista
        // bersagli del bot (js/ai/bot.js).
        gameState.cannotBeAttackTargetUids = {};
        // Immunità agli effetti Carta per UN SOLO mostro (per uid), es. la
        // Spirit Message Special Summonata da Santuario Oscuro (id 192,
        // via id 866-870): "non influenzata dagli effetti di altre carte,
        // eccetto Destiny Board" — stesso schema di cannotBeAttackTargetUids
        // qui sopra (per uid, ricalcolato ad ogni render dentro static(),
        // quindi si applica/toglie da solo a seconda della forma attuale
        // della carta), ma consultato dal checkpoint di targeting condiviso
        // (declareCardEffectTarget qui sotto) invece che da resolveAttack.
        // A differenza di def.cannotBeTargetedByCardEffects (fisso per
        // DEFINIZIONE, es. i 3 Dei Egizi), questo è per-ISTANZA: la stessa
        // carta id 867-870 nella sua forma Magia normale (piazzata da
        // Destiny Board senza Santuario Oscuro) resta bersagliabile come
        // sempre. SEMPLIFICAZIONE residua, stesso limite già accettato per
        // le altre 9 carte di questa famiglia (id 115/235/353/622/661/738/
        // 761/826/851): copre solo il targeting via il checkpoint
        // condiviso, non ogni possibile effetto di massa non mirato — nessun
        // checkpoint del genere esiste in questo motore.
        gameState.immuneToCardEffectsExceptDestinyBoardUids = {};
        // Come def.cannotBeTargetedBySpells (fisso per DEFINIZIONE, es.
        // Guardiano Kay'est id 285) ma per-ISTANZA — nata per Il Pescatore
        // Leggendario (id 879): "finché 'Umi' è sul Terreno, non è
        // influenzata da effetti Magia" è una condizione che va e viene con
        // la presenza di Umi, non un'immunità fissa della definizione.
        // Stesso schema per-uid di cannotBeAttackTargetUids/
        // immuneToCardEffectsExceptDestinyBoardUids qui sopra: ricalcolata
        // ad ogni render dentro static(), consultata dallo stesso
        // checkpoint condiviso (declareCardEffectTarget) subito dopo il
        // controllo per-definizione equivalente.
        gameState.cannotBeTargetedBySpellsUids = {};
        // Indistruttibilità da effetto Carta per UN SOLO mostro (per uid,
        // ricalcolata ad ogni render dentro static() come le altre mappe
        // qui sopra) — nata per Artigli di Drago (id 208, Equip: "il
        // mostro equipaggiato non può essere distrutto dagli effetti
        // delle carte dell'avversario"). A differenza di
        // def.cannotBeDestroyedByCardEffect (fisso per DEFINIZIONE, es.
        // Exodia Necross id 230 — sempre vero per quella carta, nessun
        // Equip coinvolto), questo è per-ISTANZA: si applica/toglie da
        // solo seguendo la presenza dell'Equip, esattamente come
        // cannotBeAttackTargetUids qui sopra. Stessa SEMPLIFICAZIONE già
        // accettata per cannotBeDestroyedByCardEffect (vedi il commento
        // lì, in destroyMonster): blocca OGNI distruzione da effetto
        // Carta, non solo quelli dell'avversario — nessun caso di questo
        // dataset avrebbe bisogno di distruggere la propria carta
        // protetta con un proprio effetto.
        gameState.cannotBeDestroyedByCardEffectUids = {};
        // Permesso di attaccare direttamente ANCHE se l'avversario
        // controlla mostri, per UN SOLO mostro, dovuto a una CONDIZIONE
        // ricalcolata ogni render (es. Folletto della Fiamma Furente id
        // 681: sempre; Sparatore Sonico id 773: solo se la zona
        // Magia/Trappola avversaria è vuota) — diverso da
        // gameState.directAttackAllowedFor (game-flow.js: un permesso
        // "una tantum" concesso da un effetto Ignition/attivato, valido
        // per il resto del turno, MAI resettato qui altrimenti
        // sparirebbe al render successivo). Consultato in aggiunta a
        // quello in entrambi i punti che lo controllano.
        gameState.directAttackAllowedUids = {};
        // Danno perforante esteso a un intero Tipo mostro (es. Furia del
        // Drago, id 212: "i propri mostri Tipo Drago infliggono danno
        // perforante") — Set di razze per proprietario, ricalcolato ad
        // ogni render come le mappe qui sopra. Diverso da def.piercing
        // (fisso sulla carta, controllato in resolveBattleDamage/actions.js
        // insieme a questo): quel flag è per-CARTA, questo è per-RAZZA e
        // dipende da cosa è scoperto sul Terreno in questo momento.
        gameState.piercingRacesFor = { player: new Set(), bot: new Set() };
        // Danno perforante concesso a UNA carta specifica (per uid), es.
        // Impatto Meteora Fatato (id 233): "il mostro equipaggiato infligge
        // danno perforante" — diverso da piercingRacesFor (per RAZZA) e da
        // def.piercing (fisso sulla carta): qui dipende da cosa è
        // equipaggiato in questo momento, ricalcolato ad ogni render.
        gameState.piercingUidsFor = { player: new Set(), bot: new Set() };
        // Effetti Mostro negati per UNA carta specifica (per uid), es.
        // Spada Sigillante di Orichalcos (id 396): "gli effetti del
        // mostro equipaggiato vengono negati" — stesso schema di
        // piercingUidsFor qui sopra, ma per la negazione invece del
        // danno perforante. Diverso da areMonsterEffectsNegatedFor
        // (Tempesta di Piume delle Arpie, id 292): quello è per intero
        // PROPRIETARIO fino a fine turno, questo è per UNA carta,
        // ricalcolato ogni render finché resta equipaggiata.
        gameState.monsterEffectsNegatedUidsFor = { player: new Set(), bot: new Set() };
        // Spada Sigillante di Orichalcos (id 396), seconda clausola: "se
        // hai una carta in Field Zone, estendi questo effetto a un altro
        // mostro Effetto fino alla fine del turno avversario" — gli uid
        // estesi vivono in un store SEPARATO (gameState.orichalcosExtendedNegationUidsFor,
        // scaduto in changeTurn come Orgoth l'Implacabile, non azzerato
        // qui sopra ad ogni render) apposta perché sopravvivano al reset
        // di monsterEffectsNegatedUidsFor appena fatto; li re-inietta qui
        // ad ogni render, esattamente come la clausola base fa da sé più
        // sotto per il bersaglio equipaggiato.
        ['player', 'bot'].forEach((owner) => {
            const extended = gameState.orichalcosExtendedNegationUidsFor && gameState.orichalcosExtendedNegationUidsFor[owner];
            if (extended && extended.size) extended.forEach((uid) => gameState.monsterEffectsNegatedUidsFor[owner].add(uid));
        });

        ['player', 'bot'].forEach((owner) => {
            // Mostri scoperti sul campo (es. Jinzo).
            fieldOf(owner).forEach((slot, index) => {
                if (!slot || slot.isFaceDown) return;
                // Occhio di Gorgone (id 271): gli effetti CONTINUI di un
                // mostro in Posizione di Difesa non si applicano affatto
                // finché il flag resta attivo, come se la carta non avesse
                // alcun effetto statico in questo momento.
                if (gameState.defenseMonsterEffectsNegated && slot.position === 'defense') return;
                const def = getDefinition(slot.card.id);
                if (def && typeof def.static === 'function') {
                    safeCallCardHandler(slot.card, 'static', () => def.static(makeContext(owner, { card: slot.card, slot: slot, slotIndex: index })));
                }
            });
            // Magie/Trappole Continue scoperte sul Terreno (es. Spada
            // Rivelatrice): restano piazzate invece di finire subito al
            // Cimitero, e il loro effetto si ricalcola qui ad ogni render
            // esattamente come per un mostro continuo — vedi il campo
            // `continuous` gestito da activateCard() più sotto.
            stFieldOf(owner).forEach((slot, index) => {
                if (!slot || slot.isFaceDown) return;
                const def = getDefinition(slot.card.id);
                if (!def) return;
                // Carte Equipaggiamento (def.isEquip): se il mostro a cui
                // erano equipaggiate non è più lì (distrutto, tornato in
                // mano, ecc.), la Carta Equipaggiamento va al Cimitero da
                // sola, PRIMA di provare a calcolare il proprio static() —
                // altrimenti applicherebbe un bonus a un mostro che non
                // c'è più, o peggio a un uid riciclato per errore.
                if (def.isEquip) {
                    const targetOwner = slot.card.equippedToOwner;
                    const targetSlot = targetOwner != null ? fieldOf(targetOwner)[slot.card.equippedToIndex] : null;
                    const validTarget = targetSlot && !targetSlot.isFaceDown && targetSlot.card.uid === slot.card.equippedToUid;
                    if (!validTarget) {
                        stFieldOf(owner)[index] = null;
                        // Mostro Union (def.isUnion, es. Testa di Drago Y
                        // id 513): a differenza di una Carta Equipaggiamento
                        // normale, se il bersaglio a cui era agganciato non
                        // è più valido NON va al Cimitero — torna sul
                        // Terreno come mostro a sé, scoperto in Posizione
                        // di Attacco (o al Cimitero se non c'è una casella
                        // Mostro libera, stessa regola vera). SEMPLIFICAZIONE:
                        // niente TRIGGER.ON_SPECIAL_SUMMON/effetti visivi
                        // qui — questa funzione gira DENTRO un render
                        // (chiamata da updateUI), e fireTrigger/i suoi
                        // effetti richiamerebbero updateUI() di nuovo a
                        // metà dello stesso render: stesso motivo per cui
                        // il resto di questo blocco fa solo mutazioni
                        // dirette di stato, mai chiamate ad ACTIONS di alto
                        // livello.
                        if (def.isUnion) {
                            const emptySlot = fieldOf(owner).findIndex((s) => s === null);
                            if (emptySlot !== -1) {
                                delete slot.card.equippedToOwner;
                                delete slot.card.equippedToIndex;
                                delete slot.card.equippedToUid;
                                fieldOf(owner)[emptySlot] = { card: slot.card, position: 'attack', isFaceDown: false, hasAttacked: false, canChangePosition: false, summonedOnTurn: gameState.turn };
                                return;
                            }
                        }
                        graveyardOf(owner).push(slot.card);
                        return;
                    }
                }
                if (typeof def.static === 'function') {
                    safeCallCardHandler(slot.card, 'static', () => def.static(makeContext(owner, { card: slot.card, slot: slot, index: index })));
                }
            });
            // Magia Terreno scoperta (gameState.playerFieldSpell/
            // botFieldSpell — una sola carta, non un array come stFieldOf):
            // stesso trattamento, così un suo static() (es. Coro del
            // Santuario id 151, Un Oceano Leggendario id 79) si applica
            // davvero invece di restare codice morto mai chiamato.
            const fs = fieldSpellOf(owner);
            if (fs && !fs.isFaceDown) {
                const fsDef = getDefinition(fs.card.id);
                if (fsDef && typeof fsDef.static === 'function') {
                    safeCallCardHandler(fs.card, 'static', () => fsDef.static(makeContext(owner, { card: fs.card, slot: fs, zone: 'fieldSpell' })));
                }
            }
        });
    }

    /**
     * Reazione delle carte scoperte di ENTRAMBI i lati quando un mostro
     * (di uno qualunque dei due giocatori) viene Evocato Normalmente o
     * girato scoperto (Flip Summon) — es. Misterioso Burattinaio (id 579):
     * "ogni volta che tu O il tuo avversario Evocate Normalmente o girate
     * scoperto un mostro, guadagni 500 Life Points". A differenza di
     * onOpponentSummon (solo l'avversario di chi evoca risponde) qui
     * reagiscono le carte di ENTRAMBI, incluso lo stesso lato che ha
     * evocato — nessuna Chain, ogni carta eleggibile scatta per conto
     * proprio, stesso spirito di firePhaseTrigger più sotto.
     */
    function reactToAnyNormalOrFlipSummon(summonedCard, summonedVia) {
        // `summonedCard`/`summonedVia` (opzionali, retrocompatibili — es.
        // Exxod, Maestro della Guardia, id 753: "ogni volta che un mostro
        // TERRA viene Evocato mentre questa carta resta scoperta,
        // SOLO tramite Flip Summon"): identificano CHI/COME è stato
        // evocato, per le carte che hanno bisogno di controllarlo (a
        // differenza di Misterioso Burattinaio id 579, che reagisce a
        // prescindere e non li consulta mai).
        const extra = { summonedCard: summonedCard || null, summonedVia: summonedVia || null };
        ['player', 'bot'].forEach((owner) => {
            fieldOf(owner).forEach((slot, index) => {
                if (!slot || slot.isFaceDown) return;
                const def = getDefinition(slot.card.id);
                if (def && typeof def.onAnyNormalOrFlipSummon === 'function') {
                    safeCallCardHandler(slot.card, 'onAnyNormalOrFlipSummon', () => def.onAnyNormalOrFlipSummon(makeContext(owner, Object.assign({ card: slot.card, slotIndex: index }, extra))));
                }
            });
            // Anche una Magia/Trappola Continua o la Magia Terreno possono
            // avere lo stesso aggancio (es. Castello dell'Ingranaggio
            // Antico, id 843: "ogni Evocazione Normale/Set, di ENTRAMBI i
            // lati, aggiunge un Segnalino a questa Magia Continua") —
            // esteso qui invece che nel solo Terreno Mostri qui sopra,
            // stessa funzione condivisa da entrambe le chiamate (ON_NORMAL_SUMMON/ON_FLIP).
            stFieldOf(owner).forEach((slot, index) => {
                if (!slot || slot.isFaceDown) return;
                const def = getDefinition(slot.card.id);
                if (def && typeof def.onAnyNormalOrFlipSummon === 'function') {
                    safeCallCardHandler(slot.card, 'onAnyNormalOrFlipSummon', () => def.onAnyNormalOrFlipSummon(makeContext(owner, Object.assign({ card: slot.card, index: index, zone: 'st' }, extra))));
                }
            });
            const fs = fieldSpellOf(owner);
            if (fs && !fs.isFaceDown) {
                const fsDef = getDefinition(fs.card.id);
                if (fsDef && typeof fsDef.onAnyNormalOrFlipSummon === 'function') {
                    safeCallCardHandler(fs.card, 'onAnyNormalOrFlipSummon', () => fsDef.onAnyNormalOrFlipSummon(makeContext(owner, Object.assign({ card: fs.card, zone: 'fieldSpell' }, extra))));
                }
            }
        });
    }

    /**
     * "Ogni volta che uno o più mostri [Tipo] vengono Special Summonati:
     * [effetto]" (es. Torre d'Ossa Divora-Anime, id 664: mostri Zombie) —
     * broadcast INCONDIZIONATO verso ogni mostro scoperto sul Terreno di
     * ENTRAMBI i lati che definisce def.onAnySpecialSummon, stesso spirito
     * di reactToAnyNormalOrFlipSummon qui sopra ma per la Special Summon
     * (che quella funzione non copre affatto — l'unica reazione esistente
     * a una Special Summon prima d'ora era quella ristretta "dal proprio
     * Cimitero" più sopra in fireTrigger, un caso diverso e più stretto).
     */
    function reactToAnySpecialSummon(summonedCard) {
        ['player', 'bot'].forEach((owner) => {
            fieldOf(owner).forEach((slot, index) => {
                if (!slot || slot.isFaceDown) return;
                const def = getDefinition(slot.card.id);
                if (def && typeof def.onAnySpecialSummon === 'function') {
                    safeCallCardHandler(slot.card, 'onAnySpecialSummon', () => def.onAnySpecialSummon(makeContext(owner, { card: slot.card, slotIndex: index, summonedCard: summonedCard })));
                }
            });
        });
    }

    /**
     * Mostri Union (def.isUnion — es. Testa di Drago Y id 513, Carro
     * Armato Metallico Z id 515): "se il mostro equipaggiato dovrebbe
     * essere distrutto, questa carta viene distrutta al suo posto" —
     * cerca sullo stField di `owner` una Carta Equipaggiamento Union
     * agganciata a `targetUid`; se trovata, la distrugge DIRETTAMENTE
     * (bypassa destroySpellTrap: nessuna Chain/risposta serve per questo
     * redirect automatico, stesso principio di onSTDestroyed) e torna
     * true (il chiamante NON deve più distruggere il bersaglio originale).
     * Torna false se nessun Mostro Union protegge quel bersaglio. Chiamata
     * sia da ACTIONS.destroyMonster (distruzione da effetto Carta) sia da
     * resolveBattleDamage (actions.js, distruzione da battaglia) — un solo
     * punto per entrambi i casi, invece di duplicare la logica.
     */
    /** Vero se un Mostro Union su stField(owner) protegge `targetUid` — controllo PURO, nessun effetto collaterale (vedi tryRedirectUnionDestroy per la versione che esegue davvero il redirect). */
    function hasUnionProtector(owner, targetUid) {
        return stFieldOf(owner).some((s) => s && !s.isFaceDown && s.card.equippedToUid === targetUid && getDefinition(s.card.id)?.isUnion);
    }

    function tryRedirectUnionDestroy(owner, targetUid, targetName) {
        const unionSlot = stFieldOf(owner).find((s) => s && !s.isFaceDown && s.card.equippedToUid === targetUid && getDefinition(s.card.id)?.isUnion);
        if (!unionSlot) return false;
        const unionIndex = stFieldOf(owner).indexOf(unionSlot);
        addToLog(`🛡️ ${unionSlot.card.name} viene distrutta al posto di ${targetName || 'il mostro equipaggiato'}!`);
        graveyardOf(owner).push(unionSlot.card);
        stFieldOf(owner)[unionIndex] = null;
        return true;
    }

    /**
     * "Ogni volta che un TUO mostro (anche di un'altra carta) viene
     * mandato al TUO Cimitero: [reagisce]" (es. Uovo Giurassico Miracoloso,
     * id 808: accumula Segnalini ogni volta che un mostro Tipo Dinosauro
     * finisce nel proprio Cimitero) — broadcast INCONDIZIONATO verso ogni
     * mostro scoperto sul Terreno di `owner` che definisce
     * def.onOwnMonsterDestroyedPassive, indipendentemente dal MOTIVO per
     * cui `sentCard` è finita al Cimitero (distruzione, Sacrificio per
     * Evocazione Tributo, scarto dalla mano...). Estratta qui da dentro il
     * ramo TRIGGER.ON_DESTROY di fireTrigger (che la chiama per il caso
     * distruzione) così può essere richiamata anche da altri punti del
     * motore (performTributeSacrifice/bot.js per i Sacrifici,
     * discardRandomFromHand per gli scarti) senza duplicare la logica.
     * `viaBattleCard` (opzionale) è l'altro mostro della battaglia se
     * `sentCard` è stata distrutta IN BATTAGLIA (passato solo dal ramo
     * TRIGGER.ON_DESTROY qui sotto, che lo riceve da fireOnDestroy/
     * actions.js) — esposto come ctx.destroyedInBattle/ctx.destroyedByCard
     * ai singoli def.onOwnMonsterDestroyedPassive, per chi (es. Kuribah/
     * Kuribee, id 859/860) deve reagire solo a "distrutta in battaglia",
     * non a QUALUNQUE motivo per cui `sentCard` è finita al Cimitero.
     * Scansiona anche stFieldOf(owner) (non solo fieldOf, la zona Mostro):
     * una Carta Equipaggiamento come Collana del Comando (id 688) vive
     * nella zona Magia/Trappola, ma deve comunque poter sapere SE il
     * mostro che tiene agganciato è stato distrutto specificamente IN
     * BATTAGLIA (ctx.destroyedInBattle) — stessa estensione già fatta per
     * onAnyNormalOrFlipSummon con Castello dell'Ingranaggio Antico (id 843).
     */
    function notifyOwnMonsterSentToGraveyard(owner, sentCard, viaBattleCard) {
        fieldOf(owner).forEach((slot, index) => {
            if (!slot || slot.isFaceDown) return;
            const mdef = getDefinition(slot.card.id);
            if (mdef && typeof mdef.onOwnMonsterDestroyedPassive === 'function') {
                safeCallCardHandler(slot.card, 'onOwnMonsterDestroyedPassive', () => mdef.onOwnMonsterDestroyedPassive(makeContext(owner, { card: slot.card, slotIndex: index, destroyedCard: sentCard, destroyedInBattle: !!viaBattleCard, destroyedByCard: viaBattleCard || null })));
            }
        });
        stFieldOf(owner).forEach((slot, index) => {
            if (!slot || slot.isFaceDown) return;
            const sdef = getDefinition(slot.card.id);
            if (sdef && typeof sdef.onOwnMonsterDestroyedPassive === 'function') {
                safeCallCardHandler(slot.card, 'onOwnMonsterDestroyedPassive', () => sdef.onOwnMonsterDestroyedPassive(makeContext(owner, { card: slot.card, slotIndex: index, destroyedCard: sentCard, destroyedInBattle: !!viaBattleCard, destroyedByCard: viaBattleCard || null })));
            }
        });
    }

    /**
     * def.onSacrificedForTribute(ctx): la carta STESSA appena sacrificata
     * come Tributo (per un'Evocazione Tributo o come costo d'attacco tipo
     * Guerriero Pantera id 399) reagisce alla propria rimozione dal Terreno
     * — es. Abbandonato (id 416): il mostro assorbito torna al suo
     * proprietario anche se Abbandonato viene sacrificato, non solo
     * distrutto. Chiamata da performTributeSacrifice/performAttackTribute
     * (actions.js) e dal codice IA equivalente (bot.js), sempre DOPO che
     * la carta è già stata tolta dal Terreno e mandata al Cimitero (stesso
     * ordine di onDestroy).
     */
    function notifySacrificedForTribute(owner, tributedCard) {
        const def = getDefinition(tributedCard.id);
        if (def && typeof def.onSacrificedForTribute === 'function') {
            safeCallCardHandler(tributedCard, 'onSacrificedForTribute', () => def.onSacrificedForTribute(makeContext(owner, { card: tributedCard })));
        }
        redirectToBanishIfFlagged(owner, tributedCard);
    }

    /**
     * Scatena un trigger di fase (Standby/End Phase) su OGNI carta scoperta
     * sul campo del giocatore DI TURNO (mostri e Magie/Trappole Continue) —
     * a differenza di ON_FLIP/ON_DESTROY (una carta sola coinvolta), qui
     * più carte diverse possono reagire alla STESSA Standby/End Phase, una
     * dopo l'altra. Chiamata da enterStandbyPhase()/enterEndPhase() in
     * game-flow.js, solo per il giocatore che sta vivendo quella fase (le
     * carte dell'avversario non scattano: "durante la TUA Standby/End
     * Phase" è sempre riferito al proprio controllore).
     */
    function firePhaseTrigger(handlerName, owner) {
        fieldOf(owner).forEach((slot, index) => {
            if (!slot || slot.isFaceDown) return;
            // Tempesta di Piume delle Arpie (id 292): nega anche gli
            // auto-effetti di Standby/End Phase (es. Bowganian).
            if (isMonsterCardEffectsNegated(owner, slot.card.uid)) return;
            const def = getDefinition(slot.card.id);
            if (def && typeof def[handlerName] === 'function') {
                if (window.FX) FX.playCardActivateCenterScreen(slot.card);
                safeCallCardHandler(slot.card, handlerName, () => def[handlerName](makeContext(owner, { card: slot.card, slot: slot, slotIndex: index })));
            }
        });
        stFieldOf(owner).forEach((slot, index) => {
            if (!slot || slot.isFaceDown) return;
            const def = getDefinition(slot.card.id);
            if (def && typeof def[handlerName] === 'function') {
                if (window.FX) FX.playCardActivateCenterScreen(slot.card);
                safeCallCardHandler(slot.card, handlerName, () => def[handlerName](makeContext(owner, { card: slot.card, slot: slot, index: index, zone: 'st' })));
            }
        });
        // Magia Terreno scoperta (es. Prigione dei Dadi, id 197: "all'inizio
        // della Battle Phase, [reagisce]") — zona mai scansionata qui prima
        // (nessuna carta di questo dataset aveva ancora bisogno di reagire
        // a una fase di gioco da lì), a differenza di findTriggerCandidates
        // (duel-engine.js) che già la considera per onAttackDeclare.
        const fs = fieldSpellOf(owner);
        if (fs && !fs.isFaceDown) {
            const fsDef = getDefinition(fs.card.id);
            if (fsDef && typeof fsDef[handlerName] === 'function') {
                if (window.FX) FX.playCardActivateCenterScreen(fs.card);
                safeCallCardHandler(fs.card, handlerName, () => fsDef[handlerName](makeContext(owner, { card: fs.card, zone: 'fieldSpell' })));
            }
        }
        // "Durante la Standby Phase del tuo AVVERSARIO" (es. L'Occhio
        // della Verità, id 466) — a differenza di onStandbyPhase/
        // onEndPhase qui sopra (sempre chi CONTROLLA la carta, quando
        // vive la SUA fase), questo reagisce dal lato OPPOSTO a chi vive
        // la fase. Handler dedicato, SOLO per la Standby Phase (nessuna
        // carta di questo dataset ne ha bisogno per la End Phase) e SOLO
        // in zona 'st' (nessuna carta di questo dataset ne ha bisogno da
        // mostro).
        if (handlerName === TRIGGER.ON_STANDBY_PHASE) {
            const opponent = opponentOf(owner);
            stFieldOf(opponent).forEach((slot, index) => {
                if (!slot || slot.isFaceDown) return;
                const def = getDefinition(slot.card.id);
                if (def && typeof def.onOpponentStandbyPhase === 'function') {
                    safeCallCardHandler(slot.card, 'onOpponentStandbyPhase', () => def.onOpponentStandbyPhase(makeContext(opponent, { card: slot.card, slot: slot, index: index, zone: 'st', standbyOwner: owner })));
                }
            });
        }
        // "Durante la End Phase del tuo AVVERSARIO" (es. Destiny Board,
        // id 866: "una volta per turno, durante l'End Phase
        // dell'avversario: piazza 1 carta Spirit Message") — stesso
        // identico schema di onOpponentStandbyPhase qui sopra, solo per
        // la End Phase. SOLO in zona 'st' (nessuna carta di questo
        // dataset ne ha bisogno da mostro).
        if (handlerName === TRIGGER.ON_END_PHASE) {
            const opponent = opponentOf(owner);
            stFieldOf(opponent).forEach((slot, index) => {
                if (!slot || slot.isFaceDown) return;
                const def = getDefinition(slot.card.id);
                if (def && typeof def.onOpponentEndPhase === 'function') {
                    safeCallCardHandler(slot.card, 'onOpponentEndPhase', () => def.onOpponentEndPhase(makeContext(opponent, { card: slot.card, slot: slot, index: index, zone: 'st', endPhaseOwner: owner })));
                }
            });
        }
    }

    /**
     * "Durante la tua Main Phase, se questa carta è nel tuo Cimitero:
     * [effetto]" (es. Spada Divina - Lama della Fenice, id 722: bandisci 2
     * Guerrieri dal Cimitero per riprenderla in mano) — a differenza di
     * def.activatableFromGraveyard (SOLO reattivo, consultato dentro una
     * finestra di risposta a un evento specifico, es. Tartaruga
     * Elettromagnetica id 223), questo è PROATTIVO: chiamata da
     * enterMainPhase1() (game-flow.js) all'inizio della propria Main
     * Phase 1, per OGNI carta nel proprio Cimitero che definisce
     * def.canActivateFromGraveyardMainPhase(ctx). Auto-applicata (nessuna
     * scelta UI, stesso stile "si applica da sola se possibile" di molte
     * altre clausole "puoi" in questo file) — un solo rispondente
     * automatico per chiamata, il primo eleggibile.
     */
    function fireOwnMainPhase1GraveyardActivations(owner) {
        const grave = graveyardOf(owner);
        const index = grave.findIndex((card) => {
            const def = getDefinition(card.id);
            return def && typeof def.canActivateFromGraveyardMainPhase === 'function' && typeof def.activateFromGraveyardMainPhase === 'function'
                && def.canActivateFromGraveyardMainPhase(makeContext(owner, { card: card, zone: 'graveyard' }));
        });
        if (index === -1) return;
        const card = grave[index];
        const def = getDefinition(card.id);
        def.activateFromGraveyardMainPhase(makeContext(owner, { card: card, zone: 'graveyard' }));
    }

    /**
     * Bonus ATK/DEF valido SOLO per il calcolo di QUESTA battaglia (Damage
     * Step), non persistente come gameState.atkDefBonus — es. Soldati
     * Insetto del Cielo, che guadagna 1000 ATK solo se attacca un mostro
     * VENTO, solo per quello scontro. `role` è 'attacker' o 'defender' dal
     * punto di vista di `card`; `opponentCard` è l'altro mostro coinvolto
     * (null per un attacco diretto, dove non c'è "l'altro mostro").
     */
    function getDamageStepBonus(card, opponentCard, role) {
        if (!card) return { atk: 0, def: 0 };
        let totalAtk = 0;
        let totalDef = 0;
        // Chi controlla `card` ADESSO — utile a un damageStepBonus che deve
        // fare più di un semplice calcolo puro (es. Iniezione della Fata
        // Giglio id 889: "puoi PAGARE 2000 LP per +3000 ATK solo in questo
        // calcolo"), quando serve sapere DI CHI sono i Life Points da
        // scalare. Nessuna carta lo usava prima di id 889 (tutte pure
        // funzioni di calcolo, vedi Soldati Insetto del Cielo/Soldato
        // Cinetico/Metalmorfosi), ma è un arricchimento generico dello
        // stesso ctx condiviso, non un parametro ad hoc per una sola carta.
        const owner = ['player', 'bot'].find((o) => fieldOf(o).some((s) => s && s.card.uid === card.uid)) || null;
        // Bonus "usa e getta", concesso da un'altra carta (non da un Equip
        // né dalla propria definizione) SOLO per questo Damage Step, es.
        // Fuoco di Copertura (id 852): guadagni una tantum, decisi al
        // momento della dichiarazione d'attacco, che vanno consumati subito
        // qui (non a fine turno come gameState.temporaryAtkDefBonus).
        const oneShot = gameState.damageStepOnlyBonusFor && gameState.damageStepOnlyBonusFor[card.uid];
        if (oneShot) {
            totalAtk += oneShot.atk || 0;
            totalDef += oneShot.def || 0;
            delete gameState.damageStepOnlyBonusFor[card.uid];
        }
        const def = getDefinition(card.id);
        if (def && typeof def.damageStepBonus === 'function') {
            const result = def.damageStepBonus({ card: card, opponentCard: opponentCard || null, role: role, owner: owner }) || {};
            totalAtk += result.atk || 0;
            totalDef += result.def || 0;
        }
        // Anche una Carta Equipaggiamento agganciata a `card` può avere un
        // proprio damageStepBonus (es. Metalmorfosi id 376: "+ATK pari a
        // metà di quello del bersaglio, solo in questo Damage Step") — non
        // sappiamo a priori il proprietario di `card`, quindi la cerchiamo
        // su entrambi gli stField (al massimo 5 caselle a testa, costo
        // trascurabile).
        ['player', 'bot'].forEach((owner) => {
            stFieldOf(owner).forEach((slot) => {
                if (!slot || slot.isFaceDown) return;
                const eqDef = getDefinition(slot.card.id);
                if (!eqDef || !eqDef.isEquip || slot.card.equippedToUid !== card.uid) return;
                if (typeof eqDef.damageStepBonus !== 'function') return;
                const result = eqDef.damageStepBonus({ card: slot.card, opponentCard: opponentCard || null, role: role, owner: owner }) || {};
                totalAtk += result.atk || 0;
                totalDef += result.def || 0;
            });
        });
        return { atk: totalAtk, def: totalDef };
    }

    /**
     * ATK/DEF "effettivo" di una carta in campo: il valore base della
     * carta più l'eventuale bonus continuo scritto in gameState.atkDefBonus
     * da un effetto static() (vedi recomputeStaticEffects qui sopra) — es.
     * "+300 ATK per ogni X sul Terreno", ricalcolato ad ogni render. Usata
     * sia dal calcolo battaglia (resolveBattleDamage in actions.js) sia dal
     * rendering (card-renderer.js), così un simile buff è vero in battaglia
     * e non solo mostrato a schermo. Sicura da chiamare anche fuori da un
     * duello attivo — es. su Cartoteca, dove card.uid è assente e
     * `gameState` non esiste nemmeno come variabile globale (game-flow.js
     * non è caricato lì): in quel caso ricade sempre sul valore base.
     */
    function getEffectiveAtk(card) {
        if (!card || card.type !== 'monster') return card ? card.attack : 0;
        if (card.uid === undefined || typeof gameState === 'undefined') return card.attack;
        const bonus = gameState.atkDefBonus && gameState.atkDefBonus[card.uid];
        const temp = gameState.temporaryAtkDefBonus && gameState.temporaryAtkDefBonus[card.uid];
        // 395 — Orgoth l'Implacabile: bonus "fino alla fine del turno
        // dell'avversario" — store SEPARATO da gameState.atkDefBonus
        // apposta, perché quello viene azzerato e ricostruito da zero ad
        // OGNI render da recomputeStaticEffects() (solo per effetti
        // CONTINUI il cui static() lo riscrive ogni volta): un bonus
        // one-shot come questo ci sparirebbe al render successivo. Vedi
        // gameState.orgothActiveUidsFor/orgothAtkDefBonus (game-flow.js/
        // changeTurn) per come viene concesso e revocato.
        const orgoth = gameState.orgothAtkDefBonus && gameState.orgothAtkDefBonus[card.uid];
        // Trappola Inversa (id 558): "fino alla End Phase, inverti tutte le
        // modifiche ad ATK/DEF sul Terreno" — le modifiche per
        // moltiplicazione/divisione non sono qui (mai state rappresentate
        // come bonus additivo), quindi restano correttamente non toccate.
        const sign = gameState.reverseAtkDefBonusUntilEndOfTurn ? -1 : 1;
        return card.attack + sign * ((bonus ? (bonus.atk || 0) : 0) + (temp ? (temp.atk || 0) : 0) + (orgoth ? (orgoth.atk || 0) : 0));
    }

    function getEffectiveDef(card) {
        if (!card || card.type !== 'monster') return card ? card.defense : 0;
        if (card.uid === undefined || typeof gameState === 'undefined') return card.defense;
        const bonus = gameState.atkDefBonus && gameState.atkDefBonus[card.uid];
        const temp = gameState.temporaryAtkDefBonus && gameState.temporaryAtkDefBonus[card.uid];
        const orgoth = gameState.orgothAtkDefBonus && gameState.orgothAtkDefBonus[card.uid];
        const sign = gameState.reverseAtkDefBonusUntilEndOfTurn ? -1 : 1;
        return card.defense + sign * ((bonus ? (bonus.def || 0) : 0) + (temp ? (temp.def || 0) : 0) + (orgoth ? (orgoth.def || 0) : 0));
    }

    /**
     * Cerca tra i mostri nell'Extra Deck di `owner` quelli per cui sono
     * disponibili TUTTI i Materiali da Fusione richiesti (def.fusionMaterials,
     * un array di ID carta — vedi la sezione "EVOCAZIONE FUSIONE" in
     * card-effects.js), sommando mano + Terreno scoperto. Torna un array
     * di { extraDeckIndex, card, materialLocations }, pronto per
     * ACTIONS.fusionSummon (vedi sopra) — vuoto se nessun mostro è
     * fondibile ora.
     * SEMPLIFICAZIONE: un materiale nominato per ID basta che sia
     * presente, senza altre condizioni (es. "Livello 4+"); preferisce
     * prendere ogni materiale dalla MANO prima che dal Terreno, per non
     * smontare un mostro già in gioco se non serve.
     */
    function getFusableExtraDeckMonsters(owner) {
        const extraDeck = owner === 'player' ? gameState.playerExtraDeck : gameState.botExtraDeck;
        if (!extraDeck || extraDeck.length === 0) return [];
        const hand = handOf(owner);
        const field = fieldOf(owner);
        const results = [];
        extraDeck.forEach((extraCard, extraDeckIndex) => {
            const def = getDefinition(extraCard.id);
            if (!def || !Array.isArray(def.fusionMaterials) || def.fusionMaterials.length === 0) return;
            const usedHandIdx = new Set();
            const usedFieldIdx = new Set();
            const materialLocations = [];
            // Versago il Distruttore (id 500): "può essere usato come
            // sostituto di 1 QUALSIASI Materiale da Fusione nominato,
            // purché gli altri materiali siano corretti" — un solo
            // Versago per Fusione (versagoUsed), controllato SOLO se il
            // materiale richiesto non è già disponibile per nome. La
            // consumazione vera e propria (fusionSummon qui sopra) è già
            // del tutto generica sulla zona/indice: non serve toccarla,
            // solo estendere qui la ricerca del materiale.
            let versagoUsed = false;
            const ok = def.fusionMaterials.every((materialId) => {
                const handIdx = hand.findIndex((c, i) => c.id === materialId && !usedHandIdx.has(i));
                if (handIdx !== -1) {
                    usedHandIdx.add(handIdx);
                    materialLocations.push({ zone: 'hand', index: handIdx });
                    return true;
                }
                const fieldIdx = field.findIndex((s, i) => s && !s.isFaceDown && s.card.id === materialId && !usedFieldIdx.has(i));
                if (fieldIdx !== -1) {
                    usedFieldIdx.add(fieldIdx);
                    materialLocations.push({ zone: 'monster', index: fieldIdx });
                    return true;
                }
                if (!versagoUsed) {
                    const versagoHandIdx = hand.findIndex((c, i) => c.id === 500 && !usedHandIdx.has(i));
                    if (versagoHandIdx !== -1) {
                        usedHandIdx.add(versagoHandIdx);
                        materialLocations.push({ zone: 'hand', index: versagoHandIdx });
                        versagoUsed = true;
                        return true;
                    }
                    const versagoFieldIdx = field.findIndex((s, i) => s && !s.isFaceDown && s.card.id === 500 && !usedFieldIdx.has(i));
                    if (versagoFieldIdx !== -1) {
                        usedFieldIdx.add(versagoFieldIdx);
                        materialLocations.push({ zone: 'monster', index: versagoFieldIdx });
                        versagoUsed = true;
                        return true;
                    }
                }
                return false;
            });
            if (ok) results.push({ extraDeckIndex, card: extraCard, materialLocations });
        });
        return results;
    }

    /**
     * Vero se le Trappole del giocatore indicato sono negate — sia da un
     * effetto continuo ricalcolato ogni render (es. Jinzo avversario, via
     * gameState.trapsNegatedFor) sia da un effetto "fino a fine turno" di
     * una Magia/Trappola già risolta e andata al Cimitero (es. Scintilla
     * dell'Estasi Triangolare, id 789, via
     * gameState.trapsNegatedUntilEndOfTurnFor) — quest'ultimo azzerato in
     * enterEndPhase() (game-flow.js), non ricalcolato ad ogni render.
     */
    function areTrapsNegatedFor(owner) {
        return !!(gameState.trapsNegatedFor && gameState.trapsNegatedFor[owner])
            || !!(gameState.trapsNegatedUntilEndOfTurnFor && gameState.trapsNegatedUntilEndOfTurnFor[owner]);
    }

    /** Vero se le Magie del giocatore indicato sono negate da un effetto continuo (es. Cancella Magie). */
    function areSpellsNegatedFor(owner) {
        return !!(gameState.spellsNegatedFor && gameState.spellsNegatedFor[owner]);
    }

    /**
     * Vero se Ondata Gelida (id 159) è attiva per ANCORA CHIUNQUE (blocca
     * ENTRAMBI i giocatori, non solo l'avversario di chi l'ha attivata) —
     * gameState.coldWaveActiveFor, che NON si azzera da solo ad ogni
     * cambio turno come trapsNegatedUntilEndOfTurnFor/
     * monsterEffectsNegatedUntilEndOfTurnFor qui sopra, ma resta finché
     * non torna il turno di chi l'ha attivata (vedi il controllo dedicato
     * in changeTurn(), game-flow.js).
     */
    function isColdWaveActive() {
        return !!(gameState.coldWaveActiveFor && (gameState.coldWaveActiveFor.player || gameState.coldWaveActiveFor.bot));
    }

    /**
     * Vero se gli effetti dei Mostri del giocatore indicato sono negati
     * "fino a fine turno" (es. Tempesta di Piume delle Arpie, id 292) —
     * stesso spirito di gameState.trapsNegatedUntilEndOfTurnFor qui sopra
     * (azzerato in enterEndPhase(), game-flow.js), ma per gli effetti
     * Mostro invece che Trappola. SEMPLIFICAZIONE dichiarata: copre solo
     * gli effetti Ignition (canActivate/activateCard zona 'monster') e
     * gli auto-effetti "reagisce a se stesso" (Flip, Normal/Special
     * Summon, dichiarazione d'attacco, distruzione, cambio Posizione,
     * Standby/End Phase) — non le reazioni incrociate più rare come
     * Slifer che reagisce all'Evocazione di un mostro NEMICO
     * (onEnemyMonsterSummoned): quel ramo di fireTrigger non viene
     * toccato per non rischiare regressioni nella sua logica già
     * consolidata.
     */
    function areMonsterEffectsNegatedFor(owner) {
        return !!(gameState.monsterEffectsNegatedUntilEndOfTurnFor && gameState.monsterEffectsNegatedUntilEndOfTurnFor[owner]);
    }

    /**
     * Vero se GLI EFFETTI DI QUESTA CARTA (uid) sono negati — o perché
     * l'intero proprietario lo è (areMonsterEffectsNegatedFor qui sopra,
     * es. Tempesta di Piume delle Arpie) o perché QUESTA carta
     * specifica lo è (es. Spada Sigillante di Orichalcos, id 396, sul
     * mostro equipaggiato — gameState.monsterEffectsNegatedUidsFor,
     * ricalcolato ogni render come piercingUidsFor). Usata in ogni punto
     * in cui un effetto Mostro può scattare (vedi areMonsterEffectsNegatedFor
     * per l'elenco completo), al posto della sola areMonsterEffectsNegatedFor.
     */
    function isMonsterCardEffectsNegated(owner, uid) {
        return areMonsterEffectsNegatedFor(owner)
            || !!(gameState.monsterEffectsNegatedUidsFor && gameState.monsterEffectsNegatedUidsFor[owner] && gameState.monsterEffectsNegatedUidsFor[owner].has(uid));
    }

    /** Vero se i mostri di Tipo `race` di `owner` infliggono danno perforante grazie a un effetto continuo (es. Furia del Drago, id 212). */
    function hasRacePiercing(owner, race) {
        return !!(gameState.piercingRacesFor && gameState.piercingRacesFor[owner] && gameState.piercingRacesFor[owner].has(race));
    }

    /** Vero se la carta (uid) del giocatore indicato ha danno perforante concesso da un effetto (es. Impatto Meteora Fatato). */
    function hasUidPiercing(owner, uid) {
        return !!(gameState.piercingUidsFor && gameState.piercingUidsFor[owner] && gameState.piercingUidsFor[owner].has(uid));
    }

    /** Vero se i mostri coperti del giocatore indicato sono resi visibili da un effetto continuo (es. Spada Rivelatrice). */
    function isRevealedFor(owner) {
        return !!(gameState.revealedFor && gameState.revealedFor[owner]);
    }

    /** Vero se i mostri del giocatore indicato non possono dichiarare attacchi (es. Spada Rivelatrice). */
    function cannotAttack(owner) {
        return !!(gameState.cannotAttackFor && gameState.cannotAttackFor[owner]);
    }

    // ============================================================
    // Attivazione manuale: Magie Normali dalla mano, Trappole Set (dal
    // secondo turno in poi) e futuri effetti Ignition dei mostri.
    // Punto d'ingresso unico richiamato dall'UI (actions.js).
    // ============================================================
    function canActivate(owner, zone, index) {
        const card = zone === 'hand' ? handOf(owner)[index]
            : zone === 'monster' ? (fieldOf(owner)[index] && !fieldOf(owner)[index].isFaceDown && fieldOf(owner)[index].card)
            : zone === 'fieldSpell' ? (fieldSpellOf(owner) && fieldSpellOf(owner).card)
            : stFieldOf(owner)[index] && stFieldOf(owner)[index].card;
        if (!card) return false;
        // Xing Zhen Hu (id 708): blocca l'attivazione di CARTE SPECIFICHE
        // (per uid), non di un'intera zona/proprietario come gli altri
        // divieti qui sotto — controllo per uid invece che per owner/tipo.
        if (gameState.blockedCardUids && gameState.blockedCardUids.has(card.uid)) return false;
        // Fata della Primavera (id 728)/Trapano Ingranaggio Antico (id
        // 842): come blockedCardUids qui sopra, ma "solo in questo turno"
        // invece che permanente — set separato, azzerato in changeTurn()
        // (game-flow.js), così una stessa carta può tornare attivabile al
        // turno successivo senza doverla rimuovere esplicitamente da qui.
        if (gameState.blockedCardUidsThisTurn && gameState.blockedCardUidsThisTurn.has(card.uid)) return false;
        const def = getDefinition(card.id);
        if (!def || typeof def.activate !== 'function') return false;
        // Una Trappola non si può MAI attivare direttamente dalla mano: per
        // regola va prima Set coperta sul Terreno (zona 'st') e solo da lì,
        // a partire dal turno SUCCESSIVO a quello in cui è stata Set,
        // diventa attivabile (vedi il controllo su slot.setOnTurn più
        // sotto). Nessuna carta di questo dataset fa eccezione.
        if (zone === 'hand' && card.type === 'trap') return false;
        // Una Magia negata (es. Cancellatore di Magie, id 455) non si può
        // attivare da NESSUNA zona — a differenza del divieto sulle
        // Trappole/Magie Set qui sotto (solo per zone 'st'/'fieldSpell'),
        // il percorso più comune per una Magia in questo motore è
        // attivarla DIRETTAMENTE dalla mano (vedi promptHandSpellActivation
        // in actions.js), quindi questo controllo va fatto qui, non solo
        // dentro il blocco st/fieldSpell qui sotto.
        if (card.type === 'spell' && areSpellsNegatedFor(owner)) return false;
        // Ondata Gelida (id 159): "né tu né il tuo avversario potete
        // giocare o Set Magie/Trappole" — blocca ENTRAMBI i lati, qui
        // PRIMA di qualunque zona (copre sia il cast diretto dalla mano
        // sia il Set), a differenza di areSpellsNegatedFor/
        // areTrapsNegatedFor qui sopra/sotto (solo il lato negato).
        if ((card.type === 'spell' || card.type === 'trap') && isColdWaveActive()) return false;
        // "Quando questa carta viene Evocata Normalmente: nessuna
        // Trappola può essere attivata" (es. Manta Perforante Strisciante,
        // id 693) — a differenza di areTrapsNegatedFor (Jinzo, CONTINUO,
        // ricalcolato ogni render da un effetto sul campo), questo è un
        // blocco PER TURNO impostato una tantum: gameState.noTrapActivationFor,
        // resettato in changeTurn() (game-flow.js).
        if (card.type === 'trap' && gameState.noTrapActivationFor && gameState.noTrapActivationFor[owner]) return false;
        // Stesso blocco ma per le Magie (es. famiglia Ingranaggio Antico/
        // Ancient Gear: "se questa carta attacca, l'avversario non può
        // attivare Magie/Trappole fino a fine Damage Step" — qui
        // approssimato a "per il resto del turno", vedi
        // gameState.noSpellActivationFor).
        if (card.type === 'spell' && gameState.noSpellActivationFor && gameState.noSpellActivationFor[owner]) return false;
        if (zone === 'st' || zone === 'fieldSpell') {
            const slot = zone === 'fieldSpell' ? fieldSpellOf(owner) : stFieldOf(owner)[index];
            // Una Magia/Trappola CONTINUA già scoperta è già attiva e resta
            // in campo a fare il suo effetto tramite static()/onXPhase():
            // non è mai "ri-attivabile" cliccandola di nuovo — altrimenti
            // ri-eseguirebbe activate() da capo (es. pagherebbe di nuovo un
            // costo in Life Points come Mondo dei Toon, id 487). Una Magia
            // Terreno (zone 'fieldSpell') è sempre "continua" per natura,
            // anche senza il flag def.continuous — vedi lo stesso ragionamento
            // in activateCard più sotto.
            // def.repeatableWhileContinuous (es. Offerta Suprema id 559):
            // eccezione puntuale al blocco qui sopra per una Magia/Trappola
            // Continua il cui testo reale concede un'abilità RIPETIBILE
            // (non un'unica attivazione) finché resta scoperta in campo —
            // a differenza di un normale Continuo, activate() qui va
            // richiamata di nuovo ad ogni uso, quindi il blocco standard
            // "già attiva, non ri-attivabile" non si applica a questa carta.
            if ((def.continuous || zone === 'fieldSpell') && !slot.isFaceDown && !def.repeatableWhileContinuous) return false;
            // Regola classica: una Trappola Set non si può attivare nello
            // stesso turno in cui è stata piazzata. Una Magia Set invece
            // può essere attivata subito (qui semplifichiamo il "gioca la
            // Magia direttamente dalla mano" con "Set + attiva quando
            // vuoi", ma solo le Trappole hanno il vincolo del turno).
            if (card.type === 'trap' && slot.setOnTurn === gameState.turn) return false;
            if (card.type === 'trap' && areTrapsNegatedFor(owner)) return false;
        }
        // Effetto Ignition di un mostro (es. Soldato Cannone, Tartaruga
        // Catapulta): una volta per turno PER CARTA (uid), come da testo
        // reale di ogni carta che lo usa — resettato ad ogni cambio turno,
        // vedi gameState.usedIgnitionThisTurn in resetGameState/changeTurn
        // (game-flow.js).
        if (zone === 'monster' && gameState.usedIgnitionThisTurn && gameState.usedIgnitionThisTurn[card.uid]) return false;
        // Occhio di Gorgone (id 271): un mostro in Posizione di Difesa non
        // può attivare il proprio effetto Ignition finché il flag resta
        // attivo (vedi anche recomputeStaticEffects più sotto per gli
        // effetti CONTINUI, negati allo stesso modo).
        if (zone === 'monster' && gameState.defenseMonsterEffectsNegated && fieldOf(owner)[index] && fieldOf(owner)[index].position === 'defense') return false;
        // Tempesta di Piume delle Arpie (id 292): "fino a fine turno,
        // annulla tutti gli effetti dei mostri che il tuo avversario
        // attiva" — blocca anche l'effetto Ignition, come i due controlli
        // qui sopra.
        if (zone === 'monster' && isMonsterCardEffectsNegated(owner, card.uid)) return false;
        // Una Magia Continua attivata DIRETTAMENTE dalla mano (non da un Set
        // preesistente) deve comunque finire scoperta su uno slot Magia/
        // Trappola libero (vedi activateCard più sotto): se il Terreno è
        // pieno, semplicemente non si può attivare adesso. Una Magia Terreno
        // NON ha bisogno di uno slot libero: ha una zona tutta sua e
        // attivarne una nuova sostituisce semplicemente quella vecchia.
        if (zone === 'hand' && def.continuous && card.subtype !== 'field' && findFreeSTSlot(owner) === -1) return false;
        const ctx = makeContext(owner, { card: card, zone: zone, index: index });
        return typeof def.canActivate === 'function' ? !!def.canActivate(ctx) : true;
    }

    function activateCard(owner, zone, index, extra) {
        if (!canActivate(owner, zone, index)) return false;
        const card = zone === 'hand' ? handOf(owner)[index]
            : zone === 'monster' ? fieldOf(owner)[index].card
            : zone === 'fieldSpell' ? fieldSpellOf(owner).card
            : stFieldOf(owner)[index].card;
        const def = getDefinition(card.id);

        addToLog(`✨ ${owner === 'player' ? 'Hai' : 'Il bot ha'} attivato ${zone === 'monster' ? `l'effetto di ${card.name}` : card.name}!`);
        // Comparsa grande a centro schermo (~2s, pulse + suono + fade) per
        // OGNI attivazione — Magia, Trappola o effetto Ignition di un
        // mostro — invece del solo glow sulla carta in campo di prima:
        // vedi playCardActivateCenterScreen in effects.js. activatedAt
        // (sotto, passato dentro initialLink a openActivationWindow) è il
        // momento ESATTO in cui questo pulse è partito: resolveChain() lo
        // usa per aspettare il resto della sua durata (FX.
        // ACTIVATE_CENTER_DURATION_MS) prima di chiamare davvero
        // def.activate(ctx) — altrimenti l'effetto si risolverebbe a metà
        // pulse, invece che dopo, illeggibile soprattutto con più
        // attivazioni in Chain.
        if (window.FX) FX.playCardActivateCenterScreen(card);
        const activatedAt = Date.now();

        // Le Magie Normali e le Trappole si attivano E si scartano subito
        // al Cimitero. Le Magie/Trappole CONTINUE invece (`def.continuous
        // === true`, es. Spada Rivelatrice) restano piazzate e scoperte
        // sul Terreno: il loro effetto si applica ad ogni render tramite
        // static()/recomputeStaticEffects(), esattamente come un mostro
        // con effetto continuo. Se l'attivazione parte dalla MANO (non da
        // un Set preesistente sul Terreno), una Continua deve comunque
        // finire scoperta su uno slot Magia/Trappola libero — non può
        // sparire nel Cimitero come farebbe una Magia Normale — quindi
        // `finalZone`/`finalIndex` seguono dove la carta finisce DAVVERO,
        // non da dove è partita, così def.activate(ctx) sotto trova la
        // carta al posto giusto (es. id8 la cerca via ctx.index).
        let finalZone = zone;
        let finalIndex = index;
        if (zone === 'monster') {
            // Un effetto Ignition NON manda la carta al Cimitero né la
            // muove: il mostro resta esattamente dov'è, scoperto sul
            // Terreno — solo il segno "già usato in questo turno" cambia.
            gameState.usedIgnitionThisTurn = gameState.usedIgnitionThisTurn || {};
            gameState.usedIgnitionThisTurn[card.uid] = true;
        } else if (card.subtype === 'field' && zone === 'hand') {
            // Una Magia Terreno ha una zona tutta sua (una sola carta, non
            // un array di 5 come stFieldOf) — attivarne una nuova mentre
            // ce n'è già una scoperta manda quella vecchia al Cimitero,
            // come da regola vera, invece di cercare uno slot libero.
            const fieldKey = owner === 'player' ? 'playerFieldSpell' : 'botFieldSpell';
            const existing = gameState[fieldKey];
            if (existing) {
                graveyardOf(owner).push(existing.card);
                addToLog(`🌍 ${existing.card.name} lascia il Terreno, sostituita da ${card.name}.`);
            }
            handOf(owner).splice(index, 1);
            gameState[fieldKey] = { card: card, isFaceDown: false, setOnTurn: gameState.turn };
            finalZone = 'fieldSpell';
            finalIndex = -1;
        } else if (card.subtype === 'field' && zone === 'fieldSpell') {
            // Era già Set coperta sulla sua zona: si scopre sul posto.
            gameState[owner === 'player' ? 'playerFieldSpell' : 'botFieldSpell'].isFaceDown = false;
        } else if (def.continuous && zone === 'st') {
            stFieldOf(owner)[index].isFaceDown = false;
        } else if (def.continuous && zone === 'hand') {
            const freeSlot = findFreeSTSlot(owner);
            handOf(owner).splice(index, 1);
            stFieldOf(owner)[freeSlot] = { card: card, isFaceDown: false, setOnTurn: gameState.turn };
            finalZone = 'st';
            finalIndex = freeSlot;
        } else if (zone === 'hand') {
            handOf(owner).splice(index, 1);
            graveyardOf(owner).push(card);
        } else {
            stFieldOf(owner)[index] = null;
            graveyardOf(owner).push(card);
        }

        const ctx = makeContext(owner, Object.assign({ card: card, zone: finalZone, index: finalIndex }, extra || {}));

        // NUOVO (Chain System): l'effetto non si risolve più qui subito —
        // la carta è già stata "pagata"/spostata di zona qui sopra (come da
        // regola vera), ma diventa il fondo di una Chain che apre una
        // finestra di priorità per l'avversario (e per chi ha attivato, se
        // l'avversario a sua volta incatena) PRIMA di risolversi. Vedi
        // openActivationWindow più sopra. def.activate(ctx) e
        // TRIGGER.ON_CARD_ACTIVATED (es. Signore del Rosso) partono dentro
        // resolveChain(), non più qui.
        openActivationWindow({
            owner: owner,
            card: card,
            handlerName: 'activate',
            def: def,
            ctx: ctx,
            isManualActivation: true,
            alreadyAnnounced: true, // log/FX di attivazione già fatti qui sopra
            activatedAt: activatedAt
        }, () => finishActivateCard(owner, card, zone, index, extra));

        return true;
    }

    /**
     * Completa activateCard() dopo che la Chain aperta da
     * openActivationWindow si è chiusa e risolta: broadcast di rete,
     * refresh UI, eventuale animazione di pescata differita — stesso
     * ordine di prima, solo spostato a dopo la risoluzione della Chain
     * invece che subito dopo def.activate(ctx).
     */
    function finishActivateCard(owner, card, zone, index, extra) {
        if (window.MP_broadcast && !window.MP_applyingRemote) {
            window.MP_broadcast(Object.assign({ kind: 'activate', owner: owner, cardId: card.id, zone: zone, index: index }, extra || {}));
        }

        if (typeof updateUI === 'function') updateUI();
        // Solo ORA, a mano già ridisegnata da updateUI() qui sopra, è sicuro
        // animare un'eventuale pescata scatenata da questa carta (es. Vaso
        // dell'Avidità) — vedi il commento su ACTIONS.drawCards più sopra.
        if (gameState._pendingDrawAnimation && typeof animateEffectDraw === 'function') {
            const pending = gameState._pendingDrawAnimation;
            gameState._pendingDrawAnimation = null;
            animateEffectDraw(pending.owner, pending.count);
        }
    }

    // ============================================================
    // ============================================================
    // Multiplayer Avanzato — resync di stato e checksum anti-desync (vedi
    // js/multiplayer/multiplayer.js, che le usa dopo una riconnessione o quando i due
    // client sembrano disallineati). Nessuna delle due tocca gameState:
    // sono pure funzioni di lettura.
    // ============================================================

    /**
     * Fotografa il Terreno/Cimitero/LP di `owner` così come sono ORA, da
     * mandare all'avversario (vedi js/multiplayer/multiplayer.js) perché lo adotti
     * come la propria vista del lato "bot" — usata dopo una
     * riconnessione (per recuperare le azioni perse) o su un
     * disallineamento rilevato dal checksum qui sotto. Stesso livello di
     * fiducia già in uso nel protocollo Multiplayer esistente (vedi
     * applyRemoteSummon/applyRemoteSpellTrap in js/multiplayer/multiplayer.js: le
     * carte scoperte O COPERTE del proprio Terreno vengono già mandate
     * per intero all'avversario oggi, che si limita a non mostrarle se
     * coperte — nessuna vera "informazione nascosta a livello di dati" in
     * questo protocollo). L'UNICA eccezione resta la mano: solo il
     * CONTEGGIO viene mandato, mai il contenuto, esattamente come oggi
     * (vedi gameState.botHand, popolata solo con segnaposto).
     */
    function serializePublicState(owner) {
        return {
            monsterField: fieldOf(owner).map((slot) => slot ? {
                card: slot.card, position: slot.position, isFaceDown: slot.isFaceDown,
                hasAttacked: slot.hasAttacked, canChangePosition: slot.canChangePosition
            } : null),
            stField: stFieldOf(owner).map((slot) => slot ? {
                card: slot.card, isFaceDown: slot.isFaceDown, setOnTurn: slot.setOnTurn
            } : null),
            fieldSpell: (() => {
                const fs = fieldSpellOf(owner);
                return fs ? { card: fs.card, isFaceDown: fs.isFaceDown, setOnTurn: fs.setOnTurn } : null;
            })(),
            graveyard: graveyardOf(owner).slice(),
            handCount: handOf(owner).length,
            lp: gameState[lpKeyOf(owner)],
            extraDeckCount: (owner === 'player' ? gameState.playerExtraDeck : gameState.botExtraDeck || []).length,
            turn: gameState.turn,
            phase: gameState.phase,
            currentPlayer: gameState.currentPlayer
        };
    }

    /**
     * "Impronta" sintetica dello stato attuale del duello — non un vero
     * hash crittografico, solo un confronto rapido per accorgersi che i
     * due client si sono disallineati (es. per il rischio di desync della
     * Chain in Multiplayer già segnalato in maxChainRounds() più sopra).
     * COSTRUITA IN MODO SIMMETRICO (i due lati ordinati, non "player poi
     * bot"): ogni client chiama 'player' se stesso e 'bot' l'avversario,
     * quindi un confronto diretto "player-vs-player" fallirebbe sempre
     * anche a stato perfettamente allineato — ordinando i due lati prima
     * di unirli, il risultato non dipende da quale fisico giocatore
     * ciascun client chiama "player".
     */
    function computeStateChecksum() {
        // Difensivo (mai lanciare): questa funzione gira dentro
        // window.MP_broadcast (vedi il wrapping in js/multiplayer/multiplayer.js) ad
        // OGNI mossa inviata — un'eccezione qui bloccherebbe l'invio di
        // qualunque azione, non solo il calcolo del checksum. Se una zona
        // non è (ancora) un array valido, conta 0 invece di far esplodere
        // tutto il resto del protocollo.
        const safeLength = (arr) => (Array.isArray(arr) ? arr.filter(Boolean).length : 0);
        const sideFingerprint = (owner) => [
            gameState[lpKeyOf(owner)] ?? 0,
            safeLength(fieldOf(owner)),
            safeLength(stFieldOf(owner)),
            (graveyardOf(owner) || []).length,
            (handOf(owner) || []).length
        ].join(',');
        const sides = [sideFingerprint('player'), sideFingerprint('bot')].sort();
        return [...sides, gameState.turn, gameState.phase].join('|');
    }

    // ============================================================
    // Rete di sicurezza globale: un errore JS non intercettato da nessuno
    // dei punti protetti da safeCallCardHandler (o generato altrove, fuori
    // da questo file) non deve più bloccare la pagina in silenzio — con
    // zero indicazione all'utente che qualcosa è andato storto, solo un
    // duello che smette di rispondere ai click. NON sopprime l'errore
    // (niente event.preventDefault(): resta comunque visibile in console
    // e a qualunque strumento di test che lo intercetti, es. Playwright
    // pageerror) — aggiunge solo un avviso leggibile nel Game Log, se
    // questa pagina ne ha uno (duel-engine.js è caricato anche da pagine
    // senza duello vero, es. cartoteca.html/crea-carta.html).
    // ============================================================
    window.addEventListener('error', (event) => {
        console.error('[Errore non gestito]', event.error || event.message);
        if (typeof addToLog === 'function') {
            addToLog('⚠️ Si è verificato un errore imprevisto. Il duello potrebbe non rispondere più correttamente: ricarica la pagina se necessario.');
        }
    });
    window.addEventListener('unhandledrejection', (event) => {
        // "AbortError: Transition was skipped" — rifiuto standard e
        // innocuo della View Transitions API (@view-transition {
        // navigation: auto; } in ogni pagina) quando si naviga via da
        // questa pagina prima che la sua transizione finisca (es. il
        // pulsante Abbandona/Indietro durante un duello) — MAI un vero
        // bug del motore, stesso filtro di js/ui/error-recovery.js.
        const reason = event.reason;
        if (reason instanceof DOMException && reason.name === 'AbortError' && /transition was skipped/i.test(reason.message || '')) {
            return;
        }
        console.error('[Promise non gestita]', event.reason);
        if (typeof addToLog === 'function') {
            addToLog('⚠️ Si è verificato un errore imprevisto in un\'operazione asincrona. Ricarica la pagina se il duello smette di rispondere.');
        }
    });

    // ============================================================
    // Esportazione dell'API pubblica.
    // ============================================================
    window.DuelEngine = {
        TRIGGER: TRIGGER,
        register: register,
        getDefinition: getDefinition,
        fireTrigger: fireTrigger,
        makeContext: makeContext,
        recomputeStaticEffects: recomputeStaticEffects,
        firePhaseTrigger: firePhaseTrigger,
        notifyOwnMonsterSentToGraveyard: notifyOwnMonsterSentToGraveyard,
        notifySacrificedForTribute: notifySacrificedForTribute,
        redirectToBanishIfFlagged: redirectToBanishIfFlagged,
        tryRedirectUnionDestroy: tryRedirectUnionDestroy,
        hasUnionProtector: hasUnionProtector,
        getDamageStepBonus: getDamageStepBonus,
        canSpecialSummonFromHand: canSpecialSummonFromHand,
        trySpecialSummonFromHand: trySpecialSummonFromHand,
        getBanishFusableExtraDeckMonsters: getBanishFusableExtraDeckMonsters,
        banishFusionSummon: banishFusionSummon,
        processTemporaryBanishmentReturns: processTemporaryBanishmentReturns,
        processDelayedHandReturns: processDelayedHandReturns,
        processDelayedGraveyardRevivals: processDelayedGraveyardRevivals,
        processPendingBlastSphereDetonations: processPendingBlastSphereDetonations,
        processKiseitaiLifeGain: processKiseitaiLifeGain,
        processNoDamageExpiry: processNoDamageExpiry,
        processSelfDestructAtOpponentEndPhase: processSelfDestructAtOpponentEndPhase,
        fireOwnMainPhase1GraveyardActivations: fireOwnMainPhase1GraveyardActivations,
        processTemporaryControlReturns: processTemporaryControlReturns,
        getEffectiveAtk: getEffectiveAtk,
        getEffectiveDef: getEffectiveDef,
        getFusableExtraDeckMonsters: getFusableExtraDeckMonsters,
        isSTZoneLocked: isSTZoneLocked,
        findFreeSTSlot: findFreeSTSlot,
        isNecrovalleyOnField: isNecrovalleyOnField,
        areTrapsNegatedFor: areTrapsNegatedFor,
        areSpellsNegatedFor: areSpellsNegatedFor,
        hasRacePiercing: hasRacePiercing,
        hasUidPiercing: hasUidPiercing,
        cannotAttack: cannotAttack,
        isRevealedFor: isRevealedFor,
        canActivate: canActivate,
        activateCard: activateCard,
        openDrawResponseWindow: openDrawResponseWindow,
        isChainActive: isChainActive,
        serializePublicState: serializePublicState,
        computeStateChecksum: computeStateChecksum,
        actions: ACTIONS
    };
    // Alias comodo usato anche nei commenti/documentazione del progetto.
    window.CardEffects = { register: register };
})();
