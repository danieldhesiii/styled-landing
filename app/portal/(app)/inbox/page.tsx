import Inbox from "@/components/messages/Inbox";
import SupplierOrderInbox from "@/components/vendor/SupplierOrderInbox";
export default function SupplierInbox() {
  return <><SupplierOrderInbox /><Inbox supplier /></>;
}
