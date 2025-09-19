"use client";
import { useState, useEffect } from "react";
import Link from "next/link";

export default function Home() {
  const [selectedUniversity, setSelectedUniversity] = useState("");

  // Load saved university when page loads
  useEffect(() => {
    const savedUni = localStorage.getItem("selectedUniversity");
    if (savedUni) {
      setSelectedUniversity(savedUni);
    }
  }, []);

  // ✅ Define the function properly
  function handleUniversityChange(value: string) {
    setSelectedUniversity(value);
    localStorage.setItem("selectedUniversity", value);
  }

  return (
    <div className="flex h-screen items-center justify-center bg-gradient-to-r from-blue-500 to-purple-600">
      <div className="text-center space-y-6">
        <h1 className="text-5xl font-bold text-white">Campu5 🎓</h1>

        {!selectedUniversity ? (
          <>
            <p className="text-white mt-4">Select your University</p>
            <select
              className="mt-2 px-4 py-3 rounded-lg bg-white text-black shadow"
              onChange={(e) => handleUniversityChange(e.target.value)}
            >
              <option value="">-- Choose University --</option>
              <option value="medicaps">Medicaps University</option>
              {/* Later add more universities here */}
            </select>
          </>
        ) : (
          <>
            <h2 className="text-2xl font-semibold text-white mt-6">
              Welcome to{" "}
              {selectedUniversity === "medicaps"
                ? "Medicaps University"
                : selectedUniversity}
            </h2>
            <div className="space-x-4 mt-6">
              <Link href="/login">
                <button className="px-6 py-3 bg-white text-blue-600 font-semibold rounded-lg shadow hover:bg-gray-200">
                  Login
                </button>
              </Link>
              <Link href="/signup">
                <button className="px-6 py-3 bg-yellow-400 text-black font-semibold rounded-lg shadow hover:bg-yellow-500">
                  Sign Up
                </button>
              </Link>
              <div className="mt-4">
                <button
                  onClick={() => {
                    localStorage.removeItem("selectedUniversity");
                    setSelectedUniversity("");
                  }}
                  className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600"
                >
                  Change University
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}


