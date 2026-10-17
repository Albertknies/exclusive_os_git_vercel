-- Exclusive OS | Migração aditiva de redistribuição de carteiras
-- Aplicar no Supabase SQL Editor após backup. Preserva todos os módulos e registros existentes.
begin;
create table if not exists public.os_carteira_transferencias (
 id uuid primary key default gen_random_uuid(),
 condominio_id uuid not null references public.os_condominios(id),
 origem_nome text not null default '',
 destino_id uuid not null references public.os_users(id),
 destino_nome text not null,
 actor_id uuid not null references public.os_users(id),
 motivo text not null check(length(trim(motivo)) between 10 and 1000),
 pontos integer not null,
 realizada_em timestamptz not null default now()
);
create index if not exists os_carteira_transferencias_condo_idx on public.os_carteira_transferencias(condominio_id,realizada_em desc);
alter table public.os_carteira_transferencias enable row level security;
create or replace function public.os_transferir_carteira(
 p_condominio_id uuid,p_destino_id uuid,p_actor_id uuid,p_motivo text,p_sindico_esperado text
) returns jsonb
language plpgsql security invoker set search_path=public
as $$
declare
 v_cond public.os_condominios%rowtype;
 v_dest public.os_users%rowtype;
 v_actor public.os_users%rowtype;
 v_pontos integer;
begin
 if length(trim(coalesce(p_motivo,''))) not between 10 and 1000 then
  raise exception 'Motivo inválido' using errcode='P0001';
 end if;
 select * into v_actor from public.os_users where id=p_actor_id and ativo=true;
 if not found or v_actor.perfil not in ('Master','Gerente') then
  raise exception 'Responsável sem permissão' using errcode='P0001';
 end if;
 select * into v_dest from public.os_users where id=p_destino_id and ativo=true and perfil='Síndico';
 if not found then raise exception 'Síndico destinatário inválido' using errcode='P0001'; end if;
 select * into v_cond from public.os_condominios where id=p_condominio_id for update;
 if not found then raise exception 'Condomínio inexistente' using errcode='P0001'; end if;
 if coalesce(v_cond.sindico,'') is distinct from coalesce(p_sindico_esperado,'') then
  raise exception 'A carteira foi alterada por outro usuário. Atualize antes de confirmar.' using errcode='P0001';
 end if;
 if lower(trim(coalesce(v_cond.sindico,'')))=lower(trim(v_dest.nome)) then
  raise exception 'O condomínio já pertence ao destinatário' using errcode='P0001';
 end if;
 v_pontos:=case v_cond.classe when 'A' then 4 when 'B' then 7 when 'C' then 11 when 'D' then 16 else 0 end;
 update public.os_condominios set sindico=v_dest.nome,updated_at=now() where id=p_condominio_id;
 insert into public.os_carteira_transferencias(condominio_id,origem_nome,destino_id,destino_nome,actor_id,motivo,pontos)
 values(p_condominio_id,coalesce(v_cond.sindico,''),v_dest.id,v_dest.nome,v_actor.id,trim(p_motivo),v_pontos);
 return jsonb_build_object('condominio_id',p_condominio_id,'origem',v_cond.sindico,'destino',v_dest.nome,'pontos',v_pontos);
end $$;
revoke all on function public.os_transferir_carteira(uuid,uuid,uuid,text,text) from public,anon,authenticated;
grant execute on function public.os_transferir_carteira(uuid,uuid,uuid,text,text) to service_role;
commit;
-- O campo os_condominios.sindico já existe e continua compatível com telas antigas.
-- A transferência atualiza a carteira, mas não migra automaticamente tarefas/chamados
-- nem os vínculos de acesso (os_vinculos), que devem ser revisados separadamente.
