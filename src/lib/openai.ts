// src/lib/openai.ts
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.GEMINI_API_KEY, // This is your Gemini API key
  baseURL: "https://generativelanguage.googleapis.com/v1beta/openai/", // Gemini-compatible OpenAI API
});

export async function getRecipesFromIngredients(ingredients: string[]) {
  const prompt = `You're an AI cooking assistant. I have the following ingredients: ${ingredients.join(", ")}. 

Suggest exactly 3 diverse recipes I can cook using these ingredients.

Return ONLY a JSON array of objects in this format:

[
  {
    "title": "Dish Name",
    "summary": "1-2 sentence description of the dish.",
    "instructions": ["Step 1...", "Step 2...", "Step 3..."],
    "substitutes": ["If any", "Otherwise return empty array"]
  }
]

Each recipe should use available ingredients or suggest common substitutions.
Do not include any explanation before or after the JSON.`;

  const response = await openai.chat.completions.create({
    model: "gemini-2.0-flash",
    messages: [{ role: "user", content: prompt }],
    temperature: 0.7,
  });

  const rawContent = response.choices[0].message.content || "";

  // 🧼 Remove code block if wrapped in triple backticks
  const cleaned = rawContent.replace(/```json\\n?|```/g, "").trim();

  return cleaned;
}