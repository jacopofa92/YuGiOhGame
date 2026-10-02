# Work in progress — miglioramenti da seguire

Elenco di lavori consigliati, in ordine di valore. Spuntare `[x]` quando fatto.

## Peso e velocità (più urgente)

- [ ] Ridimensionare i PNG in `images/characters/pedine/` (oggi 1-2 MB ciascuno,
      circa 45 MB in totale, per icone viste a ~100 px) mantenendo la
      trasparenza. Taglia quasi tutto il peso e velocizza l'avvio dell'APK.
- [ ] Il service worker precarica tutta l'app a ogni installazione: con asset
      grossi l'aggiornamento su telefono diventa lento. Valutare di non
      precaricare le immagini pesanti (cache al primo uso).

## Affidabilità

- [ ] Stabilizzare i test fragili: almeno `bot-waits-for-summon-cinematic`
      fallisce a volte in mezzo agli altri (dipende da attese a tempo fisso).
      Sostituire i `waitForTimeout` con attese su segnali veri.
- [ ] Controllo automatico pre-commit: sintassi (`scripts/check-syntax.js`) più
      ricerca di accenti corrotti (`â€`, `Ã¨`…), per evitare di riscrivere i
      file con PowerShell `Get-Content`/`Set-Content` rovinando gli accenti.
- [ ] Multiplayer: la logica sta tutta sui client e il server non verifica
      nulla, quindi si può barare. Accettabile tra amici; da affrontare se si
      apre a sconosciuti.

## Esperienza di gioco

- [ ] Dare a TUTTE le scelte lo stesso schema già usato per i Tributi: banda
      evidente + velo scuro + pulsante Annulla (dove annullare ha senso):
      scarto a fine turno, selezione bersagli, ecc.
- [ ] Tutorial o partita guidata per chi non conosce Yu-Gi-Oh.
- [ ] Velocità del bot regolabile (veloce/normale) nelle impostazioni.

## Contenuti

- [ ] Chiudere insieme le carte con lo stesso bisogno tra le 58 con
      `missingEffectNote` in `data/cards.json` (es. gruppo "blocca ogni
      Evocazione": 282, 434, 1045).
- [ ] 6 PNG in `images/characters/pedine/` senza avatar corrispondente
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
