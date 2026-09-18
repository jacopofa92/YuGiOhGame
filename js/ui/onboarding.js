/**
 * onboarding.js — Il primo avvio: la bottega del nonno.
 * =====================================================================
 * Un giocatore nuovo non compila un modulo col proprio nome: entra nel
 * negozio di giochi di Solomon Muto, che lo accoglie, gli chiede come si
 * chiama e gli mette davanti due mazzi fra cui scegliere — quello di
 * Yugi e quello di Kaiba. Il protagonista NON è Yugi: è il giocatore, un
 * duellante qualunque che comincia adesso.
 *
 * USO (da index.html, al posto del vecchio modale "Nuova Partita"):
 *
 *     Onboarding.avvia().then((esito) => {
 *         // esito: { nome, packId } — il salvataggio è GIÀ creato
 *     });
 *
 * La Promise si risolve solo a scelta fatta: non c'è modo di uscirne
 * senza un nome e un mazzo, perché senza quei due il gioco non
 * comincerebbe. È deliberatamente l'unica schermata del progetto senza
 * una via di fuga — a differenza degli intermezzi dei tornei, che si
 * saltano sempre.
 *
 * DIVISIONE DEI COMPITI: le battute del nonno passano da
 * js/ui/story-cutscene.js, lo stesso componente degli intermezzi dei
 * tornei (ritratto, testo che si scrive, sfondo del luogo); qui restano
 * solo i due passaggi che una cutscene non sa fare — scrivere il proprio
 * nome e scegliere fra due mazzi guardandoli. Mescolarli dentro la
 * cutscene avrebbe voluto dire insegnarle i moduli e le scelte per un
 * caso solo.
 */
(function () {
    'use strict';

    /** I due mazzi proposti. Restano due: una scelta fra due si fa, fra otto si subisce. */
    const MAZZI = [
        {
            packId: 'starter_sdy_yugi',
            chi: 'Il mazzo di Yugi',
            descrizione: 'Magie e Trappole per rovesciare il duello quando sembra perso. Premia chi sa aspettare il momento giusto.'
        },
        {
            packId: 'starter_sdk_kaiba',
            chi: 'Il mazzo di Kaiba',
            descrizione: 'Mostri potenti e colpi diretti. Premia chi attacca per primo e non lascia respirare l\'avversario.'
        }
    ];

    const SFONDO = ['images/fields/anticoEgittoGiorno_1.jpg'];

    function pacchetto(packId) {
        if (typeof starterStructureDeckDatabase === 'undefined') return null;
        return starterStructureDeckDatabase.find((d) => d.packId === packId) || null;
    }

    function contaCarte(pack) {
        if (!pack) return 0;
        return (pack.main || []).reduce((somma, v) => somma + (v.qty || 0), 0);
    }

    function el(tag, classe, testo) {
        const nodo = document.createElement(tag);
        if (classe) nodo.className = classe;
        // textContent e non innerHTML: il nome del giocatore finisce in
        // questa schermata, ed è testo libero.
        if (testo !== undefined) nodo.textContent = testo;
        return nodo;
    }

    /**
     * Una schermata dell'onboarding: sfondo, titolo, contenuto, pulsanti.
     * Torna { scena, contenuto, chiudi } — il chiamante riempie
     * `contenuto` e decide quando chiudere.
     */
    function costruisciScena(occhiello, titolo, sottotitolo) {
        const scena = el('div', 'ob-scena');

        const sfondo = el('div', 'ob-sfondo');
        sfondo.style.backgroundImage = `url('${SFONDO[0]}')`;
        scena.appendChild(sfondo);
        scena.appendChild(el('div', 'ob-velo'));

        const contenuto = el('div', 'ob-contenuto');
        if (occhiello) contenuto.appendChild(el('div', 'ob-occhiello', occhiello));
        if (titolo) contenuto.appendChild(el('div', 'ob-titolo', titolo));
        if (sottotitolo) contenuto.appendChild(el('div', 'ob-sottotitolo', sottotitolo));
        scena.appendChild(contenuto);

        document.body.appendChild(scena);
        requestAnimationFrame(() => scena.classList.add('is-visibile'));

        const chiudi = () => new Promise((risolvi) => {
            scena.classList.remove('is-visibile');
            setTimeout(() => { scena.remove(); risolvi(); }, 420);
        });

        return { scena: scena, contenuto: contenuto, chiudi: chiudi };
    }

    /** Passo 1: il nome. Risolve con il nome scelto (mai vuoto). */
    function chiediNome() {
        return new Promise((risolvi) => {
            const s = costruisciScena(
                'Negozio di giochi Muto',
                'Come ti chiami, ragazzo?',
                'Sarà il nome che i Duellanti impareranno a temere.'
            );

            const campo = el('div', 'ob-campo');
            const input = document.createElement('input');
            input.type = 'text';
            input.className = 'ob-input';
            input.maxLength = 24;
            input.placeholder = 'Il tuo nome';
            campo.appendChild(input);
            campo.appendChild(el('div', 'ob-aiuto', 'Potrai cambiarlo quando vuoi dal tuo Profilo.'));
            s.contenuto.appendChild(campo);

            const azioni = el('div', 'ob-azioni');
            const avanti = el('button', 'ob-btn', 'Piacere di conoscerti ›');
            avanti.type = 'button';
            avanti.disabled = true;
            azioni.appendChild(avanti);
            s.contenuto.appendChild(azioni);

            // Il pulsante resta spento finché non c'è un nome vero: senza,
            // si finirebbe a chiamarsi "Giocatore" per distrazione al primo
            // tocco, ed è il nome che poi compare ovunque.
            const controlla = () => { avanti.disabled = input.value.trim().length === 0; };
            input.addEventListener('input', controlla);
            input.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' && !avanti.disabled) avanti.click();
            });

            avanti.onclick = () => {
                const nome = input.value.trim();
                if (!nome) return;
                if (window.NativeHaptics) NativeHaptics.light();
                s.chiudi().then(() => risolvi(nome));
            };

            // `focus` dopo un attimo: su telefono chiamarlo mentre la
            // schermata sta ancora comparendo fa aprire la tastiera prima
            // che ci sia qualcosa da vedere.
            setTimeout(() => input.focus(), 500);
        });
    }

    /** Passo 2: il mazzo. Risolve con il packId scelto. */
    function chiediMazzo(nome) {
        return new Promise((risolvi) => {
            const s = costruisciScena(
                'La scelta',
                'Quale ti somiglia di più?',
                `Due mazzi, ${nome}. Prendine uno: sarà il tuo punto di partenza, non la tua prigione — potrai cambiarlo, ampliarlo, rifarlo da capo.`
            );

            let scelto = null;
            const conferma = el('button', 'ob-btn', 'Questo è il mio mazzo');
            conferma.type = 'button';
            conferma.disabled = true;

            const griglia = el('div', 'ob-mazzi');
            MAZZI.forEach((voce) => {
                const pack = pacchetto(voce.packId);
                const carta = el('div', 'ob-mazzo');
                carta.appendChild(el('div', 'ob-mazzo-segno', '✓'));

                // La stessa scatola 3D che il mazzo avrà in Creazione Deck
                // e nella barra in alto: il giocatore riconoscerà proprio
                // quella, invece di scoprire dopo che "il suo mazzo" ha un
                // altro aspetto.
                if (window.DeckBox && typeof DeckBox.markup === 'function') {
                    const box = el('div');
                    box.innerHTML = DeckBox.markup({
                        name: pack ? pack.name : voce.chi,
                        color: DeckBox.colorForId(voce.packId)
                    });
                    const nomeInterno = box.querySelector('.dbx-name');
                    if (nomeInterno) nomeInterno.style.display = 'none';
                    carta.appendChild(box);
                }

                carta.appendChild(el('div', 'ob-mazzo-chi', voce.chi));
                carta.appendChild(el('div', 'ob-mazzo-nome', pack ? pack.name : voce.packId));
                carta.appendChild(el('div', 'ob-mazzo-desc', voce.descrizione));
                carta.appendChild(el('div', 'ob-mazzo-conta', `${contaCarte(pack)} carte`));

                carta.onclick = () => {
                    scelto = voce.packId;
                    griglia.querySelectorAll('.ob-mazzo').forEach((c) => c.classList.remove('is-scelto'));
                    carta.classList.add('is-scelto');
                    conferma.disabled = false;
                    if (window.NativeHaptics) NativeHaptics.light();
                };
                griglia.appendChild(carta);
            });
            s.contenuto.appendChild(griglia);

            const azioni = el('div', 'ob-azioni');
            azioni.appendChild(conferma);
            s.contenuto.appendChild(azioni);

            conferma.onclick = () => {
                if (!scelto) return;
                if (window.NativeHaptics) NativeHaptics.success();
                s.chiudi().then(() => risolvi(scelto));
            };
        });
    }

    /** Le battute del nonno, affidate al componente degli intermezzi. */
    function dialogo(battute, titolo, sottotitolo) {
        if (!window.StoryCutscene) return Promise.resolve();
        return StoryCutscene.play(battute, {
            titolo: titolo,
            sottotitolo: sottotitolo,
            sfondo: SFONDO
        });
    }

    /**
     * L'intero primo avvio. Crea il salvataggio da sé — con il nome e il
     * mazzo scelti — e risolve con quello che è stato deciso.
     */
    function avvia() {
        return dialogo([
            { testo: 'La porta del negozio di giochi si chiude alle tue spalle. Dentro sa di cartone e di legno vecchio; sugli scaffali, scatole di mazzi fino al soffitto.' },
            { chi: 'solomonMuto', testo: 'Benvenuto, benvenuto! Non ti avevo mai visto da queste parti... e credimi, io me li ricordo tutti quelli che entrano qui.' },
            { chi: 'solomonMuto', testo: 'Duel Monsters, eh? Hai l\'aria di uno che ha già deciso di imparare. Allora cominciamo dalle presentazioni.' }
        ], 'Il Negozio di Giochi', 'Prima di tutto')
            .then(chiediNome)
            .then((nome) => dialogo([
                { chi: 'solomonMuto', testo: `${nome}. Me lo segno, ${nome} — ho la sensazione che lo risentirò.` },
                { chi: 'solomonMuto', testo: 'Ora la parte seria. Un duellante non si sceglie il mazzo: è il mazzo che dice chi sei. E io ne ho due, qui sotto al bancone, che valgono più di quanto costino.' }
            ], null, null).then(() => nome))
            .then((nome) => chiediMazzo(nome).then((packId) => ({ nome: nome, packId: packId })))
            .then((esito) => {
                const pack = pacchetto(esito.packId);
                const nomeMazzo = pack ? pack.name : 'il tuo mazzo';
                return dialogo([
                    { chi: 'solomonMuto', testo: `${nomeMazzo}. Ottima scelta — anche se, fra noi, non esiste una scelta sbagliata: esiste solo chi impara a usare quello che ha.` },
                    { chi: 'solomonMuto', testo: `Tienilo con te, ${esito.nome}. Le carte non sono pezzi di cartone: hanno un cuore, e rispondono a chi ce l'ha.` },
                    { testo: 'Il nonno ti mette la scatola fra le mani. Fuori, la città ti aspetta — e con lei tutti i Duellanti che non vedono l\'ora di scoprire chi sei.' }
                ], null, null).then(() => esito);
            })
            .then((esito) => {
                // Il salvataggio si crea SOLO adesso, a scelta conclusa: se
                // il giocatore ricaricasse a metà dialogo, al ritorno
                // troverebbe l'onboarding da capo invece di una partita a
                // metà con un mazzo che non ha scelto.
                SaveManager.createNew(esito.nome, esito.packId);
                return esito;
            });
    }

    window.Onboarding = {
        avvia: avvia,
        MAZZI: MAZZI
    };
})();
