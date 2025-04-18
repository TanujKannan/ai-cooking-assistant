// src/lib/openai.ts
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function getRecipesFromIngredients(ingredients: string[]) {
  const prompt = `You're an AI cooking assistant. I have the following ingredients: ${ingredients.join(", ")}. 
Suggest exactly 3 diverse recipes I can cook right now. 
For each recipe, include:
- The dish name
- A 1-2 sentence summary
- Short, clear step-by-step instructions
If any essential ingredient is missing, recommend a common substitute or state if it's optional. 
Focus on simplicity and flavor. Avoid suggesting recipes that require ingredients I don't have.`;

  const response = await openai.chat.completions.create({
    model: "gpt-3.5-turbo",
    messages: [{ role: "user", content: prompt }],
    temperature: 0.7,
  });

  return response.choices[0].message.content;
}
