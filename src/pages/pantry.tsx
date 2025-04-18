import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useUser } from "@/hooks/useUser";
import { useRouter } from "next/router";
import NavBar from "@/components/NavBar";

type PantryItem = {
  id: string;
  ingredient: string;
  quantity: string | null;
};

export default function Pantry() {
  const { user, loading } = useUser();
  const router = useRouter();

  const [ingredients, setIngredients] = useState<PantryItem[]>([]);
  const [input, setInput] = useState("");
  const [quantity, setQuantity] = useState("");

  const [recipes, setRecipes] = useState<string[]>([]);
  const [loadingRecipes, setLoadingRecipes] = useState(false);

  useEffect(() => {
    if (!loading) {
      if (!user) {
        router.push("/login");
      } else {
        loadPantry();
      }
    }
  }, [user, loading]);

  const loadPantry = async () => {
    const { data, error } = await supabase
      .from("pantry")
      .select("id, ingredient, quantity")
      .eq("user_id", user!.id)
      .order("created_at", { ascending: false });

    if (error) console.error("Failed to fetch pantry:", error);
    setIngredients(data || []);
  };

  const addIngredient = async () => {
    if (!input.trim()) return;

    const { error } = await supabase.from("pantry").insert({
      user_id: user?.id,
      ingredient: input.trim(),
      quantity: quantity.trim() || null,
    });

    if (!error) {
      setInput("");
      setQuantity("");
      loadPantry();
    }
  };

  const deleteIngredient = async (id: string) => {
    const { error } = await supabase.from("pantry").delete().eq("id", id);
    if (!error) {
      setIngredients((prev) => prev.filter((item) => item.id !== id));
    }
  };

  const generateRecipes = async () => {
    const pantryIngredients = ingredients.map((item) => item.ingredient);
    if (pantryIngredients.length === 0) return;

    setLoadingRecipes(true);
    try {
      const res = await fetch("/api/suggest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ingredients: pantryIngredients }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Something went wrong");

      const parsed = data.recipes
        .split(/\n?\d\.\s+/)
        .filter(Boolean)
        .map((r: string) => r.trim());

      setRecipes(parsed);
    } catch (err: any) {
      console.error("Recipe generation error:", err);
    } finally {
      setLoadingRecipes(false);
    }
  };

  if (loading || !user) return null;

  return (
    <>
      <NavBar />
      <main className="max-w-md mx-auto py-10 px-4">
        <h1 className="text-2xl font-bold mb-6 text-center">🥦 My Pantry</h1>

        <div className="flex flex-col sm:flex-row gap-2 mb-4">
          <input
            type="text"
            placeholder="Ingredient"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            className="flex-1 border rounded px-3 py-2"
          />
          <input
            type="text"
            placeholder="Quantity (e.g. 2 cups)"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            className="flex-1 border rounded px-3 py-2"
          />
          <button
            onClick={addIngredient}
            className="bg-green-600 text-white px-4 py-2 rounded"
          >
            Add
          </button>
        </div>

        <ul className="space-y-2 text-gray-800 mb-6">
          {ingredients.map((item) => (
            <li
              key={item.id}
              className="flex justify-between items-center border p-2 rounded shadow-sm"
            >
              <span>
                <span className="font-semibold">{item.ingredient}</span>
                {item.quantity ? ` — ${item.quantity}` : ""}
              </span>
              <button
                onClick={() => deleteIngredient(item.id)}
                className="text-sm text-red-600 hover:text-red-800"
              >
                🗑️
              </button>
            </li>
          ))}
        </ul>

        <button
          onClick={generateRecipes}
          className="bg-blue-600 text-white w-full py-3 rounded hover:bg-blue-700 transition"
        >
          🍳 Generate Recipes Based on My Pantry
        </button>

        {loadingRecipes && (
          <p className="mt-6 text-blue-500 text-center animate-pulse">Thinking... 🧠</p>
        )}

        {recipes.length > 0 && (
          <div className="mt-8 space-y-6">
            <h2 className="text-xl font-bold mb-4 text-center">🍽️ Suggested Recipes</h2>
            {recipes.map((recipe, idx) => {
  const title = recipe.split("-")[0].trim();

  return (
    <div
      key={idx}
      className="bg-white border rounded-lg p-4 shadow-sm hover:shadow-md transition"
    >
      <h3 className="font-semibold text-lg text-green-700 mb-2">
        Recipe {idx + 1}: {title}
      </h3>
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
        <p className="text-sm text-gray-500">Log in to save this recipe ⭐</p>
      )}
    </div>
  );
})}

          </div>
        )}
      </main>
    </>
  );
}
