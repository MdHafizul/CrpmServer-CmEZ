import { useState, useEffect } from "react";
import Snackbar from "../snackBar";
import { apiFetch } from '@/utils/api';


export default function SummaryCards() {
  const [isLoading, setIsLoading] = useState(false);
  const [totals, setTotals] = useState({
    totalAccounts: 0,
    revisited: 0,
    notRevisited: 0,
  });
  const [snackbar, setSnackbar] = useState({ message: "", type: "" });

  const fetchFileData = async () => {
    setIsLoading(true);

    try {
      const types = ["disconnected", "revisit", "belumrevisit"];
      const results = {};

      for (const type of types) {
        const response = await apiFetch("/api/v2/status21/process-file", {
          method: "GET",
          headers: {
            "x-data-type": type,
          },
        });

        if (!response.ok) {
          throw new Error(`Failed to fetch data for type: ${type}`);
        }

        const result = await response.json();
        results[type] = result;
      }

      const totalAccounts = Object.values(results.disconnected?.BACount || {}).reduce(
        (sum, area) => sum + area.total,
        0
      );
      const revisited = Object.values(results.revisit?.BACount || {}).reduce(
        (sum, area) => sum + area.total,
        0
      );
      const notRevisited = Object.values(results.belumrevisit?.BACount || {}).reduce(
        (sum, area) => sum + area.total,
        0
      );

      setTotals({
        totalAccounts,
        revisited,
        notRevisited,
      });
    } catch (error) {
      console.error("Error fetching file data:", error);
      setSnackbar({ message: error.message, type: "error" });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchFileData();
  }, []);

  return (
    <>
      {snackbar.message && (
        <Snackbar
          message={snackbar.message}
          type={snackbar.type}
          onClose={() => setSnackbar({ message: "", type: "" })}
        />
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h2 className="text-sm font-medium text-gray-600 mb-2">Total Accounts</h2>
          <p className="text-3xl font-bold">{isLoading ? "Loading..." : totals.totalAccounts}</p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h2 className="text-sm font-medium text-gray-600 mb-2">Revisited</h2>
          <p className="text-3xl font-bold">{isLoading ? "Loading..." : totals.revisited}</p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h2 className="text-sm font-medium text-gray-600 mb-2">Pending Revisited</h2>
          <p className="text-3xl font-bold">{isLoading ? "Loading..." : totals.notRevisited}</p>
        </div>
      </div>
    </>
  );
}