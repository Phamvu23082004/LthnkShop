type ItemSummary={product_name:string;variant:string|null;quantity:number};
export function OrderItemsSummary({items}:{items:ItemSummary[]}){
 if(items.length===0)return <span className="text-stone-400">—</span>;
 return <ul className="min-w-0 max-w-full space-y-2">
  {items.map((item,index)=><li key={index} className="min-w-0 break-words">
   <span className="block break-words font-medium">{item.product_name}</span>
   <span className="block break-words text-xs text-stone-600">{item.variant&&<>{item.variant} </>}× {item.quantity}</span>
  </li>)}
 </ul>;
}
