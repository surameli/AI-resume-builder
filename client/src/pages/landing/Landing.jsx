/**
 * Public landing page — minimal for Phase 1, expanded in later phases.
 */
import { Link } from 'react-router-dom';
import { Sparkles, ArrowRight, FileText, BarChart2, MessageSquare } from 'lucide-react';

const Landing = () => (
  <div className="min-h-screen bg-brand-dark text-white">
    {/* Nav */}
    <nav className="flex items-center justify-between px-6 sm:px-12 py-5 border-b border-white/10">
      <div className="flex items-center gap-2.5">
        <div className="w-8 h-8 bg-brand-orange rounded-xl flex items-center justify-center">
          <Sparkles className="w-4 h-4 text-white" />
        </div>
        <span className="font-bold text-lg">CareerCraft AI</span>
      </div>
      <div className="flex items-center gap-3">
        <Link to="/login" className="text-white/70 hover:text-white text-sm transition-colors">
          Sign in
        </Link>
        <Link to="/register" className="btn-primary btn-sm">
          Get started free
        </Link>
      </div>
    </nav>

    {/* Hero */}
    <section className="flex flex-col items-center text-center px-6 pt-24 pb-20 max-w-4xl mx-auto">
      <div className="badge bg-brand-orange/20 text-brand-orange mb-6 text-sm px-4 py-1.5 rounded-full">
        Powered by Groq AI
      </div>
      <h1 className="text-5xl sm:text-6xl font-extrabold leading-tight tracking-tight mb-6">
        Build resumes that<br />
        <span className="text-brand-orange">land interviews</span>
      </h1>
      <p className="text-white/60 text-lg max-w-xl mb-10">
        CareerCraft AI tailors every resume to the exact job you're applying for —
        ATS-optimized, professionally written, and ready in minutes.
      </p>
      <div className="flex flex-wrap gap-3 justify-center">
        <Link to="/register" className="btn-primary btn-lg flex items-center gap-2">
          Build my resume <ArrowRight className="w-4 h-4" />
        </Link>
        <Link to="/login" className="btn-secondary btn-lg">
          Sign in
        </Link>
      </div>
    </section>

    {/* Features */}
    <section className="py-20 px-6 sm:px-12 max-w-6xl mx-auto">
      <h2 className="text-3xl font-bold text-center mb-12">
        Everything you need to get hired
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        {[
          { icon: FileText, title: 'AI Resume Builder', desc: 'Generate tailored resumes for each job using your real experience. No invented facts.' },
          { icon: BarChart2, title: 'ATS Checker',       desc: "Score your resume against the job description and fix what's missing before you apply." },
          { icon: MessageSquare, title: 'Career Assistant', desc: 'Chat with an AI that knows your profile and helps you prepare for interviews.' },
        ].map(({ icon: Icon, title, desc }) => (
          <div key={title} className="bg-white/5 rounded-2xl p-6 border border-white/10 hover:border-brand-orange/40 transition-colors">
            <div className="w-10 h-10 bg-brand-orange/15 rounded-xl flex items-center justify-center mb-4">
              <Icon className="w-5 h-5 text-brand-orange" />
            </div>
            <h3 className="font-semibold text-lg mb-2">{title}</h3>
            <p className="text-white/60 text-sm leading-relaxed">{desc}</p>
          </div>
        ))}
      </div>
    </section>

    {/* CTA */}
    <section className="py-20 px-6 text-center">
      <h2 className="text-3xl font-bold mb-4">Ready to start?</h2>
      <p className="text-white/60 mb-8">Free plan available. No credit card required.</p>
      <Link to="/register" className="btn-primary btn-lg">
        Create your free account
      </Link>
    </section>

    {/* Footer */}
    <footer className="border-t border-white/10 py-8 px-6 text-center text-white/40 text-sm">
      © {new Date().getFullYear()} CareerCraft AI. All rights reserved.
    </footer>
  </div>
);

export default Landing;
