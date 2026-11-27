-- ExamOps PostgreSQL Row-Level Security (RLS) Policies
-- Enforces strict multi-tenant isolation on every table with "instituteId".
-- App requests set `app.current_institute_id` and `app.is_super_admin` per transaction.

DO $$
DECLARE
  tbl text;
  tenant_tables text[] := ARRAY[
    'Membership',
    'Invoice',
    'ImpersonationLog',
    'AuditLog',
    'ImportTemplate',
    'ExamSession',
    'Scheme',
    'Subject',
    'TimetableEntry',
    'Candidate',
    'CandidatePaper',
    'QPInventory',
    'Room',
    'Block',
    'BlockAllocation',
    'SpecialCode',
    'CandidateStatus',
    'BlockSubmission',
    'AnswerBookRecord',
    'EarlyLeaving',
    'CopyCase',
    'MarksheetRecord',
    'Staff',
    'SupervisionDuty',
    'DutySwapRequest',
    'RemunerationRate',
    'ReportTemplate',
    'GeneratedReport'
  ];
BEGIN
  FOREACH tbl IN ARRAY tenant_tables LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY;', tbl);
    EXECUTE format('ALTER TABLE %I FORCE ROW LEVEL SECURITY;', tbl);
    EXECUTE format('DROP POLICY IF EXISTS tenant_isolation_policy ON %I;', tbl);
    EXECUTE format(
      'CREATE POLICY tenant_isolation_policy ON %I
       USING (
         current_setting(''app.is_super_admin'', true) = ''true''
         OR "instituteId" = current_setting(''app.current_institute_id'', true)
       )
       WITH CHECK (
         current_setting(''app.is_super_admin'', true) = ''true''
         OR "instituteId" = current_setting(''app.current_institute_id'', true)
       );',
      tbl
    );
  END LOOP;
END $$;
