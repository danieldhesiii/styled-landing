import GuestSession from "@/components/session/GuestSession";

// Gives everything under /design a guest session without touching the page.
export default function DesignLayout({ children }: { children: React.ReactNode }) {
  return <GuestSession>{children}</GuestSession>;
}
