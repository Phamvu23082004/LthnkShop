import { dateSchema } from "./schema";
import { statuses } from "./domain";
export type Filters={sort:"due_asc"|"due_desc"|"newest";dateField:"ordered_on"|"due_on";q:string;mode:string;value:string;from:string;to:string;status:string;order_type:"all"|"diy_kit"|"finished_product";sales_platform:""|"tiktok"|"instagram";page:number;start?:string;end?:string;error?:string};
export function parseFilters(params:Record<string,string|string[]|undefined>):Filters{
 const get=(key:string)=>typeof params[key]==="string"?params[key] as string:"";
 const f:Filters={sort:get("sort")==="due_desc"?"due_desc":get("sort")==="newest"?"newest":"due_asc",dateField:get("dateField")==="due_on"?"due_on":"ordered_on",q:get("q").trim().slice(0,100),mode:get("mode")||"all",value:get("value"),from:get("from"),to:get("to"),status:get("status"),order_type:get("order_type")==="diy_kit"||get("order_type")==="finished_product"?get("order_type") as "diy_kit"|"finished_product":"all",sales_platform:get("sales_platform")==="tiktok"||get("sales_platform")==="instagram"?get("sales_platform") as "tiktok"|"instagram":"",page:Math.max(1,Math.min(100000,Number(get("page"))||1))};
 const next=(v:string)=>{const d=new Date(v+"T00:00:00Z");d.setUTCDate(d.getUTCDate()+1);return d.toISOString().slice(0,10);};
 if(!Number.isInteger(f.page))f.page=1;
 if(f.status&&!statuses.includes(f.status as typeof statuses[number]))f.error="Trạng thái lọc không hợp lệ.";
 if(f.mode==="all")return f;
 if(f.mode==="day"&&dateSchema.safeParse(f.value).success){f.start=f.value;f.end=next(f.value);}
 else if(f.mode==="month"&&/^\d{4}-(0[1-9]|1[0-2])$/.test(f.value)&&dateSchema.safeParse(f.value+"-01").success){
 f.start=f.value+"-01";const d=new Date(f.start+"T00:00:00Z");d.setUTCMonth(d.getUTCMonth()+1);f.end=d.toISOString().slice(0,10);
 }else if(f.mode==="year"&&/^(20\d{2}|2100)$/.test(f.value)){f.start=f.value+"-01-01";f.end=(Number(f.value)+1)+"-01-01";}
 else if(f.mode==="custom"&&dateSchema.safeParse(f.from).success&&dateSchema.safeParse(f.to).success&&f.from<=f.to){f.start=f.from;f.end=next(f.to);}
 else f.error="Chọn khoảng thời gian hợp lệ (từ ngày không sau đến ngày).";
 return f;
}
export function orderFiltersHref(f:Filters,orderType=f.order_type){const p=new URLSearchParams();for(const k of ["sort","dateField","q","mode","value","from","to","status","sales_platform"] as const)if(f[k])p.set(k,f[k]);if(orderType!=="all")p.set("order_type",orderType);return "/orders"+(p.size?"?"+p.toString():"");}
export function pageHref(f:Filters,page:number){const href=orderFiltersHref(f);return href+(href.includes("?")?"&":"?")+"page="+page;}
