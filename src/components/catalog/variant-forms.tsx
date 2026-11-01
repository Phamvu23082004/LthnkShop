"use client";
import { useActionState,useState } from "react";
import { deleteProduct,saveVariant,saveVariants } from "@/features/catalog/actions";
import type { CatalogState } from "@/features/catalog/actions";
import type { Product,ProductVariant } from "@/features/catalog/types";
import { productLabels } from "@/features/orders/domain";
import { formatVnd } from "@/lib/format";
import { Button } from "@/components/ui/button";
function Feedback({state}:{state:{error?:string;success?:string}}){return <>{state.error&&<p role="alert" className="text-sm text-red-800">{state.error}</p>}{state.success&&<p role="status" className="text-sm text-green-800">{state.success}</p>}</>;}
export function CreateVariantForm({products}:{products:Product[]}){
 const [state,action,pending]=useActionState(saveVariants,{});
 return <CreateVariantFields key={state.resetToken??"initial"} products={products} action={action} pending={pending} state={state}/>;
}
function CreateVariantFields({products,action,pending,state}:{products:Product[];action:(formData:FormData)=>void;pending:boolean;state:CatalogState}){
 const [id,setId]=useState("");
 const [variants,setVariants]=useState([{key:"0",name:"",price_vnd:"",active:true}]);
 const product=products.find(p=>p.id===id);
 const payload=variants.map(({name,price_vnd,active})=>({name,price_vnd:price_vnd===""?null:Number(price_vnd),active}));
 return <form action={action} className="space-y-4"><h2 className="text-xl font-semibold">Thêm sản phẩm / nhiều màu</h2><label className="grid gap-2 text-sm">Sản phẩm<select className="field" name="product_id" value={id} onChange={e=>setId(e.target.value)}><option value="">+ Sản phẩm mới</option>{products.filter(p=>p.active||p.id===id).map(p=><option key={p.id} value={p.id}>{p.name} · {productLabels[p.product_type]}</option>)}</select></label>
 <input type="hidden" name="variants" value={JSON.stringify(payload)}/>
 {product?<><input type="hidden" name="product_name" value={product.name}/><input type="hidden" name="product_type" value={product.product_type}/></>:<><label className="grid gap-2 text-sm">Tên sản phẩm<input className="field" name="product_name" required maxLength={200}/></label><label className="grid gap-2 text-sm">Loại<select className="field" name="product_type"><option value="finished_product">Sản phẩm hoàn chỉnh</option><option value="diy_kit">Set len DIY</option></select></label></>}
 <div className="space-y-3"><div className="flex items-center justify-between gap-2"><h3 className="text-sm font-medium">Màu / mẫu / phân loại</h3><Button type="button" variant="outline" size="sm" disabled={variants.length>=50} onClick={()=>setVariants(rows=>[...rows,{key:crypto.randomUUID(),name:"",price_vnd:"",active:true}])}>Thêm dòng</Button></div>
 {variants.map((variant,index)=><fieldset key={variant.key} className="grid gap-3 rounded-xl border border-stone-200 p-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,0.8fr)_auto]"><legend className="px-1 text-xs text-stone-500">Màu {index+1}</legend><label className="grid min-w-0 gap-2 text-xs">Tên màu / mẫu<input className="field w-full min-w-0" required maxLength={200} value={variant.name} placeholder="VD: Kem, Hồng" onChange={e=>setVariants(rows=>rows.map(row=>row.key===variant.key?{...row,name:e.target.value}:row))}/></label><label className="grid min-w-0 gap-2 text-xs">Đơn giá (VND)<input className="field w-full min-w-0" type="number" required min={0} max={1000000000} step={1} value={variant.price_vnd} onChange={e=>setVariants(rows=>rows.map(row=>row.key===variant.key?{...row,price_vnd:e.target.value}:row))}/></label><div className="flex items-end justify-between gap-3 sm:flex-col sm:items-start"><label className="flex min-h-11 items-center gap-2 text-xs"><input type="checkbox" checked={variant.active} onChange={e=>setVariants(rows=>rows.map(row=>row.key===variant.key?{...row,active:e.target.checked}:row))}/>Đang bán</label>{variants.length>1&&<Button type="button" variant="outline" size="sm" onClick={()=>setVariants(rows=>rows.filter(row=>row.key!==variant.key))}>Bỏ dòng</Button>}</div></fieldset>)}</div>
 <Feedback state={state}/><Button className="w-full sm:w-auto" disabled={pending}>{pending?"Đang lưu…":"Thêm vào danh mục"}</Button></form>;
}
export function EditVariantForm({product,variant}:{product:Product;variant:ProductVariant}){
 const [state,action,pending]=useActionState(saveVariant,{});
 return <details className="rounded-xl border border-stone-200 p-4"><summary className="cursor-pointer text-sm"><span className="font-medium">{variant.name}</span><span className="ml-3 text-stone-600">{formatVnd(variant.price_vnd)} · {variant.active?"Đang bán":"Ngừng bán"}</span></summary><form action={action} className="mt-4 space-y-4">
 <input type="hidden" name="product_id" value={product.id}/><input type="hidden" name="variant_id" value={variant.id}/><input type="hidden" name="product_name" value={product.name}/><input type="hidden" name="product_type" value={product.product_type}/>
 <label className="grid gap-2 text-sm">Màu / phân loại<input className="field" name="variant_name" required maxLength={200} defaultValue={variant.name}/></label><label className="grid gap-2 text-sm">Giá mặc định (VND)<input className="field" name="price_vnd" type="number" min={0} max={1000000000} step={1} required defaultValue={variant.price_vnd}/></label><label className="flex items-center gap-2 text-sm"><input name="active" type="checkbox" defaultChecked={variant.active}/>Đang bán</label><Feedback state={state}/><Button className="w-full sm:w-auto" disabled={pending}>{pending?"Đang lưu…":"Lưu màu / giá"}</Button></form></details>;
}
export function DeleteProductForm({product}:{product:Product}){
 const [state,action,pending]=useActionState(deleteProduct.bind(null,product.id),{});
 return <form action={action} onSubmit={e=>{if(!window.confirm(`Xóa sản phẩm “${product.name}” và toàn bộ màu/phân loại? Nếu đã có lịch sử, sản phẩm sẽ được ngừng bán để giữ dữ liệu.`)) e.preventDefault();}} className="flex flex-col items-start gap-2 sm:flex-row sm:items-center">
  <Button type="submit" variant="outline" className="w-full border-red-300 text-red-800 hover:bg-red-50 sm:w-auto" disabled={pending}>{pending?"Đang xử lý…":"Xóa sản phẩm"}</Button>
  {state.error&&<p role="alert" className="text-sm text-red-800">{state.error}</p>}{state.success&&<p role="status" className="text-sm text-green-800">{state.success}</p>}
 </form>;
}
