-- Execute DEPOIS de supabase/schema.sql, no SQL Editor do Supabase.
-- Todas as tabelas são privadas. A API Vercel aplica autorização por sessão e por condomínio.
create table if not exists public.os_condominios (
 id uuid primary key default gen_random_uuid(),
 codigo text unique,
 nome text not null check (length(trim(nome)) between 2 and 180),
 sindico text not null default '',
 classe text not null default 'B' check (classe in ('A','B','C','D')),
 status text not null default 'Ativo' check (status in ('Ativo','Inativo')),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
create table if not exists public.os_vinculos (
 user_id uuid not null references public.os_users(id) on delete cascade,
 condominio_id uuid not null references public.os_condominios(id) on delete cascade,
 primary key (user_id, condominio_id)
);
create table if not exists public.os_processos (
 id uuid primary key default gen_random_uuid(),
 condominio_id uuid not null references public.os_condominios(id),
 titulo text not null check(length(trim(titulo)) between 3 and 180),
 descricao text not null default '',
 status text not null default 'Aberto' check(status in ('Aberto','Em andamento','Concluído','Cancelado')),
 prioridade text not null default 'Normal' check(prioridade in ('Baixa','Normal','Alta','Urgente')),
 responsavel_id uuid references public.os_users(id),
 created_by uuid references public.os_users(id),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
create index if not exists os_processos_condominio_idx on public.os_processos(condominio_id);
create table if not exists public.os_vistorias (
 id uuid primary key default gen_random_uuid(),
 condominio_id uuid not null references public.os_condominios(id),
 titulo text not null check(length(trim(titulo)) between 3 and 180),
 data_vistoria date not null,
 observacoes text not null default '',
 status text not null default 'Pendente' check(status in ('Pendente','Em andamento','Concluída')),
 created_by uuid references public.os_users(id),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
create index if not exists os_vistorias_condominio_idx on public.os_vistorias(condominio_id);
create table if not exists public.os_operacoes_audit (
 id bigint generated always as identity primary key,
 actor_id uuid references public.os_users(id),
 entidade text not null,
 registro_id uuid not null,
 acao text not null,
 at timestamptz not null default now()
);
create table if not exists public.os_login_attempts (
 chave text primary key,
 tentativas integer not null default 0,
 inicio timestamptz not null default now()
);
-- O service role é usado APENAS nas funções serverless; não expor no navegador.
alter table public.os_condominios enable row level security;
alter table public.os_vinculos enable row level security;
alter table public.os_processos enable row level security;
alter table public.os_vistorias enable row level security;
alter table public.os_operacoes_audit enable row level security;
alter table public.os_login_attempts enable row level security;
