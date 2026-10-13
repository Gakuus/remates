-- ══════════════════════════════════════════════════════════════════════════
-- Seed — catálogos iniciales (docs/PLAN.md §11)
-- Idempotente: se puede ejecutar más de una vez.
-- ══════════════════════════════════════════════════════════════════════════

insert into property_types (code, name) values
  ('agricola', 'Agrícola'),
  ('ganadero', 'Ganadero'),
  ('mixto',    'Mixto')
on conflict (code) do update set name = excluded.name;

insert into property_statuses (code, name) values
  ('borrador',  'Borrador'),
  ('publicado', 'Publicado'),
  ('retirado',  'Retirado'),
  ('vendido',   'Vendido')
on conflict (code) do update set name = excluded.name;
