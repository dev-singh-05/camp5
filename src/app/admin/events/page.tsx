"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/utils/supabaseClient";
import { toast, Toaster } from "react-hot-toast";

type Event = {
  id: string;
  title: string;
  description: string | null;
  event_date: string;
  club_id: string;
  event_type: string;
  size_category: string | null;
  total_xp_pool: number;
  status: string;
  results_description: string | null;
  proof_photos: string[] | null;
  submitted_at: string;
  clubs: {
    name: string;
  } | null;
  requires_staking?: boolean;
  staking_deadline?: string | null;
  is_first_match?: boolean;
  admin_xp_pool?: number | null;
};

type InterClubParticipant = {
  club_id: string;
  position: number | null;
  xp_awarded: number | null;
  clubs: {
    name: string;
  } | null;
  staked_xp?: number | null;
  stake_locked?: boolean | null;
};

export default function AdminEventsPage() {
  const router = useRouter();
  const [events, setEvents] = useState<Event[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [interClubData, setInterClubData] = useState<InterClubParticipant[]>([]);
  const [loading, setLoading] = useState(true);
  const [rejectionReason, setRejectionReason] = useState("");
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [stakingDetails, setStakingDetails] = useState<any>(null);

  useEffect(() => {
    checkAdminAndLoad();
  }, []);

  const checkAdminAndLoad = async () => {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData?.user) {
      router.push("/login");
      return;
    }

    setCurrentUserId(userData.user.id);

    // Check if user is admin
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

    await fetchPendingEvents();
  };

  const fetchPendingEvents = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("events")
      .select("*, clubs!inner(name)")
      .eq("status", "pending")
      .order("submitted_at", { ascending: true });

    if (error) {
      toast.error("Failed to load events");
      console.error(error);
    } else {
      // Transform the data to match our Event type
      const transformedData = (data || []).map((event: any) => ({
        ...event,
        clubs: Array.isArray(event.clubs) && event.clubs.length > 0 
          ? event.clubs[0] 
          : event.clubs
      }));
      setEvents(transformedData);
    }
    setLoading(false);
  };

  const fetchStakingDetails = async (eventId: string) => {
    const { data, error } = await supabase.rpc('get_event_staking_status', {
      p_event_id: eventId
    });
    
    if (error) {
      console.error("Error fetching staking details:", error);
      return null;
    }
    
    setStakingDetails(data);
    return data;
  };

  const viewEventDetails = async (event: Event) => {
    setSelectedEvent(event);

    if (event.event_type === "inter") {
      const { data } = await supabase
        .from("inter_club_participants")
        .select("club_id, position, xp_awarded, staked_xp, stake_locked, clubs!inner(name)")
        .eq("event_id", event.id);

      if (data) {
        const transformedData = data.map((participant: any) => ({
          ...participant,
          clubs: Array.isArray(participant.clubs) && participant.clubs.length > 0
            ? participant.clubs[0]
            : participant.clubs
        }));
        setInterClubData(transformedData);
      }
      
      // Fetch staking details if it's a staking event
      if (event.requires_staking) {
        await fetchStakingDetails(event.id);
      }
    }
  };

  const calculatePositionXP = (
    position: number,
    totalXP: number,
    totalClubs: number
  ) => {
    const n = Math.max(1, totalClubs);
    const pool = totalXP;
    const totalWeights = (n * (n + 1)) / 2;
    const weight = n - position + 1;
    return Math.round((pool * weight) / totalWeights);
  };

  const addXPToClub = async (clubId: string, xp: number) => {
    const { data: existing } = await supabase
      .from("club_xp_ledger")
      .select("*")
      .eq("club_id", clubId)
      .single();

    if (existing) {
      await supabase
        .from("club_xp_ledger")
        .update({
          total_xp: existing.total_xp + xp,
          last_updated: new Date().toISOString(),
        })
        .eq("club_id", clubId);
    } else {
      await supabase.from("club_xp_ledger").insert({
        club_id: clubId,
        total_xp: xp,
      });
    }
  };

  const handleApprove = async () => {
    if (!selectedEvent || !currentUserId) return;

    try {
      // ✅ FOR INTER-CLUB EVENTS: Use the new RPC function
      if (selectedEvent.event_type === "inter") {
        // Call the XP distribution function
        const { data: distributionResult, error: distError } = await supabase.rpc(
          'distribute_inter_club_xp',
          {
            p_event_id: selectedEvent.id,
            p_admin_user_id: currentUserId
          }
        );

        if (distError || !distributionResult.success) {
          toast.error(distributionResult?.error || "Failed to distribute XP");
          console.error(distError);
          return;
        }

        // Notify each club with their winnings
        for (const result of distributionResult.distribution) {
          const positionEmoji =
            result.position === 1 ? "🥇" :
            result.position === 2 ? "🥈" :
            result.position === 3 ? "🥉" : `#${result.position}`;

          let message = `🔔 SYSTEM: Inter-club event "${selectedEvent.title}" approved! `;
          message += `Your club placed ${positionEmoji} and `;
          
          if (selectedEvent.is_first_match) {
            message += `won ${result.winnings} XP from admin pool! 🎉`;
          } else {
            message += `won ${result.winnings} XP `;
            message += `(staked ${result.staked} XP, `;
            message += result.net_winnings >= 0 
              ? `net gain: +${result.net_winnings} XP) 🎉` 
              : `net loss: ${result.net_winnings} XP)`;
          }

          await supabase.from("messages").insert([{
            club_id: result.club_id,
            user_id: currentUserId,
            content: message
          }]);
        }

        toast.success(
          selectedEvent.is_first_match
            ? "✅ First match approved! Admin XP distributed."
            : `✅ Event approved! Total pool of ${distributionResult.total_pool} XP distributed.`
        );
        
      } else {
        // ✅ FOR INTRA-CLUB EVENTS: Keep existing logic
        await addXPToClub(selectedEvent.club_id, selectedEvent.total_xp_pool);
        
        const xpMessage = `Event "${selectedEvent.title}" approved! Your club earned ${selectedEvent.total_xp_pool} XP! 🎉`;
        
        await supabase.from("messages").insert([{
          club_id: selectedEvent.club_id,
          user_id: currentUserId,
          content: `🔔 SYSTEM: ${xpMessage}`
        }]);
        
        toast.success("✅ Event approved! XP awarded.");
      }

      // Update event status
      const { error: updateError } = await supabase
        .from("events")
        .update({
          status: "approved",
          reviewed_by: currentUserId,
          reviewed_at: new Date().toISOString(),
        })
        .eq("id", selectedEvent.id);

      if (updateError) {
        toast.error("Failed to update event status");
        console.error(updateError);
        return;
      }

      setSelectedEvent(null);
      await fetchPendingEvents();
    } catch (err) {
      console.error("Error approving event:", err);
      toast.error("Failed to approve event");
    }
  };

  const handleReject = async () => {
    if (!selectedEvent || !currentUserId) return;

    const { error } = await supabase
      .from("events")
      .update({
        status: "rejected",
        rejection_reason: rejectionReason,
        reviewed_by: currentUserId,
        reviewed_at: new Date().toISOString(),
      })
      .eq("id", selectedEvent.id);

    if (error) {
      toast.error("Failed to reject event");
      return;
    }

    // Send rejection notification to club(s)
    if (selectedEvent.event_type === "intra") {
      await supabase.from("messages").insert([{
        club_id: selectedEvent.club_id,
        user_id: currentUserId,
        content: `🔔 SYSTEM: Event "${selectedEvent.title}" was rejected. Reason: ${rejectionReason}`
      }]);
    } else if (selectedEvent.event_type === "inter") {
      // Notify all participating clubs
      for (const participant of interClubData) {
        await supabase.from("messages").insert([{
          club_id: participant.club_id,
          user_id: currentUserId,
          content: `🔔 SYSTEM: Inter-club event "${selectedEvent.title}" was rejected. Reason: ${rejectionReason}`
        }]);
      }
    }

    toast.error("❌ Event rejected and clubs notified");
    setShowRejectModal(false);
    setRejectionReason("");
    setSelectedEvent(null);
    await fetchPendingEvents();
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

      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.back()}
              className="px-3 py-2 bg-gray-200 rounded hover:bg-gray-300"
            >
              ← Back
            </button>
            <h1 className="text-3xl font-bold text-gray-900">Event Reviews</h1>
          </div>
          <button
            onClick={fetchPendingEvents}
            className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700"
          >
            🔄 Refresh
          </button>
        </div>

        {events.length === 0 ? (
          <div className="bg-white rounded-xl shadow p-8 text-center">
            <p className="text-gray-500 text-lg">✅ No pending events to review!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {events.map((event) => (
              <div
                key={event.id}
                onClick={() => viewEventDetails(event)}
                className="bg-white rounded-xl shadow-md p-4 cursor-pointer hover:shadow-lg transition"
              >
                <div className="flex items-start justify-between mb-2">
                  <h3 className="font-bold text-lg text-gray-900">{event.title}</h3>
                  <span className="px-2 py-1 bg-yellow-100 text-yellow-700 text-xs rounded">
                    Pending
                  </span>
                </div>

                <p className="text-sm text-gray-600 mb-2">
                  <strong>Club:</strong> {event.clubs?.name || "Unknown Club"}
                </p>
                <p className="text-sm text-gray-600 mb-2">
                  <strong>Type:</strong> {event.event_type === "intra" ? "🟢 Intra-club" : "🔵 Inter-club"}
                </p>
                <p className="text-sm text-gray-600 mb-2">
                  <strong>XP Pool:</strong> {event.total_xp_pool}
                </p>
                <p className="text-sm text-gray-500">
                  <strong>Submitted:</strong> {new Date(event.submitted_at).toLocaleDateString()}
                </p>

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    viewEventDetails(event);
                  }}
                  className="mt-3 w-full px-3 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700"
                >
                  Review →
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Event Details Modal */}
      {selectedEvent && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b p-6">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-gray-900">{selectedEvent.title}</h2>
                <button
                  onClick={() => setSelectedEvent(null)}
                  className="text-gray-500 hover:text-gray-700 text-2xl"
                >
                  ✖
                </button>
              </div>
            </div>

            <div className="p-6 space-y-4">
              {/* Event Info */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="font-semibold text-lg mb-3">Event Details</h3>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <span className="font-semibold">Club:</span> {selectedEvent.clubs?.name || "Unknown Club"}
                  </div>
                  <div>
                    <span className="font-semibold">Type:</span>{" "}
                    {selectedEvent.event_type === "intra" ? "🟢 Intra-club" : "🔵 Inter-club"}
                  </div>
                  <div>
                    <span className="font-semibold">Date:</span>{" "}
                    {new Date(selectedEvent.event_date).toLocaleDateString()}
                  </div>
                  <div>
                    <span className="font-semibold">Total XP:</span> {selectedEvent.total_xp_pool}
                  </div>
                  {selectedEvent.event_type === "intra" && (
                    <div>
                      <span className="font-semibold">Size:</span> {selectedEvent.size_category}
                    </div>
                  )}
                </div>
              </div>

              {/* First Match Indicator */}
              {selectedEvent.event_type === "inter" && selectedEvent.is_first_match && (
                <div className="bg-blue-50 p-4 rounded-lg">
                  <h3 className="font-semibold text-lg mb-2 text-blue-800">🆕 First-Time Match</h3>
                  <div className="text-sm text-gray-700">
                    <p className="mb-2">
                      <span className="font-semibold">Admin XP Pool:</span> {selectedEvent.admin_xp_pool} XP
                    </p>
                    <p className="text-xs text-gray-600">
                      This is the first match between these clubs. The admin-provided XP pool 
                      will be distributed based on rankings.
                    </p>
                  </div>
                </div>
              )}

              {/* Staking Information (for inter-club events with staking) */}
              {selectedEvent.event_type === "inter" && selectedEvent.requires_staking && stakingDetails && (
                <div className="bg-yellow-50 p-4 rounded-lg">
                  <h3 className="font-semibold text-lg mb-3 text-yellow-800">💰 XP Staking Status</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="font-semibold">Clubs Staked:</span>
                      <span>{stakingDetails.clubs_staked} / {stakingDetails.total_clubs}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-semibold">Total Pool:</span>
                      <span className="font-bold text-yellow-700">{stakingDetails.total_staked} XP</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-semibold">All Staked:</span>
                      <span className={stakingDetails.all_staked ? "text-green-600" : "text-red-600"}>
                        {stakingDetails.all_staked ? "✓ Yes" : "✗ No"}
                      </span>
                    </div>
                    
                    {selectedEvent.staking_deadline && (
                      <div className="flex justify-between">
                        <span className="font-semibold">Deadline:</span>
                        <span className="text-xs">{new Date(selectedEvent.staking_deadline).toLocaleString()}</span>
                      </div>
                    )}
                    
                    <div className="mt-3 pt-3 border-t border-yellow-200">
                      <p className="font-semibold mb-2">Club Stakes:</p>
                      {stakingDetails.clubs.map((club: any) => (
                        <div key={club.club_id} className="flex justify-between text-xs py-1">
                          <span>{club.club_name}</span>
                          <span className={club.stake_locked ? "text-green-600 font-semibold" : "text-gray-400"}>
                            {club.stake_locked ? `${club.staked_xp} XP ✓` : "Not staked"}
                          </span>
                        </div>
                      ))}
                    </div>
                    
                    {!stakingDetails.all_staked && (
                      <div className="mt-3 bg-red-50 p-2 rounded border border-red-200">
                        <p className="text-xs text-red-700">
                          ⚠️ Cannot approve until all clubs have staked XP
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Results Description */}
              <div>
                <h3 className="font-semibold text-lg mb-2">Event Results</h3>
                <div className="bg-white border p-4 rounded-lg">
                  <p className="text-gray-700">{selectedEvent.results_description || "No description provided."}</p>
                </div>
              </div>

              {/* Inter-club Results */}
              {selectedEvent.event_type === "inter" && interClubData.length > 0 && (
                <div>
                  <h3 className="font-semibold text-lg mb-2">Competition Results</h3>
                  <div className="bg-white border rounded-lg overflow-hidden">
                    <table className="w-full">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-2 text-left">Position</th>
                          <th className="px-4 py-2 text-left">Club</th>
                          {selectedEvent.requires_staking && (
                            <th className="px-4 py-2 text-right">Staked</th>
                          )}
                          <th className="px-4 py-2 text-right">
                            {selectedEvent.is_first_match ? "To Award" : "Winnings"}
                          </th>
                          {selectedEvent.requires_staking && (
                            <th className="px-4 py-2 text-right">Net</th>
                          )}
                        </tr>
                      </thead>
                      <tbody>
                        {interClubData
                          .sort((a, b) => (a.position || 99) - (b.position || 99))
                          .map((participant) => {
                            const netWinnings = selectedEvent.requires_staking
                              ? (participant.xp_awarded || 0) - (participant.staked_xp || 0)
                              : participant.xp_awarded || 0;
                              
                            return (
                              <tr key={participant.club_id} className="border-t">
                                <td className="px-4 py-2">
                                  {participant.position === 1 && "🥇 1st"}
                                  {participant.position === 2 && "🥈 2nd"}
                                  {participant.position === 3 && "🥉 3rd"}
                                  {participant.position && participant.position > 3 && `#${participant.position}`}
                                  {!participant.position && "N/A"}
                                </td>
                                <td className="px-4 py-2">{participant.clubs?.name || "Unknown Club"}</td>
                                {selectedEvent.requires_staking && (
                                  <td className="px-4 py-2 text-right text-gray-600">
                                    {participant.staked_xp || 0} XP
                                    {participant.stake_locked && " 🔒"}
                                  </td>
                                )}
                                <td className="px-4 py-2 text-right font-semibold text-green-600">
                                  {participant.xp_awarded || 0} XP
                                </td>
                                {selectedEvent.requires_staking && (
                                  <td className={`px-4 py-2 text-right font-semibold ${
                                    netWinnings >= 0 ? "text-green-600" : "text-red-600"
                                  }`}>
                                    {netWinnings >= 0 ? "+" : ""}{netWinnings} XP
                                  </td>
                                )}
                              </tr>
                            );
                          })}
                      </tbody>
                    </table>
                  </div>
                  
                  {selectedEvent.requires_staking && stakingDetails && (
                    <div className="mt-2 text-xs text-gray-600">
                      <p>Total Pool: {stakingDetails.total_staked} XP</p>
                    </div>
                  )}
                </div>
              )}

              {/* Photos */}
              {selectedEvent.proof_photos && selectedEvent.proof_photos.length > 0 && (
                <div>
                  <h3 className="font-semibold text-lg mb-2">Event Photos ({selectedEvent.proof_photos.length})</h3>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {selectedEvent.proof_photos.map((url, idx) => (
                      <img
                        key={idx}
                        src={url}
                        alt={`Event photo ${idx + 1}`}
                        className="w-full h-40 object-cover rounded-lg cursor-pointer hover:opacity-90 transition"
                        onClick={() => window.open(url, "_blank")}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-3 pt-4 border-t">
                <button
                  onClick={handleApprove}
                  disabled={
                    selectedEvent.event_type === "inter" && 
                    selectedEvent.requires_staking && 
                    stakingDetails && 
                    !stakingDetails.all_staked
                  }
                  className="flex-1 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                  title={
                    selectedEvent.event_type === "inter" && 
                    selectedEvent.requires_staking && 
                    stakingDetails && 
                    !stakingDetails.all_staked
                      ? "All clubs must stake XP before approval"
                      : ""
                  }
                >
                  ✅ Approve Event
                  {selectedEvent.event_type === "inter" && 
                   selectedEvent.requires_staking && 
                   stakingDetails && 
                   !stakingDetails.all_staked && 
                   " (Waiting for stakes)"}
                </button>
                <button
                  onClick={() => setShowRejectModal(true)}
                  className="flex-1 px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 font-semibold"
                >
                  ❌ Reject Event
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Reject Modal */}
      {showRejectModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60] p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
            <h3 className="text-lg font-bold mb-4">Reject Event</h3>
            <p className="text-sm text-gray-600 mb-3">
              Please provide a reason for rejection:
            </p>
            <textarea
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder="E.g., Photos unclear, insufficient proof, incorrect data..."
              className="w-full p-3 border rounded-lg mb-4 h-24"
            />
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => {
                  setShowRejectModal(false);
                  setRejectionReason("");
                }}
                className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300"
              >
                Cancel
              </button>
              <button
                onClick={handleReject}
                disabled={!rejectionReason.trim()}
                className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Confirm Rejection
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}