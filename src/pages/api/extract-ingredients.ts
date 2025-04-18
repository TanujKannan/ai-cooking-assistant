// pages/api/extract-ingredients.ts
import { NextApiRequest, NextApiResponse } from "next";
import { OpenAI } from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { recipe } = req.body;

  const prompt = `Extract only the ingredient names used in this recipe. Return as a comma-separated list.\n\n${recipe}`;

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.2,
    });

    const text = response.choices[0].message.content || "";
    const ingredients = text
      .split(",")
      .map((i) => i.trim().toLowerCase())
      .filter(Boolean);

    res.status(200).json({ ingredients });
  } catch (error) {
    console.error("GPT extract error:", error);
    res.status(500).json({ error: "Failed to extract ingredients" });
  }
}
