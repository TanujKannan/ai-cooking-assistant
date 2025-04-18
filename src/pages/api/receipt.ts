// /pages/api/receipt.ts
import { NextApiRequest, NextApiResponse } from "next";
import fs from "fs";
import formidable, { IncomingForm } from "formidable";

export const config = {
  api: { bodyParser: false },
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const form = new IncomingForm();

  form.parse(req, async (_err, _fields, files) => {
    const uploadedFile = Array.isArray(files.file) ? files.file[0] : files.file;
    if (!uploadedFile) return res.status(400).json({ error: "No file uploaded" });

    const imageBuffer = fs.readFileSync(uploadedFile.filepath);
    const base64Image = imageBuffer.toString("base64");

    const prompt = `
You're a smart kitchen assistant. This is a grocery receipt. Extract the items and quantities in this JSON format:
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
                    mimeType: uploadedFile.mimetype || "image/jpeg",
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

    try {
      // ✅ Clean the response to remove ```json and ``` wrappers
      const cleaned = rawText
        .replace(/```json\n?|```/gi, "")
        .replace(/^json\n?/gi, "")
        .trim();

      const items = JSON.parse(cleaned);
      return res.status(200).json({ items });
    } catch (err) {
      console.error("Failed to parse response:", rawText);
      return res.status(500).json({ error: "Failed to parse Gemini output", raw: rawText });
    }
  });
}
