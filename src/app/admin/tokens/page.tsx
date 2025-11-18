"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/utils/supabaseClient";

type PurchaseRequest = {
  id: string;
  user_id: string;
  amount: number;
  utr_number: string | null;
  payment_screenshot_url: string | null;
  status: string;
  admin_notes: string | null;
  created_at: string;
  profiles?: {
    full_name: string | null;
    college_email: string | null;
  };
};

export default function AdminTokensPage() {
  const router = useRouter();
  const [requests, setRequests] = useState<PurchaseRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "pending" | "approved" | "rejected">("pending");
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  
  const [selectedRequest, setSelectedRequest] = useState<PurchaseRequest | null>(null);
  const [tokenAmount, setTokenAmount] = useState("");
  const [adminNotes, setAdminNotes] = useState("");
  const [processing, setProcessing] = useState(false);
  const [imageLoading, setImageLoading] = useState(true);
  const [imageError, setImageError] = useState(false);
  const [imageUrl, setImageUrl] = useState<string | null>(null);

  useEffect(() => {
    checkAdmin();
  }, []);

  useEffect(() => {
    if (currentUserId) {
      loadRequests();
      
      const channel = supabase
        .channel("admin-token-requests")
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "token_purchase_requests" },
          () => {
            loadRequests();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [filter, currentUserId]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && selectedRequest) {
        setSelectedRequest(null);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedRequest]);

  async function checkAdmin() {
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError || !user) {
        console.error("Auth error:", userError);
        router.push("/login");
        return;
      }

      setCurrentUserId(user.id);

      const { data: adminRecord, error: adminError } = await supabase
        .from("admins")
        .select("user_id")
        .eq("user_id", user.id)
        .maybeSingle();

      if (adminError) {
        console.error("Admin check error:", adminError);
        router.push("/dashboard");
        return;
      }

      if (!adminRecord) {
        console.log("User is not an admin");
        router.push("/dashboard");
        return;
      }
    } catch (err) {
      console.error("checkAdmin error:", err);
      router.push("/dashboard");
    }
  }

  async function loadRequests() {
    try {
      setLoading(true);
      
      let query = supabase
        .from("token_purchase_requests")
        .select("*")
        .order("created_at", { ascending: false });

      if (filter !== "all") {
        query = query.eq("status", filter);
      }

      const { data, error } = await query;

      if (error) {
        console.error("Error loading requests:", error);
        return;
      }

      // Fetch profiles separately to avoid FK relationship issues
      const userIds = [...new Set(data?.map(r => r.user_id) || [])];
      
      const { data: profilesData, error: profilesError } = await supabase
        .from("profiles")
        .select("id, full_name, college_email")
        .in("id", userIds);

      if (profilesError) {
        console.error("Error loading profiles:", profilesError);
      }

      // Create a map for quick profile lookup
      const profilesMap = new Map(
        profilesData?.map(p => [p.id, { full_name: p.full_name, college_email: p.college_email }]) || []
      );

      // Attach profiles to requests
      const transformedData = (data || []).map((item: any) => ({
        id: item.id,
        user_id: item.user_id,
        amount: item.amount,
        utr_number: item.utr_number,
        payment_screenshot_url: item.payment_screenshot_url,
        status: item.status,
        admin_notes: item.admin_notes,
        created_at: item.created_at,
        profiles: profilesMap.get(item.user_id) || { full_name: null, college_email: null }
      }));

      setRequests(transformedData);
    } catch (err) {
      console.error("loadRequests error:", err);
    } finally {
      setLoading(false);
    }
  }

  // Get signed URL for the image
  async function getSignedImageUrl(path: string): Promise<string | null> {
    if (!path) return null;

    try {
      // If it's already a full URL, return it
      if (path.startsWith('http')) {
        return path;
      }

      // Extract just the filename if there's a path prefix
      const filename = path.includes('/') ? path.split('/').pop() || path : path;

      console.log("Getting URL for:", filename);

      // Try to get public URL from token-payments bucket
      const { data: publicData } = supabase.storage
        .from('token-payments')
        .getPublicUrl(filename);

      if (publicData?.publicUrl) {
        console.log("Public URL:", publicData.publicUrl);
        return publicData.publicUrl;
      }

      // If public URL doesn't work, try signed URL
      const { data: signedData, error } = await supabase.storage
        .from('token-payments')
        .createSignedUrl(filename, 3600); // 1 hour expiry

      if (error) {
        console.error("Error getting signed URL:", error);
        return null;
      }

      console.log("Signed URL:", signedData?.signedUrl);
      return signedData?.signedUrl || null;
    } catch (err) {
      console.error("getSignedImageUrl error:", err);
      return null;
    }
  }

  async function handleApprove() {
    if (!selectedRequest || !tokenAmount || parseInt(tokenAmount) <= 0) {
      alert("Please enter a valid token amount");
      return;
    }

    if (!currentUserId) {
      alert("User ID not found");
      return;
    }

    // Check if already processed
    if (selectedRequest.status !== 'pending') {
      alert("This request has already been processed");
      return;
    }

    const confirmMsg = `Approve ${tokenAmount} tokens for ${selectedRequest.profiles?.full_name || 'this user'}?`;
    if (!confirm(confirmMsg)) return;

    setProcessing(true);

    try {
      const tokens = parseInt(tokenAmount);

      // CRITICAL FIX: First verify the request is still pending
      const { data: currentRequest, error: checkError } = await supabase
        .from("token_purchase_requests")
        .select("status")
        .eq("id", selectedRequest.id)
        .maybeSingle();

      if (checkError || !currentRequest) {
        throw new Error("Failed to verify request status");
      }

      if (currentRequest.status !== 'pending') {
        throw new Error("This request has already been processed");
      }

      // Step 1: Update request status FIRST (prevents double-processing)
      const { error: updateError } = await supabase
        .from("token_purchase_requests")
        .update({
          status: "approved",
          amount: tokens,
          admin_notes: adminNotes || null,
          reviewed_at: new Date().toISOString(),
          reviewed_by: currentUserId,
        })
        .eq("id", selectedRequest.id)
        .eq("status", "pending"); // Only update if still pending

      if (updateError) {
        console.error("Update error:", updateError);
        throw new Error("Failed to update request status");
      }

      // Step 2: Get current balance
      const { data: existingTokens, error: balanceError } = await supabase
        .from("user_tokens")
        .select("balance")
        .eq("user_id", selectedRequest.user_id)
        .maybeSingle();

      if (balanceError) {
        console.error("Balance check error:", balanceError);
        throw new Error("Failed to check current balance");
      }

      // Step 3: Update or insert balance (ADD to existing, don't replace)
      if (existingTokens) {
        // User has existing balance - ADD to it
        const newBalance = existingTokens.balance + tokens;
        
        const { error: updateBalanceError } = await supabase
          .from("user_tokens")
          .update({
            balance: newBalance,
            updated_at: new Date().toISOString(),
          })
          .eq("user_id", selectedRequest.user_id);

        if (updateBalanceError) {
          console.error("Balance update error:", updateBalanceError);
          throw new Error("Failed to update token balance");
        }

        console.log(`Updated balance: ${existingTokens.balance} + ${tokens} = ${newBalance}`);
      } else {
        // No existing balance - create new record
        const { error: createError } = await supabase
          .from("user_tokens")
          .insert({
            user_id: selectedRequest.user_id,
            balance: tokens,
          });

        if (createError) {
          console.error("Balance creation error:", createError);
          throw new Error("Failed to create token balance");
        }

        console.log(`Created new balance: ${tokens}`);
      }

      // Step 4: Create transaction record (optional, doesn't block main flow)
      const { error: txError } = await supabase
        .from("token_transactions")
        .insert({
          user_id: selectedRequest.user_id,
          amount: tokens,
          type: "purchase",
          status: "completed",
          description: `Token purchase approved - UTR: ${selectedRequest.utr_number}`,
        });

      if (txError) {
        console.error("Transaction record error:", txError);
        // Don't throw - tokens are already credited
      }

      alert("✅ Request approved and tokens credited successfully!");
      setSelectedRequest(null);
      setTokenAmount("");
      setAdminNotes("");
      loadRequests();
    } catch (err) {
      console.error("handleApprove error:", err);
      alert("❌ Failed to approve request: " + (err as Error).message);
    } finally {
      setProcessing(false);
    }
  }

  async function handleReject() {
    if (!selectedRequest || !currentUserId) return;

    if (selectedRequest.status !== 'pending') {
      alert("This request has already been processed");
      return;
    }

    const confirmMsg = `Reject token purchase request from ${selectedRequest.profiles?.full_name || 'this user'}?`;
    if (!confirm(confirmMsg)) return;

    setProcessing(true);

    try {
      const { error } = await supabase
        .from("token_purchase_requests")
        .update({
          status: "rejected",
          admin_notes: adminNotes || null,
          reviewed_at: new Date().toISOString(),
          reviewed_by: currentUserId,
        })
        .eq("id", selectedRequest.id)
        .eq("status", "pending"); // Only update if still pending

      if (error) throw error;

      // Create transaction record
      const { error: txError } = await supabase
        .from("token_transactions")
        .insert({
          user_id: selectedRequest.user_id,
          amount: 0,
          type: "purchase",
          status: "rejected",
          description: `Token purchase rejected - UTR: ${selectedRequest.utr_number}`,
        });

      if (txError) {
        console.error("Transaction record error:", txError);
      }

      alert("Request rejected");
      setSelectedRequest(null);
      setAdminNotes("");
      loadRequests();
    } catch (err) {
      console.error("handleReject error:", err);
      alert("Failed to reject request: " + (err as Error).message);
    } finally {
      setProcessing(false);
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending": return "bg-yellow-100 text-yellow-700";
      case "approved": return "bg-green-100 text-green-700";
      case "rejected": return "bg-red-100 text-red-700";
      default: return "bg-gray-100 text-gray-700";
    }
  };

  const handleModalOpen = async (request: PurchaseRequest) => {
    setSelectedRequest(request);
    setTokenAmount("");
    setAdminNotes("");
    setImageLoading(true);
    setImageError(false);
    setImageUrl(null);

    // Load the signed image URL
    if (request.payment_screenshot_url) {
      const signedUrl = await getSignedImageUrl(request.payment_screenshot_url);
      setImageUrl(signedUrl);
    }
  };

  if (loading && requests.length === 0) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl mb-4">⏳</div>
          <p className="text-gray-600">Loading requests...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">💎 Token Purchase Requests</h1>
            <p className="text-sm text-gray-600">Review and approve token purchases</p>
          </div>
          <button
            onClick={() => router.push("/admin")}
            className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition"
          >
            ← Back to Admin
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        <div className="flex gap-2 mb-6">
          {(["all", "pending", "approved", "rejected"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded-lg font-medium capitalize transition ${
                filter === f
                  ? "bg-purple-600 text-white"
                  : "bg-white text-gray-700 hover:bg-gray-50"
              }`}
            >
              {f} {f === "pending" && requests.filter(r => r.status === "pending").length > 0 && (
                <span className="ml-1 px-2 py-0.5 bg-red-500 text-white text-xs rounded-full">
                  {requests.filter(r => r.status === "pending").length}
                </span>
              )}
            </button>
          ))}
        </div>

        {requests.length === 0 ? (
          <div className="bg-white rounded-xl shadow p-12 text-center">
            <div className="text-6xl mb-4">📝</div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No Requests</h3>
            <p className="text-gray-600">No {filter} token purchase requests found</p>
          </div>
        ) : (
          <div className="grid gap-4">
            {requests.map((request) => (
              <div
                key={request.id}
                className="bg-white rounded-xl shadow p-6 hover:shadow-lg transition"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-12 h-12 rounded-full bg-purple-100 flex items-center justify-center text-2xl">
                        👤
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900">
                          {request.profiles?.full_name || "Unknown User"}
                        </h3>
                        <p className="text-sm text-gray-500">
                          {request.profiles?.college_email || "No email"}
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 mb-4">
                      <div>
                        <span className="text-xs text-gray-500">UTR Number</span>
                        <p className="font-mono text-sm font-medium">{request.utr_number || "N/A"}</p>
                      </div>
                      <div>
                        <span className="text-xs text-gray-500">Submitted</span>
                        <p className="text-sm">
                          {new Date(request.created_at).toLocaleString()}
                        </p>
                      </div>
                      {request.amount > 0 && (
                        <div>
                          <span className="text-xs text-gray-500">Tokens</span>
                          <p className="text-sm font-bold text-purple-600">💎 {request.amount}</p>
                        </div>
                      )}
                      <div>
                        <span className="text-xs text-gray-500">Status</span>
                        <span className={`inline-block px-2 py-1 rounded text-xs font-medium ${getStatusColor(request.status)}`}>
                          {request.status}
                        </span>
                      </div>
                    </div>

                    {request.admin_notes && (
                      <div className="bg-blue-50 border border-blue-200 rounded p-3 mb-3">
                        <span className="text-xs font-medium text-blue-900">Admin Notes:</span>
                        <p className="text-sm text-blue-800 mt-1">{request.admin_notes}</p>
                      </div>
                    )}

                    {request.payment_screenshot_url && (
                      <div className="mb-3">
                        <button
                          onClick={async () => {
                            const url = await getSignedImageUrl(request.payment_screenshot_url!);
                            if (url) window.open(url, '_blank');
                          }}
                          className="inline-flex items-center gap-2 text-sm text-purple-600 hover:underline"
                        >
                          🖼️ View Payment Screenshot
                        </button>
                      </div>
                    )}
                  </div>

                  {request.status === "pending" && (
                    <button
                      onClick={() => handleModalOpen(request)}
                      className="px-6 py-2 bg-purple-600 text-white rounded-lg font-semibold hover:bg-purple-700 transition"
                    >
                      Review
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Review Modal */}
      {selectedRequest && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-black/60 backdrop-blur-sm"
          onClick={() => !processing && setSelectedRequest(null)}
        >
          <div
            className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sticky top-0 bg-white border-b p-6 flex items-center justify-between z-10">
              <h2 className="text-2xl font-bold text-gray-900">Review Request</h2>
              <button
                onClick={() => !processing && setSelectedRequest(null)}
                disabled={processing}
                className="text-gray-500 hover:text-gray-700 text-2xl disabled:opacity-50"
              >
                ✖
              </button>
            </div>

            <div className="p-6 space-y-6">
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="font-semibold text-gray-900 mb-3">User Details</h3>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <span className="text-gray-500">Name:</span>
                    <p className="font-medium">{selectedRequest.profiles?.full_name || "N/A"}</p>
                  </div>
                  <div>
                    <span className="text-gray-500">Email:</span>
                    <p className="font-medium">{selectedRequest.profiles?.college_email || "N/A"}</p>
                  </div>
                  <div>
                    <span className="text-gray-500">UTR Number:</span>
                    <p className="font-mono font-medium">{selectedRequest.utr_number || "N/A"}</p>
                  </div>
                  <div>
                    <span className="text-gray-500">Submitted:</span>
                    <p className="font-medium">
                      {new Date(selectedRequest.created_at).toLocaleString()}
                    </p>
                  </div>
                </div>
              </div>

              {selectedRequest.payment_screenshot_url && (
                <div>
                  <h3 className="font-semibold text-gray-900 mb-3">Payment Screenshot</h3>
                  <div className="border rounded-lg overflow-hidden bg-gray-50">
                    {imageLoading && !imageError && (
                      <div className="w-full h-96 flex items-center justify-center">
                        <div className="text-gray-400">Loading image...</div>
                      </div>
                    )}
                    {imageError ? (
                      <div className="w-full h-96 flex items-center justify-center">
                        <div className="text-center">
                          <div className="text-4xl mb-2">⚠️</div>
                          <p className="text-gray-600 mb-2">Failed to load image</p>
                          <button
                            onClick={async () => {
                              const url = await getSignedImageUrl(selectedRequest.payment_screenshot_url!);
                              if (url) window.open(url, '_blank');
                            }}
                            className="text-sm text-purple-600 hover:underline"
                          >
                            Try opening in new tab
                          </button>
                        </div>
                      </div>
                    ) : (
                      imageUrl && (
                        <img
                          src={imageUrl}
                          alt="Payment Screenshot"
                          className="w-full max-h-96 object-contain"
                          onLoad={() => setImageLoading(false)}
                          onError={() => {
                            setImageLoading(false);
                            setImageError(true);
                          }}
                          style={{ display: imageLoading ? 'none' : 'block' }}
                        />
                      )
                    )}
                  </div>
                  <button
                    onClick={async () => {
                      const url = await getSignedImageUrl(selectedRequest.payment_screenshot_url!);
                      if (url) window.open(url, '_blank');
                    }}
                    className="inline-block mt-2 text-sm text-purple-600 hover:underline"
                  >
                    Open in new tab →
                  </button>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Token Amount to Credit <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  min="1"
                  value={tokenAmount}
                  onChange={(e) => setTokenAmount(e.target.value)}
                  placeholder="Enter token amount (e.g., 100)"
                  disabled={processing}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 disabled:opacity-50"
                />
                <p className="text-xs text-gray-500 mt-1">
                  These tokens will be ADDED to the user's current balance
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Admin Notes (Optional)
                </label>
                <textarea
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  placeholder="Add any notes about this review..."
                  rows={3}
                  disabled={processing}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 disabled:opacity-50"
                />
              </div>

              <div className="flex gap-3">
                <button
                  onClick={handleApprove}
                  disabled={processing || !tokenAmount || parseInt(tokenAmount) <= 0}
                  className="flex-1 px-6 py-3 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
                >
                  {processing ? "Processing..." : "✓ Approve & Credit Tokens"}
                </button>
                <button
                  onClick={handleReject}
                  disabled={processing}
                  className="flex-1 px-6 py-3 bg-red-600 text-white rounded-lg font-semibold hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
                >
                  {processing ? "Processing..." : "✕ Reject Request"}
                </button>
              </div>

              <button
                onClick={() => setSelectedRequest(null)}
                disabled={processing}
                className="w-full px-6 py-3 border border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-50 disabled:opacity-50 transition"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}