-- Initial content (English + Spanish) taken from the Actuarial Factor presentation and Home design.
-- Safe to re-run: uses INSERT IGNORE on unique keys / truncates simple lists.
-- *_es columns are optional: when empty the API falls back to English.

DELETE FROM stats;
INSERT INTO stats (label, label_es, value, suffix, sort_order) VALUES
  ('Years of combined experience', 'Años de experiencia combinada', 75, '+', 1),
  ('Invoices completed', 'Facturas completadas', 180, '+', 2);

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
  SELECT 'Esperanza Mead', 'CEO and Founder', 'CEO y Fundadora', 'Esperanza (‘Espy’) Mead is CEO and Founder of Actuarial Factor LLC, founded in 2014. She is responsible for the overall leadership of the firm’s consulting actuaries. Her key areas of expertise are reserving, pricing, product development, profitability analysis, captive feasibility studies, expert testimony, peer reviews, and mergers and acquisitions for all lines of business and in all jurisdictions in the United States, Latin America, and the Caribbean.

Espy started her professional career as an actuary at Assurant, Inc. in 1995. She then worked as Vice President, Chief Actuary of Latin America in Chubb (formerly ACE Group). She developed her extensive experience in property and casualty, personal and business, accident and health, and life insurance in the United States and Latin America. In addition, she has experience with niche consumer products, such as wireless, personal property, vehicle service contracts, extended service contracts, dwelling, identity theft, mobile home, and antique auto. Espy works in Actuarial Factor’s home office located in Coral Gables, Florida.

Espy graduated from Florida International University with a Bachelor of Science in Mathematics and a Certificate in Actuarial Science in 1995. She is a Fellow of the Casualty Actuarial Society (2010), a Fellow of the Society of Actuaries (2014), a Member of the American Academy of Actuaries (2003), and a Distinguished Toastmaster (2017).

In her spare time, Espy volunteers for the Casualty Actuarial Society - Nominating Committee (2024 to present) and the Casualty Actuarial Society - Latin America Committee (2024 to present). She loves reading and running.', 'Esperanza (“Espy”) Mead es CEO y fundadora de Actuarial Factor LLC, fundada en 2014. Es responsable del liderazgo general de los actuarios consultores de la firma. Sus principales áreas de especialidad son reservas, tarificación, desarrollo de productos, análisis de rentabilidad, estudios de factibilidad de cautivas, testimonio pericial, revisiones de pares y fusiones y adquisiciones, en todas las líneas de negocio y en todas las jurisdicciones de Estados Unidos, América Latina y el Caribe.

Espy inició su carrera profesional como actuaria en Assurant, Inc. en 1995. Después se desempeñó como Vicepresidenta y Actuaria en Jefe para América Latina en Chubb (antes ACE Group). Desarrolló su amplia experiencia en seguros de daños, personales y empresariales, accidentes y salud, y vida en Estados Unidos y América Latina. Además, tiene experiencia en productos de consumo de nicho, como telefonía celular, bienes personales, contratos de servicio vehicular, contratos de garantía extendida, vivienda, robo de identidad, casas móviles y autos antiguos. Espy trabaja en la oficina principal de Actuarial Factor en Coral Gables, Florida.

Espy se graduó de Florida International University con una licenciatura en Matemáticas y un certificado en Ciencias Actuariales en 1995. Es Fellow de la Casualty Actuarial Society (2010), Fellow de la Society of Actuaries (2014), miembro de la American Academy of Actuaries (2003) y Distinguished Toastmaster (2017).

En su tiempo libre, Espy colabora como voluntaria en el Nominating Committee de la Casualty Actuarial Society (desde 2024) y en el Latin America Committee de la Casualty Actuarial Society (desde 2024). Le encanta leer y correr.', 'img/team-esperanza.jpg', 1 FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM team_members WHERE name = 'Esperanza Mead');
INSERT INTO team_members (name, role, role_es, bio, bio_es, photo_url, sort_order)
  SELECT 'Karla Sosa', 'Manager Consulting Actuary', 'Actuaria Consultora Gerente', 'Karla Sosa is a Manager Consulting Actuary at Actuarial Factor LLC with more than 15 years of experience in the insurance industry. She assists in the leadership and management of the firm’s consulting actuaries across its Miami and Mexico offices, overseeing engagements involving loss reserving and statements of actuarial opinion (SAOs), pricing, captive feasibility studies, product development, profitability analyses, expert testimony, peer reviews, and mergers and acquisitions. Her consulting experience spans all major lines of business across the United States, Latin America, and the Caribbean.

Prior to joining Actuarial Factor in 2022, Karla held actuarial roles with Chubb (formerly ACE Group), Assurant Solutions, and Seguros Monterrey (a New York Life company), where she specialized in reserving and pricing analyses for the Latin American market. She has broad expertise across commercial and personal property and casualty insurance (P&C), accident and health insurance (A&H), and life insurance. In addition, she has extensive experience with warranty and service contract products, including wireless device protection, vehicle service contracts, and extended service contracts. Karla works in Actuarial Factor’s home office located in Coral Gables, Florida.

Karla earned a Bachelor of Science in Actuarial Science from the Instituto Tecnológico Autónomo de México (ITAM) in 2011. She became an Associate of the Casualty Actuarial Society and a Member of the American Academy of Actuaries in 2019. She is currently pursuing Fellowship in the Casualty Actuarial Society.

In her spare time, Karla enjoys spending quality time with her family and friends, reading, playing board games, and traveling abroad.', 'Karla Sosa es Actuaria Consultora Gerente en Actuarial Factor LLC, con más de 15 años de experiencia en la industria de seguros. Colabora en el liderazgo y la gestión de los actuarios consultores de la firma en las oficinas de Miami y México, y supervisa proyectos de reservas y dictámenes actuariales (SAOs), tarificación, estudios de factibilidad de cautivas, desarrollo de productos, análisis de rentabilidad, testimonio pericial, revisiones de pares y fusiones y adquisiciones. Su experiencia como consultora abarca las principales líneas de negocio en Estados Unidos, América Latina y el Caribe.

Antes de unirse a Actuarial Factor en 2022, Karla ocupó puestos actuariales en Chubb (antes ACE Group), Assurant Solutions y Seguros Monterrey (una compañía de New York Life), donde se especializó en análisis de reservas y tarificación para el mercado latinoamericano. Cuenta con amplia experiencia en seguros de daños comerciales y personales (P&C), accidentes y salud (A&H) y vida. Además, tiene amplia experiencia en productos de garantía y contratos de servicio, como protección de dispositivos móviles, contratos de servicio vehicular y contratos de garantía extendida. Karla trabaja en la oficina principal de Actuarial Factor en Coral Gables, Florida.

Karla obtuvo la licenciatura en Actuaría por el Instituto Tecnológico Autónomo de México (ITAM) en 2011. En 2019 se convirtió en Associate de la Casualty Actuarial Society y miembro de la American Academy of Actuaries. Actualmente cursa el Fellowship de la Casualty Actuarial Society.

En su tiempo libre, Karla disfruta pasar tiempo con su familia y amigos, leer, jugar juegos de mesa y viajar al extranjero.', 'img/team-karla.jpg', 2 FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM team_members WHERE name = 'Karla Sosa');
INSERT INTO team_members (name, role, role_es, bio, bio_es, photo_url, sort_order)
  SELECT 'Barbara Di Vico', 'Office Manager', 'Gerente de Oficina', 'Barbara Di Vico is the Office Manager at Actuarial Factor LLC with more than 20 years of financial experience in the insurance industry. She supports the leadership and operational management of Actuarial Factor’s Miami and Mexico offices, overseeing financial administration, human resources, budgeting, forecasting, contract management, and day-to-day business operations. Her experience spans the United States and Latin America, where she has successfully managed financial processes, administrative functions, human resources administration and operations for transformation and integration initiatives.

Prior to joining Actuarial Factor, LLC in 2025 as Office Manager, Barbara spent more than two decades with Chubb Latin America (formerly ACE Group), holding positions of increasing responsibility in both Mexico and Miami. During her tenure, she managed and supported regional financial reporting, planning, forecasting, accounting, and expense management activities across multiple Latin American countries. She played a key role in financial close processes, budgeting, strategic planning, business integrations, and major implementation projects, while serving as a liaison between regional operations and corporate headquarters. Barbara works in Actuarial Factor’s home office located in Coral Gables, Florida.

Barbara earned a degree in Accounting and has developed extensive expertise through her diverse career in finance, administration, and human resources within a global organization.

In her spare time, Barbara enjoys spending quality time with her family and friends, traveling to different destinations, and enjoying a good cup of coffee.', 'Barbara Di Vico es Gerente de Oficina en Actuarial Factor LLC, con más de 20 años de experiencia financiera en la industria de seguros. Apoya el liderazgo y la gestión operativa de las oficinas de Actuarial Factor en Miami y México, y supervisa la administración financiera, los recursos humanos, los presupuestos, las proyecciones, la gestión de contratos y la operación diaria del negocio. Su experiencia abarca Estados Unidos y América Latina, donde ha gestionado con éxito procesos financieros, funciones administrativas, la administración de recursos humanos y operaciones en iniciativas de transformación e integración.

Antes de unirse a Actuarial Factor, LLC en 2025 como Gerente de Oficina, Barbara trabajó más de dos décadas en Chubb Latin America (antes ACE Group), en puestos de creciente responsabilidad en México y Miami. Durante ese tiempo, gestionó y apoyó actividades regionales de reportes financieros, planeación, proyecciones, contabilidad y control de gastos en varios países de América Latina. Tuvo un papel clave en procesos de cierre financiero, presupuestos, planeación estratégica, integraciones de negocio y grandes proyectos de implementación, y fue enlace entre las operaciones regionales y el corporativo. Barbara trabaja en la oficina principal de Actuarial Factor en Coral Gables, Florida.

Barbara es licenciada en Contaduría y ha desarrollado una amplia experiencia a lo largo de una carrera diversa en finanzas, administración y recursos humanos dentro de una organización global.

En su tiempo libre, Barbara disfruta pasar tiempo con su familia y amigos, viajar a distintos destinos y disfrutar una buena taza de café.', 'img/team-barbara.jpg', 3 FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM team_members WHERE name = 'Barbara Di Vico');
INSERT INTO team_members (name, role, role_es, bio, bio_es, photo_url, sort_order)
  SELECT 'Perla Galindo', 'Actuarial Supervisor', 'Supervisora Actuarial', 'Perla Galindo is an Actuarial Supervisor at Actuarial Factor’s office in Mexico. She provides actuarial consulting services across the United States, Latin America, and the Caribbean, with a focus on pricing, loss reserving, captive feasibility studies, and actuarial reports. Her experience spans multiple lines of business across property and casualty (P&C), life, and accident and health insurance.

Prior to joining Actuarial Factor, Perla began her actuarial career at Seguros Banorte in 2018, where she served as Head of Reserves. In this role, she was responsible for actuarial reserve valuations, performing experience and performance analyses, including reserve backtesting, and coordinating the preparation and filing of regulatory reports in accordance with Mexican insurance requirements. Her work encompassed various short-term and long-term life and health insurance portfolios. She also served as Project Coordinator, overseeing several projects, coordinating teams, and managing projects through completion.

Perla earned a Bachelor of Science in Actuarial Science from Universidad La Salle (Mexico City) in 2020, with a minor in Project Management. Her actuarial credentials include Society of Actuaries (SOA) examinations P, FM, SRM, FAM, and ALTAM, and she is currently pursuing the Associate of the Society of Actuaries (ASA) designation.

In her spare time, Perla enjoys reading and learning about new topics, Pilates, and adventurous activities.', 'Perla Galindo es Supervisora Actuarial en la oficina de Actuarial Factor en México. Brinda servicios de consultoría actuarial en Estados Unidos, América Latina y el Caribe, con enfoque en tarificación, reservas, estudios de factibilidad de cautivas y reportes actuariales. Su experiencia abarca diversas líneas de negocio en seguros de daños (P&C), vida, y accidentes y salud.

Antes de unirse a Actuarial Factor, Perla inició su carrera actuarial en Seguros Banorte en 2018, donde fue Jefa de Reservas. En ese puesto fue responsable de la valuación de reservas actuariales, de realizar análisis de experiencia y desempeño, incluido el backtesting de reservas, y de coordinar la elaboración y entrega de reportes regulatorios conforme a la normativa de seguros en México. Su trabajo abarcó diversas carteras de seguros de vida y salud de corto y largo plazo. También fue Coordinadora de Proyectos: supervisó varios proyectos, coordinó equipos y los llevó hasta su conclusión.

Perla obtuvo la licenciatura en Actuaría por la Universidad La Salle (Ciudad de México) en 2020, con especialidad en Administración de Proyectos. Ha aprobado los exámenes P, FM, SRM, FAM y ALTAM de la Society of Actuaries (SOA) y actualmente cursa la designación de Associate of the Society of Actuaries (ASA).

En su tiempo libre, Perla disfruta leer y aprender sobre temas nuevos, practicar Pilates y realizar actividades de aventura.', 'img/team-perla.jpg', 4 FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM team_members WHERE name = 'Perla Galindo');
INSERT INTO team_members (name, role, role_es, bio, bio_es, photo_url, sort_order)
  SELECT 'Diego Cortés', 'Senior Actuarial Consultant', 'Consultor Actuarial Sénior', 'Diego is a Senior Actuarial Consultant at Actuarial Factor. His main responsibilities include pricing, reserving and actuarial reports for all lines of business and in all jurisdictions in the United States, Latin America, and the Caribbean.

Prior to joining Actuarial Factor, Diego started his career as a Data Analyst at the consulting firm akya. His main tasks were processing and analyzing databases to provide insights into the client’s credit portfolio profitability. He then worked as a Reinsurance Broker for the firm THB México, where his main task was the placement of reinsurance accounts on national and international markets, with a focus on casualty, financial lines, construction and engineering risks.

Diego earned a Bachelor of Science in Actuarial Science from Instituto Tecnológico Autónomo de México (ITAM) in 2024. His actuarial credentials include Society of Actuaries (SOA) examinations P and FM, and he is currently pursuing the Associate of the Society of Actuaries (ASA) designation.

In his spare time, he enjoys playing the guitar, reading and traveling.', 'Diego es Consultor Actuarial Sénior en Actuarial Factor. Sus principales responsabilidades incluyen tarificación, reservas y reportes actuariales para todas las líneas de negocio y en todas las jurisdicciones de Estados Unidos, América Latina y el Caribe.

Antes de unirse a Actuarial Factor, Diego inició su carrera como Analista de Datos en la consultora akya, donde procesaba y analizaba bases de datos para generar información sobre la rentabilidad de la cartera de crédito de los clientes. Después trabajó como Corredor de Reaseguro en THB México, donde su principal tarea era la colocación de cuentas de reaseguro en mercados nacionales e internacionales, con enfoque en responsabilidad civil, líneas financieras y riesgos de construcción e ingeniería.

Diego obtuvo la licenciatura en Actuaría por el Instituto Tecnológico Autónomo de México (ITAM) en 2024. Ha aprobado los exámenes P y FM de la Society of Actuaries (SOA) y actualmente cursa la designación de Associate of the Society of Actuaries (ASA).

En su tiempo libre, disfruta tocar la guitarra, leer y viajar.', 'img/team-diego.jpg', 5 FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM team_members WHERE name = 'Diego Cortés');

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
