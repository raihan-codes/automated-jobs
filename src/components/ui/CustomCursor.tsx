'use client';

import { motion, useMotionValue, useSpring } from 'framer-motion'
import { useState, useEffect } from 'react'

export default function CustomCursor() {
  const [cursorState, setCursorState] = useState<string>('default') // 'default'|'hover'|'text'|'view'
  const [mounted, setMounted] = useState(false)
  
  const mouseX = useMotionValue(-100)
  const mouseY = useMotionValue(-100)
  
  // Outer trail
  const trailX = useSpring(mouseX, { stiffness: 150, damping: 25 })
  const trailY = useSpring(mouseY, { stiffness: 150, damping: 25 })
  
  // Inner dot
  const springX = useSpring(mouseX, { stiffness: 500, damping: 40 })
  const springY = useSpring(mouseY, { stiffness: 500, damping: 40 })

  useEffect(() => {
    setMounted(true)
    // Only the marketing landing renders the custom cursor — mark the body
    // so globals.css hides the native cursor there (and only there).
    document.body.classList.add('landing-page')
    const onMouseMove = (e: MouseEvent) => {
      mouseX.set(e.clientX)
      mouseY.set(e.clientY)
    }
    window.addEventListener('mousemove', onMouseMove)
    return () => {
      window.removeEventListener('mousemove', onMouseMove)
      document.body.classList.remove('landing-page')
    }
  }, [mouseX, mouseY])

  useEffect(() => {
    const handleMouseOver = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null
      const el = target?.closest?.('[data-cursor]')
      if (el) {
        setCursorState(el.getAttribute('data-cursor') || 'default')
      }
    }
    const handleMouseOut = (e: MouseEvent) => {
      const related = e.relatedTarget as HTMLElement | null
      // Only reset if we are not moving into another data-cursor element
      if (related && related.closest && related.closest('[data-cursor]')) {
        return;
      }
      setCursorState('default')
    }
    
    document.addEventListener('mouseover', handleMouseOver)
    document.addEventListener('mouseout', handleMouseOut)
    
    return () => {
      document.removeEventListener('mouseover', handleMouseOver)
      document.removeEventListener('mouseout', handleMouseOut)
    }
  }, [])

  if (!mounted) return null

  // Variants for the inner tracker (usually text or specific shape)
  const variants = {
    default: {
      width: 12,
      height: 12,
      x: "-50%",
      y: "-50%",
      borderRadius: "50%",
      backgroundColor: "#ffffff",
      opacity: 1
    },
    hover: {
      width: 48,
      height: 48,
      x: "-50%",
      y: "-50%",
      borderRadius: "50%",
      backgroundColor: "#ffffff",
      opacity: 1
    },
    text: {
      width: 4,
      height: 24,
      x: "-2px",
      y: "-12px",
      borderRadius: "2px",
      backgroundColor: "#ffffff",
      opacity: 1
    },
    view: {
      width: 64,
      height: 64,
      x: "-50%",
      y: "-50%",
      borderRadius: "50%",
      backgroundColor: "transparent",
      border: "1px solid #ffffff",
      opacity: 1
    }
  }

  // Define trailing ring states
  const trailingVariants = {
    default: {
      width: 32,
      height: 32,
      opacity: 0.3,
      border: "1px solid #ffffff",
      backgroundColor: "transparent"
    },
    hover: { opacity: 0 },
    text: { opacity: 0 },
    view: { opacity: 0 }
  }

  return (
    <>
      <motion.div
        className="fixed top-0 left-0 z-[9999] pointer-events-none flex justify-center items-center text-ink-950 font-mono text-[10px] tracking-widest font-bold overflow-hidden"
        style={{
          x: springX,
          y: springY,
          mixBlendMode: 'difference'
        }}
        variants={variants}
        animate={cursorState}
        transition={{ type: "spring", stiffness: 400, damping: 28 }}
      >
        {cursorState === 'hover' && "CLICK"}
        {cursorState === 'view' && "VIEW"}
      </motion.div>

      <motion.div
        className="fixed top-0 left-0 z-[9998] pointer-events-none rounded-full flex justify-center items-center"
        style={{
          x: trailX,
          y: trailY,
          transform: "translate(-50%, -50%)",
          mixBlendMode: 'difference'
        }}
        variants={trailingVariants}
        animate={cursorState}
        transition={{ duration: 0.2 }}
      />
    </>
  )
}
