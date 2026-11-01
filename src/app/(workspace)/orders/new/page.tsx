import { randomUUID } from "node:crypto";
import { NavigationLink as Link } from "@/components/navigation-link";
import { requirePermission } from "@/lib/auth/session";
import { OrderForm } from "@/components/orders/order-form";
import { businessToday } from "@/features/orders/domain";
import { getCatalog } from "@/features/catalog/queries";
import { hasOrderMetadata } from "@/features/orders/queries";
export default async function Page(){
 const session=await requirePermission("orders.read");await requirePermission("orders.write");
 const [{products,needsMigration},metadataReady]=await Promise.all([getCatalog(),hasOrderMetadata()]);
 return <div className="space-y-6"><div className="flex flex-wrap gap-5 text-sm"><Link href="/orders" className="underline">← Danh sách đơn</Link>{session.profile.role==="admin"&&<Link href="/orders/products" className="underline">Danh mục sản phẩm & màu</Link>}</div><h1 className="text-3xl font-semibold">Tạo đơn hàng mới</h1>{needsMigration||!metadataReady?<p className="rounded-2xl bg-white p-6 text-sm leading-7">Cần chạy các migration đơn hàng theo thứ tự, bao gồm <code>202610310006_product_catalog.sql</code> và <code>202611010012_order_classification_buyer_link.sql</code>, rồi tải lại trang.</p>:<OrderForm products={products} requestId={randomUUID()} today={businessToday()}/>}</div>;
}
