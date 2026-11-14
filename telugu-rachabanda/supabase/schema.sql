-- Gulf Telugu Guide (గల్ఫ్ తెలుగు గైడ్): comments, board posts, reactions and polls.
-- Run once in the Supabase SQL editor. Anonymous readers can read and add, never edit or delete.

create table if not exists public.comments (
  id uuid primary key default gen_random_uuid(),
  -- "guide:<guide id>" for questions under a guide, "board:<board id>" for community posts.
  thread text not null check (thread ~ '^(news|board|guide):[a-z0-9-]{1,40}$'),
  parent uuid references public.comments (id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 1 and 40),
  place text not null default '' check (char_length(place) <= 40),
  body text not null check (char_length(btrim(body)) between 1 and 2000),
  likes int not null default 0,
  reports int not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists comments_thread_idx on public.comments (thread, created_at);
create index if not exists comments_recent_idx on public.comments (created_at desc);

alter table public.comments enable row level security;

drop policy if exists "read comments" on public.comments;
create policy "read comments" on public.comments
  for select using (reports < 3);  -- hidden after three reports; moderators see them in the dashboard

drop policy if exists "add comments" on public.comments;
create policy "add comments" on public.comments
  for insert with check (likes = 0 and reports = 0 and created_at > now() - interval '1 minute');

grant select, insert on public.comments to anon, authenticated;

-- Likes and reports go through functions so readers cannot set arbitrary numbers.
create or replace function public.like_comment(p_id uuid) returns int
language sql security definer set search_path = public as $$
  update comments set likes = likes + 1 where id = p_id returning likes;
$$;

create or replace function public.report_comment(p_id uuid) returns void
language sql security definer set search_path = public as $$
  update comments set reports = reports + 1 where id = p_id;
$$;

-- Emoji reactions on stories and posts.
create table if not exists public.reactions (
  thread text not null check (char_length(thread) <= 60),
  emoji text not null check (emoji in ('like', 'love', 'laugh', 'wow', 'sad', 'angry')),
  count int not null default 0,
  primary key (thread, emoji)
);
alter table public.reactions enable row level security;
drop policy if exists "read reactions" on public.reactions;
create policy "read reactions" on public.reactions for select using (true);
grant select on public.reactions to anon, authenticated;

create or replace function public.react(p_thread text, p_emoji text) returns int
language sql security definer set search_path = public as $$
  insert into reactions (thread, emoji, count) values (p_thread, p_emoji, 1)
  on conflict (thread, emoji) do update set count = reactions.count + 1
  returning count;
$$;

-- Polls: one vote per browser per poll (the browser keeps a random voter id).
create table if not exists public.poll_votes (
  poll_id text not null check (char_length(poll_id) <= 40),
  voter text not null check (char_length(voter) between 8 and 64),
  option int not null check (option between 0 and 9),
  created_at timestamptz not null default now(),
  primary key (poll_id, voter)
);
alter table public.poll_votes enable row level security;  -- no policies: only the functions below

create or replace function public.vote(p_poll text, p_voter text, p_option int) returns void
language sql security definer set search_path = public as $$
  insert into poll_votes (poll_id, voter, option) values (p_poll, p_voter, p_option)
  on conflict (poll_id, voter) do update set option = excluded.option, created_at = now();
$$;

create or replace function public.poll_results(p_poll text)
returns table (option int, votes bigint)
language sql security definer set search_path = public as $$
  select option, count(*) from poll_votes where poll_id = p_poll group by option;
$$;

revoke all on function public.like_comment(uuid), public.report_comment(uuid),
  public.react(text, text), public.vote(text, text, int), public.poll_results(text) from public;
grant execute on function public.like_comment(uuid), public.report_comment(uuid),
  public.react(text, text), public.vote(text, text, int), public.poll_results(text) to anon, authenticated;
