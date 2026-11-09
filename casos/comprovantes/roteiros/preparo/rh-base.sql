-- Estado "rh-base": o estado inicial com dois textos da carga de teste trocados por textos de exemplo, para que não
-- apareçam nos prints e vídeos do Manual do RH ("HIPÓTESE DE TESTE (DEC-02) ... massa fictícia" no ato do teto da
-- educação e "Suspensão registrada na massa fictícia" no histórico dos auxílios). Só muda texto; nenhum valor.
-- Correção definitiva: trocar esses textos na carga de teste do sistema (prisma/seed) e apagar este arquivo.
-- Aplicar (KIT_AMBIENTE=manual2):
--   node motor/estado.ts restaurar comprovantes
--   docker exec -i manual2-db-1 psql -q -U comprovantes -d comprovantes < casos/comprovantes/roteiros/preparo/rh-base.sql
--   node motor/estado.ts salvar comprovantes rh-base
-- A versão publicada do teto é imutável (gatilho IG-03): só nesta cópia de exemplo, os gatilhos ficam desligados.
set session_replication_role = replica;
update tabela_teto set ato = 'Ato de exemplo nº 1/2026 (valor por dependente)'
  where auxilio = 'EDUCACAO' and ato like 'HIPÓTESE DE TESTE%';
update situacao_auxilio set "descricaoMotivo" = 'Suspensão do auxílio (exemplo)'
  where "descricaoMotivo" = 'Suspensão registrada na massa fictícia';
set session_replication_role = default;
