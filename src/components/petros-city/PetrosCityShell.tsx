import React from 'react';
import { LayaGenerativeExperience } from './LayaGenerativeExperience';

interface Props {
  onToggleLegacy?: () => void;
  language?: string;
  onLanguageChange?: (lang: string) => void;
  walletSession?: { sessionId: string; walletAddress: string; projectSlug: string } | null;
  onLogout?: () => void;
}

export type CityRoom =
  | 'welcome'
  | 'engineering'
  | 'control'
  | 'laboratory'
  | 'agency'
  | 'commerce'
  | 'studio'
  | 'flow';

export function PetrosCityShell({
  onToggleLegacy,
  language = 'fa',
  onLanguageChange,
  walletSession,
  onLogout,
}: Props) {
  // Mount the generative conversation-first 3D world experience
  return (
    <LayaGenerativeExperience
      language={language}
      onLanguageChange={onLanguageChange}
      walletSession={walletSession}
      onLogout={onLogout}
      onToggleLegacy={onToggleLegacy}
    />
  );
}
