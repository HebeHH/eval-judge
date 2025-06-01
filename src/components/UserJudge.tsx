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
  const [isInteracting, setIsInteracting] = useState(false);
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
    setIsInteracting(true);
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
  };

  const handleSliderMouseUp = () => {
    setIsInteracting(false);
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
      case -1: return `A a lot more ${criteria}`;
      case -0.5: return `A more ${criteria}`;
      case 0: return 'Reasonably equal';
      case 0.5: return `B more ${criteria}`;
      case 1: return `B a lot more ${criteria}`;
      default: return 'Reasonably equal';
    }
  };

  if (!isOpen || !currentPair) {
    return null;
  }

  const progress = ((currentPairIndex + 1) / testPairs.length) * 100;

  return (
    <div className={`w-full bg-white rounded-xl shadow-lg overflow-hidden ${className}`}>
      {/* Header */}
      <div className="bg-royal-heath-600 text-white p-6">
        <h2 className="text-2xl font-bold text-center mb-2">
          Which output is more {criteria}?
        </h2>
        <div className="flex justify-between items-center text-royal-heath-100">
          <span>Comparison {currentPairIndex + 1} of {testPairs.length}</span>
          <span>{Math.round(progress)}% complete</span>
        </div>
        {/* Progress bar */}
        <div className="mt-3 bg-royal-heath-700 rounded-full h-2">
          <div 
            className="bg-royal-heath-200 h-2 rounded-full transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Test comparison cards */}
      <div className="p-8">
        <div className="grid grid-cols-2 gap-8 mb-8">
          {/* Test A */}
          <div className="bg-royal-heath-50 rounded-lg p-6 border-2 border-royal-heath-200 flex flex-col">
            <div className="bg-royal-heath-600 text-white text-center py-2 px-4 rounded-lg mb-4 font-bold text-lg">
              A
            </div>
            <div className="flex-1 min-h-[200px] overflow-y-auto">
              <p className="text-royal-heath-800 leading-relaxed">
                {currentPair[0].text}
              </p>
            </div>
          </div>

          {/* Test B */}
          <div className="bg-royal-heath-50 rounded-lg p-6 border-2 border-royal-heath-200 flex flex-col">
            <div className="bg-royal-heath-600 text-white text-center py-2 px-4 rounded-lg mb-4 font-bold text-lg">
              B
            </div>
            <div className="flex-1 min-h-[200px] overflow-y-auto">
              <p className="text-royal-heath-800 leading-relaxed">
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
                className="w-full h-3 bg-royal-heath-200 rounded-lg appearance-none cursor-pointer slider"
                style={{
                  background: `linear-gradient(to right, 
                    #ce3492 0%, 
                    #e054b1 25%, 
                    #f3aedf 50%, 
                    #e054b1 75%, 
                    #ce3492 100%)`
                }}
              />
              
              {/* Slider labels */}
              <div className="flex justify-between mt-3 px-1">
                <span className="text-xs text-royal-heath-700 text-center w-20">
                  A a lot more {criteria}
                </span>
                <span className="text-xs text-royal-heath-700 text-center w-16">
                  A more {criteria}
                </span>
                <span className="text-xs text-royal-heath-700 text-center w-20">
                  Reasonably equal
                </span>
                <span className="text-xs text-royal-heath-700 text-center w-16">
                  B more {criteria}
                </span>
                <span className="text-xs text-royal-heath-700 text-center w-20">
                  B a lot more {criteria}
                </span>
              </div>
            </div>
          </div>

          {/* Current selection display */}
          <div className="text-center">
            <p className="text-lg font-semibold text-royal-heath-800">
              {getSliderLabel(currentJudgement)}
            </p>
          </div>

          {/* Next button - now optional since auto-advance is enabled */}
          <button
            onClick={handleNext}
            className="px-8 py-3 bg-royal-heath-600 text-white rounded-lg hover:bg-royal-heath-700 transition-colors font-semibold text-lg opacity-75"
          >
            {isLastPair ? 'Complete' : 'Next Comparison'}
          </button>
        </div>
      </div>
    </div>
  );
} 