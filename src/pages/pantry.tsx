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

type ExtractedItem = {
  ingredient: string;
  quantity: string;
};

export default function Pantry() {
  const { user, loading } = useUser();
  const router = useRouter();

  const [ingredients, setIngredients] = useState<PantryItem[]>([]);
  const [input, setInput] = useState("");
  const [quantity, setQuantity] = useState("");
  const [file, setFile] = useState<File | null>(null);
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

  const handleReceiptUpload = async () => {
    console.log("Current user:", user);
    if (!file || !user?.id) return;

    const filePath = `user-${user.id}/${Date.now()}-${file.name}`;
    console.log("Uploading file:", file);
    console.log("File path:", filePath);
    const { data, error } = await supabase.storage
      .from("receipts")
      .upload(filePath, file);
    console.log(error)
    if (error) {
      console.error("Upload error:", error);
      alert("Failed to upload receipt.");
      return;
    }

    const { data: urlData } = supabase.storage
      .from("receipts")
      .getPublicUrl(filePath);

    const publicUrl = urlData?.publicUrl;

    try {
      const res = await fetch("/api/receipt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user.id, fileUrl: publicUrl }),
      });

      if (!res.ok) throw new Error("Receipt processing failed");

      const { items }: { items: ExtractedItem[] } = await res.json();

      for (const item of items) {
        await supabase.from("pantry").insert({
          user_id: user.id,
          ingredient: item.ingredient,
          quantity: item.quantity,
        });
      }

      alert("Pantry updated from receipt!");
      setFile(null);
      loadPantry();
    } catch (err) {
      console.error("API error:", err);
      alert("Failed to process receipt.");
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
      <main className="max-w-2xl mx-auto py-10 px-4 space-y-8">
        <h1 className="text-3xl font-bold text-center text-green-700">🥦 My Pantry</h1>

        <div className="flex flex-col sm:flex-row gap-3">
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
            className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
          >
            Add
          </button>
        </div>

        <div className="mt-6">
          <input
            type="file"
            accept="image/*"
            onChange={(e) => setFile(e.target.files?.[0] || null)}
          />
          <button
            onClick={handleReceiptUpload}
            disabled={!file}
            className="bg-purple-600 text-white px-4 py-2 mt-2 rounded hover:bg-purple-700"
          >
            📷 Process Receipt
          </button>
        </div>

        <ul className="space-y-2 mt-6">
          {ingredients.map((item) => (
            <li
              key={item.id}
              className="flex justify-between items-center border p-2 rounded shadow-sm bg-white"
            >
              <span>
                <span className="font-semibold text-gray-800">{item.ingredient}</span>
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

        {recipes.length > 0 && (
          <section className="space-y-4">
            <h2 className="text-xl font-bold text-center text-green-700">🍽️ Suggested Recipes</h2>
            {recipes.map((recipe, idx) => (
              <div
                key={idx}
                className="bg-white border rounded-lg p-4 shadow hover:shadow-md transition"
              >
                <h3 className="font-semibold text-lg text-green-700 mb-1">{recipe.title}</h3>
                <p className="text-gray-600 mb-2">{recipe.summary}</p>

                <h4 className="text-sm font-semibold text-gray-700">Instructions:</h4>
                <ul className="list-disc pl-5 text-sm text-gray-800 mb-2">
                  {recipe.instructions.map((step, i) => (
                    <li key={i}>{step}</li>
                  ))}
                </ul>

                {recipe.substitutes.length > 0 && (
                  <>
                    <h4 className="text-sm font-semibold text-gray-700">Substitutes:</h4>
                    <ul className="list-disc pl-5 text-sm text-gray-800">
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
                  className="bg-yellow-400 text-black px-4 py-2 text-sm rounded hover:bg-yellow-500"
                >
                  ⭐ Save to Favorites
                </button>
              </div>
            ))}
          </section>
        )}

        {shoppingList.length > 0 && (
          <section className="space-y-4">
            <h2 className="text-xl font-bold text-center text-blue-700">🛒 Shopping List</h2>
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
                <div
                  key={idx}
                  className="bg-white p-4 rounded-lg shadow flex flex-col gap-2"
                >
                  <div className="text-gray-800 font-semibold">
                    {item.ingredient}{" "}
                    <span className="text-sm text-gray-500">
                      (used in: {item.recipes.join(", ")})
                    </span>
                  </div>
                  <div className="flex gap-2">
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
                </div>
              );
            })}
            <div className="flex gap-4 mt-4">
              <button
                onClick={() =>
                  navigator.clipboard.writeText(
                    shoppingList.map((i) => `${i.ingredient} (used in: ${i.recipes.join(", ")})`).join("\n")
                  )
                }
                className="text-sm bg-gray-200 px-3 py-2 rounded hover:bg-gray-300"
              >
                📋 Copy to Clipboard
              </button>
              <a
                href={`data:text/plain;charset=utf-8,${encodeURIComponent(
                  shoppingList.map((i) => `${i.ingredient} (used in: ${i.recipes.join(", ")})`).join("\n")
                )}`}
                download="shopping-list.txt"
                className="text-sm bg-blue-100 px-3 py-2 rounded hover:bg-blue-200"
              >
                ⬇️ Download List
              </a>
            </div>
          </section>
        )}
        
      </main>
    </>
  );
}
