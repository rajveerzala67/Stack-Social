"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Scale, Edit2, FileText, AlertCircle } from "lucide-react";

export default function Terms() {
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
            Stack Social / Terms
          </span>
        </div>

        {/* Title */}
        <div className="space-y-6 mb-16">
          <h1 className="font-display-lg text-[32px] sm:text-[38px] md:text-[56px] leading-[1.05] text-primary">
            Curator <br />
            <span className="italic">Agreement & Terms</span>
          </h1>
          <p className="font-body-lg text-secondary max-w-2xl leading-relaxed">
            By entering and curating on STACK SOCIAL, you enter a digital space governed by visual standards and mutual respect for intellectual property.
          </p>
        </div>

        {/* Content sections */}
        <div className="space-y-12 mb-16 pt-8 border-t border-outline-variant/30">
          
          <div className="flex flex-col md:flex-row gap-6 items-start">
            <div className="w-10 h-10 rounded-full border border-outline-variant/60 flex items-center justify-center text-primary shrink-0">
              <Scale size={18} />
            </div>
            <div className="space-y-2">
              <h3 className="font-serif font-bold text-xl text-primary">1. Acceptable Use</h3>
              <p className="font-body-md text-secondary leading-relaxed">
                As a curator, you are responsible for maintaining the security of your login sessions. You agree to use our publishing features to share high-fidelity creative expressions, rejecting any automated spam, malicious code, or harassment of other curators.
              </p>
            </div>
          </div>

          <div className="flex flex-col md:flex-row gap-6 items-start">
            <div className="w-10 h-10 rounded-full border border-outline-variant/60 flex items-center justify-center text-primary shrink-0">
              <Edit2 size={18} />
            </div>
            <div className="space-y-2">
              <h3 className="font-serif font-bold text-xl text-primary">2. Intellectual Property Rights</h3>
              <p className="font-body-md text-secondary leading-relaxed">
                You retain all ownership rights to the photos, videos, descriptions, and comments you submit. By uploading content, you grant STACK SOCIAL a standard, non-exclusive license to host and show your media in the feed, search grids, and profile tabs.
              </p>
            </div>
          </div>

          <div className="flex flex-col md:flex-row gap-6 items-start">
            <div className="w-10 h-10 rounded-full border border-outline-variant/60 flex items-center justify-center text-primary shrink-0">
              <FileText size={18} />
            </div>
            <div className="space-y-2">
              <h3 className="font-serif font-bold text-xl text-primary">3. Attribution Obligations</h3>
              <p className="font-body-md text-secondary leading-relaxed">
                STACK SOCIAL values authorship. When curating third-party images or historic design archives, you are expected to make a reasonable effort to attribute the original photographer, designer, or architectural firm in your captions.
              </p>
            </div>
          </div>

          <div className="flex flex-col md:flex-row gap-6 items-start">
            <div className="w-10 h-10 rounded-full border border-outline-variant/60 flex items-center justify-center text-primary shrink-0">
              <AlertCircle size={18} />
            </div>
            <div className="space-y-2">
              <h3 className="font-serif font-bold text-xl text-primary">4. Service Limitations</h3>
              <p className="font-body-md text-secondary leading-relaxed">
                Our platform and real-time WebRTC connections are provided on an "as is" and "as available" basis. We reserve the right to suspend accounts or remove materials that violate our Curatorial Codex or break system stability.
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
          <Link href="/privacy" className="font-caption text-[10px] uppercase tracking-widest text-secondary hover:text-primary transition-colors">Privacy</Link>
          <Link href="/editorial-guidelines" className="font-caption text-[10px] uppercase tracking-widest text-secondary hover:text-primary transition-colors">Guidelines</Link>
        </div>
      </footer>
    </div>
  );
}
