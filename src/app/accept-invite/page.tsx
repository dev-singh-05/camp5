"use client";
import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/utils/supabaseClient";
import { Toaster, toast } from "react-hot-toast";

export default function AcceptInvitePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [loading, setLoading] = useState(true);
  const [club, setClub] = useState<any>(null);

  useEffect(() => {
    const verifyInvite = async () => {
      if (!token) {
        toast.error("Invalid or missing invite link.");
        setLoading(false);
        return;
      }

      // fetch invite
      const { data: invite, error } = await supabase
        .from("club_invites")
        .select("id, club_id, role, max_uses, uses, expires_at, clubs(name)")
        .eq("token", token)
        .single();

      if (error || !invite) {
        toast.error("Invite link is invalid or expired.");
        setLoading(false);
        return;
      }

      // check expiry
      if (invite.expires_at && new Date(invite.expires_at) < new Date()) {
        toast.error("This invite has expired.");
        setLoading(false);
        return;
      }

      // check max uses
      if (invite.max_uses > 0 && invite.uses >= invite.max_uses) {
        toast.error("This invite link has already been used.");
        setLoading(false);
        return;
      }

      setClub(invite.clubs);
      setLoading(false);
    };

    verifyInvite();
  }, [token]);

  const handleJoin = async () => {
    setLoading(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      toast.error("You must log in to accept an invite.");
      setLoading(false);
      router.push("/login");
      return;
    }

    // fetch invite again
    const { data: invite, error: inviteError } = await supabase
      .from("club_invites")
      .select("id, club_id, role, max_uses, uses")
      .eq("token", token)
      .single();

    if (inviteError || !invite) {
      toast.error("Invalid or expired invite.");
      setLoading(false);
      return;
    }

    // check if already a member
    const { data: existing } = await supabase
      .from("club_members")
      .select("user_id")
      .eq("club_id", invite.club_id)
      .eq("user_id", user.id)
      .maybeSingle();

    if (existing) {
      toast.success("You are already a member of this club.");
      router.push(`/clubs/${invite.club_id}`);
      return;
    }

    // insert into members
    const { error: insertError } = await supabase.from("club_members").insert([
      {
        club_id: invite.club_id,
        user_id: user.id,
        role: invite.role,
      },
    ]);

    if (insertError) {
      toast.error("Failed to join club.");
      setLoading(false);
      return;
    }

    // increment uses
    await supabase
      .from("club_invites")
      .update({ uses: invite.uses + 1 })
      .eq("id", invite.id);

    toast.success("🎉 Welcome to the club!");
    router.push(`/clubs/${invite.club_id}`);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <p className="text-gray-600">Checking invite…</p>
      </div>
    );
  }

  if (!club) {
    return (
      <div className="flex items-center justify-center h-screen">
        <p className="text-red-600">This invite is invalid.</p>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center h-screen bg-gray-50">
      <Toaster />
      <div className="bg-white shadow-lg rounded-lg p-8 max-w-md text-center">
        <h1 className="text-2xl font-bold text-gray-800 mb-2">
          Join {club.name}
        </h1>
        <p className="text-gray-600 mb-6">
          You’ve been invited to join this club. Accept below to continue.
        </p>
        <button
          onClick={handleJoin}
          className="w-full px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700"
        >
          Accept Invite
        </button>
      </div>
    </div>
  );
}
