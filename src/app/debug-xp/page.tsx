"use client";

import { useState } from "react";
import { supabase } from "@/utils/supabaseClient";
import { toast, Toaster } from "react-hot-toast";

export default function DebugXPUpdatePage() {
  const [clubId, setClubId] = useState("");
  const [xpAmount, setXpAmount] = useState(100);
  const [logs, setLogs] = useState<string[]>([]);
  const [clubs, setClubs] = useState<any[]>([]);

  const addLog = (message: string) => {
    console.log(message);
    setLogs(prev => [...prev, `${new Date().toLocaleTimeString()}: ${message}`]);
  };

  const fetchAllClubs = async () => {
    addLog("📋 Fetching all clubs...");
    const { data, error } = await supabase
      .from("clubs")
      .select("id, name, total_xp")
      .order("name");

    if (error) {
      addLog(`❌ Error fetching clubs: ${error.message}`);
      toast.error("Failed to fetch clubs");
    } else {
      setClubs(data || []);
      addLog(`✅ Fetched ${data?.length} clubs`);
      toast.success(`Loaded ${data?.length} clubs`);
    }
  };

  const testDirectUpdate = async () => {
    if (!clubId) {
      toast.error("Please select a club");
      return;
    }

    setLogs([]);
    addLog("🧪 === STARTING DIRECT XP UPDATE TEST ===");
    addLog(`Club ID: ${clubId}`);
    addLog(`XP to add: ${xpAmount}`);

    try {
      // Step 1: Fetch current data
      addLog("\n📥 Step 1: Fetching current club data...");
      const { data: beforeData, error: beforeError } = await supabase
        .from("clubs")
        .select("id, name, total_xp")
        .eq("id", clubId)
        .single();

      if (beforeError) {
        addLog(`❌ Fetch error: ${beforeError.message}`);
        addLog(`Error code: ${beforeError.code}`);
        addLog(`Error details: ${JSON.stringify(beforeError.details)}`);
        toast.error("Fetch failed");
        return;
      }

      addLog(`✅ Current state: ${beforeData.name} has ${beforeData.total_xp} XP`);

      const currentXP = beforeData.total_xp || 0;
      const newXP = currentXP + xpAmount;
      addLog(`📊 Calculation: ${currentXP} + ${xpAmount} = ${newXP}`);

      // Step 2: Attempt update WITHOUT .single()
      addLog("\n💾 Step 2: Attempting UPDATE (without .single())...");
      const { data: updateData, error: updateError, status, statusText } = await supabase
        .from("clubs")
        .update({ total_xp: newXP })
        .eq("id", clubId)
        .select("id, name, total_xp");

      addLog(`Response status: ${status} ${statusText}`);

      if (updateError) {
        addLog(`❌ UPDATE ERROR:`);
        addLog(`   Message: ${updateError.message}`);
        addLog(`   Code: ${updateError.code}`);
        addLog(`   Details: ${JSON.stringify(updateError.details)}`);
        addLog(`   Hint: ${updateError.hint}`);
        toast.error(`Update failed: ${updateError.message}`);
        return;
      }

      if (!updateData || updateData.length === 0) {
        addLog(`❌ UPDATE returned no data (but no error)`);
        addLog(`   This might mean RLS policy is blocking the update`);
        toast.error("Update returned no data - check RLS policies");
        return;
      }

      const updated = updateData[0];
      addLog(`✅ UPDATE response: ${updated.name} → ${updated.total_xp} XP`);

      // Step 3: Verify with fresh query
      addLog("\n🔍 Step 3: Verifying with fresh SELECT...");
      const { data: verifyData, error: verifyError } = await supabase
        .from("clubs")
        .select("id, name, total_xp")
        .eq("id", clubId)
        .single();

      if (verifyError) {
        addLog(`❌ Verification query failed: ${verifyError.message}`);
      } else {
        addLog(`📊 Fresh query result: ${verifyData.name} has ${verifyData.total_xp} XP`);
        
        if (verifyData.total_xp === newXP) {
          addLog(`✅ ✅ ✅ VERIFICATION PASSED! XP successfully updated!`);
          toast.success(`✅ Success! ${verifyData.name} now has ${verifyData.total_xp} XP`);
        } else {
          addLog(`❌ ❌ ❌ VERIFICATION FAILED!`);
          addLog(`   Expected: ${newXP}`);
          addLog(`   Got: ${verifyData.total_xp}`);
          addLog(`   Difference: ${verifyData.total_xp - newXP}`);
          toast.error("XP mismatch after update!");
        }
      }

      addLog("\n🧪 === TEST COMPLETE ===");

    } catch (err) {
      addLog(`❌ EXCEPTION: ${(err as Error).message}`);
      addLog(`Stack: ${(err as Error).stack}`);
      toast.error(`Error: ${(err as Error).message}`);
    }

    // Refresh clubs list
    await fetchAllClubs();
  };

  const testUpdateWithSingle = async () => {
    if (!clubId) {
      toast.error("Please select a club");
      return;
    }

    setLogs([]);
    addLog("🧪 === TESTING UPDATE WITH .single() ===");

    try {
      const { data: beforeData } = await supabase
        .from("clubs")
        .select("id, name, total_xp")
        .eq("id", clubId)
        .single();

      if (!beforeData) return;

      const newXP = (beforeData.total_xp || 0) + xpAmount;
      addLog(`Updating ${beforeData.name} to ${newXP} XP using .single()...`);

      const { data: updateData, error: updateError } = await supabase
        .from("clubs")
        .update({ total_xp: newXP })
        .eq("id", clubId)
        .select("id, name, total_xp")
        .single(); // Testing WITH .single()

      if (updateError) {
        addLog(`❌ UPDATE WITH .single() FAILED:`);
        addLog(`   Error: ${updateError.message}`);
        addLog(`   Code: ${updateError.code}`);
        toast.error(`.single() caused error: ${updateError.message}`);
      } else {
        addLog(`✅ UPDATE WITH .single() succeeded`);
        addLog(`   Result: ${updateData.name} → ${updateData.total_xp} XP`);
        toast.success("Update with .single() worked!");
      }

    } catch (err) {
      addLog(`❌ Exception: ${(err as Error).message}`);
    }

    await fetchAllClubs();
  };

  const checkRLSPolicies = async () => {
    setLogs([]);
    addLog("🔒 === CHECKING RLS POLICIES ===");
    
    try {
      // Check current user
      const { data: userData } = await supabase.auth.getUser();
      addLog(`Current user ID: ${userData.user?.id || "Not logged in"}`);
      addLog(`User email: ${userData.user?.email || "N/A"}`);

      // Try to check if user is admin
      if (userData.user) {
        const { data: adminData, error: adminError } = await supabase
          .from("admins")
          .select("user_id")
          .eq("user_id", userData.user.id)
          .single();

        if (adminError) {
          addLog(`⚠️ Admin check error: ${adminError.message}`);
        } else if (adminData) {
          addLog(`✅ User IS an admin`);
        } else {
          addLog(`❌ User is NOT an admin`);
        }
      }

      // Test basic SELECT permission
      addLog("\n📋 Testing SELECT permission...");
      const { data: selectTest, error: selectError } = await supabase
        .from("clubs")
        .select("id, name, total_xp")
        .limit(1);

      if (selectError) {
        addLog(`❌ SELECT failed: ${selectError.message}`);
      } else {
        addLog(`✅ SELECT works (found ${selectTest?.length} rows)`);
      }

      // Test basic UPDATE permission (without actually changing anything)
      if (clubId) {
        addLog("\n✏️ Testing UPDATE permission...");
        const { data: currentData } = await supabase
          .from("clubs")
          .select("total_xp")
          .eq("id", clubId)
          .single();

        if (currentData) {
          const { error: updateTestError } = await supabase
            .from("clubs")
            .update({ total_xp: currentData.total_xp }) // Update to same value
            .eq("id", clubId);

          if (updateTestError) {
            addLog(`❌ UPDATE permission denied: ${updateTestError.message}`);
            addLog(`   This likely means RLS is blocking updates!`);
            toast.error("RLS is blocking updates!");
          } else {
            addLog(`✅ UPDATE permission granted`);
          }
        }
      }

    } catch (err) {
      addLog(`❌ Error: ${(err as Error).message}`);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <Toaster />
      
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">🔧 XP Update Debug Tool</h1>

        {/* Controls */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-bold mb-4">Test Controls</h2>
          
          <div className="space-y-4">
            <button
              onClick={fetchAllClubs}
              className="w-full px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              📋 Fetch All Clubs
            </button>

            {clubs.length > 0 && (
              <>
                <div>
                  <label className="block text-sm font-semibold mb-2">Select Club:</label>
                  <select
                    value={clubId}
                    onChange={(e) => setClubId(e.target.value)}
                    className="w-full p-2 border rounded"
                  >
                    <option value="">-- Choose a club --</option>
                    {clubs.map(club => (
                      <option key={club.id} value={club.id}>
                        {club.name} (Current XP: {club.total_xp})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-semibold mb-2">XP Amount to Add:</label>
                  <input
                    type="number"
                    value={xpAmount}
                    onChange={(e) => setXpAmount(Number(e.target.value))}
                    className="w-full p-2 border rounded"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <button
                    onClick={testDirectUpdate}
                    disabled={!clubId}
                    className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
                  >
                    🧪 Test Update (No .single())
                  </button>

                  <button
                    onClick={testUpdateWithSingle}
                    disabled={!clubId}
                    className="px-4 py-2 bg-orange-600 text-white rounded hover:bg-orange-700 disabled:opacity-50"
                  >
                    🧪 Test Update (With .single())
                  </button>

                  <button
                    onClick={checkRLSPolicies}
                    className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700"
                  >
                    🔒 Check RLS Policies
                  </button>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Clubs Table */}
        {clubs.length > 0 && (
          <div className="bg-white rounded-lg shadow p-6 mb-6">
            <h2 className="text-xl font-bold mb-4">Current Clubs ({clubs.length})</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="px-4 py-2 text-left">Club Name</th>
                    <th className="px-4 py-2 text-right">Total XP</th>
                    <th className="px-4 py-2 text-left">Club ID</th>
                  </tr>
                </thead>
                <tbody>
                  {clubs.map(club => (
                    <tr key={club.id} className="border-t">
                      <td className="px-4 py-2">{club.name}</td>
                      <td className="px-4 py-2 text-right font-semibold">{club.total_xp}</td>
                      <td className="px-4 py-2 text-xs text-gray-500">{club.id}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Logs */}
        <div className="bg-gray-900 text-green-400 rounded-lg shadow p-6 font-mono text-sm">
          <h2 className="text-xl font-bold mb-4 text-white">Console Logs</h2>
          {logs.length === 0 ? (
            <p className="text-gray-500">No logs yet. Run a test to see output.</p>
          ) : (
            <div className="space-y-1 max-h-96 overflow-y-auto">
              {logs.map((log, idx) => (
                <div key={idx} className={
                  log.includes('❌') ? 'text-red-400' :
                  log.includes('✅') ? 'text-green-400' :
                  log.includes('⚠️') ? 'text-yellow-400' :
                  log.includes('🔒') ? 'text-purple-400' :
                  'text-gray-300'
                }>
                  {log}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}