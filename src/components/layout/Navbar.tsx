'use client';

import React, { useState } from 'react'
import Link from 'next/link'
import { motion, AnimatePresence, useScroll, useMotionValueEvent } from 'framer-motion'
import MagneticButton from '../ui/MagneticButton'
import { useAuth } from '@/lib/firebase/AuthContext'
import { Menu, X, Linkedin, Twitter, Github } from 'lucide-react'

import { useRouter } from 'next/navigation'

export default function Navbar() {
  const router = useRouter()
  const [scrolled, setScrolled] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const { scrollY } = useScroll()
  const { user, openAuthModal } = useAuth()

  useMotionValueEvent(scrollY, "change", (latest) => {
    setScrolled(latest > 80)
  })

  const navLinks = ['Features', 'How It Works', 'Stories', 'Pricing', 'FAQ']
  const socials = [<Linkedin key="ln" size={20} />, <Twitter key="tw" size={20} />, <Github key="gh" size={20} />]

  const handleStartProjectClick = () => {
    if (user) {
      router.push('/jobs')
    } else {
      const input = document.getElementById('start-project-input') as HTMLInputElement | null
      if (input) {
        input.focus()
        input.scrollIntoView({ behavior: 'smooth', block: 'center' })
      } else {
        openAuthModal('SIGNUP')
      }
    }
  }

  return (
    <>
      <header 
        className={`fixed top-0 inset-x-0 z-50 transition-all duration-500 ${
          scrolled ? 'backdrop-blur-xl bg-ink-950/80 border-b border-white/5 py-4' : 'bg-transparent py-6'
        }`}
      >
        <div className="max-w-7xl mx-auto px-6 md:px-12 flex justify-between items-center">
          
          <div 
            className="flex items-center gap-2 cursor-pointer z-50"
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          >
            <span className="font-display text-2xl font-bold tracking-tight text-white">Automated<span className="text-signal">Jobs</span></span>
            <div className="w-2 h-2 rounded-full bg-signal animate-pulse-slow"></div>
          </div>

          <nav className="hidden md:flex items-center gap-8">
            {navLinks.map((link) => (
              <a 
                key={link} 
                href={`#${link.toLowerCase().replace(/\s+/g, '-')}`}
                className="font-body text-sm text-mist-900 hover:text-white transition-colors relative group"
                data-cursor="hover"
              >
                {link}
                <span className="absolute -bottom-1 left-0 h-[1px] bg-signal w-0 group-hover:w-full transition-all duration-300"></span>
              </a>
            ))}
          </nav>

          <div className="hidden md:flex items-center gap-4">
            {user ? (
              <MagneticButton 
                className="px-6 py-2.5 rounded-full bg-signal text-ink-950 text-sm font-medium hover:shadow-[0_0_20px_rgba(232,255,71,0.3)] transition-all cursor-pointer"
                data-cursor="hover"
                onClick={() => router.push('/jobs')}
              >
                Open Dashboard
              </MagneticButton>
            ) : (
              <>
                <button
                  onClick={() => openAuthModal('SIGNIN')}
                  className="font-body text-sm text-mist-900 hover:text-white transition-colors cursor-pointer"
                  data-cursor="hover"
                >
                  Sign In
                </button>
                <MagneticButton 
                  className="px-6 py-2.5 rounded-full bg-signal text-ink-950 text-sm font-medium hover:shadow-[0_0_20px_rgba(232,255,71,0.3)] transition-all cursor-pointer"
                  data-cursor="hover"
                  onClick={handleStartProjectClick}
                >
                  Start a Project
                </MagneticButton>
              </>
            )}
          </div>

          <button 
            className="md:hidden z-50 text-white p-2"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle navigation menu"
          >
            {mobileMenuOpen ? <X size={28} /> : <Menu size={28} />}
          </button>
        </div>
      </header>

      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-ink-900 z-40 flex flex-col justify-center px-6"
          >
            <nav className="flex flex-col gap-6 mt-20">
              {navLinks.map((link, i) => (
                <motion.a
                  key={link}
                  href={`#${link.toLowerCase().replace(/\s+/g, '-')}`}
                  initial={{ x: -60, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ delay: i * 0.07, duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] }}
                  className="font-display text-5xl sm:text-6xl text-white hover:text-signal transition-colors"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  {link}
                </motion.a>
              ))}
              <motion.div
                initial={{ x: -60, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ delay: navLinks.length * 0.07, duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] }}
                className="flex flex-col gap-4 pt-6 border-t border-white/10 mt-4"
              >
                {user ? (
                  <Link
                    href="/jobs"
                    onClick={() => setMobileMenuOpen(false)}
                    className="font-display text-3xl text-signal hover:text-white transition-colors"
                  >
                    Open Dashboard →
                  </Link>
                ) : (
                  <>
                    <button
                      onClick={() => { setMobileMenuOpen(false); openAuthModal('SIGNIN') }}
                      className="font-display text-3xl text-mist-500 hover:text-white transition-colors text-left"
                    >
                      Sign In
                    </button>
                    <button
                      onClick={() => { setMobileMenuOpen(false); openAuthModal('SIGNUP') }}
                      className="font-display text-3xl text-signal hover:text-white transition-colors text-left"
                    >
                      Get Started Free →
                    </button>
                  </>
                )}
              </motion.div>
            </nav>
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              transition={{ delay: 0.5 }}
              className="absolute bottom-12 left-6 flex gap-6 text-mist-900"
            >
              {socials.map((icon, i) => (
                <a key={i} href="#" className="hover:text-white">{icon}</a>
              ))}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
