/**
 * comandi.js — le mosse dei giocatori come COMANDI.
 * =====================================================================
 * Priorità 3 del piano, Multiplayer "a passo comune". Ogni mossa fatta da
 * un giocatore (Evocare, Settare, attaccare, attivare, avanzare di fase)
 * diventa un comando: un piccolo oggetto con TUTTE le scelte già dentro,
 * per esempio { tipo: 'evoca', carta: <uid>, casella: 2, posizione:
 * 'attack' }. Lo esegue una funzione sola, con il posto come parametro.
 *
 * Perché: nel passo comune i due telefoni eseguono l'intera partita. La
 * mossa della persona, sul suo telefono, si esegue dal click; sul telefono
 * dell'avversario arriva dalla rete come lo stesso comando, e si esegue
 * con lo STESSO codice per il posto remoto. Due versioni della stessa
 * mossa (una "mia", una "dell'avversario") prima o poi divergono — è
 * successo, più volte, con i messaggi che descrivevano le mosse.
 *
 * Un comando porta la carta per uid (carta), non solo per posizione nella
 * mano: dalla pressione del pulsante all'esecuzione la mano può cambiare,
 * e un uid non si sposta. `extra` porta ciò che serve solo all'animazione
 * di chi la mossa l'ha fatta (da dove parte il volo della carta): non
 * viaggia, e il codice delle regole non ci conta.
 *
 * Script classico, gruppo "partita" (scripts/gruppi-script.js): gli
 * esecutori vivono nei file della loro mossa (evocazioni.js, battaglia.js,
 * fasi.js) e questo file li elenca.
 */

const Comandi = (function () {
    'use strict';

    /**
     * Gli esecutori, per tipo di comando. Ciascuno riceve (posto, comando,
     * extra) e fa la mossa per quel posto. Un tipo nuovo si aggiunge qui.
     */
    const ESECUTORI = {
        evoca: (posto, c, extra) => eseguiEvocazioneNormale(posto, c, extra),
        tributa: (posto, c, extra) => eseguiTributo(posto, c, extra),
        settaMT: (posto, c, extra) => eseguiSetMagiaTrappola(posto, c, extra),
        terreno: (posto, c, extra) => eseguiSetMagiaTerreno(posto, c, extra),
        posizione: (posto, c) => eseguiCambioPosizione(posto, c)
    };

    /**
     * La posizione in mano della carta del comando: per uid se c'è (la
     * via sicura), altrimenti per indice.
     * @returns {number} -1 se la carta non è più in mano
     */
    function indiceInMano(posto, comando) {
        const mano = Tavolo.mano(posto);
        if (comando.carta !== undefined && comando.carta !== null) {
            return mano.findIndex((c) => c && c.uid === comando.carta);
        }
        return typeof comando.mano === 'number' && mano[comando.mano] ? comando.mano : -1;
    }

    /**
     * Esegue un comando per il posto `posto`.
     * @param {string} posto
     * @param {object} comando  { tipo, ...le scelte }
     * @param {object} [extra]  solo per l'animazione locale, non viaggia
     */
    function esegui(posto, comando, extra) {
        const esecutore = comando && ESECUTORI[comando.tipo];
        if (!esecutore) {
            console.error(`Comandi: tipo sconosciuto "${comando && comando.tipo}"`);
            return false;
        }
        return esecutore(posto, comando, extra || {});
    }

    return { esegui, indiceInMano, TIPI: Object.keys(ESECUTORI) };
})();

/**
 * Due modi di dire la stessa cosa nel registro, a seconda di chi ha fatto
 * la mossa: la persona davanti allo schermo ("Hai Evocato...") o l'altro
 * posto ("L'avversario ha Evocato...").
 */
function perChi(posto, perMe, perLaltro) {
    return posto === 'player' ? perMe : perLaltro;
}
