"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Globe, Eye, PenTool } from "lucide-react";

export default function About() {
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
            Stack Social / About
          </span>
        </div>

        {/* Hero Title */}
        <div className="space-y-6 mb-16">
          <h1 className="font-display-lg text-[42px] md:text-[56px] leading-[1.05] text-primary">
            The Art of <br />
            <span className="italic">Visual Curation</span>
          </h1>
          <p className="font-body-lg text-secondary max-w-2xl leading-relaxed">
            STACK SOCIAL is a digital environment dedicated to visual intelligence, architectural purity, and the curation of contemporary culture. Designed for creators who believe that feed composition is a form of art.
          </p>
        </div>

        {/* Pillars Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16 pt-8 border-t border-outline-variant/30">
          <div className="space-y-3">
            <div className="w-10 h-10 rounded-full border border-outline-variant/60 flex items-center justify-center text-primary">
              <Globe size={18} />
            </div>
            <h3 className="font-serif font-bold text-lg text-primary">Global Archive</h3>
            <p className="font-caption text-secondary/80 leading-relaxed">
              A curated stream of visual narratives, fashion archives, and contemporary art movements, selected for the discerning eye.
            </p>
          </div>
          <div className="space-y-3">
            <div className="w-10 h-10 rounded-full border border-outline-variant/60 flex items-center justify-center text-primary">
              <Eye size={18} />
            </div>
            <h3 className="font-serif font-bold text-lg text-primary">Discerning Eye</h3>
            <p className="font-caption text-secondary/80 leading-relaxed">
              We empower curators to showcase high-fidelity imagery, brutalist architecture, and minimalist styling with absolute clarity.
            </p>
          </div>
          <div className="space-y-3">
            <div className="w-10 h-10 rounded-full border border-outline-variant/60 flex items-center justify-center text-primary">
              <PenTool size={18} />
            </div>
            <h3 className="font-serif font-bold text-lg text-primary">Pure Expression</h3>
            <p className="font-caption text-secondary/80 leading-relaxed">
              Our digital layout features editorial typography, clean margins, and no clutter—giving your curation the canvas it deserves.
            </p>
          </div>
        </div>

        {/* Philosophy Block */}
        <section className="bg-surface-container/30 border border-outline-variant/20 p-8 rounded-lg mb-16 space-y-4">
          <h2 className="font-serif font-bold text-2xl text-primary">Our Philosophy</h2>
          <p className="font-body-md text-secondary leading-relaxed">
            In an era of hyper-stimulated feeds and algorithmic noise, STACK SOCIAL champions deliberate speed and intentional connections. We believe a post is not merely content, but an installation. Our ecosystem offers WebRTC real-time connection channels and interactive direct sharing to foster collaboration between curators globally.
          </p>
        </section>
      </div>

      {/* Footer */}
      <footer className="border-t border-outline-variant/30 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
        <span className="font-caption text-[10px] uppercase tracking-[0.2em] text-secondary/50">
          © 2026 STACK SOCIAL
        </span>
        <div className="flex gap-6">
          <Link href="/privacy" className="font-caption text-[10px] uppercase tracking-widest text-secondary hover:text-primary transition-colors">Privacy</Link>
          <Link href="/terms" className="font-caption text-[10px] uppercase tracking-widest text-secondary hover:text-primary transition-colors">Terms</Link>
          <Link href="/editorial-guidelines" className="font-caption text-[10px] uppercase tracking-widest text-secondary hover:text-primary transition-colors">Guidelines</Link>
        </div>
      </footer>
    </div>
  );
}
