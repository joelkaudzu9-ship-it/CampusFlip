import React from 'react';
import { motion } from 'framer-motion';

const pageVariants = {
  initial: { opacity: 0, x: '100%' }, 
  animate: { 
    opacity: 1, 
    x: 0,
    transition: { type: 'spring', stiffness: 300, damping: 30 }
  },
  exit: { 
    opacity: 0, 
    x: '100%', 
    transition: { duration: 0.25, ease: 'easeInOut' }
  }
};

export default function PageTransition({ children, onBack }) {
  return (
    <motion.div
      variants={pageVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      drag="x"
      dragConstraints={{ left: 0, right: 0 }}
      dragElastic={0.2}
      onDragEnd={(event, info) => {
        // If the user swipes right more than 100px, go back
        if (info.offset.x > 100 && onBack) {
          onBack();
        }
      }}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1500, // Sits above the main sticky header (z-index: 1200)
        overflowY: 'auto',
        background: '#f5f8fd',
        willChange: 'transform, opacity',
        touchAction: 'pan-y' // Allows vertical scroll but catches horizontal swipes
      }}
    >
      {children}
    </motion.div>
  );
}