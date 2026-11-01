import type { OrderStatus } from "@/features/orders/domain";
export const statusPresentation:Record<OrderStatus,{row:string;badge:string;dot:string}>={
 preparing:{row:"bg-amber-50/60 hover:bg-amber-50",badge:"border-amber-200 bg-amber-50 text-amber-900",dot:"bg-amber-600"},
 producing:{row:"bg-red-50/60 hover:bg-red-50",badge:"border-red-200 bg-red-50 text-red-900",dot:"bg-red-600"},
 completed:{row:"bg-emerald-50/60 hover:bg-emerald-50",badge:"border-emerald-200 bg-emerald-50 text-emerald-900",dot:"bg-emerald-600"},
 cancelled:{row:"bg-stone-100/70 hover:bg-stone-100",badge:"border-stone-300 bg-stone-100 text-stone-700",dot:"bg-stone-500"},
};
