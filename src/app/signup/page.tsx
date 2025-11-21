"use client";
import { useState } from "react";
import { LazyMotion, domAnimation, m } from "framer-motion";
import { User, Mail, Hash, Lock, UserPlus, ArrowLeft, CheckCircle2 } from "lucide-react";
import { supabase } from "@/utils/supabaseClient";
import { useRouter } from "next/navigation";
import toast, { Toaster } from "react-hot-toast";
import { useIsMobile } from "@/hooks/useIsMobile";
import HappyButton from "@/components/ui/HappyButton";

export default function Signup() {
  const router = useRouter();
  const isMobile = useIsMobile();

  const [fullName, setFullName] = useState("");
  const [enrollment, setEnrollment] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    // Validate passwords match
    if (password !== confirmPassword) {
      toast.error("Passwords do not match");
      setLoading(false);
      return;
    }

    // Validate email domain
    if (!email.endsWith("@medicaps.ac.in")) {
      toast.error("Please use your @medicaps.ac.in email");
      setLoading(false);
      return;
    }

    // Validate all fields
    if (!fullName.trim() || !enrollment.trim()) {
      toast.error("Please fill all fields");
      setLoading(false);
      return;
    }

    // Call signup API
    try {
      const response = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          password,
          fullName: fullName.trim(),
          enrollment: enrollment.trim(),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        toast.error(data.error || "Signup failed");
        setLoading(false);
        return;
      }

      toast.success("Account created! Redirecting to login...");
      setTimeout(() => router.push("/login"), 1500);
    } catch (error) {
      console.error("Signup error:", error);
      toast.error("Network error. Please try again.");
      setLoading(false);
    }
  }

  return (
    <LazyMotion features={domAnimation} strict>
      <div className="flex min-h-screen items-center justify-center bg-background text-foreground p-4 transition-colors duration-300">
        <Toaster position="top-right" />

        {/* Animated Background */}
        {!isMobile && (
          <div className="fixed inset-0 overflow-hidden pointer-events-none">
            <m.div
              animate={{
                scale: [1, 1.2, 1],
                rotate: [0, 90, 0],
                opacity: [0.3, 0.5, 0.3],
              }}
              transition={{ duration: 20, repeat: Infinity }}
              className="absolute -top-1/2 -left-1/2 w-full h-full bg-gradient-to-br from-purple-500/10 to-transparent rounded-full blur-3xl"
            />
            <m.div
              animate={{
                scale: [1.2, 1, 1.2],
                rotate: [90, 0, 90],
                opacity: [0.3, 0.5, 0.3],
              }}
              transition={{ duration: 25, repeat: Infinity }}
              className="absolute -bottom-1/2 -right-1/2 w-full h-full bg-gradient-to-tl from-cyan-500/10 to-transparent rounded-full blur-3xl"
            />
          </div>
        )}

        {/* Back Button */}
        <div className="fixed top-6 left-6 z-10">
          <HappyButton
            variant="ghost"
            onClick={() => router.push("/")}
            icon={ArrowLeft}
          >
            Back
          </HappyButton>
        </div>

        {/* Signup Card */}
        <m.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="relative z-10 w-full max-w-md"
        >
          <div className="relative bg-card/80 backdrop-blur-xl rounded-3xl border border-border overflow-hidden p-8 shadow-2xl">
            {/* Header */}
            <div className="text-center mb-8">
              <m.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2, type: "spring" }}
                className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-purple-500 to-cyan-500 rounded-2xl flex items-center justify-center shadow-lg shadow-purple-500/20"
              >
                <UserPlus className="w-8 h-8 text-white" />
              </m.div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-cyan-600 bg-clip-text text-transparent mb-2">
                Create Account
              </h1>
              <p className="text-muted-foreground">Join the campus community</p>
            </div>

            {/* Form */}
            <form className="space-y-4" onSubmit={handleSignup}>
              <div className="space-y-2">
                <label className="text-sm text-foreground/80 font-medium">Full Name</label>
                <div className="relative">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <input
                    type="text"
                    placeholder="Enter your full name"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full bg-background border border-input rounded-xl pl-12 pr-4 py-3 text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all shadow-sm"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm text-foreground/80 font-medium">Enrollment Number</label>
                <div className="relative">
                  <Hash className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <input
                    type="text"
                    placeholder="Enter your enrollment number"
                    value={enrollment}
                    onChange={(e) => setEnrollment(e.target.value)}
                    className="w-full bg-background border border-input rounded-xl pl-12 pr-4 py-3 text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all shadow-sm"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm text-foreground/80 font-medium">College Email</label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <input
                    type="email"
                    placeholder="Enter your college email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-background border border-input rounded-xl pl-12 pr-4 py-3 text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all shadow-sm"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm text-foreground/80 font-medium">Password</label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <input
                    type="password"
                    placeholder="Create a password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-background border border-input rounded-xl pl-12 pr-4 py-3 text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all shadow-sm"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm text-foreground/80 font-medium">Confirm Password</label>
                <div className="relative">
                  <CheckCircle2 className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <input
                    type="password"
                    placeholder="Confirm your password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full bg-background border border-input rounded-xl pl-12 pr-4 py-3 text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all shadow-sm"
                    required
                  />
                </div>
              </div>

              <HappyButton
                type="submit"
                disabled={loading}
                className="w-full mt-6 justify-center"
                variant="periwinkle"
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <m.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                      className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full"
                    />
                    Creating account...
                  </span>
                ) : (
                  "Create Account"
                )}
              </HappyButton>
            </form>

            {/* Divider */}
            <div className="flex items-center gap-4 my-6">
              <div className="flex-1 h-px bg-border" />
              <span className="text-sm text-muted-foreground">or</span>
              <div className="flex-1 h-px bg-border" />
            </div>

            {/* Login link */}
            <p className="text-center text-muted-foreground">
              Already have an account?{" "}
              <a
                href="/login"
                className="text-transparent bg-gradient-to-r from-purple-500 to-cyan-500 bg-clip-text font-bold hover:opacity-80 transition-all"
              >
                Login
              </a>
            </p>
          </div>
        </m.div>
      </div>
    </LazyMotion>
  );
}
