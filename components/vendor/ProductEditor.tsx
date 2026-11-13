"use client";
import {useState} from "react";
import {VENDOR_CATEGORIES} from "@/lib/vendor-categories";
import {productInput,type ProductDraft} from "@/lib/supplier-workspace";

export default function ProductEditor({initial,isNew,onSave,onCancel,initialPhoto}:{
  initial:ProductDraft;isNew:boolean;onSave:(draft:ProductDraft,photo?:string)=>Promise<void>;onCancel:()=>void;initialPhoto?:string|null;
}) {
  const [draft,setDraft]=useState(initial);
  const [photo,setPhoto]=useState<string>();
  const [busy,setBusy]=useState(false);
  const [reading,setReading]=useState(false);
  const [error,setError]=useState("");
  const field="mt-2 min-h-12 w-full rounded-xl border border-sand bg-white px-4 py-3 text-base focus:outline-clay";
  function set(key:keyof ProductDraft,value:unknown){setDraft(d=>({...d,[key]:value}));}
  return <form className="my-7 rounded-2xl border border-sand bg-white p-5 sm:p-8" onSubmit={async e=>{
    e.preventDefault();setError("");
    if(!productInput(draft)){setError("Check the product name, price and quantity.");return;}
    setBusy(true);
    try {await onSave(draft,photo);}catch(e){setError(e instanceof Error?e.message:"Could not save. Please retry.");}
    finally{setBusy(false);}
  }}>
    <div className="mb-7 flex items-center justify-between gap-4"><h2 className="font-serif text-3xl">{isNew?"Add a product":"Edit product"}</h2><button type="button" disabled={busy} onClick={onCancel} className="min-h-11 text-sm underline">Cancel</button></div>
    <fieldset disabled={busy} className="grid gap-7 md:grid-cols-[minmax(0,1fr)_minmax(0,1.5fr)]">
      <div>
        <label className="flex min-h-64 cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-ink/25 bg-cream/50 p-5 text-center">
          {photo||initialPhoto?<img src={photo||initialPhoto||""} alt="Product preview" className="mb-4 h-52 w-full object-contain"/>:<span aria-hidden="true" className="mb-4 font-serif text-5xl text-clay">+</span>}
          <span className="text-sm font-medium">{reading?"Reading photo…":photo||initialPhoto?"Change photo":"Choose product photo"}</span>
          <span className="mt-2 text-xs text-ink/50">JPEG, PNG or WebP, up to 5 MB</span>
          <input type="file" aria-label="Product photo" accept="image/jpeg,image/png,image/webp" disabled={reading} className="sr-only" onChange={async e=>{
            const file=e.target.files?.[0];if(!file)return;
            if(!["image/jpeg","image/png","image/webp"].includes(file.type)||file.size>5*1024*1024){setError("Choose a JPEG, PNG or WebP photo up to 5 MB.");return;}
            setReading(true);setError("");
            try {setPhoto(await new Promise<string>((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(String(reader.result));reader.onerror=()=>reject(Error("Could not read this photo."));reader.readAsDataURL(file);}));}
            catch(e){setError(e instanceof Error?e.message:"Could not read photo.");}
            finally{setReading(false);}
          }}/>
        </label>
        <p className="mt-3 text-xs leading-relaxed text-ink/55">Use a clear photo of the product. You can save a draft and add its photo later.</p>
      </div>
      <div className="space-y-5">
        <label className="block text-sm">Product name<input autoFocus required maxLength={160} className={field} value={draft.name} onChange={e=>set("name",e.target.value)} placeholder="For example, Rustic trestle table"/></label>
        <label className="block text-sm">Category<select aria-label="Category" className={field} value={draft.category} onChange={e=>set("category",e.target.value)}>{VENDOR_CATEGORIES.map(c=><option key={c.value} value={c.value}>{c.label}</option>)}</select></label>
        <label className="block text-sm">Description<textarea maxLength={500} rows={4} className={field} value={draft.note} onChange={e=>set("note",e.target.value)} placeholder="What is included, and what makes this product special?"/></label>
        <div className="grid grid-cols-2 gap-4">
          <label className="block text-sm">Price (£)<input inputMode="decimal" required className={field} value={draft.unitPrice} onChange={e=>set("unitPrice",e.target.value.replace(/^0+(?=\d)/,""))} placeholder="125.00"/></label>
          <label className="block text-sm">Price is for<input required maxLength={40} className={field} value={draft.unit} onChange={e=>set("unit",e.target.value)} placeholder="Each or package"/></label>
        </div>
      </div>
    </fieldset>
    <details className="mt-7 border-t border-sand pt-5">
      <summary className="min-h-11 cursor-pointer text-sm font-medium">Stock, delivery and product details</summary>
      <fieldset disabled={busy} className="mt-4 grid gap-5 sm:grid-cols-2">
        <label className="text-sm">Units available<input inputMode="numeric" className={field} value={draft.capacity} onChange={e=>set("capacity",e.target.value.replace(/^0+(?=\d)/,""))} placeholder="Leave blank for made to order"/></label>
        <label className="text-sm">Notice needed (days)<input inputMode="numeric" className={field} value={draft.leadTimeDays} onChange={e=>set("leadTimeDays",e.target.value)} placeholder="No minimum set"/></label>
        <label className="text-sm">Suggested quantity<select aria-label="Suggested quantity" className={field} value={draft.qtyRule} onChange={e=>set("qtyRule",e.target.value)}><option value="fixed">One item or package</option><option value="per_guest">One per guest</option><option value="per_table">One per table</option><option value="per_venue">One per venue</option></select></label>
        {Object.entries({dimensions:"Dimensions",material:"Material / finish",hireUnits:"What is included",deliveryTerms:"Delivery and setup",damageTerms:"Damage and returns"}).map(([key,label])=><label key={key} className="text-sm">{label}<textarea rows={2} maxLength={["deliveryTerms","damageTerms"].includes(key)?1500:200} className={field} value={draft.details[key as keyof typeof draft.details]} onChange={e=>set("details",{...draft.details,[key]:e.target.value})}/></label>)}
      </fieldset>
    </details>
    {error&&<p role="alert" className="mt-5 text-sm text-red-700">{error}</p>}
    <div className="mt-7 flex flex-wrap items-center gap-4"><button disabled={busy||reading} className="min-h-12 rounded-full bg-ink px-7 py-3 text-sm text-cream disabled:opacity-40">{busy?"Saving product…":isNew?"Save product":"Save changes"}</button><span className="text-xs text-ink/50">Saved privately until your range is approved.</span></div>
  </form>;
}
