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
};

type InterClubParticipant = {
  club_id: string;
  position: number | null;
  xp_awarded: number | null;
  clubs: {
    name: string;
  } | null;
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

    const { data: adminData } = await supabase
      .from("admins")
      .select("user_id")
      .eq("user_id", userData.user.id)
      .maybeSingle();

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

  const viewEventDetails = async (event: Event) => {
    setSelectedEvent(event);

    if (event.event_type === "inter") {
      const { data } = await supabase
        .from("inter_club_participants")
        .select("club_id, position, xp_awarded, clubs!inner(name)")
        .eq("event_id", event.id);

      const transformedData = (data || []).map((participant: any) => ({
        ...participant,
        clubs: Array.isArray(participant.clubs) && participant.clubs.length > 0
          ? participant.clubs[0]
          : participant.clubs
      }));

      setInterClubData(transformedData);
    }
  };

  // Direct XP update function using RPC (bypasses RLS)
  const updateClubXP = async (clubId: string, xpToAdd: number) => {
    console.log(`🎯 Updating club ${clubId} with +${xpToAdd} XP`);
    
    try {
      // Call RPC function to update XP
      const { data, error } = await supabase.rpc('increment_club_xp', {
        club_id_param: clubId,
        xp_increment: xpToAdd
      });

      if (error) {
        console.error("❌ RPC Error:", error);
        throw error;
      }

      console.log(`✅ XP updated successfully via RPC`);
      return { success: true };
    } catch (err) {
      console.error("❌ Failed to update XP:", err);
      throw err;
    }
  };

  const handleApprove = async () => {
    if (!selectedEvent || !currentUserId) {
      toast.error("Missing event or user information");
      return;
    }

    try {
      console.log(`\n🏁 ========== EVENT APPROVAL START ==========`);
      console.log(`Event: ${selectedEvent.title}`);
      console.log(`Type: ${selectedEvent.event_type}`);
      console.log(`XP Pool: ${selectedEvent.total_xp_pool}`);

      if (selectedEvent.event_type === "intra") {
        console.log(`\n💰 INTRA-CLUB: Awarding ${selectedEvent.total_xp_pool} XP`);
        
        await updateClubXP(selectedEvent.club_id, selectedEvent.total_xp_pool);
        
        toast.success(`✅ Club earned ${selectedEvent.total_xp_pool} XP!`, {
          duration: 5000,
        });
        
        // Send notification
        await supabase.from("messages").insert([{
          club_id: selectedEvent.club_id,
          user_id: currentUserId,
          content: `🔔 SYSTEM: Event "${selectedEvent.title}" approved! Your club earned ${selectedEvent.total_xp_pool} XP! 🎉`
        }]);

      } else if (selectedEvent.event_type === "inter") {
        console.log(`\n💰 INTER-CLUB: ${interClubData.length} participants`);
        
        // Validate
        const invalid = interClubData.filter(p => !p.position || p.xp_awarded == null);
        if (invalid.length > 0) {
          console.error("❌ Invalid participants:", invalid);
          toast.error("Some participants missing position or XP data!");
          return;
        }

        // Award XP to each club
        let totalAwarded = 0;
        for (const participant of interClubData) {
          if (!participant.position) continue;
          
          const xp = participant.xp_awarded ?? 0;
          if (xp <= 0) {
            console.warn(`⚠️ Skipping ${participant.clubs?.name} - XP is 0`);
            continue;
          }

          console.log(`\n💰 Awarding ${xp} XP to ${participant.clubs?.name} (Position ${participant.position})`);
          
          try {
            await updateClubXP(participant.club_id, xp);
            console.log(`✅ Success`);
            totalAwarded += xp;

            // Send notification
            const emoji = participant.position === 1 ? "🥇" :
                         participant.position === 2 ? "🥈" :
                         participant.position === 3 ? "🥉" : `#${participant.position}`;

            await supabase.from("messages").insert([{
              club_id: participant.club_id,
              user_id: currentUserId,
              content: `🔔 SYSTEM: Inter-club event "${selectedEvent.title}" approved! You placed ${emoji} and earned ${xp} XP! 🎉`
            }]);

          } catch (err) {
            console.error(`❌ Failed for ${participant.clubs?.name}:`, err);
            toast.error(`Failed to award XP to ${participant.clubs?.name}`);
            return; // Stop if any fails
          }
        }
        
        toast.success(`✅ ${totalAwarded} XP awarded to ${interClubData.length} clubs!`, {
          duration: 5000,
        });
      }

      // Update event status
      console.log(`\n📝 Updating event status...`);
      const { error: statusError } = await supabase
        .from("events")
        .update({
          status: "approved",
          reviewed_by: currentUserId,
          reviewed_at: new Date().toISOString(),
        })
        .eq("id", selectedEvent.id);

      if (statusError) {
        console.error("❌ Status update failed:", statusError);
        toast.error("Failed to update event status");
        return;
      }

      console.log(`✅ Event status updated`);
      console.log(`🏁 ========== EVENT APPROVAL COMPLETE ==========\n`);
      
      setSelectedEvent(null);
      await fetchPendingEvents();
      
    } catch (err) {
      console.error("\n❌ ========== APPROVAL FAILED ==========");
      console.error("Error:", err);
      toast.error(`Approval failed: ${(err as Error).message}`);
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

    if (selectedEvent.event_type === "intra") {
      await supabase.from("messages").insert([{
        club_id: selectedEvent.club_id,
        user_id: currentUserId,
        content: `🔔 SYSTEM: Event "${selectedEvent.title}" was rejected. Reason: ${rejectionReason}`
      }]);
    } else if (selectedEvent.event_type === "inter") {
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

              <div>
                <h3 className="font-semibold text-lg mb-2">Event Results</h3>
                <div className="bg-white border p-4 rounded-lg">
                  <p className="text-gray-700">{selectedEvent.results_description || "No description provided."}</p>
                </div>
              </div>

              {selectedEvent.event_type === "inter" && interClubData.length > 0 && (
                <div>
                  <h3 className="font-semibold text-lg mb-2">Competition Results</h3>
                  <div className="bg-white border rounded-lg overflow-hidden">
                    <table className="w-full">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-2 text-left">Position</th>
                          <th className="px-4 py-2 text-left">Club</th>
                          <th className="px-4 py-2 text-right">XP to Award</th>
                        </tr>
                      </thead>
                      <tbody>
                        {interClubData
                          .sort((a, b) => (a.position || 99) - (b.position || 99))
                          .map((participant) => (
                            <tr key={participant.club_id} className="border-t">
                              <td className="px-4 py-2">
                                {participant.position === 1 && "🥇 1st"}
                                {participant.position === 2 && "🥈 2nd"}
                                {participant.position === 3 && "🥉 3rd"}
                                {participant.position && participant.position > 3 && `#${participant.position}`}
                                {!participant.position && "N/A"}
                              </td>
                              <td className="px-4 py-2">{participant.clubs?.name || "Unknown Club"}</td>
                              <td className="px-4 py-2 text-right font-semibold">
                                {participant.xp_awarded ?? 0} XP
                              </td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

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

              <div className="flex gap-3 pt-4 border-t">
                <button
                  onClick={handleApprove}
                  className="flex-1 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 font-semibold"
                >
                  ✅ Approve Event
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