import { requireAdmin } from "@/lib/auth/session";
import { getCatalog } from "@/features/catalog/queries";
import { CreateVariantForm,DeleteProductForm,EditVariantForm } from "@/components/catalog/variant-forms";
import { NavigationLink as Link } from "@/components/navigation-link";
import { productLabels } from "@/features/orders/domain";
export default async function Page(){
 await requireAdmin();const {products,needsMigration}=await getCatalog();
 return <div className="space-y-6"><Link href="/orders" className="text-sm underline">← Danh sách đơn</Link><h1 className="text-3xl font-semibold">Danh mục sản phẩm & màu</h1><p className="text-sm leading-7 text-stone-600">Thêm sản phẩm và màu tương ứng để chọn nhanh khi tạo đơn. Giá trong đơn cũ được giữ nguyên.</p>
 {needsMigration?<section className="rounded-2xl bg-white p-6 text-sm leading-7">Cần chạy migration <code>202610310006_product_catalog.sql</code> trong Supabase SQL Editor.</section>:<div className="grid items-start gap-6 xl:grid-cols-[1fr_1.6fr]"><section className="rounded-2xl border border-stone-200 bg-white p-6"><CreateVariantForm products={products}/></section><div className="space-y-5">{products.length===0&&<p className="rounded-2xl bg-white p-6 text-sm">Chưa có sản phẩm. Hãy thêm sản phẩm và màu đầu tiên.</p>}{products.map(p=><section key={p.id} className="space-y-4 rounded-2xl border border-stone-200 bg-white p-6"><div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start"><div><h2 className="text-xl font-semibold">{p.name}{!p.active&&<span className="ml-2 rounded-full bg-stone-100 px-2 py-1 align-middle text-xs font-medium text-stone-600">Đã ngừng bán</span>}</h2><p className="mt-2 text-xs text-stone-500">{productLabels[p.product_type]} · {p.product_variants.length} màu/phân loại</p></div><DeleteProductForm product={p}/></div>{p.product_variants.map(v=><EditVariantForm key={v.id+"-"+v.name+"-"+v.price_vnd+"-"+v.active} product={p} variant={v}/>)}</section>)}</div></div>}
 </div>;
}
