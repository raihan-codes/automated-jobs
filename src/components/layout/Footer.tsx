'use client';

import React from 'react'
import Link from 'next/link'
import { Linkedin, Twitter, Github } from 'lucide-react'

export default function Footer() {
  return (
    <footer className="bg-ink-950 border-t border-white/5 pt-24 pb-8" id="contact">
      <div className="max-w-7xl mx-auto px-6 md:px-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12 md:gap-8 mb-24">
          
          {/* Col 1 */}
          <div className="col-span-1 border-r-0 md:border-r md:border-white/5 pr-8">
            <div className="group inline-block mb-6 relative" data-cursor="hover">
              <span className="font-display text-3xl font-bold tracking-tight text-white group-hover:text-signal transition-colors duration-500">Automated<span className="text-signal">Jobs</span></span>
              <div className="absolute top-1/2 left-full ml-4 opacity-0 group-hover:opacity-100 group-hover:translate-x-2 transition-all duration-300 text-mist-900 text-xs text-nowrap">
                AI-Powered Job Automation
              </div>
            </div>
            <p className="text-mist-900 text-sm mb-8 leading-relaxed max-w-xs">
              Discover. Match. Apply.<br/>Track. Automatically.
            </p>
            <div className="flex gap-4 text-mist-900">
              <a href="#" aria-label="LinkedIn" className="hover:text-white transition-colors p-2 -ml-2 rounded-full hover:bg-white/5"><Linkedin size={20} /></a>
              <a href="#" aria-label="Twitter" className="hover:text-white transition-colors p-2 rounded-full hover:bg-white/5"><Twitter size={20} /></a>
              <a href="#" aria-label="GitHub" className="hover:text-white transition-colors p-2 rounded-full hover:bg-white/5"><Github size={20} /></a>
            </div>
          </div>

          {/* Col 2 */}
          <div className="col-span-1">
            <h4 className="font-mono text-xs text-signal uppercase tracking-widest mb-6">Product</h4>
            <ul className="flex flex-col gap-4 text-sm text-mist-500">
              <li><Link href="/jobs" className="hover:text-white transition-colors" data-cursor="text">Find Jobs</Link></li>
              <li><Link href="/applications" className="hover:text-white transition-colors" data-cursor="text">Application Tracking</Link></li>
              <li><Link href="/resumes" className="hover:text-white transition-colors" data-cursor="text">Resume Studio</Link></li>
              <li><Link href="/upload" className="hover:text-white transition-colors" data-cursor="text">Upload Resume</Link></li>
              <li><Link href="/settings" className="hover:text-white transition-colors" data-cursor="text">Job Alerts & Sources</Link></li>
            </ul>
          </div>

          {/* Col 3 */}
          <div className="col-span-1">
            <h4 className="font-mono text-xs text-signal uppercase tracking-widest mb-6">Platform</h4>
            <ul className="flex flex-col gap-4 text-sm text-mist-500">
              <li><a href="#features" className="hover:text-white transition-colors" data-cursor="text">AI Job Matching</a></li>
              <li><a href="#how-it-works" className="hover:text-white transition-colors" data-cursor="text">How It Works</a></li>
              <li><a href="#pricing" className="hover:text-white transition-colors" data-cursor="text">Pricing</a></li>
              <li><a href="#faq" className="hover:text-white transition-colors" data-cursor="text">FAQ</a></li>
              <li><a href="#blog" className="hover:text-white transition-colors" data-cursor="text">Job Search Playbook</a></li>
            </ul>
          </div>

          {/* Col 4 */}
          <div className="col-span-1">
            <h4 className="font-mono text-xs text-signal uppercase tracking-widest mb-6">Contact</h4>
            <div className="flex flex-col gap-4 text-sm text-mist-500">
              <a href="mailto:hello@automatedjobs.app" className="hover:text-white transition-colors" data-cursor="hover">hello@automatedjobs.app</a>
              <p className="mt-4 text-mist-700 leading-relaxed">
                Automated Jobs HQ<br/>
                Bengaluru, India
              </p>
              <a href="#cta" className="text-signal hover:underline mt-2 inline-block" data-cursor="hover">Get Started Free →</a>
            </div>
          </div>

        </div>

        {/* Bottom Bar */}
        <div className="border-t border-white/5 pt-8 flex flex-col md:flex-row justify-between items-center gap-4 text-xs font-mono text-mist-900">
          <p>© <span className="cursor-help hover:text-signal transition-colors">2026</span> Automated Jobs. All rights reserved.</p>
          <p>Built for job seekers <span className="text-ember">♥</span> everywhere</p>
          <div className="flex gap-4">
            <a href="#" className="hover:text-white">Privacy Policy</a>
            <span>·</span>
            <a href="#" className="hover:text-white">Terms</a>
            <span>·</span>
            <Link href="/jobs" className="hover:text-white">Dashboard</Link>
          </div>
        </div>
      </div>
    </footer>
  )
}
