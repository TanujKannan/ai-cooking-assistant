import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { useUser } from "@/hooks/useUser";
import NavBar from "@/components/NavBar";

// 🧱 Type definition for structured GPT recipes
type Recipe = {
  title: string;
  summary: string;
  instructions: string[];
  substitutes: string[];
};

export default function Home() {
  const { user } = useUser();

  const [input, setInput] = useState("");
  const [recipes, setRecipes] = useState<Recipe[]>([]);
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

      const parsed: Recipe[] = JSON.parse(data.recipes);
      setRecipes(parsed);

      if (user && user.id) {
        for (const recipe of parsed) {
          const { error } = await supabase.from("recipe_history").insert({
            user_id: user.id,
            recipe_title: recipe.title,
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

        {recipes.length > 0 && (
          <div className="mt-8 space-y-6">
            <h2 className="text-xl font-bold mb-4 text-center">🍽️ Recipes</h2>
            {recipes.map((recipe, idx) => (
              <div
                key={idx}
                className="bg-white border rounded-lg p-4 shadow-sm hover:shadow-md transition"
              >
                <h3 className="font-semibold text-lg text-green-700 mb-1">
                  {recipe.title}
                </h3>
                <p className="text-gray-600 mb-2">{recipe.summary}</p>

                <h4 className="font-semibold text-sm text-gray-700 mb-1">Instructions:</h4>
                <ul className="list-disc pl-5 mb-2 text-gray-800 text-sm space-y-1">
                  {recipe.instructions.map((step, i) => (
                    <li key={i}>{step}</li>
                  ))}
                </ul>

                {recipe.substitutes.length > 0 && (
                  <>
                    <h4 className="font-semibold text-sm text-gray-700 mb-1">Substitutes:</h4>
                    <ul className="list-disc pl-5 mb-2 text-gray-800 text-sm">
                      {recipe.substitutes.map((sub, i) => (
                        <li key={i}>{sub}</li>
                      ))}
                    </ul>
                  </>
                )}

                {user ? (
                  <button
                    onClick={async () => {
                      const { error } = await supabase.from("favorites").insert({
                        user_id: user.id,
                        recipe_title: recipe.title,
                        recipe_text: JSON.stringify(recipe),
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
            ))}
          </div>
        )}
      </main>
    </>
  );
}
