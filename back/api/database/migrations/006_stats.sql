-- 2026-11-19: home stats reduced to two (client review): 75+ years of combined experience, 180+ invoices completed.
DELETE FROM stats;
INSERT INTO stats (label, label_es, value, suffix, sort_order) VALUES
  ('Years of combined experience', 'Años de experiencia combinada', 75, '+', 1),
  ('Invoices completed', 'Facturas completadas', 180, '+', 2);
