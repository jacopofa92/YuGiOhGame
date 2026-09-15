/**
 * tournament-dialogues.js — Gli intermezzi narrativi dei tornei.
 * =====================================================================
 * Solo TESTI: la scena la mette in piedi js/ui/story-cutscene.js, e a
 * chiamarli sono le pagine dei tornei nei loro punti di passaggio. Qui
 * dentro non c'è logica di gioco, e aggiungere un momento nuovo vuol dire
 * aggiungere una chiave a questo oggetto — niente altro da toccare.
 *
 * FORMA: DIALOGHI[idTorneo][momento] = { titolo?, sottotitolo?, sfondo?, battute }
 * Ogni battuta è { chi?, testo }: `chi` è un id di
 * js/data/characters-db.js (dà nome e ritratto), senza `chi` è la voce
 * narrante, resa come didascalia.
 *
 * `sfondo` è il LUOGO in cui la scena si svolge: il dirigibile, la sala
 * del Castello, l'arena della KaibaCorp. Si dichiarano più candidati in
 * ordine di preferenza e vale il primo che esiste davvero — così si può
 * già puntare a un'immagine che il repository non ha ancora (la Torre
 * Kaiba, per dire) senza che l'intermezzo resti su uno sfondo vuoto.
 *
 * COME SONO SCRITTI. Battute brevi, in carattere, che dicono DOVE siamo e
 * COSA cambia adesso — un intermezzo non è un riassunto della trama: è lo
 * stacco fra due fasi, e il giocatore ci passa in mezzo mentre ha voglia
 * di duellare. Tre-quattro battute al massimo, mai di più.
 *
 * Il gioco è in italiano e i personaggi parlano come nell'adattamento
 * italiano della serie: Kaiba dà del "verme" agli avversari, Pegasus usa
 * i vezzeggiativi ("Yugi-boy"), Joey è sanguigno e diretto, Marik teatrale.
 *
 * VENGONO MOSTRATI UNA VOLTA SOLA per partita (vedi `mostraUnaVolta` in
 * ciascuna pagina torneo): chi rigioca lo stesso torneo — e il Regno dei
 * Duellanti tiene perfino il conto dei tentativi — non deve rivedere gli
 * stessi dialoghi ad ogni giro. Restano comunque sempre saltabili.
 */
(function () {
    'use strict';

    const DIALOGHI = {
        // =============================================================
        // BATTLE CITY
        // =============================================================
        battleCity: {
            /** Sei Carta Locazione raccolte: si sale sul dirigibile. */
            airship: {
                titolo: 'Il Dirigibile',
                sottotitolo: 'Quarti di finale',
                sfondo: ['images/fields/dirigibileKaiba.jpg'],
                battute: [
                    { testo: 'Le sei Carta Locazione si accendono insieme sul Duel Disk. Sopra Domino City, un\'ombra enorme copre il sole: il dirigibile della KaibaCorp scende ad aspettarti.' },
                    { chi: 'kaiba', testo: 'Otto duellanti su tutta la città. Solo otto sono arrivati fin qui — e uno di voi mi darà finalmente un duello degno di questo nome.' },
                    { chi: 'joey', testo: 'Ehi, l\'hai vista quella cosa?! Ci facciamo il torneo VOLANDO! Non dirlo a mia sorella o vorrà salire pure lei.' },
                    { chi: 'kaiba', testo: 'Salite. Da questo momento nessuno scende più, se non da perdente.' }
                ]
            },
            /** Il dirigibile attracca: semifinali in cima alla Torre. */
            tower: {
                titolo: 'Torre Kaiba',
                sottotitolo: 'Semifinali',
                // La Torre non ha ancora un'arena tutta sua: si ripiega
                // sull'Arena Kaiba notturna, che è lo stesso mondo. Il
                // giorno in cui arriverà torreKaiba.jpg, questa riga la
                // userà da sola.
                sfondo: ['images/fields/torreKaiba.jpg', 'images/fields/kaibaStadium_2.jpg'],
                battute: [
                    { testo: 'Il dirigibile attracca al pinnacolo della Torre Kaiba. Sotto di voi, Domino City è solo un tappeto di luci.' },
                    { chi: 'kaiba', testo: 'Benvenuti nell\'arena che ho costruito io. Qui non ci sono trucchi, né scuse: solo il vostro mazzo e la vostra abilità.' },
                    { chi: 'marik', testo: 'Che luogo magnifico per una resa dei conti... Il Faraone sente già le ombre stringersi, lo so.' },
                    { testo: 'Restano in quattro. Il prossimo duello decide chi salirà all\'ultimo piano.' }
                ]
            },
            /** Campione di Battle City. */
            champion: {
                titolo: 'Campione',
                sottotitolo: 'Battle City',
                sfondo: ['images/fields/torreKaiba.jpg', 'images/fields/kaibaStadium_2.jpg'],
                battute: [
                    { testo: 'L\'ultima carta si posa. In cima alla Torre Kaiba resti in piedi tu, e nessun altro.' },
                    { chi: 'kaiba', testo: 'Non credere di aver vinto per sempre. Il prossimo torneo lo organizzo io, e ti aspetterò in finale.' },
                    { chi: 'yamiYugi', testo: 'Hai duellato con il cuore oltre che con le carte. È questo che fa un vero campione.' }
                ]
            }
        },

        // =============================================================
        // REGNO DEI DUELLANTI
        // =============================================================
        duelistKingdom: {
            /** Dieci Stelle: il sentiero verso il Castello si apre. */
            castle: {
                titolo: 'Castello di Pegasus',
                sottotitolo: 'Le finali',
                sfondo: ['images/fields/castello_pegasus.jpg'],
                battute: [
                    { testo: 'Dieci Stelle dell\'Esagono. Il portone del castello si apre e la sala delle finali ti aspetta: marmo a scacchiera, candelabri, e i pegasi di pietra a guardia delle pareti.' },
                    { chi: 'pegasus', testo: 'Ma guarda un po\' chi ce l\'ha fatta! Ti ho osservato per tutta l\'isola, sai. Ho persino preparato il tuo posto a tavola.' },
                    { chi: 'pegasus', testo: 'Quattro duellanti, un solo vincitore. E poi — se arriverai fin lì — ci saremo io e te, faccia a faccia.' },
                    { testo: 'Le porte si chiudono alle tue spalle. Da qui in avanti, chi perde lascia l\'isola.' }
                ]
            },
            /** Il Cancello di Kaiba: l'incontro a sorpresa prima del Castello. */
            kaibaGate: {
                titolo: 'Il Cancello',
                sottotitolo: 'Un ostacolo inatteso',
                // Si è ancora FUORI dal portone: le rovine dell'isola,
                // non la sala del Castello.
                sfondo: ['images/fields/rovine_1.jpg'],
                battute: [
                    { testo: 'Sul sentiero che porta al castello, una figura in trench bianco ti sbarra la strada.' },
                    { chi: 'kaiba', testo: 'Fermo lì. Ho un conto in sospeso con Pegasus, e non ho intenzione di aspettare il mio turno dietro a te.' },
                    { chi: 'kaiba', testo: 'Vuoi passare? Batti me. È l\'unico pedaggio che accetto.' }
                ]
            },
            /** L'ultimo duello: Pegasus in persona. */
            pegasus: {
                titolo: 'Il Duello Finale',
                sottotitolo: 'Maximillion Pegasus',
                sfondo: ['images/fields/castello_pegasus.jpg'],
                battute: [
                    { testo: 'La sala si svuota. Resta solo un tavolo, e l\'uomo che ha inventato questo gioco.' },
                    { chi: 'pegasus', testo: 'Sai qual è la parte più deliziosa, caro il mio duellante? Che io le tue carte le ho disegnate tutte. Ogni singola.' },
                    { chi: 'pegasus', testo: 'Vediamo se sai usarle meglio di quanto io sappia leggerti nel pensiero.' }
                ]
            },
            /** Campione del Regno dei Duellanti. */
            champion: {
                titolo: 'Campione',
                sottotitolo: 'Regno dei Duellanti',
                sfondo: ['images/fields/castello_pegasus.jpg'],
                battute: [
                    { testo: 'L\'Occhio del Millennio si spegne. Pegasus resta seduto, a lungo, senza dire niente.' },
                    { chi: 'pegasus', testo: 'Battuto... e nel mio stesso gioco. Congratulazioni: il titolo è tuo, e me lo sono meritato tutto.' }
                ]
            }
        },

        // =============================================================
        // TORNEO KAIBA (KaibaCorp Grand Championship)
        // =============================================================
        kaibaTournament: {
            /** Apertura del tabellone. */
            start: {
                titolo: 'Grand Championship',
                sottotitolo: 'Quarti di finale',
                sfondo: ['images/fields/kaibaStadium_1.jpg'],
                battute: [
                    { testo: 'Otto nomi sul tabellone, un\'unica arena. La KaibaCorp ha aperto le porte del suo stadio al mondo intero.' },
                    { chi: 'kaiba', testo: 'Ho costruito questo torneo per un solo motivo: trovare qualcuno che valga il mio tempo. Dimostrami che non ho sprecato l\'invito.' }
                ]
            },
            /** Semifinali. */
            semi: {
                titolo: 'Semifinale',
                sottotitolo: 'Restano in quattro',
                sfondo: ['images/fields/kaibaStadium_1.jpg'],
                battute: [
                    { testo: 'Metà tabellone è già cancellata. Le luci dell\'arena si abbassano su quattro duellanti soltanto.' },
                    { chi: 'pegasus', testo: 'Sei arrivato fino a qui... che meraviglia! Ma da adesso, credimi, il gioco cambia sul serio.' }
                ]
            },
            /** Finale. */
            final: {
                titolo: 'Finale',
                sottotitolo: 'L\'ultimo duello',
                // Finale e vittoria di notte: l'arena illuminata a giorno
                // resta ai turni precedenti, così le fasi si distinguono
                // anche dallo sfondo.
                sfondo: ['images/fields/kaibaStadium_2.jpg'],
                battute: [
                    { testo: 'Lo stadio è in piedi. Sul tabellone è rimasto un solo incontro.' },
                    { chi: 'kaiba', testo: 'Eccoci. Nessun alibi, nessuna interferenza: solo il mio mazzo contro il tuo. È per questo che ho costruito tutto.' }
                ]
            },
            /** Campione. */
            champion: {
                titolo: 'Campione',
                sottotitolo: 'KaibaCorp Grand Championship',
                sfondo: ['images/fields/kaibaStadium_2.jpg'],
                battute: [
                    { testo: 'Il tabellone si chiude con il tuo nome in cima.' },
                    { chi: 'kaiba', testo: 'Hai vinto. Non aspettarti che lo ripeta.' },
                    { chi: 'kaiba', testo: 'Ma tieniti pronto: il prossimo Grand Championship comincia nel momento in cui deciderò io.' }
                ]
            }
        }
    };

    /**
     * L'intermezzo di un momento, o null se per quel momento non c'è
     * nulla da raccontare — così chi chiama non deve sapere quali momenti
     * esistano davvero.
     */
    function per(torneo, momento) {
        const t = DIALOGHI[torneo];
        return (t && t[momento]) || null;
    }

    /**
     * Mostra l'intermezzo di un momento UNA VOLTA SOLA nella partita in
     * corso, e lo segna come visto nello stato del torneo.
     *
     * Sta qui e non in ciascuna pagina perché la regola è la stessa per
     * tutti e tre i tornei, e perché il punto delicato è uno solo: lo
     * stato va marcato e salvato PRIMA che la scena parta, non dopo. Un
     * intermezzo si può chiudere anche ricaricando la pagina a metà, e in
     * quel caso deve restare visto — altrimenti ricompare ad ogni
     * riapertura del torneo, che è esattamente l'effetto più fastidioso.
     *
     * Torna sempre una Promise, anche quando non mostra nulla: chi chiama
     * può incatenarci il seguito senza distinguere i casi.
     *
     * @param {string} torneo    id del torneo (chiave di DIALOGHI)
     * @param {string} momento   quale intermezzo
     * @param {object} state     lo stato del torneo (ci scrive dentro)
     * @param {function} salva   come persistere lo stato (saveState della pagina)
     */
    function mostraUnaVolta(torneo, momento, state, salva) {
        const scena = per(torneo, momento);
        if (!scena || !state || !window.StoryCutscene) return Promise.resolve();

        if (!Array.isArray(state.intermezziVisti)) state.intermezziVisti = [];
        if (state.intermezziVisti.indexOf(momento) !== -1) return Promise.resolve();

        state.intermezziVisti.push(momento);
        if (typeof salva === 'function') salva(state);

        return StoryCutscene.play(scena.battute, {
            titolo: scena.titolo,
            sottotitolo: scena.sottotitolo,
            sfondo: scena.sfondo
        });
    }

    window.TournamentDialogues = {
        per: per,
        mostraUnaVolta: mostraUnaVolta,
        DIALOGHI: DIALOGHI
    };
})();
