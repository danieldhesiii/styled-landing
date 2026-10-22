import AdminVenues from "@/components/venues/AdminVenues";
export default async function VenueEnquiriesPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <AdminVenues initialId={id} />;
}
