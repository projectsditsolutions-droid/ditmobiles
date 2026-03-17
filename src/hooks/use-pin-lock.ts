import { useState, useCallback } from 'react';
import { verifyPIN } from '@/lib/store';

export function usePinLock() {
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [showPinModal, setShowPinModal] = useState(false);
  const [pendingModule, setPendingModule] = useState<string | null>(null);
  const [attempts, setAttempts] = useState(0);
  const [locked, setLocked] = useState(false);

  const requestAccess = useCallback((module: string) => {
    if (isUnlocked) return true;
    setPendingModule(module);
    setShowPinModal(true);
    return false;
  }, [isUnlocked]);

  const submitPin = useCallback((pin: string): boolean => {
    if (locked) return false;
    if (verifyPIN(pin)) {
      setIsUnlocked(true);
      setShowPinModal(false);
      setAttempts(0);
      return true;
    }
    const newAttempts = attempts + 1;
    setAttempts(newAttempts);
    if (newAttempts >= 3) {
      setLocked(true);
      setTimeout(() => { setLocked(false); setAttempts(0); }, 30000);
    }
    return false;
  }, [attempts, locked]);

  const lockSession = useCallback(() => {
    setIsUnlocked(false);
  }, []);

  return {
    isUnlocked,
    showPinModal,
    setShowPinModal,
    pendingModule,
    attempts,
    locked,
    requestAccess,
    submitPin,
    lockSession,
  };
}
