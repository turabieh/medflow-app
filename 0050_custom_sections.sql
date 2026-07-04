-- Custom sections for clinic public page
-- Each clinic can add unlimited sections (success stories, cases, team, etc.)
create table if not exists clinic_custom_sections (
  id          uuid primary key default gen_random_uuid(),
  clinic_id   uuid references clinics(id) on delete cascade not null,
  title_en    text,
  title_ar    text,
  body_en     text,
  body_ar     text,
  image_url   text,
  image_side  text default 'left',  -- 'left' | 'right' | 'none' | 'top'
  sort_order  int  default 0,
  is_active   boolean default true,
  created_at  timestamptz default now()
);

-- Public read policy
drop policy if exists "public read - clinic_custom_sections" on clinic_custom_sections;
create policy "public read - clinic_custom_sections"
  on clinic_custom_sections for select using (is_active = true);

-- Clinic staff write policy
drop policy if exists "clinic staff write - custom sections" on clinic_custom_sections;
create policy "clinic staff write - custom sections"
  on clinic_custom_sections for all
  using (
    clinic_id in (
      select clinic_id from users where id = auth.uid()
    )
  );

-- Enable RLS
alter table clinic_custom_sections enable row level security;
