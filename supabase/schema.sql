-- Planner Revalle · estrutura no Supabase (espelha as abas da planilha "Planner Revalle - Sistema" e os arquivos do Drive).
-- Tudo passa pela função "api" (Edge Function, chave de serviço). RLS ligado e sem políticas: ninguém acessa as tabelas direto pelo navegador.


create table if not exists public.usuarios (email text primary key, nome text, area text, perfil text, status text, salt text, hash text,
  criado text, aprovado_por text, aprovado_em text, ultimo_acesso text);
create table if not exists public.sessoes (token text primary key, email text not null, expira text not null);
create index if not exists sessoes_email on public.sessoes(email);
create table if not exists public.equipes (unb text not null, setor text not null, gv_email text not null, atualizado text, primary key (unb, setor));
create table if not exists public.links (token text primary key, unb text, setor text, ativo text, criado_por text, criado_em text, desativado_em text);
create index if not exists links_setor on public.links(unb, setor);
create table if not exists public.arquivos (nome text primary key, atualizado text, por text, bytes bigint default 0);
create table if not exists public.log (id bigserial primary key, quando text, email text, acao text, detalhe text);
create table if not exists public.notas (id text primary key, tipo text, unidade text, planner text, pdv text, setor text, texto text, status text,
  autor text, autor_nome text, criado text, atualizado text, excluida text, categoria text, regiao text);
create table if not exists public.sns_vinculo (sns_email text primary key, gvs text, revenda text, atualizado text);
create table if not exists public.pedidos_sns (id text primary key, v text, unb text, un text, code text, sns_email text, sns_nome text, item text,
  status text, gv_email text, gv_nome text, gv_obs text, gv_em text, criado text, atualizado text);
create index if not exists pedidos_sns_v on public.pedidos_sns(v, sns_email);

do $$ declare t text; begin
  for t in select tablename from pg_tables where schemaname = 'public' and tablename in ('usuarios','sessoes','equipes','links','arquivos','log','notas','sns_vinculo','pedidos_sns') loop
    execute format('alter table public.%I enable row level security', t);
  end loop;
end $$;
grant usage on schema public to service_role;
grant all on all tables in schema public to service_role;
grant all on all sequences in schema public to service_role;
alter default privileges in schema public grant all on tables to service_role;
alter default privileges in schema public grant all on sequences to service_role;

-- arquivos (planners, rotina, relatórios, janelas): bucket privado
insert into storage.buckets (id, name, public) values ('dados', 'dados', false) on conflict (id) do nothing;

-- registro da crítica (solicitações dos GVs e parecer da Logística)
create table if not exists public.criticas (id text primary key, v text not null, u text, code text, gv text, parecer text, dados jsonb);
create index if not exists criticas_v on public.criticas(v, gv);
alter table public.criticas enable row level security;
alter table public.arquivos add column if not exists file_id text;
grant all on public.criticas to service_role;
