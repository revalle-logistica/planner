-- Planner Revalle · estrutura no Supabase (projeto "sire", tabelas com prefixo planner_) (espelha as abas da planilha "Planner Revalle - Sistema" e os arquivos do Drive).
-- Tudo passa pela função "api" (Edge Function, chave de serviço). RLS ligado e sem políticas: ninguém acessa as tabelas direto pelo navegador.


create table if not exists public.planner_usuarios (email text primary key, nome text, area text, perfil text, status text, salt text, hash text,
  criado text, aprovado_por text, aprovado_em text, ultimo_acesso text);
create table if not exists public.planner_sessoes (token text primary key, email text not null, expira text not null);
create index if not exists planner_sessoes_email on public.planner_sessoes(email);
create table if not exists public.planner_equipes (unb text not null, setor text not null, gv_email text not null, atualizado text, primary key (unb, setor));
create table if not exists public.planner_links (token text primary key, unb text, setor text, ativo text, criado_por text, criado_em text, desativado_em text);
create index if not exists planner_links_setor on public.planner_links(unb, setor);
create table if not exists public.planner_arquivos (nome text primary key, atualizado text, por text, bytes bigint default 0);
create table if not exists public.planner_log (id bigserial primary key, quando text, email text, acao text, detalhe text);
create table if not exists public.planner_notas (id text primary key, tipo text, unidade text, planner text, pdv text, setor text, texto text, status text,
  autor text, autor_nome text, criado text, atualizado text, excluida text, categoria text, regiao text);
create table if not exists public.planner_sns_vinculo (sns_email text primary key, gvs text, revenda text, atualizado text);
create table if not exists public.planner_pedidos_sns (id text primary key, v text, unb text, un text, code text, sns_email text, sns_nome text, item text,
  status text, gv_email text, gv_nome text, gv_obs text, gv_em text, criado text, atualizado text);
create index if not exists planner_pedidos_sns_v on public.planner_pedidos_sns(v, sns_email);

do $$ declare t text; begin
  for t in select tablename from pg_tables where schemaname = 'public' and tablename in ('planner_usuarios','planner_sessoes','planner_equipes','planner_links','planner_arquivos','planner_log','planner_notas','planner_sns_vinculo','planner_pedidos_sns') loop
    execute format('alter table public.%I enable row level security', t);
  end loop;
end $$;
grant all on public.planner_usuarios, public.planner_sessoes, public.planner_equipes, public.planner_links, public.planner_arquivos, public.planner_log, public.planner_notas, public.planner_sns_vinculo, public.planner_pedidos_sns to service_role;
grant all on sequence public.planner_log_id_seq to service_role;

-- arquivos (planners, rotina, relatórios, janelas): bucket privado
insert into storage.buckets (id, name, public) values ('planner-dados', 'planner-dados', false) on conflict (id) do nothing;

-- registro da crítica (solicitações dos GVs e parecer da Logística)
create table if not exists public.planner_criticas (id text primary key, v text not null, u text, code text, gv text, parecer text, dados jsonb);
create index if not exists planner_criticas_v on public.planner_criticas(v, gv);
alter table public.planner_criticas enable row level security;
alter table public.planner_arquivos add column if not exists file_id text;
grant all on public.planner_criticas to service_role;
alter table public.planner_sns_vinculo add column if not exists unidades text default '';
