import Link from "next/link";
import { WifiOff } from "lucide-react";

export default function OfflinePage() {
  return (
    <main className="offline-page">
      <WifiOff size={40} />
      <h1>You are offline</h1>
      <p>Zola needs a connection for live referral updates. Check your network and try again.</p>
      <Link href="/" className="button">
        Retry
      </Link>
    </main>
  );
}
