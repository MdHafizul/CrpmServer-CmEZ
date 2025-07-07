'use client';

import { useEffect, useState } from 'react';

export default function Snackbar({ message, type, onClose }) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (message) {
      setIsVisible(true);
      const timer = setTimeout(() => {
        setIsVisible(false);
        const closeTimer = setTimeout(onClose, 300); // Allow time for exit animation
        return () => clearTimeout(closeTimer);
      }, 3000); // Auto-close after 3 seconds

      return () => clearTimeout(timer);
    }
  }, [message, onClose]);

  if (!message) return null;

  return (
    <div className="fixed bottom-4 left-0 right-0 flex items-center justify-center z-50">
      <div 
        className={`
          transition-all duration-300 ease-in-out transform 
          ${isVisible 
            ? 'translate-y-0 opacity-100' 
            : 'translate-y-full opacity-0'}
          px-6 py-4 
          max-w-md w-full 
          rounded-xl shadow-2xl 
          flex items-center justify-between 
          ${type === 'success' 
            ? 'bg-gradient-to-r from-green-500 to-green-600' 
            : type === 'error' 
            ? 'bg-gradient-to-r from-red-500 to-red-600' 
            : 'bg-gray-500'}
          text-white
        `}
      >
        <div className="flex items-center">
          {/* Icon placeholder - you could replace with actual icons */}
          <div className="mr-4">
            {type === 'success' ? (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            ) : type === 'error' ? (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            ) : null}
          </div>
          
          <p className="text-base font-medium">{message}</p>
        </div>
        
        <button
          onClick={() => {
            setIsVisible(false);
            setTimeout(onClose, 300);
          }}
          className="ml-4 p-2 hover:bg-white/20 rounded-full transition-colors duration-200"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
          </svg>
        </button>
      </div>
    </div>
  );
}