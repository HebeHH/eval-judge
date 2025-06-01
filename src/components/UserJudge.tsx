'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';

// Import Test interface from the API route
interface Test {
  id: number;
  text: string;
}

// Create and export the UserTestJudgement interface
export interface UserTestJudgement {
  testAid: number;
  testBid: number;
  judgement: number;
}

interface UserJudgeProps {
  tests: Test[];
  criteria: string;
  onComplete: (judgements: UserTestJudgement[]) => void;
  isOpen: boolean;
  className?: string; // Allow custom styling
}

export default function UserJudge({ tests, criteria, onComplete, isOpen, className = "" }: UserJudgeProps) {
  const [currentPairIndex, setCurrentPairIndex] = useState(0);
  const [judgements, setJudgements] = useState<UserTestJudgement[]>([]);
  const [currentJudgement, setCurrentJudgement] = useState<number>(0);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Generate all combinations of test pairs and randomize order
  const testPairs = useMemo(() => {
    const pairs: Array<[Test, Test]> = [];
    
    // Generate all combinations (not permutations) of 2 tests
    for (let i = 0; i < tests.length; i++) {
      for (let j = i + 1; j < tests.length; j++) {
        pairs.push([tests[i], tests[j]]);
      }
    }
    
    // Randomize order
    return pairs.sort(() => Math.random() - 0.5);
  }, [tests]);

  const currentPair = testPairs[currentPairIndex];
  const isLastPair = currentPairIndex >= testPairs.length - 1;

  // Reset state when component opens
  useEffect(() => {
    if (isOpen) {
      setCurrentPairIndex(0);
      setJudgements([]);
      setCurrentJudgement(0);
    }
  }, [isOpen]);

  // Return judgements when component closes or completes
  useEffect(() => {
    if (!isOpen && judgements.length > 0) {
      onComplete(judgements);
    }
  }, [isOpen, judgements, onComplete]);

  const handleSliderChange = (value: number) => {
    setCurrentJudgement(value);
  };

  const handleSliderMouseDown = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
  };

  const handleSliderMouseUp = () => {
    // Auto-advance after a short delay to ensure the user has finished adjusting
    timeoutRef.current = setTimeout(() => {
      handleNext();
    }, 300);
  };

  const handleNext = () => {
    if (!currentPair) return;

    // Clear any pending timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }

    const newJudgement: UserTestJudgement = {
      testAid: currentPair[0].id,
      testBid: currentPair[1].id,
      judgement: currentJudgement
    };

    const updatedJudgements = [...judgements, newJudgement];
    setJudgements(updatedJudgements);

    if (isLastPair) {
      // Complete the process
      onComplete(updatedJudgements);
    } else {
      // Move to next pair
      setCurrentPairIndex(prev => prev + 1);
      setCurrentJudgement(0);
    }
  };

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const getSliderLabel = (value: number): string => {
    switch (value) {
      case -1: return `A much more ${criteria}`;
      case -0.5: return `A more ${criteria}`;
      case 0: return 'Equal';
      case 0.5: return `B more ${criteria}`;
      case 1: return `B much more ${criteria}`;
      default: return 'Equal';
    }
  };

  if (!isOpen || !currentPair) {
    return null;
  }

  const progress = ((currentPairIndex + 1) / testPairs.length) * 100;

  return (
    <div className={`w-full bg-white rounded-lg border border-gray-200 overflow-hidden ${className}`} style={{ boxShadow: '0 4px 20px rgba(0,0,0,0.08)' }}>
      {/* Header */}
      <div className="text-white p-6" style={{ backgroundColor: '#8b4513' }}>
        <h2 className="text-xl font-semibold text-center mb-3" style={{ fontFamily: 'var(--font-playfair)' }}>
          Which output is more {criteria}?
        </h2>
        <div className="flex justify-between items-center opacity-90 mb-3" style={{ fontFamily: 'var(--font-crimson)' }}>
          <span>Comparison {currentPairIndex + 1} of {testPairs.length}</span>
          <span>{Math.round(progress)}% complete</span>
        </div>
        {/* Progress bar */}
        <div className="bg-amber-200 rounded-full h-2 border border-amber-300">
          <div 
            className="h-2 rounded-full transition-all duration-300"
            style={{ 
              backgroundColor: '#d2691e',
              width: `${progress}%` 
            }}
          />
        </div>
      </div>

      {/* Test comparison cards */}
      <div className="p-8">
        <div className="grid grid-cols-2 gap-8 mb-8">
          {/* Test A */}
          <div className="bg-amber-50 rounded-md p-6 border border-amber-200 flex flex-col">
            <div className="text-white text-center py-2 px-4 rounded-md mb-4 font-semibold" style={{ backgroundColor: '#8b4513', fontFamily: 'var(--font-playfair)' }}>
              Option A
            </div>
            <div className="flex-1 min-h-[200px] overflow-y-auto">
              <p className="leading-relaxed" style={{ fontFamily: 'var(--font-crimson)', color: '#2c1810', textAlign: 'justify' }}>
                {currentPair[0].text}
              </p>
            </div>
          </div>

          {/* Test B */}
          <div className="bg-amber-50 rounded-md p-6 border border-amber-200 flex flex-col">
            <div className="text-white text-center py-2 px-4 rounded-md mb-4 font-semibold" style={{ backgroundColor: '#8b4513', fontFamily: 'var(--font-playfair)' }}>
              Option B
            </div>
            <div className="flex-1 min-h-[200px] overflow-y-auto">
              <p className="leading-relaxed" style={{ fontFamily: 'var(--font-crimson)', color: '#2c1810', textAlign: 'justify' }}>
                {currentPair[1].text}
              </p>
            </div>
          </div>
        </div>

        {/* Slider section */}
        <div className="flex flex-col items-center space-y-6">
          <div className="w-full max-w-4xl">
            {/* Slider */}
            <div className="relative">
              <input
                type="range"
                min="-1"
                max="1"
                step="0.1"
                value={currentJudgement}
                onChange={(e) => handleSliderChange(parseFloat(e.target.value))}
                onMouseDown={handleSliderMouseDown}
                onMouseUp={handleSliderMouseUp}
                onTouchStart={handleSliderMouseDown}
                onTouchEnd={handleSliderMouseUp}
                className="w-full h-3 bg-amber-200 rounded-md appearance-none cursor-pointer slider border border-amber-300"
                style={{
                  background: `linear-gradient(to right, 
                    #8b4513 0%, 
                    #a0522d 25%, 
                    #d2691e 50%, 
                    #a0522d 75%, 
                    #8b4513 100%)`
                }}
              />
              
              {/* Slider labels */}
              <div className="flex justify-between mt-4 px-2">
                <span className="text-sm text-center w-20" style={{ fontFamily: 'var(--font-crimson)', color: '#5a4a3a' }}>
                  A much more {criteria}
                </span>
                <span className="text-sm text-center w-16" style={{ fontFamily: 'var(--font-crimson)', color: '#5a4a3a' }}>
                  A more {criteria}
                </span>
                <span className="text-sm text-center w-16" style={{ fontFamily: 'var(--font-crimson)', color: '#5a4a3a' }}>
                  Equal
                </span>
                <span className="text-sm text-center w-16" style={{ fontFamily: 'var(--font-crimson)', color: '#5a4a3a' }}>
                  B more {criteria}
                </span>
                <span className="text-sm text-center w-20" style={{ fontFamily: 'var(--font-crimson)', color: '#5a4a3a' }}>
                  B much more {criteria}
                </span>
              </div>
            </div>
          </div>

          {/* Current selection display */}
          <div className="text-center">
            <p className="text-lg font-medium" style={{ fontFamily: 'var(--font-playfair)', color: '#2c1810' }}>
              {getSliderLabel(currentJudgement)}
            </p>
          </div>

          {/* Next button - now optional since auto-advance is enabled */}
          <button
            onClick={handleNext}
            className="px-8 py-3 text-white rounded-md transition-all duration-200 font-medium opacity-75 hover:opacity-100"
            style={{ 
              backgroundColor: '#8b4513',
              fontFamily: 'var(--font-playfair)',
              boxShadow: '0 2px 8px rgba(139, 69, 19, 0.3)'
            }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#a0522d'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#8b4513'}
          >
            {isLastPair ? 'Complete Assessment' : 'Next Comparison'}
          </button>
        </div>
      </div>
    </div>
  );
} 