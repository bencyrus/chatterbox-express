-- migration: 003_assign_positions.sql
-- description: assign position and prompt_set_id to existing prompts

-- assign prompt_set_id and position based on current logic
-- current system: 5 prompts per set (1 main + 4 followups)
-- promptid 1-5 = set 1, promptid 6-10 = set 2, etc.

update prompts set 
  prompt_set_id = ceil(promptid::float / 5),
  position = case 
    when type = 'main' then 0
    when type = 'followup' then ((promptid - 1) % 5) 
  end
where prompt_set_id is null or position is null; 