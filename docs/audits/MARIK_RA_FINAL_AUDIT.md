# Decisione finale supporti moderni — Marik e Ra

Data: 2026-10-15. Il mazzo pubblicato non e' ancora stato modificato.

## Varianti

- `cantoSingolo`: +1 Canto Antico, -1 Tempesta Pesante;
- `cicloRa`: Canto, Modalita' Sfera e Fenice, al posto di Tempesta Pesante,
  Incantesimo Ombra e Capro Espiatorio;
- `cicloCompleto`: aggiunge anche Incrocio di Anime, togliendo inoltre una
  copia di Ryu Kishin.

Ra resta sempre limitato a una copia e il nucleo di controllo di Marik non
viene sostituito.

## Metodo e risultati

1.200 duelli con IA Difficile e semi identici: per variante, 250 contro Yami
Yugi, Joey, Kaiba, Pegasus e Bakura e 50 contro il `Custom` di impronta
`e1909a556263c979`.

| Lista | Vittorie ufficiali | Vittorie contro Custom | Ra visto | Fenice vista |
| --- | ---: | ---: | ---: | ---: |
| Pubblicata | 49,2% | 20,0% | 6,0% | — |
| Un Canto Antico | 52,0% | 26,0% | 15,6% | — |
| Ciclo Ra | 46,8% | 32,0% | 7,2% | 1,2% |
| Ciclo completo | 53,6% | 12,0% | 11,6% | 8,0% |

Canto Antico singolo e' l'unica variante positiva in entrambi i campioni e
porta Ra in partita oltre il doppio delle volte. Sfera e Fenice richiedono
piu' setup di quanto l'IA converta regolarmente. Incrocio di Anime alza il
campione ufficiale ma crolla contro Custom: il pacchetto completo e' troppo
dipendente dalla combinazione e non e' adatto al deck predefinito.

## Raccomandazione in attesa di conferma

Promuovere soltanto Canto Antico nel deck Marik Difficile, al posto di
Tempesta Pesante. Facile e Medio restano invariati; Sfera, Fenice e Incrocio
rimangono carte rare del giocatore.

Strumento: `tools/audit-marik-ra-finale.js`.
Dati: `reports/archetypes/MARIK_RA_FINAL_AUDIT.json`.
