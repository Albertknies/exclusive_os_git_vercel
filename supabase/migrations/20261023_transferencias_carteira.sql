-- Transferência atômica de carteiras: somente Master/Gerente, com auditoria.
create table if not exists public.os_transferencias_carteira (
 id uuid primary key default gen_random_uuid(),
 lote_id uuid not null,
 condominio_id uuid not null references public.os_condominios(id) on delete restrict,
 responsavel_anterior text not null,
 responsavel_novo text not null,
 executado_por uuid not null references public.os_users(id),
 created_at timestamptz not null default now()
);
create index if not exists os_transferencias_carteira_lote_idx on public.os_transferencias_carteira(lote_id);
alter table public.os_transferencias_carteira enable row level security;
create or replace function public.os_transferir_carteira(p_ids uuid[],p_origem text,p_destino text,p_actor uuid)
returns integer language plpgsql security definer set search_path = public, pg_temp as $$
declare n integer; total integer; lote uuid := gen_random_uuid(); role_atual text;
begin
 select perfil into role_atual from public.os_users where id=p_actor and ativo=true;
 if role_atual is distinct from 'Master' and role_atual is distinct from 'Gerente' then raise exception 'Sem permissão para transferir carteira'; end if;
 if p_ids is null or cardinality(p_ids)<1 or cardinality(p_ids)>100 or cardinality(p_ids)<>(select count(distinct x) from unnest(p_ids) as x) then raise exception 'Seleção de condomínios inválida'; end if;
 if p_origem is null or btrim(p_origem)='' or p_destino is null or btrim(p_destino)='' or length(p_destino)>150 or p_origem=p_destino then raise exception 'Responsáveis inválidos'; end if;
 if not exists(select 1 from public.os_condominios where sindico=p_destino) and not exists(select 1 from public.os_users where perfil='Síndico' and ativo=true and nome=p_destino) then raise exception 'Responsável de destino não cadastrado'; end if;
 perform 1 from public.os_condominios where id=any(p_ids) order by id for update;
 select count(*) into n from public.os_condominios where id=any(p_ids) and sindico=p_origem;
 total:=cardinality(p_ids);
 if n<>total then raise exception 'A carteira mudou ou contém condomínios não pertencentes à origem. Atualize a tela.'; end if;
 insert into public.os_transferencias_carteira(lote_id,condominio_id,responsavel_anterior,responsavel_novo,executado_por)
 select lote,id,sindico,p_destino,p_actor from public.os_condominios where id=any(p_ids);
 update public.os_condominios set sindico=p_destino,sindico_user_id=null,updated_at=now() where id=any(p_ids);
 return total;
end $$;
revoke all on function public.os_transferir_carteira(uuid[],text,text,uuid) from public, anon, authenticated;
grant execute on function public.os_transferir_carteira(uuid[],text,text,uuid) to service_role;
