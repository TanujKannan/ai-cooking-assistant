import type { NextApiRequest, NextApiResponse } from "next";
import { getRecipesFromIngredients } from "@/lib/openai";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { ingredients } = req.body;

  if (!ingredients || !Array.isArray(ingredients)) {
    return res.status(400).json({ error: "Invalid input" });
  }

  try {
    const recipes = await getRecipesFromIngredients(ingredients);
    res.status(200).json({ recipes });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to get recipes" });
  }
}