"use client";
import { useState } from "react";
import { LazyMotion, domAnimation, m } from "framer-motion";
import { Mail, Lock, LogIn, ArrowLeft } from "lucide-react";
import { supabase } from "@/utils/supabaseClient";
import { useRouter } from "next/navigation";
import toast, { Toaster } from "react-hot-toast";
import { useIsMobile } from "@/hooks/useIsMobile";
import HappyButton from "@/components/ui/HappyButton";

export default function Login() {
  const router = useRouter();
  const isMobile = useIsMobile();
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

        {/* Login Card */}
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
                <LogIn className="w-8 h-8 text-white" />
              </m.div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-cyan-600 bg-clip-text text-transparent mb-2">
                Welcome Back
              </h1>
              <p className="text-muted-foreground">Login to your account</p>
            </div>

            {/* Form */}
            <form className="space-y-4" onSubmit={handleLogin}>
              <div className="space-y-2">
                <label className="text-sm text-foreground/80 font-medium">Email or Enrollment Number</label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <input
                    type="text"
                    placeholder="Enter your email or enrollment number"
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
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
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
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
                    Logging in...
                  </span>
                ) : (
                  "Login"
                )}
              </HappyButton>
            </form>

            {/* Divider */}
            <div className="flex items-center gap-4 my-6">
              <div className="flex-1 h-px bg-border" />
              <span className="text-sm text-muted-foreground">or</span>
              <div className="flex-1 h-px bg-border" />
            </div>

            {/* Sign up link */}
            <p className="text-center text-muted-foreground">
              Don't have an account?{" "}
              <a
                href="/signup"
                className="text-transparent bg-gradient-to-r from-purple-500 to-cyan-500 bg-clip-text font-bold hover:opacity-80 transition-all"
              >
                Sign up
              </a>
            </p>
          </div>
        </m.div>
      </div>
    </LazyMotion>
  );
}
