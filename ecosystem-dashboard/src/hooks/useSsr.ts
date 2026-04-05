import { useState, useEffect } from 'react';

/**
 * Custom hook to determine if the component is being rendered on the server or the client.
 * This helps prevent SSR issues with browser-only APIs or logic.
 * 
 * @returns {boolean} `true` if rendering on the server, `false` if on the client.
 */
export function useSsr() {
  const [isSsr, setIsSsr] = useState(true);

  useEffect(() => {
    setIsSsr(false);
  }, []);

  return isSsr;
}
