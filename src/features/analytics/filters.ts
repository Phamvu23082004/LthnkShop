import { parseFilters } from "@/features/orders/filters";
import { businessToday } from "@/features/orders/domain";
export type RevenueFilters={mode:string;value:string;from:string;to:string;start:string|null;end:string|null;label:string;error?:string};
export function parseRevenueFilters(params:Record<string,string|string[]|undefined>,today=businessToday()):RevenueFilters{
 const get=(key:string)=>typeof params[key]==="string"?params[key] as string:"";
 const mode=get("mode")||"all";
 const value=get("value")||(params.mode===undefined?today.slice(0,7):"");
 const raw={mode,value,from:get("from"),to:get("to")};
 const parsed=parseFilters(raw);
 const format=(date:string)=>date.split("-").reverse().join("/");
 let label="Tất cả thời gian";
 if(mode==="day")label="Ngày "+(value?format(value):"");
 if(mode==="month")label="Tháng "+value.split("-").reverse().join("/");
 if(mode==="year")label="Năm "+value;
 if(mode==="custom")label=format(raw.from)+" – "+format(raw.to);
 return {...raw,start:parsed.start??null,end:parsed.end??null,label,error:parsed.error};
}
