/**
 * AuthLayout — shared wrapper for all auth pages (login, register, etc.)
 * Provides the branded two-column layout: decorative panel + form panel.
 */
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Sparkles } from 'lucide-react';

const fadeUp = {
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.35, ease: 'easeOut' },
};

export const AuthLayout = ({ children, title, subtitle }) => {
  return (
    <div className="min-h-screen flex">
      {/* ── Left decorative panel (hidden on mobile) ── */}
      <div className="hidden lg:flex lg:w-1/2 bg-brand-dark flex-col justify-between p-12 relative overflow-hidden">
        {/* Background pattern */}
        <div className="absolute inset-0 opacity-5">
          <div className="absolute top-0 left-0 w-96 h-96 bg-brand-orange rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2" />
          <div className="absolute bottom-0 right-0 w-96 h-96 bg-brand-orange rounded-full blur-3xl translate-x-1/2 translate-y-1/2" />
        </div>

        {/* Logo */}
        <Link to="/" className="flex items-center gap-2.5 relative z-10">
          <div className="w-9 h-9 bg-brand-orange rounded-xl flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <span className="text-white text-xl font-bold tracking-tight">CareerCraft AI</span>
        </Link>

        {/* Testimonial / value prop */}
        <div className="relative z-10 space-y-6">
          <blockquote className="text-2xl font-medium text-white leading-relaxed">
            "Land your dream job with an AI-crafted resume tailored to every application."
          </blockquote>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-brand-orange/20 flex items-center justify-center">
              <span className="text-brand-orange font-semibold text-sm">AI</span>
            </div>
            <div>
              <p className="text-white text-sm font-medium">CareerCraft AI</p>
              <p className="text-white/50 text-xs">Powered by Groq · Built for job seekers</p>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="relative z-10 grid grid-cols-3 gap-4">
          {[
            { value: '10x', label: 'Faster resumes' },
            { value: 'ATS', label: 'Optimized' },
            { value: '8+', label: 'Templates' },
          ].map(({ value, label }) => (
            <div key={label} className="bg-white/5 rounded-xl p-4">
              <p className="text-brand-orange text-2xl font-bold">{value}</p>
              <p className="text-white/60 text-xs mt-0.5">{label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ── Right form panel ── */}
      <div className="flex-1 flex flex-col justify-center px-6 py-12 sm:px-12 lg:px-16 bg-brand-bg">
        {/* Mobile logo */}
        <div className="lg:hidden mb-8">
          <Link to="/" className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-brand-orange rounded-xl flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <span className="text-brand-text text-lg font-bold">CareerCraft AI</span>
          </Link>
        </div>

        <motion.div
          className="w-full max-w-md mx-auto"
          {...fadeUp}
        >
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-brand-text">{title}</h1>
            {subtitle && <p className="mt-2 text-brand-muted text-sm">{subtitle}</p>}
          </div>
          {children}
        </motion.div>
      </div>
    </div>
  );
};

export default AuthLayout;
