import Link from "next/link";
import { requireSession } from "@/lib/auth/session";
export default async function Page(){await requireSession();return <section className="rounded-2xl border border-stone-200 bg-white p-8"><h1 className="text-2xl font-semibold">Bạn chưa có quyền truy cập</h1><p className="my-4 text-sm leading-7">Liên hệ chủ shop để được cấp quyền phù hợp.</p><Link href="/" className="underline">Về tổng quan</Link></section>;}
