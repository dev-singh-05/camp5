"use client";

import Link from "next/link";

export default function HomePage() {
  function handleSelectUniversity(slug: string) {
    localStorage.setItem("selectedUniversity", slug);
    alert(`Selected: ${slug}`);
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 gap-6">
      <h1 className="text-4xl font-bold mb-8">Campus 5</h1>

      {/* ✅ University Dropdown */}
      <div className="dropdown">
        <input type="checkbox" id="dropdown-toggle" hidden />
        <label htmlFor="dropdown-toggle" className="trigger">
          Select University
        </label>
        <ul className="list">
          <li className="listitem">
            <button
              className="article w-full text-left"
              onClick={() => handleSelectUniversity("medicaps")}
            >
              MediCaps University
            </button>
          </li>
          <li className="listitem">
            <button
              className="article w-full text-left"
              onClick={() => handleSelectUniversity("example")}
            >
              Example University
            </button>
          </li>
        </ul>
      </div>

      {/* ✅ Styled Login button */}
      <Link href="/login">
        <div className="user-profile">
          <div className="user-profile-inner">Login</div>
        </div>
      </Link>

      {/* ✅ Styled Signup button */}
      <Link href="/signup">
        <div className="user-profile">
          <div className="user-profile-inner">Sign Up</div>
        </div>
      </Link>
    </div>
  );
}