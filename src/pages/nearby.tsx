import { useEffect, useState } from "react";
import NavBar from "@/components/NavBar";

export default function NearbyStoresPage() {
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchNearbyStores = async () => {
    if (!userLocation || !query) return;
    setLoading(true);

    try {
      const res = await fetch("/api/nearby", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lat: userLocation.lat,
          lng: userLocation.lng,
          query,
        }),
      });

      const data = await res.json();
      setResults(data.results || []);
    } catch (error) {
      console.error("Error fetching nearby stores:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!navigator.geolocation) {
      alert("Geolocation is not supported by your browser");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setUserLocation({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        });
      },
      () => {
        alert("Unable to retrieve your location");
      }
    );
  }, []);

  return (
    <>
      <NavBar />
      <main className="max-w-2xl mx-auto py-10 px-4 space-y-6">
        <h1 className="text-2xl font-bold text-center text-indigo-700">📍 Find Nearby Places</h1>

        <input
          type="text"
          placeholder="Enter search term (e.g., grocery, bakery, eggs)"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="w-full border rounded px-4 py-2"
        />
        <button
          onClick={fetchNearbyStores}
          disabled={!userLocation || !query}
          className="bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700"
        >
          🔍 Search
        </button>

        {loading && <p className="text-sm text-gray-500">Searching nearby stores...</p>}

        {results.length > 0 && (
          <ul className="space-y-4 mt-4">
            {results.map((place, i) => (
              <li key={i} className="border rounded p-3 bg-white shadow">
                <h2 className="font-semibold text-lg">{place.name}</h2>
                <p className="text-sm text-gray-600">
                  {place.location?.formatted_address || "No address provided"}
                </p>
              </li>
            ))}
          </ul>
        )}
      </main>
    </>
  );
}
