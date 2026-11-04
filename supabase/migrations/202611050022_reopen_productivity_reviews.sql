begin;

-- Reopen only reports that were fully approved. Draft and returned reports
-- remain in their existing states and are not submitted on behalf of staff.
update public.productivity_report_lines line
set approved_quantity = null,
    approved_unit_rate_vnd = null,
    reviewed_by = null,
    reviewed_at = null
from public.productivity_reports report
where report.id = line.report_id
  and report.status = 'approved';

update public.productivity_reports
set status = 'submitted',
    updated_at = now()
where status = 'approved';

commit;
