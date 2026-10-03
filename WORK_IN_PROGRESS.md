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
- [ ] Controllo automatico pre-commit: sintassi (`scripts/check-syntax.js`) più
      ricerca di accenti corrotti (`â€`, `Ã¨`…), per evitare di riscrivere i
      file con PowerShell `Get-Content`/`Set-Content` rovinando gli accenti.
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
      chiusura. NON verificato a occhio nel duello (solo da test): guardare
      scarto e casella in una partita vera.
- [ ] Tutorial o partita guidata per chi non conosce Yu-Gi-Oh.
- [x] Velocità del bot regolabile (Normale/Veloce) in Impostazioni → Dispositivo.
      Accorcia solo le pause di ritmo in `js/ai/bot.js` (`botMs`).

## Contenuti

- [ ] Chiudere insieme le carte con lo stesso bisogno tra le 58 con
      `missingEffectNote` in `data/cards.json` (es. gruppo "blocca ogni
      Evocazione": 282, 434, 1045).
- [ ] 6 PNG in `images/characters/avatarTrasparenza/` (e copie in `pedine/`) senza avatar corrispondente
      (Kaiba in Mantello Viola, soldato Grande Guerra, kaibaV2,
      setoKaiba_duelist Kingdom, setoKaiba_forbiddenMemories, yamiYugiV2):
      decidere se rimuoverli o dar loro un uso.
- [ ] Bilanciamento dei livelli di difficoltà con dati veri: simulare qualche
      centinaio di partite bot contro bot e guardare i tassi di vittoria.

## Manutenzione

- [ ] Nuove funzioni in file piccoli e separati: `duelMonstersCore.html`,
      `game-flow.js` e `actions.js` sono molto grandi e con funzioni globali.
- [ ] La lista di `<script>` è duplicata a mano in molte pagine HTML: spostarla
      in un unico file condiviso caricato da tutte.

## In pausa

- [ ] Pedine di Battle City (attività sospesa dall'utente): riprendere da qui.
      Stato: pedine SVG ricche + ritagli PNG per id; vedi `PROJECT_MAP.md`.
