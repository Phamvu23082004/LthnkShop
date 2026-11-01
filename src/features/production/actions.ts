"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdmin, requirePermission } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { reportInputSchema } from "./schema";

export type ProductionActionState = { error?: string; success?: string; submitted?: boolean };
function message(code?: string) {
  if (code === "42501") return "Bạn không có quyền thực hiện thao tác này.";
  if (code === "40001") return "Phiếu đã được thay đổi. Tải lại trang rồi thử lại.";
  if (code === "P0002") return "Không tìm thấy dữ liệu hoặc chưa có đơn giá phù hợp cho sản phẩm, kích thước và bộ phận này.";
  if (code === "23514") return "Phiếu đã khóa hoặc không ở trạng thái cho phép thao tác.";
  if (code === "23505") return "Tên bộ phận hoặc đơn giá này đã tồn tại.";
  return "Không lưu được dữ liệu. Kiểm tra migration 202610310009_handmade_payroll.sql và thử lại.";
}

export async function saveReport(_: ProductionActionState, form: FormData): Promise<ProductionActionState> {
  const {profile} = await requirePermission("employees.read");
  if (profile.role !== "staff") return { error: "Chỉ nhân viên mới được tạo báo cáo sản lượng." };
  let lines: unknown;
  try { lines = JSON.parse(String(form.get("lines") ?? "")); } catch { return { error: "Danh sách bộ phận không hợp lệ." }; }
  const parsed = reportInputSchema.safeParse({ completed_on: form.get("completed_on"), notes: form.get("notes") ?? "", lines });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Thông tin phiếu chưa hợp lệ." };
  const id = String(form.get("report_id") ?? "") || null;
  const version = id ? Number(form.get("version")) : null;
  if (id && (!z.uuid().safeParse(id).success || !Number.isInteger(version) || version! < 1)) return { error: "Phiên bản phiếu không hợp lệ." };
  const client = await createClient();
  const { error } = await client.rpc("save_productivity_report", { payload: parsed.data, target_id: id, expected_version: version, submit_report: form.get("intent") === "submit" });
  if (error) return { error: message(error.code) };
  revalidatePath("/employees"); revalidatePath("/employees/payroll"); revalidatePath("/");
  return { success: form.get("intent") === "submit" ? "Đã gửi báo cáo để chủ shop duyệt." : "Đã lưu bản nháp.", submitted: form.get("intent") === "submit" };
}

export async function reviewLine(_: ProductionActionState, form: FormData): Promise<ProductionActionState> {
  await requireAdmin();
  const id = z.uuid().safeParse(form.get("line_id"));
  const quantity = Number(form.get("approved_quantity"));
  if (!id.success || !Number.isInteger(quantity) || quantity < 0 || quantity > 10000) return { error: "Số lượng duyệt không hợp lệ." };
  const client = await createClient();
  const { error } = await client.rpc("review_productivity_line", { target_line: id.data, approved_qty: quantity });
  if (error) return { error: message(error.code) };
  revalidatePath("/employees"); revalidatePath("/");
  return { success: "Đã duyệt dòng sản lượng." };
}

export async function returnReport(_: ProductionActionState, form: FormData): Promise<ProductionActionState> {
  await requireAdmin();
  const id = z.uuid().safeParse(form.get("report_id"));
  const reason = String(form.get("reason") ?? "").trim();
  if (!id.success || reason.length < 3 || reason.length > 1000) return { error: "Vui lòng nhập lý do trả phiếu (ít nhất 3 ký tự)." };
  const client = await createClient();
  const { error } = await client.rpc("return_productivity_report", { target_report: id.data, reason });
  if (error) return { error: message(error.code) };
  revalidatePath("/employees"); revalidatePath("/");
  return { success: "Đã trả phiếu để nhân viên chỉnh sửa." };
}

export async function saveComponent(_: ProductionActionState, form: FormData): Promise<ProductionActionState> {
  await requireAdmin();
  const rawId = String(form.get("component_id") ?? "");
  const id = rawId ? z.uuid().safeParse(rawId) : null;
  const name = String(form.get("name") ?? "").trim();
  const order = Number(form.get("sort_order"));
  if ((rawId && !id?.success) || name.length < 1 || name.length > 100 || !Number.isInteger(order) || order < 0 || order > 10000) return { error: "Thông tin bộ phận không hợp lệ." };
  const client = await createClient();
  const { error } = await client.rpc("save_handmade_component", { target_id: id?.success ? id.data : null, component_name: name, is_active: form.get("active") === "on", position_value: order });
  if (error) return { error: message(error.code) };
  revalidatePath("/employees");
  return { success: "Đã lưu bộ phận handmade." };
}

export async function saveRate(_: ProductionActionState, form: FormData): Promise<ProductionActionState> {
  await requireAdmin();
  const rawId = String(form.get("rate_id") ?? "");
  const id = rawId ? z.uuid().safeParse(rawId) : null;
  const component = z.uuid().safeParse(form.get("component_id"));
  const product = z.uuid().safeParse(form.get("product_id"));
  const size = String(form.get("size") ?? "").trim();
  const rate = Number(form.get("unit_rate_vnd"));
  if ((rawId && !id?.success) || !component.success || !product.success || !/^\d{1,3}$/.test(size) || !Number.isSafeInteger(rate) || rate < 0 || rate > 1_000_000_000) return { error: "Thông tin đơn giá không hợp lệ." };
  const client = await createClient();
  const { error } = await client.rpc("save_handmade_piece_rate", { target_id: id?.success ? id.data : null, component: component.data, selected_product: product.data, piece_size: size, rate_vnd: rate, is_active: form.get("active") === "on" });
  if (error) return { error: message(error.code) };
  revalidatePath("/employees"); revalidatePath("/");
  return { success: "Đã lưu đơn giá. Phiếu đã duyệt vẫn giữ nguyên đơn giá cũ." };
}

export async function addPayrollEntry(_: ProductionActionState, form: FormData): Promise<ProductionActionState> {
  await requireAdmin();
  const employee = z.uuid().safeParse(form.get("employee_id"));
  const period = String(form.get("period_month") ?? "");
  const amount = Number(form.get("amount_vnd"));
  const kind = String(form.get("entry_type") ?? "");
  const notes = String(form.get("notes") ?? "").trim();
  if (!employee.success || !/^\d{4}-\d{2}$/.test(period) || !["advance", "bonus", "allowance", "payment"].includes(kind) || !Number.isSafeInteger(amount) || amount < 1 || amount > 1_000_000_000_000 || notes.length > 1000) return { error: "Thông tin khoản lương không hợp lệ." };
  const client = await createClient();
  const { error } = await client.rpc("add_payroll_entry", { target_employee: employee.data, month_start: `${period}-01`, kind, amount, entry_note: notes });
  if (error) return { error: message(error.code) };
  revalidatePath("/employees"); revalidatePath("/");
  return { success: "Đã ghi nhận khoản lương." };
}
