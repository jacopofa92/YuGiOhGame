/**
 * js/economy/shop-ui.js — IL NEGOZIO, COSTRUITO UNA VOLTA SOLA
 * =====================================================================
 * Il Negozio è raggiungibile da due punti: la pagina autonoma
 * negozio.html e la vista fusa dentro index.html. Invece di copiarlo in
 * entrambi — copie a mano della stessa schermata sono già andate alla
 * deriva più volte in questo progetto, vedi CLAUDE.md — vive qui e si
 * innesta dove serve con `ShopUI.mount(contenitore)`.
 *
 * DIVISIONE DEI COMPITI
 *   js/economy/shop-catalog.js  decide COSA è in vendita e a che prezzo
 *   js/data/card-rarity.js      decide quali carte sono rare
 *   js/economy/rewards.js       sa come si guadagna (e lo spiega)
 *   questo file                 disegna, e gestisce gli acquisti
 *
 * FILO CONDUTTORE, richiesta esplicita dell'utente: ogni scaffale
 * DICHIARA la propria regola di rifornimento, ogni prezzo dice in quale
 * valuta è e da dove quella valuta arriva, e in fondo c'è l'elenco
 * completo di come si guadagna. Niente deve sembrare arrivare "a caso".
 *
 * Il markup è costruito qui in JS e non c'è nessun id: tutto si trova per
 * riferimento diretto agli elementi creati. È deliberato — dentro
 * index.html convivono più viste e gli id andrebbero prefissati a mano,
 * che è esattamente il punto in cui quel file ha già raccolto tre bug.
 */
(function () {
    'use strict';

    const CARD_W = 'clamp(74px, 17vw, 104px)';

    const VALUTE = {
        credits: { icon: '💰', nome: 'Crediti', etichetta: 'Crediti' },
        starChips: { icon: '⭐', nome: 'Stelle', etichetta: 'Stelle' },
        locatorCards: { icon: '🃏', nome: 'Carte Locazione', etichetta: 'Carte Locazione' },
        millenniumCards: { icon: '🔱', nome: 'Carte del Millennio', etichetta: 'Carte del Millennio' }
    };

    function db() {
        if (typeof cardDatabase !== 'undefined' && Array.isArray(cardDatabase)) return cardDatabase;
        return window.cardDatabase || [];
    }
    function nomeCarta(cardId) {
        const c = db().find((x) => x.id === cardId);
        return c ? c.name : 'Carta';
    }
    /** "1.250" invece di "1250": i prezzi grandi si leggono a colpo d'occhio. */
    function numero(n) { return Number(n).toLocaleString('it-IT'); }

    function el(tag, className, testo) {
        const e = document.createElement(tag);
        if (className) e.className = className;
        if (testo != null) e.textContent = testo;
        return e;
    }

    /** Miniatura di una carta vera, con la stessa cornice del duello (serve js/ui/card.css). */
    function miniatura(cardId, larghezza) {
        const carta = db().find((c) => c.id === cardId);
        if (!carta || typeof window.createCardElement !== 'function') return el('div', '', '?');
        const node = window.createCardElement(carta);
        const w = larghezza || CARD_W;
        node.style.setProperty('--card-w', w);
        node.style.setProperty('--card-h', `calc(${w} / 0.685)`);
        return node;
    }

    function formattaAttesa(ms) {
        const totaleMin = Math.max(0, Math.floor(ms / 60000));
        const giorni = Math.floor(totaleMin / 1440);
        const ore = Math.floor((totaleMin % 1440) / 60);
        const minuti = totaleMin % 60;
        if (giorni > 0) return `cambia fra ${giorni}g ${ore}h`;
        if (ore > 0) return `cambia fra ${ore}h ${minuti}m`;
        return `cambia fra ${minuti}m`;
    }

    /**
     * Innesta il Negozio dentro `contenitore`. Torna un oggetto con
     * `refresh()` per chi deve ridisegnarlo (es. la vista fusa, quando ci
     * si rientra dopo aver giocato e guadagnato).
     */
    function mount(contenitore) {
        if (!contenitore) return null;
        contenitore.innerHTML = '';
        const root = el('div', 'shop-root');
        contenitore.appendChild(root);

        // ---- Portafoglio
        const walletRow = el('div', 'wallet-row');
        const valori = {};
        Object.keys(VALUTE).forEach((chiave) => {
            const tile = el('div', 'wallet-tile');
            tile.appendChild(el('div', 'wallet-icon', VALUTE[chiave].icon));
            const box = el('div');
            const val = el('div', 'wallet-value', '0');
            box.appendChild(val);
            box.appendChild(el('div', 'wallet-label', VALUTE[chiave].etichetta));
            tile.appendChild(box);
            walletRow.appendChild(tile);
            valori[chiave] = val;
        });
        root.appendChild(walletRow);

        // ---- Avviso orologio: mostrato SOLO se la data non viene dal
        // server. Il giocatore deve sapere che la rotazione sta seguendo
        // l'orologio del dispositivo, non scoprirlo da sé.
        const avviso = el('div', 'clock-warning');
        avviso.style.display = 'none';
        avviso.textContent = '⚠️ Non è stato possibile leggere la data dal server: la rotazione sta seguendo l\'orologio di questo dispositivo. Alla prossima apertura con connessione tornerà allineata a quella di tutti.';
        root.appendChild(avviso);

        /** Costruisce l'intestazione di uno scaffale: titolo, conto alla rovescia, e la REGOLA di rifornimento. */
        function sezione(titolo, regolaHtml) {
            const sec = el('section', 'shop-section');
            const head = el('div', 'shop-head');
            head.appendChild(el('h2', null, titolo));
            const timer = el('span', 'shop-timer', '—');
            head.appendChild(timer);
            sec.appendChild(head);
            const regola = el('p', 'shop-rule');
            regola.innerHTML = regolaHtml;
            sec.appendChild(regola);
            const grid = el('div', 'shop-grid');
            sec.appendChild(grid);
            root.appendChild(sec);
            return { grid: grid, timer: timer };
        }

        const secCarte = sezione('🗓️ Carte del giorno',
            'Quattro carte singole: <strong>3 comuni</strong> e <strong>1 rara</strong>. Cambiano tutte insieme a mezzanotte e sono le stesse per tutti. La rara si può prendere anche con <strong>1 🔱 Carta del Millennio</strong>, che arriva soprattutto dal Torneo Kaiba: è il modo di avere a colpo sicuro una carta che le buste non ti danno mai.');
        const secBuste = sezione('📦 Buste della settimana',
            'Tre buste da <strong>10 carte</strong> ciascuna: cambia la qualità, mai la quantità. Le rare indicate sono <strong>garantite</strong>; la percentuale è la probabilità che una di esse venga promossa a <strong>ultra rara</strong>. Il contenuto è estratto al momento dell\'apertura, quindi è diverso per ognuno. Ruotano ogni lunedì.');
        secBuste.grid.classList.add('packs');
        const secMazzi = sezione('🗃️ Starter e Structure Deck',
            'Si pagano solo in <strong>⭐ Stelle dell\'Esagono</strong>, che arrivano quasi soltanto dai tornei: non si possono comprare accumulando crediti nei duelli liberi. Ogni mazzo si acquista <strong>una volta sola</strong> e le sue carte entrano subito nella collezione.');
        secMazzi.grid.classList.add('decks');
        secMazzi.timer.textContent = 'sempre disponibili';

        // ---- Regole dell'economia
        const secRegole = el('section', 'shop-section');
        const rulesBox = el('div', 'rules-box');
        rulesBox.appendChild(el('h2', null, '💡 Come si guadagna'));
        (window.Rewards ? Rewards.rulesSummary() : []).forEach((r) => {
            const riga = el('div', 'rule-item');
            riga.appendChild(el('span', 'rule-icon', r.icon));
            const testo = el('span');
            testo.appendChild(el('span', 'rule-title', r.titolo));
            testo.appendChild(document.createElement('br'));
            testo.appendChild(el('span', 'rule-text', r.testo));
            riga.appendChild(testo);
            rulesBox.appendChild(riga);
        });
        secRegole.appendChild(rulesBox);
        root.appendChild(secRegole);

        // ---- Modale di apertura busta
        const pullBackdrop = el('div', 'shop-pull-backdrop');
        const pullCard = el('div', 'shop-pull-card');
        const pullTitle = el('h3', null, 'Busta aperta!');
        const pullSub = el('p', 'shop-pull-sub');
        const pullGrid = el('div', 'shop-pull-grid');
        const pullClose = el('button', 'shop-pull-close', 'Chiudi');
        pullClose.type = 'button';
        pullCard.appendChild(pullTitle);
        pullCard.appendChild(pullSub);
        pullCard.appendChild(pullGrid);
        pullCard.appendChild(pullClose);
        pullBackdrop.appendChild(pullCard);
        document.body.appendChild(pullBackdrop);
        pullClose.onclick = () => pullBackdrop.classList.remove('open');
        pullBackdrop.addEventListener('click', (e) => { if (e.target === pullBackdrop) pullBackdrop.classList.remove('open'); });

        // ================================================================
        // Acquisti
        // ================================================================
        function aggiornaPortafoglio() {
            const w = SaveManager.getCurrency();
            Object.keys(valori).forEach((chiave) => { valori[chiave].textContent = numero(w[chiave] || 0); });
            return w;
        }

        /**
         * Pulsante d'acquisto per UNA valuta. Se il saldo non basta resta
         * visibile ma disabilitato e dice quanto manca: farlo sparire
         * lascerebbe il giocatore senza sapere nemmeno il prezzo.
         */
        function pulsanteAcquisto(valuta, importo, alternativo, onBuy) {
            const w = SaveManager.getCurrency();
            const meta = VALUTE[valuta];
            const btn = el('button', 'buy-btn' + (alternativo ? ' alt' : ''));
            btn.type = 'button';
            const basta = (w[valuta] || 0) >= importo;
            btn.disabled = !basta;
            btn.textContent = basta
                ? `${meta.icon} ${numero(importo)}`
                : `${meta.icon} ${numero(importo)} — te ne mancano ${numero(importo - (w[valuta] || 0))}`;
            btn.onclick = () => onBuy(valuta, importo);
            return btn;
        }

        /** Doppio controllo sul saldo: il pulsante è già disabilitato, ma un click duplicato non deve poter passare. */
        function paga(valuta, importo) {
            const w = SaveManager.getCurrency();
            if ((w[valuta] || 0) < importo) return false;
            SaveManager.addCurrency(valuta, -importo);
            return true;
        }

        function renderCarteDelGiorno() {
            secCarte.grid.innerHTML = '';
            ShopCatalog.carteDelGiorno().forEach((voce) => {
                const item = el('div', 'shop-item rarity-' + voce.rarity);
                const art = el('div', 'shop-item-art');
                art.appendChild(miniatura(voce.cardId));
                item.appendChild(art);
                item.appendChild(el('span', 'shop-badge ' + voce.rarity, CardRarity.label(voce.rarity)));
                item.appendChild(el('div', 'shop-item-name', nomeCarta(voce.cardId)));
                const possedute = SaveManager.getOwnedCount(voce.cardId);
                item.appendChild(el('div', 'shop-item-meta',
                    possedute > 0 ? `Ne possiedi ${possedute}` : 'Non ancora nella collezione'));

                const riga = el('div', 'buy-row');
                const compra = (valuta, importo) => {
                    if (!paga(valuta, importo)) return;
                    SaveManager.addOwnedCards(voce.cardId, 1);
                    if (window.NativeHaptics) NativeHaptics.success();
                    refresh();
                };
                riga.appendChild(pulsanteAcquisto('credits', voce.costo.credits, false, compra));
                if (voce.costo.millenniumCards) {
                    riga.appendChild(pulsanteAcquisto('millenniumCards', voce.costo.millenniumCards, true, compra));
                }
                item.appendChild(riga);
                secCarte.grid.appendChild(item);
            });
        }

        function mostraApertura(busta, estratte, nuove) {
            pullTitle.textContent = `${busta.icona} ${busta.nome}`;
            const conUltra = estratte.some((id) => CardRarity.of(id) === 'ultra');
            pullSub.textContent = conUltra
                ? `Hai trovato un'ULTRA RARA! ${nuove.length} carte mai avute prima.`
                : `${nuove.length} carte mai avute prima su ${estratte.length}.`;
            pullGrid.innerHTML = '';
            estratte.forEach((id, i) => {
                const cell = el('div', 'shop-pull-cell');
                cell.style.animationDelay = (i * 90) + 'ms';
                cell.appendChild(miniatura(id, 'clamp(60px, 13vw, 80px)'));
                cell.appendChild(el('div', 'shop-pull-name', nomeCarta(id)));
                const r = CardRarity.of(id);
                if (r !== 'common') cell.appendChild(el('span', 'shop-badge ' + r, CardRarity.label(r)));
                if (nuove.indexOf(id) !== -1) cell.appendChild(el('span', 'shop-pull-new', '★ NUOVA'));
                pullGrid.appendChild(cell);
            });
            pullBackdrop.classList.add('open');
        }

        function renderBuste() {
            secBuste.grid.innerHTML = '';
            ShopCatalog.busteDellaSettimana().forEach((busta) => {
                const item = el('div', 'shop-item');
                const titolo = el('div', 'shop-item-name', `${busta.icona} ${busta.nome}`);
                titolo.style.fontSize = '0.95rem';
                item.appendChild(titolo);
                const desc = el('div', 'shop-item-meta',
                    // La percentuale di ultra rara è scritta a chiare
                    // lettere: è la sola differenza vera fra le tre buste,
                    // e nasconderla renderebbe la scelta un tiro al buio.
                    `${busta.descrizione} Probabilità di ultra rara: ${Math.round(busta.ultraChance * 100)}%.`);
                desc.style.lineHeight = '1.45';
                item.appendChild(desc);

                const riga = el('div', 'buy-row');
                const apri = (valuta, importo) => {
                    if (!paga(valuta, importo)) return;
                    const estratte = ShopCatalog.apriBusta(busta);
                    const nuove = estratte.filter((id) => SaveManager.getOwnedCount(id) === 0);
                    estratte.forEach((id) => SaveManager.addOwnedCards(id, 1));
                    if (window.NativeHaptics) NativeHaptics.success();
                    mostraApertura(busta, estratte, nuove);
                    refresh();
                };
                riga.appendChild(pulsanteAcquisto('credits', busta.costo.credits, false, apri));
                if (busta.costo.locatorCards) {
                    riga.appendChild(pulsanteAcquisto('locatorCards', busta.costo.locatorCards, true, apri));
                }
                item.appendChild(riga);
                secBuste.grid.appendChild(item);
            });
        }

        function renderMazzi() {
            secMazzi.grid.innerHTML = '';
            ShopCatalog.mazziInVendita().forEach((deck) => {
                const item = el('div', 'shop-item' + (deck.posseduto ? ' owned' : ''));
                if (deck.coverCardId) {
                    const art = el('div', 'shop-item-art');
                    art.appendChild(miniatura(deck.coverCardId, 'clamp(64px, 14vw, 88px)'));
                    item.appendChild(art);
                }
                item.appendChild(el('div', 'shop-item-name', deck.nome));
                item.appendChild(el('div', 'shop-item-meta', `${deck.carte} carte`));
                const riga = el('div', 'buy-row');
                if (deck.posseduto) {
                    riga.appendChild(el('div', 'shop-owned-note', '✓ Già acquistato'));
                } else {
                    riga.appendChild(pulsanteAcquisto('starChips', deck.costo.starChips, false, (valuta, importo) => {
                        if (!paga(valuta, importo)) return;
                        // addOwnedPack registra il mazzo E ne versa le carte
                        // nella collezione (vedi js/save-manager.js).
                        SaveManager.addOwnedPack(deck.packId);
                        if (window.NativeHaptics) NativeHaptics.success();
                        refresh();
                    }));
                }
                item.appendChild(riga);
                secMazzi.grid.appendChild(item);
            });
        }

        function aggiornaTimer() {
            if (!window.ServerDate) return;
            secCarte.timer.textContent = formattaAttesa(ServerDate.msToNextDay());
            secBuste.timer.textContent = formattaAttesa(ServerDate.msToNextWeek());
        }

        function refresh() {
            aggiornaPortafoglio();
            renderCarteDelGiorno();
            renderBuste();
            renderMazzi();
            aggiornaTimer();
        }

        aggiornaPortafoglio();
        // La data va chiesta al server PRIMA di decidere l'offerta: con
        // l'orologio locale basterebbe spostare l'ora del telefono per far
        // ruotare le carte a piacere (vedi js/cloud/server-date.js).
        const pronto = window.ServerDate ? ServerDate.sync() : Promise.resolve(false);
        pronto.then(() => {
            if (window.ServerDate && !ServerDate.isTrusted()) avviso.style.display = 'block';
            refresh();
        });
        const intervallo = setInterval(aggiornaTimer, 30000);

        const api = {
            refresh: refresh,
            /** Da chiamare se il Negozio viene rimosso dal documento, per non lasciare timer orfani. */
            destroy: function () {
                clearInterval(intervallo);
                pullBackdrop.remove();
            }
        };
        // Riferimento all'ultimo Negozio innestato: serve a chi lo apre
        // senza tenersi il valore di ritorno (la pagina autonoma) e a
        // poterlo ridisegnare da fuori.
        ShopUI.current = api;
        return api;
    }

    window.ShopUI = { mount: mount, current: null };
})();
