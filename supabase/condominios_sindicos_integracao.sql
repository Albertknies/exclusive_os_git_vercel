-- Integração aditiva de condomínios e síndicos. Veículos já possuem tabelas próprias.
alter table public.os_condominios
 add column if not exists endereco_completo text,
 add column if not exists data_inicio_exclusive date,
 add column if not exists sindico_user_id uuid references public.os_users(id) on delete set null;
create index if not exists os_condominios_sindico_user_id_idx on public.os_condominios(sindico_user_id);
comment on column public.os_condominios.sindico_user_id is 'Referência ao usuário Síndico; campo sindico em texto preservado para compatibilidade.';
comment on column public.os_condominios.data_inicio_exclusive is 'Data em que a Exclusive assumiu a administração.';
