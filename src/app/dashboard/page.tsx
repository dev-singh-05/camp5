"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/utils/supabaseClient";
import Link from "next/link";

export default function Dashboard() {
  const router = useRouter();
  const [profileName, setProfileName] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function checkUser() {
      const { data, error } = await supabase.auth.getUser();
      if (error || !data.user) {
        router.push("/login");
        return;
      }

      // fetch profile name
      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("id", data.user.id)
        .single();

      setProfileName(profile?.full_name || "Student");
      setLoading(false);
    }

    checkUser();
  }, [router]);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-gradient-to-r from-purple-500 to-pink-600">
        <p className="text-white text-lg">Loading dashboard...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-6xl mx-auto flex justify-between items-center px-6 py-4">
          <h1 className="text-2xl font-bold text-gray-800">Campu5 Dashboard</h1>
          <div className="flex items-center gap-4">
            <Link href="/profile" className="font-medium text-gray-700 hover:underline">
              Welcome, {profileName}
            </Link>
            <button
              onClick={async () => {
                await supabase.auth.signOut();
                router.push("/login");
              }}
              className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      {/* Main Section */}
      <main className="max-w-6xl mx-auto px-6 py-10">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          {/* Clubs */}
          <Link href="/clubs">
            <div className="p-6 bg-white rounded-lg shadow hover:shadow-lg transition cursor-pointer">
              <div className="text-4xl">🏆</div>
              <h2 className="mt-4 text-xl font-semibold text-gray-800">
                Clubs
              </h2>
              <p className="mt-2 text-gray-500 text-sm">
                Create or join student clubs.
              </p>
            </div>
          </Link>

          {/* Ratings */}
          <Link href="/ratings">
            <div className="p-6 bg-white rounded-lg shadow hover:shadow-lg transition cursor-pointer">
              <div className="text-4xl">⭐</div>
              <h2 className="mt-4 text-xl font-semibold text-gray-800">
                Ratings
              </h2>
              <p className="mt-2 text-gray-500 text-sm">
                Rate classmates and view leaderboards.
              </p>
            </div>
          </Link>

          {/* Dating */}
          <Link href="/dating">
            <div className="p-6 bg-white rounded-lg shadow hover:shadow-lg transition cursor-pointer">
              <div className="text-4xl">💌</div>
              <h2 className="mt-4 text-xl font-semibold text-gray-800">
                Blind Dating
              </h2>
              <p className="mt-2 text-gray-500 text-sm">
                Meet anonymously, reveal when ready.
              </p>
            </div>
          </Link>
        </div>
      </main>
    </div>
  );
}

