"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, ShieldCheck, Key, EyeOff, UserCheck } from "lucide-react";

export default function Privacy() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-brand-ivory text-brand-charcoal px-6 py-12 md:px-12 md:py-24 max-w-4xl mx-auto flex flex-col justify-between">
      <div>
        {/* Header Navigation */}
        <div className="flex justify-between items-center mb-16 border-b border-outline-variant/30 pb-6">
          <button
            onClick={() => router.back()}
            className="font-label-md text-[11px] uppercase tracking-widest text-brand-charcoal border-b border-brand-charcoal pb-0.5 hover:opacity-70 transition-opacity flex items-center gap-2 cursor-pointer"
          >
            <ArrowLeft size={14} /> Back
          </button>
          <span className="font-caption text-[11px] uppercase tracking-[0.3em] text-secondary">
            Stack Social / Privacy
          </span>
        </div>

        {/* Title */}
        <div className="space-y-6 mb-16">
          <h1 className="font-display-lg text-[42px] md:text-[56px] leading-[1.05] text-primary">
            Privacy & <br />
            <span className="italic">Data Integrity</span>
          </h1>
          <p className="font-body-lg text-secondary max-w-2xl leading-relaxed">
            At STACK SOCIAL, we respect your right to curate in private. We build tools that prioritize direct ownership of your visual catalog and private conversations.
          </p>
        </div>

        {/* Content sections */}
        <div className="space-y-12 mb-16 pt-8 border-t border-outline-variant/30">
          
          <div className="flex flex-col md:flex-row gap-6 items-start">
            <div className="w-10 h-10 rounded-full border border-outline-variant/60 flex items-center justify-center text-primary shrink-0">
              <ShieldCheck size={18} />
            </div>
            <div className="space-y-2">
              <h3 className="font-serif font-bold text-xl text-primary">1. Collection and Use</h3>
              <p className="font-body-md text-secondary leading-relaxed">
                We collect minimal profile details (such as display names, avatars, and specialties) to build your digital presence. All media uploads, portfolios, and reels are hosted securely on custom storage buckets, linked directly to your authenticated session.
              </p>
            </div>
          </div>

          <div className="flex flex-col md:flex-row gap-6 items-start">
            <div className="w-10 h-10 rounded-full border border-outline-variant/60 flex items-center justify-center text-primary shrink-0">
              <Key size={18} />
            </div>
            <div className="space-y-2">
              <h3 className="font-serif font-bold text-xl text-primary">2. Conversation Encryption</h3>
              <p className="font-body-md text-secondary leading-relaxed">
                Direct messages, voice notes, and WebRTC streaming signals are isolated to conversation members. RLS policies secure your private messages against unauthorized database reads, verifying user identification tokens at every exchange.
              </p>
            </div>
          </div>

          <div className="flex flex-col md:flex-row gap-6 items-start">
            <div className="w-10 h-10 rounded-full border border-outline-variant/60 flex items-center justify-center text-primary shrink-0">
              <EyeOff size={18} />
            </div>
            <div className="space-y-2">
              <h3 className="font-serif font-bold text-xl text-primary">3. No Data Commercialization</h3>
              <p className="font-body-md text-secondary leading-relaxed">
                STACK SOCIAL is not ad-supported. We do not sell your curatorial preferences, search keywords, or private messaging logs to third-party data houses or advertising systems. Your aesthetic stays yours.
              </p>
            </div>
          </div>

          <div className="flex flex-col md:flex-row gap-6 items-start">
            <div className="w-10 h-10 rounded-full border border-outline-variant/60 flex items-center justify-center text-primary shrink-0">
              <UserCheck size={18} />
            </div>
            <div className="space-y-2">
              <h3 className="font-serif font-bold text-xl text-primary">4. Curator Sovereignty</h3>
              <p className="font-body-md text-secondary leading-relaxed">
                You retain complete power to update, archive, or delete your posts, profile avatar, cover background, and conversations at any time. When content is removed, it is purged permanently from our Supabase servers.
              </p>
            </div>
          </div>

        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-outline-variant/30 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
        <span className="font-caption text-[10px] uppercase tracking-[0.2em] text-secondary/50">
          © 2026 STACK SOCIAL
        </span>
        <div className="flex gap-6">
          <Link href="/about" className="font-caption text-[10px] uppercase tracking-widest text-secondary hover:text-primary transition-colors">About</Link>
          <Link href="/terms" className="font-caption text-[10px] uppercase tracking-widest text-secondary hover:text-primary transition-colors">Terms</Link>
          <Link href="/editorial-guidelines" className="font-caption text-[10px] uppercase tracking-widest text-secondary hover:text-primary transition-colors">Guidelines</Link>
        </div>
      </footer>
    </div>
  );
}
