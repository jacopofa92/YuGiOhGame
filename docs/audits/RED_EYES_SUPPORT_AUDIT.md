# Audit supporti moderni Occhi Rossi

Stato: effetti isolati completati; economia e deck avversari non ancora
modificati.

## Primo pacchetto

| id | Carta | Effetto coperto | Stato |
|---:|---|---|---|
| 1250 | La Pietra Nera della Leggenda | Tributo e Special Summon dal Deck; riciclo dal Cimitero; un solo effetto per turno | test isolato verde |
| 1251 | Intuito Occhi Rossi | costo dalla mano o dal Deck; ricerca Magia/Trappola; una attivazione per turno | test isolato verde |
| 1252 | Spirito Occhi Rossi | bersaglio nel Cimitero e Special Summon | test isolato verde |
| 1253 | Drago Metallo Nero | Equip dalla mano/Terreno, +600 ATK, ricerca quando lascia il Terreno per il Cimitero | test isolato verde |

Testi e illustrazioni sono stati verificati il 2026-10-14 tramite l'API di
YGOPRODeck (`cardinfo.php?name=...`, immagini `image_url_cropped`). Le carte
sono collocate prima del blocco WW1 in `cards.json`, così WW1 resta in fondo
al catalogo senza rinumerare alcun id esistente.

## Scelte tecniche

- Intuito usa il nuovo helper `sendChosenFromHandToGraveyard`: "manda" non
  viene confuso con "scarta" e non attiva effetti riservati allo scarto.
- La Pietra usa una chiave per nome/proprietario, quindi due copie non possono
  aggirare il vincolo "solo 1 effetto per turno".
- Drago Metallo Nero usa l'infrastruttura Equip esistente e una scelta reale
  del bersaglio; non introduce una seconda rappresentazione degli Equip.
- Nessun deck Starter/Structure o avversario e' stato cambiato.
- Nessuna fonte economica e nessun limite definitivo sono ancora assegnati:
  prima si confrontano 1/2/3 copie con gli stessi semi, come da roadmap.

## Audit 1/2/3 copie

Eseguito con `tools/audit-supporti-occhi-rossi.js`: 50 semi contro ciascuno
dei cinque avversari Hard Yami Yugi, Kaiba, Pegasus, Mako e Bakura, quindi
250 duelli per variante e 4.000 duelli complessivi. Ogni variante usa Joey
Hard come base e sostituisce carte neutrali senza toccare Occhi Rossi,
Fusioni, carte vinte o il nucleo d'azzardo. Dati grezzi:
`reports/archetypes/RED_EYES_SUPPORT_1_2_3.json`.

| Variante | Vittorie Joey | Turni medi |
|---|---:|---:|
| baseline | 39,2% | 15,82 |
| Pietra 1 / 2 / 3 | 39,2% / 35,2% / 31,6% | 16,00 / 15,69 / 16,04 |
| Intuito 1 / 2 / 3 | 38,4% / 34,4% / 28,8% | 15,89 / 15,51 / 16,02 |
| Spirito 1 / 2 / 3 | 39,2% / 36,8% / 31,6% | 16,02 / 15,55 / 16,06 |
| Metallo 1 / 2 / 3 | 41,2% / 37,6% / 32,4% | 15,92 / 15,77 / 15,54 |
| pacchetto 1 / 2 / 3 | 34,4% / 32,4% / 35,6% | 15,85 / 15,07 / 15,19 |

L'aumento delle copie non migliora il deck: sottrae troppe carte autonome e
l'IA non converte con sufficiente regolarita' i pezzi di setup. Una copia di
Drago Metallo Nero e' l'unico piccolo miglioramento (+2 punti), ancora entro
un margine che non giustifica da solo una modifica permanente.

Decisione: Joey Facile/Medio/Difficile restano invariati. Limite provvisorio
consigliato per il giocatore: 2 copie per ciascuna delle quattro carte; non
per potenza assoluta, ma per evitare mani ridondanti e preservare il carattere
raro del pacchetto. Il limite verra' applicato insieme all'ottenibilita', non
ora che le carte non hanno ancora una fonte.

## Prossimo checkpoint

1. definire missioni tematiche per la prima copia e pool rarissimo per le
   seconde copie nella fase economica comune;
2. rieseguire il confronto dopo il secondo pacchetto, perche' Fusione Occhi
   Rossi puo' cambiare il valore relativo di Intuito;
3. mantenere invariati i deck avversari finche' un audit successivo non mostra
   un vantaggio strategico chiaro e coerente.

Il secondo pacchetto (`Fusione Occhi Rossi` e `Drago Meteora Cometa Nero`)
resta separato: usare materiali dal Deck e' deliberatamente una feature di
motore successiva e piu' rischiosa.
