/**
 * field-ambience.js — Vita ambientale del Terreno di duello.
 * =====================================================================
 * Ogni tanto, e solo in certe arene, qualcosa attraversa il campo. Oggi
 * tre ambienti, uno per famiglia di arene:
 *
 *   sabbia  — le cinque arene dell'Antico Egitto: folate di vento che
 *             trascinano sabbia, a terra, fra le rovine;
 *   vento   — il Dirigibile di Kaiba: lassù si duella IN CIELO, sopra il
 *             dirigibile, quindi corre solo aria — nessun granello, che
 *             a quella quota non avrebbe senso;
 *   tech    — le due Arene Kaiba: niente vento affatto, ma il campo
 *             olografico della KaibaCorp che si rivela a intermittenza,
 *             con la sua griglia e le sue scansioni.
 *
 * Non è un effetto di carta e non ha nulla a che vedere con la partita:
 * nessuna funzione del motore sa che questo file esiste, e cancellarlo
 * (con il suo <script>) riporta il duello esatto di prima.
 *
 * QUANDO SI ACCENDE. Tre condizioni, tutte necessarie:
 *   1) i Dettagli video sono su "Alti" (js/ui/video-quality.js,
 *      Impostazioni). È il livello che accende questi effetti: su
 *      "Normali" questo file crea zero elementi e non avvia alcun timer;
 *   2) l'arena in corso è fra quelle che un ambiente dichiara;
 *   3) il giocatore non ha chiesto meno animazioni
 *      (prefers-reduced-motion).
 *
 * COME AGGIUNGERNE UNO NUOVO. Una voce in AMBIENTI, e nient'altro: quali
 * arene copre, che tinte usa, quali strati, ogni quanto, e con quale
 * COREOGRAFIA fra quelle qui sotto. Non si tocca l'orchestrazione (scelta
 * dell'ambiente, pause casuali, sospensione a scheda nascosta, pulizia),
 * si scrivono solo le classi della nuova trama in js/ui/field-ambience.css.
 *
 * LE COREOGRAFIE sono il modo in cui una passata si svolge, ed è l'unica
 * parte che cambia davvero fra un ambiente e l'altro:
 *   'attraversa' — gli strati traversano lo schermo di lato, a velocità
 *                  diverse, respirando a ondate (vedi `respiro`). Vento e
 *                  sabbia;
 *   'scansione'  — niente traversata: il campo si accende dal basso, una
 *                  lama di luce lo percorre e tutto si spegne. Hi-tech.
 *
 * PERCHÉ GSAP. Ogni passata è una sequenza di più strati sfasati, con
 * dentro un'altra sequenza (le ondate della folata). Con le transizioni
 * CSS sarebbe una catena di setTimeout con i ritardi scritti a mano in
 * due posti da tenere allineati; una timeline la descrive in un punto
 * solo e, soprattutto, si può INTERROMPERE pulita a metà — cosa che
 * serve davvero qui, perché il duello può finire o l'impostazione
 * cambiare mentre la folata sta ancora attraversando lo schermo.
 *
 * DIPENDENZA PIGRA: gsap.min.js viene caricato dopo l'evento 'load'
 * (vedi duelMonstersCore.html), quindi quando questo file gira la
 * libreria di solito non c'è ancora — si aspetta con lo stesso schema
 * già usato da js/ui/fx-gsap.js, senza polling infinito.
 */
(function () {
    'use strict';

    // =================================================================
    // Catalogo degli ambienti
    // =================================================================

    /**
     * Tinte della sabbia. Non una sola: la stessa folata che di giorno è
     * polvere dorata controluce, di notte è un velo pallido che prende la
     * luce della luna.
     *
     * Di GIORNO la tinta NON è l'ocra della sabbia: è quasi bianca. Un
     * primo tentativo usava il colore della sabbia vera
     * (rgba(226,186,120)) e il risultato era invisibile — l'arena diurna
     * è già tutta ocra, e ocra su ocra non si stacca. Una folata
     * controluce è anche più fedele: la polvere sollevata dal sole si
     * vede perché RIFLETTE la luce, non per il proprio colore.
     */
    function tintaSabbia(campo) {
        const notte = /Notte/i.test(campo);
        return notte
            ? { piena: 'rgba(202, 210, 232, 0.55)', debole: 'rgba(172, 184, 214, 0.28)' }
            : { piena: 'rgba(255, 245, 222, 0.72)', debole: 'rgba(255, 236, 198, 0.34)' };
    }

    const AMBIENTI = [
        {
            nome: 'sabbia',
            // Le arene dell'Antico Egitto, giorno e notte. Il Palazzo in
            // Rovina è deliberatamente fuori: è un interno, una folata di
            // sabbia lì racconterebbe una cosa che non si vede nell'arte.
            campi: [
                'anticoEgittoGiorno_1.jpg',
                'anticoEgittoGiorno_2.jpg',
                'anticoEgittoNotte_1.jpg',
                'anticoEgittoNotte_2.jpg',
                'anticoEgittoNotte_3.jpg'
            ],
            coreografia: 'attraversa',
            tinta: tintaSabbia,
            // Quanto aspettare fra una folata e la successiva: un minimo e
            // un massimo, sorteggiati ogni volta. Deve restare un evento
            // raro — qualcosa che si nota e poi passa, non un effetto
            // costante che dopo due minuti è solo rumore di fondo.
            pausa: [13000, 30000],
            // Gli strati, dal fondo al primo piano. `quota` è l'opacità di
            // picco, `durata` i secondi per attraversare, `ritardo` lo
            // sfasamento rispetto all'inizio, `deriva` quanto sale o
            // scende strada facendo, `ondate` quante folate distinte
            // pulsano dentro la passata (vedi `respiro`), `slancio` la
            // curva: 0 = velocità costante, 1 = entra di slancio e si
            // smorza, che è come si muove il vento vero.
            strati: [
                // 1. Il velo di fondo: la massa della polvere sollevata,
                //    lenta e larga, quella che "sporca" l'aria.
                { classe: 'fa-sabbia-velo', piano: 'fondo', quota: 0.5, durata: 8.4, ritardo: 0, deriva: 26, ondate: 2, slancio: 0.25 },
                // 2. Il FRONTE della folata: una lingua stretta e densa
                //    che passa decisa. È lei a dare il colpo di vento —
                //    senza, la sabbia sembrava nebbia che si sposta.
                { classe: 'fa-sabbia-fronte', piano: 'fondo', quota: 0.72, durata: 3.2, ritardo: 0.7, deriva: 40, ondate: 1, slancio: 0.85 },
                // 3. La grana vera e propria, a velocità intermedia: è
                //    quella che fa leggere "sabbia" e non "foschia".
                { classe: 'fa-sabbia-granuli', piano: 'fondo', quota: 0.68, durata: 5.2, ritardo: 0.45, deriva: 18, ondate: 3, slancio: 0.4 },
                // 4. Le scie che il vento strappa dalla cresta delle dune,
                //    davanti alle carte: è l'unico strato in primo piano e
                //    il più tenue di tutti — dà la profondità, ma se si
                //    nota davvero sta già dando fastidio a chi legge una
                //    carta.
                { classe: 'fa-sabbia-strisce', piano: 'primopiano', quota: 0.24, durata: 3.4, ritardo: 1.2, deriva: 34, ondate: 2, slancio: 0.7 }
            ]
        },
        {
            nome: 'vento',
            // Il Dirigibile di Kaiba: si duella sul ponte, in quota. Lì
            // non c'è sabbia da sollevare — solo aria che corre, e ogni
            // tanto un filo di nube che passa. Per questo l'ambiente è
            // separato invece di essere "la sabbia senza i granuli": le
            // due cose si muovono in modo diverso, il vento d'alta quota
            // è più rapido e più continuo.
            campi: ['dirigibileKaiba.jpg'],
            coreografia: 'attraversa',
            // Bianco freddo appena accennato: è aria contro un cielo già
            // chiaro, non può che essere discreta.
            tinta: () => ({ piena: 'rgba(255, 255, 255, 0.5)', debole: 'rgba(226, 240, 255, 0.26)' }),
            // In cielo il vento non si prende pause lunghe come una
            // tempesta di sabbia nel deserto: passa spesso.
            pausa: [8000, 19000],
            strati: [
                { classe: 'fa-vento-nube', piano: 'fondo', quota: 0.42, durata: 7, ritardo: 0, deriva: 16, ondate: 2, slancio: 0.2 },
                { classe: 'fa-vento-correnti', piano: 'fondo', quota: 0.5, durata: 3.4, ritardo: 0.4, deriva: 26, ondate: 2, slancio: 0.9 },
                { classe: 'fa-vento-correnti', piano: 'primopiano', quota: 0.26, durata: 2.4, ritardo: 1, deriva: 40, ondate: 1, slancio: 1 }
            ]
        },
        {
            nome: 'tech',
            // Le Arene Kaiba: un campo da duello della KaibaCorp, al
            // chiuso. Niente vento: quello che ogni tanto si vede è
            // l'ologramma del campo che si ridisegna — griglia, lama di
            // scansione, blocchi di dati.
            campi: ['kaibaStadium_1.jpg', 'kaibaStadium_2.jpg'],
            coreografia: 'scansione',
            // Il ciano della macchina: nel resto del gioco è già il colore
            // riservato a "sta parlando il sistema" (vedi js/ui/mp-lobby.css),
            // e qui vale esattamente lo stesso principio.
            tinta: () => ({ piena: 'rgba(127, 227, 255, 0.85)', debole: 'rgba(90, 190, 240, 0.4)' }),
            pausa: [11000, 24000],
            strati: [
                // La griglia del campo olografico: si accende, resta un
                // momento, si spegne. È il fondale dell'intera scansione.
                { classe: 'fa-tech-griglia', piano: 'fondo', forma: 'campo', quota: 0.5, ruolo: 'griglia' },
                // La lama che percorre il campo dal basso verso l'alto:
                // è lei a "leggere" la griglia, e va davanti alle carte
                // perché passi sopra al tavolo, non sotto.
                { classe: 'fa-tech-lama', piano: 'primopiano', forma: 'campo', quota: 0.55, ruolo: 'lama' },
                // Blocchi di dati che lampeggiano al passaggio della lama.
                { classe: 'fa-tech-dati', piano: 'fondo', forma: 'campo', quota: 0.4, ruolo: 'dati' }
            ]
        }
    ];

    // =================================================================
    // Stato
    // =================================================================

    let ambienteAttivo = null;   // la voce di AMBIENTI scelta per questa arena
    let elementi = [];           // gli strati DOM, creati una volta sola
    let timeline = null;         // la passata attualmente in corso, se c'è
    let prossima = null;         // timer che fa partire la prossima passata
    let sospeso = false;

    function menoAnimazioni() {
        return window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    }

    function dettagliAlti() {
        // Senza il modulo dei Dettagli video non si accende nulla: il
        // livello "Alti" è una scelta esplicita, non un default implicito.
        return !!(window.VideoQuality && window.VideoQuality.isAlti());
    }

    /**
     * L'arena in corso. `DUEL_ARENA_CUSTOM_FIELD` è impostata in cima al
     * <body> di duelMonstersCore.html quando si arriva con ?field=; senza
     * quel parametro vale il Terreno di default della pagina.
     */
    function campoCorrente() {
        return window.DUEL_ARENA_CUSTOM_FIELD || 'dirigibileKaiba.jpg';
    }

    function trovaAmbiente(campo) {
        return AMBIENTI.find((a) => a.campi.indexOf(campo) !== -1) || null;
    }

    function fraDueNumeri(min, max) {
        return min + Math.random() * (max - min);
    }

    // =================================================================
    // Strati
    // =================================================================

    function creaElementi(ambiente, campo) {
        const tinta = ambiente.tinta ? ambiente.tinta(campo) : { piena: '#fff', debole: 'rgba(255,255,255,0.3)' };
        elementi = ambiente.strati.map((strato) => {
            const el = document.createElement('div');
            el.className = `fa-strato fa-strato--${strato.piano} ${strato.classe}`
                + (strato.forma === 'campo' ? ' fa-strato--campo' : '');
            el.style.setProperty('--fa-tinta', tinta.piena);
            el.style.setProperty('--fa-tinta-debole', tinta.debole);
            el.setAttribute('aria-hidden', 'true');
            document.body.appendChild(el);
            return { el: el, cfg: strato };
        });
    }

    function rimuoviElementi() {
        elementi.forEach(({ el }) => el.remove());
        elementi = [];
    }

    // =================================================================
    // Coreografia 'attraversa' — vento e sabbia
    // =================================================================

    /**
     * IL RESPIRO DELLA FOLATA, ed è questa la differenza fra "una
     * velatura che scorre" e "una folata di vento".
     *
     * Il vento vero non ha un'intensità sola: arriva a ondate, cala, torna
     * a spingere, poi si smorza. La prima versione di questo effetto
     * faceva salire l'opacità nel primo terzo e scendere nell'ultimo — una
     * sola campana — e il risultato si leggeva come un velo trascinato di
     * peso da un lato all'altro.
     *
     * Qui l'opacità viene costruita a più ondate dentro la stessa passata:
     * ognuna sale in fretta (il colpo di vento) e cala più piano (l'aria
     * che si posa), con picchi di altezza diversa fra loro, e l'ultima
     * chiude sempre a zero. Le ondate non sono mai identiche: la loro
     * altezza si sorteggia ogni volta.
     *
     * @param tl       la timeline della passata
     * @param el       lo strato
     * @param inizio   quando questo strato entra in scena (secondi)
     * @param durata   quanto dura la sua traversata (secondi)
     * @param picco    l'opacità massima raggiungibile
     * @param ondate   quante spinte distinte dentro la passata
     */
    function respiro(tl, el, inizio, durata, picco, ondate) {
        const quante = Math.max(1, ondate || 1);
        // Un po' di margine in coda: l'ultima ondata deve avere il tempo
        // di spegnersi PRIMA che lo strato esca di scena, altrimenti la
        // folata sembra tagliata via invece che dissolta.
        const finestra = durata * 0.92;
        const passo = finestra / quante;

        tl.set(el, { opacity: 0 }, inizio);
        for (let i = 0; i < quante; i++) {
            // La prima ondata è la più forte: è l'arrivo del vento. Le
            // successive rifiatano fra il 55% e il 100% di quella.
            const altezza = picco * (i === 0 ? 1 : fraDueNumeri(0.55, 1));
            const t = inizio + passo * i;
            // Salita rapida, discesa lenta: 35% del tempo per spingere,
            // 65% per posarsi. Invertire i due valori fa sembrare l'aria
            // "risucchiata" invece che soffiata.
            tl.to(el, { opacity: altezza, duration: passo * 0.35, ease: 'sine.out' }, t)
              .to(el, { opacity: i === quante - 1 ? 0 : altezza * 0.3, duration: passo * 0.65, ease: 'sine.inOut' }, t + passo * 0.35);
        }
    }

    /**
     * Una passata di vento (con o senza sabbia). Tutto ciò che la rende
     * diversa dalla precedente si sorteggia qui: il verso, l'inclinazione,
     * quanto è densa, quanto dura. Due passate identiche di fila sono il
     * modo più sicuro per far sembrare finto un effetto ambientale.
     */
    function attraversa(tl) {
        // Da destra o da sinistra. `verso` serve anche a inclinare la
        // deriva verticale nello stesso senso, altrimenti la sabbia
        // sembrerebbe soffiata da due venti diversi insieme.
        const verso = Math.random() < 0.5 ? 1 : -1;
        // Quanto "tira" questa folata: una passata leggera e una vera
        // tempesta usano gli stessi strati, cambia solo l'intensità.
        const forza = fraDueNumeri(0.55, 1);
        const ritmo = fraDueNumeri(0.82, 1.3);

        elementi.forEach(({ el, cfg }) => {
            // La corsa è tutta e sola l'ECCEDENZA dello strato rispetto
            // allo schermo (vedi la larghezza in field-ambience.css): così
            // il pattern scorre per intero da un bordo all'altro senza che
            // il suo margine entri mai nell'inquadratura, e la misura vive
            // in un posto solo — cambiare la larghezza nel CSS aggiorna
            // questa da sé, invece di lasciare due numeri da tenere
            // allineati a mano.
            const corsa = Math.max(0, el.offsetWidth - window.innerWidth);
            const partenza = verso > 0 ? -corsa : 0;
            const arrivo = verso > 0 ? 0 : -corsa;
            const durata = cfg.durata * ritmo;
            // Deriva verticale: il vento non viaggia mai perfettamente in
            // orizzontale. Poca per gli strati di fondo (lontani), di più
            // per quelli in primo piano, che così sembrano passare più
            // vicino all'osservatore.
            const salita = cfg.deriva * fraDueNumeri(0.6, 1.4) * (Math.random() < 0.5 ? 1 : -1);
            // `slancio` sceglie la curva del movimento. A 0 la velocità è
            // costante (aria alta, che scorre e basta); verso 1 lo strato
            // entra di slancio e si smorza, ed è così che si muove una
            // raffica al suolo. Interpolare fra i due easing non si può,
            // quindi si sceglie quello più vicino all'intenzione.
            const curva = (cfg.slancio || 0) > 0.6 ? 'power2.out'
                : (cfg.slancio || 0) > 0.15 ? 'power1.out'
                : 'none';

            gsap.set(el, { x: partenza, y: -salita / 2, opacity: 0 });
            tl.to(el, { x: arrivo, y: salita / 2, duration: durata, ease: curva }, cfg.ritardo);
            respiro(tl, el, cfg.ritardo, durata, cfg.quota * forza, cfg.ondate);
        });
    }

    // =================================================================
    // Coreografia 'scansione' — il campo olografico della KaibaCorp
    // =================================================================

    /**
     * Niente traversata: qui il campo stesso si rivela per un momento.
     * La griglia si accende dal basso, una lama di luce la percorre da
     * sotto a sopra leggendola, qualche blocco di dati lampeggia al suo
     * passaggio, poi tutto torna invisibile.
     *
     * È l'ologramma della macchina, non un fenomeno atmosferico: per
     * questo si muove a scatti netti e in verticale, mentre vento e
     * sabbia scorrono di lato e respirano.
     */
    function scansione(tl) {
        const durata = fraDueNumeri(2.4, 3.4);
        // Quanto deve percorrere la lama: l'altezza VERA della fascia, non
        // una percentuale ricopiata dal CSS. La si prende dalla griglia,
        // che è l'unico strato alto quanto tutta la fascia (la lama è
        // alta un ottavo, vedi .fa-tech-lama). Un primo tentativo usava
        // `yPercent` da 100 a -100, ma quella percentuale è relativa
        // all'altezza dell'ELEMENTO: la lama percorreva due volte se
        // stessa, cioè un quarto scarso del campo, e la scansione si
        // fermava a metà strada.
        const griglia = elementi.find((e) => e.cfg.ruolo === 'griglia');
        const fascia = (griglia && griglia.el.offsetHeight) || Math.round(window.innerHeight * 0.62);

        elementi.forEach(({ el, cfg }) => {
            if (cfg.ruolo === 'griglia') {
                // La griglia non scorre: si accende, resta, si spegne. Un
                // lieve scostamento verticale basta a non farla sembrare
                // un'immagine incollata sopra il campo.
                gsap.set(el, { opacity: 0, y: 10 });
                tl.to(el, { opacity: cfg.quota, y: 0, duration: 0.5, ease: 'power2.out' }, 0)
                  .to(el, { opacity: cfg.quota * 0.55, duration: durata * 0.6, ease: 'sine.inOut' }, 0.5)
                  .to(el, { opacity: 0, y: -8, duration: 0.6, ease: 'power2.in' }, durata + 0.3);
            } else if (cfg.ruolo === 'lama') {
                // Parte sotto il bordo inferiore della fascia ed esce da
                // quello superiore, percorrendola tutta. `el.offsetHeight`
                // è l'altezza della sola lama: serve a farla uscire di
                // scena per intero alle due estremità, invece di comparire
                // e sparire a metà.
                const alta = el.offsetHeight || 0;
                const giu = fascia / 2 + alta;
                gsap.set(el, { opacity: 0, y: giu });
                tl.to(el, { opacity: cfg.quota, duration: 0.2 }, 0.35)
                  .to(el, { y: -giu, duration: durata, ease: 'power1.inOut' }, 0.35)
                  .to(el, { opacity: 0, duration: 0.3 }, durata + 0.25);
            } else {
                // I blocchi dati: due lampi secchi mentre la lama passa,
                // a intensità diversa. Sono il "rumore" della lettura.
                gsap.set(el, { opacity: 0 });
                tl.to(el, { opacity: cfg.quota, duration: 0.12, ease: 'none' }, 0.8)
                  .to(el, { opacity: 0.08, duration: 0.3, ease: 'none' }, 0.95)
                  .to(el, { opacity: cfg.quota * 0.7, duration: 0.1, ease: 'none' }, durata * 0.72)
                  .to(el, { opacity: 0, duration: 0.5, ease: 'sine.in' }, durata * 0.82);
            }
        });
    }

    const COREOGRAFIE = { attraversa: attraversa, scansione: scansione };

    // =================================================================
    // La passata
    // =================================================================

    function raffica() {
        if (!ambienteAttivo || !window.gsap || !elementi.length) return;
        // Una passata alla volta. Senza questa guardia, una seconda
        // chiamata mentre la prima è a metà schermo rimette gli strati al
        // punto di partenza con opacità zero: la folata sparisce di colpo
        // e ricompare dall'altra parte (osservato campionando le opacità
        // nel tempo). Può succedere solo se qualcuno la invoca a mano,
        // ma è proprio quello che fanno le prove e le verifiche.
        if (timeline && timeline.isActive()) return;

        timeline = gsap.timeline({
            onComplete: () => {
                timeline = null;
                programmaProssima();
            }
        });

        const coreografia = COREOGRAFIE[ambienteAttivo.coreografia] || attraversa;
        coreografia(timeline);
    }

    function programmaProssima() {
        if (!ambienteAttivo || sospeso) return;
        clearTimeout(prossima);
        const [min, max] = ambienteAttivo.pausa;
        prossima = setTimeout(raffica, fraDueNumeri(min, max));
    }

    // =================================================================
    // Accensione e spegnimento
    // =================================================================

    function ferma() {
        clearTimeout(prossima);
        prossima = null;
        if (timeline) { timeline.kill(); timeline = null; }
        rimuoviElementi();
        ambienteAttivo = null;
    }

    /**
     * Accende l'ambiente giusto per l'arena in corso, se ce n'è uno e se
     * le condizioni ci sono. Richiamabile più volte senza danni: se è già
     * acceso per la stessa arena non fa nulla.
     */
    function avvia(campoRichiesto) {
        const campo = campoRichiesto || campoCorrente();
        const ambiente = trovaAmbiente(campo);

        if (!ambiente || !dettagliAlti() || menoAnimazioni() || !window.gsap) {
            ferma();
            return false;
        }
        if (ambienteAttivo === ambiente && elementi.length) return true;

        ferma();
        ambienteAttivo = ambiente;
        creaElementi(ambiente, campo);
        // La prima passata non parte subito: si entra in duello e la scena
        // deve essere quella dell'arena, non un effetto che si presenta.
        // Breve però: se il giocatore ha acceso i Dettagli "Alti" apposta,
        // deve vedere entro pochi secondi che qualcosa è cambiato.
        clearTimeout(prossima);
        prossima = setTimeout(raffica, fraDueNumeri(2500, 5000));
        return true;
    }

    // A scheda nascosta non ha senso continuare: i timer di GSAP e il
    // nostro setTimeout terrebbero occupata la CPU (e la batteria) per
    // un'animazione che nessuno sta guardando.
    document.addEventListener('visibilitychange', () => {
        sospeso = document.hidden;
        if (!ambienteAttivo) return;
        if (sospeso) {
            clearTimeout(prossima);
            if (timeline) timeline.pause();
        } else {
            if (timeline) timeline.play();
            else programmaProssima();
        }
    });

    window.FieldAmbience = {
        avvia: avvia,
        ferma: ferma,
        /** Fa partire una passata adesso, senza aspettare la pausa: serve alle prove e alle verifiche. */
        raffica: raffica,
        /** Quale ambiente è acceso ora (null se nessuno) — usata dalle verifiche automatiche. */
        attivo: () => (ambienteAttivo ? ambienteAttivo.nome : null),
        /** Esposto perché una prova possa elencare le arene coperte senza duplicarle a mano. */
        AMBIENTI: AMBIENTI
    };

    // gsap.min.js arriva DOPO l'evento 'load' (caricamento pigro): stesso
    // schema di attesa di js/ui/fx-gsap.js — qualche tentativo a
    // intervalli crescenti, poi si lascia perdere senza rumore.
    (function attendiGsap() {
        let tentativi = 0;
        function riprova() {
            if (window.gsap) { avvia(); return; }
            if (++tentativi > 12) return; // ~10s: se non è arrivata, non arriverà
            setTimeout(riprova, 200 * tentativi);
        }
        if (document.readyState === 'complete') riprova();
        else window.addEventListener('load', riprova, { once: true });
    })();
})();
