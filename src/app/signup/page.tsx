"use client";
import { useState } from "react";
import { supabase } from "@/utils/supabaseClient";

export default function Signup() {
  const [fullName, setFullName] = useState("");
  const [enrollment, setEnrollment] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState("");

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault();
    setMessage("");

    // 1. Password match check
    if (password !== confirmPassword) {
      setMessage("Passwords do not match ❌");
      return;
    }

    // 2. College email validation
    const selectedUni = localStorage.getItem("selectedUniversity");
    if (selectedUni === "medicaps" && !email.endsWith("@medicaps.ac.in")) {
      setMessage("Please use your Medicaps University email ID (@medicaps.ac.in) ❌");
      return;
    }

    // 3. Enrollment number check
    if (!enrollment.trim()) {
      setMessage("Enrollment number is required ❌");
      return;
    }

    // 4. Sign up in Supabase Auth
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    });

    if (error) {
      setMessage(error.message);
      return;
    }

    // 5. Update profile row created by trigger
    if (data.user) {
      const { error: updateError } = await supabase
        .from("profiles")
        .update({
          full_name: fullName,
          enrollment_number: enrollment,
          college_email: email,
        })
        .eq("id", data.user.id);

      if (updateError) {
        setMessage("Profile update failed ❌ " + updateError.message);
        return;
      }
    }

    setMessage("Signup successful ✅ Please check your email to verify!");
  }

  return (
    <div className="flex h-screen items-center justify-center bg-gradient-to-r from-green-500 to-teal-600">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-lg">
        <h1 className="mb-6 text-center text-3xl font-bold text-gray-800">
          Student Sign Up
        </h1>

        <form className="space-y-4" onSubmit={handleSignup}>
          <input
            type="text"
            placeholder="Full Name"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            className="w-full rounded-lg border p-3"
            required
          />
          <input
            type="text"
            placeholder="Enrollment Number"
            value={enrollment}
            onChange={(e) => setEnrollment(e.target.value)}
            className="w-full rounded-lg border p-3"
            required
          />
          <input
            type="email"
            placeholder="College Email ID"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
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
          <input
            type="password"
            placeholder="Confirm Password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="w-full rounded-lg border p-3"
            required
          />

          <button
            type="submit"
            className="w-full rounded-lg bg-green-600 py-3 text-white font-semibold hover:bg-green-700"
          >
            Create Account
          </button>
        </form>

        {message && (
          <p className="mt-4 text-center text-red-500">{message}</p>
        )}

        <p className="mt-4 text-center text-gray-600">
          Already have an account?{" "}
          <a href="/login" className="text-green-600 hover:underline">
            Login
          </a>
        </p>
      </div>
    </div>
  );
}
