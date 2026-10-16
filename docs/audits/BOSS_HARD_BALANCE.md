# Bilanciamento dei boss a Difficile

Audit riproducibile eseguito il 16 ottobre 2026. Starter e Structure non
sono stati modificati; sono cambiate soltanto le liste `hard` degli
avversari indicati.

## Metodo

- 50 semi identici contro ciascuno di cinque mazzi ufficiali Hard
  (`yamiYugi`, `joey`, `pegasus`, `mako`, `bakura`): 250 duelli per riga.
- 50 duelli aggiuntivi contro il deck personale `Custom`, riportati come
  informazione separata e non usati da soli per decidere il bilanciamento.
- massimo 100 turni; nessun errore carta o violazione delle invarianti.
- baseline: `reports/boss-hard/baseline.json`.
- risultato promosso: `reports/boss-hard/finale.json`.

Nella colonna Custom la percentuale e' quella delle vittorie del deck
Custom: piu' e' bassa, piu' l'avversario e' impegnativo.

| Avversario | Ufficiali prima | Ufficiali dopo | Custom prima | Custom dopo |
|---|---:|---:|---:|---:|
| Yugi Muto | 33,2% | 43,2% | 82% | 72% |
| Bakura | 48,8% | 52,4% | 66% | 70% |
| Gozaburo | 26,0% | 47,2% | 88% | 76% |
| Noah | 40,8% | 44,0% | 70% | 62% |
| Heishin | 71,2% | 83,2% | 58% | 34% |
| Nitemare | 61,2% | 90,8% | 70% | 10% |

## Decisioni

- **Yugi Muto:** piu' cercatori per riunire Exodia e meno mostri normali
  deboli; resta il mazzo ereditato dal nonno.
- **Bakura:** maggiore continuita' fra Demoni, Necropaura e Destiny Board.
- **Gozaburo:** Exodia Necross resta il centro del mazzo, affiancato da
  pescata e rimozione sufficienti a non perdere prima della combo.
- **Noah:** meno frammenti preistorici e piu' Mostri Spirito del duello
  nell'universo virtuale.
- **Heishin:** 83,2% sul campione ufficiale; e' un superboss deliberatamente
  severo, ma ancora inferiore al finale.
- **Nitemare:** identita' e deck separati da DarkNite. Con 90,8% sul campione
  ufficiale e 90% di vittorie contro Custom e' il picco assoluto del gioco.

Le prove intermedie sono conservate nella stessa cartella dei report: hanno
mostrato che aggiungere pezzi combo senza ridurre le mani morte puo' perfino
indebolire un boss. Per questo la versione finale privilegia la consistenza.
