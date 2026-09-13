/**
 * fx-gsap.js — Backend di animazione basato su GSAP (js/vendor/gsap.min.js).
 * =====================================================================
 * E' un PLUGIN, nel senso pieno del termine: rimpiazza alcune animazioni
 * di js/ui/effects.js con una versione a timeline, e nient'altro nel
 * progetto sa che esiste.
 *
 *   - Per SPEGNERLO senza toccare il codice: window.FX_BACKEND = 'css'.
 *   - Per RIMUOVERLO del tutto: cancellare questo file e il suo <script>.
 *     Il gioco torna esattamente alle animazioni CSS di base, senza che
 *     serva modificare una riga altrove.
 *   - Per FORZARLO anche se un altro backend venisse registrato dopo:
 *     window.FX_BACKEND = 'gsap'.
 *
 * PERCHE' GSAP E NON PIXI. Il campo di duello e' fatto di elementi DOM
 * (le carte sono nodi, non sprite): GSAP anima il DOM, ed e' esattamente
 * il lavoro che serve qui. PixiJS e' un renderer WebGL su canvas — puo'
 * solo stare sopra o sotto le carte, mai intrecciarsi con loro, e le
 * particelle di effects.js girano gia' su un canvas 2D che funziona.
 * Per i colpi di scena a schermo intero c'e' gia' FX.playVideoOverlay
 * (filmati pre-renderizzati), che costa meno e rende di piu'.
 *
 * COSA AGGIUNGE DAVVERO rispetto alle versioni CSS, che restano buone:
 * sequenze vere. Le animazioni di base sono catene di setTimeout e toggle
 * di classi, dove ogni ritardo e' un numero scritto a mano da tenere
 * allineato al CSS; qui una timeline descrive l'intera sequenza in un
 * punto solo, con easing che il CSS non ha (elastic, back) e la
 * possibilita' di interromperla pulita.
 *
 * DIPENDENZA PIGRA: gsap.min.js viene caricato dopo l'evento 'load' (vedi
 * duelMonstersCore.html), quindi al momento in cui questo file gira la
 * libreria di solito NON c'e' ancora. Non e' un problema: il backend si
 * registra comunque dichiarando `requires: ['gsap']`, e la facciata FX lo
 * considera attivo solo quando quel globale esiste davvero. L'unica
 * accortezza e' richiamare FX.refreshBackend() quando la libreria
 * atterra, cosa che facciamo in fondo a questo file.
 *
 * NOTA SUL RISPETTO DELL'UTENTE: prefers-reduced-motion e' gestito una
 * volta sola dalla facciata (js/ui/effects.js), che in quel caso non
 * chiama affatto il backend. Qui dentro non serve ricontrollarlo.
 */
(function () {
    'use strict';

    if (!window.FX || typeof FX.registerBackend !== 'function') {
        // effects.js non caricato (o versione precedente al sistema a
        // backend): questo file non ha nulla a cui agganciarsi.
        return;
    }

    /** Centro di un elemento in coordinate di viewport — gemella di quella in effects.js, che non e' esposta. */
    function centerOf(el) {
        const r = el.getBoundingClientRect();
        return { x: r.left + r.width / 2, y: r.top + r.height / 2, rect: r };
    }

    /**
     * Un elemento usa-e-getta posizionato a schermo, rimosso da solo.
     * Gli effetti di base fanno lo stesso con spawnDomFx(), che pero' e'
     * interna a effects.js: qui serve una versione propria, minima.
     */
    function fxLayer(className, x, y, w, h) {
        const el = document.createElement('div');
        el.className = className;
        el.style.position = 'fixed';
        el.style.left = x + 'px';
        el.style.top = y + 'px';
        if (w !== undefined) el.style.width = w + 'px';
        if (h !== undefined) el.style.height = h + 'px';
        el.style.pointerEvents = 'none';
        el.style.zIndex = '9998';
        document.body.appendChild(el);
        return el;
    }

    /**
     * Opzioni comuni a OGNI tween che tocca un elemento del gioco (una
     * carta sul campo o in mano), invece di uno degli strati usa-e-getta
     * creati qui dentro.
     *
     * `overwrite: 'auto'` perche' in duello capita davvero che due
     * animazioni finiscano sulla stessa carta a distanza di un istante
     * (una carta pescata e subito evocata, un mostro colpito mentre sta
     * ancora atterrando): senza, i due tween si sovrappongono e l'ultimo a
     * finire lascia inline i valori dell'altro.
     *
     * Lo stesso motivo per cui ogni timeline chiude con PULIZIA (qui
     * sotto) e non con i soli valori finali: le carte hanno animazioni
     * CSS proprie (deal-in, fxSummonGlow...) che devono poter riprendere
     * il controllo, e una proprieta' rimasta inline le sovrascriverebbe
     * per sempre. Vale anche per `opacity`, che GSAP puo' scrivere anche
     * quando non la si anima esplicitamente.
     */
    const SU_CARTA = { overwrite: 'auto' };
    const PULIZIA = { clearProps: 'transform,filter,opacity', duration: 0 };

    /** Pannello a schermo intero riusando lo stile gia' esistente del randomizzatore (moneta/dado). */
    function fxBackdrop(className) {
        const el = document.createElement('div');
        el.className = className;
        document.body.appendChild(el);
        return el;
    }

    const impls = {
        /**
         * Evocazione: la carta "atterra" invece di limitarsi ad accendersi.
         * back.out da' il piccolo rimbalzo che il CSS non sa fare senza
         * keyframe scritti a mano, e l'anello d'urto parte in contemporanea
         * invece che a un setTimeout indovinato.
         */
        playSummonShockwave: function (monsterElement) {
            if (!monsterElement) return;
            const c = centerOf(monsterElement);

            const ring = fxLayer('fx-gsap-ring', c.x, c.y);
            gsap.set(ring, { xPercent: -50, yPercent: -50, width: 40, height: 40, borderRadius: '50%', border: '3px solid #ffdf8c', opacity: 0.9 });
            gsap.to(ring, {
                width: Math.max(monsterElement.offsetWidth * 3.2, 180),
                height: Math.max(monsterElement.offsetWidth * 3.2, 180),
                opacity: 0,
                duration: 0.7,
                ease: 'power2.out',
                onComplete: () => ring.remove()
            });

            // Atterraggio in 3D: la carta arriva inclinata all'indietro e
            // si raddrizza appoggiandosi sul campo, invece di comparire di
            // faccia e basta. transformPerspective e' per-elemento, quindi
            // non serve toccare gli antenati.
            gsap.timeline()
                .fromTo(monsterElement,
                    { scale: 0.72, y: -26, transformPerspective: 800, rotationX: -52, filter: 'brightness(2.2)' },
                    Object.assign({ scale: 1, y: 0, rotationX: 0, filter: 'brightness(1)', duration: 0.55, ease: 'back.out(2.2)' }, SU_CARTA))
                .to(monsterElement, PULIZIA);

            if (typeof FX.spawnParticles === 'function') {
                FX.spawnParticles(c.x, c.y, { count: 26, speed: 5, life: 700, size: 3, spread: 360, gravity: 0.04 });
            }
        },

        /**
         * Danno ai Life Points: scossa con smorzamento vero al posto della
         * classe .fx-shake a durata fissa. Il colpo parte forte e si
         * spegne, invece di vibrare uguale per 450ms.
         */
        playDamageEffect: function (amount, opts) {
            const container = document.querySelector('.game-container') || document.body;
            const forza = Math.min(18, 6 + (Number(amount) || 0) / 260);

            gsap.timeline()
                .to(container, { x: -forza, duration: 0.05, ease: 'none' })
                .to(container, { x: forza * 0.8, duration: 0.06 })
                .to(container, { x: -forza * 0.5, duration: 0.06 })
                .to(container, { x: forza * 0.25, duration: 0.06 })
                .to(container, { x: 0, duration: 0.08, ease: 'power2.out', clearProps: 'transform' });

            const vignetta = fxLayer('fx-gsap-vignette', 0, 0, window.innerWidth, window.innerHeight);
            gsap.set(vignetta, { background: 'radial-gradient(circle, rgba(255,0,0,0) 45%, rgba(255,0,0,0.55) 100%)', opacity: 0 });
            gsap.to(vignetta, {
                opacity: 1, duration: 0.12, ease: 'power2.out',
                onComplete: () => gsap.to(vignetta, { opacity: 0, duration: 0.42, onComplete: () => vignetta.remove() })
            });

            // Il numero che sale: la parte che i giocatori guardano davvero,
            // e che l'animazione di base non ha affatto. `anchorEl` e' il
            // nome che usa gia' il chiamante (vedi playDamageEffect in
            // js/ui/effects.js); senza, si mette al centro dello schermo.
            const target = (opts && opts.anchorEl) || null;
            const p = target ? centerOf(target) : { x: window.innerWidth / 2, y: window.innerHeight * 0.42 };
            const testo = fxLayer('fx-gsap-damage-number', p.x, p.y);
            testo.textContent = '-' + (Number(amount) || 0);
            gsap.set(testo, {
                xPercent: -50, yPercent: -50,
                color: '#ff5b5b', fontWeight: 900, fontSize: 'clamp(1.6rem, 5vw, 3rem)',
                textShadow: '0 0 12px rgba(255,0,0,0.8), 0 2px 6px rgba(0,0,0,0.9)',
                scale: 0.4, opacity: 0
            });
            gsap.timeline({ onComplete: () => testo.remove() })
                .to(testo, { scale: 1.15, opacity: 1, duration: 0.22, ease: 'back.out(3)' })
                .to(testo, { scale: 1, duration: 0.1 })
                .to(testo, { y: '-=42', opacity: 0, duration: 0.5, ease: 'power1.in' }, '+=0.25');
        },

        /**
         * Tributo: la carta viene risucchiata verso l'alto e sbriciolata,
         * invece di sfumare sul posto. Il senso e' "questa carta se ne va
         * per farne arrivare un'altra", e si vede.
         */
        playTributeSacrifice: function (cardElement) {
            if (!cardElement) return;
            const c = centerOf(cardElement);

            gsap.timeline()
                .to(cardElement, { scale: 1.12, filter: 'brightness(1.8)', duration: 0.16, ease: 'power2.out' })
                .to(cardElement, Object.assign({ scale: 0.1, y: -70, rotation: 12, opacity: 0, duration: 0.5, ease: 'power2.in' }, SU_CARTA))
                .to(cardElement, PULIZIA);

            if (typeof FX.spawnParticles === 'function') {
                FX.spawnParticles(c.x, c.y, {
                    count: 34, speed: 6, life: 900, size: 3, spread: 120, baseAngle: -90,
                    gravity: -0.03, colors: ['#ffdf8c', '#f39c12', '#ffffff']
                });
            }
        },

        /**
         * Scontro in battaglia: i due mostri si vanno addosso e il lampo
         * scoppia nel punto d'impatto. Nella versione di base attaccante e
         * bersaglio non si muovono affatto — qui la carica c'e' davvero, ed
         * e' la ragione principale per cui vale la pena di una timeline.
         */
        playBattleClashEpic: function (attackerEl, targetEl) {
            const a = attackerEl ? centerOf(attackerEl) : null;
            const t = targetEl ? centerOf(targetEl) : null;
            const point = t || a;
            if (!point) return;
            const midX = a && t ? (a.x + t.x) / 2 : point.x;
            const midY = a && t ? (a.y + t.y) / 2 : point.y;

            const tl = gsap.timeline();

            if (attackerEl && a && t) {
                // Rincula, poi carica verso il bersaglio fermandosi a meta'.
                const dx = (t.x - a.x) * 0.42;
                const dy = (t.y - a.y) * 0.42;
                tl.to(attackerEl, Object.assign({ x: -dx * 0.22, y: -dy * 0.22, duration: 0.14, ease: 'power2.out' }, SU_CARTA))
                  .to(attackerEl, { x: dx, y: dy, duration: 0.16, ease: 'power3.in' })
                  .to(attackerEl, { x: 0, y: 0, duration: 0.3, ease: 'power2.out' }, '+=0.05')
                  .to(attackerEl, PULIZIA);
            }

            const lampo = fxLayer('fx-gsap-clash', midX, midY);
            gsap.set(lampo, {
                xPercent: -50, yPercent: -50, width: 30, height: 30, borderRadius: '50%',
                background: 'radial-gradient(circle, #ffffff 0%, #ffdf8c 45%, rgba(243,156,18,0) 70%)',
                opacity: 0
            });
            tl.to(lampo, { opacity: 1, width: 220, height: 220, duration: 0.16, ease: 'power3.out' }, a && t ? 0.3 : 0)
              .to(lampo, { opacity: 0, width: 300, height: 300, duration: 0.3, ease: 'power2.out', onComplete: () => lampo.remove() });

            if (targetEl) {
                tl.to(targetEl, Object.assign({ x: 6, duration: 0.05, repeat: 5, yoyo: true }, SU_CARTA), a && t ? 0.32 : 0.02)
                  .to(targetEl, PULIZIA);
            }

            if (typeof FX.spawnParticles === 'function') {
                setTimeout(() => {
                    FX.spawnParticles(midX, midY, { count: 46, speed: 9, life: 800, size: 4, spread: 360, gravity: 0.05 });
                }, a && t ? 300 : 0);
            }
        },

        /**
         * Passaggio di controllo: la carta si stacca dal campo che lascia,
         * attraversa il tavolo ruotando su se stessa e si posa nella
         * casella del nuovo proprietario, che si illumina per accoglierla.
         * Il volo NON e' in linea retta: sale ad arco, perche' un mostro
         * che cambia padrone deve sembrare strappato via, non trascinato.
         */
        playControlSwitch: function (card, fromOwner, fromIndex, toOwner, toIndex) {
            if (!card || typeof window.createCardElement !== 'function') return;
            const slotRect = (owner, index) => {
                const boardId = owner === 'player' ? 'playerFieldBoard' : 'botFieldBoard';
                const el = document.querySelector(`#${boardId} .field-slot[data-owner="${owner}"][data-type="monster"][data-index="${index}"]`);
                if (!el) return null;
                const r = el.getBoundingClientRect();
                return r.width ? { rect: r, el: el } : null;
            };
            const da = slotRect(fromOwner, fromIndex);
            const a = slotRect(toOwner, toIndex);
            if (!da || !a) return;

            const fantasma = window.createCardElement(card);
            Object.assign(fantasma.style, {
                position: 'fixed', left: da.rect.left + 'px', top: da.rect.top + 'px',
                width: da.rect.width + 'px', height: da.rect.height + 'px',
                margin: '0', zIndex: '10045', pointerEvents: 'none'
            });
            document.body.appendChild(fantasma);

            // L'arco: x scorre a velocita' costante, y scende e risale —
            // due tween sullo stesso elemento, ognuno con la propria curva.
            const dx = a.rect.left - da.rect.left;
            const dy = a.rect.top - da.rect.top;
            const altezzaArco = Math.min(120, Math.abs(dy) * 0.45 + 40);

            gsap.timeline({ onComplete: () => fantasma.remove() })
                .to(fantasma, { x: dx, duration: 0.62, ease: 'power1.inOut' }, 0)
                .to(fantasma, { y: dy - altezzaArco, duration: 0.31, ease: 'power2.out' }, 0)
                .to(fantasma, { y: dy, duration: 0.31, ease: 'power2.in' }, 0.31)
                .to(fantasma, { rotationY: 360, scale: 1.12, duration: 0.42, ease: 'power2.out' }, 0)
                .to(fantasma, { scale: 1, duration: 0.2, ease: 'power2.in' }, 0.42)
                .to(fantasma, { opacity: 0, duration: 0.12 }, 0.55);

            gsap.set(fantasma, {
                transformPerspective: 700,
                filter: 'drop-shadow(0 0 22px rgba(200,120,255,0.95))'
            });

            // La casella d'arrivo si illumina mentre la carta e' in volo.
            const alone = fxLayer('fx-gsap-control-target', a.rect.left, a.rect.top, a.rect.width, a.rect.height);
            gsap.set(alone, {
                zIndex: 10030, borderRadius: '8px',
                border: '2px solid rgba(200,120,255,0.9)',
                boxShadow: '0 0 26px rgba(200,120,255,0.75), inset 0 0 22px rgba(200,120,255,0.45)',
                opacity: 0
            });
            gsap.timeline({ onComplete: () => alone.remove() })
                .to(alone, { opacity: 1, duration: 0.2, delay: 0.18 })
                .to(alone, { opacity: 0, duration: 0.3, delay: 0.25 });

            if (typeof FX.spawnParticles === 'function') {
                FX.spawnParticles(da.rect.left + da.rect.width / 2, da.rect.top + da.rect.height / 2, {
                    count: 20, colors: ['#c87aff', '#e9c9ff', '#ffffff'], speed: 4, life: 620, gravity: -0.05
                });
            }
        },

        /**
         * L'attacco si INFRANGE: il bersaglio ha retto. Lo scudo di
         * energia compare fra i due, prende il colpo, si incrina e si
         * spegne; l'attaccante rimbalza indietro e le scintille tornano
         * verso di lui. Nessun frammento che vola via: la carta non si e'
         * rotta, ed e' tutto il punto dell'effetto.
         */
        playAttackBlocked: function (attackerEl, targetEl) {
            if (!targetEl) return;
            const t = centerOf(targetEl);
            const a = attackerEl ? centerOf(attackerEl) : null;

            // Lo scudo si mette FRA i due, spostato verso l'attaccante:
            // e' li' che il colpo arriva, non al centro della carta.
            let sx = t.x, sy = t.y;
            if (a) {
                const dx = a.x - t.x, dy = a.y - t.y;
                const d = Math.hypot(dx, dy) || 1;
                sx = t.x + (dx / d) * Math.min(38, d * 0.32);
                sy = t.y + (dy / d) * Math.min(38, d * 0.32);
            }

            const lato = Math.max(targetEl.offsetWidth * 1.25, 90);
            const scudo = fxLayer('fx-gsap-shield', sx, sy, lato, lato * 1.12);
            gsap.set(scudo, {
                zIndex: 10035, xPercent: -50, yPercent: -50,
                clipPath: 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)',
                background: 'linear-gradient(180deg, rgba(190,235,255,0.6), rgba(90,170,255,0.3))',
                boxShadow: '0 0 38px rgba(120,200,255,0.9)',
                opacity: 0, scale: 0.5
            });

            gsap.timeline({ onComplete: () => scudo.remove() })
                .to(scudo, { opacity: 1, scale: 1.14, duration: 0.12, ease: 'power3.out' })
                .to(scudo, { scale: 1, duration: 0.1, ease: 'power2.out' })
                // Il tremito dello scudo che regge: corto e nervoso.
                .to(scudo, { x: '+=4', duration: 0.04, repeat: 5, yoyo: true })
                .to(scudo, { opacity: 0, scale: 1.08, duration: 0.26, ease: 'power2.in' });

            // Incrinature: due lampi netti sullo scudo, non frammenti.
            for (let i = 0; i < 2; i++) {
                const crepa = fxLayer('fx-gsap-crack', sx, sy, lato * 0.7, 3);
                gsap.set(crepa, {
                    zIndex: 10036, xPercent: -50, yPercent: -50,
                    background: 'linear-gradient(90deg, transparent, #ffffff, transparent)',
                    rotation: i === 0 ? -28 : 34, opacity: 0
                });
                gsap.timeline({ onComplete: () => crepa.remove() })
                    .to(crepa, { opacity: 1, duration: 0.06, delay: 0.1 + i * 0.05 })
                    .to(crepa, { opacity: 0, duration: 0.3, ease: 'power2.out' });
            }

            // L'attaccante rimbalza INDIETRO: e' quello che racconta
            // "non e' passato".
            if (attackerEl && a) {
                const dx = (t.x - a.x), dy = (t.y - a.y);
                const d = Math.hypot(dx, dy) || 1;
                gsap.timeline()
                    .to(attackerEl, Object.assign({ x: -(dx / d) * 16, y: -(dy / d) * 16, duration: 0.12, ease: 'power3.out' }, SU_CARTA))
                    .to(attackerEl, { x: 0, y: 0, duration: 0.3, ease: 'elastic.out(1, 0.5)' })
                    .to(attackerEl, PULIZIA);
            }

            // Il bersaglio incassa senza spostarsi dal posto.
            gsap.timeline()
                .to(targetEl, Object.assign({ x: 4, duration: 0.04, repeat: 5, yoyo: true }, SU_CARTA))
                .to(targetEl, PULIZIA);

            // Scintille che rimbalzano verso chi ha attaccato.
            if (typeof FX.spawnParticles === 'function') {
                const verso = a ? Math.atan2(a.y - t.y, a.x - t.x) * (180 / Math.PI) : -90;
                FX.spawnParticles(sx, sy, {
                    count: 26, colors: ['#bfe9ff', '#ffffff', '#7dd3fc'],
                    speed: 7, life: 600, size: 3, spread: 85, baseAngle: verso, gravity: 0.07
                });
            }
        },

        /**
         * Distruzione in battaglia. Il primo tentativo rimpiccioliva e
         * ruotava la carta mentre sbiadiva, ed e' stato scartato
         * dall'utente ("era meglio l'effetto precedente"): una carta che si
         * accartoccia sembra un annullamento, non una distruzione.
         *
         * Qui la carta NON si muove quasi: incassa un colpo secco, lampeggia
         * bianca e collassa sul posto in un attimo. Tutto lo spettacolo sta
         * FUORI di lei — l'onda d'urto, i frammenti che schizzano via e
         * cadono, la vampata. E' il linguaggio della versione CSS, che
         * all'utente piaceva, portato piu' in la' invece che sostituito.
         */
        playBattleDestroyEffect: function (cardElement) {
            if (!cardElement) return;
            const c = centerOf(cardElement);

            // La carta: colpo, lampo bianco, collasso verticale sul posto.
            gsap.timeline()
                .to(cardElement, Object.assign({ x: -5, duration: 0.035, repeat: 3, yoyo: true }, SU_CARTA))
                .to(cardElement, { filter: 'brightness(4) contrast(0.6)', duration: 0.08 }, 0)
                .to(cardElement, { filter: 'brightness(1)', duration: 0.1 }, 0.12)
                // Il collasso avviene INCLINANDOSI all'indietro nello
                // spazio (rotationX) invece di schiacciarsi sul posto: la
                // carta cade dentro al campo, non si appiattisce.
                .to(cardElement, Object.assign({ transformPerspective: 700, rotationX: -70, scaleY: 0.2, opacity: 0, duration: 0.18, ease: 'power3.in' }, SU_CARTA), 0.26)
                .to(cardElement, PULIZIA);

            // Vampata sul posto della carta: e' quello che si nota per primo.
            const vampata = fxLayer('fx-gsap-destroy-flash', c.x, c.y, c.rect.width * 1.5, c.rect.height * 1.5);
            gsap.set(vampata, {
                xPercent: -50, yPercent: -50, borderRadius: '50%',
                background: 'radial-gradient(circle, #ffffff 0%, #ffd27a 30%, rgba(231,76,60,0.45) 55%, rgba(0,0,0,0) 72%)',
                opacity: 0
            });
            gsap.timeline({ onComplete: () => vampata.remove() })
                .to(vampata, { opacity: 1, duration: 0.09, ease: 'power2.out' })
                .to(vampata, { opacity: 0, scale: 1.5, duration: 0.4, ease: 'power2.out' });

            // Due onde d'urto sfalsate: una sola sembra un cerchio, due
            // danno l'idea dell'esplosione.
            [0, 0.12].forEach((ritardo, n) => {
                const onda = fxLayer('fx-gsap-destroy-ring', c.x, c.y);
                gsap.set(onda, {
                    xPercent: -50, yPercent: -50, width: 24, height: 24, borderRadius: '50%',
                    border: (n === 0 ? '5px' : '2px') + ' solid ' + (n === 0 ? '#ffd27a' : '#ff8a5b'),
                    opacity: 0.95
                });
                gsap.to(onda, {
                    width: n === 0 ? 240 : 330, height: n === 0 ? 240 : 330, opacity: 0,
                    duration: 0.55, delay: ritardo, ease: 'power3.out',
                    onComplete: () => onda.remove()
                });
            });

            // NIENTE FRAMMENTI VOLANTI. Il primo tentativo ne spargeva
            // nove, colorati e rotanti: letti a schermo sembravano
            // coriandoli, non una carta che esplode — segnalato
            // dall'utente, e aveva ragione. L'esplosione si fa con luce,
            // fumo e scossa, non con pezzi che schizzano.

            // Nucleo incandescente: piccolo, violentissimo, dura un
            // istante. E' quello che da' il "botto".
            const nucleo = fxLayer('fx-gsap-destroy-core', c.x, c.y, 30, 30);
            gsap.set(nucleo, {
                xPercent: -50, yPercent: -50, borderRadius: '50%',
                background: 'radial-gradient(circle, #ffffff 0%, #fff3c4 40%, rgba(255,190,90,0) 70%)',
                opacity: 1
            });
            gsap.timeline({ onComplete: () => nucleo.remove() })
                .to(nucleo, { width: c.rect.width * 2.2, height: c.rect.width * 2.2, duration: 0.13, ease: 'power4.out' })
                .to(nucleo, { opacity: 0, duration: 0.22, ease: 'power2.out' }, 0.08);

            // Fumo che sale e si allarga: quello che resta DOPO il botto,
            // e che fa sembrare l'esplosione una cosa con un peso.
            for (let i = 0; i < 4; i++) {
                const sbuffo = fxLayer('fx-gsap-destroy-smoke', c.x + (Math.random() * 40 - 20), c.y + (Math.random() * 24 - 12), 46, 46);
                gsap.set(sbuffo, {
                    xPercent: -50, yPercent: -50, borderRadius: '50%',
                    background: 'radial-gradient(circle, rgba(60,50,46,0.75) 0%, rgba(40,34,32,0.4) 45%, rgba(0,0,0,0) 72%)',
                    opacity: 0, scale: 0.5
                });
                gsap.timeline({ onComplete: () => sbuffo.remove() })
                    .to(sbuffo, { opacity: 0.85, scale: 1.1, duration: 0.16, delay: 0.06 + i * 0.04, ease: 'power2.out' })
                    .to(sbuffo, { y: '-=46', scale: 2.3, opacity: 0, duration: 0.85, ease: 'power1.out' });
            }

            // Scossa del campo: un'esplosione si sente anche nella
            // cornice, non solo dove e' avvenuta.
            const campo = document.querySelector('.game-container');
            if (campo) {
                gsap.timeline()
                    .to(campo, { x: -6, duration: 0.045, ease: 'none' })
                    .to(campo, { x: 5, duration: 0.05 })
                    .to(campo, { x: -3, duration: 0.05 })
                    .to(campo, { x: 0, duration: 0.07, ease: 'power2.out', clearProps: 'transform' });
            }

            if (typeof FX.spawnParticles === 'function') {
                // Due ondate invece di una: la prima secca e veloce, la
                // seconda piu' lenta e pesante, come braci che ricadono.
                FX.spawnParticles(c.x, c.y, { count: 44, colors: ['#fff3c4', '#ffdf8c', '#ffffff'], speed: 11, life: 520, size: 4, gravity: 0.05 });
                setTimeout(() => {
                    FX.spawnParticles(c.x, c.y, { count: 26, colors: ['#e74c3c', '#c2560f', '#ffb36b'], speed: 4.5, life: 900, size: 3, gravity: 0.3 });
                }, 110);
            }
        },

        /**
         * Pescata: una carta COPERTA vola dal mazzo fino al posto che
         * occupera' in mano, e svanisce nell'istante in cui quella vera
         * compare. E' la pescata che mancava — prima il mazzo restava
         * fermo e la carta si materializzava in mano dal nulla.
         *
         * REGOLA DA NON VIOLARE: qui NON si tocca `cardElement`. Tutti e
         * tre i chiamanti (js/engine/game-flow.js) le mettono la classe
         * `.deal-in` un istante PRIMA di chiamarci, cioe' la keyframe CSS
         * `handDealIn` che la fa entrare da destra. Scrivere un transform
         * sullo stesso elemento vuol dire litigare con quella keyframe, ed
         * era esattamente il movimento sbagliato che si vedeva: due
         * animazioni sulla stessa carta che si sovrascrivevano a vicenda.
         * Si anima solo un elemento nostro, sopra a tutto; la carta vera
         * resta libera di fare la sua entrata di sempre.
         */
        playDrawEffect: function (cardElement) {
            if (!cardElement) return;
            const arrivo = cardElement.getBoundingClientRect();
            if (!arrivo.width) return;

            // Il mazzo e' uno slot del Terreno con data-zone="deck"
            // (vedi renderFields in js/engine/game-flow.js).
            const mazzo = document.querySelector('#playerFieldBoard .field-slot[data-zone="deck"]')
                || document.querySelector('.field-slot[data-zone="deck"]');
            if (!mazzo) return;
            const partenza = mazzo.getBoundingClientRect();
            if (!partenza.width) return;

            const volante = fxLayer('fx-gsap-draw-card', partenza.left, partenza.top, partenza.width, partenza.height);
            gsap.set(volante, {
                zIndex: 10040,
                borderRadius: getComputedStyle(cardElement).borderRadius || '6px',
                backgroundImage: "url('images/cards/backCard.jpeg')",
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                boxShadow: '0 8px 24px rgba(0,0,0,0.55), 0 0 18px rgba(125,211,252,0.45)',
                rotation: -10
            });

            // Stessa durata della keyframe d'ingresso della carta (300ms):
            // la carta coperta "diventa" quella scoperta senza stacco.
            gsap.timeline({ onComplete: () => volante.remove() })
                .to(volante, {
                    left: arrivo.left, top: arrivo.top,
                    width: arrivo.width, height: arrivo.height,
                    rotation: 0, duration: 0.3, ease: 'power2.inOut'
                })
                .to(volante, { opacity: 0, duration: 0.12, ease: 'power1.in' }, 0.22);

            // NIENTE particelle qui: erano state provate e scartate
            // dall'utente. Pescare una carta e' un gesto asciutto, non
            // un'esplosione — scintille e polvere intorno al mazzo non
            // raccontano nulla e sporcano l'angolo del campo.
        },

        /**
         * Buco Nero: il vortice risucchia davvero. Rispetto alla versione
         * di base, i mostri non scivolano in linea retta ma spiraleggiano
         * verso il centro accelerando — il movimento che ci si aspetta da
         * qualcosa che viene inghiottito.
         */
        playDarkHoleVortex: function (sucked) {
            const cx = window.innerWidth / 2;
            const cy = window.innerHeight / 2;

            const vortice = fxLayer('fx-gsap-vortex', cx, cy);
            gsap.set(vortice, {
                xPercent: -50, yPercent: -50, width: 30, height: 30, borderRadius: '50%',
                background: 'radial-gradient(circle, #000 30%, #3a1a5c 55%, rgba(90,40,140,0) 72%)',
                boxShadow: '0 0 60px 20px rgba(90,40,140,0.55)', opacity: 0
            });
            gsap.timeline({ onComplete: () => vortice.remove() })
                .to(vortice, { opacity: 1, width: 420, height: 420, duration: 0.45, ease: 'power2.out' })
                .to(vortice, { rotation: 360, duration: 0.9, ease: 'none' }, 0)
                .to(vortice, { opacity: 0, width: 0, height: 0, duration: 0.4, ease: 'power2.in' }, '+=0.25');

            if (window.SFX && typeof SFX.darkHole === 'function') SFX.darkHole();

            if (!Array.isArray(sucked) || typeof window.createCardElement !== 'function') return;
            sucked.forEach(({ card, rect }, i) => {
                if (!card || !rect || rect.width === 0) return;
                const fantasma = window.createCardElement(card);
                Object.assign(fantasma.style, {
                    position: 'fixed', left: rect.left + 'px', top: rect.top + 'px',
                    width: rect.width + 'px', height: rect.height + 'px',
                    margin: '0', zIndex: '10052', pointerEvents: 'none'
                });
                document.body.appendChild(fantasma);

                // La spirale: si muove verso il centro mentre gira, con un
                // raggio che si stringe — due tween sovrapposti invece di
                // una retta sola.
                const angoloIniziale = Math.atan2((rect.top + rect.height / 2) - cy, (rect.left + rect.width / 2) - cx);
                const raggio = Math.hypot((rect.left + rect.width / 2) - cx, (rect.top + rect.height / 2) - cy);
                const stato = { ang: angoloIniziale, r: raggio };
                gsap.to(stato, {
                    ang: angoloIniziale + Math.PI * 1.6,
                    r: 0,
                    duration: 0.75,
                    delay: 0.12 + i * 0.05,
                    ease: 'power2.in',
                    onUpdate: () => {
                        fantasma.style.left = (cx + Math.cos(stato.ang) * stato.r) + 'px';
                        fantasma.style.top = (cy + Math.sin(stato.ang) * stato.r) + 'px';
                    },
                    onComplete: () => fantasma.remove()
                });
                gsap.to(fantasma, {
                    scale: 0.05, rotation: (i % 2 === 0 ? 1 : -1) * 540, opacity: 0,
                    duration: 0.75, delay: 0.12 + i * 0.05, ease: 'power2.in'
                });
            });
        },

        /**
         * Lancio della moneta: gira davvero su se stessa in prospettiva e
         * rallenta fino a fermarsi, invece di ruotare a velocita' costante
         * per un tempo fisso. Durata complessiva invariata (~1.7s): i
         * chiamanti non aspettano questa animazione, ma tanto vale non
         * allungarle la vita sullo schermo.
         */
        playCoinFlip: function (heads) {
            const backdrop = fxBackdrop('fx-randomizer-backdrop');
            const moneta = document.createElement('div');
            moneta.className = 'fx-coinflip-coin';
            moneta.textContent = '🪙';
            const etichetta = document.createElement('div');
            etichetta.className = 'fx-coinflip-label';
            etichetta.textContent = heads ? 'TESTA' : 'CROCE';
            backdrop.appendChild(moneta);
            backdrop.appendChild(etichetta);

            gsap.set(backdrop, { perspective: 900 });
            gsap.set(moneta, { transformStyle: 'preserve-3d' });
            gsap.set(etichetta, { opacity: 0, scale: 0.6 });

            gsap.timeline()
                .fromTo(moneta, { y: 40, scale: 0.7 }, { y: -30, scale: 1.15, duration: 0.4, ease: 'power2.out' })
                .to(moneta, { y: 0, scale: 1, duration: 0.45, ease: 'bounce.out' })
                // 5 giri che rallentano: il risultato compare a rotazione
                // quasi ferma, come se fosse la moneta a deciderlo.
                .to(moneta, { rotationX: 1800, duration: 1.0, ease: 'power3.out' }, 0)
                .call(() => { moneta.textContent = heads ? '☀️' : '🌑'; }, null, 0.95)
                .to(etichetta, { opacity: 1, scale: 1, duration: 0.3, ease: 'back.out(3)' }, 1.0)
                .to(backdrop, { opacity: 0, duration: 0.25, onComplete: () => backdrop.remove() }, 1.45);
        },

        /**
         * Attivazione di Magia/Trappola a centro schermo. E' l'animazione
         * piu' vista del duello (18 punti di chiamata: ogni singola
         * attivazione), e ha tre vincoli che NON vanno persi riscrivendola:
         *
         * 1. DEVE stare dentro FX.ACTIVATE_CENTER_DURATION_MS (2s). I
         *    chiamanti non aspettano una callback: aspettano quel tempo e
         *    tirano dritto. Sforare vuol dire una carta che resta a
         *    schermo mentre il gioco e' gia' andato avanti.
         * 2. La carta deve essere GIA' al centro a ~260ms: a quell'istante
         *    i preset di VisualEffects leggono il rettangolo del wrapper
         *    per far partire le particelle, e parte anche il suono. Se
         *    arrivasse piu' tardi, le particelle scoppierebbero dove la
         *    carta non e' ancora.
         * 3. Il preset scrive `filter` sulla CARTA; questa timeline anima
         *    il `filter` del WRAPPER. Sono due elementi diversi apposta —
         *    animare quello della carta cancellerebbe il glow del preset.
         *
         * Per il resto la struttura DOM e' identica a quella di base
         * (stesse classi, stesso ordine, stesso blocco audio): cambia solo
         * chi muove il wrapper, GSAP al posto della keyframe CSS, che viene
         * spenta con `animation: none` per non farle litigare.
         */
        playCardActivateCenterScreen: function (card) {
            if (!card || typeof window.createCardElement !== 'function') return;

            const backdrop = fxBackdrop('fx-activate-center-backdrop');

            const wrapper = document.createElement('div');
            wrapper.className = 'fx-activate-center-card';
            const cardEl = window.createCardElement(card);
            cardEl.style.setProperty('--card-w', 'clamp(160px, 22vw, 260px)');
            cardEl.style.setProperty('--card-h', 'calc(clamp(160px, 22vw, 260px) / 0.685)');
            wrapper.appendChild(cardEl);
            document.body.appendChild(wrapper);

            // La keyframe CSS farebbe lo stesso lavoro di questa timeline,
            // in contemporanea: va spenta, o le due si sovrascrivono a
            // vicenda sul transform.
            wrapper.style.animation = 'none';
            // transformPerspective mette la carta in uno SPAZIO 3D vero:
            // senza, un rotationY sarebbe solo uno schiacciamento piatto.
            // La carta arriva quasi di taglio (-78 gradi) e ruota verso chi
            // guarda finche' non e' frontale — la rivelazione che una
            // semplice scalata non puo' dare.
            gsap.set(wrapper, {
                xPercent: -50, yPercent: -50, opacity: 0, scale: 0.35,
                transformPerspective: 1000, rotationY: -78, rotationX: 12, rotation: -8
            });

            // Anello di luce dietro la carta (z-index del backdrop, quindi
            // sotto al wrapper che sta a 10060).
            const anello = fxLayer('fx-gsap-activate-ring', window.innerWidth / 2, window.innerHeight / 2);
            gsap.set(anello, {
                zIndex: 10059, xPercent: -50, yPercent: -50, width: 40, height: 40, borderRadius: '50%',
                border: '2px solid rgba(247,215,116,0.85)',
                boxShadow: '0 0 40px rgba(247,215,116,0.5), inset 0 0 30px rgba(247,215,116,0.35)',
                opacity: 0
            });

            // Stesso ordine della versione di base: il preset va applicato
            // subito dopo aver messo la carta nel documento.
            if (window.VisualEffects) VisualEffects.applyPreset(card, wrapper, cardEl);

            gsap.timeline()
                // Ingresso: atterra al centro entro 260ms (vincolo 2).
                .to(wrapper, {
                    opacity: 1, scale: 1.08, rotation: 0, rotationY: 0, rotationX: 0,
                    filter: 'drop-shadow(0 0 30px rgba(247,215,116,0.85))',
                    duration: 0.26, ease: 'back.out(2.6)'
                })
                .to(wrapper, { scale: 1, filter: 'drop-shadow(0 0 18px rgba(247,215,116,0.65))', duration: 0.14 })
                // Due battiti, non uno: danno il tempo di leggere la carta.
                // Ognuno con una lieve oscillazione sugli assi 3D, cosi' la
                // carta "respira" nello spazio invece di pulsare piatta.
                .to(wrapper, { scale: 1.06, rotationY: 7, rotationX: -3, filter: 'drop-shadow(0 0 28px rgba(247,215,116,0.85))', duration: 0.24, ease: 'sine.inOut' })
                .to(wrapper, { scale: 1, rotationY: -5, rotationX: 2, filter: 'drop-shadow(0 0 18px rgba(247,215,116,0.65))', duration: 0.24, ease: 'sine.inOut' })
                .to(wrapper, { scale: 1.04, rotationY: 3, rotationX: -1, duration: 0.2, ease: 'sine.inOut' })
                .to(wrapper, { scale: 1, rotationY: 0, rotationX: 0, duration: 0.2, ease: 'sine.inOut' })
                // Uscita: chiusa entro 1.95s, dentro il budget di 2s.
                .to(wrapper, { opacity: 0, scale: 1.18, rotationY: 26, duration: 0.38, ease: 'power2.in' }, 1.57)
                // L'anello si allarga sull'atterraggio e svanisce.
                .to(anello, { opacity: 1, width: 300, height: 300, duration: 0.4, ease: 'power3.out' }, 0.16)
                .to(anello, { opacity: 0, width: 420, height: 420, duration: 0.5, ease: 'power2.out' }, 0.56)
                .to(anello, { rotation: 180, duration: 1.2, ease: 'none' }, 0.16);

            // NIENTE riflesso che scorre sulla carta: era stato provato e
            // scartato dall'utente ("l'effetto di riflesso e' orrendo").
            // La carta si guarda per leggerla, e una striscia lucida che le
            // passa sopra copre proprio l'illustrazione e il testo.

            // Blocco audio IDENTICO a quello della versione di base: suono
            // dedicato alla carta se esiste, altrimenti quello standard.
            setTimeout(() => {
                const kind = card.type === 'trap' ? 'trappole' : 'magie';
                if (window.AudioLibrary && AudioLibrary.tryPlayCardSound(card, kind)) return;
                if (!window.SFX) return;
                if (card.type === 'trap') SFX.activateTrap();
                else SFX.activateSpell();
            }, 260);

            // Stessa rimozione a 2s della versione di base: e' il contratto
            // su cui contano i chiamanti.
            setTimeout(() => {
                backdrop.remove();
                wrapper.remove();
                anello.remove();
            }, 2000);
        },

        /** Dado: rotola su due assi e si assesta sul risultato, stesso impianto della moneta. */
        playDiceRoll: function (result) {
            const backdrop = fxBackdrop('fx-randomizer-backdrop');
            const dado = document.createElement('div');
            dado.className = 'fx-dice-cube';
            dado.textContent = '🎲';
            const etichetta = document.createElement('div');
            etichetta.className = 'fx-dice-label';
            etichetta.textContent = `RISULTATO: ${result}`;
            backdrop.appendChild(dado);
            backdrop.appendChild(etichetta);

            gsap.set(backdrop, { perspective: 900 });
            gsap.set(dado, { transformStyle: 'preserve-3d' });
            gsap.set(etichetta, { opacity: 0, y: 12 });

            gsap.timeline()
                .fromTo(dado, { scale: 0.6, y: -50 }, { scale: 1, y: 0, duration: 0.5, ease: 'bounce.out' })
                .to(dado, { rotationX: 1080, rotationY: 720, duration: 1.0, ease: 'power3.out' }, 0)
                .call(() => { dado.textContent = String(result); }, null, 0.95)
                .to(dado, { scale: 1.2, duration: 0.16, ease: 'back.out(4)' }, 0.95)
                .to(dado, { scale: 1, duration: 0.14 })
                .to(etichetta, { opacity: 1, y: 0, duration: 0.28 }, 1.05)
                .to(backdrop, { opacity: 0, duration: 0.25, onComplete: () => backdrop.remove() }, 1.45);
        }
    };

    FX.registerBackend('gsap', { requires: ['gsap'], impls: impls });

    // gsap.min.js arriva DOPO l'evento 'load' (caricamento pigro): al
    // momento della registrazione qui sopra il globale non esiste ancora,
    // quindi la facciata ha appena concluso che il backend non e'
    // utilizzabile. Va rivalutato quando la libreria atterra davvero —
    // niente polling: si guarda al primo frame utile dopo il 'load' e si
    // riprova qualche volta a intervalli crescenti, poi si lascia perdere.
    (function attendiGsap() {
        let tentativi = 0;
        function riprova() {
            if (window.gsap) { FX.refreshBackend(); return; }
            if (++tentativi > 12) return; // ~10s: se non e' arrivata, non arrivera'
            setTimeout(riprova, 200 * tentativi);
        }
        if (document.readyState === 'complete') riprova();
        else window.addEventListener('load', riprova, { once: true });
    })();
})();
