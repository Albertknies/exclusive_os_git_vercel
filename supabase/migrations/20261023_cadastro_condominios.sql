-- Exclusive OS | Cadastro de condomínios: código, endereço e início de gestão
-- Faça backup antes de executar. Migração aditiva: não altera dados existentes.
alter table public.os_condominios
 add column if not exists codigo varchar(30),
 add column if not exists endereco_completo text,
 add column if not exists data_inicio_exclusive date;

-- Código único sem distinção de maiúsculas/minúsculas; permite registros legados sem código.
create unique index if not exists os_condominios_codigo_unique_ci
 on public.os_condominios (lower(codigo))
 where codigo is not null;

alter table public.os_condominios
 drop constraint if exists os_condominios_codigo_formato;
alter table public.os_condominios
 add constraint os_condominios_codigo_formato
 check (codigo is null or codigo ~ '^[A-Za-z0-9][A-Za-z0-9._/-]{0,29}$');

comment on column public.os_condominios.codigo is 'Código de identificação interno, único por condomínio';
comment on column public.os_condominios.endereco_completo is 'Logradouro, número, complemento, bairro, município, UF e CEP';
comment on column public.os_condominios.data_inicio_exclusive is 'Data de início da gestão Exclusive Síndicos';

-- Após preencher os dados históricos, considerar NOT NULL para os novos cadastros.
