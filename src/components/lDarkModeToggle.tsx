"use client";

import React, { useState, useEffect } from "react";

export default function DarkModeToggle() {
  const [isDark, setIsDark] = useState(false);
  const [mounted, setMounted] = useState(false);

  // Handle mounting and initial theme detection
  useEffect(() => {
    setMounted(true);

    // Check for stored preference or system preference
    const stored = localStorage.getItem("theme");
    const systemPrefersDark = window.matchMedia(
      "(prefers-color-scheme: dark)"
    ).matches;

    if (stored === "dark" || (!stored && systemPrefersDark)) {
      setIsDark(true);
      document.documentElement.classList.add("dark");
    } else {
      setIsDark(false);
      document.documentElement.classList.remove("dark");
    }
  }, []);

  const toggleTheme = () => {
    const newTheme = !isDark;
    setIsDark(newTheme);

    if (newTheme) {
      document.documentElement.classList.add("dark");
      localStorage.setItem("theme", "dark");
    } else {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("theme", "light");
    }
  };

  if (!mounted) {
    return (
      <div className="w-12 h-6 bg-charcoal-200 rounded-sm animate-pulse"></div>
    );
  }

  return (
    <button
      onClick={toggleTheme}
      className="relative w-12 h-6 bg-charcoal-200 rounded-sm transition-all duration-300 hover:bg-charcoal-300 focus:outline-none focus:ring-2 focus:ring-gold-500 focus:ring-offset-2 focus:ring-offset-charcoal-50"
      aria-label={`Switch to ${isDark ? "light" : "dark"} mode`}
    >
      {/* Toggle Track */}
      <div
        className={`absolute inset-0 rounded-sm transition-colors duration-300 ${
          isDark ? "bg-charcoal-700" : "bg-charcoal-200"
        }`}
      >
        {/* Toggle Handle */}
        <div
          className={`absolute top-0.5 w-5 h-5 bg-white rounded-sm shadow-sm transition-all duration-300 transform ${
            isDark
              ? "translate-x-6 bg-gold-500"
              : "translate-x-0.5 bg-charcoal-800"
          }`}
        >
          {/* Icon */}
          <div className="flex items-center justify-center w-full h-full">
            {isDark ? (
              <svg
                className="w-3 h-3 text-charcoal-800"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z"
                  clipRule="evenodd"
                />
              </svg>
            ) : (
              <svg
                className="w-3 h-3 text-gold-500"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z"
                  clipRule="evenodd"
                />
              </svg>
            )}
          </div>
        </div>
      </div>

      {/* Subtle text indicator */}
      <span className="sr-only">{isDark ? "Dark" : "Light"} mode</span>
    </button>
  );
}
