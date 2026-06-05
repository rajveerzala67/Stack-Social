"use client";

import { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { useRouter } from "next/navigation";
import { Mail, ArrowLeft, Check, ShieldAlert, KeyRound, Eye, EyeOff } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";

export default function ForgotPasswordPage() {
  const router = useRouter();
  const cardRef = useRef(null);

  const [step, setStep] = useState("email"); // "email" | "otp" | "newpass" | "done"
  const [email, setEmail] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // GSAP Entrance
  useEffect(() => {
    if (!cardRef.current) return;
    const ctx = gsap.context(() => {
      gsap.fromTo(
        cardRef.current,
        { opacity: 0, y: 30, scale: 0.98 },
        { opacity: 1, y: 0, scale: 1, duration: 0.8, ease: "power3.out" }
      );
    }, cardRef.current);
    return () => ctx.revert();
  }, []);

  // Animate step transitions
  const animateStepChange = (nextStep) => {
    gsap.to(".step-anim", {
      opacity: 0, y: 10, duration: 0.2, ease: "power2.in",
      onComplete: () => {
        setStep(nextStep);
        gsap.fromTo(".step-anim", { opacity: 0, y: -10 }, { opacity: 1, y: 0, duration: 0.35, ease: "power2.out" });
      },
    });
  };

  // Step 1: Send OTP to email
  const handleSendOTP = async (e) => {
    e.preventDefault();
    setErrorMsg("");
    if (!email) { setErrorMsg("Please enter your email address."); return; }

    setIsLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/forgot-password`,
      });
      if (error) throw error;
      animateStepChange("otp");
    } catch (error) {
      setErrorMsg(error.message || "Failed to send recovery email.");
    } finally {
      setIsLoading(false);
    }
  };

  // Step 2: Verify OTP
  const handleVerifyOTP = async (e) => {
    e.preventDefault();
    setErrorMsg("");
    if (!otpCode || otpCode.length < 6) { setErrorMsg("Please enter the 6-digit code."); return; }

    setIsLoading(true);
    try {
      const { error } = await supabase.auth.verifyOtp({
        email,
        token: otpCode,
        type: "recovery",
      });
      if (error) throw error;
      animateStepChange("newpass");
    } catch (error) {
      setErrorMsg(error.message || "Invalid or expired code.");
    } finally {
      setIsLoading(false);
    }
  };

  // Step 3: Set new password
  const handleSetPassword = async (e) => {
    e.preventDefault();
    setErrorMsg("");
    if (!newPassword) { setErrorMsg("Please enter a new password."); return; }
    if (newPassword.length < 6) { setErrorMsg("Password must be at least 6 characters."); return; }
    if (newPassword !== confirmNewPassword) { setErrorMsg("Passwords do not match."); return; }

    setIsLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      animateStepChange("done");
    } catch (error) {
      setErrorMsg(error.message || "Failed to update password.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-brand-ivory flex items-center justify-center py-12 px-margin-mobile md:px-margin-desktop font-sans relative overflow-hidden">
      <div className="absolute top-[-20%] left-[-10%] w-[50%] aspect-square rounded-full bg-surface-container/30 filter blur-3xl opacity-60 pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[50%] aspect-square rounded-full bg-surface-container-high/20 filter blur-3xl opacity-50 pointer-events-none" />

      <div ref={cardRef} className="w-full max-w-[480px] bg-surface border border-outline-variant p-8 md:p-10 rounded-sm shadow-[0px_20px_50px_rgba(0,0,0,0.03)] z-10 opacity-0 relative">
        {/* Header */}
        <header className="text-center mb-8">
          <div className="mb-2 flex justify-center">
            <span className="font-serif font-black text-3xl tracking-tighter text-primary">STACK SOCIAL</span>
          </div>
          <p className="font-caption text-caption uppercase tracking-widest text-secondary mt-1">Password Recovery</p>
        </header>

        <div className="step-anim">
          {/* Step 1: Enter Email */}
          {step === "email" && (
            <form onSubmit={handleSendOTP} className="space-y-5">
              <div className="border-b border-outline-variant/30 pb-3 mb-1">
                <h3 className="font-serif font-bold text-xl text-primary">Recover Your Password</h3>
                <p className="font-caption text-caption text-secondary mt-1">
                  Enter your registered email. We&apos;ll send a 6-digit code to reset your password.
                </p>
              </div>

              {errorMsg && (
                <div className="bg-error-container/30 border border-error/20 text-error text-caption p-3.5 rounded-md flex items-center gap-2.5">
                  <ShieldAlert size={16} className="shrink-0" /><span>{errorMsg}</span>
                </div>
              )}

              <div className="space-y-1.5">
                <label className="font-label-md text-[11px] uppercase tracking-wider text-secondary">Email Address</label>
                <div className="relative flex items-center">
                  <Mail size={18} className="absolute left-3 text-secondary" />
                  <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-surface-container-lowest border border-outline-variant py-2.5 pl-10 pr-4 text-body-md font-body-md focus:outline-none focus:border-primary transition-colors text-primary rounded-sm"
                    placeholder="name@example.com" disabled={isLoading} />
                </div>
              </div>

              <button type="submit" disabled={isLoading}
                className="w-full bg-primary text-on-primary font-label-md text-label-md py-3 rounded-full hover:opacity-90 active:scale-98 transition-all uppercase tracking-widest font-bold cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2">
                {isLoading ? <div className="w-5 h-5 border-2 border-on-primary border-t-transparent rounded-full animate-spin" /> : "Send Recovery Code"}
              </button>

              <button type="button" onClick={() => router.push("/login")}
                className="w-full py-2.5 text-center font-label-md text-label-md text-secondary hover:text-primary hover:underline uppercase tracking-wider cursor-pointer flex items-center justify-center gap-2">
                <ArrowLeft size={16} /> Back to Sign In
              </button>
            </form>
          )}

          {/* Step 2: Enter OTP Code */}
          {step === "otp" && (
            <form onSubmit={handleVerifyOTP} className="space-y-5">
              <div className="border-b border-outline-variant/30 pb-3 mb-1">
                <h3 className="font-serif font-bold text-xl text-primary">Enter Verification Code</h3>
                <p className="font-caption text-caption text-secondary mt-1">
                  We sent a 6-digit code to <span className="font-bold text-primary">{email}</span>. Check your inbox and spam folder.
                </p>
              </div>

              {errorMsg && (
                <div className="bg-error-container/30 border border-error/20 text-error text-caption p-3.5 rounded-md flex items-center gap-2.5">
                  <ShieldAlert size={16} className="shrink-0" /><span>{errorMsg}</span>
                </div>
              )}

              <div className="space-y-1.5">
                <label className="font-label-md text-[11px] uppercase tracking-wider text-secondary">6-Digit Code</label>
                <input type="text" value={otpCode} onChange={(e) => setOtpCode(e.target.value.replace(/[^0-9]/g, "").slice(0, 6))}
                  className="w-full bg-surface-container-lowest border border-outline-variant py-3 px-4 text-center text-2xl tracking-[0.5em] font-bold font-body-md focus:outline-none focus:border-primary transition-colors text-primary rounded-sm"
                  placeholder="000000" disabled={isLoading} maxLength={6} />
              </div>

              <button type="submit" disabled={isLoading}
                className="w-full bg-primary text-on-primary font-label-md text-label-md py-3 rounded-full hover:opacity-90 active:scale-98 transition-all uppercase tracking-widest font-bold cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2">
                {isLoading ? <div className="w-5 h-5 border-2 border-on-primary border-t-transparent rounded-full animate-spin" /> : "Verify Code"}
              </button>

              <button type="button" onClick={() => { setErrorMsg(""); animateStepChange("email"); }}
                className="w-full py-2.5 text-center font-label-md text-label-md text-secondary hover:text-primary hover:underline uppercase tracking-wider cursor-pointer">
                Resend Code
              </button>
            </form>
          )}

          {/* Step 3: Set New Password */}
          {step === "newpass" && (
            <form onSubmit={handleSetPassword} className="space-y-5">
              <div className="border-b border-outline-variant/30 pb-3 mb-1">
                <h3 className="font-serif font-bold text-xl text-primary">Set New Password</h3>
                <p className="font-caption text-caption text-secondary mt-1">
                  Choose a strong new password for your account.
                </p>
              </div>

              {errorMsg && (
                <div className="bg-error-container/30 border border-error/20 text-error text-caption p-3.5 rounded-md flex items-center gap-2.5">
                  <ShieldAlert size={16} className="shrink-0" /><span>{errorMsg}</span>
                </div>
              )}

              <div className="space-y-1.5">
                <label className="font-label-md text-[11px] uppercase tracking-wider text-secondary">New Password</label>
                <div className="relative flex items-center">
                  <KeyRound size={18} className="absolute left-3 text-secondary" />
                  <input type={showPassword ? "text" : "password"} value={newPassword} onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full bg-surface-container-lowest border border-outline-variant py-2.5 pl-10 pr-10 text-body-md font-body-md focus:outline-none focus:border-primary transition-colors text-primary rounded-sm"
                    placeholder="••••••••" disabled={isLoading} />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 text-secondary hover:text-primary cursor-pointer">
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="font-label-md text-[11px] uppercase tracking-wider text-secondary">Confirm New Password</label>
                <div className="relative flex items-center">
                  <KeyRound size={18} className="absolute left-3 text-secondary" />
                  <input type="password" value={confirmNewPassword} onChange={(e) => setConfirmNewPassword(e.target.value)}
                    className="w-full bg-surface-container-lowest border border-outline-variant py-2.5 pl-10 pr-4 text-body-md font-body-md focus:outline-none focus:border-primary transition-colors text-primary rounded-sm"
                    placeholder="••••••••" disabled={isLoading} />
                </div>
              </div>

              <button type="submit" disabled={isLoading}
                className="w-full bg-primary text-on-primary font-label-md text-label-md py-3 rounded-full hover:opacity-90 active:scale-98 transition-all uppercase tracking-widest font-bold cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2">
                {isLoading ? <div className="w-5 h-5 border-2 border-on-primary border-t-transparent rounded-full animate-spin" /> : "Update Password"}
              </button>
            </form>
          )}

          {/* Step 4: Success */}
          {step === "done" && (
            <div className="space-y-6 text-center py-6">
              <div className="w-16 h-16 rounded-full bg-primary text-on-primary flex items-center justify-center mx-auto">
                <Check size={32} />
              </div>
              <div className="space-y-2">
                <h3 className="font-serif font-bold text-xl text-primary">Password Updated</h3>
                <p className="font-caption text-secondary">
                  Your password has been successfully changed. You can now sign in with your new password.
                </p>
              </div>
              <button onClick={() => router.push("/login")}
                className="w-full bg-primary text-on-primary font-label-md text-label-md py-3 rounded-full hover:opacity-90 active:scale-98 transition-all uppercase tracking-widest font-bold cursor-pointer">
                Back to Sign In
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
