"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Image as ImageIcon, Type, Award, Sparkles } from "lucide-react";

export default function EditorialGuidelines() {
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
            Stack Social / Codex
          </span>
        </div>

        {/* Title */}
        <div className="space-y-6 mb-16">
          <h1 className="font-display-lg text-[42px] md:text-[56px] leading-[1.05] text-primary">
            The Curatorial <br />
            <span className="italic">Codex & Guidelines</span>
          </h1>
          <p className="font-body-lg text-secondary max-w-2xl leading-relaxed">
            A guide to cultivating the aesthetic standard of STACK SOCIAL. We aim to inspire high-fidelity imagery, deliberate compositions, and respectful curation.
          </p>
        </div>

        {/* Content sections */}
        <div className="space-y-12 mb-16 pt-8 border-t border-outline-variant/30">
          
          <div className="flex flex-col md:flex-row gap-6 items-start">
            <div className="w-10 h-10 rounded-full border border-outline-variant/60 flex items-center justify-center text-primary shrink-0">
              <ImageIcon size={18} />
            </div>
            <div className="space-y-2">
              <h3 className="font-serif font-bold text-xl text-primary">1. High-Fidelity Imagery</h3>
              <p className="font-body-md text-secondary leading-relaxed">
                STACK SOCIAL values composition, clarity, and depth. We recommend uploading high-resolution visual assets. Focus on clean lighting, structural geometry (brutalist, modernist, or neoclassical), and color stories that feel deliberate and cohesive.
              </p>
            </div>
          </div>

          <div className="flex flex-col md:flex-row gap-6 items-start">
            <div className="w-10 h-10 rounded-full border border-outline-variant/60 flex items-center justify-center text-primary shrink-0">
              <Type size={18} />
            </div>
            <div className="space-y-2">
              <h3 className="font-serif font-bold text-xl text-primary">2. Editorial Writing</h3>
              <p className="font-body-md text-secondary leading-relaxed">
                Avoid uppercase formatting, clickbait phrases, or excessive hashtag listings. Keep captions precise and editorial. Think of the text as a museum placard or catalog entry—brief, informative, and complementary to the image.
              </p>
            </div>
          </div>

          <div className="flex flex-col md:flex-row gap-6 items-start">
            <div className="w-10 h-10 rounded-full border border-outline-variant/60 flex items-center justify-center text-primary shrink-0">
              <Award size={18} />
            </div>
            <div className="space-y-2">
              <h3 className="font-serif font-bold text-xl text-primary">3. Intellectual Authenticity</h3>
              <p className="font-body-md text-secondary leading-relaxed">
                Plagiarism dilutes curatorial quality. When sharing archives or physical objects, tag the designers, artists, architects, or original publishers. If your post contains historical research, state sources clearly so other curators can learn from it.
              </p>
            </div>
          </div>

          <div className="flex flex-col md:flex-row gap-6 items-start">
            <div className="w-10 h-10 rounded-full border border-outline-variant/60 flex items-center justify-center text-primary shrink-0">
              <Sparkles size={18} />
            </div>
            <div className="space-y-2">
              <h3 className="font-serif font-bold text-xl text-primary">4. Digital Minimalism</h3>
              <p className="font-body-md text-secondary leading-relaxed">
                Embrace spacing and blank borders. In both your grid layout and post feed, celebrate breathing room. Let each post stand as a singular installation rather than adding to a crowded, noisy timeline.
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
          <Link href="/terms" className="font-caption text-[10px] uppercase tracking-widest text-secondary hover:text-primary transition-colors">Terms</Link>
        </div>
      </footer>
    </div>
  );
}
