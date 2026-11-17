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
  ('Chief Financial Officer, Reinsurer', 'Director de Finanzas, Reaseguradora', 'Reinsurance', NULL, '“Actuarial Factor delivers excellent service with professionalism, commitment, prompt responses, and respect for its clients.”', '“Actuarial Factor ofrece un servicio excelente, con profesionalismo, compromiso, respuestas oportunas y respeto por sus clientes.”', 1),
  ('President, Captive Management Firm', 'Presidente, Empresa administradora de cautivas', 'Captive', NULL, '“Actuarial Factor has been a reliable and responsive partner for our clients. Their work is consistently thorough, clear, and delivered on time.”', '“Actuarial Factor ha sido un socio confiable y atento para nuestros clientes. Su trabajo es siempre minucioso, claro y entregado a tiempo.”', 2),
  ('Vice President, Captive Management Firm', 'Vicepresidente, Empresa administradora de cautivas', 'Captive', NULL, '“Actuarial Factor has been an outstanding partner for the last 10 years. Their team brings expertise and professionalism to every engagement, handles complex matters with clarity and care, and consistently delivers to the highest standards of quality.”', '“Actuarial Factor ha sido un socio excepcional durante los últimos 10 años. Su equipo aporta experiencia y profesionalismo a cada proyecto, maneja asuntos complejos con claridad y cuidado, y entrega siempre con los más altos estándares de calidad.”', 3),
  ('Reserves Supervisor, Captive Management Firm', 'Supervisor de Reservas, Empresa administradora de cautivas', 'Captive', NULL, '“Actuarial Factor’s team is always responsive, and their work is well-supported, which makes the reserving process for our captives much smoother.”', '“El equipo de Actuarial Factor siempre responde con rapidez y su trabajo está bien fundamentado, lo que hace mucho más fluido el proceso de reservas de nuestras cautivas.”', 4),
  ('Corporate Counsel, Insurance Company', 'Abogado Corporativo, Compañía de seguros', 'Insurance', NULL, '“As a commercial property insurer, we rely on accurate and well-reasoned actuarial work to assess and manage our risk exposure. Actuarial Factor brings deep technical knowledge of this market and an understanding of the factors that matter most to our line of business. What truly sets them apart is how easy they are to work with. Actuarial analysis rarely gets finalized in a single pass; it usually involves revisiting and refining data, and going back and forth as new information comes in. They make this process seamless. They respond quickly, explain their reasoning clearly, and adjust their work without friction. We value them not just as a service provider but as a partner we can trust, and we would recommend them to any insurer looking for expertise paired with outstanding communication.”', '“Como aseguradora de propiedad comercial, dependemos de un trabajo actuarial preciso y bien razonado para evaluar y gestionar nuestra exposición al riesgo. Actuarial Factor aporta un profundo conocimiento técnico de este mercado y entiende los factores más importantes para nuestra línea de negocio. Lo que realmente los distingue es lo fácil que es trabajar con ellos. Un análisis actuarial rara vez se concluye en una sola revisión; normalmente implica revisar y depurar datos, e ir y venir conforme llega nueva información. Ellos hacen que este proceso sea fluido: responden rápido, explican su razonamiento con claridad y ajustan su trabajo sin fricciones. Los valoramos no solo como proveedor de servicios, sino como un socio de confianza, y los recomendaríamos a cualquier aseguradora que busque experiencia técnica acompañada de una comunicación excepcional.”', 5),
  ('Financial Controller, Reinsurer', 'Contralor Financiero, Reaseguradora', 'Reinsurance', NULL, '“Reliable, knowledgeable, and responsive. Actuarial Factor has been instrumental in supporting our reserving process and actuarial needs.”', '“Confiables, expertos y atentos. Actuarial Factor ha sido clave para apoyar nuestro proceso de reservas y nuestras necesidades actuariales.”', 6);

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
