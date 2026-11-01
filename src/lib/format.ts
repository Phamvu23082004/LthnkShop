export const TIME_ZONE = "Asia/Ho_Chi_Minh";
export function formatVnd(value: number) { return new Intl.NumberFormat("vi-VN", {style:"currency",currency:"VND",maximumFractionDigits:0}).format(value); }
export function formatDate(value: Date | string) { return new Intl.DateTimeFormat("vi-VN", {timeZone:TIME_ZONE,day:"2-digit",month:"2-digit",year:"numeric"}).format(new Date(value)); }
