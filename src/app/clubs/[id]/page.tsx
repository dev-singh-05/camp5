"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { supabase } from "@/utils/supabaseClient";

// ===== Types =====
type Member = {
  role: string | null;
  profiles: {
    full_name: string;
    enrollment_number: string;
    college_email: string;
  } | null;
};

type Club = {
  name: string;
  description: string | null;
  logo_url: string | null;
};

type Event = {
  id: string;
  title: string;
  event_date: string;
};

// ===== Component =====
export default function ClubDetailsPage() {
  const { id: clubId } = useParams<{ id: string }>();

  const [members, setMembers] = useState<Member[]>([]);
  const [club, setClub] = useState<Club | null>(null);
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);

  // dropdown states
  const [showTeammates, setShowTeammates] = useState(true);
  const [showEvents, setShowEvents] = useState(true);

  // Fetch club + members + events
  useEffect(() => {
    async function fetchData() {
      if (!clubId) return;
      setLoading(true);

      // ---- Club info ----
      const { data: clubData, error: clubError } = await supabase
        .from("clubs")
        .select("name, description, logo_url")
        .eq("id", clubId)
        .single();

      if (clubError) console.error("Error fetching club:", clubError.message);
      setClub(clubData ?? null);

      // ---- Members ----
      const { data: memberData, error: memberError } = await supabase
        .from("club_members")
        .select(`
          role,
          profiles ( full_name, enrollment_number, college_email )
        `)
        .eq("club_id", clubId);

      if (memberError) console.error("Error fetching members:", memberError.message);

      setMembers(
        (memberData ?? []).map((m: any) => ({
          role: m.role ?? null,
          profiles: m.profiles
            ? {
                full_name: m.profiles.full_name ?? "",
                enrollment_number: m.profiles.enrollment_number ?? "",
                college_email: m.profiles.college_email ?? "",
              }
            : null,
        }))
      );

      // ---- Events ----
      const { data: eventData, error: eventError } = await supabase
        .from("events")
        .select("id, title, event_date")
        .eq("club_id", clubId)
        .order("event_date", { ascending: true });

      if (eventError) console.error("Error fetching events:", eventError.message);
      setEvents(
        (eventData ?? []).map((e: any) => ({
          id: e.id,
          title: e.title,
          event_date: e.event_date,
        }))
      );

      setLoading(false);
    }

    fetchData();

    // ✅ Subscribe to realtime updates for members
    if (clubId) {
      const channel = supabase
        .channel("club-members-changes")
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "club_members", filter: `club_id=eq.${clubId}` },
          () => {
            fetchData(); // refresh when members change
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [clubId]);

  return (
    <div className="h-screen w-screen bg-gradient-to-br from-gray-50 via-white to-gray-100">
      <div className="h-full grid grid-cols-1 md:grid-cols-4">
        {/* Sidebar */}
        <div className="col-span-1 flex flex-col bg-white shadow-inner h-screen">
          <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-6">
            {/* Club Logo */}
            <div className="flex items-center justify-center">
              {club?.logo_url ? (
                <img
                  src={club.logo_url}
                  alt="Club Logo"
                  className="w-20 h-20 rounded-full object-cover"
                />
              ) : (
                <div className="w-20 h-20 rounded-full bg-gray-300 flex items-center justify-center text-gray-600 text-2xl">
                  🏅
                </div>
              )}
            </div>

            {/* Invite Button */}
            <button className="w-full px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700">
              Invite
            </button>

            {/* Teammates (Dropdown) */}
            <div className="bg-gray-100 rounded-lg shadow-sm flex flex-col">
              <button
                onClick={() => setShowTeammates(!showTeammates)}
                className="w-full flex justify-between items-center px-4 py-3 font-bold text-gray-800 hover:bg-gray-200 rounded-t-lg"
              >
                Teammates
                <span>{showTeammates ? "▲" : "▼"}</span>
              </button>
              {showTeammates && (
                <div className="max-h-40 overflow-y-auto px-4 py-2">
                  {loading ? (
                    <p className="text-gray-500">Loading teammates...</p>
                  ) : members.length === 0 ? (
                    <p className="text-gray-500">No teammates found.</p>
                  ) : (
                    <ul className="space-y-2">
                      {members.map((m, i) => (
                        <li key={i} className="text-gray-700">
                          {m.role === "admin" ? "👑 " : "👤 "}
                          {m.profiles?.full_name || "Unnamed"} (
                          {m.profiles?.enrollment_number || "No ID"})
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </div>

            {/* Events (Dropdown) */}
            <div className="bg-gray-100 rounded-lg shadow-sm flex flex-col">
              <button
                onClick={() => setShowEvents(!showEvents)}
                className="w-full flex justify-between items-center px-4 py-3 font-bold text-gray-800 hover:bg-gray-200 rounded-t-lg"
              >
                Events
                <span>{showEvents ? "▲" : "▼"}</span>
              </button>
              {showEvents && (
                <div className="max-h-40 overflow-y-auto px-4 py-2">
                  {events.length === 0 ? (
                    <p className="text-gray-500">No events yet.</p>
                  ) : (
                    <ul className="space-y-2">
                      {events.map((e) => (
                        <li key={e.id} className="text-gray-600">
                          📅 {e.title} –{" "}
                          {new Date(e.event_date).toLocaleDateString()}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Leave Club */}
          <div className="p-4">
            <button className="w-full px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700">
              Leave Club
            </button>
          </div>
        </div>

        {/* Placeholder for Chat Section */}
        <div className="col-span-3 flex flex-col bg-white shadow-inner h-screen">
          <div className="p-4 border-b">
            <h1 className="text-xl font-bold text-gray-900">
              {club?.name || "Club"}
            </h1>
            <p className="text-gray-600">{club?.description}</p>
          </div>
          <div className="flex-1 flex items-center justify-center text-gray-400">
            Chat coming soon...
          </div>
        </div>
      </div>
    </div>
  );
}













