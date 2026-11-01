import { statusLabels,type OrderStatus } from "@/features/orders/domain";
import { statusPresentation } from "@/features/orders/presentation";
export function StatusBadge({status}:{status:OrderStatus}){
 const tone=statusPresentation[status]??statusPresentation.preparing;
 return <span className={"inline-flex max-w-full items-center gap-2 whitespace-normal break-words rounded-full border px-3 py-1 text-center text-xs font-medium "+tone.badge}><span aria-hidden="true" className={"size-1.5 shrink-0 rounded-full "+tone.dot}/>{statusLabels[status]??status}</span>;
}
