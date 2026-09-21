'use client';

import React from 'react'
import { motion } from 'framer-motion'

export default function StorySection() {
  const chapters = [
    {
      num: '01',
      title: 'The job hunt is a part-time job nobody pays you for.',
      p1: 'Trawling five job boards, rewriting your resume for every posting, copying the same answers into the same forms. The average job seeker spends 11 hours a week on work that a machine could do better.',
      p2: 'Meanwhile, the best roles are filled in days. Every hour spent copy-pasting is an hour the right opportunity slips further away.',
      align: 'left'
    },
    {
      num: '02',
      title: 'We believe applying to jobs should be as smart as the work you do.',
      p1: 'Your profile already knows your skills. The job description already says what it needs. Matching the two — honestly, precisely, and at scale — is a solved problem waiting for the right platform.',
      p2: 'Automation should amplify you, not impersonate you. Every generated resume and answer should be something you review, stand behind, and approve.',
      align: 'right'
    },
    {
      num: '03',
      title: 'So we built Automated Jobs.',
      p1: 'One workspace that discovers roles everywhere, scores them against your resume, tailors ATS-ready documents, pre-fills applications, and tracks every status — with a human approval gate on every send.',
      p2: 'From discovery to offer, your entire job-search workflow lives in one place. You make the decisions. We do the busywork.',
      align: 'center'
    }
  ]

  const Art01 = () => (
    <div className="relative w-full aspect-square md:aspect-[4/3] flex items-center justify-center pointer-events-none">
      <div className="absolute w-64 h-64 bg-signal mix-blend-difference rounded-full blur-2xl opacity-40 animate-pulse-slow"></div>
      <div className="absolute w-40 h-40 bg-ember rounded-tr-full rounded-bl-full rotate-45 transform mix-blend-overlay"></div>
      <div className="absolute w-48 h-48 bg-ink-600 rounded-sm clip-diagonal"></div>
      <div className="absolute inset-0 border-[1px] border-white/10" style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.05) 1px, transparent 1px)', backgroundSize: '40px 40px'}}></div>
    </div>
  )

  const Art02 = () => (
    <div className="relative w-full aspect-square md:aspect-[4/3] flex items-center justify-center pointer-events-none group">
      <div className="w-1 h-3/4 bg-white/20 mx-4"></div>
      <div className="w-16 h-1/2 bg-signal/80 mx-4 transition-transform group-hover:scale-y-110"></div>
      <div className="w-1 h-2/3 bg-white/20 mx-4"></div>
      <div className="w-1 h-1/4 bg-white/10 mx-4"></div>
      <div className="w-8 h-8 bg-ember rounded-full mx-4 absolute right-1/4 top-1/4 animate-bounce"></div>
    </div>
  )

  return (
    <section className="bg-ink-950 py-32 md:py-48 relative overflow-hidden text-mist-100" id="about">
      <div className="max-w-7xl mx-auto px-6 md:px-12 flex flex-col pt-12">
        {chapters.map((chapter, i) => (
          <div key={i} className="mb-24 md:mb-48 relative last:mb-0">
            <motion.div
              initial={{ opacity: 0, y: 80 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-100px' }}
              transition={{ duration: 0.9, ease: [0.25, 0.46, 0.45, 0.94] }}
              className={`grid grid-cols-1 md:grid-cols-2 gap-16 md:gap-24 items-center ${chapter.align === 'right' ? 'md:flex-row-reverse' : ''} ${chapter.align === 'center' ? 'md:grid-cols-1 md:w-3/4 mx-auto text-center' : ''}`}
            >
              
              {/* Text Side */}
              <div className={`relative z-10 ${chapter.align === 'right' ? 'md:col-start-2 md:row-start-1' : ''}`}>
                <div className="absolute -top-16 md:-top-32 -left-8 md:-left-16 font-display text-[15rem] md:text-[20rem] text-white/[0.02] leading-none select-none pointer-events-none font-bold">
                  {chapter.num}
                </div>
                
                <h2 className="font-display text-4xl md:text-5xl lg:text-6xl font-medium tracking-tight leading-tight mb-8">
                  {chapter.title}
                </h2>
                
                <div className={`flex flex-col gap-6 text-mist-900 text-lg leading-relaxed ${chapter.align === 'center' ? 'items-center' : ''}`}>
                  <p>{chapter.p1}</p>
                  <p>{chapter.p2}</p>
                </div>

                {chapter.align === 'center' && (
                  <div className="mt-12">
                    <a href="#features" className="inline-flex items-center gap-2 font-mono text-sm uppercase tracking-widest text-signal hover:text-white transition-colors" data-cursor="hover">
                      Explore the platform →
                    </a>
                  </div>
                )}
              </div>

              {/* Visual Side */}
              {chapter.align !== 'center' && (
                <div className={`relative z-0 ${chapter.align === 'right' ? 'md:col-start-1 md:row-start-1' : ''}`}>
                  {i === 0 ? <Art01 /> : <Art02 />}
                </div>
              )}

            </motion.div>

            {/* Chapter dividers */}
            {i < chapters.length - 1 && (
              <div className="my-24 md:my-48 relative flex justify-center items-center">
                <hr className="w-full border-white/5 absolute" />
                <span className="bg-ink-950 px-4 font-mono text-xs text-white/20 relative">Chapter {chapters[i+1].num}</span>
              </div>
            )}
          </div>
        ))}
      </div>
    </section>
  )
}
