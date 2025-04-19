import { NextApiRequest, NextApiResponse } from "next";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { fileUrl, userId } = req.body;
  if (!fileUrl || !userId) {
    return res.status(400).json({ error: "Missing file URL or user ID" });
  }

  try {
    const imageRes = await fetch(fileUrl);
    const arrayBuffer = await imageRes.arrayBuffer();
    const base64Image = Buffer.from(arrayBuffer).toString("base64");

    const prompt = `
You are a smart kitchen assistant. Given the following grocery receipt, extract only the **food items** and sort them by quantity, from highest to lowest.


- Exclude any non-item lines such as "SPECIAL", "SUBTOTAL", "LOYALTY", or other discount lines.
- Items with numeric quantities and units should appear at the top.
- Items without any quantity or unit should be included, but placed at the bottom.

Return the result as a JSON array using the following structure:
[
  { "ingredient": "eggs", "quantity": "12" },
  { "ingredient": "milk", "quantity": "1 gallon" }
]
`;

    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro:generateContent?key=${process.env.GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                { text: prompt },
                {
                  inlineData: {
                    mimeType: "image/jpeg",
                    data: base64Image,
                  },
                },
              ],
            },
          ],
        }),
      }
    );

    const responseData = await geminiRes.json();
    const rawText = responseData.candidates?.[0]?.content?.parts?.[0]?.text || "[]";

    const cleaned = rawText
      .replace(/```json\n?|```/gi, "")
      .replace(/^json\n?/gi, "")
      .trim();

    const items = JSON.parse(cleaned);

    // Save the receipt and parsed items to the Supabase database
    await supabase.from("receipts").insert({
      user_id: userId,
      file_url: fileUrl,
      parsed_items: items,
    });

    return res.status(200).json({ items });
  } catch (err) {
    console.error("Failed to process receipt:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}
