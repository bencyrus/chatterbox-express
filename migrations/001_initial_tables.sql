-- migration: 001_initial_tables.sql
-- description: create initial tables for chatterbox application

-- prompts table
create table if not exists prompts (
  promptid serial primary key,
  type text not null check(type in ('main', 'followup')),
  created_at timestamp default current_timestamp,
  updated_at timestamp default current_timestamp
);

-- translations table
create table if not exists translations (
  translationid serial primary key,
  promptid integer not null,
  language_code text not null check(language_code in ('en', 'fr')),
  text text not null,
  created_at timestamp default current_timestamp,
  updated_at timestamp default current_timestamp,
  foreign key(promptid) references prompts(promptid),
  unique(promptid, language_code)
);

-- accounts table
create table if not exists accounts (
  accountid serial primary key,
  email text not null unique,
  created_at timestamp default current_timestamp,
  last_login_at timestamp,
  is_active boolean default true
);

-- login_attempts table
create table if not exists login_attempts (
  attemptid serial primary key,
  email text not null,
  code text not null,
  created_at timestamp default current_timestamp,
  is_used boolean default false
);

-- create indexes for optimization
create index if not exists idx_translations_language on translations(language_code);
create index if not exists idx_translations_prompt on translations(promptid);
create index if not exists idx_accounts_email on accounts(email);
create index if not exists idx_attempts_email on login_attempts(email);
create index if not exists idx_attempts_code on login_attempts(code); 