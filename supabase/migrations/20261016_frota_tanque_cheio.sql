-- EXCLUSIVE OS | MIGRAÇÃO ADITIVA FROTA 2026-10-16
-- Executar no Supabase SQL Editor, após supabase/veiculos.sql.
-- Não apaga nem altera os registros históricos existentes.
begin;
alter table public.os_veiculo_usos
 add column if not exists combustivel_retirada text,
 add column if not exists combustivel_devolucao text,
 add column if not exists litros_abastecidos numeric(10,2),
 add column if not exists valor_abastecimento numeric(12,2),
 add column if not exists posto_abastecimento text,
 add column if not exists justificativa_excecao text,
 add column if not exists foto_painel_retirada text,
 add column if not exists foto_painel_devolucao text,
 add column if not exists foto_comprovante text;
-- Colunas novas são nullable para preservar registros anteriores à migração.
alter table public.os_veiculo_usos
 drop constraint if exists os_frota_combustivel_retirada_check,
 add constraint os_frota_combustivel_retirada_check check (combustivel_retirada is null or combustivel_retirada='cheio'),
 drop constraint if exists os_frota_combustivel_devolucao_check,
 add constraint os_frota_combustivel_devolucao_check check (combustivel_devolucao is null or combustivel_devolucao in ('cheio','incompleto')),
 drop constraint if exists os_frota_litros_check,
 add constraint os_frota_litros_check check (litros_abastecidos is null or litros_abastecidos between 0 and 300),
 drop constraint if exists os_frota_valor_check,
 add constraint os_frota_valor_check check (valor_abastecimento is null or valor_abastecimento between 0 and 10000);
create table if not exists public.os_veiculo_manutencoes(
 id uuid primary key default gen_random_uuid(),
 veiculo_id uuid not null references public.os_veiculos(id),
 tipo text not null check(length(trim(tipo))>=3),
 km_servico numeric(12,1) not null check(km_servico>=0),
 intervalo_km integer not null check(intervalo_km between 100 and 100000),
 observacoes text not null default '',
 registrado_por uuid not null references public.os_users(id),
 realizado_em timestamptz not null default now()
);
create index if not exists os_frota_manutencoes_veiculo_tipo
 on public.os_veiculo_manutencoes(veiculo_id,tipo,realizado_em desc);
alter table public.os_veiculo_manutencoes enable row level security;
-- A API usa service_role no servidor e valida sessão e perfil; não liberar policies públicas.
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
 values ('os-frota-comprovantes','os-frota-comprovantes',false,950000,array['image/jpeg','image/png','image/webp'])
 on conflict (id) do update set public=false,file_size_limit=950000,allowed_mime_types=array['image/jpeg','image/png','image/webp'];
commit;

-- Conferência:
-- select column_name from information_schema.columns
-- where table_schema='public' and table_name='os_veiculo_usos';
-- select id,public from storage.buckets where id='os-frota-comprovantes';
