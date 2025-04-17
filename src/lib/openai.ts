// src/lib/openai.ts
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function getRecipesFromIngredients(ingredients: string[]) {
  const prompt = `Suggest 3 recipes I can make with these ingredients: ${ingredients.join(", ")}. Include dish names and short instructions and if I'm missing a key ingredient, suggest a substitute or explain if it's optional."`;

  const response = await openai.chat.completions.create({
    model: "gpt-3.5-turbo",
    messages: [{ role: "user", content: prompt }],
    temperature: 0.7,
  });

  return response.choices[0].message.content;
}
