import {timingSafeEqual} from "node:crypto";
import {NextResponse} from "next/server";
import {createAdminClient} from "@/lib/supabase/admin";
import {dispatchBookingNotifications,bookingEmailEnabled} from "@/lib/server/booking-notifications";
import {dispatchVenueConversationNotifications} from "@/lib/server/venue-conversation-notifications";
export const dynamic="force-dynamic";
export const maxDuration=60;
export async function GET(req:Request){const secret=process.env.CRON_SECRET,provided=req.headers.get("authorization")||"",expected=`Bearer ${secret||""}`;if(!secret||provided.length!==expected.length||!timingSafeEqual(Buffer.from(provided),Buffer.from(expected)))return NextResponse.json({error:"Unauthorized."},{status:401});if(!bookingEmailEnabled())return NextResponse.json({ok:true,processed:0,sendingEnabled:false});const admin=createAdminClient();const bookings=await dispatchBookingNotifications(admin);const venues=await dispatchVenueConversationNotifications(admin);return NextResponse.json({ok:true,...bookings,venueNotifications:venues});}
