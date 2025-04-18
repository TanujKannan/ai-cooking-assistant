import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useUser } from "@/hooks/useUser";
import { useRouter } from "next/router";
import NavBar from "@/components/NavBar";

// 🧱 Type Definitions

type PantryItem = {
  id: string;
  ingredient: string;
  quantity: string | null;
};

type Recipe = {
  title: string;
  summary: string;
  instructions: string[];
  substitutes: string[];
};

export default function Pantry() {
  const { user, loading } = useUser();
  const router = useRouter();

  const [ingredients, setIngredients] = useState<PantryItem[]>([]);
  const [input, setInput] = useState("");
  const [quantity, setQuantity] = useState("");

  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [loadingRecipes, setLoadingRecipes] = useState(false);
  const [shoppingList, setShoppingList] = useState<
    { ingredient: string; recipes: string[] }[]
  >([]);
  const [quantities, setQuantities] = useState<Record<string, string>>({});

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

  const extractIngredientsWithGPT = async (recipeText: string): Promise<string[]> => {
    const res = await fetch("/api/extract-ingredients", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ recipe: recipeText }),
    });

    const data = await res.json();
    return data.ingredients || [];
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

      const raw = data.recipes || "";
      const cleaned = raw
        .replace(/```json\n?|```/gi, "")
        .replace(/^json\n?|^json/gi, "")
        .trim();

      const parsed: Recipe[] = JSON.parse(cleaned);
      setRecipes(parsed);

      const ingredientMap: Record<string, Set<string>> = {};

      for (const recipe of parsed) {
        const extracted = await extractIngredientsWithGPT(
          `${recipe.title}: ${recipe.instructions.join(" ")}`
        );

        for (const ing of extracted.map((i) => i.toLowerCase())) {
          if (!pantryIngredients.map((i) => i.toLowerCase()).includes(ing)) {
            if (!ingredientMap[ing]) {
              ingredientMap[ing] = new Set();
            }
            ingredientMap[ing].add(recipe.title);
          }
        }
      }

      setShoppingList(
        Object.entries(ingredientMap).map(([ingredient, recipes]) => ({
          ingredient,
          recipes: Array.from(recipes),
        }))
      );
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
              </div>
            ))}
          </div>
        )}

        {shoppingList.length > 0 && (
          <div className="mt-10">
            <h2 className="text-xl font-bold mb-2 text-center">🛒 Shopping List</h2>
            <p className="text-sm text-gray-600 text-center mb-4">
              These are ingredients used in the suggested recipes but not found in your pantry.
              Consider adding them to make the dishes!
            </p>

            <ul className="list-disc pl-6 space-y-2 text-gray-800 mb-3">
            {shoppingList.map((item, idx) => {
                const qty = quantities[item.ingredient] || "";

                const handleQtyChange = (e: React.ChangeEvent<HTMLInputElement>) => {
                    setQuantities((prev) => ({
                    ...prev,
                    [item.ingredient]: e.target.value,
                    }));
                };

                const addToPantry = async () => {
                    const { error } = await supabase.from("pantry").insert({
                    user_id: user?.id,
                    ingredient: item.ingredient,
                    quantity: qty || null,
                    });
                    if (error) {
                    console.error("Failed to add to pantry:", error);
                    alert("Error adding to pantry");
                    } else {
                    alert(`${item.ingredient} added to pantry`);
                    loadPantry();
                    setQuantities((prev) => ({ ...prev, [item.ingredient]: "" }));
                    }
                };

                return (
                    <li key={idx} className="space-y-1">
                    <span className="font-semibold">{item.ingredient}</span>
                    <span className="text-sm text-gray-600">
                        {" "}
                        — used in: {item.recipes.join(", ")}
                    </span>
                    <div className="flex gap-2 mt-1">
                        <input
                        type="text"
                        value={qty}
                        onChange={handleQtyChange}
                        placeholder="Quantity"
                        className="border rounded px-2 py-1 text-sm w-1/2"
                        />
                        <button
                        onClick={addToPantry}
                        className="bg-green-500 text-white px-3 py-1 rounded text-sm hover:bg-green-600"
                        >
                        ➕ Add to Pantry
                        </button>
                    </div>
                    </li>
                );
                })}
            </ul>

            <div className="flex gap-4">
              <button
                onClick={() =>
                  navigator.clipboard.writeText(
                    shoppingList.map((i) => i.ingredient).join("\n")
                  )
                }
                className="text-sm bg-gray-200 px-3 py-2 rounded hover:bg-gray-300"
              >
                📋 Copy to Clipboard
              </button>
              <a
                href={`data:text/plain;charset=utf-8,${encodeURIComponent(
                  shoppingList.map((i) => i.ingredient).join("\n")
                )}`}
                download="shopping-list.txt"
                className="text-sm bg-blue-100 px-3 py-2 rounded hover:bg-blue-200"
              >
                ⬇️ Download List
              </a>
            </div>
          </div>
        )}
      </main>
    </>
  );
}
