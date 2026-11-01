export const permissions = ["orders.read", "orders.write", "employees.read", "inventory.read", "analytics.read"] as const;
export type Permission = typeof permissions[number];
export type Profile = { id: string; email: string; full_name: string; role: "admin" | "staff"; active: boolean; created_at: string };
export function canAccess(profile: Pick<Profile,"role"|"active">, grants: readonly string[], permission?: Permission) {
 return profile.active && (!permission || profile.role === "admin" || grants.includes(permission));
}
export function permissionForRoute(path: string): Permission | "admin" | undefined {
 if(path==="/accounts" || path.startsWith("/accounts/")) return "admin";
 if(path==="/orders" || path.startsWith("/orders/")) return "orders.read";
 if(path==="/employees" || path.startsWith("/employees/")) return "employees.read";
 if(["/yarn","/inventory"].some(p=>path===p||path.startsWith(p+"/"))) return "inventory.read";
}
export const permissionLabels: Record<Permission,string> = { "orders.read":"Xem đơn hàng", "orders.write":"Tạo, sửa và hủy đơn hàng", "employees.read":"Xem nhân viên", "inventory.read":"Xem kho", "analytics.read":"Xem doanh thu" };
