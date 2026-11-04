begin;

-- Reopen reviewed lines even when their report was still partially reviewed
-- and therefore remained in submitted status.
update public.productivity_report_lines line
set approved_quantity = null,
    approved_unit_rate_vnd = null,
    reviewed_by = null,
    reviewed_at = null
from public.productivity_reports report
where report.id = line.report_id
  and report.status in ('submitted', 'approved')
  and line.reviewed_at is not null;

update public.productivity_reports
set status = 'submitted',
    updated_at = now()
where status = 'approved';

commit;
