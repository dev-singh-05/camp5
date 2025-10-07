"use client";
import React, { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/utils/supabaseClient";
import { Toaster, toast } from "react-hot-toast";

export default function AcceptInvitePage() {

  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams?.get("token") ?? null;

  const [loading, setLoading] = useState<boolean>(true);
  const [club, setClub] = useState<any>(null);

  useEffect(() => {
    const verifyInvite = async () => {
      setLoading(true);

      try {
        if (!token) {
          toast.error("Invalid or missing invite link.");
          setClub(null);
          return;
        }

        // fetch invite details (with related club name)
        const { data: invite, error } = await supabase
          .from("club_invites")
          .select("id, club_id, role, max_uses, uses, expires_at, clubs(name)")
          .eq("token", token)
          .single();

        if (error || !invite) {
          toast.error("Invite link is invalid or expired.");
          setClub(null);
          return;
        }

        // expiry check
        if (invite.expires_at && new Date(invite.expires_at) < new Date()) {
          toast.error("This invite has expired.");
          setClub(null);
          return;
        }

        // max uses check
        if (invite.max_uses > 0 && (invite.uses ?? 0) >= invite.max_uses) {
          toast.error("This invite link has already been used.");
          setClub(null);
          return;
        }

        // set club (invite.clubs contains the joined club record)
        setClub(invite.clubs ?? null);
      } catch (err: any) {
        console.error("verifyInvite error", err);
        toast.error("Something went wrong while checking the invite.");
        setClub(null);
      } finally {
        setLoading(false);
      }
    };

    verifyInvite();
  }, [token]);

  const handleJoin = async () => {
    setLoading(true);

    try {
      // Ensure user is logged in
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        toast.error("You must log in to accept an invite.");
        router.push("/login");
        return;
      }

      // re-fetch invite to get latest uses/max_uses/expiry
      const { data: invite, error: inviteError } = await supabase
        .from("club_invites")
        .select("id, club_id, role, max_uses, uses, expires_at")
        .eq("token", token)
        .single();

      if (inviteError || !invite) {
        toast.error("Invalid or expired invite.");
        return;
      }

      // double-check expiry
      if (invite.expires_at && new Date(invite.expires_at) < new Date()) {
        toast.error("This invite has expired.");
        return;
      }

      // enforce max uses
      if (invite.max_uses > 0 && (invite.uses ?? 0) >= invite.max_uses) {
        toast.error("This invite link has already been used.");
        return;
      }

      // check if already a member
      const { data: existing, error: existingError } = await supabase
        .from("club_members")
        .select("user_id")
        .eq("club_id", invite.club_id)
        .eq("user_id", user.id)
        .maybeSingle();

      if (existing && (existing as any).user_id) {
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
        console.error("club_members insert error:", insertError);
        toast.error("Failed to join club.");
        return;
      }

      // safely increment invite uses
      const { error: updateError } = await supabase
        .from("club_invites")
        .update({ uses: (invite.uses ?? 0) + 1 })
        .eq("id", invite.id);

      if (updateError) {
        console.error("Failed to update invite uses:", updateError);
        // not blocking: user already added to club, but inform admin / log
        toast("Joined the club but failed to update invite usage.", { icon: "⚠️" });
      } else {
        // if update succeeded, optionally do nothing else
      }

      toast.success("🎉 Welcome to the club!");
      router.push(`/clubs/${invite.club_id}`);
    } catch (err: any) {
      console.error("handleJoin unexpected error:", err);
      toast.error("Something went wrong while joining the club.");
    } finally {
      setLoading(false);
    }
  };

  // loading UI
  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <p className="text-gray-600">Checking invite…</p>
      </div>
    );
  }

  // invalid / missing invite
  if (!club) {
    return (
      <div className="flex items-center justify-center h-screen">
        <p className="text-red-600">This invite is invalid.</p>
      </div>
    );
  }

  // main UI
  return (
    <div className="flex items-center justify-center h-screen bg-gray-50">
      <Toaster />
      <div className="bg-white shadow-lg rounded-lg p-8 max-w-md text-center">
        <h1 className="text-2xl font-bold text-gray-800 mb-2">Join {club.name}</h1>
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
