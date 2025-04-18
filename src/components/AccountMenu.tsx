import { supabase } from "@/lib/supabase";
import { useUser } from "@/hooks/useUser";
import { useRouter } from "next/router";

export default function AccountMenu() {
  const { user } = useUser();
  const router = useRouter();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  if (!user) return null;

  return (
    <div className="text-right mb-4">
      <p className="text-sm text-gray-600">Logged in as <span className="font-semibold">{user.email}</span></p>
      <button
        onClick={handleLogout}
        className="mt-2 text-sm text-red-500 hover:underline"
      >
        Logout
      </button>
    </div>
  );
}
