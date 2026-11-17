-- Testimonials shown on the home page before 2026-11-16 (placeholder texts).
-- Restore: run this file (it replaces the current testimonials).
DELETE FROM testimonials;
INSERT INTO testimonials (author_role, author_role_es, company_type, rating, quote, quote_es, sort_order, is_active) VALUES
  ('CFO - Reinsurance Company', 'CFO - Compañía reaseguradora', 'Reinsurance', 4.9, 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Aenean interdum mi sit amet commodo congue.', NULL, 1, 1),
  ('CFO - Reinsurance Company', 'CFO - Compañía reaseguradora', 'Reinsurance', 4.9, 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Aenean interdum mi sit amet commodo congue.', NULL, 2, 1),
  ('CFO - Reinsurance Company', 'CFO - Compañía reaseguradora', 'Reinsurance', 4.9, 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Aenean interdum mi sit amet commodo congue.', NULL, 3, 1),
  ('CEO - Captive Insurance Company', 'CEO - Aseguradora cautiva', 'Captive', 5, 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Aenean interdum mi sit amet commodo congue.', NULL, 4, 1),
  ('CFO - MGA', 'CFO - MGA', 'MGA', 4.9, 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Aenean interdum mi sit amet commodo congue.', NULL, 5, 1),
  ('Risk Manager - Self-insured Organization', 'Gerente de Riesgos - Organización autoasegurada', 'Self-insured', 4.8, 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Aenean interdum mi sit amet commodo congue.', NULL, 6, 1);
