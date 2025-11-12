"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/utils/supabaseClient";
import { toast, Toaster } from "react-hot-toast";

type DistributionConfig = {
  id: string;
  name: string;
  description: string | null;
  distribution_schema: Record<string, number>;
  is_default: boolean;
  created_at: string;
  updated_at: string;
};

export default function XPDistributionConfigsPage() {
  const router = useRouter();
  const [configs, setConfigs] = useState<DistributionConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingConfig, setEditingConfig] = useState<DistributionConfig | null>(null);
  
  // Form state
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [numPositions, setNumPositions] = useState(2);
  const [percentages, setPercentages] = useState<Record<string, number>>({ "1": 60, "2": 40 });

  useEffect(() => {
    checkAdminAndLoad();
  }, []);

  const checkAdminAndLoad = async () => {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData?.user) {
      router.push("/login");
      return;
    }

    const { data: adminData } = await supabase
      .from("admins")
      .select("user_id")
      .eq("user_id", userData.user.id)
      .single();

    if (!adminData) {
      toast.error("Access denied. Admins only.");
      router.push("/dashboard");
      return;
    }

    await fetchConfigs();
  };

  const fetchConfigs = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("xp_distribution_configs")
      .select("*")
      .order("is_default", { ascending: false })
      .order("created_at", { ascending: false });

    if (error) {
      toast.error("Failed to load configs");
      console.error(error);
    } else {
      setConfigs(data || []);
    }
    setLoading(false);
  };

  const handleNumPositionsChange = (num: number) => {
    setNumPositions(num);
    
    // Auto-calculate decreasing percentages
    const newPercentages: Record<string, number> = {};
    const total = 100;
    const positions = Array.from({ length: num }, (_, i) => i + 1);
    
    // Calculate using weighted distribution (same as backend)
    const totalWeights = (num * (num + 1)) / 2;
    let sum = 0;
    
    positions.forEach((pos) => {
      const weight = num - pos + 1;
      const pct = Math.round((total * weight) / totalWeights);
      newPercentages[pos.toString()] = pct;
      sum += pct;
    });
    
    // Adjust first position if rounding caused total != 100
    if (sum !== 100) {
      newPercentages["1"] = newPercentages["1"] + (100 - sum);
    }
    
    setPercentages(newPercentages);
  };

  const handlePercentageChange = (position: string, value: number) => {
    setPercentages(prev => ({
      ...prev,
      [position]: Math.max(0, Math.min(100, value))
    }));
  };

  const getTotalPercentage = () => {
    return Object.values(percentages).reduce((sum, val) => sum + val, 0);
  };

  const handleSave = async () => {
    const total = getTotalPercentage();
    if (total !== 100) {
      toast.error(`Percentages must total 100% (currently ${total}%)`);
      return;
    }

    if (!name.trim()) {
      toast.error("Name is required");
      return;
    }

    const configData = {
      name: name.trim(),
      description: description.trim() || null,
      distribution_schema: percentages,
      is_default: false,
    };

    if (editingConfig) {
      // Update existing
      const { error } = await supabase
        .from("xp_distribution_configs")
        .update({
          ...configData,
          updated_at: new Date().toISOString(),
        })
        .eq("id", editingConfig.id);

      if (error) {
        toast.error("Failed to update config");
        console.error(error);
        return;
      }

      toast.success("✅ Config updated");
    } else {
      // Create new
      const { error } = await supabase
        .from("xp_distribution_configs")
        .insert([configData]);

      if (error) {
        toast.error("Failed to create config");
        console.error(error);
        return;
      }

      toast.success("✅ Config created");
    }

    setShowCreateModal(false);
    resetForm();
    await fetchConfigs();
  };

  const handleSetDefault = async (configId: string) => {
    // Remove default from all configs
    await supabase
      .from("xp_distribution_configs")
      .update({ is_default: false })
      .neq("id", "00000000-0000-0000-0000-000000000000");

    // Set new default
    const { error } = await supabase
      .from("xp_distribution_configs")
      .update({ is_default: true })
      .eq("id", configId);

    if (error) {
      toast.error("Failed to set default");
      console.error(error);
      return;
    }

    toast.success("✅ Default config updated");
    await fetchConfigs();
  };

  const handleDelete = async (configId: string) => {
    if (!confirm("Delete this distribution config?")) return;

    const { error } = await supabase
      .from("xp_distribution_configs")
      .delete()
      .eq("id", configId);

    if (error) {
      toast.error("Failed to delete config");
      console.error(error);
      return;
    }

    toast.success("🗑️ Config deleted");
    await fetchConfigs();
  };

  const openEditModal = (config: DistributionConfig) => {
    setEditingConfig(config);
    setName(config.name);
    setDescription(config.description || "");
    setNumPositions(Object.keys(config.distribution_schema).length);
    setPercentages(config.distribution_schema);
    setShowCreateModal(true);
  };

  const resetForm = () => {
    setEditingConfig(null);
    setName("");
    setDescription("");
    setNumPositions(2);
    setPercentages({ "1": 60, "2": 40 });
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <p className="text-gray-600">Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-6">
      <Toaster />

      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.back()}
              className="px-3 py-2 bg-gray-200 rounded hover:bg-gray-300"
            >
              ← Back
            </button>
            <h1 className="text-3xl font-bold text-gray-900">XP Distribution Configs</h1>
          </div>
          <button
            onClick={() => {
              resetForm();
              setShowCreateModal(true);
            }}
            className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700"
          >
            + New Config
          </button>
        </div>

        <div className="bg-white rounded-xl shadow p-6 mb-6">
          <h2 className="text-lg font-semibold mb-2">About Distribution Configs</h2>
          <p className="text-sm text-gray-600">
            Distribution configs define how XP pools are split among clubs based on their rankings.
            These are used for inter-club events where multiple clubs compete. The default config
            is used when creating new events, but admins can choose different configs for specific events.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {configs.map((config) => (
            <div
              key={config.id}
              className="bg-white rounded-xl shadow-md p-6 hover:shadow-lg transition"
            >
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="font-bold text-lg text-gray-900">{config.name}</h3>
                  {config.is_default && (
                    <span className="inline-block mt-1 px-2 py-1 bg-green-100 text-green-700 text-xs rounded">
                      ✓ Default
                    </span>
                  )}
                </div>
              </div>

              {config.description && (
                <p className="text-sm text-gray-600 mb-3">{config.description}</p>
              )}

              <div className="bg-gray-50 rounded p-3 mb-3">
                <p className="text-xs font-semibold text-gray-700 mb-2">Distribution:</p>
                <div className="space-y-1">
                  {Object.entries(config.distribution_schema)
                    .sort(([a], [b]) => parseInt(a) - parseInt(b))
                    .map(([position, percentage]) => (
                      <div key={position} className="flex justify-between text-sm">
                        <span>
                          {position === "1" && "🥇"}
                          {position === "2" && "🥈"}
                          {position === "3" && "🥉"}
                          {parseInt(position) > 3 && `#${position}`}
                          {" Position " + position}:
                        </span>
                        <span className="font-semibold">{percentage}%</span>
                      </div>
                    ))}
                </div>
              </div>

              <div className="flex gap-2">
                {!config.is_default && (
                  <button
                    onClick={() => handleSetDefault(config.id)}
                    className="flex-1 px-3 py-2 bg-green-100 text-green-700 rounded hover:bg-green-200 text-sm"
                  >
                    Set Default
                  </button>
                )}
                <button
                  onClick={() => openEditModal(config)}
                  className="flex-1 px-3 py-2 bg-indigo-100 text-indigo-700 rounded hover:bg-indigo-200 text-sm"
                >
                  Edit
                </button>
                {!config.is_default && (
                  <button
                    onClick={() => handleDelete(config.id)}
                    className="flex-1 px-3 py-2 bg-red-100 text-red-700 rounded hover:bg-red-200 text-sm"
                  >
                    Delete
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Create/Edit Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b p-6">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-gray-900">
                  {editingConfig ? "Edit Config" : "New Config"}
                </h2>
                <button
                  onClick={() => {
                    setShowCreateModal(false);
                    resetForm();
                  }}
                  className="text-gray-500 hover:text-gray-700 text-2xl"
                >
                  ✖
                </button>
              </div>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-semibold mb-2">Config Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g., Standard 3-Club"
                  className="w-full p-2 border rounded"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2">Description (optional)</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="e.g., 50-30-20 split for 3 clubs"
                  className="w-full p-2 border rounded h-20"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2">Number of Positions</label>
                <select
                  value={numPositions}
                  onChange={(e) => handleNumPositionsChange(parseInt(e.target.value))}
                  className="w-full p-2 border rounded"
                >
                  {[2, 3, 4, 5, 6, 7, 8].map((num) => (
                    <option key={num} value={num}>
                      {num} positions
                    </option>
                  ))}
                </select>
              </div>

              <div className="bg-gray-50 p-4 rounded">
                <div className="flex items-center justify-between mb-3">
                  <label className="text-sm font-semibold">Distribution Percentages</label>
                  <span
                    className={`text-sm font-bold ${
                      getTotalPercentage() === 100
                        ? "text-green-600"
                        : "text-red-600"
                    }`}
                  >
                    Total: {getTotalPercentage()}%
                  </span>
                </div>

                <div className="space-y-3">
                  {Array.from({ length: numPositions }, (_, i) => i + 1).map((pos) => (
                    <div key={pos} className="flex items-center gap-3">
                      <span className="w-20 text-sm font-medium">
                        {pos === 1 && "🥇"}
                        {pos === 2 && "🥈"}
                        {pos === 3 && "🥉"}
                        {pos > 3 && `#${pos}`}
                        {" Pos " + pos}:
                      </span>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={percentages[pos.toString()] || 0}
                        onChange={(e) =>
                          handlePercentageChange(pos.toString(), parseInt(e.target.value) || 0)
                        }
                        className="flex-1 p-2 border rounded"
                      />
                      <span className="w-8 text-sm text-gray-600">%</span>
                    </div>
                  ))}
                </div>

                {getTotalPercentage() !== 100 && (
                  <p className="text-xs text-red-600 mt-2">
                    ⚠️ Percentages must total exactly 100%
                  </p>
                )}
              </div>

              <div className="bg-blue-50 p-3 rounded">
                <p className="text-xs text-blue-800">
                  💡 Tip: The system automatically calculates a decreasing split when you change
                  the number of positions. You can adjust individual percentages manually.
                </p>
              </div>

              <div className="flex gap-3 pt-4 border-t">
                <button
                  onClick={() => {
                    setShowCreateModal(false);
                    resetForm();
                  }}
                  className="flex-1 px-6 py-3 bg-gray-200 rounded-lg hover:bg-gray-300 font-semibold"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={getTotalPercentage() !== 100 || !name.trim()}
                  className="flex-1 px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {editingConfig ? "Update Config" : "Create Config"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}