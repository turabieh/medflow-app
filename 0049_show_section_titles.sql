-- Add column to control section title visibility on public clinic page
alter table clinic_page
  add column if not exists show_section_titles boolean default false;
