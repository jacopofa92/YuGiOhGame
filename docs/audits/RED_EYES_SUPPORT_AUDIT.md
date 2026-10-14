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

## Prossimo checkpoint

1. audit IA con deck di prova Occhi Rossi a 1/2/3 copie;
2. confronto con la baseline di Joey Facile/Medio/Difficile;
3. proposta motivata su limite, prima copia e copie successive;
4. solo se i numeri lo giustificano, prova di 2-4 sostituzioni nel solo deck
   Joey Difficile.

Il secondo pacchetto (`Fusione Occhi Rossi` e `Drago Meteora Cometa Nero`)
resta separato: usare materiali dal Deck e' deliberatamente una feature di
motore successiva e piu' rischiosa.
