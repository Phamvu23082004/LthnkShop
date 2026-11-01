export const statuses = ["preparing","producing","completed"] as const;
export type OrderStatus = typeof statuses[number] | "cancelled";
export const statusLabels: Record<string,string> = {
 pending:"Chờ xác nhận",preparing:"Chưa Làm",producing:"Đang Làm",ready:"Chờ gửi hàng",shipping:"Đang giao",completed:"Hoàn Thành",cancelled:"Đã hủy"
};
export const productLabels = {diy_kit:"Set len DIY",finished_product:"Sản phẩm hoàn chỉnh"};
export type OrderItem={id?:string;product_id?:string|null;variant_id?:string|null;product_name:string;product_type:keyof typeof productLabels;variant:string;quantity:number;unit_price_vnd:number};
export type Order={id:string;order_code:string;ordered_on:string|null;customer_name:string;phone:string;address:string;order_type:"diy_kit"|"finished_product"|null;sales_platform:"tiktok"|"instagram"|null;buyer_link:string|null;shipping_vnd:number;discount_vnd:number;deposit_vnd:number;paid_vnd:number;subtotal_vnd:number;total_vnd:number;remaining_vnd:number;due_on:string|null;notes:string;status:OrderStatus;version:number;created_at:string;order_items:OrderItem[]};
export function totals(items:Pick<OrderItem,"quantity"|"unit_price_vnd">[],shipping:number,discount:number,deposit:number,paid:number){
 const values=[shipping,discount,deposit,paid,...items.flatMap(i=>[i.quantity,i.unit_price_vnd])];
 if(values.some(n=>!Number.isSafeInteger(n)||n<0)) throw new Error("Số tiền hoặc số lượng không hợp lệ.");
 const subtotal=items.reduce((s,i)=>s+BigInt(i.quantity)*BigInt(i.unit_price_vnd),BigInt(0));
 const total=subtotal+BigInt(shipping)-BigInt(discount);
 if(discount>Number(subtotal)||total<BigInt(0)||total>BigInt("1000000000000")||deposit>paid||BigInt(paid)>total)throw new Error("Giảm giá, tiền cọc hoặc thanh toán vượt giới hạn.");
 return {subtotal:Number(subtotal),total:Number(total),remaining:Number(total)-paid};
}
export function businessToday(){return new Intl.DateTimeFormat("en-CA",{timeZone:"Asia/Ho_Chi_Minh",year:"numeric",month:"2-digit",day:"2-digit"}).format(new Date());}
