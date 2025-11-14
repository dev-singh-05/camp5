"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

const universities = [
  { id: "medicaps", name: "MediCaps University", location: "Indore, MP" },
  { id: "other", name: "Other University", location: "Coming Soon" },
];

export default function HomePage() {
  const router = useRouter();
  const [selectedUniversity, setSelectedUniversity] = useState<string>("");
  const [showContinue, setShowContinue] = useState(false);
  const [showComingSoon, setShowComingSoon] = useState(false);

  useEffect(() => {
    // Check if university is already selected
    const storedUniversity = localStorage.getItem("selectedUniversity");
    if (storedUniversity && storedUniversity === "medicaps") {
      setSelectedUniversity(storedUniversity);
      setShowContinue(true);
    }
  }, []);

  const handleSelectUniversity = (universityId: string) => {
    if (universityId === "other") {
      setShowComingSoon(true);
      setShowContinue(false);
      setSelectedUniversity("");
      return;
    }

    setSelectedUniversity(universityId);
    localStorage.setItem("selectedUniversity", universityId);
    setShowContinue(true);
    setShowComingSoon(false);

    // Close the dropdown
    const checkbox = document.getElementById("dropdown-toggle") as HTMLInputElement;
    if (checkbox) {
      checkbox.checked = false;
    }
  };

  const getUniversityName = (id: string) => {
    const uni = universities.find(u => u.id === id);
    return uni ? uni.name : "";
  };

  const handleContactUs = () => {
    window.location.href = "mailto:contact@unirizz.com?subject=Bring UniRizz to my University";
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-indigo-950 via-purple-900 to-indigo-900 gap-8 p-4">
      {/* University Selection Card */}
      <div className="bg-gradient-to-br from-purple-900/40 to-indigo-900/40 backdrop-blur-xl rounded-3xl shadow-2xl p-8 max-w-lg w-full border border-purple-500/20">
        {/* Icon */}
        <div className="flex justify-center mb-6">
          <div className="w-20 h-20 bg-gradient-to-br from-blue-400 to-cyan-400 rounded-2xl flex items-center justify-center shadow-lg">
            <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
        </div>

        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold mb-2 text-white">
            UniRizz
          </h1>
          <p className="text-purple-200 text-lg mb-1">Let's Rizzup Connecting</p>
          <p className="text-purple-300 text-sm">Select your university to get started</p>
        </div>

        {/* University Selection Label */}
        <label className="block text-purple-200 font-medium mb-3">
          Select University
        </label>

        {/* University Dropdown */}
        <div className="mb-6">
          <div className="dropdown-modern">
            <input type="checkbox" id="dropdown-toggle" hidden />
            <label htmlFor="dropdown-toggle" className="trigger-modern">
              <svg className="w-5 h-5 text-purple-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
              {selectedUniversity ? getUniversityName(selectedUniversity) : "Choose your university"}
            </label>
            <ul className="list-modern">
              {universities.map((university) => (
                <li key={university.id} className="listitem">
                  <button
                    className={`article-modern ${
                      selectedUniversity === university.id
                        ? "article-modern-selected"
                        : ""
                    }`}
                    onClick={() => handleSelectUniversity(university.id)}
                  >
                    <div className="flex flex-col">
                      <span className="font-medium text-white">
                        {university.name}
                      </span>
                      <span className="text-xs text-purple-300 mt-1">
                        {university.location}
                      </span>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Coming Soon Message */}
        {showComingSoon && (
          <div className="mb-6 p-6 rounded-2xl bg-purple-500/20 border border-purple-400/30 backdrop-blur-sm">
            <div className="text-center mb-4">
              <h3 className="text-xl font-semibold text-white mb-2">
                Coming Soon! 🚀
              </h3>
              <p className="text-purple-200 text-sm mb-4">
                UniRizz is coming soon to other universities
              </p>
            </div>
            <button
              onClick={handleContactUs}
              className="w-full py-3 px-4 bg-gradient-to-r from-blue-500 to-cyan-500 text-white font-semibold rounded-xl hover:from-blue-600 hover:to-cyan-600 transition-all shadow-lg hover:shadow-xl"
            >
              Contact Us to Bring Your University
            </button>
          </div>
        )}

        {/* Action Buttons */}
        {showContinue && (
          <div className="flex flex-col gap-4">
            <Link href="/login" className="w-full">
              <button className="w-full py-4 px-6 bg-gradient-to-r from-purple-500 to-cyan-500 text-white font-bold rounded-xl hover:from-purple-600 hover:to-cyan-600 transition-all shadow-lg hover:shadow-xl text-lg">
                Login
              </button>
            </Link>

            <div className="relative flex items-center justify-center my-2">
              <div className="border-t border-purple-400/30 w-full"></div>
              <span className="absolute bg-purple-900/40 px-4 text-purple-300 text-sm">or</span>
            </div>

            <div className="text-center">
              <span className="text-purple-200">Don't have an account? </span>
              <Link href="/signup" className="text-cyan-400 font-semibold hover:text-cyan-300 transition-colors">
                Sign up
              </Link>
            </div>
          </div>
        )}

        {!showContinue && !showComingSoon && (
          <div className="text-center p-6 bg-purple-500/10 rounded-xl border border-purple-400/20">
            <p className="text-purple-200 text-sm">
              Please select a university to continue
            </p>
          </div>
        )}
      </div>

      {/* Footer */}
      <p className="text-purple-300/60 text-sm">
        Connect with your campus community
      </p>
    </div>
  );
}