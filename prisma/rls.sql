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


-- Section 7 tables RLS
ALTER TABLE "Examiner" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Examiner" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_examiner ON "Examiner"
  USING ("instituteId" = current_setting('app.current_institute_id', true) OR current_setting('app.is_super_admin', true) = 'true')
  WITH CHECK ("instituteId" = current_setting('app.current_institute_id', true) OR current_setting('app.is_super_admin', true) = 'true');

ALTER TABLE "PracticalSlot" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "PracticalSlot" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_practical_slot ON "PracticalSlot"
  USING ("instituteId" = current_setting('app.current_institute_id', true) OR current_setting('app.is_super_admin', true) = 'true')
  WITH CHECK ("instituteId" = current_setting('app.current_institute_id', true) OR current_setting('app.is_super_admin', true) = 'true');

ALTER TABLE "ClassTestMark" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ClassTestMark" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_class_test_mark ON "ClassTestMark"
  USING ("instituteId" = current_setting('app.current_institute_id', true) OR current_setting('app.is_super_admin', true) = 'true')
  WITH CHECK ("instituteId" = current_setting('app.current_institute_id', true) OR current_setting('app.is_super_admin', true) = 'true');

ALTER TABLE "ResultRecord" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ResultRecord" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_result_record ON "ResultRecord"
  USING ("instituteId" = current_setting('app.current_institute_id', true) OR current_setting('app.is_super_admin', true) = 'true')
  WITH CHECK ("instituteId" = current_setting('app.current_institute_id', true) OR current_setting('app.is_super_admin', true) = 'true');
