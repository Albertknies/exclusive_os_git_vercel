create table if not exists public.os_veiculos (
 id uuid primary key default gen_random_uuid(),
 placa text not null unique check(placa ~ '^[A-Z]{3}[0-9][A-Z0-9][0-9]{2}$'),
 modelo text not null, marca text not null default '', identificacao text not null default '',
 status text not null default 'Disponível' check(status in ('Disponível','Manutenção','Inativo')),
 created_at timestamptz not null default now(),updated_at timestamptz not null default now()
);
create table if not exists public.os_veiculo_usos (
 id uuid primary key default gen_random_uuid(),
 veiculo_id uuid not null references public.os_veiculos(id),
 sindico_id uuid not null references public.os_users(id),
 registrado_por uuid not null references public.os_users(id),
 inicio timestamptz not null,fim timestamptz,
 km_inicial numeric(12,1) not null check(km_inicial>=0),
 km_final numeric(12,1) check(km_final>=km_inicial),
 destino text not null,finalidade text not null,observacoes text not null default '',
 created_at timestamptz not null default now(),updated_at timestamptz not null default now(),
 constraint fim_apos_inicio check(fim is null or fim>=inicio),
 constraint fechamento_completo check((fim is null and km_final is null) or (fim is not null and km_final is not null))
);
create unique index if not exists os_veiculo_um_uso_aberto on public.os_veiculo_usos(veiculo_id) where fim is null;
create index if not exists os_veiculo_usos_sindico on public.os_veiculo_usos(sindico_id,inicio desc);
create table if not exists public.os_veiculo_audit (
 id bigint generated always as identity primary key,registro_id uuid,veiculo_id uuid,
 actor_id uuid references public.os_users(id),acao text not null,
 detalhes jsonb not null default '{}'::jsonb,at timestamptz not null default now()
);
alter table public.os_veiculos enable row level security;
alter table public.os_veiculo_usos enable row level security;
alter table public.os_veiculo_audit enable row level security;