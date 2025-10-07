"use client";
import "../page.css";

import { useState, useEffect, useRef } from "react";
import { supabase } from "@/utils/supabaseClient";
import { useRouter } from "next/navigation";
import toast, { Toaster } from "react-hot-toast";

type Profile = {
    id: string;
    full_name?: string;
    username?: string;
    description?: string | null;
    profile_photo?: string | null;
    leaderboard_rank?: number;
};

type Message = {
    id: string;
    from_user_id: string;
    to_user_id: string;
    content: string;
    created_at: string;
};

export default function ConnectionsPage() {
    const [profiles, setProfiles] = useState<Profile[]>([]);
    const [selectedUser, setSelectedUser] = useState<Profile | null>(null);
    const [currentUserId, setCurrentUserId] = useState<string | null>(null);
    const [messages, setMessages] = useState<Message[]>([]);
    const [newMessage, setNewMessage] = useState("");
    const [chatOpen, setChatOpen] = useState(false);

    const messagesEndRef = useRef<HTMLDivElement | null>(null);
    const router = useRouter();

    // ✅ Auto-scroll
    useEffect(() => {
        if (messagesEndRef.current) {
            messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
        }
    }, [messages]);

    // ✅ Get current user
    useEffect(() => {
        async function getUser() {
            const { data } = await supabase.auth.getUser();
            if (data?.user) setCurrentUserId(data.user.id);
        }
        getUser();
    }, []);

    // ✅ Fetch accepted connections with leaderboard ranks
    useEffect(() => {
        if (!currentUserId) return;

        async function fetchConnections() {
            const { data, error } = await supabase
                .from("profile_requests")
                .select("*")
                .eq("status", "accepted")
                .or(`from_user_id.eq.${currentUserId},to_user_id.eq.${currentUserId}`);

            if (error) {
                console.error("Connections fetch error:", error);
                return;
            }

            const otherUserIds = data.map((req) =>
                req.from_user_id === currentUserId ? req.to_user_id : req.from_user_id
            );

            if (otherUserIds.length === 0) {
                setProfiles([]);
                return;
            }

            const { data: profileData, error: profileError } = await supabase
                .from("profiles")
                .select("*")
                .in("id", otherUserIds);

            if (profileError) {
                console.error("Profile fetch error:", profileError);
                return;
            }

            // Add rank
            const withRank = (profileData || []).map((p: any, i: number) => ({
                ...p,
                leaderboard_rank: i + 1,
            }));

            setProfiles(withRank);
        }

        fetchConnections();
    }, [currentUserId]);

    // ✅ Avatar fallback
    const getAvatar = (profile: Profile) => {
        if (profile.profile_photo) return profile.profile_photo;
        const name = encodeURIComponent(profile.full_name || profile.username || "User");
        return `https://ui-avatars.com/api/?name=${name}&background=random&size=128`;
    };

    // ✅ Open chat
    const openChat = async (user: Profile) => {
        setSelectedUser(user);
        setChatOpen(true);

        if (!currentUserId) return;

        const { data, error } = await supabase
            .from("user_messages")
            .select("*")
            .or(
                `and(from_user_id.eq.${currentUserId},to_user_id.eq.${user.id}),and(from_user_id.eq.${user.id},to_user_id.eq.${currentUserId})`
            )
            .order("created_at", { ascending: true });

        if (error) return console.error("Messages fetch error:", error);

        setMessages(data || []);

        supabase
            .channel("user-messages")
            .on(
                "postgres_changes",
                { event: "INSERT", schema: "public", table: "user_messages" },
                (payload) => {
                    const msg = payload.new as Message;
                    if (
                        (msg.from_user_id === currentUserId && msg.to_user_id === user.id) ||
                        (msg.from_user_id === user.id && msg.to_user_id === currentUserId)
                    ) {
                        setMessages((prev) => [...prev, msg]);
                    }
                }
            )
            .subscribe();
    };

    // ✅ Send message
    const handleSendMessage = async () => {
        if (!newMessage.trim() || !currentUserId || !selectedUser) return;

        const tempMsg: Message = {
            id: Date.now().toString(),
            from_user_id: currentUserId,
            to_user_id: selectedUser.id,
            content: newMessage,
            created_at: new Date().toISOString(),
        };

        setMessages((prev) => [...prev, tempMsg]);
        setNewMessage("");

        const { error } = await supabase.from("user_messages").insert([
            { from_user_id: currentUserId, to_user_id: selectedUser.id, content: tempMsg.content },
        ]);

        if (error) {
            toast.error("Failed to send ❌");
            console.error("Send message error:", error);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-6 relative">
            <Toaster position="top-right" />
            <div className="max-w-6xl mx-auto">
                {/* 🔹 Back button */}
                <div className="flex items-center justify-between mb-6 relative">
                    {/* Back button - left */}
                    <button
                        onClick={() => router.push("/ratings")}
                        className="bg-gray-200 hover:bg-gray-300 text-gray-700 px-4 py-2 rounded-lg shadow"
                    >
                        ← Back
                    </button>

                    {/* Center heading */}
                    <h1 className="absolute left-1/2 transform -translate-x-1/2 text-3xl font-bold text-gray-900">
                        MY CONNECTIONS
                    </h1>
                </div>


                {/* 🔹 Two-column layout */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* LEFT: Connected profiles */}
                    <div className="space-y-3">
                        {profiles.length > 0 ? (
                            profiles.map((profile) => {
                                const name = profile.full_name || profile.username || "Unnamed";
                                return (
                                    <div
                                        key={profile.id}
                                        className="flex items-center justify-between bg-white p-4 rounded-xl shadow"
                                    >
                                        <div className="flex items-center gap-3">
                                            <img src={getAvatar(profile)} alt={name} className="w-12 h-12 rounded-full" />
                                            <div>
                                                <p className="font-medium text-gray-900">{name}</p>
                                                <p className="text-sm text-indigo-600">#{profile.leaderboard_rank}</p>
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => {
                                                setSelectedUser(profile);
                                                setChatOpen(false);
                                            }}
                                            className="bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1 rounded-lg shadow text-sm"
                                        >
                                            View
                                        </button>
                                    </div>
                                );
                            })
                        ) : (
                            <p className="text-gray-500 text-center">No connections yet</p>
                        )}
                    </div>

                    {/* RIGHT: Profile / Chat */}
                    <div className="bg-white rounded-xl shadow h-[500px] flex flex-col relative">
                        {selectedUser ? (
                            !chatOpen ? (
                                // Profile view
                                <div className="flex flex-col items-center justify-center flex-1 p-6">
                                    <img
                                        src={getAvatar(selectedUser)}
                                        alt="profile"
                                        className="w-24 h-24 rounded-full mb-3"
                                    />
                                    <h2 className="text-lg font-semibold">{selectedUser.full_name}</h2>
                                    <p className="text-gray-500 text-sm mb-4">
                                        {selectedUser.description || "No bio"}
                                    </p>
                                    <button
                                        onClick={() => openChat(selectedUser)}
                                        className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg"
                                    >
                                        Message
                                    </button>
                                </div>
                            ) : (
                                // Chat view
                                <div className="flex flex-col flex-1 h-full">
                                    {/* Header */}
                                    <div
                                        className="flex items-center gap-3 p-4 border-b cursor-pointer"
                                        onClick={() => setChatOpen(false)} // back to profile view
                                    >
                                        <img
                                            src={getAvatar(selectedUser)}
                                            alt="profile"
                                            className="w-10 h-10 rounded-full"
                                        />
                                        <h2 className="font-semibold text-gray-900">
                                            {selectedUser.full_name}
                                        </h2>
                                    </div>

                                    {/* Messages */}
                                    <div className="flex-1 overflow-y-auto p-4 space-y-2 scrollbar-hide">
                                        {messages.map((msg) => (
                                            <div
                                                key={msg.id}
                                                className={`p-2 rounded-lg text-sm max-w-[70%] relative ${msg.from_user_id === currentUserId
                                                    ? "bg-blue-500 text-white ml-auto"
                                                    : "bg-gray-200 text-gray-900"
                                                    }`}
                                            >
                                                <p>{msg.content}</p>
                                                <span className="text-[10px] opacity-70 block mt-1 text-right">
                                                    {new Date(msg.created_at).toLocaleTimeString([], {
                                                        hour: "2-digit",
                                                        minute: "2-digit",
                                                    })}
                                                </span>
                                            </div>
                                        ))}
                                        <div ref={messagesEndRef} />
                                    </div>

                                    {/* Input */}
                                    <div className="flex p-3 border-t">
                                        <input
                                            type="text"
                                            value={newMessage}
                                            onChange={(e) => setNewMessage(e.target.value)}
                                            onKeyDown={(e) => e.key === "Enter" && handleSendMessage()}
                                            className="flex-1 border rounded-full px-3 py-2 text-sm bg-gray-100 text-gray-900"
                                            placeholder="Type a message..."
                                        />
                                        <button
                                            onClick={handleSendMessage}
                                            className="ml-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-4 py-2 rounded-full"
                                        >
                                            Send
                                        </button>
                                    </div>
                                </div>
                            )
                        ) : (
                            <p className="text-gray-500 m-auto">Select a connection to start</p>
                        )}
                    </div>
                </div>
            </div>

            {/* ✅ Floating + Button */}
            <button
                className="absolute bottom-6 right-6 w-12 h-12 bg-gradient-to-r from-indigo-600 to-purple-600 text-white text-xl rounded-full shadow-lg flex items-center justify-center hover:opacity-95"
                aria-label="add"
            >
                +
            </button>
        </div>
    );
}
