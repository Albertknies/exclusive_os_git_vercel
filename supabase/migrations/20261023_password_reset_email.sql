-- Recuperação de senha Exclusive OS. Aplicar primeiro em homologação.
create table if not exists public.os_password_reset_tokens (
 token_hash text primary key,
 user_id uuid not null references public.os_users(id) on delete cascade,
 expires_at timestamptz not null,
 used_at timestamptz,
 created_at timestamptz not null default now()
);
create index if not exists os_password_reset_tokens_user_idx on public.os_password_reset_tokens(user_id,created_at desc);
create table if not exists public.os_password_reset_limits (
 chave text primary key,
 inicio timestamptz not null default now(),
 tentativas integer not null default 0
);
revoke all on public.os_password_reset_tokens from anon, authenticated;
revoke all on public.os_password_reset_limits from anon, authenticated;
create or replace function public.os_password_reset_rate_limit(p_chave text,p_limite integer,p_janela_seg integer)
returns boolean language plpgsql security definer set search_path=public as $$
declare v_count integer;
begin
 if length(p_chave)<>64 or p_limite<1 or p_janela_seg<1 then return false; end if;
 insert into public.os_password_reset_limits(chave,inicio,tentativas) values(p_chave,now(),1)
 on conflict(chave) do update set
 inicio=case when os_password_reset_limits.inicio<now()-make_interval(secs=>p_janela_seg) then now() else os_password_reset_limits.inicio end,
 tentativas=case when os_password_reset_limits.inicio<now()-make_interval(secs=>p_janela_seg) then 1 else os_password_reset_limits.tentativas+1 end
 returning tentativas into v_count;
 return v_count<=p_limite;
end $$;
revoke all on function public.os_password_reset_rate_limit(text,integer,integer) from public,anon,authenticated;
grant execute on function public.os_password_reset_rate_limit(text,integer,integer) to service_role;
create or replace function public.os_password_reset_consume(p_token_hash text,p_password_hash text)
returns boolean language plpgsql security definer set search_path=public as $$
declare v_user uuid;
begin
 if length(p_token_hash)<>64 or p_token_hash !~ '^[0-9a-f]+$' or
    length(p_password_hash)<>168 or split_part(p_password_hash,'$',1)<>'scrypt' or
    length(split_part(p_password_hash,'$',2))<>32 or
    length(split_part(p_password_hash,'$',3))<>128 then return false; end if;
 update public.os_password_reset_tokens set used_at=now()
 where token_hash=p_token_hash and used_at is null and expires_at>now()
 returning user_id into v_user;
 if v_user is null then return false; end if;
 update public.os_users set password_hash=p_password_hash,updated_at=now()
 where id=v_user and ativo=true;
 if not found then raise exception 'Conta inativa'; end if;
 update public.os_password_reset_tokens set used_at=now() where user_id=v_user and used_at is null;
 return true;
end $$;
revoke all on function public.os_password_reset_consume(text,text) from public,anon,authenticated;
grant execute on function public.os_password_reset_consume(text,text) to service_role;
