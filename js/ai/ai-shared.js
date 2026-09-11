/**
 * ai-shared.js — Euristiche condivise tra i livelli di difficoltà
 * dell'IA (js/ai/ai-medium.js, js/ai/ai-hard.js). Vanno caricate PRIMA
 * di entrambi (vedi <script> in duelMonstersCore.html).
 *
 * Il motore non introspeziona il vero "peso" di un effetto a runtime
 * (richiederebbe eseguirlo a vuoto per vedere cosa fa), quindi qui si
 * stima l'impatto di una carta leggendo PAROLE CHIAVE nel suo testo
 * effetto italiano (card.effect) — una stima grezza ma sufficiente per
 * far scegliere all'IA "Difficile" la carta più forte tra più candidate
 * invece della prima che capita, e per decidere se vale la pena
 * Settare/attivare una Magia o Trappola invece di trattenerla.
 */
(function () {
    'use strict';

    // Parola chiave -> punti d'impatto stimato. Più alto = più forte.
    // L'ordine di controllo conta poco: si sommano tutti i match trovati.
    const KEYWORD_WEIGHTS = [
        [/distrugg/i, 4],           // rimozione permanente
        [/bandisc/i, 4],            // rimozione ancora più definitiva
        [/nega/i, 3],               // negazione di un'attivazione/effetto
        [/prende il controllo|controllo del/i, 4], // furto di un mostro
        [/special summon/i, 2],
        [/danni|infligg/i, 2],
        [/pesca \d|pesca fino/i, 2],
        [/dimezza|guadagna \d+ atk|perde \d+ atk/i, 1],
        [/torna in mano|ritorna in mano/i, 1],
        [/mescola/i, 1]
    ];

    /**
     * Stima grezza dell'impatto di una carta guardando il suo testo
     * effetto — usata per ordinare più candidate tra loro (es. quale
     * Trappola Set attivare per rispondere, quale Magia in mano
     * attivare prima). Un mostro senza testo Magia/Trappola riceve un
     * punteggio base pari al suo ATK diviso 500, così un vanilla forte
     * non risulta mai "zero" rispetto a una Magia/Trappola debole.
     */
    function scoreCardImpact(card) {
        if (!card) return 0;
        if (card.type === 'monster') return (card.attack || 0) / 500;
        const text = card.effect || '';
        let score = 1; // punteggio base: attivarla è comunque quasi sempre un piccolo vantaggio
        KEYWORD_WEIGHTS.forEach(([re, weight]) => {
            if (re.test(text)) score += weight;
        });
        return score;
    }

    /**
     * Decide la "postura" di un mostro da Evocare per il bot: Attacco
     * scoperto, Difesa coperta (Set), o Difesa scoperta. Torna
     * { position: 'attack'|'defense', faceDown: bool }.
     *
     * Priorità (per richiesta esplicita dell'utente):
     *   1) Se il campo avversario ha già un mostro SCOPERTO la cui
     *      statistica rilevante (ATK se in Attacco, DEF se in Difesa) è
     *      INFERIORE all'ATK di questo mostro: mettilo comunque in
     *      Attacco scoperto — c'è un bersaglio favorevole da colpire in
     *      Battle Phase (vedi chooseAttackTarget in ai-medium.js/
     *      ai-hard.js, che lo raccoglierà da solo), non ha senso
     *      sprecare quell'ATK dietro uno scudo di Difesa.
     *   2) Altrimenti, se il mostro più forte scoperto dell'avversario
     *      lo distruggerebbe COMUNQUE (il suo ATK supera sia l'ATK sia
     *      la DEF di questo mostro): meglio la Difesa, anche se l'ATK di
     *      questo mostro è più alto della sua stessa DEF — morire in
     *      Attacco costa anche i Life Points della differenza, morire in
     *      Difesa no. Non evita la perdita del mostro (che comunque non
     *      si può prevedere del tutto), solo la perdita aggiuntiva di LP
     *      di una battaglia già persa in partenza.
     *   3) Altrimenti, se la DEF supera l'ATK (statisticamente un
     *      mostro "da Difesa"): Difesa COPERTA (Set) se ha 4 Stelle o
     *      meno (nessun costo aggiuntivo per nasconderlo), Difesa
     *      SCOPERTA se ne ha 5 o più (tipicamente arrivato tramite
     *      un'Evocazione Tributo: già "costoso" e visibile, coprirlo non
     *      aggiunge molto).
     *   4) Altrimenti (mostro da Attacco): Attacco scoperto.
     */
    function decideMonsterPosture(card, gameState, owner) {
        if (!card) return { position: 'attack', faceDown: false };
        const atk = card.attack || 0;
        const def = card.defense || 0;
        const opponentField = owner === 'player' ? gameState.botMonsterField : gameState.playerMonsterField;
        const hasFavorableTarget = (opponentField || []).some((slot) => {
            if (!slot || slot.isFaceDown) return false;
            const theirStat = slot.position === 'attack' ? (slot.card.attack || 0) : (slot.card.defense || 0);
            return theirStat < atk;
        });
        if (hasFavorableTarget) return { position: 'attack', faceDown: false };
        const strongestOpposingAtk = (opponentField || []).reduce((max, slot) => {
            if (!slot || slot.isFaceDown || slot.position !== 'attack') return max;
            return Math.max(max, slot.card.attack || 0);
        }, 0);
        const doomedEitherWay = strongestOpposingAtk > atk && strongestOpposingAtk > def;
        if (def > atk || doomedEitherWay) {
            const level = card.level || 0;
            return { position: 'defense', faceDown: level <= 4 };
        }
        return { position: 'attack', faceDown: false };
    }

    // Parole chiave che segnalano un effetto di RIMOZIONE mirata (distrugge/
    // bandisce/ruba UN mostro) — vedi isSingleTargetRemoval più sotto. "tutti
    // i mostri"/"ogni mostro" fa eccezione: un effetto di massa non va mai
    // trattenuto in attesa di un bersaglio "che valga abbastanza", colpisce
    // comunque tutto ciò che c'è.
    const REMOVAL_KEYWORD = /distrugg|bandisc|prende il controllo|controllo del/i;
    const MASS_EFFECT_KEYWORD = /tutti i mostri|ogni mostro|tutte le carte/i;

    /** Vero se `card` è una Magia/Trappola che rimuove UN mostro bersaglio (non un effetto di massa) — usata per decidere se vale la pena trattenerla per un bersaglio migliore invece di sprecarla subito. */
    function isSingleTargetRemoval(card) {
        if (!card || card.type === 'monster') return false;
        const text = card.effect || '';
        return REMOVAL_KEYWORD.test(text) && !MASS_EFFECT_KEYWORD.test(text);
    }

    /**
     * Vero se attivare/Settare ORA `card` (una rimozione a bersaglio
     * singolo) vale la pena, guardando la statistica migliore tra i
     * mostri SCOPERTI dell'avversario — se non è single-target-removal
     * (altra Magia/Trappola qualunque, o un mostro) torna sempre vero,
     * nessuna restrizione. Nata per correggere un difetto segnalato
     * dall'utente: il bot spendeva le proprie carte di rimozione sul
     * primo bersaglio disponibile fin dai primissimi turni, anche contro
     * un vanilla scarso — non "troppo" nel senso di troppe copie (il
     * dataset ne ha quante ne ha), ma nel senso di usarle senza alcun
     * discernimento sul VALORE del bersaglio. Un mostro coperto riceve
     * una stima prudente (1200, né "sempre sì" né "mai") perché il bot
     * non può sapere cosa nasconde ma non deve nemmeno ignorarlo del
     * tutto. `threshold` è deciso da chi chiama: IA_MEDIA usa un valore
     * fisso, IA_DIFFICILE lo scala in base a quanto sta andando bene la
     * partita (vedi AI_HARD.evaluateBoard) — più prudente da in vantaggio,
     * più disposta a "bruciare" pur di stabilizzarsi se in svantaggio.
     */
    function isRemovalWorthwhile(card, gameState, owner, threshold) {
        if (!isSingleTargetRemoval(card)) return true;
        const opponentField = owner === 'bot' ? gameState.playerMonsterField : gameState.botMonsterField;
        let bestStat = 0;
        let hasFaceDown = false;
        (opponentField || []).forEach((slot) => {
            if (!slot) return;
            if (slot.isFaceDown) { hasFaceDown = true; return; }
            const stat = slot.position === 'attack' ? (slot.card.attack || 0) : (slot.card.defense || 0);
            bestStat = Math.max(bestStat, stat);
        });
        if (hasFaceDown) bestStat = Math.max(bestStat, 1200);
        return bestStat >= threshold;
    }

    /**
     * Vero se `card` è normalmente Evocabile ORA da parte di `owner` —
     * SOLO per il vincolo "non può essere Evocata a meno che tu non
     * controlli scoperta [altra carta specifica]" (def.requiresFieldPresenceId,
     * vedi js/engine/card-effects.js — es. Guardiano Grarl id 284,
     * Guardiano Kay'est id 285), NON un controllo generico di legalità
     * (Tributi/slot liberi restano gestiti a parte da chi chiama). Usata
     * per filtrare i candidati del bot PRIMA di provare a Evocarli, così
     * l'IA non spreca un turno tentando un'Evocazione che verrebbe
     * comunque rifiutata da attemptMonsterSummon (actions.js).
     */
    function canNormalSummonNow(card, gameState, owner) {
        // Guardiano Falce del Terrore (id 282): "non puoi Evocare
        // Normalmente/Set altri mostri finché questa carta è in campo" —
        // stesso gameState.otherMonsterSummonsBlockedFor già consultato
        // lato giocatore in attemptMonsterSummon (actions.js) e da
        // ACTIONS.specialSummon (duel-engine.js).
        if (gameState.otherMonsterSummonsBlockedFor && gameState.otherMonsterSummonsBlockedFor[owner] && card.id !== 282) return false;
        const def = window.DuelEngine && DuelEngine.getDefinition(card.id);
        if (!def || !def.requiresFieldPresenceId) return true;
        // La carta richiesta può essere un mostro O una Magia/Trappola
        // (es. una Carta Equipaggiamento) — vedi lo stesso controllo su
        // entrambe le zone in attemptMonsterSummon, actions.js.
        const field = owner === 'player' ? gameState.playerMonsterField : gameState.botMonsterField;
        const stField = owner === 'player' ? gameState.playerSTField : gameState.botSTField;
        return field.some((s) => s && !s.isFaceDown && s.card.id === def.requiresFieldPresenceId)
            || stField.some((s) => s && !s.isFaceDown && s.card.id === def.requiresFieldPresenceId);
    }

    /**
     * Vero se `card` è uno dei 5 pezzi di Exodia il Proibito
     * (EXODIA_PIECE_IDS, dichiarata in js/engine/game-flow.js, caricato
     * PRIMA di questo file — riferimento diretto per nome, come già
     * `gameState` altrove in questi moduli IA: un `const` a livello di
     * script resta visibile per nome ai `<script>` successivi nello
     * stesso documento, anche se non diventa una proprietà di `window`).
     * Il bot non deve MAI Evocarli Normalmente: hanno statistiche di
     * battaglia trascurabili (braccia/gambe da 200-300 ATK/DEF, la Testa
     * non è da meno) e il loro vero valore è restare TUTTI E CINQUE in
     * mano per la vittoria istantanea (hasExodiaAssembled, game-flow.js)
     * — Evocarne anche solo uno lo toglierebbe dalla mano, vanificando
     * quell'obiettivo. Richiesta esplicita dell'utente: "se Yugi Muto (e/o
     * il nonno) ha le carte di Exodia, deve tenerle in mano e non
     * giocarle... deve puntare ad avere i 5 pezzi". Generico per
     * QUALUNQUE mazzo del bot li contenga (oggi Yugi Muto ed Espa Roba
     * per tema, vedi js/data/character-decks.js) — la condizione vera è
     * "il bot ha in mano un pezzo di Exodia", non "il bot è un
     * personaggio specifico", quindi nessun controllo per nome qui.
     */
    function shouldHoldForExodia(card) {
        return !!(card && typeof EXODIA_PIECE_IDS !== 'undefined' && EXODIA_PIECE_IDS.includes(card.id));
    }

    /**
     * Vero se `defenderCard` (controllato da `defenderOwner`) verrebbe
     * DAVVERO distrutto scontrandosi in battaglia con un attaccante da
     * `attackerAtk` ATK — replica in sola lettura (nessuna mutazione di
     * stato) la stessa logica di cardIsIndestructibleByBattle/
     * survivesBattleDestruction usata dal vero resolveBattleDamage
     * (js/engine/actions.js), qui esposta all'IA perché smetta di trattare
     * come "bersaglio conveniente" un mostro che sopravviverebbe comunque
     * — richiesta esplicita dell'utente: il bot non deve continuare a
     * puntare un mostro che non può distruggere, ma valutare altre
     * strategie (altro bersaglio, attacco diretto, trattenere l'attaccante).
     * Non replica i redirect Union (DuelEngine.tryRedirectUnionDestroy)
     * né def.onWouldBeDestroyedInBattle (casi di nicchia che MUTANO stato
     * reale se innescati — qui serve solo una stima, non un'esecuzione):
     * un mostro Union che "assorbirebbe" la distruzione su un'altra carta
     * resta quindi trattato come normalmente distruttibile, comportamento
     * INVARIATO rispetto a prima di questa modifica.
     */
    function canBeDestroyedByBattle(defenderCard, defenderOwner, attackerAtk) {
        if (gameState.noBattleDestructionFor && gameState.noBattleDestructionFor[defenderOwner]) return false;
        const def = window.DuelEngine && DuelEngine.getDefinition(defenderCard.id);
        const flag = def && def.cannotBeDestroyedByBattle;
        if (typeof flag === 'function') { if (flag(attackerAtk)) return false; }
        else if (flag) return false;
        if (gameState.orgothIndestructibleUids && gameState.orgothIndestructibleUids.has(defenderCard.uid)) return false;
        return true;
    }

    /**
     * Vero se sacrificare mostri per un valore totale `sacrificedValue`
     * (somma degli ATK tributati, stesso calcolo già fatto da
     * chooseSummon in ai-medium.js/ai-hard.js) per evocare `card` è
     * DAVVERO una mossa sensata — non solo "non in perdita netta" (il
     * veto esistente, mantenuto come primo controllo), ma adattiva al
     * campo dell'avversario: richiesta esplicita dell'utente, es. non
     * sacrificare un mostro da 2500 ATK per evocarne uno da 2400 ATK/2600
     * DEF A MENO CHE l'avversario non abbia davvero un mostro che
     * giustifica quella DEF più alta (altrimenti si è solo indeboliti in
     * attacco per una difesa che non serve a nulla). Stessa euristica
     * "il mostro più forte scoperto in Attacco dell'avversario" già usata
     * da decideMonsterPosture qui sopra, per non duplicarne la logica in
     * modo incoerente.
     */
    function isTributeSummonWorthwhile(card, sacrificedValue, gameState, owner) {
        // Mai in perdita netta pura, indipendentemente dal campo
        // avversario: se NESSUNA statistica del nuovo mostro supera il
        // valore sacrificato, è sempre uno spreco.
        if (Math.max(card.attack, card.defense) <= sacrificedValue) return false;
        // Il nuovo ATK da solo già supera il valore sacrificato: è
        // un'evocazione offensivamente valida di per sé, nessun bisogno
        // di guardare la DEF né il campo avversario.
        if (card.attack >= sacrificedValue) return true;
        // Da qui in poi il nuovo ATK è PIÙ BASSO del valore sacrificato:
        // l'unica ragione per accettare comunque il tributo è che la DEF
        // più alta serva DAVVERO a sopravvivere a una minaccia reale —
        // un mostro avversario scoperto in Attacco il cui ATK batte il
        // nuovo ATK (lo distruggerebbe comunque restando in Attacco) ma
        // NON la sua DEF (ci si difende restando vivi). Campo avversario
        // vuoto o senza una simile minaccia -> nessun bisogno di questa
        // DEF, il tributo va rifiutato a favore di un candidato più
        // offensivo.
        const opponentField = owner === 'bot' ? gameState.playerMonsterField : gameState.botMonsterField;
        const strongestOpposingAtk = (opponentField || []).reduce((max, slot) => {
            if (!slot || slot.isFaceDown || slot.position !== 'attack') return max;
            return Math.max(max, slot.card.attack || 0);
        }, 0);
        return strongestOpposingAtk > card.attack && strongestOpposingAtk <= card.defense;
    }

    // Aggressività stimata (0 = molto trattenuta/imprevedibile, 1 = gioca
    // quasi sempre la mossa oggettivamente più forte) per un elenco
    // CORTO e curato a mano di personaggi iconici — deliberatamente NON
    // un tentativo di coprire tutti i 34+ personaggi di
    // js/data/character-decks.js: un personaggio assente da qui riceve
    // il valore neutro DEFAULT_AGGRESSION (vedi getBotAggression), quindi
    // aggiungerne di nuovi in futuro non richiede toccare questa lista —
    // un affinamento opzionale, non un requisito, coerente con la
    // richiesta esplicita dell'utente di variare lo stile "in base al bot
    // duellante" senza per questo dover creare mazzi/dati nuovi per
    // ognuno. Le chiavi sono gli stessi id di js/data/characters-db.js.
    const CHARACTER_AGGRESSION = {
        kaiba: 0.9,        // gioca quasi sempre la carta oggettivamente più forte disponibile
        bandit_keith: 0.85,
        marik: 0.8,
        pegasus: 0.75,     // calcolato e spietato, ma con qualche mossa "a effetto" invece della più ovvia
        rex: 0.7,
        weevil: 0.7,
        mai: 0.6,
        yugiMuto: 0.5,     // equilibrato per definizione
        yamiYugi: 0.5,
        joey: 0.45
    };
    const DEFAULT_AGGRESSION = 0.55;

    /**
     * "Restraint" (0 = nessuno, 1 = massimo) da applicare alla scelta tra
     * più Magie/Trappole candidate (vedi pickWeightedByImpact più sotto):
     * combina l'aggressività del personaggio attualmente in duello
     * (window.DuelSession.opponent.id, impostato da js/duel-session.js —
     * assente nel Duello Demo sandbox, dove ricade sul valore neutro) con
     * un bonus EXTRA nei primissimi turni (1-2), sommato e non
     * sostituito: anche un bot molto aggressivo (Kaiba) non svuota così
     * la mano più forte fin dal turno 1, ma converge verso il proprio
     * stile "vero" via via che la partita avanza — risposta diretta alla
     * richiesta esplicita dell'utente ("non tutte [le carte punitive]
     * subito").
     */
    function getSpellTrapRestraint(gameState) {
        const id = window.DuelSession && DuelSession.opponent && DuelSession.opponent.id;
        const aggression = (id && CHARACTER_AGGRESSION[id] !== undefined) ? CHARACTER_AGGRESSION[id] : DEFAULT_AGGRESSION;
        const turn = (gameState && gameState.turn) || 1;
        const earlyTurnBonus = turn <= 1 ? 0.4 : (turn === 2 ? 0.2 : 0);
        return Math.max(0, Math.min(1, (1 - aggression) + earlyTurnBonus));
    }

    /**
     * Sceglie UNA carta tra `candidates` (array con un campo `.card`) con
     * una lotteria pesata sul punteggio stimato di ciascuna
     * (scoreCardImpact), invece di prendere SEMPRE la più forte in
     * assoluto come faceva prima questo motore ovunque — richiesta
     * esplicita dell'utente: lo stesso mazzo/la stessa mano di partenza
     * produceva SEMPRE la stessa sequenza di attivazioni, un pattern
     * riconoscibile e ripetitivo. Il peso resta proporzionale al
     * punteggio (al quadrato, per pesare DAVVERO verso le carte forti),
     * quindi la carta più forte resta comunque la scelta più probabile,
     * solo non l'unica possibile. `restraint` (vedi getSpellTrapRestraint)
     * appiattisce i pesi verso l'uniforme: a restraint 0 il comportamento
     * converge quasi esattamente su "sempre la più forte" (il vecchio
     * comportamento), a restraint 1 ogni candidato ha pari probabilità.
     * Torna sempre uno dei candidati (mai null se la lista non è vuota):
     * non cambia QUANTE carte l'IA gioca per turno (i limiti MAX_ATTIVA/
     * MAX_SET e usedThisTurn restano invariati), solo QUALE tra quelle idonee.
     */
    function pickWeightedByImpact(candidates, restraint) {
        if (!candidates || candidates.length === 0) return null;
        if (candidates.length === 1) return candidates[0];
        restraint = Math.max(0, Math.min(1, restraint || 0));
        const weights = candidates.map((c) => {
            const impact = Math.max(0.1, scoreCardImpact(c.card));
            return impact * impact * (1 - restraint) + restraint;
        });
        const total = weights.reduce((sum, w) => sum + w, 0);
        let roll = Math.random() * total;
        for (let i = 0; i < candidates.length; i++) {
            roll -= weights[i];
            if (roll <= 0) return candidates[i];
        }
        return candidates[candidates.length - 1];
    }

    window.AI_SHARED = {
        scoreCardImpact: scoreCardImpact,
        decideMonsterPosture: decideMonsterPosture,
        canNormalSummonNow: canNormalSummonNow,
        isSingleTargetRemoval: isSingleTargetRemoval,
        isRemovalWorthwhile: isRemovalWorthwhile,
        shouldHoldForExodia: shouldHoldForExodia,
        canBeDestroyedByBattle: canBeDestroyedByBattle,
        isTributeSummonWorthwhile: isTributeSummonWorthwhile,
        getSpellTrapRestraint: getSpellTrapRestraint,
        pickWeightedByImpact: pickWeightedByImpact
    };
})();
