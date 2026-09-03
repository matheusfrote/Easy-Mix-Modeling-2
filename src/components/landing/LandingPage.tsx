import React, { useState } from 'react';
import { LandingNavbar } from './LandingNavbar';
import { HeroSection } from './HeroSection';
import { ProblemSolutionSection } from './ProblemSolutionSection';
import { FeaturesSection } from './FeaturesSection';
import { HowItWorksSection } from './HowItWorksSection';
import { SocialProofSection } from './SocialProofSection';
import { FaqSection } from './FaqSection';
import { LandingFooter } from './LandingFooter';
import { AuthModal } from '../auth/AuthModal';
import { useAuth } from '../../context/AuthContext';

interface LandingPageProps {
  onEnterWorkspace: () => void;
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({
  onEnterWorkspace,
  theme,
  onToggleTheme
}) => {
  const { isAuthenticated } = useAuth();
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'register'>('register');

  const handleOpenLogin = () => {
    onEnterWorkspace();
  };

  const handleOpenRegister = () => {
    onEnterWorkspace();
  };

  const handleExploreDemo = () => {
    onEnterWorkspace();
  };

  return (
    <div className="min-h-screen bg-white dark:bg-slate-950 text-slate-900 dark:text-white selection:bg-blue-600 selection:text-white transition-colors">
      {/* Navigation */}
      <LandingNavbar
        onOpenLogin={handleOpenLogin}
        onOpenRegister={handleOpenRegister}
        onEnterApp={onEnterWorkspace}
        theme={theme}
        onToggleTheme={onToggleTheme}
      />

      {/* Hero Section */}
      <HeroSection
        onOpenRegister={handleOpenRegister}
        onOpenLogin={handleOpenLogin}
        onExploreDemo={handleExploreDemo}
      />

      {/* Problem vs Solution */}
      <ProblemSolutionSection onOpenRegister={handleOpenRegister} />

      {/* Features & Capabilities */}
      <FeaturesSection
        onOpenRegister={handleOpenRegister}
        onExploreDemo={handleExploreDemo}
      />

      {/* How it works */}
      <HowItWorksSection
        onOpenRegister={handleOpenRegister}
        onExploreDemo={handleExploreDemo}
      />

      {/* Social Proof & Credibility */}
      <SocialProofSection />

      {/* FAQ */}
      <FaqSection />

      {/* Footer */}
      <LandingFooter />

      {/* Auth Modal */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        initialMode={authMode}
        onSuccess={() => {
          setIsAuthModalOpen(false);
          onEnterWorkspace();
        }}
      />
    </div>
  );
};

export default LandingPage;
