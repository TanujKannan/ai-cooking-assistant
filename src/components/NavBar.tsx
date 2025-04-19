import Link from "next/link";
import { useUser } from "@/hooks/useUser";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/router";

export default function NavBar() {
  const { user } = useUser();
  const router = useRouter();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  return (
    <nav className="bg-green-100 border-b border-green-200 px-4 py-3 mb-6 shadow-sm">
      <div className="max-w-4xl mx-auto flex justify-between items-center">
        <div className="flex gap-4 items-center text-green-800 font-medium">
          <Link href="/" className="hover:underline">
            🏠 Generate Recipe
          </Link>
          <Link href="/pantry" className="hover:underline">
            🧺 Pantry
          </Link>
          <Link href="/dashboard" className="hover:underline">
            📊 Dashboard
          </Link>
          <Link href="/receipts" className="hover:underline">
            🧾 Receipts
          </Link>
          <Link href="/nearby" className="hover:underline">
           📍 Find spots
          </Link>
        </div>

        {user && (
          <button
            onClick={handleLogout}
            className="text-sm text-red-600 hover:text-red-800"
          >
            🔐 Logout
          </button>
        )}
      </div>
    </nav>
  );
}
