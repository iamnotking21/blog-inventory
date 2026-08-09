-- Initial schema.
--
-- Ported from the legacy MySQL database `inventory_dorie_web`. Three structural
-- changes were made deliberately:
--
--  1. Branches are a real table with foreign keys. The legacy schema stored
--     `branch_name varchar(50)` on every row and joined on it, so a renamed or
--     mistyped branch silently orphaned its inventory.
--  2. The parallel `*_equipment` tables are gone. They duplicated their
--     non-equipment counterparts column for column; the distinction is now the
--     `product_type` column.
--  3. Free-text status columns became check constraints. The legacy columns held
--     whatever string the calling page happened to write.

create table if not exists branches (
  id          bigserial primary key,
  name        text        not null unique,
  is_main     boolean     not null default false,
  created_at  timestamptz not null default now()
);

create table if not exists users (
  id            bigserial   primary key,
  first_name    text        not null,
  last_name     text        not null,
  middle_name   text        not null default '',
  username      text        not null unique,
  -- bcrypt hash. The legacy `users.password varchar(50)` held plaintext.
  password_hash text        not null,
  branch_id     bigint      not null references branches (id) on delete restrict,
  role          text        not null check (role in ('super_admin', 'branch_user', 'worker')),
  status        text        not null default 'active' check (status in ('active', 'inactive')),
  created_at    timestamptz not null default now()
);

create index if not exists users_branch_id_idx on users (branch_id);
create index if not exists users_role_idx on users (role);

create table if not exists inventory_items (
  id                   bigserial     primary key,
  branch_id            bigint        not null references branches (id) on delete restrict,
  name                 text          not null,
  brand                text          not null default '',
  color                text          not null default '',
  supplier_name        text          not null default '',
  articles             text          not null default '',
  unit                 text          not null default 'pc',
  product_type         text          not null default 'general'
                         check (product_type in ('general', 'equipment')),
  quantity             numeric(12, 2) not null default 0 check (quantity >= 0),
  unit_price           numeric(12, 2) not null default 0 check (unit_price >= 0),
  selling_price        numeric(12, 2) not null default 0 check (selling_price >= 0),
  -- Legacy stored `amount` as a written column that pages recomputed inconsistently.
  amount               numeric(12, 2) generated always as (quantity * unit_price) stored,
  delivery_receipt_num text          not null default '',
  status               text          not null default 'active'
                         check (status in ('active', 'inactive')),
  created_at           timestamptz   not null default now()
);

create index if not exists inventory_items_branch_id_idx on inventory_items (branch_id);
create index if not exists inventory_items_status_idx on inventory_items (status);
create index if not exists inventory_items_created_at_idx on inventory_items (created_at desc);
create index if not exists inventory_items_name_idx on inventory_items (lower(name));

-- Stock arriving into a branch, awaiting confirmation by that branch.
create table if not exists pull_in_transactions (
  id                   bigserial     primary key,
  branch_id            bigint        not null references branches (id) on delete restrict,
  name                 text          not null default '',
  brand                text          not null default '',
  color                text          not null default '',
  supplier_name        text          not null default '',
  articles             text          not null default '',
  unit                 text          not null default 'pc',
  product_type         text          not null default 'general'
                         check (product_type in ('general', 'equipment')),
  quantity             numeric(12, 2) not null check (quantity > 0),
  unit_price           numeric(12, 2) not null default 0 check (unit_price >= 0),
  selling_price        numeric(12, 2) not null default 0 check (selling_price >= 0),
  amount               numeric(12, 2) generated always as (quantity * unit_price) stored,
  delivery_receipt_num text          not null default '',
  status               text          not null default 'pending'
                         check (status in ('pending', 'received', 'cancelled')),
  created_at           timestamptz   not null default now()
);

create index if not exists pull_in_branch_status_idx on pull_in_transactions (branch_id, status);
create index if not exists pull_in_created_at_idx on pull_in_transactions (created_at desc);

-- Stock leaving one branch, optionally destined for another.
create table if not exists pull_out_transactions (
  id                   bigserial     primary key,
  branch_id            bigint        not null references branches (id) on delete restrict,
  from_branch_id       bigint        references branches (id) on delete set null,
  inventory_item_id    bigint        references inventory_items (id) on delete set null,
  brand                text          not null default '',
  color                text          not null default '',
  unit                 text          not null default 'pc',
  product_type         text          not null default 'general'
                         check (product_type in ('general', 'equipment')),
  quantity             numeric(12, 2) not null check (quantity > 0),
  selling_price        numeric(12, 2) not null default 0 check (selling_price >= 0),
  amount               numeric(12, 2) generated always as (quantity * selling_price) stored,
  delivery_receipt_num text          not null default '',
  status               text          not null default 'pending'
                         check (status in ('pending', 'released', 'cancelled')),
  created_at           timestamptz   not null default now()
);

create index if not exists pull_out_branch_status_idx on pull_out_transactions (branch_id, status);
create index if not exists pull_out_created_at_idx on pull_out_transactions (created_at desc);

-- Audit trail of branch-to-branch movements.
create table if not exists transactions (
  id             bigserial   primary key,
  branch_id      bigint      not null references branches (id) on delete restrict,
  from_branch_id bigint      references branches (id) on delete set null,
  description    text        not null,
  status         text        not null default 'pending'
                   check (status in ('pending', 'completed', 'cancelled')),
  created_at     timestamptz not null default now()
);

create index if not exists transactions_branch_id_idx on transactions (branch_id);
create index if not exists transactions_created_at_idx on transactions (created_at desc);

create table if not exists posts (
  id          bigserial   primary key,
  title       text        not null,
  description text        not null,
  author_id   bigint      references users (id) on delete set null,
  status      text        not null default 'active'
                check (status in ('active', 'inactive')),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists posts_status_created_at_idx on posts (status, created_at desc);
