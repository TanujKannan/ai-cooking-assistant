// /pages/receipts.tsx
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useUser } from "@/hooks/useUser";
import NavBar from "@/components/NavBar";

type ReceiptFile = {
  name: string;
  url: string;
};

export default function ReceiptsPage() {
  const { user, loading } = useUser();
  const [receipts, setReceipts] = useState<ReceiptFile[]>([]);
  const [fetching, setFetching] = useState(false);

  useEffect(() => {
    if (!loading && user) fetchReceipts();
  }, [user, loading]);

  const fetchReceipts = async () => {
    setFetching(true);
    const folder = `user-${user!.id}`;

    const { data: files, error } = await supabase.storage
      .from("receipts")
      .list(folder);

    if (error) {
      console.error("Error listing receipts:", error);
      setReceipts([]);
    } else {
      const urls: ReceiptFile[] = files
        .filter((file) => file.name.match(/\.(jpg|jpeg|png)$/i))
        .map((file) => ({
          name: file.name,
          url: supabase.storage.from("receipts").getPublicUrl(`${folder}/${file.name}`).data
            .publicUrl,
        }));

      setReceipts(urls);
    }

    setFetching(false);
  };

  const deleteReceipt = async (fileName: string) => {
    const path = `user-${user!.id}/${fileName}`;
    const { error } = await supabase.storage.from("receipts").remove([path]);
    if (error) {
      alert("Failed to delete receipt");
      console.error("Delete error:", error);
    } else {
      alert("Receipt deleted");
      fetchReceipts();
    }
  };

  if (loading || !user) return null;

  return (
    <>
      <NavBar />
      <main className="max-w-3xl mx-auto py-10 px-4 font-sans">
        <h1 className="text-3xl font-bold text-center mb-8 text-green-800">🧾 My Uploaded Receipts</h1>

        {fetching && (
          <p className="text-center text-blue-500 text-sm">Fetching your receipts...</p>
        )}

        {!fetching && receipts.length === 0 && (
          <p className="text-center text-gray-500 text-sm">No receipts found in storage.</p>
        )}

        <div className="grid sm:grid-cols-2 gap-6 mt-6">
          {receipts.map((receipt, idx) => (
            <div
              key={idx}
              className="bg-white rounded-lg shadow p-4 border border-gray-100 flex flex-col items-center"
            >
              <img
                src={receipt.url}
                alt={`Receipt ${idx + 1}`}
                className="w-full rounded-md object-cover max-h-72 border mb-3"
              />
              <div className="flex justify-between w-full">
                <a
                  href={receipt.url}
                  download
                  className="text-sm text-blue-600 hover:underline"
                >
                  ⬇️ Download Receipt {idx + 1}
                </a>
                <button
                  onClick={() => deleteReceipt(receipt.name)}
                  className="text-sm text-red-600 hover:underline"
                >
                  🗑️ Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      </main>
    </>
  );
}
