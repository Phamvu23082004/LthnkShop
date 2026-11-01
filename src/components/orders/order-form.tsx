"use client";
import { useActionState,useState } from "react";
import { Plus,Trash2 } from "lucide-react";
import { saveOrder } from "@/features/orders/actions";
import { totals,type Order,type OrderItem } from "@/features/orders/domain";
import type { Product } from "@/features/catalog/types";
import { pickVariant,linkExistingItem } from "@/features/catalog/selection";
import { formatVnd } from "@/lib/format";
import { Button } from "@/components/ui/button";
type DraftItem=OrderItem&{key:string};
export function OrderForm({order,requestId,today,products}:{order?:Order;requestId:string;today:string;products:Product[]}){
 const [state,action,pending]=useActionState(saveOrder,{});
 const [items,setItems]=useState<DraftItem[]>(order?order.order_items.map((i,n)=>({...linkExistingItem(i,products),key:String(n)})):[{key:"0",product_name:"",product_type:"diy_kit",variant:"",quantity:1,unit_price_vnd:0}]);
 const [money,setMoney]=useState({shipping_vnd:order?.shipping_vnd??0,discount_vnd:order?.discount_vnd??0,deposit_vnd:order?.deposit_vnd??0,paid_vnd:order?.paid_vnd??0});
 const patch=(key:string,field:string,value:string|number)=>setItems(old=>old.map(i=>i.key===key?{...i,[field]:value}:i));
 let summary:{subtotal:number;total:number;remaining:number}|null=null;
 try{summary=totals(items,money.shipping_vnd,money.discount_vnd,money.deposit_vnd,money.paid_vnd);}catch{}
 const allSelected=items.every(i=>Boolean(i.product_id&&i.variant_id));
 const chooseProduct=(key:string,id:string)=>{const p=products.find(p=>p.id===id);setItems(old=>old.map(i=>i.key===key?{...i,product_id:p?.id??null,variant_id:null,product_name:p?.name??"",product_type:p?.product_type??"finished_product",variant:"",unit_price_vnd:0}:i));};
 const chooseVariant=(key:string,id:string)=>setItems(old=>old.map(i=>{if(i.key!==key)return i;if(!id)return {...i,variant_id:null,variant:"",unit_price_vnd:0};return {...pickVariant(products,i.product_id??"",id,i.quantity),key:i.key};}));
 const linePayload=items.map(i=>({product_id:i.product_id??null,variant_id:i.variant_id??null,product_name:i.product_name,product_type:i.product_type,variant:i.variant,quantity:i.quantity,unit_price_vnd:i.unit_price_vnd}));
 return <form action={action} aria-busy={pending} className="space-y-6">
 <input type="hidden" name="request_id" value={requestId}/><input type="hidden" name="id" value={order?.id??""}/><input type="hidden" name="version" value={order?.version??""}/><input type="hidden" name="items" value={JSON.stringify(linePayload)}/>
 <div className="grid items-start gap-6 xl:grid-cols-[1.6fr_1fr]"><div className="space-y-6">
 <section className="space-y-5 rounded-2xl border border-stone-200 bg-white p-5 sm:p-6"><h2 className="text-xl font-semibold">1. Thông tin khách & đơn hàng</h2>
 <div className="grid gap-4 sm:grid-cols-2">
 <label className="grid gap-2 text-sm">Ngày đặt (nếu biết)<input className="field" name="ordered_on" type="date" defaultValue={order?(order.ordered_on??""):today}/></label>
 <label className="grid gap-2 text-sm">Ngày trả đơn<input className="field" name="due_on" type="date" defaultValue={order?.due_on??""}/></label>
 <label className="grid gap-2 text-sm">Tên khách *<input className="field" name="customer_name" required minLength={2} maxLength={100} defaultValue={order?.customer_name}/></label>
 <label className="grid gap-2 text-sm">Số điện thoại<input className="field" name="phone" type="tel" minLength={6} maxLength={25} defaultValue={order?.phone}/></label>
 </div>
 <label className="grid gap-2 text-sm">Địa chỉ<textarea className="field" name="address" rows={2} minLength={3} maxLength={500} defaultValue={order?.address}/></label>
 <label className="grid gap-2 text-sm">Nền tảng bán hàng<select className="field" name="sales_platform" defaultValue={order?.sales_platform??""}><option value="">Không chọn</option><option value="tiktok">TikTok</option><option value="instagram">Instagram</option></select></label>
 <label className="grid gap-2 text-sm sm:col-span-2">URL người mua<input className="field" name="buyer_link" type="url" inputMode="url" maxLength={2000} pattern="https?://.+" placeholder="Nhập link trang cá nhân hoặc người mua..." defaultValue={order?.buyer_link??""}/><span className="text-xs text-stone-500">Không bắt buộc. Chỉ chấp nhận link http hoặc https.</span></label>
 <label className="grid gap-2 text-sm">Ghi chú<textarea className="field" name="notes" rows={3} maxLength={2000} defaultValue={order?.notes}/></label></section>
 {products.length===0&&<p role="status" className="rounded-xl bg-amber-50 p-4 text-sm leading-7">Danh mục đang trống. Chủ shop cần thêm sản phẩm và màu tại Danh mục sản phẩm trước khi tạo đơn.</p>}
 <section className="space-y-5 rounded-2xl border border-stone-200 bg-white p-5 sm:p-6"><div className="flex flex-wrap items-center justify-between gap-2"><h2 className="text-xl font-semibold">2. Sản phẩm</h2><span className="text-xs text-stone-500">{items.length}/100 dòng</span></div>
 {items.map((item,index)=><fieldset key={item.key} className="grid gap-4 rounded-xl border border-stone-200 bg-background p-4 sm:grid-cols-2"><legend className="px-2 text-xs font-semibold">Sản phẩm {index+1}</legend>
 <label className="grid gap-2 text-sm">Sản phẩm *<select className="field" required value={item.product_id??""} onChange={e=>chooseProduct(item.key,e.target.value)}><option value="">Chọn sản phẩm</option>{products.filter(p=>p.active||p.id===item.product_id).map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select></label>
 <label className="grid gap-2 text-sm">Màu / mẫu / phân loại *<select className="field" required disabled={!item.product_id} value={item.variant_id??""} onChange={e=>chooseVariant(item.key,e.target.value)}><option value="">Chọn màu của sản phẩm</option>{(products.find(p=>p.id===item.product_id)?.product_variants??[]).filter(v=>v.active||v.id===item.variant_id).map(v=><option key={v.id} value={v.id}>{v.name}{!v.active?" (ngừng bán)":""}</option>)}</select></label>
 <p className="text-xs leading-6 text-stone-600 sm:col-span-2">Giá được điền theo màu đã chọn; có thể điều chỉnh theo giá chốt của đơn.</p>
 <label className="grid gap-2 text-sm">Số lượng *<input className="field" type="number" required min={1} max={10000} step={1} value={Number.isNaN(item.quantity)?"":item.quantity} onChange={e=>patch(item.key,"quantity",e.target.valueAsNumber)}/></label>
 <label className="grid gap-2 text-sm">Đơn giá (VND) *<input className="field" type="number" required min={0} max={1000000000} step={1} value={Number.isNaN(item.unit_price_vnd)?"":item.unit_price_vnd} onChange={e=>patch(item.key,"unit_price_vnd",e.target.valueAsNumber)}/></label>
 <div className="flex items-center justify-between gap-3 sm:col-span-2"><span className="text-sm font-semibold">{Number.isSafeInteger(item.quantity*item.unit_price_vnd)?formatVnd(item.quantity*item.unit_price_vnd):"—"}</span><Button type="button" variant="outline" size="sm" aria-label={"Xóa sản phẩm "+(index+1)} disabled={items.length===1} onClick={()=>setItems(old=>old.filter(i=>i.key!==item.key))}><Trash2 size={15}/>Xóa dòng</Button></div>
 </fieldset>)}
 <Button type="button" variant="outline" disabled={items.length>=100} onClick={()=>setItems(old=>[...old,{key:crypto.randomUUID(),product_name:"",product_type:"diy_kit",variant:"",quantity:1,unit_price_vnd:0}])}><Plus size={16}/>Thêm sản phẩm</Button></section></div>
 <section className="space-y-5 rounded-2xl border border-stone-200 bg-white p-5 sm:p-6 xl:sticky xl:top-6"><h2 className="text-xl font-semibold">3. Thanh toán</h2>
 {(["shipping_vnd","discount_vnd","deposit_vnd","paid_vnd"] as const).map(key=><label key={key} className="grid gap-2 text-sm">{{shipping_vnd:"Phí ship nhập thủ công",discount_vnd:"Giảm giá",deposit_vnd:"Tiền cọc đã nhận",paid_vnd:"Tổng đã thanh toán (gồm cọc)"}[key]}<input className="field" type="number" name={key} required min={0} step={1} max={1000000000000} value={Number.isNaN(money[key])?"":money[key]} onChange={e=>setMoney(old=>({...old,[key]:e.target.valueAsNumber}))}/></label>)}
 <p className="text-xs leading-6 text-stone-600">Tiền cọc nằm trong tổng đã thanh toán, không cộng thêm lần nữa.</p>
 {summary?<dl className="space-y-4 border-t border-stone-200 pt-4">{[["Tiền sản phẩm",summary.subtotal],["Tổng đơn",summary.total],["Còn lại",summary.remaining]].map(([label,value])=><div key={label} className="flex justify-between gap-3 text-sm"><dt>{label}</dt><dd className="font-semibold">{formatVnd(Number(value))}</dd></div>)}</dl>:<p role="status" className="text-sm leading-6 text-red-800">Kiểm tra tiền và số lượng: cọc ≤ đã trả ≤ tổng đơn; giảm giá không vượt tiền hàng.</p>}
 {state.error&&<p role="alert" className="rounded-xl bg-red-50 p-3 text-sm leading-6 text-red-800">{state.error}</p>}
 {pending&&<p role="status" className="text-sm leading-6 text-stone-600">Đang lưu đơn và mở trang chi tiết…</p>}
 <Button className="w-full" disabled={pending||!summary||!allSelected}>{pending?"Đang lưu…":order?"Lưu thay đổi":"Tạo đơn hàng"}</Button>
 <p className="text-xs leading-6 text-stone-500">{order?"Trạng thái được cập nhật riêng ở danh sách hoặc chi tiết đơn.":"Mã đơn sẽ được tạo tự động khi lưu. Đơn mới ở trạng thái Chưa Làm."}</p>
 </section></div></form>;
}
