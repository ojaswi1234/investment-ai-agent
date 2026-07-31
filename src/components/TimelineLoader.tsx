'use client';

import { useEffect, useState } from 'react';
import { Globe, BarChart3, Users, MessageCircle, ShieldAlert, Sparkles, Check } from 'lucide-react';
import { motion } from 'framer-motion';

const steps = [
  { id: 'web-search', label: 'Web Intelligence', description: 'Scraping latest news, SEC filings, and market data...', icon: Globe, duration: 1500 },
  { id: 'financial-model', label: 'Financial Modeling', description: 'Analyzing P/E ratios, revenue trends, debt-to-equity...', icon: BarChart3, duration: 2000 },
  { id: 'peer-analysis', label: 'Peer Benchmarking', description: 'Comparing against industry competitors...', icon: Users, duration: 1200 },
  { id: 'sentiment-scan', label: 'Sentiment Analysis', description: 'Processing news sentiment and social signals...', icon: MessageCircle, duration: 1000 },
  { id: 'risk-matrix', label: 'Risk Assessment', description: 'Building probability-impact risk matrix...', icon: ShieldAlert, duration: 1500 },
  { id: 'final-synthesis', label: 'Synthesis', description: 'Generating investment thesis and confidence score...', icon: Sparkles, duration: 1800 },
  { id: 'complete', label: 'Finalizing', description: 'Preparing dashboard...', icon: Check, duration: 500 },
];

export default function TimelineLoader({ activeFlag }: { activeFlag: string }) {
  const currentStepIndex = Math.max(0, steps.findIndex(s => s.id === activeFlag));
  const [activeStepIndex, setActiveStepIndex] = useState(0);

  useEffect(() => {
    // Only move forward, and catch up smoothly if skipping steps
    if (currentStepIndex > activeStepIndex) {
      const interval = setInterval(() => {
        setActiveStepIndex(prev => {
          if (prev >= currentStepIndex) {
            clearInterval(interval);
            return prev;
          }
          return prev + 1;
        });
      }, 300); // 300ms smooth transition between skipped steps
      return () => clearInterval(interval);
    }
  }, [currentStepIndex, activeStepIndex]);

  const progress = Math.min((activeStepIndex / (steps.length - 1)) * 100, 100);

  return (
    <div className="w-full max-w-md mx-auto glass-panel p-6 sm:p-8 rounded-2xl relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/10 to-emerald-500/10 pointer-events-none" />
      
      <h3 className="text-xl font-bold mb-6 text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-emerald-400">
        AI Analysis in Progress
      </h3>

      <div className="relative pl-6 space-y-6">
        {/* Connecting line */}
        <div className="absolute left-[23px] top-2 bottom-2 w-0.5 bg-white/10 rounded-full" />
        <motion.div 
          className="absolute left-[23px] top-2 w-0.5 bg-gradient-to-b from-indigo-500 to-emerald-500 rounded-full"
          initial={{ height: '0%' }}
          animate={{ height: `${progress}%` }}
          transition={{ duration: 0.5 }}
        />

        {steps.map((step, index) => {
          const isActive = index === activeStepIndex;
          const isPast = index < activeStepIndex;
          const Icon = step.icon;

          return (
            <div key={step.id} className="relative z-10 flex gap-4">
              <div className="relative shrink-0">
                {isPast ? (
                  <div className="w-6 h-6 -ml-3 rounded-full bg-emerald-500/20 border border-emerald-500/50 flex items-center justify-center text-emerald-400 shadow-[0_0_10px_rgba(16,185,129,0.3)]">
                    <Check size={12} />
                  </div>
                ) : isActive ? (
                  <div className="w-6 h-6 -ml-3 rounded-full bg-indigo-500 flex items-center justify-center text-white shadow-[0_0_15px_rgba(99,102,241,0.6)] animate-pulse">
                    <Icon size={12} />
                  </div>
                ) : (
                  <div className="w-6 h-6 -ml-3 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-slate-500">
                    <Icon size={12} />
                  </div>
                )}
              </div>
              
              <div className={`flex-1 pb-2 ${isPast ? 'opacity-50' : isActive ? 'opacity-100' : 'opacity-40'}`}>
                <div className={`font-semibold text-sm ${isActive ? 'text-indigo-300' : isPast ? 'text-slate-300 line-through' : 'text-slate-400'}`}>
                  {step.label}
                </div>
                <div className="text-xs text-slate-400 mt-1">
                  {step.description}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-8">
        <div className="flex justify-between text-xs text-slate-400 mb-2">
          <span>Overall Progress</span>
          <span>{Math.round(progress)}%</span>
        </div>
        <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
          <motion.div 
            className="h-full bg-gradient-to-r from-indigo-500 to-emerald-500"
            initial={{ width: '0%' }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.3 }}
          />
        </div>
      </div>
    </div>
  );
}
