#!/usr/bin/env node
/**
 * duello-senza-testa.js — un duello intero in Node, senza browser.
 * =====================================================================
 * Traguardo della Priorità 2 del piano di attacco ("nucleo senza testa"):
 * carica SOLO dati, motore, regole e IA — niente game-flow.js (il disegno
 * del campo), niente actions.js (click e modali), nessun DOM finto — e fa
 * giocare un duello fino alla fine.
 *
 * Due pezzi rendono possibile farlo senza toccare il motore:
 *  - l'OROLOGIO VIRTUALE: setTimeout/setInterval/Date.now del contesto
 *    sono sostituiti da una coda ordinata per tempo virtuale. L'ordine fra
 *    gli eventi è quello vero (un'animazione da 2 secondi finisce DOPO una
 *    da 500 ms), ma niente aspetta davvero: un duello dura pochi secondi.
 *  - l'INTERFACCIA NULLA: le poche funzioni del disegno del campo che le
 *    regole chiamano ancora per nome (updateUI, addToLog, gli annunci di
 *    fase...) sono definite qui come "non fare niente". L'elenco
 *    INTERFACCIA_NULLA è esattamente la superficie che separa regole e
 *    interfaccia: ogni voce è un punto da far passare, prima o poi, da una
 *    porta vera (vedi js/engine/porta-ui.js).
 *
 * I due giocatori:
 *  - 'bot': l'IA vera del gioco (js/ai/*), al livello scelto;
 *  - 'player': una politica semplice scritta qui (Evoca il mostro più
 *    forte senza Tributi, attacca quando conviene, chiude il turno). Un
 *    bot contro bot simmetrico arriva con i "posti al tavolo" (Priorità 3).
 *
 * Uso:
 *   node tools/duello-senza-testa.js [--avversario kaiba] [--livello hard]
 *                                    [--seme 42] [--partite 1] [--log]
 * Esce con 1 se una partita non arriva alla fine o lancia un errore.
 */
'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const RADICE = path.join(__dirname, '..');
const GRUPPI = require(path.join(RADICE, 'scripts', 'gruppi-script.js'));

// Dati, motore, regole, IA. NON game-flow.js né actions.js.
const SCRIPT = [
    'js/data/cards-data.generated.js',
    'js/data/cards-db.js',
    'js/data/characters-db.js',
    'js/data/character-decks.js',
    ...GRUPPI.motore,
    'js/engine/stato.js',
    'js/engine/fasi.js',
    'js/engine/battaglia.js',
    'js/engine/evocazioni.js',
    'js/ai/ai-shared.js',
    'js/ai/ai-medium.js',
    'js/ai/ai-hard.js',
    'js/ai/ai-controller.js',
    'js/ai/bot.js'
];

/**
 * Le funzioni dell'interfaccia che le regole chiamano ancora per nome.
 * Qui "non fanno niente" (addToLog raccoglie il testo). È la lista di
 * lavoro della separazione: ognuna andrà portata dietro una porta.
 */
const INTERFACCIA_NULLA = `
var __logDuello = [];
function addToLog(m) { __logDuello.push(String(m)); }
// updateUI NON è solo disegno: prima ricalcola gli effetti continui
// (recomputeStaticEffects: chi è non bersagliabile, chi non può attaccare,
// i bonus ATK/DEF...) e alla fine controlla se il duello è finito. Le
// regole contano su quelle due cose ad ogni mossa, quindi qui restano.
function updateUI() {
    if (gameState.gameOver) return;
    DuelEngine.recomputeStaticEffects();
    checkGameOver();
}
function renderChainStack() {}
function renderFields() {}
function renderPlayerHand() {}
function renderBotHand() {}
function renderLifePoints() {}
function renderBanishedBadge() {}
function renderEquipLinks() {}
function updatePhaseIndicator() {}
function animateLifePoints() {}
function showPhaseAnnouncement() {}
function showEpicSlamAnnouncement() {}
function showBattleEffect() {}
function showFloatingDamage() {}
function showHalfScreenImpact() {}
function showEpicDamageNumber() {}
function showDirectAttackWarning() {}
function showPositionEffect() {}
function triggerFieldImpact() {}
function triggerDestroyEffect() {}
function triggerBlockedEffect() {}
function clearSelection() {}
function hideTributePrompt() {}
function hideHandDiscardPrompt() {}
function isBlockingModalOpen() { return false; }
function updateCardInfoPanel() {}
function markHandCardsPending() {}
function animateEffectDraw(a, b, c, fatto) { if (typeof fatto === 'function') fatto(); }
function playCameraIntro(fatto) { if (typeof fatto === 'function') fatto(); }
function escapeHtml(s) { return String(s); }
var __esitoDuello = null;
function endDuel(esito) { if (__esitoDuello === null) __esitoDuello = esito; gameState.gameOver = true; }
function triggerInstantWin(kind, banner, log, playerWon) { addToLog(log); endDuel(playerWon); }
function triggerExodiaWin(playerWon) { endDuel(playerWon); }
function triggerDestinyBoardWin(playerWon) { endDuel(playerWon); }
function triggerFlyingElephantWin(playerWon) { endDuel(playerWon); }
function startHandDiscardSelection(n, fatto) { if (typeof fatto === 'function') fatto(); }
function flyCardToSlot(card, da, a, fatto) { if (typeof fatto === 'function') fatto(); }
`;

/** I nomi delle funzioni di primo livello di game-flow.js e actions.js (parser di TypeScript). */
function funzioniDiInterfaccia() {
    const ts = require('typescript');
    const nomi = [];
    ['js/engine/game-flow.js', 'js/engine/actions.js'].forEach((f) => {
        const testo = fs.readFileSync(path.join(RADICE, f), 'utf8');
        const sorgente = ts.createSourceFile(f, testo, ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
        sorgente.statements.forEach((s) => {
            if (s.kind === ts.SyntaxKind.FunctionDeclaration && s.name) nomi.push(s.name.text);
        });
    });
    return nomi;
}

function argomenti() {
    const a = process.argv.slice(2);
    const val = (k, d) => { const i = a.indexOf('--' + k); return i >= 0 && a[i + 1] ? a[i + 1] : d; };
    return {
        avversario: val('avversario', 'kaiba'),
        livello: val('livello', 'hard'),
        seme: Number(val('seme', '42')),
        partite: Number(val('partite', '1')),
        log: a.includes('--log'),
        superficie: a.includes('--superficie'),
        diagnosi: a.includes('--diagnosi'),
        turni: Number(val('turni', '60'))
    };
}

/** Generatore pseudo-casuale con seme (mulberry32): partite riproducibili. */
function prng(seme) {
    let s = seme >>> 0;
    return function () {
        s = (s + 0x6D2B79F5) >>> 0;
        let t = s;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

/** Orologio virtuale: una coda di timer ordinata per (tempo, ordine di arrivo). */
function creaOrologio() {
    const coda = [];
    let ora = 0;
    let progressivo = 0;
    const BASE = Date.UTC(2026, 0, 1);
    const orologio = {
        get ora() { return ora; },
        setTimeout(fn, ms, ...args) {
            const id = ++progressivo;
            coda.push({ t: ora + Math.max(0, Number(ms) || 0), id, fn, args, ogni: null });
            return id;
        },
        setInterval(fn, ms, ...args) {
            const id = ++progressivo;
            const passo = Math.max(1, Number(ms) || 1);
            coda.push({ t: ora + passo, id, fn, args, ogni: passo });
            return id;
        },
        clear(id) {
            const i = coda.findIndex((x) => x.id === id);
            if (i >= 0) coda.splice(i, 1);
        },
        /** Esegue il prossimo timer; torna false se la coda è vuota. */
        passo() {
            if (coda.length === 0) return false;
            coda.sort((a, b) => (a.t - b.t) || (a.id - b.id));
            const x = coda.shift();
            ora = x.t;
            if (x.ogni) coda.push(Object.assign({}, x, { t: ora + x.ogni }));
            // Ricordato per la diagnosi: quando un invariante salta, si sa
            // QUALE funzione a tempo ha girato in quel passo.
            orologio.ultimo = String(x.fn).replace(/\s+/g, ' ').slice(0, 300);
            x.fn(...x.args);
            return true;
        },
        get inCoda() { return coda.length; },
        Date: class extends Date {
            constructor(...a) { if (a.length) super(...a); else super(BASE + ora); }
            static now() { return BASE + ora; }
        }
    };
    return orologio;
}

function creaContesto(opz) {
    const orologio = creaOrologio();
    const casuale = prng(opz.seme);
    const MathConSeme = Object.create(Math);
    MathConSeme.random = casuale;
    // Gli errori che le carte lanciano (safeCallCardHandler li intercetta e
    // li scrive con console.error) si raccolgono: nel browser restano in
    // console, qui diventano parte del risultato della partita.
    const erroriCarte = [];
    const consoleDuello = {
        log: opz.log ? console.log : () => {},
        info: opz.log ? console.info : () => {},
        warn: opz.log ? console.warn : () => {},
        error: (...a) => {
            erroriCarte.push(a.map((x) => (x && x.stack) ? String(x.stack).split('\n').slice(0, 3).join(' <- ') : String(x)).join(' '));
            if (opz.log) console.error(...a);
        }
    };
    const contesto = {
        console: consoleDuello,
        setTimeout: orologio.setTimeout,
        clearTimeout: orologio.clear,
        setInterval: orologio.setInterval,
        clearInterval: orologio.clear,
        queueMicrotask,
        Promise,
        Math: MathConSeme,
        Date: orologio.Date
    };
    vm.createContext(contesto);
    // `window` è il contesto stesso (come nel browser window === globalThis):
    // non è un DOM, è solo il nome con cui gli script pubblicano i propri
    // oggetti. `document` NON esiste.
    vm.runInContext('var window = globalThis;', contesto);
    // Ogni funzione di primo livello dei due file d'interfaccia (che qui
    // NON si caricano) diventa un "non fare niente" che conta le chiamate:
    // il conteggio finale è la mappa di dove le regole parlano ancora con
    // l'interfaccia. Le voci di INTERFACCIA_NULLA, scritte a mano perché
    // devono completare una richiamata o restituire qualcosa, vengono
    // dichiarate DOPO e prendono il loro posto.
    const generiche = funzioniDiInterfaccia().map((n) => `function ${n}() { __chiamateUI[${JSON.stringify(n)}] = (__chiamateUI[${JSON.stringify(n)}] || 0) + 1; }`).join('\n');
    vm.runInContext('var __chiamateUI = {};\n' + generiche + '\n' + INTERFACCIA_NULLA, contesto, { filename: 'interfaccia-nulla.js' });
    // L'avversario e il livello, come li passerebbe la pagina del duello.
    vm.runInContext(`window.DuelSession = { opponent: { id: ${JSON.stringify(opz.avversario)}, name: ${JSON.stringify(opz.avversario)} }, aiDifficultyKey: ${JSON.stringify(opz.livello)} };`, contesto);
    SCRIPT.forEach((f) => {
        const codice = fs.readFileSync(path.join(RADICE, f), 'utf8');
        vm.runInContext(codice, contesto, { filename: f });
    });
    return { contesto, orologio, erroriCarte };
}

/**
 * La politica del lato 'player': gira quando è il suo turno, in Main
 * Phase 1, a Catena ferma. Restituisce true se ha fatto qualcosa.
 */
const POLITICA_GIOCATORE = `
(function () {
    if (gameState.gameOver || gameState.currentPlayer !== 'player') return 'no';
    if (DuelEngine.isChainActive() || (DuelEngine.isPriorityWindowOpen && DuelEngine.isPriorityWindowOpen())) return 'attesa';
    if (gameState.phase === 'main1' && !gameState.__politicaEvocata) {
        gameState.__politicaEvocata = true;
        const mano = gameState.playerHand;
        let migliore = -1;
        mano.forEach((c, i) => {
            if (c.type !== 'monster' || c.extraDeck) return;
            if (typeof getTributesRequired === 'function' && getTributesRequired(c) > 0) return;
            if (DuelEngine.normalSummonBlockReason && DuelEngine.normalSummonBlockReason('player', c)) return;
            if (migliore === -1 || (c.attack || 0) > (mano[migliore].attack || 0)) migliore = i;
        });
        const casella = gameState.playerMonsterField.findIndex((s) => !s);
        if (migliore !== -1 && casella !== -1 && !gameState.hasNormalSummoned) {
            summonMonster(mano[migliore], casella, 'attack', migliore);
            return 'evocato';
        }
        return 'niente';
    }
    if (gameState.phase === 'main1' && gameState.__politicaEvocata && !gameState.__politicaInBattaglia) {
        gameState.__politicaInBattaglia = true;
        if (gameState.turn > 1) { enterBattlePhase(); return 'battaglia'; }
        return 'niente';
    }
    if (gameState.phase === 'battle' && !gameState.__politicaFinito) {
        // Un attacco alla volta: il prossimo al giro successivo, a battaglia risolta.
        if (gameState.__attaccoInCorso) return 'attesa';
        const campo = gameState.playerMonsterField;
        const loro = gameState.botMonsterField;
        // Un mostro già provato non si riprova: il motore può rifiutare un
        // attacco (un costo non pagabile, un divieto) senza segnarlo come
        // fatto, e ritentarlo all'infinito sembrerebbe uno stallo.
        gameState.__provati = gameState.__provati || {};
        for (let i = 0; i < campo.length; i++) {
            const s = campo[i];
            if (!s || s.isFaceDown || s.position !== 'attack' || s.hasAttacked || gameState.__provati[s.card.uid]) continue;
            gameState.__provati[s.card.uid] = true;
            const atk = DuelEngine.getEffectiveAtk(s.card);
            const bersagli = loro.map((x, j) => ({ x, j })).filter((o) => o.x);
            let scelto = null;
            if (bersagli.length === 0) scelto = -1;
            else {
                const battibile = bersagli.filter((o) => !o.x.isFaceDown && (o.x.position === 'attack' ? DuelEngine.getEffectiveAtk(o.x.card) < atk : DuelEngine.getEffectiveDef(o.x.card) < atk));
                if (battibile.length) scelto = battibile[0].j;
            }
            if (scelto === null) continue;
            gameState.__attaccoInCorso = true;
            resolveAttack('player', i, scelto, () => { gameState.__attaccoInCorso = false; });
            return 'attacco';
        }
        gameState.__politicaFinito = true;
        return 'niente';
    }
    // Un effetto può aver portato la partita in Main Phase 2: lì si chiude.
    if (gameState.phase === 'main2' && gameState.__politicaFinito !== 'chiuso') gameState.__politicaFinito = true;
    // La Battle Phase può essere stata saltata (Grande Naso Lungo, Makiu):
    // chiesta ma ancora in Main Phase 1, si chiude il turno da lì.
    if (gameState.phase === 'main1' && gameState.__politicaInBattaglia && !gameState.__politicaFinito) gameState.__politicaFinito = true;
    if ((gameState.phase === 'battle' || gameState.phase === 'main1' || gameState.phase === 'main2') && gameState.__politicaFinito !== 'chiuso'
        && (gameState.__politicaFinito || (gameState.turn === 1 && gameState.__politicaEvocata))) {
        gameState.__politicaFinito = 'chiuso';
        endTurn();
        return 'fine turno';
    }
    return 'no';
})()
`;

/**
 * --diagnosi: avvolge ogni hook di ogni carta con un controllo degli
 * invarianti (Life Points numerici, solo mostri nella zona Mostri). Il
 * primo hook che ne rompe uno lascia nel log una riga "### INVARIANTE" con
 * carta e hook: è il modo più rapido per passare da "a un certo punto lo
 * stato si rompe" a "lo rompe questa carta".
 */
const DIAGNOSI = `
(function () {
    const rotto = () => {
        if (![gameState.playerLP, gameState.botLP].every((v) => Number.isFinite(v))) return 'Life Points non numerici';
        const intruso = ['player','bot'].some((o) => (o === 'player' ? gameState.playerMonsterField : gameState.botMonsterField)
            .some((s) => s && s.card && s.card.type !== 'monster'));
        return intruso ? 'carta non-mostro nella zona Mostri' : null;
    };
    // Le due zone Mostri diventano Proxy: un'assegnazione di una carta
    // non-mostro lascia lo stack del punto ESATTO in cui è avvenuta (il
    // controllo sugli hook qui sotto non vede ciò che il motore fa dopo che
    // l'hook ha restituito il controllo). Si reinstallano se il motore
    // sostituisce l'array (resetGameState, una fotografia di stato).
    window.__sorvegliaZone = function () {
        ['playerMonsterField', 'botMonsterField'].forEach((k) => {
            const arr = gameState[k];
            if (!arr || arr.__sorvegliato) return;
            gameState[k] = new Proxy(arr, {
                get(t, p) { return p === '__sorvegliato' ? true : t[p]; },
                set(t, p, v) {
                    if (v && v.card && v.card.type !== 'monster') {
                        __logDuello.push('### INVARIANTE (carta non-mostro nella zona Mostri: ' + v.card.name + ') scritta da: '
                            + String(new Error().stack).split('\\n').slice(2, 7).map((r) => r.trim()).join(' <- '));
                    }
                    t[p] = v;
                    return true;
                }
            });
        });
    };
    cardDatabase.forEach((c) => {
        const def = DuelEngine.getDefinition(c.id);
        if (!def || def.__diagnosi) return;
        def.__diagnosi = true;
        Object.keys(def).forEach((k) => {
            if (typeof def[k] !== 'function') return;
            const originale = def[k];
            def[k] = function (...a) {
                const prima = rotto();
                const r = originale.apply(this, a);
                const dopo = rotto();
                if (!prima && dopo) {
                    const ctx = a[0] || {};
                    __logDuello.push('### INVARIANTE (' + dopo + ') rotto da ' + c.id + ' ' + c.name + '.' + k + ' [owner ' + ctx.owner + ', zona ' + ctx.zone + ']');
                }
                return r;
            };
        });
    });
})();
`;

async function giocaPartita(opz, n) {
    const seme = opz.seme + n;
    const { contesto, orologio, erroriCarte } = creaContesto(Object.assign({}, opz, { seme }));
    const esegui = (codice) => vm.runInContext(codice, contesto);
    if (opz.diagnosi) esegui(DIAGNOSI);
    const LIMITE_TURNI = opz.turni || 60;
    esegui('resetGameState();');
    // Mano iniziale di 5 carte per lato, poi il primo turno del giocatore.
    esegui(`
        for (let i = 0; i < 5; i++) { drawCardsToHand('player', 1, { silent: true }); drawCardsToHand('bot', 1, { silent: true }); }
        gameState.turn = 1; gameState.currentPlayer = 'player';
        enterDrawPhase(true);
    `);
    let turnoVisto = 0;
    let passi = 0;
    const LIMITE_PASSI = 200000;
    while (passi < LIMITE_PASSI) {
        passi++;
        const stato = esegui('({ fine: !!gameState.gameOver || __esitoDuello !== null, turno: gameState.turn, lp: [gameState.playerLP, gameState.botLP] })');
        // Invariante: i Life Points restano numeri. Un NaN non fa fallire
        // nulla da solo (il duello continua, "LP NaN" a schermo), quindi
        // qui diventa un errore con il contesto di dove è nato.
        if (!stato.lp.every((v) => Number.isFinite(v))) {
            const coda = esegui("__logDuello.filter((r) => r.startsWith('###')).concat(__logDuello.slice(-15))");
            const campi = esegui(`JSON.stringify({
                giocatore: gameState.playerMonsterField.concat(gameState.playerSTField).map((s) => s && s.card.id + ' ' + s.card.name),
                avversario: gameState.botMonsterField.concat(gameState.botSTField).map((s) => s && s.card.id + ' ' + s.card.name)
            })`);
            throw new Error(`Life Points non numerici (${stato.lp}) al turno ${stato.turno}. Terreni: ${campi}\n  Ultime righe del log:\n    ${coda.join('\n    ')}`);
        }
        if (opz.diagnosi) esegui('__sorvegliaZone()');
        // Invariante: nella zona Mostri stanno solo mostri (anche una carta
        // mutata in mostro, come le Spirit Message o i Cappelli Magici, ha
        // type 'monster').
        const intrusi = esegui(`['player','bot'].flatMap((o) => (o === 'player' ? gameState.playerMonsterField : gameState.botMonsterField)
            .filter((s) => s && s.card && s.card.type !== 'monster').map((s) => o + ': ' + s.card.id + ' ' + s.card.name + ' (' + s.card.type + ')'))`);
        if (intrusi.length) {
            const coda = esegui("__logDuello.filter((r) => r.startsWith('###')).concat(__logDuello.slice(-15))");
            throw new Error(`Carta non-mostro nella zona Mostri al turno ${stato.turno}: ${intrusi.join(', ')}\n  Ultimo passo dell'orologio: ${orologio.ultimo}\n  Ultime righe del log:\n    ${coda.join('\n    ')}`);
        }
        if (stato.fine || stato.turno > LIMITE_TURNI) break;
        if (stato.turno !== turnoVisto) {
            turnoVisto = stato.turno;
            esegui('delete gameState.__politicaEvocata; delete gameState.__politicaInBattaglia; delete gameState.__politicaFinito; delete gameState.__attaccoInCorso; delete gameState.__provati;');
        }
        esegui(POLITICA_GIOCATORE);
        // Le Promise del bot (await) sono microtask: si lasciano girare
        // prima del prossimo timer.
        await new Promise((r) => setImmediate(r));
        if (!orologio.passo()) {
            // Coda vuota. La politica può aver solo aggiornato i suoi
            // segnali (es. "ho finito di attaccare") senza mettere nulla in
            // coda: si riprova qualche volta prima di parlare di stallo.
            let mosso = false;
            // Fino a 12 giri: 5 attaccanti rifiutati uno per uno (es. Spada
            // Rivelatrice) più la chiusura del turno ne chiedono parecchi.
            for (let k = 0; k < 12 && !mosso; k++) {
                esegui(POLITICA_GIOCATORE);
                await new Promise((r) => setImmediate(r));
                mosso = orologio.inCoda > 0 || esegui('!!gameState.gameOver || __esitoDuello !== null');
            }
            if (!mosso) break;
        }
    }
    const fine = esegui(`({
        esito: __esitoDuello, turno: gameState.turn, lpG: gameState.playerLP, lpB: gameState.botLP,
        fasi: gameState.phase, chi: gameState.currentPlayer, log: __logDuello.slice(-12),
        chiamateUI: Object.assign({}, __chiamateUI),
        politica: { evocata: gameState.__politicaEvocata, battaglia: gameState.__politicaInBattaglia, finito: gameState.__politicaFinito, attacco: gameState.__attaccoInCorso },
        catena: DuelEngine.isChainActive(), finestra: DuelEngine.isPriorityWindowOpen && DuelEngine.isPriorityWindowOpen(),
        campoG: gameState.playerMonsterField.map((s) => s && (s.card.name + (s.hasAttacked ? '*' : ''))),
        campoB: gameState.botMonsterField.map((s) => s && s.card.name)
    })`);
    // Una partita che arriva al limite di turni non è ferma: è lunga. Si
    // distingue dallo stallo vero (coda vuota senza vincitore).
    const alLimite = (fine.esito === null || fine.esito === undefined) && fine.turno > LIMITE_TURNI;
    const invarianti = esegui("__logDuello.filter((r) => r.startsWith('###'))");
    return { seme, passi, oraVirtualeMs: orologio.ora, alLimite, invarianti, erroriCarte: erroriCarte.slice(), ...fine };
}

async function main() {
    const opz = argomenti();
    let ok = true;
    for (let n = 0; n < opz.partite; n++) {
        const t0 = Date.now();
        let r;
        try {
            r = await giocaPartita(opz, n);
        } catch (e) {
            console.error(`Partita ${n + 1} (seme ${opz.seme + n}): ERRORE\n${e && e.stack ? e.stack.split('\n').slice(0, 6).join('\n') : e}`);
            ok = false;
            continue;
        }
        const esito = r.esito === true ? 'vince il giocatore' : r.esito === false ? `vince ${opz.avversario}` : r.esito === 'draw' ? 'pareggio'
            : r.alLimite ? `interrotta al limite di ${opz.turni || 60} turni` : 'NON FINITA';
        console.log(`Partita ${n + 1} (seme ${r.seme}): ${esito} al turno ${r.turno} — LP ${r.lpG} / ${r.lpB} — ${r.passi} passi, ${Math.round(r.oraVirtualeMs / 1000)} s di gioco in ${Date.now() - t0} ms reali`);
        if (r.erroriCarte.length) {
            ok = false;
            console.log(`  Errori lanciati dalle carte (${r.erroriCarte.length}):\n    ${[...new Set(r.erroriCarte)].slice(0, 5).join('\n    ')}`);
        }
        if (r.invarianti.length) {
            ok = false;
            console.log(`  Invarianti rotti:\n    ${r.invarianti.join('\n    ')}`);
        }
        if ((r.esito === null || r.esito === undefined) && !r.alLimite) {
            ok = false;
            console.log(`  fermo in fase ${r.fasi}, di turno ${r.chi}; politica ${JSON.stringify(r.politica)}, catena ${r.catena}, finestra ${r.finestra}`);
            console.log(`  campo giocatore ${JSON.stringify(r.campoG)} / avversario ${JSON.stringify(r.campoB)}`);
            console.log(`  Ultime righe del log:\n    ${r.log.join('\n    ')}`);
        }
        if (opz.superficie) {
            const voci = Object.entries(r.chiamateUI).sort((a, b) => b[1] - a[1]);
            console.log(`  Funzioni d'interfaccia chiamate dalle regole (${voci.length}): ${voci.map(([k, v]) => `${k}×${v}`).join(', ')}`);
        }
    }
    process.exit(ok ? 0 : 1);
}

if (require.main === module) main();
module.exports = { giocaPartita, creaContesto, SCRIPT };
