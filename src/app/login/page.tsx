"use client";
import { useState } from "react";
import { motion } from "framer-motion";
import { Mail, Lock, LogIn, ArrowLeft } from "lucide-react";
import { supabase } from "@/utils/supabaseClient";
import { useRouter } from "next/navigation";
import toast, { Toaster } from "react-hot-toast";

export default function Login() {
  const router = useRouter();
  const [identifier, setIdentifier] = useState(""); // email or enrollment
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    try {
      let loginEmail = identifier.trim();

      // If identifier is not an email → treat as enrollment number
      if (!loginEmail.includes("@")) {
        const { data: profile, error: profileError } = await supabase
          .from("profiles")
          .select("college_email")
          .eq("enrollment_number", loginEmail)
          .maybeSingle();

        if (profileError || !profile) {
          toast.error("No account found with this enrollment number");
          setLoading(false);
          return;
        }

        loginEmail = profile.college_email; // ✅ replace with actual email
      }

      // Authenticate with Supabase Auth
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email: loginEmail,
        password,
      });

      if (signInError || !data?.user) {
        toast.error("Invalid login credentials");
        setLoading(false);
        return;
      }

      toast.success("Login successful!");
      router.push("/dashboard"); // redirect after success
    } catch (err: any) {
      console.error("Login error:", err);
      toast.error("Unexpected error. Please try again");
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950 text-white p-4">
      <Toaster position="top-right" />

      {/* Animated Background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <motion.div
          animate={{
            scale: [1, 1.2, 1],
            rotate: [0, 90, 0],
            opacity: [0.03, 0.06, 0.03],
          }}
          transition={{ duration: 20, repeat: Infinity }}
          className="absolute -top-1/2 -left-1/2 w-full h-full bg-gradient-to-br from-purple-500/10 to-transparent rounded-full blur-3xl"
        />
        <motion.div
          animate={{
            scale: [1.2, 1, 1.2],
            rotate: [90, 0, 90],
            opacity: [0.03, 0.06, 0.03],
          }}
          transition={{ duration: 25, repeat: Infinity }}
          className="absolute -bottom-1/2 -right-1/2 w-full h-full bg-gradient-to-tl from-cyan-500/10 to-transparent rounded-full blur-3xl"
        />
      </div>

      {/* Back Button */}
      <motion.button
        whileHover={{ scale: 1.05, x: -5 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => router.push("/")}
        className="fixed top-6 left-6 flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl backdrop-blur-xl transition-all z-10"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Back</span>
      </motion.button>

      {/* Login Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative z-10 w-full max-w-md"
      >
        <div className="relative bg-black/40 backdrop-blur-xl rounded-3xl border border-white/10 overflow-hidden p-8 shadow-2xl">
          {/* Header */}
          <div className="text-center mb-8">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: "spring" }}
              className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-purple-500 to-cyan-500 rounded-2xl flex items-center justify-center"
            >
              <LogIn className="w-8 h-8 text-white" />
            </motion.div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-white via-purple-200 to-cyan-200 bg-clip-text text-transparent mb-2">
              Welcome Back
            </h1>
            <p className="text-white/60">Login to your account</p>
          </div>

          {/* Form */}
          <form className="space-y-4" onSubmit={handleLogin}>
            <div className="space-y-2">
              <label className="text-sm text-white/80 font-medium">Email or Enrollment Number</label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40" />
                <input
                  type="text"
                  placeholder="Enter your email or enrollment number"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl pl-12 pr-4 py-3 text-white placeholder-white/40 focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm text-white/80 font-medium">Password</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40" />
                <input
                  type="password"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl pl-12 pr-4 py-3 text-white placeholder-white/40 focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                  required
                />
              </div>
            </div>

            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              type="submit"
              disabled={loading}
              className="w-full mt-6 bg-gradient-to-r from-purple-500 to-cyan-500 rounded-xl py-3 font-semibold hover:shadow-lg hover:shadow-purple-500/50 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                    className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full"
                  />
                  Logging in...
                </span>
              ) : (
                "Login"
              )}
            </motion.button>
          </form>

          {/* Divider */}
          <div className="flex items-center gap-4 my-6">
            <div className="flex-1 h-px bg-white/10" />
            <span className="text-sm text-white/40">or</span>
            <div className="flex-1 h-px bg-white/10" />
          </div>

          {/* Sign up link */}
          <p className="text-center text-white/60">
            Don't have an account?{" "}
            <a
              href="/signup"
              className="text-transparent bg-gradient-to-r from-purple-400 to-cyan-400 bg-clip-text font-semibold hover:from-purple-300 hover:to-cyan-300 transition-all"
            >
              Sign up
            </a>
          </p>
        </div>
      </motion.div>
    </div>
  );
}
