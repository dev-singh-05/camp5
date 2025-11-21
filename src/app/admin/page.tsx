"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/utils/supabaseClient";
import Link from "next/link";
import { toast } from "react-hot-toast";

export default function AdminDashboard() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    async function init() {
      try {
        setLoading(true);

        // Check authentication
       // Check both authentication AND admin role
const { data: auth } = await supabase.auth.getUser();
if (!auth?.user) {
  router.push("/login");
  return;
}

// Verify admin role from database
const { data: profile } = await supabase
  .from("profiles")
  .select("role")
  .eq("id", auth.user.id)
  .single();

if (profile?.role !== "admin") {
  toast.error("Unauthorized access");
  router.push("/dashboard");
  return;
}
        setUser(auth.user);
      } catch (err) {
        console.error("Init error:", err);
        alert("Failed to load admin panel.");
      } finally {
        setLoading(false);
      }
    }

    init();
  }, [router]);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-pink-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading admin panel...</p>
        </div>
      </div>
    );
  }

  const adminLinks = [
    {
      title: "Icebreaker Questions",
      description: "Manage icebreaker questions for matches and chat",
      href: "/admin/icebreaker-questions",
      icon: "💬",
      color: "from-blue-500 to-cyan-500",
    },
    {
      title: "Dating Verifications",
      description: "Review and approve dating profile verifications",
      href: "/admin/dating-verifications",
      icon: "✅",
      color: "from-green-500 to-emerald-500",
    },
    {
      title: "Events",
      description: "Create and manage campus events",
      href: "/admin/events",
      icon: "🎉",
      color: "from-indigo-500 to-blue-500",
    },
    {
      title: "Advertisements",
      description: "Manage platform advertisements and campaigns",
      href: "/admin/ads",
      icon: "📢",
      color: "from-pink-500 to-rose-500",
    },
    {
      title: "News & Updates",
      description: "Post campus news and announcements",
      href: "/admin/news",
      icon: "📰",
      color: "from-cyan-500 to-teal-500",
    },
    {
      title: "User Management",
      description: "Manage users and profiles",
      href: "/admin/users",
      icon: "👥",
      color: "from-purple-500 to-pink-500",
    },
    {
      title: "Reports & Analytics",
      description: "View platform statistics and reports",
      href: "/admin/reports",
      icon: "📊",
      color: "from-orange-500 to-red-500",
    },
    {
      title: "Token Transactions",
      description: "Monitor token purchases and usage",
      href: "/admin/tokens",
      icon: "🪙",
      color: "from-yellow-500 to-amber-500",
    },
    {
      title: "Content Moderation",
      description: "Review reported content and users",
      href: "/admin/moderation",
      icon: "🛡️",
      color: "from-red-500 to-rose-500",
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Header */}
      <header className="bg-white shadow-sm sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => router.back()}
                className="p-2 rounded-lg hover:bg-gray-100 transition"
                aria-label="Go back"
              >
                <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
                <p className="text-sm text-gray-600">Manage all aspects of the platform</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="text-right">
                <p className="text-sm font-medium text-gray-700">Logged in as</p>
                <p className="text-xs text-gray-500">{user?.email}</p>
              </div>
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-pink-500 to-purple-500 flex items-center justify-center text-white font-bold">
                {user?.email?.[0]?.toUpperCase() || 'A'}
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Banner */}
        <div className="bg-gradient-to-r from-pink-500 to-purple-600 rounded-2xl shadow-lg p-8 mb-8 text-white">
          <h2 className="text-2xl font-bold mb-2">Welcome to Admin Panel</h2>
          <p className="text-white/90">
            Manage all platform features from this central dashboard. Click on any card below to access different admin sections.
          </p>
        </div>

        {/* Admin Links Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {adminLinks.map((link) => (
            <Link key={link.href} href={link.href}>
              <div className="group relative bg-white rounded-xl shadow-md hover:shadow-xl transition-all duration-300 overflow-hidden cursor-pointer h-full">
                {/* Gradient Background */}
                <div className={`absolute inset-0 bg-gradient-to-br ${link.color} opacity-0 group-hover:opacity-10 transition-opacity`} />

                {/* Content */}
                <div className="relative p-6 flex flex-col h-full">
                  <div className="flex items-start justify-between mb-4">
                    <div className="w-14 h-14 rounded-xl bg-gradient-to-br ${link.color} bg-opacity-10 flex items-center justify-center text-3xl">
                      {link.icon}
                    </div>
                    <svg
                      className="w-6 h-6 text-gray-400 group-hover:text-gray-600 group-hover:translate-x-1 transition-all"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>

                  <h3 className="text-xl font-bold text-gray-900 mb-2 group-hover:text-pink-600 transition-colors">
                    {link.title}
                  </h3>

                  <p className="text-gray-600 text-sm flex-grow">
                    {link.description}
                  </p>

                  <div className="mt-4 pt-4 border-t border-gray-100">
                    <span className="text-sm font-medium text-pink-600 group-hover:underline">
                      Manage →
                    </span>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>

        {/* Quick Stats */}
        <div className="mt-8 bg-white rounded-xl shadow-md p-6">
          <h3 className="text-lg font-bold text-gray-900 mb-4">Quick Stats</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <p className="text-2xl font-bold text-blue-600">-</p>
              <p className="text-sm text-gray-600 mt-1">Active Users</p>
            </div>
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <p className="text-2xl font-bold text-green-600">-</p>
              <p className="text-sm text-gray-600 mt-1">Total Matches</p>
            </div>
            <div className="text-center p-4 bg-purple-50 rounded-lg">
              <p className="text-2xl font-bold text-purple-600">-</p>
              <p className="text-sm text-gray-600 mt-1">Pending Verifications</p>
            </div>
            <div className="text-center p-4 bg-orange-50 rounded-lg">
              <p className="text-2xl font-bold text-orange-600">-</p>
              <p className="text-sm text-gray-600 mt-1">Reports</p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
