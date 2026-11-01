import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";
const buttonVariants=cva("inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-[10px] text-sm font-medium transition-colors outline-offset-4 focus-visible:outline-2 focus-visible:outline-primary disabled:pointer-events-none disabled:opacity-50",{
 variants:{variant:{default:"bg-primary text-white hover:bg-[#714d3a]",outline:"border border-stone-300 bg-white text-foreground hover:bg-stone-50"},size:{default:"min-h-11 px-4 py-2",sm:"min-h-10 px-3 py-2 sm:min-h-9 sm:py-1"}},defaultVariants:{variant:"default",size:"default"}});
function Button({className,variant,size,asChild=false,...props}:React.ComponentProps<"button">&VariantProps<typeof buttonVariants>&{asChild?:boolean}) {
 const Comp=asChild?Slot:"button";return <Comp data-slot="button" className={cn(buttonVariants({variant,size,className}))} {...props}/>;
}
export {Button,buttonVariants};
