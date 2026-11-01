import { randomUUID } from "node:crypto";
import { NavigationLink as Link } from "@/components/navigation-link";
import { requirePermission } from "@/lib/auth/session";
import { getOrder,hasOrderMetadata } from "@/features/orders/queries";
import { getCatalog } from "@/features/catalog/queries";
import { businessToday } from "@/features/orders/domain";
import { OrderForm } from "@/components/orders/order-form";
export default async function Page({params}:{params:Promise<{id:string}>}){
 await requirePermission("orders.write");const metadataReady=await hasOrderMetadata();
 if(!metadataReady)return <div className="space-y-6"><Link href="/orders" className="text-sm underline">← Danh sách đơn</Link><h1 className="text-3xl font-semibold">Chỉnh sửa đơn hàng</h1><p className="rounded-xl bg-white p-6">Cần chạy migration <code>202611010012_order_classification_buyer_link.sql</code> trước khi chỉnh sửa đơn.</p></div>;
 const [order,catalog]=await Promise.all([getOrder((await params).id),getCatalog()]);
 return <div className="space-y-6"><Link href={"/orders/"+order.id} className="text-sm underline">← Chi tiết đơn</Link><h1 className="text-3xl font-semibold">Chỉnh sửa {order.order_code}</h1>{order.status==="cancelled"?<p className="rounded-xl bg-white p-6">Đơn đã hủy, không thể chỉnh sửa.</p>:catalog.needsMigration?<p className="rounded-xl bg-white p-6">Cần chạy migration 202610310006_product_catalog.sql.</p>:<OrderForm products={catalog.products} order={order} requestId={randomUUID()} today={businessToday()}/>}</div>;
}
