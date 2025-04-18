import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { useUser } from "@/hooks/useUser";
import NavBar from "@/components/NavBar";

export default function Home() {
  const { user } = useUser();

  const [input, setInput] = useState("");
  const [recipes, setRecipes] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setRecipes([]);

    const ingredients = input
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);

    if (ingredients.length === 0) {
      setError("Please enter at least one ingredient.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/suggest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ingredients }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Something went wrong");

      const parsedRecipes = data.recipes
        .split(/\n?\d\.\s+/)
        .filter(Boolean)
        .map((r: string) => r.trim());

      setRecipes(parsedRecipes);

      if (user && user.id) {
        for (const recipe of parsedRecipes) {
          const title = recipe.split("-")[0].trim();
          const { error } = await supabase.from("recipe_history").insert({
            user_id: user.id,
            recipe_title: title,
            ingredients_used: input,
          });
          if (error) {
            console.error("Failed to insert recipe history:", error);
          }
        }
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <NavBar />
      <main className="max-w-2xl mx-auto py-10 px-4 font-sans">
        <h1 className="text-4xl font-bold mb-6 text-center text-green-700">
          🥘 AI Cooking Assistant
        </h1>

        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="e.g., chicken, tomato, garlic"
            className="w-full border border-gray-300 rounded px-4 py-3 focus:outline-none focus:ring-2 focus:ring-green-500"
          />
          <button
            type="submit"
            className="bg-green-600 text-white px-6 py-3 rounded hover:bg-green-700 transition"
          >
            🍳 Get Recipes
          </button>
        </form>

        {loading && (
          <p className="mt-6 text-blue-500 text-center animate-pulse">
            Thinking... 🧠
          </p>
        )}

        {error && <p className="mt-6 text-red-500 text-center">{error}</p>}

        <div className="mt-8 space-y-6">
          {recipes.map((recipe, idx) => {
            const title = recipe.split("-")[0].trim();
            return (
              <div
                key={idx}
                className="bg-white border rounded-lg p-4 shadow-sm hover:shadow-md transition"
              >
                <h2 className="font-semibold text-lg text-green-700 mb-2">
                  🍽️ Recipe {idx + 1}: {title}
                </h2>
                <p className="text-gray-700 leading-relaxed mb-4">{recipe}</p>
                {user ? (
                  <button
                    onClick={async () => {
                      const { error } = await supabase.from("favorites").insert({
                        user_id: user.id,
                        recipe_title: title,
                        recipe_text: recipe,
                      });

                      if (error) {
                        console.error("Error saving favorite:", error);
                        alert("Failed to save favorite");
                      } else {
                        alert("⭐ Saved to favorites!");
                      }
                    }}
                    className="text-sm px-4 py-2 bg-yellow-400 text-black rounded hover:bg-yellow-500"
                  >
                    ⭐ Save to Favorites
                  </button>
                ) : (
                  <p className="text-sm text-gray-500">
                    Log in to save this recipe ⭐
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </main>
    </>
  );
}