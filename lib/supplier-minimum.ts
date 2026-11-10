export type MinimumItem={supplierId?:string;supplier:string;unitPrice:number;supplierMinimumPence?:number};
export function supplierMinimumShortfalls<T extends MinimumItem>(lines:{itemId:string;quantity:number}[],lookup:(id:string)=>T|undefined){
 const groups=new Map<string,{supplierId:string;supplier:string;minimumPence:number;subtotalPence:number;shortfallPence:number}>();
 for(const l of lines){const i=lookup(l.itemId);if(!i?.supplierId||!Number.isInteger(l.quantity)||l.quantity<1)continue;const g=groups.get(i.supplierId)||{supplierId:i.supplierId,supplier:i.supplier,minimumPence:0,subtotalPence:0,shortfallPence:0};g.minimumPence=Math.max(g.minimumPence,i.supplierMinimumPence||0);g.subtotalPence+=Math.round(i.unitPrice*100)*l.quantity;groups.set(i.supplierId,g);}
 return [...groups.values()].filter(g=>g.subtotalPence<g.minimumPence).map(g=>({...g,shortfallPence:g.minimumPence-g.subtotalPence}));
}
