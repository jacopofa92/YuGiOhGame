/**
 * cloud-autosync.js — Manda sul cloud le modifiche appena fatte, senza che
 * l'utente debba ricordarsi di sincronizzare a mano.
 *
 * PERCHÉ ESISTE. Il salvataggio LOCALE è sempre stato immediato: ogni
 * CustomCards.add/update/remove e ogni modifica alle categorie scrivono
 * subito in localStorage. Il salvataggio CLOUD però partiva solo da tre
 * punti, tutti fuori da dove si lavora davvero: il pulsante
 * "Sincronizzazione manuale (avanzato)" del Profilo, il Gate di
 * index.html, e l'uscita dall'account. Chi crea dieci carte e poi chiude
 * l'app dal gestore attività — cioè la cosa più naturale del mondo su un
 * telefono — non passa da nessuno dei tre: le carte restano solo su quel
 * dispositivo, e si perdono reinstallando o accedendo da un altro.
 *
 * COME. Un solo punto di ingresso, `CloudAutoSync.schedule()`, chiamato
 * dai due choke point di scrittura (il saveAll di js/data/custom-cards.js e
 * quello di js/data/custom-taxonomy.js) invece che da ogni singolo
 * chiamante: una funzione futura che salvi carte o categorie è coperta
 * senza doversene ricordare. Le chiamate ravvicinate si accorpano
 * (DEBOUNCE_MS) perché una singola azione dell'utente può produrne più
 * d'una — creare una carta scrive la carta E le copie possedute.
 *
 * Il push è deliberatamente SILENZIOSO e non bloccante: se manca la rete o
 * non si è autenticati fallisce e basta, senza toast né banner. Il
 * salvataggio locale è già avvenuto comunque, e restano i push espliciti
 * di Profilo/uscita a recuperare il ritardo. Un errore rumoroso qui
 * interromperebbe di continuo chi sta lavorando alle proprie carte, per un
 * problema che si risolve da solo alla prossima occasione.
 */
(function () {
    'use strict';

    const DEBOUNCE_MS = 2500;

    let timer = null;
    let inFlight = false;
    let dirtyWhileInFlight = false;

    function signedIn() {
        return !!(window.CloudSync && CloudSync.available
            && typeof CloudSync.getUser === 'function' && CloudSync.getUser());
    }

    function run() {
        timer = null;
        if (!signedIn()) return;
        // Un push già in volo non va raddoppiato: la sostituzione completa
        // di cloud-sync.js (delete + insert delle carte) non sopporta due
        // esecuzioni sovrapposte. Si segna che c'è altro da mandare e si
        // riparte alla fine di questo.
        if (inFlight) { dirtyWhileInFlight = true; return; }
        inFlight = true;
        Promise.all([CloudSync.pushSave(), CloudSync.pushCustomCards()])
            .catch((e) => { console.warn('[CloudAutoSync] push automatico non riuscito (riproverà):', e && e.message ? e.message : e); })
            .then(() => {
                inFlight = false;
                if (dirtyWhileInFlight) { dirtyWhileInFlight = false; schedule(); }
            });
    }

    /** Segnala che qualcosa da sincronizzare è cambiato: il push parte fra poco, accorpando le chiamate ravvicinate. */
    function schedule() {
        if (timer) clearTimeout(timer);
        timer = setTimeout(run, DEBOUNCE_MS);
    }

    /**
     * Manda subito quello che c'è in attesa, saltando il debounce — pensata
     * per un momento in cui la pagina sta per sparire e aspettare non ha più
     * senso. Torna una Promise che si risolve comunque, anche fallendo.
     */
    function flush() {
        if (timer) { clearTimeout(timer); timer = null; }
        if (!signedIn()) return Promise.resolve();
        return Promise.all([CloudSync.pushSave(), CloudSync.pushCustomCards()]).catch(() => { });
    }

    window.CloudAutoSync = { schedule: schedule, flush: flush };
})();
