import type { OrderStatus } from "@/features/orders/domain";
export const statusPresentation:Record<OrderStatus,{row:string;badge:string;dot:string}>={
 preparing:{row:"bg-amber-100 hover:bg-amber-200",badge:"border-amber-300 bg-amber-100 text-amber-950",dot:"bg-amber-700"},
 producing:{row:"bg-red-100 hover:bg-red-200",badge:"border-red-300 bg-red-100 text-red-950",dot:"bg-red-700"},
 completed:{row:"bg-emerald-100 hover:bg-emerald-200",badge:"border-emerald-300 bg-emerald-100 text-emerald-950",dot:"bg-emerald-700"},
 cancelled:{row:"bg-stone-100/70 hover:bg-stone-100",badge:"border-stone-300 bg-stone-100 text-stone-700",dot:"bg-stone-500"},
};
