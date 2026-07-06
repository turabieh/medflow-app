-- Add coverage percentage to patients table
-- Each patient may have a different coverage % with their insurance
alter table patients
  add column if not exists insurance_coverage_pct numeric(5,2) default 100
    check (insurance_coverage_pct >= 0 and insurance_coverage_pct <= 100);

-- Add patient_cash_amount and insurance_claim_amount to appointments
-- for clear split tracking
alter table appointments
  add column if not exists patient_cash_amount  numeric(10,2) default 0,
  add column if not exists insurance_claim_amount numeric(10,2) default 0;

-- Migrate existing data: if insurance_fee > 0, that was the insurance amount
-- payment_amount was the patient cash portion
update appointments
  set insurance_claim_amount = insurance_fee,
      patient_cash_amount    = coalesce(payment_amount, 0)
  where insurance_fee > 0 and insurance_claim_amount = 0;

-- Also add default coverage pct to insurance_companies table as a reference
alter table insurance_companies
  add column if not exists default_coverage_pct numeric(5,2) default 80
    check (default_coverage_pct >= 0 and default_coverage_pct <= 100);

comment on column patients.insurance_coverage_pct is
  'Percentage covered by insurance for this patient (0-100). E.g. 80 means insurance pays 80%, patient pays 20%';
comment on column appointments.patient_cash_amount is
  'Amount patient pays in cash (total_fee * (1 - coverage_pct/100))';
comment on column appointments.insurance_claim_amount is
  'Amount claimed from insurance (total_fee * coverage_pct/100)';
