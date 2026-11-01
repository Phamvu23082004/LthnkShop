export type ProductVariant={id:string;product_id:string;name:string;price_vnd:number;active:boolean};
export type Product={id:string;name:string;product_type:"diy_kit"|"finished_product";active:boolean;product_variants:ProductVariant[]};
