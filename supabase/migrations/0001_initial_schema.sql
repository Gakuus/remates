-- ══════════════════════════════════════════════════════════════════════════
-- 0001 — Esquema inicial (docs/PLAN.md §11 y §12)
-- Campos y terrenos rurales a la venta — Uruguay
-- ══════════════════════════════════════════════════════════════════════════

create extension if not exists pg_trgm;

-- ── Catálogos ───────────────────────────────────────────────────────────────

create table if not exists property_types (
  id    smallint generated always as identity primary key,
  code  text not null unique,
  name  text not null
);

create table if not exists property_statuses (
  id    smallint generated always as identity primary key,
  code  text not null unique,
  name  text not null
);

-- ── Propiedades ─────────────────────────────────────────────────────────────

create table if not exists properties (
  id              uuid primary key default gen_random_uuid(),
  slug            text not null unique,
  name            text not null,
  status_id       smallint not null references property_statuses (id),
  type_id         smallint not null references property_types (id),

  -- Precio (USD; null = "a consultar")
  price           numeric(14, 2),
  currency        text not null default 'USD',

  -- Superficie
  hectares        numeric(10, 2) not null check (hectares > 0),

  -- Ubicación (embebida: 1:1, sin join innecesario — PLAN §11)
  department      text not null,
  locality        text,
  latitude        numeric(9, 6) check (latitude between -90 and 90),
  longitude       numeric(9, 6) check (longitude between -180 and 180),
  access_notes    text,

  description     text,

  -- Eje de promoción independiente del ciclo de vida
  is_featured     boolean not null default false,

  -- Denormalizado para tarjetas del catálogo (sin join en el listado)
  main_image_path text,
  main_image_url  text,

  inquiry_count   integer not null default 0,

  published_at    timestamptz,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),

  constraint price_positive check (price is null or price >= 0)
);

-- ── Características (EAV acotado) ───────────────────────────────────────────

create table if not exists property_features (
  property_id  uuid not null references properties (id) on delete cascade,
  feature_code text not null,
  value        text not null,
  primary key (property_id, feature_code)
);

-- ── Fotografías ─────────────────────────────────────────────────────────────

create table if not exists property_images (
  id           uuid primary key default gen_random_uuid(),
  property_id  uuid not null references properties (id) on delete cascade,
  storage_path text not null,
  url          text not null,
  alt_text     text not null default '',
  sort_order   smallint not null default 0,
  is_main      boolean not null default false,
  created_at   timestamptz not null default now(),
  unique (property_id, storage_path)
);

-- ── Consultas de contacto ───────────────────────────────────────────────────

create table if not exists inquiries (
  id          uuid primary key default gen_random_uuid(),
  property_id uuid references properties (id) on delete set null,
  name        text not null check (char_length(name) between 1 and 120),
  phone       text check (phone is null or char_length(phone) <= 40),
  email       text not null check (char_length(email) <= 254),
  message     text not null check (char_length(message) between 10 and 2000),
  status      text not null default 'nuevo' check (status in ('nuevo', 'respondido', 'archivado')),
  source      text not null default 'web' check (source in ('web', 'whatsapp')),
  created_at  timestamptz not null default now()
);

-- ══════════════════════════════════════════════════════════════════════════
-- Índices (PLAN §11 — pensados para los filtros del catálogo)
-- ══════════════════════════════════════════════════════════════════════════

create index if not exists idx_properties_status_published
  on properties (status_id, published_at desc);

create index if not exists idx_properties_dept_type
  on properties (department, type_id);

create index if not exists idx_properties_price
  on properties (price);

create index if not exists idx_properties_hectares
  on properties (hectares);

create index if not exists idx_properties_featured
  on properties (is_featured, published_at desc)
  where is_featured;

create index if not exists idx_properties_name_trgm
  on properties using gin (name gin_trgm_ops);

create index if not exists idx_properties_slug
  on properties (slug);

create index if not exists idx_property_features_code
  on property_features (feature_code, property_id);

create index if not exists idx_property_images_property
  on property_images (property_id, sort_order);

-- Una sola foto principal por propiedad
create unique index if not exists uq_property_images_main
  on property_images (property_id)
  where is_main;

create index if not exists idx_inquiries_property
  on inquiries (property_id);

create index if not exists idx_inquiries_created
  on inquiries (created_at desc);

create index if not exists idx_inquiries_status
  on inquiries (status);

-- ══════════════════════════════════════════════════════════════════════════
-- updated_at automático
-- ══════════════════════════════════════════════════════════════════════════

create or replace function set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_properties_updated_at on properties;
create trigger trg_properties_updated_at
  before update on properties
  for each row execute function set_updated_at();

-- ══════════════════════════════════════════════════════════════════════════
-- RLS (PLAN §12): público lee publicados; admin gestiona todo.
-- Las escrituras del público (inquiries) ocurren desde el servidor con
-- service role; la policy de insert existe como defensa en profundidad.
-- ══════════════════════════════════════════════════════════════════════════

alter table property_types     enable row level security;
alter table property_statuses  enable row level security;
alter table properties         enable row level security;
alter table property_features  enable row level security;
alter table property_images    enable row level security;
alter table inquiries          enable row level security;

-- Admin: todo. Se define por JWT role claim cuando exista Auth (post-MVP).
create or replace function is_admin()
returns boolean
language sql
stable
as $$
  select coalesce(auth.jwt() ->> 'role', '') = 'admin';
$$;

-- Catálogos: lectura pública.
drop policy if exists public_read_property_types on property_types;
create policy public_read_property_types on property_types
  for select using (true);

drop policy if exists public_read_property_statuses on property_statuses;
create policy public_read_property_statuses on property_statuses
  for select using (true);

drop policy if exists admin_all_property_types on property_types;
create policy admin_all_property_types on property_types
  for all using (is_admin()) with check (is_admin());

drop policy if exists admin_all_property_statuses on property_statuses;
create policy admin_all_property_statuses on property_statuses
  for all using (is_admin()) with check (is_admin());

-- Propiedades: público solo publicados; admin todo.
drop policy if exists public_read_published_properties on properties;
create policy public_read_published_properties on properties
  for select using (
    status_id = (select id from property_statuses where code = 'publicado')
    or is_admin()
  );

drop policy if exists admin_write_properties on properties;
create policy admin_write_properties on properties
  for all using (is_admin()) with check (is_admin());

-- Características: visibles si la propiedad es visible.
drop policy if exists public_read_visible_features on property_features;
create policy public_read_visible_features on property_features
  for select using (
    exists (
      select 1 from properties p
      where p.id = property_features.property_id
        and (
          p.status_id = (select id from property_statuses where code = 'publicado')
          or is_admin()
        )
    )
  );

drop policy if exists admin_write_features on property_features;
create policy admin_write_features on property_features
  for all using (is_admin()) with check (is_admin());

-- Fotografías: visibles si la propiedad es visible.
drop policy if exists public_read_visible_images on property_images;
create policy public_read_visible_images on property_images
  for select using (
    exists (
      select 1 from properties p
      where p.id = property_images.property_id
        and (
          p.status_id = (select id from property_statuses where code = 'publicado')
          or is_admin()
        )
    )
  );

drop policy if exists admin_write_images on property_images;
create policy admin_write_images on property_images
  for all using (is_admin()) with check (is_admin());

-- Consultas: solo admin lee; insert permitido a anónimos (defensa en
-- profundidad — la escritura real va por servidor con service role).
drop policy if exists admin_read_inquiries on inquiries;
create policy admin_read_inquiries on inquiries
  for select using (is_admin());

drop policy if exists public_insert_inquiries on inquiries;
create policy public_insert_inquiries on inquiries
  for insert with check (true);

drop policy if exists admin_write_inquiries on inquiries;
create policy admin_write_inquiries on inquiries
  for update using (is_admin()) with check (is_admin());
