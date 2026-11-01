"use client";
import { useActionState,useEffect,useId,useLayoutEffect,useRef,useState } from "react";
import { createPortal } from "react-dom";
import { changeStatus,type OrderActionState } from "@/features/orders/actions";
import { statuses,statusLabels,type OrderStatus } from "@/features/orders/domain";
import { StatusBadge } from "@/components/orders/status-badge";
import { Button } from "@/components/ui/button";

const openMenuEvent="lthnk:open-order-status-menu";
type Position={left:number;top:number;width:number;maxHeight:number};
export function StatusForm({id,version,status,onOptimisticStatus}:{id:string;version:number;status:OrderStatus;onOptimisticStatus?:(status:OrderStatus)=>void}){
 const formId=useId();
 const triggerRef=useRef<HTMLButtonElement>(null);
 const menuRef=useRef<HTMLDivElement>(null);
 const [open,setOpen]=useState(false);
 const [position,setPosition]=useState<Position|null>(null);
 const [selected,setSelected]=useState<OrderStatus>(status);
 const [state,action,pending]=useActionState(async(previous:OrderActionState,form:FormData)=>{
  onOptimisticStatus?.(form.get("status") as OrderStatus);
  return changeStatus(previous,form);
 },{} as OrderActionState);

 useEffect(()=>{
  if(!open)return;
  const closeOther=(event:Event)=>{
   if((event as CustomEvent<string>).detail!==formId)setOpen(false);
  };
  const outside=(event:PointerEvent)=>{
   const target=event.target as Node;
   if(!triggerRef.current?.contains(target)&&!menuRef.current?.contains(target))setOpen(false);
  };
  const keyboard=(event:KeyboardEvent)=>{
   if(event.key==="Escape"){setOpen(false);triggerRef.current?.focus();}
  };
  window.addEventListener(openMenuEvent,closeOther);
  document.addEventListener("pointerdown",outside);
  document.addEventListener("keydown",keyboard);
  return ()=>{
   window.removeEventListener(openMenuEvent,closeOther);
   document.removeEventListener("pointerdown",outside);
   document.removeEventListener("keydown",keyboard);
  };
 },[open,formId]);

 useLayoutEffect(()=>{
  if(!open||!menuRef.current||!triggerRef.current)return;
  const place=()=>{
   const panel=menuRef.current;
   const trigger=triggerRef.current;
   if(!panel||!trigger)return;
   const margin=8;
   const width=Math.min(288,window.innerWidth-margin*2);
   const maxHeight=Math.max(120,window.innerHeight-margin*2);
   panel.style.width=`${width}px`;
   panel.style.maxHeight=`${maxHeight}px`;
   const rect=trigger.getBoundingClientRect();
   const menu=panel.getBoundingClientRect();
   const left=rect.right+width<=window.innerWidth-margin?rect.left:rect.right-width;
   const safeLeft=Math.max(margin,Math.min(left,window.innerWidth-width-margin));
   const below=window.innerHeight-rect.bottom-margin;
   const above=rect.top-margin;
   const top=menu.height<=below||below>=above?rect.bottom+4:rect.top-menu.height-4;
   const safeTop=Math.max(margin,Math.min(top,window.innerHeight-menu.height-margin));
   setPosition({left:safeLeft,top:safeTop,width,maxHeight});
  };
  setPosition(null);
  place();
  window.addEventListener("resize",place);
  window.addEventListener("scroll",place,true);
  return ()=>{
   window.removeEventListener("resize",place);
   window.removeEventListener("scroll",place,true);
  };
 },[open,state.error]);

 const toggle=()=>{
  if(open){setOpen(false);return;}
  window.dispatchEvent(new CustomEvent(openMenuEvent,{detail:formId}));
  setOpen(true);
 };
 if(status==="cancelled")return <StatusBadge status={status}/>;
 return <>
  <form id={formId} action={action} aria-busy={pending} className="block w-full min-w-0 max-w-full space-y-2" onSubmit={()=>setOpen(false)}>
   <input type="hidden" name="id" value={id}/><input type="hidden" name="version" value={version}/><input type="hidden" name="status" value={selected}/>
   <button ref={triggerRef} type="button" aria-haspopup="true" aria-expanded={open} aria-controls={open?`${formId}-menu`:undefined} onClick={toggle} disabled={pending} className="block max-w-full rounded-full text-left focus-visible:outline-2 focus-visible:outline-primary">
    <StatusBadge status={status}/>
   </button>
   {selected!==status&&<>
    <label className="block min-w-0 text-xs">{selected==="cancelled"?"Lý do hủy (bắt buộc)":"Ghi chú thay đổi"}<input name="reason" className="field mt-1 w-full min-w-0 max-w-full" disabled={pending} required={selected==="cancelled"} minLength={selected==="cancelled"?3:0} maxLength={1000}/></label>
    {selected==="cancelled"&&<label className="flex min-w-0 gap-2 text-xs leading-5"><input type="checkbox" name="confirmed" required disabled={pending}/>Tôi xác nhận hủy đơn; không tự hoàn tiền.</label>}
    {selected==="cancelled"&&<Button type="button" variant="outline" size="sm" className="w-full min-w-0 max-w-full whitespace-normal" disabled={pending} onClick={()=>setSelected(status)}>Bỏ hủy</Button>}
    <Button size="sm" className="w-full min-w-0 max-w-full whitespace-normal" disabled={pending}>{pending?"Đang lưu…":selected==="cancelled"?"Xác nhận hủy":"Lưu trạng thái"}</Button>
   </>}
   {pending&&<p role="status" className="text-xs text-stone-600">Đang lưu vào hệ thống…</p>}
   {state.error&&<p role="alert" className="text-xs leading-5 text-red-800">{state.error}</p>}
   {!pending&&state.success&&<p role="status" className="text-xs text-green-800">{state.success}</p>}
  </form>
  {open&&typeof document!=="undefined"&&createPortal(
   <div ref={menuRef} id={`${formId}-menu`} role="group" aria-label="Thay đổi trạng thái đơn hàng" className="fixed z-[100] overflow-y-auto rounded-xl border border-stone-200 bg-white p-2 shadow-xl" style={{left:position?.left??0,top:position?.top??0,width:position?.width??288,maxHeight:position?.maxHeight??"calc(100dvh - 1rem)",visibility:position?"visible":"hidden"}}>
    {statuses.map(option=><button key={option} type="button" disabled={pending||option===status} onClick={()=>{setSelected(option);setOpen(false);}} className="block w-full rounded-lg px-3 py-2 text-left text-sm hover:bg-stone-100 focus-visible:bg-stone-100 focus-visible:outline-none disabled:cursor-default disabled:font-semibold disabled:text-stone-500">{statusLabels[option]}</button>)}
    <div className="my-1 border-t border-stone-100"/>
    <button type="button" disabled={pending} onClick={()=>{setSelected("cancelled");setOpen(false);}} className="block w-full rounded-lg px-3 py-2 text-left text-sm text-red-800 hover:bg-red-50 focus-visible:bg-red-50 focus-visible:outline-none">Hủy đơn</button>
   </div>,document.body
  )}
 </>;
}