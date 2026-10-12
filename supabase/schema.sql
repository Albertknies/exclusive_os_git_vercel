-- Execute no SQL Editor do Supabase. A tabela não é acessível via chave pública.
create table if not exists public.os_users (
 id uuid primary key default gen_random_uuid(),
 nome text not null check(length(nome) between 2 and 150),
 email text not null unique,
 cpf text not null unique check(cpf ~ '^[0-9]{11}$'),
 password_hash text not null,
 perfil text not null check(perfil in ('Master','Gerente','Administrativo','Síndico','Vistoriador','Cliente')),
 ativo boolean not null default true,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
alter table public.os_users enable row level security;
-- Sem políticas públicas: acesso somente via service role no servidor.
create table if not exists public.os_user_audit (
 id bigint generated always as identity primary key,
 actor_id uuid references public.os_users(id),
 target_id uuid references public.os_users(id),
 action text not null,
 at timestamptz not null default now()
);
alter table public.os_user_audit enable row level security;
