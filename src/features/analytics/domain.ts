import { z } from "zod";
const integer=z.string().regex(/^\d+$/);
const moneyFields={order_value:integer,received:integer,deposits:integer,outstanding:integer};
export const reportSchema=z.object({
 summary:z.object({...moneyFields,orders:integer,processing:integer,completed:integer,cancelled:integer,completed_value:integer,cancelled_received:integer,undated:integer}),
 monthly:z.array(z.object({month:z.string().regex(/^\d{4}-\d{2}$/),...moneyFields})),
 bestsellers:z.array(z.object({product_name:z.string(),product_type:z.enum(["diy_kit","finished_product"]),quantity:integer,item_value:integer})),
 excluded_undated:integer
});
export type RevenueReport=z.infer<typeof reportSchema>;
export type RevenueSeries=keyof typeof moneyFields;
const currency=new Intl.NumberFormat("vi-VN",{style:"currency",currency:"VND",maximumFractionDigits:0});
const count=new Intl.NumberFormat("vi-VN",{maximumFractionDigits:0});
export function money(value:string){return currency.format(BigInt(value));}
export function quantity(value:string){return count.format(BigInt(value));}
export function barPercent(value:string,max:string){return BigInt(max)===BigInt(0)?0:Number(BigInt(value)*BigInt(10000)/BigInt(max))/100;}
