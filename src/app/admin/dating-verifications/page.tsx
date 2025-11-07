"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/utils/supabaseClient";
import toast, { Toaster } from "react-hot-toast";
import { CheckCircle, XCircle, Clock, Eye } from "lucide-react";

type Verification = {
  id: string;
  user_id: string;
  full_name: string;
  id_card_url: string;
  fee_receipt_url: string;
  status: "pending" | "approved" | "rejected";
  submitted_at: string;
  reviewed_at?: string;
  reviewed_by?: string;
  rejection_reason?: string;
  profiles?: {
    full_name?: string;
    college_email?: string;
  } | null;
};

export default function DatingVerificationAdmin() {
  const [verifications, setVerifications] = useState<Verification[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "pending" | "approved" | "rejected">(
    "pending"
  );
  const [selectedVerification, setSelectedVerification] =
    useState<Verification | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [processing, setProcessing] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    checkAdminAccess();
  }, []);

  useEffect(() => {
    if (isAdmin) {
      fetchVerifications();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter, isAdmin]);

  // Helper: try to extract storage path from full URL if needed
  

  // ✅ Admin access check
  async function checkAdminAccess() {
    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        toast.error("Please login first");
        setTimeout(() => (window.location.href = "/login"), 2000);
        return;
      }

      // use maybeSingle to avoid throwing when no row exists
      const [adminsCheck, profileCheck] = await Promise.all([
        supabase.from("admins").select("user_id").eq("user_id", user.id).maybeSingle(),
        supabase.from("profiles").select("role").eq("id", user.id).maybeSingle(),
      ]);

      const isAdminUser =
        (adminsCheck && (adminsCheck as any).data) ||
        profileCheck?.data?.role === "admin";

      if (!isAdminUser) {
        toast.error("Access denied. Admin only.");
        setTimeout(() => (window.location.href = "/"), 2000);
        return;
      }

      setIsAdmin(true);
    } catch (err) {
      console.error("Admin check error:", err);
      toast.error("Error checking admin access");
    }
  }

  // ✅ Signed URL helper (handles when stored value is a full URL)
// Helper: try to extract storage path from full URL if needed
function extractBucketPath(maybeUrl: string | null): string | null {
  if (!maybeUrl) return null;
  try {
    // If it's already a simple path (no protocol), return as-is
    if (!maybeUrl.includes("http")) return maybeUrl;
    const u = new URL(maybeUrl);
    const parts = u.pathname.split("/").filter(Boolean);
    // Try to detect common Supabase storage URL pattern:
    // e.g. /storage/v1/object/public/<bucket>/<path...>
    const objectIdx = parts.indexOf("object");
    if (objectIdx >= 0) {
      // after 'object' there is usually 'public' then bucket name then path
      // slice from objectIdx + 3 to skip ['object','public','<bucket>']
      return parts.slice(objectIdx + 3).join("/");
    }
    // fallback: if url contains '/public/' (older patterns)
    const pubIdx = parts.indexOf("public");
    if (pubIdx >= 0) {
      return parts.slice(pubIdx + 1).join("/");
    }
    // otherwise return everything after bucket-name style (best-effort)
    return parts.join("/");
  } catch (e) {
    return maybeUrl;
  }
}

// ✅ Signed URL helper (handles when stored value is a full URL)
async function getSignedUrlForPath(path: string | null) {
  if (!path) return null;
  const cleaned = extractBucketPath(path); // ensures it's a path, not full url
  if (!cleaned) return null;
  const { data, error } = await supabase.storage.from("dating-verification").createSignedUrl(cleaned, 300);
  if (error) return null;
  return data.signedUrl;
}



  // ✅ Load signed URLs into modal
  async function openVerificationModal(verification: Verification) {
    try {
      toast.loading("Loading images...", { id: "modal" });
      const [idCardSigned, feeSigned] = await Promise.all([
        getSignedUrlForPath(verification.id_card_url),
        getSignedUrlForPath(verification.fee_receipt_url),
      ]);
      toast.dismiss("modal");

      setSelectedVerification({
        ...verification,
        id_card_url: idCardSigned ?? verification.id_card_url,
        fee_receipt_url: feeSigned ?? verification.fee_receipt_url,
      });
    } catch (e) {
      console.error("openVerificationModal error:", e);
      toast.dismiss("modal");
      toast.error("Failed to load images");
    }
  }

  // ✅ Fetch verifications (robust: fetch profiles separately to avoid relation name issues)
  async function fetchVerifications() {
    setLoading(true);
    try {
      let query = supabase
        .from("dating_verifications")
        .select("*")
        .order("submitted_at", { ascending: false });

      if (filter !== "all") query = query.eq("status", filter);

      const { data: items, error } = await query;

      if (error) throw error;

      const rows: Verification[] = (items || []) as Verification[];

      // batch fetch profiles for present user_ids
      const userIds = Array.from(new Set(rows.map((r) => r.user_id).filter(Boolean)));
      let profiles: { id: string; full_name?: string; college_email?: string }[] = [];

      if (userIds.length > 0) {
        const { data: pData, error: pErr } = await supabase
          .from("profiles")
          .select("id, full_name, college_email")
          .in("id", userIds);

        if (pErr) {
          console.warn("Failed to fetch related profiles:", pErr);
        } else {
          profiles = pData || [];
        }
      }

      const merged = rows.map((r) => ({
        ...r,
        profiles: profiles.find((p) => p.id === r.user_id) ?? null,
      }));

      setVerifications(merged);
    } catch (err) {
      console.error("Fetch verifications error:", err);
      toast.error("Failed to load verifications");
    } finally {
      setLoading(false);
    }
  }

  // ✅ Approve handler (also insert notification so client can react)
  // call RPC
async function handleApprove(verificationId: string, userId: string) {
  if (!confirm("Approve this verification?")) return;
  setProcessing(true);
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Not authenticated");

    // call RPC
    const { error } = await supabase.rpc("approve_dating_verification", {
      v_id: verificationId,
      reviewer: user.id,
    });

    if (error) throw error;

    toast.success("Verification approved");
    fetchVerifications(); // or rely on Realtime
    setSelectedVerification(null);
  } catch (err) {
    console.error(err);
    toast.error("Failed to approve");
  } finally {
    setProcessing(false);
  }
}


  // ✅ Reject handler (also insert notification)
  async function handleReject(verificationId: string, userId: string) {
  if (!rejectionReason.trim()) {
    toast.error("Please provide rejection reason");
    return;
  }
  if (!confirm("Reject this verification?")) return;
  setProcessing(true);
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Not authenticated");

    const { error } = await supabase.rpc("reject_dating_verification", {
      v_id: verificationId,
      reviewer: user.id,
      rej_reason: rejectionReason.trim()
    });

    if (error) throw error;

    toast.success("Verification rejected");
    fetchVerifications();
    setSelectedVerification(null);
    setRejectionReason("");
  } catch (err) {
    console.error(err);
    toast.error("Failed to reject");
  } finally {
    setProcessing(false);
  }
}

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return (
          <span className="px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full text-xs font-medium flex items-center gap-1">
            <Clock className="w-3 h-3" /> Pending
          </span>
        );
      case "approved":
        return (
          <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-xs font-medium flex items-center gap-1">
            <CheckCircle className="w-3 h-3" /> Approved
          </span>
        );
      case "rejected":
        return (
          <span className="px-3 py-1 bg-red-100 text-red-800 rounded-full text-xs font-medium flex items-center gap-1">
            <XCircle className="w-3 h-3" /> Rejected
          </span>
        );
      default:
        return null;
    }
  };

  // ✅ Loading fallback
  if (!isAdmin && !loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600">Checking admin access...</p>
        </div>
      </div>
    );
  }

  // ✅ Main UI
  return (
    <div className="min-h-screen bg-gray-50">
      <Toaster position="top-center" />

      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <h1 className="text-3xl font-bold text-gray-900">Dating Verifications</h1>
          <p className="text-sm text-gray-600 mt-1">
            Review and approve user verifications
          </p>
        </div>
      </header>

      {/* Filters */}
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="flex gap-2 mb-6">
          {(["all", "pending", "approved", "rejected"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded-lg font-medium transition ${
                filter === f
                  ? "bg-pink-500 text-white"
                  : "bg-white text-gray-700 hover:bg-gray-100"
              }`}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>

        {/* Verifications list */}
        {loading ? (
          <div className="text-center py-12">
            <p className="text-gray-500">Loading verifications...</p>
          </div>
        ) : verifications.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500">No verifications found</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {verifications.map((verification) => (
              <div
                key={verification.id}
                className="bg-white rounded-lg shadow p-4 hover:shadow-md transition"
              >
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h3 className="font-semibold text-gray-900">
                      {verification.full_name}
                    </h3>
                    <p className="text-sm text-gray-500">
                      {verification.profiles?.college_email || "No email"}
                    </p>
                  </div>
                  {getStatusBadge(verification.status)}
                </div>

                <p className="text-xs text-gray-400 mb-3">
                  Submitted:{" "}
                  {new Date(verification.submitted_at).toLocaleString()}
                </p>

                <button
                  onClick={async () => await openVerificationModal(verification)}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition"
                >
                  <Eye className="w-4 h-4" />
                  Review
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Review Modal */}
      {selectedVerification && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-gradient-to-r from-pink-500 to-purple-500 text-white p-6 rounded-t-2xl flex justify-between items-center">
              <div>
                <h2 className="text-2xl font-bold">
                  {selectedVerification.full_name}
                </h2>
                <p className="text-sm opacity-90">
                  {selectedVerification.profiles?.college_email || "No email"}
                </p>
              </div>
              {getStatusBadge(selectedVerification.status)}
            </div>

            <div className="p-6 space-y-6">
              {/* ID Card */}
              <div>
                <h3 className="font-semibold text-gray-900 mb-2">ID Card Photo</h3>
                <img
                  src={selectedVerification.id_card_url}
                  alt="ID Card"
                  className="w-full rounded-lg border-2 border-gray-200"
                />
              </div>

              {/* Fee Receipt */}
              <div>
                <h3 className="font-semibold text-gray-900 mb-2">Fee Receipt</h3>
                <img
                  src={selectedVerification.fee_receipt_url}
                  alt="Fee Receipt"
                  className="w-full rounded-lg border-2 border-gray-200"
                />
              </div>

              {/* Rejection reason input */}
              {selectedVerification.status === "pending" && (
                <div>
                  <label className="block font-semibold text-gray-900 mb-2">
                    Rejection Reason (if rejecting)
                  </label>
                  <textarea
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    placeholder="Provide reason for rejection..."
                    className="w-full border rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-pink-400"
                    rows={3}
                  />
                </div>
              )}

              {/* Show rejection reason */}
              {selectedVerification.status === "rejected" &&
                selectedVerification.rejection_reason && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <p className="text-sm font-semibold text-red-800 mb-1">
                      Rejection Reason:
                    </p>
                    <p className="text-sm text-red-700">
                      {selectedVerification.rejection_reason}
                    </p>
                  </div>
                )}

              {/* Actions */}
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setSelectedVerification(null);
                    setRejectionReason("");
                  }}
                  className="flex-1 px-4 py-3 bg-gray-100 hover:bg-gray-200 rounded-lg font-medium"
                >
                  Close
                </button>

                {selectedVerification.status === "pending" && (
                  <>
                    <button
                      onClick={() =>
                        handleReject(
                          selectedVerification.id,
                          selectedVerification.user_id
                        )
                      }
                      disabled={processing}
                      className="flex-1 px-4 py-3 bg-red-500 hover:bg-red-600 text-white rounded-lg font-medium disabled:bg-gray-400"
                    >
                      {processing ? "Processing..." : "Reject"}
                    </button>
                    <button
                      onClick={() =>
                        handleApprove(
                          selectedVerification.id,
                          selectedVerification.user_id
                        )
                      }
                      disabled={processing}
                      className="flex-1 px-4 py-3 bg-green-500 hover:bg-green-600 text-white rounded-lg font-medium disabled:bg-gray-400"
                    >
                      {processing ? "Processing..." : "Approve"}
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
