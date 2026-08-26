-- =============================================================
-- SPELBOK — Google-inlogg (OAuth)
-- Kör i Supabase SQL Editor.
--
-- Google skickar aldrig något 'username' i metadatan, så den gamla
-- handle_new_user() gav varje Google-konto ett namn som "user_a3f19c02".
-- Den här versionen bygger namnet från Google-profilen istället och
-- garanterar att det blir unikt (username är unique not null).
-- =============================================================

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  raw_name  text;
  base      text;
  candidate text;
  avatar    text;
  suffix    int := 0;
begin
  -- Prioritet: eget val vid registrering > Googles namn > e-postens lokaldel.
  raw_name := coalesce(
    nullif(new.raw_user_meta_data->>'username', ''),
    nullif(new.raw_user_meta_data->>'full_name', ''),
    nullif(new.raw_user_meta_data->>'name', ''),
    nullif(split_part(coalesce(new.email, ''), '@', 1), '')
  );

  -- Slugga till [a-z0-9_]: "Johan Öberg" -> "johan_oberg".
  base := lower(coalesce(raw_name, ''));
  base := translate(
    base,
    'åäöàáâãéèêëíìîïóòôõúùûüñçøæß',
    'aaoaaaaeeeeiiiioooouuuuncoas'
  );
  base := regexp_replace(base, '[^a-z0-9]+', '_', 'g');
  base := trim(both '_' from base);
  base := left(base, 20);
  base := trim(both '_' from base);

  -- Namn som "Ö" eller "a@b.se" kan slugga bort till nästan ingenting.
  if length(base) < 3 then
    base := 'user_' || left(replace(new.id::text, '-', ''), 8);
  end if;

  avatar := nullif(
    coalesce(
      new.raw_user_meta_data->>'avatar_url',
      new.raw_user_meta_data->>'picture'
    ),
    ''
  );

  -- Två personer kan heta samma sak. Räkna upp tills namnet är ledigt;
  -- exception-loopen fångar dessutom kapplöpningen mellan två samtidiga
  -- registreringar, som förhandskollen inte kan se.
  candidate := base;
  loop
    begin
      insert into public.profiles (id, username, avatar_url)
      values (new.id, candidate, avatar);
      exit;
    exception when unique_violation then
      suffix := suffix + 1;
      if suffix = 51 then
        -- Ge upp på det snygga namnet hellre än att blockera inloggningen.
        candidate := left(base, 12) || '_' || left(replace(new.id::text, '-', ''), 8);
      elsif suffix > 51 then
        -- Kollisionen sitter inte i username (id finns redan?) — loopa inte.
        raise;
      else
        candidate := left(base, 20 - length(suffix::text)) || suffix::text;
      end if;
    end;
  end loop;

  return new;
end $$;

-- Triggern finns redan från supabase-schema.sql, men skapas här också så att
-- filen går att köra mot ett projekt där den råkat tas bort.
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

notify pgrst, 'reload schema';
