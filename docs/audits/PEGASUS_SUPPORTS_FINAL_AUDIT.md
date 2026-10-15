# Decisione finale supporti moderni — Pegasus Difficile

Data: 2026-10-15. Il mazzo pubblicato non e' ancora stato modificato.

## Varianti

La lista corrente, gia' corretta per ridurre le mani morte di Fusione e
Abbandonato, e' stata confrontata con:

- `regnoSingolo`: -1 Coniglio Oscuro, +1 Regno Toon;
- `toonLeggero`: -3 Coniglio Oscuro, +1 Regno Toon, +1 Segnalibro Toon e
  +1 Signora Arpia Toon.

Entrambe conservano tutti i Toon storici, tre Mondo dei Toon e l'intera linea
Abbandonato, Idolo, Rito, Fusione e Restrizione dai Mille Occhi.

## Metodo e risultati

900 duelli con IA Difficile e semi identici: per variante, 250 contro Yami
Yugi, Joey, Kaiba, Mako e Bakura e 50 contro il `Custom` di impronta
`e1909a556263c979`.

| Lista | Vittorie ufficiali | Vittorie contro Custom | Abbandonato visto | Mille Occhi visto |
| --- | ---: | ---: | ---: | ---: |
| Pubblicata | 38,8% | 12,0% | 15,2% | 2,8% |
| Un Regno Toon | 46,0% | 26,0% | 22,4% | 2,0% |
| Pacchetto Toon leggero | 52,8% | 20,0% | 25,2% | 2,4% |

Regno Toon singolo e' il candidato piu' equilibrato: aumenta la solidita' in
entrambi i campioni senza trasformare il deck in una lista moderna. Il
pacchetto da tre e' piu' forte contro i deck ufficiali, ma occupa tutti i
Conigli Oscuri e rende meno contro Custom. Abbandonato rimane visibile e la
frequenza di Mille Occhi, gia' bassa per natura della combinazione, non cambia
in modo sostanziale.

## Raccomandazione in attesa di conferma

Promuovere soltanto `regnoSingolo` nel deck Pegasus Difficile. Facile, Medio,
Starter e Structure restano invariati. Segnalibro, Arpia e gli altri supporti
moderni rimangono ricompense rare del giocatore.

Strumento: `tools/audit-pegasus-supporti-finali.js`.
Dati: `reports/archetypes/PEGASUS_SUPPORTS_FINAL_AUDIT.json`.
