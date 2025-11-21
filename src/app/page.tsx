"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { School, ChevronDown, ArrowRight, Mail } from "lucide-react";
import HappyButton from "@/components/ui/HappyButton";

const universities = [
  { id: "medicaps", name: "MediCaps University", location: "Indore, MP" },
  { id: "other", name: "Other University", location: "Coming Soon" },
];

export default function HomePage() {
  const router = useRouter();
  const [selectedUniversity, setSelectedUniversity] = useState<string>("");
  const [showContinue, setShowContinue] = useState(false);
  const [showComingSoon, setShowComingSoon] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

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
      setIsDropdownOpen(false);
      return;
    }

    setSelectedUniversity(universityId);
    localStorage.setItem("selectedUniversity", universityId);
    setShowContinue(true);
    setShowComingSoon(false);
    setIsDropdownOpen(false);
  };

  const getUniversityName = (id: string) => {
    const uni = universities.find(u => u.id === id);
    return uni ? uni.name : "";
  };

  const handleContactUs = () => {
    window.location.href = "mailto:contact@unirizz.com?subject=Bring UniRizz to my University";
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-background text-foreground gap-8 p-4 transition-colors duration-300">

      {/* Animated Background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <motion.div
          animate={{
            scale: [1, 1.2, 1],
            rotate: [0, 90, 0],
            opacity: [0.3, 0.5, 0.3],
          }}
          transition={{ duration: 20, repeat: Infinity }}
          className="absolute -top-1/2 -left-1/2 w-full h-full bg-gradient-to-br from-purple-500/10 to-transparent rounded-full blur-3xl"
        />
        <motion.div
          animate={{
            scale: [1.2, 1, 1.2],
            rotate: [90, 0, 90],
            opacity: [0.3, 0.5, 0.3],
          }}
          transition={{ duration: 25, repeat: Infinity }}
          className="absolute -bottom-1/2 -right-1/2 w-full h-full bg-gradient-to-tl from-cyan-500/10 to-transparent rounded-full blur-3xl"
        />
      </div>

      {/* University Selection Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative z-10 bg-card/80 backdrop-blur-xl rounded-3xl shadow-2xl p-8 max-w-lg w-full border border-border"
      >
        {/* Icon */}
        <div className="flex justify-center mb-6">
          <div className="w-20 h-20 bg-gradient-to-br from-happy-periwinkle to-happy-mint rounded-2xl flex items-center justify-center shadow-lg shadow-happy-periwinkle/20">
            <School className="w-10 h-10 text-white" />
          </div>
        </div>

        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-happy-purple to-happy-periwinkle bg-clip-text text-transparent">
            UniRizz
          </h1>
          <p className="text-lg font-medium mb-1">Let's Rizzup Connecting</p>
          <p className="text-muted-foreground text-sm">Select your university to get started</p>
        </div>

        {/* University Selection Label */}
        <label className="block text-foreground font-medium mb-3">
          Select University
        </label>

        {/* University Dropdown */}
        <div className="mb-6 relative">
          <button
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            className="w-full flex items-center justify-between px-4 py-3 bg-background border border-input rounded-xl text-left hover:border-primary transition-colors"
          >
            <span className={selectedUniversity ? "text-foreground" : "text-muted-foreground"}>
              {selectedUniversity ? getUniversityName(selectedUniversity) : "Choose your university"}
            </span>
            <ChevronDown className={`w-5 h-5 text-muted-foreground transition-transform ${isDropdownOpen ? "rotate-180" : ""}`} />
          </button>

          {isDropdownOpen && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="absolute top-full left-0 right-0 mt-2 bg-card border border-border rounded-xl shadow-xl overflow-hidden z-20"
            >
              {universities.map((university) => (
                <button
                  key={university.id}
                  onClick={() => handleSelectUniversity(university.id)}
                  className={`w-full text-left px-4 py-3 hover:bg-accent transition-colors flex flex-col ${selectedUniversity === university.id ? "bg-accent/50" : ""
                    }`}
                >
                  <span className="font-medium text-foreground">{university.name}</span>
                  <span className="text-xs text-muted-foreground">{university.location}</span>
                </button>
              ))}
            </motion.div>
          )}
        </div>

        {/* Coming Soon Message */}
        {showComingSoon && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            className="mb-6 p-6 rounded-2xl bg-accent/50 border border-border backdrop-blur-sm"
          >
            <div className="text-center mb-4">
              <h3 className="text-xl font-semibold mb-2">
                Coming Soon! 🚀
              </h3>
              <p className="text-muted-foreground text-sm mb-4">
                UniRizz is coming soon to other universities
              </p>
            </div>
            <HappyButton
              onClick={handleContactUs}
              className="w-full justify-center"
              variant="periwinkle"
              icon={Mail}
            >
              Contact Us
            </HappyButton>
          </motion.div>
        )}

        {/* Action Buttons */}
        {showContinue && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col gap-4"
          >
            <Link href="/login" className="w-full">
              <HappyButton
                className="w-full justify-center py-6 text-lg"
                variant="periwinkle"
                icon={ArrowRight}
              >
                Login
              </HappyButton>
            </Link>

            <div className="relative flex items-center justify-center my-2">
              <div className="border-t border-border w-full"></div>
              <span className="absolute bg-card px-4 text-muted-foreground text-sm">or</span>
            </div>

            <div className="text-center">
              <span className="text-muted-foreground">Don't have an account? </span>
              <Link href="/signup" className="text-primary font-bold hover:underline transition-all">
                Sign up
              </Link>
            </div>
          </motion.div>
        )}

        {!showContinue && !showComingSoon && (
          <div className="text-center p-6 bg-accent/30 rounded-xl border border-border/50">
            <p className="text-muted-foreground text-sm">
              Please select a university to continue
            </p>
          </div>
        )}
      </motion.div>

      {/* Footer */}
      <p className="text-muted-foreground/60 text-sm">
        Connect with your campus community
      </p>
    </div>
  );
}