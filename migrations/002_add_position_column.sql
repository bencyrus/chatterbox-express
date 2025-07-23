-- migration: 002_add_position_column.sql
-- description: add position column to prompts table for proper followup ordering

-- add position column to prompts table (nullable initially for migration)
alter table prompts add column if not exists position integer;

-- create index for position column for efficient ordering
create index if not exists idx_prompts_position on prompts(position);

-- also add a prompt_set_id column to group related prompts together
alter table prompts add column if not exists prompt_set_id integer;

-- create index for prompt_set_id
create index if not exists idx_prompts_set_id on prompts(prompt_set_id); 