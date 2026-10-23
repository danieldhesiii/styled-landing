import { redirect } from "next/navigation";
export default function Page() {
  redirect("/design?tab=orders&bookings=venues");
}
