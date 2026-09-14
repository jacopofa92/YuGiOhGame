/**
 * js/economy/rewards.js — TUTTI I PREMI DEL GIOCO, IN UN POSTO SOLO
 * =====================================================================
 * Ogni cosa che il giocatore guadagna — duelli liberi, tornei, bonus,
 * drop rari — è decisa qui. Nessuna pagina assegna valute per conto
 * proprio: chiamano `Rewards.forDuel(...)` / `Rewards.forTournament(...)`,
 * ricevono l'elenco di quello che è stato assegnato e lo mostrano.
 *
 * REGOLA DI PROGETTO, richiesta esplicita dell'utente: «specifica nei
 * vari punti eventuali regole, drop, x2, prima vittoria, se no l'utente
 * non capisce come mai riceve cose a caso».
 * Per questo ogni singola voce di premio porta con sé la PROPRIA
 * spiegazione (`rule`), scritta per il giocatore e non per chi programma.
 * Il riepilogo di fine duello non mostra "+150 crediti" e basta: mostra
 * «Prima vittoria di oggi · +150» e, per un drop, «Fortuna: 6% a
 * vittoria». Se una voce non sa spiegarsi da sola, non deve esistere.
 *
 * L'EQUILIBRIO in due righe: i crediti si guadagnano ovunque e comprano
 * le carte del giorno e le buste; le altre tre valute arrivano quasi solo
 * dai tornei e ognuna apre una porta che i crediti non aprono (vedi
 * makeDefaultCurrency in js/save-manager.js). Cinque freni tengono il
 * ritmo: il bonus giornaliero premia la costanza invece della maratona,
 * i rendimenti calano dopo la quinta vittoria del giorno, i premi dei
 * tornei valgono doppio solo la prima volta, i mazzi si comprano una
 * volta sola e la rotazione del Negozio mette comunque un tetto a quanto
 * si può comprare in un giorno.
 */
(function () {
    'use strict';

    // ================================================================
    // TABELLE — i numeri dell'economia, tutti qui e da nessun'altra parte
    // ================================================================

    /** Crediti per un duello VINTO, per difficoltà dell'avversario. */
    const WIN_CREDITS = { Medio: 60, Difficile: 90 };
    /** Crediti per un duello PERSO: pochi, ma mai zero — un duello giocato non è tempo buttato. */
    const LOSS_CREDITS = 20;
    /** Bonus una tantum alla prima vittoria della giornata: premia il tornare ogni giorno, non il giocare venti duelli di fila. */
    const FIRST_WIN_OF_DAY_BONUS = 150;
    /** Dalla N-esima vittoria del giorno in poi i crediti valgono la metà (freno al grind). */
    const DIMINISHING_AFTER_WINS = 5;
    const DIMINISHING_FACTOR = 0.5;

    /**
     * Drop rari dei duelli liberi: valute che altrimenti verrebbero solo
     * dai tornei. Probabilità basse di proposito — devono essere una bella
     * sorpresa, non una fonte di reddito: a questi tassi servono in media
     * ~17 vittorie per una Stella e ~125 per una Carta del Millennio.
     * Si tirano SOLO su una vittoria, e al massimo uno per duello (vedi
     * rollDrop): due premi rari insieme sembrerebbero un errore.
     */
    const DROPS = [
        { currency: 'starChips', amount: 1, chance: 0.06, icon: '⭐', nome: 'Stella dell\'Esagono' },
        { currency: 'locatorCards', amount: 1, chance: 0.03, icon: '🃏', nome: 'Carta Locazione' },
        { currency: 'millenniumCards', amount: 1, chance: 0.008, icon: '🔱', nome: 'Carta del Millennio' }
    ];

    /** Crediti per ogni duello vinto DENTRO un torneo: più alti di un duello libero, perché lì si rischia l'eliminazione. */
    const TOURNAMENT_DUEL_CREDITS = 120;

    /**
     * Premio per aver COMPLETATO un torneo. Ogni torneo versa soprattutto
     * la valuta che apre la "sua" porta del Negozio, così rigiocarne uno
     * invece di un altro ha davvero un senso:
     *   Regno dei Duellanti -> Stelle    -> i mazzi
     *   Battle City         -> Locazione -> la busta Leggendaria
     *   Torneo Kaiba        -> Millennio -> la carta rara del giorno a colpo sicuro
     */
    const TOURNAMENT_COMPLETION = {
        duelistKingdom: { credits: 1200, starChips: 12, locatorCards: 2, millenniumCards: 1 },
        battleCity: { credits: 1200, starChips: 3, locatorCards: 8, millenniumCards: 1 },
        kaibaTournament: { credits: 1200, starChips: 2, locatorCards: 2, millenniumCards: 3 }
    };
    // Nota sui numeri: in ogni riga la valuta "di quel torneo" deve
    // risultare anche la PIÙ ABBONDANTE, non solo quella tematica — un
    // primo giro dava al Torneo Kaiba 4 Stelle contro 3 Carte del
    // Millennio, e a colpo d'occhio sembrava un torneo che paga in Stelle
    // come il Regno. L'identità di un premio si legge dai numeri, non
    // dalle intenzioni.
    /** Moltiplicatore alla PRIMA vittoria in assoluto di quel torneo: rifarlo conviene ancora, ma meno. */
    const FIRST_COMPLETION_MULTIPLIER = 2;

    const CURRENCY_META = {
        credits: { icon: '💰', nome: 'Crediti' },
        starChips: { icon: '⭐', nome: 'Stelle dell\'Esagono' },
        locatorCards: { icon: '🃏', nome: 'Carte Locazione' },
        millenniumCards: { icon: '🔱', nome: 'Carte del Millennio' }
    };

    // ================================================================
    // Assegnazione
    // ================================================================

    function dayKey() {
        return (window.ServerDate && ServerDate.dayKey()) || new Date().toISOString().slice(0, 10);
    }

    /** Una voce di premio: quanto, e SOPRATTUTTO perché. `rule` è il testo mostrato al giocatore. */
    function voce(currency, amount, rule) {
        const meta = CURRENCY_META[currency] || { icon: '•', nome: currency };
        return { currency: currency, amount: amount, icon: meta.icon, nome: meta.nome, rule: rule };
    }

    /** Tira i drop rari: al massimo uno per duello, il primo che esce nell'ordine della tabella. */
    function rollDrop() {
        for (let i = 0; i < DROPS.length; i++) {
            if (Math.random() < DROPS[i].chance) return DROPS[i];
        }
        return null;
    }

    /**
     * Premi di fine duello. Torna SEMPRE un elenco di voci già assegnate
     * al salvataggio, ognuna con la propria spiegazione — chi chiama deve
     * solo mostrarle.
     *
     * `opts.won`        vero se il giocatore ha vinto (un pareggio non è una vittoria)
     * `opts.difficulty` 'Medio' | 'Difficile' — senza, nessun credito (Duello Demo, Multiplayer)
     * `opts.inTournament` vero se il duello faceva parte di un torneo
     */
    function forDuel(opts) {
        const o = opts || {};
        const rewards = [];
        if (!window.SaveManager) return rewards;

        const giorno = dayKey();
        const prima = SaveManager.getDailyEconomy(giorno);

        if (!o.won) {
            // Anche perdendo si porta a casa qualcosa: serve a non far
            // sentire "sprecato" un duello lungo, ma è poco abbastanza da
            // non rendere conveniente perdere di proposito.
            if (o.difficulty) {
                SaveManager.addCurrency('credits', LOSS_CREDITS);
                rewards.push(voce('credits', LOSS_CREDITS, 'Premio di partecipazione (anche perdendo)'));
            }
            return rewards;
        }

        const conteggio = SaveManager.recordDailyWin(giorno);
        const vittoriaNumero = conteggio.wins;

        if (o.inTournament) {
            SaveManager.addCurrency('credits', TOURNAMENT_DUEL_CREDITS);
            rewards.push(voce('credits', TOURNAMENT_DUEL_CREDITS, 'Duello di torneo vinto'));
        } else if (o.difficulty) {
            const base = WIN_CREDITS[o.difficulty] || 0;
            if (base > 0) {
                // I rendimenti calano DOPO la soglia: la quinta vittoria di
                // giornata vale ancora pieno, la sesta metà.
                const ridotto = vittoriaNumero > DIMINISHING_AFTER_WINS;
                const importo = ridotto ? Math.round(base * DIMINISHING_FACTOR) : base;
                SaveManager.addCurrency('credits', importo);
                rewards.push(voce('credits', importo, ridotto
                    ? `Vittoria n.${vittoriaNumero} di oggi — oltre la ${DIMINISHING_AFTER_WINS}ª i crediti valgono la metà`
                    : `Vittoria (${o.difficulty === 'Difficile' ? 'Difficile' : 'Normale'})`));
            }
        }

        // Il bonus giornaliero vale per QUALUNQUE prima vittoria del
        // giorno, torneo compreso: premia l'esserci, non la modalità.
        if (vittoriaNumero === 1) {
            SaveManager.addCurrency('credits', FIRST_WIN_OF_DAY_BONUS);
            rewards.push(voce('credits', FIRST_WIN_OF_DAY_BONUS, 'Prima vittoria di oggi'));
        }

        // Drop raro: solo fuori dai tornei, che hanno già i propri premi
        // grossi garantiti e non devono anche vincere alla lotteria.
        if (!o.inTournament && o.difficulty) {
            const drop = rollDrop();
            if (drop) {
                SaveManager.addCurrency(drop.currency, drop.amount);
                rewards.push(voce(drop.currency, drop.amount,
                    `Ritrovamento fortunato — ${Math.round(drop.chance * 1000) / 10}% a ogni vittoria`));
            }
        }
        return rewards;
    }

    /**
     * Premi per un torneo COMPLETATO (vinto fino in fondo). `firstTime`
     * raddoppia tutto, e il raddoppio viene DETTO nel testo di ogni voce:
     * un giocatore che vede numeri diversi alla seconda vittoria deve
     * capire subito perché.
     */
    function forTournament(tournamentId, firstTime) {
        const tabella = TOURNAMENT_COMPLETION[tournamentId];
        const rewards = [];
        if (!tabella || !window.SaveManager) return rewards;
        const moltiplicatore = firstTime ? FIRST_COMPLETION_MULTIPLIER : 1;
        Object.keys(tabella).forEach((currency) => {
            const importo = tabella[currency] * moltiplicatore;
            if (importo <= 0) return;
            SaveManager.addCurrency(currency, importo);
            rewards.push(voce(currency, importo, firstTime
                ? 'Torneo vinto · PRIMA VOLTA, premio raddoppiato (×2)'
                : 'Torneo vinto'));
        });
        return rewards;
    }

    /**
     * Il testo delle regole, per la schermata che le spiega (Negozio e
     * riepilogo premi). Sta qui e non nelle pagine così non può andare
     * alla deriva rispetto ai numeri veri: se cambia una costante qui
     * sopra, cambia anche la spiegazione.
     */
    function rulesSummary() {
        return [
            { icon: '💰', titolo: 'Duello vinto', testo: `+${WIN_CREDITS.Medio} crediti contro un avversario Normale, +${WIN_CREDITS.Difficile} contro uno Difficile.` },
            { icon: '🤝', titolo: 'Duello perso', testo: `+${LOSS_CREDITS} crediti lo stesso: un duello giocato non è mai tempo buttato.` },
            { icon: '🌅', titolo: 'Prima vittoria del giorno', testo: `+${FIRST_WIN_OF_DAY_BONUS} crediti una volta al giorno. Premia il tornare spesso, non il giocare venti duelli di fila.` },
            { icon: '📉', titolo: 'Rendimenti decrescenti', testo: `Dalla ${DIMINISHING_AFTER_WINS + 1}ª vittoria della giornata i crediti valgono la metà.` },
            { icon: '🎲', titolo: 'Ritrovamenti fortunati', testo: DROPS.map((d) => `${d.icon} ${d.nome} ${Math.round(d.chance * 1000) / 10}%`).join(' · ') + ' a ogni vittoria fuori dai tornei. Mai più di uno per duello.' },
            { icon: '🏟️', titolo: 'Duelli di torneo', testo: `+${TOURNAMENT_DUEL_CREDITS} crediti per ogni duello vinto dentro un torneo: lì si rischia l'eliminazione.` },
            { icon: '🏆', titolo: 'Torneo completato', testo: 'Premio grosso e garantito, diverso per ogni torneo: il Regno dei Duellanti paga in Stelle, Battle City in Carte Locazione, il Torneo Kaiba in Carte del Millennio.' },
            { icon: '✨', titolo: 'Prima vittoria di un torneo', testo: `Il premio di completamento vale ×${FIRST_COMPLETION_MULTIPLIER} la prima volta che vinci quel torneo. Le volte successive è pieno, ma non raddoppiato.` },
            { icon: '📈', titolo: 'I mazzi rincarano', testo: 'Ogni Starter o Structure Deck che compri fa salire il prezzo del successivo dello stesso tipo (contatori separati), e dal secondo in poi serve anche 1 Carta Locazione o 1 Carta del Millennio. Costano sempre Stelle e Crediti insieme.' }
        ];
    }

    /**
     * Il riepilogo premi come HTML, condiviso da chiunque debba mostrarlo
     * (le tre pagine torneo, e in futuro qualunque altra schermata che
     * assegni premi) — così la forma resta una sola e non va alla deriva
     * fra una pagina e l'altra. Lo stile vive in js/economy/rewards.css.
     * Sicuro da inserire con innerHTML: icone, nomi e regole sono tutti
     * testo scritto in questo file, mai input dell'utente.
     */
    function summaryHtml(rewards, titolo) {
        const voci = rewards || [];
        if (voci.length === 0) return '';
        return `<div class="reward-summary">
            <div class="reward-summary-title">${titolo || 'Ricompense'}</div>
            ${voci.map((r) => `
                <div class="reward-row">
                    <span class="reward-icon">${r.icon}</span>
                    <span class="reward-text">
                        <span class="reward-amount">+${r.amount} ${r.nome}</span>
                        <span class="reward-rule">${r.rule}</span>
                    </span>
                </div>`).join('')}
        </div>`;
    }

    window.Rewards = {
        forDuel: forDuel,
        forTournament: forTournament,
        rulesSummary: rulesSummary,
        summaryHtml: summaryHtml,
        CURRENCY_META: CURRENCY_META,
        TOURNAMENT_COMPLETION: TOURNAMENT_COMPLETION,
        FIRST_COMPLETION_MULTIPLIER: FIRST_COMPLETION_MULTIPLIER
    };
})();
