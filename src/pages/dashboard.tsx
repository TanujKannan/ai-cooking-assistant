import { useEffect, useState } from "react";
import { useUser } from "@/hooks/useUser";
import { useRouter } from "next/router";
import { supabase } from "@/lib/supabase";
import NavBar from "@/components/NavBar";
import AccountMenu from "@/components/AccountMenu";

type RecipeHistory = {
  id: string;
  recipe_title: string;
  ingredients_used: string;
  created_at: string;
};
type Favorite = {
  id: string;
  recipe_title: string;
  created_at: string;
};

export default function Dashboard() {
  const { user, loading } = useUser();
  const router = useRouter();

  const [history, setHistory] = useState<RecipeHistory[]>([]);
  const [favorites, setFavorites] = useState<Favorite[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(true);

  useEffect(() => {
    if (!loading) {
      if (!user) {
        router.push("/login");
      } else {
        loadData();
      }
    }
  }, [user, loading]);

  const loadData = async () => {
    setIsLoadingData(true);

    const { data: hist, error: histError } = await supabase
      .from("recipe_history")
      .select("*")
      .eq("user_id", user!.id)
      .order("created_at", { ascending: false });

    const { data: favs, error: favError } = await supabase
      .from("favorites")
      .select("*")
      .eq("user_id", user!.id)
      .order("created_at", { ascending: false });

    if (histError) console.error("Error fetching history:", histError);
    if (favError) console.error("Error fetching favorites:", favError);

    setHistory(hist || []);
    setFavorites(favs || []);
    setIsLoadingData(false);
  };

  if (loading || isLoadingData || !user) {
    return <p className="text-center mt-10">Loading your dashboard...</p>;
  }

  return (
    <>
      <NavBar />
      <main className="max-w-2xl mx-auto py-10 px-4">
        <h1 className="text-3xl font-bold mb-6">📊 Dashboard</h1>

        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-2">⭐ Favorites</h2>
          {favorites.length === 0 ? (
            <p className="text-gray-500">No favorites yet.</p>
          ) : (
            <ul className="space-y-3">
              {favorites.map((fav) => (
                <li
                  key={fav.id}
                  className="bg-white border rounded p-3 flex justify-between items-center"
                >
                  <div className="flex flex-col">
                    <p className="font-medium text-green-700">{fav.recipe_title}</p>
                    <p className="text-sm text-gray-500">
                      {new Date(fav.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <button
                    onClick={async () => {
                      await supabase.from("favorites").delete().eq("id", fav.id);
                      setFavorites((prev) => prev.filter((f) => f.id !== fav.id));
                    }}
                    className="text-sm text-red-600 hover:text-red-800"
                  >
                    🗑️
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-2">🕓 Recent Recipes</h2>
          {history.length === 0 ? (
            <p className="text-gray-500">No history yet.</p>
          ) : (
            <ul className="space-y-3">
              {history.map((rec) => (
                <li
                  key={rec.id}
                  className="bg-white border rounded p-3 flex justify-between items-center"
                >
                  <div className="flex flex-col">
                    <p className="font-medium text-gray-800">{rec.recipe_title}</p>
                    <p className="text-sm text-gray-500">
                      {new Date(rec.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <button
                    onClick={async () => {
                      await supabase.from("recipe_history").delete().eq("id", rec.id);
                      setHistory((prev) => prev.filter((h) => h.id !== rec.id));
                    }}
                    className="text-sm text-red-600 hover:text-red-800"
                  >
                    🗑️
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>
    </>
  );
}