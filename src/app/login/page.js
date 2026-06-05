"use client";

import { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { useRouter } from "next/navigation";
import { KeyRound, Mail, Eye, EyeOff, Check, X, ShieldAlert, User } from "lucide-react";
import { useAuth } from "@/context/AuthContext";

export default function LoginPage() {
  const router = useRouter();
  const cardRef = useRef(null);
  const { signIn, signUp, user } = useAuth();

  // If already logged in, redirect to home
  useEffect(() => {
    if (user) {
      router.push("/");
    }
  }, [user, router]);

  // Auth Mode: "login" or "register"
  const [mode, setMode] = useState("login");

  // Show/Hide Password states
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Form Fields
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [displayName, setDisplayName] = useState("");

  // Validation / Error States
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // GSAP Entrance Animations
  useEffect(() => {
    if (!cardRef.current) return;
    const ctx = gsap.context(() => {
      gsap.fromTo(
        cardRef.current,
        { opacity: 0, y: 30, scale: 0.98 },
        { opacity: 1, y: 0, scale: 1, duration: 0.8, ease: "power3.out" }
      );
      gsap.from(".logo-anim", {
        opacity: 0,
        y: -15,
        stagger: 0.1,
        duration: 0.6,
        ease: "power2.out",
        delay: 0.2,
      });
    }, cardRef.current);

    return () => ctx.revert();
  }, []);

  // GSAP Animation when switching tabs
  const handleModeSwitch = (newMode) => {
    if (newMode === mode) return;
    setErrorMsg("");
    setSuccessMsg("");
    setEmail("");
    setPassword("");
    setConfirmPassword("");
    setDisplayName("");

    gsap.to(".form-anim", {
      opacity: 0,
      y: 10,
      duration: 0.2,
      ease: "power2.in",
      onComplete: () => {
        setMode(newMode);
        gsap.fromTo(
          ".form-anim",
          { opacity: 0, y: -10 },
          { opacity: 1, y: 0, duration: 0.35, ease: "power2.out" }
        );
      },
    });
  };

  // Form Submit Handler
  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg("");
    setSuccessMsg("");

    if (!email) {
      setErrorMsg("Please enter your email address.");
      return;
    }
    if (!password) {
      setErrorMsg("Please enter your password.");
      return;
    }

    setIsLoading(true);

    try {
      if (mode === "login") {
        await signIn(email, password);
        setSuccessMsg("Logged in successfully! Redirecting...");
        setTimeout(() => router.push("/"), 800);
      } else {
        // Register Mode
        if (!confirmPassword) {
          setIsLoading(false);
          setErrorMsg("Please confirm your password.");
          return;
        }
        if (password !== confirmPassword) {
          setIsLoading(false);
          setErrorMsg("Passwords do not match. Please verify.");
          return;
        }
        if (password.length < 6) {
          setIsLoading(false);
          setErrorMsg("Password must be at least 6 characters long.");
          return;
        }

        await signUp(email, password, displayName);
        setSuccessMsg("Account created! Welcome to Stack Social. Redirecting...");
        setTimeout(() => router.push("/"), 1200);
      }
    } catch (error) {
      setErrorMsg(error.message || "An error occurred. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-brand-ivory flex items-center justify-center py-12 px-margin-mobile md:px-margin-desktop font-sans relative overflow-hidden">
      {/* Decorative premium background blobs */}
      <div className="absolute top-[-20%] left-[-10%] w-[50%] aspect-square rounded-full bg-surface-container/30 filter blur-3xl opacity-60 pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[50%] aspect-square rounded-full bg-surface-container-high/20 filter blur-3xl opacity-50 pointer-events-none" />

      {/* Login Card */}
      <div
        ref={cardRef}
        className="w-full max-w-[480px] bg-surface border border-outline-variant p-8 md:p-10 rounded-sm shadow-[0px_20px_50px_rgba(0,0,0,0.03)] z-10 opacity-0 relative"
      >
        {/* Header/Brand Section */}
        <header className="text-center mb-8">
          <div className="logo-anim mb-2 flex justify-center">
            <span className="font-serif font-black text-3xl tracking-tighter text-primary">
              STACK SOCIAL
            </span>
          </div>
          <p className="logo-anim font-caption text-caption uppercase tracking-widest text-secondary mt-1">
            Editorial Curation Ecosystem
          </p>
        </header>

        {/* Tab Switcher */}
        <div className="flex border-b border-outline-variant/30 mb-6">
          <button
            onClick={() => handleModeSwitch("login")}
            className={`flex-1 pb-3 text-center font-label-md text-label-md uppercase tracking-wider transition-all border-b-2 cursor-pointer ${
              mode === "login"
                ? "border-primary text-primary font-bold"
                : "border-transparent text-secondary hover:text-primary"
            }`}
          >
            Sign In
          </button>
          <button
            onClick={() => handleModeSwitch("register")}
            className={`flex-1 pb-3 text-center font-label-md text-label-md uppercase tracking-wider transition-all border-b-2 cursor-pointer ${
              mode === "register"
                ? "border-primary text-primary font-bold"
                : "border-transparent text-secondary hover:text-primary"
            }`}
          >
            Create Account
          </button>
        </div>

        {/* Login/Register Form */}
        <form onSubmit={handleSubmit} className="form-anim space-y-5">
          {/* Status alerts */}
          {errorMsg && (
            <div className="bg-error-container/30 border border-error/20 text-error text-caption p-3.5 rounded-md flex items-center gap-2.5">
              <ShieldAlert size={16} className="shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}
          {successMsg && (
            <div className="bg-surface-container-low border border-primary/20 text-primary text-caption p-3.5 rounded-md flex items-center gap-2.5 font-medium">
              <Check size={16} className="shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Display Name Field (Register Only) */}
          {mode === "register" && (
            <div className="space-y-1.5">
              <label className="font-label-md text-[11px] uppercase tracking-wider text-secondary">
                Display Name
              </label>
              <div className="relative flex items-center">
                <User size={18} className="absolute left-3 text-secondary" />
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="w-full bg-surface-container-lowest border border-outline-variant py-2.5 pl-10 pr-4 text-body-md font-body-md focus:outline-none focus:border-primary transition-colors text-primary rounded-sm"
                  placeholder="Your name"
                  disabled={isLoading}
                />
              </div>
            </div>
          )}

          {/* Email Field */}
          <div className="space-y-1.5">
            <label className="font-label-md text-[11px] uppercase tracking-wider text-secondary">
              Email Address
            </label>
            <div className="relative flex items-center">
              <Mail size={18} className="absolute left-3 text-secondary" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-surface-container-lowest border border-outline-variant py-2.5 pl-10 pr-4 text-body-md font-body-md focus:outline-none focus:border-primary transition-colors text-primary rounded-sm"
                placeholder="name@example.com"
                disabled={isLoading}
              />
            </div>
          </div>

          {/* Password Field */}
          <div className="space-y-1.5">
            <div className="flex justify-between items-center">
              <label className="font-label-md text-[11px] uppercase tracking-wider text-secondary">
                Password
              </label>
              {mode === "login" && (
                <button
                  type="button"
                  onClick={() => router.push("/forgot-password")}
                  className="font-caption text-caption text-secondary hover:text-primary hover:underline cursor-pointer"
                >
                  Forgot password?
                </button>
              )}
            </div>
            <div className="relative flex items-center">
              <KeyRound size={18} className="absolute left-3 text-secondary" />
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-surface-container-lowest border border-outline-variant py-2.5 pl-10 pr-10 text-body-md font-body-md focus:outline-none focus:border-primary transition-colors text-primary rounded-sm"
                placeholder="••••••••"
                disabled={isLoading}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 text-secondary hover:text-primary cursor-pointer"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          {/* Confirm Password Field (Register Mode Only) */}
          {mode === "register" && (
            <div className="space-y-1.5">
              <label className="font-label-md text-[11px] uppercase tracking-wider text-secondary">
                Confirm Password
              </label>
              <div className="relative flex items-center">
                <KeyRound size={18} className="absolute left-3 text-secondary" />
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full bg-surface-container-lowest border border-outline-variant py-2.5 pl-10 pr-10 text-body-md font-body-md focus:outline-none focus:border-primary transition-colors text-primary rounded-sm"
                  placeholder="••••••••"
                  disabled={isLoading}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 text-secondary hover:text-primary cursor-pointer"
                >
                  {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>
          )}

          {/* Action Button */}
          <button
            type="submit"
            className="w-full bg-primary text-on-primary font-label-md text-label-md py-3 rounded-full hover:opacity-90 active:scale-98 transition-all uppercase tracking-widest font-bold mt-2 cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
            disabled={isLoading}
          >
            {isLoading ? (
              <div className="w-5 h-5 border-2 border-on-primary border-t-transparent rounded-full animate-spin" />
            ) : mode === "login" ? (
              "Sign In"
            ) : (
              "Create Account"
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
