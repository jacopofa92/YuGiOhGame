-- ============================================================
-- Yu-Gi-Oh! Duel Arena — schema Supabase per la sincronizzazione
-- CLOUD OPZIONALE di salvataggio giocatore e carte custom.
-- ============================================================
-- Da eseguire UNA VOLTA sola nell'SQL Editor del tuo progetto Supabase
-- (dashboard → SQL Editor → New query → incolla tutto → Run).
--
-- L'autenticazione (auth.users) è già gestita da Supabase stesso: qui si
-- creano solo le DUE tabelle che il gioco usa (js/cloud/cloud-sync.js), più
-- le policy di Row Level Security che garantiscono che ogni utente veda e
-- modifichi SOLO i propri dati — obbligatorio: senza RLS chiunque con la
-- chiave "anon" pubblica (che è per forza incorporata nel codice client,
-- vedi js/cloud/supabase-config.js) potrebbe leggere/scrivere i dati di TUTTI.
-- ============================================================

-- ------------------------------------------------------------
-- 1) saves — UN salvataggio completo per utente (rispecchia esattamente
--    l'oggetto che oggi vive in localStorage via js/save-manager.js:
--    nome giocatore, deck, deck attivo, record duelli, valute, pacchetti
--    posseduti — tutto in una sola colonna jsonb, stesso principio "un
--    solo blob" già usato in locale, per una sincronizzazione semplice
--    invece di normalizzare in tabelle separate).
-- ------------------------------------------------------------
create table public.saves (
    user_id uuid primary key references auth.users(id) on delete cascade,
    data jsonb not null,
    updated_at timestamptz not null default now()
);

alter table public.saves enable row level security;

create policy "Users can view their own save"
    on public.saves for select
    using (auth.uid() = user_id);

create policy "Users can insert their own save"
    on public.saves for insert
    with check (auth.uid() = user_id);

create policy "Users can update their own save"
    on public.saves for update
    using (auth.uid() = user_id);

create policy "Users can delete their own save"
    on public.saves for delete
    using (auth.uid() = user_id);

-- ------------------------------------------------------------
-- 2) custom_cards — le carte create in crea-carta.html (js/data/custom-cards.js),
--    UNA RIGA per carta (a differenza di "saves" sopra): permette di
--    cancellarne/aggiornarne una singola senza toccare le altre.
-- ------------------------------------------------------------
create table public.custom_cards (
    id bigint generated always as identity primary key,
    user_id uuid not null references auth.users(id) on delete cascade,
    card jsonb not null,
    created_at timestamptz not null default now()
);

alter table public.custom_cards enable row level security;

create policy "Users can view their own custom cards"
    on public.custom_cards for select
    using (auth.uid() = user_id);

create policy "Users can insert their own custom cards"
    on public.custom_cards for insert
    with check (auth.uid() = user_id);

create policy "Users can update their own custom cards"
    on public.custom_cards for update
    using (auth.uid() = user_id);

create policy "Users can delete their own custom cards"
    on public.custom_cards for delete
    using (auth.uid() = user_id);

-- ------------------------------------------------------------
-- Indice utile per "tutte le carte di questo utente", la query più
-- comune (vedi js/cloud/cloud-sync.js#pullCustomCards).
-- ------------------------------------------------------------
create index custom_cards_user_id_idx on public.custom_cards (user_id);

-- ------------------------------------------------------------
-- 3) delete_own_account() — permette a un utente loggato di cancellare
--    SE STESSO (mai un altro: legge auth.uid(), non un parametro).
--    Necessaria perché auth.users vive in uno schema protetto che il
--    client con la chiave "anon"/utente autenticato non può toccare
--    direttamente — SECURITY DEFINER fa eseguire la funzione con i
--    permessi di chi l'ha creata (di solito il proprietario del
--    progetto), non con quelli di chi la chiama. La riga in saves e
--    tutte quelle in custom_cards spariscono da sole grazie a
--    "on delete cascade" definito sopra sulle foreign key.
-- ------------------------------------------------------------
create or replace function public.delete_own_account()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
    delete from auth.users where id = auth.uid();
end;
$$;

revoke all on function public.delete_own_account() from public;
grant execute on function public.delete_own_account() to authenticated;
