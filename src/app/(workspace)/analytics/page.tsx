import { redirect } from "next/navigation";

// Giữ đường dẫn cũ cho các bookmark đã lưu; báo cáo chỉ hiển thị ở Tổng quan.
export default function Page() {
 redirect("/");
}
