# Audit Pegasus avversario

Data: 9 ottobre 2026.

## Scopo

Ricalcolare Pegasus come avversario dopo la correzione definitiva di
`Mondo dei Toon`. Le misure più vecchie erano contaminate dal fatto che la
carta restava in mano e quindi non descrivevano il mazzo realmente giocato.
Lo Starter Pegasus non rientra in questo audit e non è stato modificato.

## Metodo

- 100 semi per ciascuno dei cinque deck campione (`yamiYugi`, `joey`,
  `pegasus`, `mako`, `bakura`), sempre pilotati dall'IA Difficile;
- stessi semi per Pegasus Facile, Medio e Difficile;
- 500 duelli per livello, 1.500 complessivi;
- tetto di 80 turni, senza partite non concluse;
- controllo identitario separato su quattro campioni non-Pegasus, così gli
  assorbimenti letti nel registro appartengono certamente all'avversario.

I dati completi sono in `PEGASUS_OPPONENT_AUDIT.json` e
`PEGASUS_OPPONENT_IDENTITY_AUDIT.json`.

## Risultato

| Livello | Vittorie Pegasus | Turni medi |
| --- | ---: | ---: |
| Facile | 35,8% | 23,1 |
| Medio | 54,2% | 19,3 |
| Difficile | 58,6% | 20,7 |

La progressione torna monotona. Il primo tentativo post-fix aveva rilevato
33,2% / 58% / 50,4%: la lista Difficile aveva sostituito tutti e tre i
`Coniglio Oscuro` con supporti e difese, riducendo troppo i mostri subito
evocabili. La correzione conserva 40 carte e la lore di Pegasus.

Nel controllo identitario il piano Toon è frequente a tutti i livelli. Il
piano Abbandonato/Mille Occhi non esiste volutamente a Facile, è raro a
Medio e diventa riconoscibile a Difficile:

| Livello | Mondo dei Toon | Abbandonato | Restrizione dai Mille Occhi |
| --- | ---: | ---: | ---: |
| Facile | 55,5% | 0% | 0% |
| Medio | 74% | 10,5% | 0,5% |
| Difficile | 74,5% | 18,5% | 4% |

Le percentuali indicano i duelli in cui il registro mostra almeno una volta
quel piano, non la probabilità di pesca della singola carta. Per rendere
Mille Occhi visibile senza trasformarlo nel solo piano del mazzo, Difficile
usa due copie di `Fusione`, `Abbandonato` e `Idolo dai Mille Occhi`; sono
state tolte soltanto `Bambola della Rovina`, `Drago Pappagallo` e una
difesa. La seconda `Forza dello Specchio` compensa la maggiore probabilità
di pescare materiali combo senza cancellare `L'Occhio della Verità` dalla
lista tematica. Medio conserva una copia per pezzo e Facile resta privo
della Fusione.
