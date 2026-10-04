# Work in progress — miglioramenti da seguire

Elenco di lavori consigliati, in ordine di valore. Spuntare `[x]` quando fatto.

## Peso e velocità (più urgente)

- [x] PNG ridimensionati (max 320 px, trasparenza mantenuta): gli originali
      stanno in `images/characters/avatarTrasparenza/`, le copie leggere usate
      dal gioco in `images/characters/pedine/` (da ~100 MB a ~10 MB).
      Un nuovo PNG va messo in `avatarTrasparenza/` e ridimensionato in `pedine/`.
- [ ] Il service worker precarica tutta l'app a ogni installazione: con asset
      grossi l'aggiornamento su telefono diventa lento. Valutare di non
      precaricare le immagini pesanti (cache al primo uso).

## Affidabilità

- [x] `bot-waits-for-summon-cinematic` ora aspetta segnali veri (cinematica
      finita + attacco avvenuto) invece di 11 s fissi. Gli altri spec con
      `waitForTimeout` fissi non sono stati rivisti: farlo se ne fallisce uno.
- [x] Vecchie migrazioni della Storia anime tolte (salvataggi precedenti al
      timbro di base azzerati, 1.0.17-1.0.18).
- [x] CI di GitHub verde (dal commit 275f0df, 1.0.33). Lo stato delle run si
      legge senza login: `https://api.github.com/repos/jacopofa92/YuGiOhGame/actions/runs`
      (i log dei singoli test invece richiedono l'accesso). Azioni portate a
      v5 e Node 24, come in locale.
- [x] Controllo automatico pre-commit (`.githooks/pre-commit` →
      `scripts/pre-commit.js`): sintassi dei .js in stage, accenti corrotti
      nelle righe aggiunte, BOM, `cards.json` senza file generato. Su un
      clone nuovo va attivato con `npm run hooks`.
- [x] Multiplayer: il relay ora rifiuta azioni sconosciute, indici assurdi e
      mosse da turno (Evocare, attaccare, calare carte, avanzare di fase)
      fuori dal proprio turno (`validateGameAction` in `server/server.js`).
      RESTA APERTO: il server non conosce il campo, quindi un client
      modificato può ancora mentire su ciò che fa nel proprio turno (carte
      che non ha, danni, pescate). Servirebbe far girare il motore anche lato
      server: da fare solo se si apre a sconosciuti. Il server va ridistribuito
      dove gira per avere i nuovi controlli.

## Esperienza di gioco

- [x] Schema unico (banda + velo + elementi sopra il velo + Annulla dove ha
      senso) per Tributo, scarto a fine turno e casella dopo un Sacrificio.
      I picker a modale (lista carte, Attacco/Difesa) erano già modali con
      chiusura. Verificato a occhio con screenshot (desktop e telefono in
      orizzontale): banda, velo e carte sopra il velo funzionano. Difetto
      minore: su telefono la banda copre in parte il nome dell'avversario.
- [ ] Tutorial o partita guidata per chi non conosce Yu-Gi-Oh.
- [x] Velocità del bot regolabile (Normale/Veloce) in Impostazioni → Dispositivo.
      Accorcia solo le pause di ritmo in `js/ai/bot.js` (`botMs`).

## Contenuti

- [x] Gruppo "blocca ogni Evocazione" chiuso (282, 434, 1045): 282 era già a
      posto (nota falsa), 1045 ora blocca solo le Special Summon come da testo
      (`specialSummonBlockedFor`), 434 vieta Evocazioni scoperte e Special
      Summon nel turno (`noSummonTurn`, `DuelEngine.isSummonBannedThisTurn`).
- [x] Tutti gli scostamenti reali dal testo chiusi (1.0.31-1.0.33). Le
      `missingEffectNote` rimaste sono tutte promemoria su limiti del motore
      (vedi CLAUDE.md, "Carte con limiti noti").
- [x] Scelta di chi SUBISCE lo scarto (`victimChoosesDiscard`): Criosfinge
      (761) e Duo Delinquente (873), anche in Multiplayer.
- [x] La battaglia e la Chain aspettano le scelte del giocatore
      (`callCardHandlerWaiting`/`attendiScelta`, 1.0.35): chiuse le 6 carte
      in cui sceglieva il motore. Restano 19 note, tutte promemoria su
      limiti del motore.
- [x] Ritorni in mano e spostamenti dal Cimitero (761, 890, 1.0.36):
      Necrovalley ora vede ogni spostamento scritto a mano
      (`graveyardMoveNegated`, sorvegliato da `guardrail-necrovalley`).
- [x] Checkpoint di targeting coperto ovunque (1.0.37): una trentina di
      carte, tutte le Magie Equipaggiamento e i Union ora dichiarano il
      bersaglio (`dichiara: true`); sorvegliato da
      `guardrail-bersagli-dichiarati`. Chiuse anche le protezioni di
      Great Dezard e Fushioh Richie.
- [ ] Note restanti (7), in ordine di rischio: "uno dei due giocatori può
      pagare" (882); finestra di priorità a ogni cambio fase per gli
      Effetti Veloci (396, 459, 1059: la più rischiosa); 192 (immunità ai
      soli effetti mirati); 235 e la metà Magia/Trappola di 622 (checkpoint
      sincrono, scelgono da sole).
- [ ] 6 PNG in `images/characters/avatarTrasparenza/` (e copie in `pedine/`) senza avatar corrispondente
      (Kaiba in Mantello Viola, soldato Grande Guerra, kaibaV2,
      setoKaiba_duelist Kingdom, setoKaiba_forbiddenMemories, yamiYugiV2):
      decidere se rimuoverli o dar loro un uso.
- [ ] Bilanciamento dei livelli di difficoltà con dati veri. Provato un giro
      (77 partite: giocatore scriptato semplice contro il bot): 0 vittorie
      ovunque, quindi inutile. Servirebbe un giocatore di riferimento più
      forte, che usi anche Magie e Trappole. Il motore non ha un vero duello
      bot contro bot: si pilota la pagina con Playwright (~70-150 s a partita).

## Manutenzione

- [ ] Nuove funzioni in file piccoli e separati: `duelMonstersCore.html`,
      `game-flow.js` e `actions.js` sono molto grandi e con funzioni globali.
- [ ] La lista di `<script>` è duplicata a mano in molte pagine HTML: spostarla
      in un unico file condiviso caricato da tutte.

## Battle City

- [x] Pedine verificate: i 20 personaggi che possono comparire hanno il loro
      PNG col nome dell'avatar, nessun ripiego sulla pedina generica.
