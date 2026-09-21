'use client';

import React from 'react'
import { motion } from 'framer-motion'
import ScrollReveal from '../ui/ScrollReveal'

export default function TechStack() {
  const stack = [
    { cat: 'Job Sources', items: ['Greenhouse', 'Lever', 'Ashby', 'Workable', 'LinkedIn', 'Indeed'] },
    { cat: 'Early Careers', items: ['Internshala', 'Handshake', 'Wellfound', 'Career Pages'] },
    { cat: 'AI Engine', items: ['JD Analyzer', 'AI Matching', 'Resume Generator', 'Truthfulness Validator'] },
    { cat: 'Automation', items: ['Form Prefill', 'Field Classifier', 'Playwright Worker', 'Queue Manager'] },
    { cat: 'Platform', items: ['Next.js', 'Firebase', 'Prisma', 'Firestore'] }
  ]

  return (
    <section className="bg-ink-900 py-32 border-t border-b border-white/5">
      <div className="max-w-7xl mx-auto px-6 md:px-12">
        <ScrollReveal className="mb-20">
          <h2 className="font-display text-4xl md:text-5xl font-bold tracking-tight">Under the hood.</h2>
        </ScrollReveal>

        <div className="grid grid-cols-1 md:grid-cols-5 gap-12 md:gap-8">
          {stack.map((category) => (
            <div key={category.cat} className="flex flex-col">
              <h3 className="font-mono text-xs text-signal uppercase tracking-widest mb-6 border-b border-white/5 pb-4">
                {category.cat}
              </h3>
              <div className="flex flex-wrap gap-2">
                {category.items.map((tech) => (
                  <motion.div
                    key={tech}
                    whileHover={{ scale: 1.05, backgroundColor: '#e8ff47', color: '#04040a', borderColor: '#e8ff47' }}
                    className="font-mono text-xs md:text-sm px-4 py-2 rounded-full border border-white/10 text-mist-500 cursor-default transition-colors"
                  >
                    {tech}
                  </motion.div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
