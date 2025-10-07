"use client";
import { useState } from "react";
import { supabase } from "@/utils/supabaseClient";
import { useRouter } from "next/navigation";

export default function Login() {
  const router = useRouter();
  const [identifier, setIdentifier] = useState(""); // email or enrollment
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setMessage("");

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
          setMessage("No account found with this enrollment number ❌");
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
        setMessage("Invalid login credentials ❌");
        return;
      }

      setMessage("Login successful ✅");
      router.push("/dashboard"); // redirect after success
    } catch (err: any) {
      console.error("Login error:", err);
      setMessage("Unexpected error ❌ Please try again");
    }
  }

  return (
    <div className="flex h-screen items-center justify-center bg-gradient-to-r from-blue-500 to-purple-600">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-lg">
        <h1 className="mb-6 text-center text-3xl font-bold text-gray-800">
          Student Login
        </h1>

        <form className="space-y-4" onSubmit={handleLogin}>
          <input
            type="text"
            placeholder="College Email or Enrollment Number"
            value={identifier}
            onChange={(e) => setIdentifier(e.target.value)}
            className="w-full rounded-lg border p-3"
            required
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-lg border p-3"
            required
          />

          <button
            type="submit"
            className="w-full rounded-lg bg-blue-600 py-3 text-white font-semibold hover:bg-blue-700"
          >
            Login
          </button>
        </form>

        {message && (
          <p className="mt-4 text-center text-red-500">{message}</p>
        )}

        <p className="mt-4 text-center text-gray-600">
          Don’t have an account?{" "}
          <a href="/signup" className="text-blue-600 hover:underline">
            Sign up
          </a>
        </p>
      </div>
    </div>
  );
}
