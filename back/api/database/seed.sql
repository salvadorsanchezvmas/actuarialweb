-- Initial content (English + Spanish) taken from the Actuarial Factor presentation and Home design.
-- Safe to re-run: uses INSERT IGNORE on unique keys / truncates simple lists.
-- *_es columns are optional: when empty the API falls back to English.

DELETE FROM stats;
INSERT INTO stats (label, label_es, value, suffix, sort_order) VALUES
  ('Years of combined experience', 'Años de experiencia combinada', 55, '+', 1),
  ('Organizations advised', 'Organizaciones asesoradas', 60, '+', 2),
  ('Projects completed', 'Proyectos realizados', 180, '+', 3),
  ('Client satisfaction', 'Satisfacción de clientes', 98, '%', 4);

DELETE FROM testimonials;
INSERT INTO testimonials (author_role, author_role_es, company_type, rating, quote, quote_es, sort_order) VALUES
  ('CFO - Reinsurance Company', 'CFO - Compañía reaseguradora', 'Reinsurance', 4.9, 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Aenean interdum mi sit amet commodo congue.', NULL, 1),
  ('CFO - Reinsurance Company', 'CFO - Compañía reaseguradora', 'Reinsurance', 4.9, 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Aenean interdum mi sit amet commodo congue.', NULL, 2),
  ('CFO - Reinsurance Company', 'CFO - Compañía reaseguradora', 'Reinsurance', 4.9, 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Aenean interdum mi sit amet commodo congue.', NULL, 3),
  ('CEO - Captive Insurance Company', 'CEO - Aseguradora cautiva', 'Captive', 5.0, 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Aenean interdum mi sit amet commodo congue.', NULL, 4),
  ('CFO - MGA', 'CFO - MGA', 'MGA', 4.9, 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Aenean interdum mi sit amet commodo congue.', NULL, 5),
  ('Risk Manager - Self-insured Organization', 'Gerente de Riesgos - Organización autoasegurada', 'Self-insured', 4.8, 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Aenean interdum mi sit amet commodo congue.', NULL, 6);

INSERT IGNORE INTO services (slug, title, title_es, tag, tag_es, summary, summary_es, icon, sort_order) VALUES
  ('pricing', 'Pricing services', 'Servicios de tarificación', '(Re)insurance companies', '(Re)aseguradoras',
   'Premiums estimation, product development and determination of rates, including catastrophe modeling.',
   'Estimación de primas, desarrollo de productos y determinación de tarifas, incluida la modelación catastrófica.', 'pricing', 1),
  ('reserving', 'Reserving services', 'Servicios de reservas', '(Re)insurance companies', '(Re)aseguradoras',
   'Loss reserve analysis, actuarial opinions, regulatory reports and Appointed Actuary services.',
   'Análisis de reservas, opiniones actuariales, reportes regulatorios y servicios de Actuario Designado.', 'reserve', 2),
  ('captive', 'Captive insurance services', 'Servicios para aseguradoras cautivas', 'Captives & self-insured', 'Cautivas y autoasegurados',
   'Feasibility studies, pricing and reserving for captive insurance companies and self-insured entities.',
   'Estudios de factibilidad, tarificación y reservas para aseguradoras cautivas y entidades autoaseguradas.', 'shield', 3),
  ('mergers', 'Mergers and acquisitions', 'Fusiones y adquisiciones', 'Strategy', 'Estrategia',
   'Actuarial due diligence plus definition and refinement of growth strategies.',
   'Due diligence actuarial, además de la definición y el refinamiento de estrategias de crecimiento.', 'merge', 4);

DELETE FROM offices;
INSERT INTO offices (country, country_es, city, city_es, address_line, postal_code, phone, email, sort_order) VALUES
  ('United States', 'Estados Unidos', 'Coral Gables, FL', 'Coral Gables, FL', '1 Alhambra Plaza, Floor PH', '33134', '+1 800-957-9196', 'info@actuarialfactor.com', 1),
  ('Mexico', 'México', 'Mexico City', 'Ciudad de México', 'Av. Pte. Masaryk 111, Polanco', '11560', '+52 55-2155-2059', 'info@actuarialfactor.com', 2);

INSERT INTO team_members (name, role, role_es, bio, bio_es, photo_url, sort_order)
SELECT 'Espy Mead', 'Founder and CEO', 'Fundadora y CEO',
       'More than 30 years of actuarial experience in all lines of business (P&C, Health and Life). Former Chief Actuary at Chubb Latin America. FCAS, FSA, MAAA.',
       'Más de 30 años de experiencia actuarial en todas las líneas de negocio (Daños, Salud y Vida). Ex Actuaria en Jefe de Chubb Latinoamérica. FCAS, FSA, MAAA.',
       'img/team-espy-mead.jpg', 1
WHERE NOT EXISTS (SELECT 1 FROM team_members WHERE name = 'Espy Mead');

INSERT IGNORE INTO post_categories (slug, name, name_es, sort_order) VALUES
  ('news', 'News', 'Noticias', 1),
  ('regulatory', 'Regulatory updates', 'Actualizaciones regulatorias', 2),
  ('insights', 'Insights', 'Publicaciones', 3);

INSERT IGNORE INTO posts (slug, title, title_es, excerpt, excerpt_es, content_html, content_html_es, cover_image, category_id, status, published_at)
SELECT 'actuarial-factor-10th-anniversary',
       'Actuarial Factor celebrates its 10th anniversary',
       'Actuarial Factor celebra su 10.º aniversario',
       'A decade delivering independent actuarial solutions across the United States, Latin America and the Caribbean.',
       'Una década ofreciendo soluciones actuariales independientes en Estados Unidos, América Latina y el Caribe.',
       '<p>Founded in 2014, Actuarial Factor has grown into a trusted actuarial partner for insurers, reinsurers, captives and self-insured organizations.</p>',
       '<p>Fundada en 2014, Actuarial Factor se ha consolidado como un socio actuarial de confianza para aseguradoras, reaseguradoras, cautivas y organizaciones autoaseguradas.</p>',
       'img/about-building.jpg', id, 'published', UTC_TIMESTAMP()
FROM post_categories WHERE slug = 'news';
