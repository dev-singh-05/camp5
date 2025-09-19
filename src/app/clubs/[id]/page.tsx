"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/utils/supabaseClient";
import { useParams, useRouter } from "next/navigation";

type Club = {
  id: string;
  name: string;
  category: string | null;
  created_by: string;
};

type Member = {
  id: string;
  user_id: string;
  users?: { email: string };
};

type Request = {
  id: string;
  user_id: string;
  status: string;
  users?: { email: string };
};

export default function ClubDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const clubId = Array.isArray(id) ? id[0] : id;

  const [club, setClub] = useState<Club | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [requests, setRequests] = useState<Request[]>([]);
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData?.user) {
        router.push("/login");
        return;
      }
      setUserId(userData.user.id);

      // fetch club
      const { data: clubData } = await supabase
        .from("clubs")
        .select("id, name, category, created_by")
        .eq("id", clubId)
        .single();

      if (clubData) setClub(clubData);

      // fetch members
      const { data: memberData } = await supabase
        .from("club_members")
        .select("id, user_id, users(email)")
        .eq("club_id", clubId);

      setMembers((memberData as Member[]) || []); // ✅ force array

      // fetch requests if leader
      if (clubData?.created_by === userData.user.id) {
        const { data: reqData } = await supabase
          .from("club_requests")
          .select("id, user_id, status, users(email)")
          .eq("club_id", clubId)
          .eq("status", "pending");

        setRequests((reqData as Request[]) || []); // ✅ force array
      }

      setLoading(false);
    }
    fetchData();
  }, [clubId, router]);

  async function approveRequest(reqId: string, reqUserId: string) {
    await supabase.from("club_requests").update({ status: "approved" }).eq("id", reqId);
    await supabase.from("club_members").insert([{ club_id: clubId, user_id: reqUserId }]);
    setRequests((prev) => prev.filter((r) => r.id !== reqId));
    setMembers((prev) => [...prev, { id: reqId, user_id: reqUserId } as Member]);
  }

  async function rejectRequest(reqId: string) {
    await supabase.from("club_requests").update({ status: "rejected" }).eq("id", reqId);
    setRequests((prev) => prev.filter((r) => r.id !== reqId));
  }

  async function leaveClub() {
    if (!userId || !club) return;
    if (club.created_by === userId) {
      alert("Leader cannot leave the club.");
      return;
    }
    await supabase.from("club_members").delete().eq("club_id", clubId).eq("user_id", userId);
    router.push("/clubs");
  }

  if (loading) return <p className="p-6">Loading...</p>;
  if (!club) return <p className="p-6">Club not found.</p>;

  return (
    <div className="p-6 min-h-screen bg-gradient-to-br from-indigo-50 to-white">
      <h1 className="text-3xl font-bold">{club.name}</h1>
      <p className="text-gray-600">{club.category || "General"}</p>

      <h2 className="text-xl font-semibold mt-6 mb-3">Members</h2>
      <ul className="space-y-2">
        {members.map((m) => (
          <li key={m.id} className="p-2 bg-white rounded shadow">
            {m.users?.email || m.user_id}
          </li>
        ))}
      </ul>

      {club.created_by === userId && (
        <>
          <h2 className="text-xl font-semibold mt-6 mb-3">Pending Requests</h2>
          {requests.length === 0 && <p>No pending requests.</p>}
          {requests.map((r) => (
            <div key={r.id} className="p-2 bg-gray-100 rounded flex justify-between">
              <span>{r.users?.email || r.user_id}</span>
              <div className="flex gap-2">
                <button
                  onClick={() => approveRequest(r.id, r.user_id)}
                  className="px-3 py-1 bg-green-500 text-white rounded"
                >
                  Approve
                </button>
                <button
                  onClick={() => rejectRequest(r.id)}
                  className="px-3 py-1 bg-red-500 text-white rounded"
                >
                  Reject
                </button>
              </div>
            </div>
          ))}
        </>
      )}

      <button
        onClick={leaveClub}
        className="mt-6 px-4 py-2 bg-red-600 text-white rounded"
      >
        Leave Club
      </button>
    </div>
  );
}




