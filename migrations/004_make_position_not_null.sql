-- migration: 004_make_position_not_null.sql
-- description: make position and prompt_set_id columns not nullable

-- make position column not nullable
alter table prompts alter column position set not null;

-- make prompt_set_id column not nullable  
alter table prompts alter column prompt_set_id set not null;

-- add constraint to ensure position is non-negative
alter table prompts add constraint check_position_non_negative check (position >= 0);

-- add unique constraint to ensure no duplicate positions within a prompt set
alter table prompts add constraint unique_position_per_set unique (prompt_set_id, position); 