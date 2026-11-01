import type { OrderItem } from "@/features/orders/domain";
import type { Product } from "./types";
export function pickVariant(products:Product[],productId:string,variantId:string,quantity=1):OrderItem{
 const product=products.find(p=>p.id===productId);
 const variant=product?.product_variants.find(v=>v.id===variantId);
 if(!product?.active||!variant?.active)throw new Error("Sản phẩm hoặc màu không khả dụng.");
 return {product_id:product.id,variant_id:variant.id,product_name:product.name,product_type:product.product_type,variant:variant.name,quantity,unit_price_vnd:Number(variant.price_vnd)};
}
export function linkExistingItem(item:OrderItem,products:Product[]):OrderItem{
 const product=products.find(p=>item.product_id?p.id===item.product_id:p.name===item.product_name&&p.product_type===item.product_type);
 const variant=product?.product_variants.find(v=>item.variant_id?v.id===item.variant_id:v.name===(item.variant||"Mặc định"));
 return {...item,product_id:product?.id??null,variant_id:variant?.id??null};
}
