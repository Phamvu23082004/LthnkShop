import "server-only";
import { requirePermission } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

export type DashboardPeriod = { start: string; end: string };
type Report = {
  id: string; completed_on: string; status: string; created_at: string;
  productivity_report_lines: {
    id: string; product_name: string; component_name: string; quantity: number;
    approved_quantity: number | null; approved_unit_rate_vnd: number | null; reviewed_at: string | null;
  }[];
};
const earnings = (reports: Report[]) => reports.reduce((sum, report) => sum + report.productivity_report_lines.reduce((inner, line) => {
  if (report.status !== "approved" || !line.reviewed_at || line.approved_quantity === null || line.approved_unit_rate_vnd === null) return inner;
  return inner + BigInt(line.approved_quantity) * BigInt(line.approved_unit_rate_vnd);
}, 0n), 0n);

export async function getStaffDashboard(period: DashboardPeriod) {
  const { profile } = await requirePermission("employees.read");
  if (profile.role !== "staff") throw new Error("Dashboard này chỉ dành cho nhân viên.");
  const client = await createClient();
  const load = (start: string, end: string) => client.from("productivity_reports")
    .select("id,completed_on,status,created_at,productivity_report_lines(id,product_name,component_name,quantity,approved_quantity,approved_unit_rate_vnd,reviewed_at)")
    .eq("employee_id", profile.id).gte("completed_on", start).lt("completed_on", end)
    .order("completed_on", { ascending: false }).order("created_at", { ascending: false }).limit(5000);
  const startDate = new Date(period.start + "T00:00:00Z");
  const endDate = new Date(period.end + "T00:00:00Z");
  const previousStart = new Date(startDate.getTime() - (endDate.getTime() - startDate.getTime())).toISOString().slice(0, 10);
  const [currentResult, previousResult] = await Promise.all([load(period.start, period.end), load(previousStart, period.start)]);
  const missing = [currentResult.error, previousResult.error].some(error => error && ["PGRST205", "42P01"].includes(error.code));
  if (missing) return { needsMigration: true as const };
  if (currentResult.error || previousResult.error) throw new Error("Không tải được dashboard cá nhân.");
  const reports = (currentResult.data ?? []) as unknown as Report[];
  const previous = (previousResult.data ?? []) as unknown as Report[];
  const lines = reports.flatMap(report => report.productivity_report_lines.map(line => ({ ...line, report })));
  const products = new Map<string, bigint>();
  const components = new Map<string, bigint>();
  const monthly = new Map<string, { income: bigint; quantity: bigint; reports: Set<string> }>();
  for (const line of lines) {
    const quantity = BigInt(line.quantity);
    products.set(line.product_name, (products.get(line.product_name) ?? 0n) + quantity);
    components.set(line.component_name, (components.get(line.component_name) ?? 0n) + quantity);
    const month = line.report.completed_on.slice(0, 7);
    const item = monthly.get(month) ?? { income: 0n, quantity: 0n, reports: new Set<string>() };
    item.quantity += quantity;
    item.reports.add(line.report.id);
    if (line.report.status === "approved" && line.reviewed_at && line.approved_quantity !== null && line.approved_unit_rate_vnd !== null)
      item.income += BigInt(line.approved_quantity) * BigInt(line.approved_unit_rate_vnd);
    monthly.set(month, item);
  }
  const approvedLines = lines.filter(line => line.report.status === "approved" && line.reviewed_at && line.approved_quantity !== null);
  const totalQuantity = lines.reduce((sum, line) => sum + BigInt(line.quantity), 0n);
  return {
    needsMigration: false as const, reports,
    summary: {
      income: earnings(reports).toString(), previousIncome: earnings(previous).toString(),
      quantity: totalQuantity.toString(),
      previousQuantity: previous.flatMap(report => report.productivity_report_lines).reduce((sum, line) => sum + BigInt(line.quantity), 0n).toString(),
      approvedReports: String(reports.filter(report => report.status === "approved").length),
      pendingReports: String(reports.filter(report => report.status === "submitted").length),
      returnedReports: String(reports.filter(report => report.status === "returned").length),
      activityDays: String(new Set(lines.map(line => line.report.completed_on)).size),
      approvedQuantity: approvedLines.reduce((sum, line) => sum + BigInt(line.approved_quantity!), 0n).toString(),
    },
    monthly: [...monthly].sort(([a], [b]) => a.localeCompare(b)).map(([month, item]) => ({ month, income: item.income.toString(), quantity: item.quantity.toString(), reports: String(item.reports.size) })),
    products: [...products].map(([name, value]) => ({ name, quantity: value.toString() })).sort((a,b) => BigInt(a.quantity) > BigInt(b.quantity) ? -1 : 1).slice(0,8),
    components: [...components].map(([name, value]) => ({ name, quantity: value.toString() })).sort((a,b) => BigInt(a.quantity) > BigInt(b.quantity) ? -1 : 1).slice(0,8),
  };
}
