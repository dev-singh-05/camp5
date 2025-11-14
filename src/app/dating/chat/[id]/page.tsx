"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/utils/supabaseClient";
import {
  getChatMessages,
  sendChatMessage,
  getRevealStatus,
  deleteMatch,
} from "@/utils/dating";
import { getMatchIcebreakerQuestion, type IcebreakerQuestion } from "@/utils/icebreaker";
import {
  createSurpriseQuestion,
  getSurpriseQuestions,
  revealSurpriseQuestion,
  answerSurpriseQuestion,
  type SurpriseQuestion,
} from "@/utils/surpriseQuestion";
import { MapPin, Briefcase, GraduationCap, Heart, Ruler, Wine, Cigarette, Baby, BookOpen, Sparkles, Coins, AlertCircle } from "lucide-react";
import { motion } from "framer-motion";

import TokenPurchaseModal from "@/components/tokens/TokenPurchaseModal";

/* ---------------------------
   Types & Helpers
   --------------------------- */

type Profile = {
  id: string;
  full_name?: string | null;
  gender?: string | null;
  year?: string | null;
  branch?: string | null;
  height?: string | null;
  profile_photo?: string | null;
  dating_description?: string | null;
  interests?: string[] | null;
  looking_for?: string | null;
  age?: number | null;
  location?: string | null;
  hometown?: string | null;
  work?: string | null;
  education?: string | null;
  exercise?: string | null;
  drinking?: string | null;
  smoking?: string | null;
  kids?: string | null;
  religion?: string | null;
  gallery_photos?: string[] | null;
};

type ChatMessage = {
  id: string;
  match_id?: string;
  sender_id: string;
  message: string;
  created_at?: string | null;
};

type RevealStatus = {
  id?: string;
  match_id?: string;
  user1_reveal?: boolean;
  user2_reveal?: boolean;
  revealed_at?: string | null;
  created_at?: string | null;
};

function isSameDay(a?: string | null, b?: string | null) {
  if (!a || !b) return false;
  const da = new Date(a);
  const db = new Date(b);
  return (
    da.getFullYear() === db.getFullYear() &&
    da.getMonth() === db.getMonth() &&
    da.getDate() === db.getDate()
  );
}

function formatTime(iso?: string | null) {
  if (!iso) return "";
  const d = new Date(iso);
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function formatDate(iso?: string | null) {
  if (!iso) return "";
  const d = new Date(iso);
  return d.toLocaleDateString([], { weekday: "short", month: "short", day: "numeric" });
}

function tempId() {
  return "temp-" + Math.random().toString(36).slice(2, 9);
}

/* ---------------------------
   Small UI components
   --------------------------- */

function Avatar({ src, name, size = 10 }: { src?: string | null; name?: string | null; size?: number }) {
  const initials =
    name
      ?.split(" ")
      .map((n) => n[0])
      .slice(0, 2)
      .join("")
      .toUpperCase() || "?";

  return (
    <div
      className="flex items-center justify-center rounded-full bg-gray-200 overflow-hidden shrink-0"
      style={{ width: `${size * 4}px`, height: `${size * 4}px` }}
    >
      {src ? (
        <img src={src} alt={name || "avatar"} className="w-full h-full object-cover" />
      ) : (
        <span className="text-lg font-semibold text-gray-500">{initials}</span>
      )}
    </div>
  );
}

function MessageBubble({
  msg,
  isOwn,
  showTail = true,
  timestamp,
  prettyTime,
  profilePhoto,
}: {
  msg: ChatMessage;
  isOwn: boolean;
  showTail?: boolean;
  timestamp?: string | null;
  prettyTime?: string;
  profilePhoto?: string | null;
}) {
  return (
    <div className={`flex items-end gap-2 ${isOwn ? "justify-end" : "justify-start"}`}>
      {!isOwn && <Avatar src={profilePhoto} name={undefined} size={9} />}
      <div className="max-w-[70%]">
        <div
          className={`px-4 py-2 rounded-2xl break-words inline-block ${
            isOwn ? "bg-pink-500 text-white rounded-br-xl" : "bg-white text-gray-800 rounded-bl-xl shadow"
          }`}
        >
          <div className="whitespace-pre-wrap">{msg.message}</div>
        </div>
        <div className={`mt-1 text-xs ${isOwn ? "text-right text-gray-200" : "text-left text-gray-500"}`}>
          {prettyTime ?? (timestamp ? formatTime(timestamp) : "")}
        </div>
      </div>
      {isOwn && <Avatar src={profilePhoto} name={undefined} size={9} />}
    </div>
  );
}

/* ---------------------------
   Surprise Question Components
   --------------------------- */

function SurpriseQuestionUnrevealed({
  sq,
  isOwn,
  onReveal,
  profilePhoto,
}: {
  sq: SurpriseQuestion;
  isOwn: boolean;
  onReveal: () => void;
  profilePhoto?: string | null;
}) {
  return (
    <div className={`flex items-end gap-2 ${isOwn ? "justify-end" : "justify-start"}`}>
      {!isOwn && <Avatar src={profilePhoto} name={undefined} size={9} />}
      <div className="max-w-[70%]">
        <div
          className={`px-4 py-3 rounded-2xl ${
            isOwn
              ? "bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-br-xl"
              : "bg-gradient-to-r from-pink-400 to-purple-400 text-white rounded-bl-xl shadow-lg"
          }`}
        >
          <div className="flex items-center gap-2 mb-1">
            <span className="text-2xl">🎁</span>
            <span className="font-bold">Surprise Question!</span>
          </div>
          {isOwn ? (
            <p className="text-sm opacity-90">Waiting for them to reveal...</p>
          ) : (
            <button
              onClick={onReveal}
              className="mt-2 w-full bg-white/20 hover:bg-white/30 backdrop-blur-sm px-4 py-2 rounded-lg font-semibold transition"
            >
              🔓 Click to Reveal
            </button>
          )}
        </div>
        <div className={`mt-1 text-xs ${isOwn ? "text-right text-gray-400" : "text-left text-gray-500"}`}>
          {formatTime(sq.created_at)}
        </div>
      </div>
      {isOwn && <Avatar src={profilePhoto} name={undefined} size={9} />}
    </div>
  );
}

function SurpriseQuestionAnswered({
  sq,
  isOwn,
  profilePhoto,
}: {
  sq: SurpriseQuestion;
  isOwn: boolean;
  profilePhoto?: string | null;
}) {
  return (
    <div className={`flex items-end gap-2 ${isOwn ? "justify-end" : "justify-start"}`}>
      {!isOwn && <Avatar src={profilePhoto} name={undefined} size={9} />}
      <div className="max-w-[70%]">
        <div className="bg-gradient-to-br from-purple-50 to-pink-50 border-2 border-purple-200 rounded-2xl p-4 shadow-md">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-2xl">🎁</span>
            <span className="font-bold text-purple-700">Surprise Question</span>
          </div>
          
          <div className="mb-3">
            <p className="text-sm text-gray-600 mb-1 font-semibold">Question:</p>
            <p className="text-gray-800">{sq.question}</p>
          </div>
          
          <div className="bg-white rounded-lg p-3 border border-purple-100">
            <p className="text-sm text-gray-600 mb-1 font-semibold">Answer:</p>
            <p className="text-gray-800">{sq.answer}</p>
          </div>
          
          <p className="text-xs text-gray-500 mt-2">
            Answered {formatTime(sq.answered_at)}
          </p>
        </div>
      </div>
      {isOwn && <Avatar src={profilePhoto} name={undefined} size={9} />}
    </div>
  );
}

function SurpriseQuestionModal({
  sq,
  onAnswer,
}: {
  sq: SurpriseQuestion;
  onAnswer: (answer: string) => void;
}) {
  const [answer, setAnswer] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!answer.trim()) {
      alert("Please provide an answer!");
      return;
    }
    setIsSubmitting(true);
    try {
      await onAnswer(answer.trim());
    } finally {
      setIsSubmitting(false);
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        alert("Please answer the question to continue!");
      }
    };
    
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("beforeunload", handleBeforeUnload);
    
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, []);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-md" />
      
      <div className="relative z-10 bg-white rounded-3xl shadow-2xl max-w-lg w-full mx-4 overflow-hidden">
        <div className="bg-gradient-to-r from-purple-500 to-pink-500 p-6 text-white">
          <div className="flex items-center gap-3 mb-2">
            <span className="text-4xl">🎁</span>
            <h2 className="text-2xl font-bold">Surprise Question!</h2>
          </div>
          <p className="text-white/90 text-sm">
            Your match sent you a surprise question. Answer it to continue chatting!
          </p>
        </div>

        <div className="p-6">
          <div className="mb-6">
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Question:
            </label>
            <div className="bg-purple-50 border-2 border-purple-200 rounded-xl p-4">
              <p className="text-gray-800 text-lg">{sq.question}</p>
            </div>
          </div>

          <div className="mb-6">
            <label htmlFor="surprise-answer" className="block text-sm font-semibold text-gray-700 mb-2">
              Your Answer: <span className="text-red-500">*</span>
            </label>
            <textarea
              id="surprise-answer"
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              placeholder="Type your answer here..."
              className="w-full h-32 px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-200 resize-none"
              disabled={isSubmitting}
              maxLength={500}
            />
            <p className="text-xs text-gray-500 mt-1">
              {answer.length}/500 characters
            </p>
          </div>

          <button
            onClick={handleSubmit}
            disabled={!answer.trim() || isSubmitting}
            className="w-full bg-gradient-to-r from-purple-500 to-pink-500 text-white py-3 rounded-xl font-bold text-lg hover:from-purple-600 hover:to-pink-600 disabled:from-gray-300 disabled:to-gray-400 disabled:cursor-not-allowed transition shadow-lg"
          >
            {isSubmitting ? "Submitting..." : "Submit Answer 🎉"}
          </button>

          <p className="text-center text-xs text-gray-500 mt-4">
            ⚠️ You must answer to continue using the chat
          </p>
        </div>
      </div>
    </div>
  );
}

/* ---------------------------
   Token Confirmation Modal
   --------------------------- */

function TokenConfirmationModal({
  onConfirm,
  onCancel,
}: {
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full mx-4 overflow-hidden animate-scale-in">
        <div className="bg-gradient-to-r from-purple-500 to-pink-500 p-6 text-white">
          <div className="flex items-center gap-3 mb-2">
            <Coins className="w-10 h-10" />
            <h2 className="text-2xl font-bold">Use 1 Token?</h2>
          </div>
          <p className="text-white/90 text-sm">
            Surprise questions cost 1 token to send
          </p>
        </div>

        <div className="p-6">
          <div className="bg-purple-50 border-2 border-purple-200 rounded-xl p-4 mb-6">
            <div className="flex items-center gap-3">
              <span className="text-3xl">🎁</span>
              <div>
                <p className="font-semibold text-gray-800">Surprise Question</p>
                <p className="text-sm text-gray-600">Make your chat more exciting!</p>
              </div>
            </div>
          </div>

          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-6 flex items-start gap-2">
            <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-amber-800">
              <p className="font-semibold mb-1">Token will be deducted</p>
              <p>1 token will be used to send this surprise question to your match.</p>
            </div>
          </div>

          <div className="flex gap-3">
            <button
              onClick={onCancel}
              className="flex-1 bg-gray-200 text-gray-700 py-3 rounded-xl font-semibold hover:bg-gray-300 transition"
            >
              Cancel
            </button>
            <button
              onClick={onConfirm}
              className="flex-1 bg-gradient-to-r from-purple-500 to-pink-500 text-white py-3 rounded-xl font-bold hover:from-purple-600 hover:to-pink-600 transition shadow-lg flex items-center justify-center gap-2"
            >
              <Coins className="w-5 h-5" />
              Use 1 Token
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---------------------------
   Insufficient Tokens Modal
   --------------------------- */

function InsufficientTokensModal({
  onClose,
  onAddTokens,
}: {
  onClose: () => void;
  onAddTokens: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full mx-4 overflow-hidden animate-scale-in">
        <div className="bg-gradient-to-r from-red-500 to-pink-500 p-6 text-white">
          <div className="flex items-center gap-3 mb-2">
            <AlertCircle className="w-10 h-10" />
            <h2 className="text-2xl font-bold">Insufficient Tokens</h2>
          </div>
          <p className="text-white/90 text-sm">
            You need at least 1 token to send a surprise question
          </p>
        </div>

        <div className="p-6">
          <div className="bg-red-50 border-2 border-red-200 rounded-xl p-6 mb-6 text-center">
            <Coins className="w-16 h-16 mx-auto mb-3 text-red-400" />
            <p className="font-semibold text-gray-800 text-lg mb-2">No Tokens Available</p>
            <p className="text-sm text-gray-600">Add tokens to continue using premium features like surprise questions</p>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-6">
            <p className="text-sm text-blue-800">
              <span className="font-semibold">💡 Tip:</span> Tokens unlock special features and make your dating experience more fun!
            </p>
          </div>

          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 bg-gray-200 text-gray-700 py-3 rounded-xl font-semibold hover:bg-gray-300 transition"
            >
              Cancel
            </button>
            <button
              onClick={onAddTokens}
              className="flex-1 bg-gradient-to-r from-green-500 to-emerald-500 text-white py-3 rounded-xl font-bold hover:from-green-600 hover:to-emerald-600 transition shadow-lg flex items-center justify-center gap-2"
            >
              <Coins className="w-5 h-5" />
              Add Tokens
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---------------------------
   Enhanced Create Surprise Question Modal
   --------------------------- */

function CreateSurpriseQuestionModal({
  onSubmit,
  onClose,
  tokenBalance,
}: {
  onSubmit: (question: string) => void;
  onClose: () => void;
  tokenBalance: number;
}) {
  const [question, setQuestion] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!question.trim()) {
      alert("Please enter a question!");
      return;
    }
    setIsSubmitting(true);
    try {
      await onSubmit(question.trim());
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full mx-4 overflow-hidden animate-scale-in">
        <div className="bg-gradient-to-r from-purple-500 to-pink-500 p-6 text-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-4xl">🎁</span>
              <h2 className="text-2xl font-bold">Create Surprise Question</h2>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center hover:bg-white/30 transition"
            >
              ✕
            </button>
          </div>
          <p className="text-white/90 text-sm mt-2">
            Ask your match a fun question! They'll have to answer before continuing.
          </p>
          
          {/* Token Balance Display */}
          <div className="mt-3 bg-white/20 rounded-lg px-3 py-2 flex items-center justify-between">
            <span className="text-sm font-medium">Your Balance:</span>
            <div className="flex items-center gap-1 font-bold">
              <Coins className="w-4 h-4" />
              <span>{tokenBalance} tokens</span>
            </div>
          </div>
        </div>

        <div className="p-6">
          <div className="mb-6">
            <label htmlFor="surprise-question" className="block text-sm font-semibold text-gray-700 mb-2">
              Your Question: <span className="text-red-500">*</span>
            </label>
            <textarea
              id="surprise-question"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="E.g., What's your most embarrassing moment?"
              className="w-full h-32 px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-200 resize-none"
              disabled={isSubmitting}
              maxLength={300}
            />
            <p className="text-xs text-gray-500 mt-1">
              {question.length}/300 characters
            </p>
          </div>

          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-6 flex items-start gap-2">
            <Coins className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-amber-800">
              Sending this question will cost <span className="font-bold">1 token</span>
            </p>
          </div>

          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 bg-gray-200 text-gray-700 py-3 rounded-xl font-semibold hover:bg-gray-300 transition"
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={!question.trim() || isSubmitting}
              className="flex-1 bg-gradient-to-r from-purple-500 to-pink-500 text-white py-3 rounded-xl font-bold hover:from-purple-600 hover:to-pink-600 disabled:from-gray-300 disabled:to-gray-400 disabled:cursor-not-allowed transition shadow-lg"
            >
              {isSubmitting ? "Sending..." : "Send 🎁"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---------------------------
   Icebreaker Question Card
   --------------------------- */

function IcebreakerCard({ question }: { question: string }) {
  return (
    <div className="max-w-3xl mx-auto mb-6">
      <div className="bg-gradient-to-r from-pink-500 to-purple-500 rounded-2xl shadow-lg p-6 text-white">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div className="flex-1">
            <h3 className="font-bold text-lg mb-2">Icebreaker Question 🎉</h3>
            <p className="text-white/95 text-base leading-relaxed">{question}</p>
            <p className="text-white/70 text-sm mt-3 italic">
              Answer this question to start your conversation!
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---------------------------
   ChatPage
   --------------------------- */

export default function ChatPage() {
  const params = useParams();
  const router = useRouter();
  const matchId = (params?.id as string) || "";

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [surpriseQuestions, setSurpriseQuestions] = useState<SurpriseQuestion[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [user, setUser] = useState<any>(null);
  const [revealStatus, setRevealStatus] = useState<RevealStatus | null>(null);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [partnerProfile, setPartnerProfile] = useState<Profile | null>(null);
  const [datingCategory, setDatingCategory] = useState<string | null>(null);
  const [userGender, setUserGender] = useState<string | null>(null);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [icebreakerQuestion, setIcebreakerQuestion] = useState<IcebreakerQuestion | null>(null);
  const [showCreateSQModal, setShowCreateSQModal] = useState(false);
  const [showAnswerModal, setShowAnswerModal] = useState<SurpriseQuestion | null>(null);

  const [showTokenPurchaseModal, setShowTokenPurchaseModal] = useState(false);

  // Token System States - NOW USING REAL DATABASE
  const [tokenBalance, setTokenBalance] = useState(0);
  const [loadingTokens, setLoadingTokens] = useState(true);
  const [showTokenConfirmation, setShowTokenConfirmation] = useState(false);
  const [showInsufficientTokens, setShowInsufficientTokens] = useState(false);
  const [pendingQuestion, setPendingQuestion] = useState<string | null>(null);

  const [isSending, setIsSending] = useState(false);
  const [isNearBottom, setIsNearBottom] = useState(true);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const scrollableRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const pendingMapRef = useRef<Record<string, boolean>>({});

  const scrollToBottom = (smooth = true) => {
    try {
      messagesEndRef.current?.scrollIntoView({ behavior: smooth ? "smooth" : "auto" });
    } catch {}
  };

  const checkIfNearBottom = () => {
    const el = scrollableRef.current;
    if (!el) {
      setIsNearBottom(true);
      return;
    }
    const threshold = 150;
    const pos = el.scrollHeight - (el.scrollTop + el.clientHeight);
    setIsNearBottom(pos < threshold);
  };

  // Check for unanswered surprise questions
  const unansweredQuestion = surpriseQuestions.find(
    (sq) => sq.receiver_id === user?.id && sq.is_revealed && !sq.answer
  );

  const isChatLocked = !!unansweredQuestion;

  useEffect(() => {
    if (unansweredQuestion) {
      setShowAnswerModal(unansweredQuestion);
    }
  }, [unansweredQuestion]);

  /* ---------------------------
     Initial load
     --------------------------- */

  useEffect(() => {
    async function init() {
      try {
        setLoading(true);

        const { data: auth } = await supabase.auth.getUser();
        setUser(auth?.user ?? null);

        // Fetch token balance from database
        if (auth?.user?.id) {
          await loadTokenBalance(auth.user.id);
        }

        // Fetch messages
        try {
          const msgs = await getChatMessages(matchId);
          const sorted = (msgs || []).slice().sort((a: any, b: any) => {
            const ta = new Date(a.created_at || 0).getTime();
            const tb = new Date(b.created_at || 0).getTime();
            return ta - tb;
          });
          setMessages(sorted);
        } catch (err) {
          console.error("Failed to fetch chat messages:", err);
        }

        // Fetch surprise questions
        try {
          const sqs = await getSurpriseQuestions(matchId);
          setSurpriseQuestions(sqs || []);
        } catch (err) {
          console.warn("Failed to fetch surprise questions:", err);
        }

        // Fetch icebreaker question
        try {
          const question = await getMatchIcebreakerQuestion(matchId);
          setIcebreakerQuestion(question);
        } catch (err) {
          console.warn("Failed to fetch icebreaker question:", err);
        }

        // Fetch reveal status
        try {
          const rs: any = await getRevealStatus(matchId);
          setRevealStatus(rs || null);
        } catch (err) {
          console.warn("getRevealStatus failed:", err);
        }

        // Fetch match + partner info with ALL fields
        try {
          const { data: matchData, error: matchErr } = await supabase
            .from("dating_matches")
            .select("dating_category, user1_id, user2_id")
            .eq("id", matchId)
            .single();

          if (!matchErr && matchData) {
            setDatingCategory(matchData.dating_category);

            const otherId = matchData.user1_id === auth?.user?.id ? matchData.user2_id : matchData.user1_id;

            // Fetch current user's gender
            if (auth?.user?.id) {
              const { data: userProfile } = await supabase
                .from("profiles")
                .select("gender")
                .eq("id", auth.user.id)
                .single();
              if (userProfile) setUserGender(userProfile.gender);
            }

            if (otherId) {
              // Fetch COMPLETE partner profile with all fields
              const { data: partner, error: partnerErr } = await supabase
                .from("profiles")
                .select(
                  "id, full_name, gender, year, branch, height, profile_photo, dating_description, interests, age, location, hometown, work, education, exercise, drinking, smoking, kids, religion, gallery_photos"
                )
                .eq("id", otherId)
                .single();

              if (!partnerErr && partner) {
                setPartnerProfile(partner);
              } else {
                console.warn("Error fetching partner profile:", partnerErr);
              }
            }
          } else if (matchErr) {
            console.warn("Error reading match record:", matchErr);
          }
        } catch (err) {
          console.warn("Error fetching match data:", err);
        }
      } catch (err) {
        console.error("Init error:", err);
      } finally {
        setLoading(false);
        setTimeout(() => scrollToBottom(false), 200);
      }
    }

    if (matchId) init();
  }, [matchId]);

  /* ---------------------------
     Load and subscribe to token balance
     --------------------------- */

  async function loadTokenBalance(userId: string) {
    try {
      setLoadingTokens(true);
      
      let { data, error } = await supabase
        .from("user_tokens")
        .select("balance")
        .eq("user_id", userId)
        .maybeSingle();

      if (error && error.code !== "PGRST116") {
        console.error("Error loading token balance:", error);
        return;
      }

      // Create token record if it doesn't exist
      if (!data) {
        const { data: newData, error: insertError } = await supabase
          .from("user_tokens")
          .insert({ user_id: userId, balance: 0 })
          .select("balance")
          .single();

        if (insertError) {
          console.error("Error creating token balance:", insertError);
          return;
        }
        data = newData;
      }

      setTokenBalance(data?.balance || 0);
    } catch (err) {
      console.error("loadTokenBalance error:", err);
    } finally {
      setLoadingTokens(false);
    }
  }

  useEffect(() => {
    if (!user?.id) return;

    // Subscribe to real-time token balance updates
    const tokenChannel = supabase
      .channel(`user-tokens-${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "user_tokens",
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          if (payload.new && typeof payload.new === 'object' && 'balance' in payload.new) {
            setTokenBalance(payload.new.balance as number);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(tokenChannel);
    };
  }, [user?.id]);

  /* ---------------------------
     Realtime subscriptions
     --------------------------- */

  useEffect(() => {
    if (!matchId) return;

    const msgChannel = supabase
      .channel("dating_chat_" + matchId)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "dating_chats",
          filter: `match_id=eq.${matchId}`,
        },
        (payload) => {
          const newMsg = payload.new as unknown as ChatMessage;
          if (!newMsg || !newMsg.id || !newMsg.sender_id) return;

          setMessages((prev) => {
            if (prev.some((m) => m.id === newMsg.id)) return prev;

            const tempIndex = prev.findIndex(
              (m) =>
                m.id.startsWith("temp-") &&
                m.sender_id === newMsg.sender_id &&
                m.message.trim() === newMsg.message.trim()
            );

            if (tempIndex !== -1) {
              const copy = prev.slice();
              copy.splice(tempIndex, 1, newMsg);
              return copy;
            }

            return [...prev, newMsg];
          });

          if (isNearBottom) setTimeout(() => scrollToBottom(true), 80);
        }
      )
      .subscribe();

    const revealChannel = supabase
      .channel("dating_reveals_" + matchId)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "dating_reveals",
          filter: `match_id=eq.${matchId}`,
        },
        (payload) => {
          setRevealStatus(payload.new as RevealStatus);
        }
      )
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "dating_reveals",
          filter: `match_id=eq.${matchId}`,
        },
        (payload) => {
          setRevealStatus(payload.new as RevealStatus);
        }
      )
      .subscribe();

    const sqChannel = supabase
      .channel("surprise_questions_" + matchId)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "surprise_questions",
          filter: `match_id=eq.${matchId}`,
        },
        (payload) => {
          const newSQ = payload.new as SurpriseQuestion;
          setSurpriseQuestions((prev) => {
            if (prev.some((sq) => sq.id === newSQ.id)) return prev;
            return [...prev, newSQ];
          });
          if (isNearBottom) setTimeout(() => scrollToBottom(true), 80);
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "surprise_questions",
          filter: `match_id=eq.${matchId}`,
        },
        (payload) => {
          const updated = payload.new as SurpriseQuestion;
          setSurpriseQuestions((prev) =>
            prev.map((sq) => (sq.id === updated.id ? updated : sq))
          );
        }
      )
      .subscribe();

    return () => {
      try {
        supabase.removeChannel(msgChannel);
        supabase.removeChannel(revealChannel);
        supabase.removeChannel(sqChannel);
      } catch (err) {
        console.warn("Error removing supabase channels:", err);
      }
    };
  }, [matchId, isNearBottom]);

  /* ---------------------------
     Send message
     --------------------------- */

  async function handleSendMessage() {
    try {
      if (!newMessage.trim() || !user || isChatLocked) return;
      setIsSending(true);

      const optimistic: ChatMessage = {
        id: tempId(),
        match_id: matchId,
        sender_id: user.id,
        message: newMessage.trim(),
        created_at: new Date().toISOString(),
      };

      pendingMapRef.current[optimistic.id] = true;

      setMessages((prev) => [...prev, optimistic]);
      setNewMessage("");
      setTimeout(() => inputRef.current?.focus(), 20);

      try {
        const res: any = await sendChatMessage(matchId, user.id, optimistic.message);
        if (res && res.id) {
          setMessages((prev) => {
            const idx = prev.findIndex((m) => m.id === optimistic.id);
            if (idx !== -1) {
              const copy = prev.slice();
              copy.splice(idx, 1, res);
              return copy;
            }
            if (prev.some((m) => m.id === res.id)) return prev;
            return [...prev, res];
          });
        }
      } catch (err) {
        console.error("sendChatMessage failed:", err);
        setMessages((prev) => prev.filter((m) => m.id !== optimistic.id));
        alert("Failed to send message. Check connection and try again.");
      } finally {
        delete pendingMapRef.current[optimistic.id];
        setIsSending(false);
      }
    } catch (err) {
      setIsSending(false);
      console.error("Unexpected send error:", err);
      alert("Something went wrong sending the message.");
    }
  }

  /* ---------------------------
     Surprise Question Handlers (with Token System)
     --------------------------- */

  async function handleCreateSurpriseQuestion(question: string) {
    // Check token balance first
    if (tokenBalance < 1) {
      setShowInsufficientTokens(true);
      return;
    }
    
    // Store question and show confirmation modal
    setPendingQuestion(question);
    setShowTokenConfirmation(true);
  }

 async function handleConfirmTokenUsage() {
  if (!pendingQuestion || !user) return;

  try {
    // First deduct token from database
    const { data: currentBalance, error: fetchError } = await supabase
      .from("user_tokens")
      .select("balance")
      .eq("user_id", user.id)
      .single();

    if (fetchError) {
      throw new Error("Failed to fetch token balance");
    }

    if (!currentBalance || currentBalance.balance < 1) {
      setShowTokenConfirmation(false);
      setShowInsufficientTokens(true);
      return;
    }

    // Deduct token in database
    const { error: updateError } = await supabase
      .from("user_tokens")
      .update({ 
        balance: currentBalance.balance - 1,
        updated_at: new Date().toISOString()
      })
      .eq("user_id", user.id);

    if (updateError) {
      throw new Error("Failed to deduct token");
    }

    // Update local state
    setTokenBalance(currentBalance.balance - 1);
    
    // Get receiver ID from match
    const { data: match } = await supabase
      .from("dating_matches")
      .select("user1_id, user2_id")
      .eq("id", matchId)
      .single();

    if (!match) {
      throw new Error("Match not found");
    }

    const receiverId = match.user1_id === user.id ? match.user2_id : match.user1_id;
    
    // Create surprise question
    await createSurpriseQuestion(matchId, user.id, receiverId, pendingQuestion);
    
    // Create transaction record for tracking
    await supabase.from("token_transactions").insert({
      user_id: user.id,
      amount: -1,
      type: "spend",
      status: "completed",
      description: "Surprise question sent",
    });
    
    // Show success message
    alert("🎁 Surprise question sent successfully! 1 token deducted.");
    
    // Reset states
    setShowTokenConfirmation(false);
    setPendingQuestion(null);
    setShowCreateSQModal(false);
  } catch (err) {
    console.error("Failed to send surprise question:", err);
    alert(`Failed to send surprise question: ${err instanceof Error ? err.message : "Unknown error"}`);
    // Reload balance to ensure it's correct
    if (user?.id) {
      await loadTokenBalance(user.id);
    }
  }
}


  function handleCancelTokenUsage() {
    setShowTokenConfirmation(false);
    setPendingQuestion(null);
  }

function handleAddTokens() {
  setShowInsufficientTokens(false);
  setShowTokenPurchaseModal(true);
}

  async function handleRevealQuestion(sq: SurpriseQuestion) {
    try {
      await revealSurpriseQuestion(sq.id);
    } catch (err) {
      console.error("Failed to reveal question:", err);
      alert("Failed to reveal question. Try again.");
    }
  }

  async function handleAnswerQuestion(answer: string) {
    try {
      if (!showAnswerModal) return;
      await answerSurpriseQuestion(showAnswerModal.id, answer);
      setShowAnswerModal(null);
    } catch (err) {
      console.error("Failed to answer question:", err);
      alert("Failed to submit answer. Try again.");
    }
  }


  /* ---------------------------
     Reveal identity
     --------------------------- */

  async function handleReveal() {
    try {
      if (!user) {
        alert("Please log in to reveal identity.");
        return;
      }

      const { data: match, error: matchErr } = await supabase
        .from("dating_matches")
        .select("user1_id, user2_id")
        .eq("id", matchId)
        .single();

      if (matchErr || !match) {
        console.error("Match fetch error:", matchErr);
        alert("Could not load match details.");
        return;
      }

      const { data: existing } = await supabase
        .from("dating_reveals")
        .select("*")
        .eq("match_id", matchId)
        .maybeSingle();

      if (!existing) {
        const { error: insertErr } = await supabase.from("dating_reveals").insert([{ match_id: matchId }]);
        if (insertErr) {
          console.error("Create reveal row error:", insertErr);
          alert("Could not initialize reveal. Try again.");
          return;
        }
      }

      const fieldToUpdate = user.id === match.user1_id ? "user1_reveal" : "user2_reveal";

      const { data: result, error: updateErr } = await supabase
        .from("dating_reveals")
        .update({ [fieldToUpdate]: true })
        .eq("match_id", matchId)
        .select("user1_reveal, user2_reveal")
        .single();

      if (updateErr) {
        console.error("Reveal update error:", updateErr);
        alert("Failed to reveal identity. Try again.");
        return;
      }

      // Update local state immediately so the first user sees the change
      setRevealStatus(result);

      if (result?.user1_reveal && result?.user2_reveal) {
        // Both revealed - fetch partner's profile only
        const partnerId = match.user1_id === user.id ? match.user2_id : match.user1_id;
        
        const { data: partnerData, error: profileErr } = await supabase
          .from("profiles")
          .select(
            "id, full_name, profile_photo, dating_description, interests, year, height, looking_for, gender, branch, age, location, hometown, work, education, exercise, drinking, smoking, kids, religion, gallery_photos"
          )
          .eq("id", partnerId)
          .single();

        if (profileErr) {
          console.error("Profiles fetch error:", profileErr);
        } else if (partnerData) {
          setPartnerProfile(partnerData);
          setProfiles([partnerData]); // Set profiles array for the display logic
        }
        
        // Send system message that both revealed
        await sendChatMessage(matchId, user.id, "🎉 Both users have revealed their identities! You can now see each other's full profiles.");
        
        alert("🎉 Both identities revealed! You can now see each other's full profiles.");
      } else {
        // First person to reveal - send system notification message
        await sendChatMessage(matchId, user.id, "💫 I clicked reveal identity! Click yours too to see each other's profiles.");
        
        alert("✅ Reveal request sent! Waiting for your match to reveal their identity...");
      }
    } catch (err) {
      console.error("Unexpected reveal error:", err);
      alert("Something went wrong. Try again.");
    }
  }
  /* ---------------------------
     Delete chat
     --------------------------- */

  async function handleDeleteChat() {
    if (!confirm("Are you sure you want to delete this chat?")) return;
    try {
      await deleteMatch(matchId);
      router.push(`/dating?deletedId=${matchId}`);
    } catch (err) {
      console.error("Delete chat error:", err);
      alert("Failed to delete chat.");
    }
  }

  /* ---------------------------
     Photo & Profile visibility
     --------------------------- */

  const getPhotoVisibility = () => {
    const category = datingCategory?.toLowerCase() || "";
    const bothRevealed = revealStatus?.user1_reveal && revealStatus?.user2_reveal;

    if (category === "casual" || category === "friends") {
      return { showPhoto: true };
    }

    if (category === "serious" || category === "fun" || category === "mystery") {
      return { showPhoto: bothRevealed };
    }

    return { showPhoto: bothRevealed };
  };

  const { showPhoto } = getPhotoVisibility();

  const shouldShowRevealButton = () => {
    const category = datingCategory?.toLowerCase() || "";
    return category !== "casual" && category !== "friends";
  };

  const getProfileLockStatus = () => {
    const category = datingCategory?.toLowerCase() || "";

    if (category === "casual" || category === "friends") {
      return { locked: false };
    }

    if (category === "serious" || category === "fun" || category === "mystery") {
      const bothRevealed = revealStatus?.user1_reveal && revealStatus?.user2_reveal;
      return { locked: !bothRevealed };
    }

    return { locked: true };
  };

  const { locked } = getProfileLockStatus();

  /* ---------------------------
     Render messages with surprise questions
     --------------------------- */

  function renderMessages() {
    // Merge messages and surprise questions chronologically
    const allItems = [
      ...messages.map((m) => ({ type: "message" as const, data: m, timestamp: m.created_at })),
      ...surpriseQuestions.map((sq) => ({ type: "surprise" as const, data: sq, timestamp: sq.created_at })),
    ].sort((a, b) => {
      const timeA = new Date(a.timestamp || 0).getTime();
      const timeB = new Date(b.timestamp || 0).getTime();
      return timeA - timeB;
    });

    const nodes: any[] = [];
    let lastDate: string | null = null;

    // Always show icebreaker question first if it exists
    if (icebreakerQuestion) {
      nodes.push(
        <div key="icebreaker-question" className="mb-6">
          <IcebreakerCard question={icebreakerQuestion.question} />
        </div>
      );
    }

    if (allItems.length === 0) {
      return nodes.length > 0 ? nodes : null;
    }

    for (let i = 0; i < allItems.length; i++) {
      const item = allItems[i];
      const timestamp = item.timestamp;

      const showDateSeparator = !lastDate || !isSameDay(lastDate, timestamp);
      if (showDateSeparator) {
        nodes.push(
          <div key={`d-${timestamp || i}`} className="flex items-center my-4">
            <div className="flex-1 h-px bg-gray-200" />
            <div className="px-3 text-sm text-gray-500">{formatDate(timestamp)}</div>
            <div className="flex-1 h-px bg-gray-200" />
          </div>
        );
        lastDate = timestamp || null;
      }

      if (item.type === "message") {
        const m = item.data as ChatMessage;
        const next = allItems[i + 1];
        const showTail = !next || (next.type === "message" && next.data.sender_id !== m.sender_id);
        const isOwn = m.sender_id === user?.id;

        nodes.push(
          <div key={m.id} className="mb-3">
            <MessageBubble
              msg={m}
              isOwn={isOwn}
              showTail={showTail}
              timestamp={m.created_at}
              prettyTime={m.created_at ? formatTime(m.created_at) : undefined}
              profilePhoto={isOwn ? undefined : showPhoto ? partnerProfile?.profile_photo : undefined}
            />
          </div>
        );
      } else if (item.type === "surprise") {
        const sq = item.data as SurpriseQuestion;
        const isOwn = sq.sender_id === user?.id;

        nodes.push(
          <div key={sq.id} className="mb-3">
            {sq.answer ? (
              <SurpriseQuestionAnswered
                sq={sq}
                isOwn={isOwn}
                profilePhoto={showPhoto ? partnerProfile?.profile_photo : undefined}
              />
            ) : (
              <SurpriseQuestionUnrevealed
                sq={sq}
                isOwn={isOwn}
                onReveal={() => handleRevealQuestion(sq)}
                profilePhoto={showPhoto ? partnerProfile?.profile_photo : undefined}
              />
            )}
          </div>
        );
      }
    }

    return nodes;
  }

  useEffect(() => {
    const el = scrollableRef.current;
    if (!el) return;
    const handler = () => checkIfNearBottom();
    el.addEventListener("scroll", handler);
    return () => el.removeEventListener("scroll", handler);
  }, []);

  useEffect(() => {
    if (isNearBottom) {
      setTimeout(() => scrollToBottom(true), 120);
    }
  }, [messages, surpriseQuestions, isNearBottom]);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-100">
        <p className="text-gray-600">Loading chat...</p>
      </div>
    );
  }

  const hasMessages = messages && messages.length > 0;
  const showIcebreaker = icebreakerQuestion && !hasMessages;

  /* ---------------------------
     Final render
     --------------------------- */

  return (
    <div className="h-screen flex flex-col bg-gradient-to-br from-pink-50 to-purple-100 overflow-hidden">
      {/* Sticky Header Container */}
      <div className="sticky top-0 z-10 flex-shrink-0 bg-white shadow-md">
        {/* Header */}
        <header className="px-4 py-3 bg-white/95 backdrop-blur-sm border-b flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <motion.button
              whileHover={{ scale: 1.05, x: -2 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => router.back()}
              aria-label="Go back"
              className="p-2 rounded-lg hover:bg-gray-100 transition-all"
              title="Back"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <path d="M15 18l-6-6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </motion.button>

            <div className="flex items-center gap-3">
              <Avatar
                src={showPhoto ? partnerProfile?.profile_photo : undefined}
                name={partnerProfile?.full_name || undefined}
                size={10}
              />
              <div>
                <div className="text-sm font-semibold text-gray-800">
                  {locked ? "Mystery Match" : partnerProfile?.full_name || "Mystery Match"}
                </div>
                <div className="text-xs text-gray-500">
                  {datingCategory ? `${datingCategory}` : "mystery chat"} • {revealStatus?.user1_reveal && revealStatus?.user2_reveal ? "Revealed" : "Hidden"}
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Token Balance */}
            <div className="flex items-center gap-2 bg-gradient-to-r from-amber-100 to-yellow-100 px-3 py-1.5 rounded-full border border-amber-300">
              <Coins className="w-4 h-4 text-amber-600" />
              <span className="text-sm font-bold text-amber-800">
                {loadingTokens ? "..." : tokenBalance}
              </span>
            </div>

            {/* Surprise Question Button */}
            <button
              onClick={() => setShowCreateSQModal(true)}
              disabled={isChatLocked || loadingTokens}
              className="px-3 py-1 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg font-medium text-sm hover:from-purple-600 hover:to-pink-600 disabled:from-gray-300 disabled:to-gray-400 disabled:cursor-not-allowed flex items-center gap-1 shadow-md"
              title={isChatLocked ? "Answer the pending question first" : "Send a surprise question (1 token)"}
            >
              <span>🎁</span>
              Surprise Q
            </button>

            {/* View Profile Button */}
            <button
              onClick={() => {
                if (!locked) setShowProfileModal(true);
              }}
              disabled={locked}
              title={locked ? "Profile locked - reveal identities to unlock" : "View your match's profile"}
              className={`px-3 py-1 rounded-lg font-medium text-sm ${
                locked ? "bg-gray-200 text-gray-500 cursor-not-allowed" : "bg-pink-500 text-white hover:bg-pink-600"
              }`}
            >
              {locked ? "View Profile (Locked)" : "View Profile"}
            </button>

            {/* Reveal Button */}
            {shouldShowRevealButton() && (
              <button onClick={handleReveal} className="px-3 py-1 rounded-lg bg-red-500 text-white text-sm hover:bg-red-600">
                Reveal Identity
              </button>
            )}

            {/* Delete Button */}
            <button onClick={handleDeleteChat} className="px-3 py-1 rounded-lg bg-gray-100 text-gray-700 text-sm hover:bg-gray-200">
              Delete
            </button>
          </div>
        </header>

        {/* Lock Banner */}
        {isChatLocked && (
          <div className="px-4 py-3 bg-yellow-100 border-b border-yellow-200 text-yellow-900 text-sm text-center font-semibold">
            ⚠️ Chat locked - Answer the surprise question to continue
          </div>
        )}

        {/* Reveal banner */}
        {shouldShowRevealButton() && revealStatus && (
          <div className="px-4 py-2 bg-yellow-100 text-yellow-900 text-sm text-center">
            {revealStatus.user1_reveal && revealStatus.user2_reveal ? "Both identities revealed!" : "Waiting for both users to reveal..."}
          </div>
        )}

        {/* Profiles when fully revealed */}
        {profiles.length > 0 && (
          <div className="bg-white shadow p-4 flex gap-6 justify-center overflow-x-auto border-b">
            {profiles.map((p) => (
              <div key={p.id} className="text-center">
                <img src={p.profile_photo || "/images/avatar-placeholder.png"} alt={p.full_name || "Profile"} className="w-20 h-20 rounded-full object-cover mx-auto mb-2" />
                <p className="font-semibold">{p.full_name}</p>
                <p className="text-sm text-gray-600">{p.year} • {p.height}</p>
                <p className="text-sm italic text-gray-500 max-w-xs mt-1">{p.dating_description}</p>
                <p className="text-xs mt-1 text-gray-700">Interests: {(p.interests || []).join(", ") || "None"}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Messages - Flex-1 with overflow */}
      <main ref={scrollableRef} className="flex-1 overflow-y-auto overflow-x-hidden p-6 space-y-3" onScroll={() => checkIfNearBottom()} aria-live="polite">
        <div className="max-w-3xl mx-auto">
          {/* Show icebreaker question at the top if no messages yet */}
          {showIcebreaker && <IcebreakerCard question={icebreakerQuestion.question} />}
          
          {/* Show messages or empty state */}
          {hasMessages || surpriseQuestions.length > 0 ? (
            renderMessages()
          ) : !showIcebreaker ? (
            <div className="text-center text-gray-500 mt-6">No messages yet — say hi 👋</div>
          ) : null}
        </div>
        <div ref={messagesEndRef} />
      </main>

      {/* Fixed Input Footer */}
      <footer className="flex-shrink-0 bg-white border-t p-4">
        <div className="max-w-3xl mx-auto flex items-center gap-3">
          <div className="flex-1">
            <label htmlFor="chat-input" className="sr-only">Type your message</label>
            <input
              id="chat-input"
              ref={inputRef}
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSendMessage(); } }}
              placeholder={isChatLocked ? "Answer the surprise question first..." : "Type your message..."}
              disabled={isChatLocked}
              className="w-full border rounded-full px-4 py-3 focus:outline-none focus:ring-2 focus:ring-pink-200 disabled:bg-gray-100 disabled:cursor-not-allowed"
            />
          </div>

          <button
            onClick={handleSendMessage}
            disabled={!newMessage.trim() || isSending || isChatLocked}
            className={`px-4 py-2 rounded-full text-white font-medium ${!newMessage.trim() || isSending || isChatLocked ? "bg-gray-300" : "bg-pink-500 hover:bg-pink-600"}`}
          >
            {isSending ? "Sending..." : "Send"}
          </button>
        </div>
      </footer>

      {/* ENHANCED PROFILE MODAL with all fields */}
      {showProfileModal && partnerProfile && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            {/* Header with Cover Photo Effect */}
            <div className="relative h-32 bg-gradient-to-r from-pink-400 to-purple-500 rounded-t-3xl">
              <button
                onClick={() => setShowProfileModal(false)}
                className="absolute top-4 right-4 w-8 h-8 bg-white rounded-full flex items-center justify-center hover:bg-gray-100 transition"
              >
                ✕
              </button>
            </div>

            {/* Profile Photo */}
            <div className="relative -mt-16 mb-4 flex justify-center">
              <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-white shadow-xl bg-gray-200">
                {locked ? (
                  <div className="w-full h-full flex items-center justify-center text-gray-500 text-4xl">
                    🔒
                  </div>
                ) : (
                  <img
                    src={partnerProfile.profile_photo || "/images/avatar-placeholder.png"}
                    alt="Profile"
                    className="w-full h-full object-cover"
                  />
                )}
              </div>
            </div>

            <div className="px-6 pb-6">
              {/* Name & Basic Info */}
              <div className="text-center mb-6">
                <h2 className="text-3xl font-bold text-gray-800 mb-2">
                  {locked ? "🔒 Profile Locked" : partnerProfile.full_name}
                </h2>
                {!locked && (
                  <div className="flex items-center justify-center gap-2 text-gray-600">
                    {partnerProfile.age && <span>{partnerProfile.age} years old</span>}
                    {partnerProfile.gender && <span>• {partnerProfile.gender}</span>}
                  </div>
                )}
              </div>

              {/* Dating Bio */}
              {partnerProfile.dating_description && (
                <div className="bg-pink-50 rounded-2xl p-4 mb-6">
                  <div className="flex items-start gap-2">
                    <Heart className="w-5 h-5 text-pink-500 flex-shrink-0 mt-0.5" />
                    <p className="text-gray-700 italic leading-relaxed">
                      "{partnerProfile.dating_description}"
                    </p>
                  </div>
                </div>
              )}

              {/* Gallery Photos */}
              {!locked && partnerProfile.gallery_photos && partnerProfile.gallery_photos.filter((p: string) => p).length > 0 && (
                <div className="mb-6">
                  <h3 className="text-lg font-semibold text-gray-800 mb-3 flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-pink-500" />
                    Photos
                  </h3>
                  <div className="grid grid-cols-4 gap-2">
                    {partnerProfile.gallery_photos.filter((p: string) => p).map((photo: string, idx: number) => (
                      <img
                        key={idx}
                        src={photo}
                        alt={`Gallery ${idx + 1}`}
                        className="w-full h-20 object-cover rounded-lg"
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Info Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                {/* Education */}
                {(partnerProfile.branch || partnerProfile.year) && (
                  <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-xl">
                    <GraduationCap className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-semibold text-gray-700">Education</p>
                      <p className="text-gray-600">
                        {partnerProfile.branch && partnerProfile.branch}
                        {partnerProfile.year && ` • ${partnerProfile.year}`}
                      </p>
                    </div>
                  </div>
                )}

                {/* Work */}
                {partnerProfile.work && (
                  <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-xl">
                    <Briefcase className="w-5 h-5 text-purple-500 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-semibold text-gray-700">Work</p>
                      <p className="text-gray-600">{partnerProfile.work}</p>
                    </div>
                  </div>
                )}

                {/* Location */}
                {partnerProfile.location && (
                  <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-xl">
                    <MapPin className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-semibold text-gray-700">Lives in</p>
                      <p className="text-gray-600">{partnerProfile.location}</p>
                    </div>
                  </div>
                )}

                {/* Hometown */}
                {partnerProfile.hometown && (
                  <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-xl">
                    <MapPin className="w-5 h-5 text-orange-500 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-semibold text-gray-700">From</p>
                      <p className="text-gray-600">{partnerProfile.hometown}</p>
                    </div>
                  </div>
                )}

                {/* Height */}
                {partnerProfile.height && (
                  <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-xl">
                    <Ruler className="w-5 h-5 text-indigo-500 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-semibold text-gray-700">Height</p>
                      <p className="text-gray-600">{partnerProfile.height}</p>
                    </div>
                  </div>
                )}

                {/* Religion */}
                {partnerProfile.religion && (
                  <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-xl">
                    <BookOpen className="w-5 h-5 text-yellow-500 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-semibold text-gray-700">Religion</p>
                      <p className="text-gray-600">{partnerProfile.religion}</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Lifestyle Section */}
              {(partnerProfile.exercise || partnerProfile.drinking || partnerProfile.smoking || partnerProfile.kids) && (
                <div className="mb-6">
                  <h3 className="text-lg font-semibold text-gray-800 mb-3">Lifestyle</h3>
                  <div className="grid grid-cols-2 gap-3">
                    {partnerProfile.exercise && (
                      <div className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg">
                        <span className="text-2xl">🏃</span>
                        <div>
                          <p className="text-xs text-gray-500">Exercise</p>
                          <p className="text-sm font-medium text-gray-700">{partnerProfile.exercise}</p>
                        </div>
                      </div>
                    )}
                    {partnerProfile.drinking && (
                      <div className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg">
                        <Wine className="w-5 h-5 text-red-500" />
                        <div>
                          <p className="text-xs text-gray-500">Drinking</p>
                          <p className="text-sm font-medium text-gray-700">{partnerProfile.drinking}</p>
                        </div>
                      </div>
                    )}
                    {partnerProfile.smoking && (
                      <div className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg">
                        <Cigarette className="w-5 h-5 text-gray-500" />
                        <div>
                          <p className="text-xs text-gray-500">Smoking</p>
                          <p className="text-sm font-medium text-gray-700">{partnerProfile.smoking}</p>
                        </div>
                      </div>
                    )}
                    {partnerProfile.kids && (
                      <div className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg">
                        <Baby className="w-5 h-5 text-pink-500" />
                        <div>
                          <p className="text-xs text-gray-500">Kids</p>
                          <p className="text-sm font-medium text-gray-700">{partnerProfile.kids}</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Interests */}
              {partnerProfile.interests && partnerProfile.interests.length > 0 && (
                <div className="mb-6">
                  <h3 className="text-lg font-semibold text-gray-800 mb-3 flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-pink-500" />
                    Interests
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {partnerProfile.interests.map((interest: string) => (
                      <span
                        key={interest}
                        className="px-4 py-2 bg-gradient-to-r from-pink-100 to-purple-100 text-pink-700 rounded-full text-sm font-medium"
                      >
                        {interest}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Close Button */}
              <button
                onClick={() => setShowProfileModal(false)}
                className="w-full py-3 bg-gradient-to-r from-pink-500 to-purple-500 text-white rounded-xl hover:from-pink-600 hover:to-purple-600 transition font-semibold"
              >
                Close Profile
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create Surprise Question Modal */}
      {showCreateSQModal && (
        <CreateSurpriseQuestionModal
          onSubmit={handleCreateSurpriseQuestion}
          onClose={() => setShowCreateSQModal(false)}
          tokenBalance={tokenBalance}
        />
      )}

      {/* Answer Surprise Question Modal */}
      {showAnswerModal && (
        <SurpriseQuestionModal
          sq={showAnswerModal}
          onAnswer={handleAnswerQuestion}
        />
      )}

      {/* Token Confirmation Modal */}
      {showTokenConfirmation && (
        <TokenConfirmationModal
          onConfirm={handleConfirmTokenUsage}
          onCancel={handleCancelTokenUsage}
        />
      )}

      {/* Insufficient Tokens Modal */}
      {showInsufficientTokens && (
        <InsufficientTokensModal
          onClose={() => setShowInsufficientTokens(false)}
          onAddTokens={handleAddTokens}
        />
      )}

{showTokenPurchaseModal && user && (
  <TokenPurchaseModal
    userId={user.id}
    onClose={() => setShowTokenPurchaseModal(false)}
  />
)}

      <style jsx>{`
        @keyframes scale-in {
          from {
            opacity: 0;
            transform: scale(0.9);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }
        .animate-scale-in {
          animation: scale-in 0.2s ease-out;
        }
      `}</style>
    </div>
  );
}