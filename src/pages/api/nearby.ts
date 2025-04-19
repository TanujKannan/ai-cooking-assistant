// /pages/api/nearby.ts
import type { NextApiRequest, NextApiResponse } from "next";
import axios from "axios";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { lat, lng, query } = req.body;

  if (!lat || !lng || !query) {
    return res.status(400).json({ error: "Missing required parameters" });
  }

  try {
    const { data } = await axios.get("https://api.foursquare.com/v3/places/search", {
      headers: {
        Authorization: process.env.NEXT_PUBLIC_FOURSQUARE_API_KEY!,
      },
      params: {
        ll: `${lat},${lng}`,
        query,
        radius: 5000,
        limit: 5,
      },
    });

    res.status(200).json({ results: data.results });
  } catch (error) {
    console.error("Foursquare API error:", error);
    res.status(500).json({ error: "Failed to fetch places from Foursquare" });
  }
}
