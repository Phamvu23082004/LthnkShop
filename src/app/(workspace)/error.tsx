"use client";
import { Button } from "@/components/ui/button";
export default function ErrorPage({reset}:{reset:()=>void}){return <section className="rounded-2xl bg-white p-8"><h1 className="text-xl font-semibold">Không thể tải dữ liệu</h1><p className="my-4 text-sm">Vui lòng kiểm tra kết nối và thử lại. Nếu lỗi tiếp diễn, hãy liên hệ chủ shop.</p><Button onClick={reset}>Thử lại</Button></section>;}
