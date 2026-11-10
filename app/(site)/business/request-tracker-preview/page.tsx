import {redirect} from "next/navigation";

export const dynamic="force-dynamic";
export const metadata={robots:{index:false,follow:false}};
// Old demonstration bookmarks now enter the existing server-guarded staff area.
export default function Page(){redirect("/admin/requests");}
