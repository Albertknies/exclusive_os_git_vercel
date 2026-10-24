-- Módulo de abastecimentos: migração aditiva, não altera dados existentes.
create table if not exists public.os_veiculo_abastecimentos (
 id uuid primary key default gen_random_uuid(),
 veiculo_id uuid not null references public.os_veiculos(id),
 registrado_por uuid not null references public.os_users(id),
 data_abastecimento timestamptz not null,
 km numeric(12,1) not null check(km>=0),
 litros numeric(12,3) not null check(litros>0),
 valor_total numeric(12,2) not null check(valor_total>=0),
 tanque_cheio boolean not null default false,
 posto text not null default '',
 observacoes text not null default '',
 created_at timestamptz not null default now()
);
create index if not exists os_abastecimentos_veiculo_data on public.os_veiculo_abastecimentos(veiculo_id,data_abastecimento desc);
alter table public.os_veiculo_abastecimentos enable row level security;
comment on table public.os_veiculo_abastecimentos is 'Abastecimentos da frota Exclusive OS; consumo calculado apenas entre registros consecutivos de tanque cheio.';
