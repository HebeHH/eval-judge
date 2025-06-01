"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";

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

export default function UserJudge({
  tests,
  criteria,
  onComplete,
  isOpen,
  className = "",
}: UserJudgeProps) {
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
      judgement: currentJudgement,
    };

    const updatedJudgements = [...judgements, newJudgement];
    setJudgements(updatedJudgements);

    if (isLastPair) {
      // Complete the process
      onComplete(updatedJudgements);
    } else {
      // Move to next pair
      setCurrentPairIndex((prev) => prev + 1);
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
      case -1:
        return `Response A significantly more ${criteria}`;
      case -0.5:
        return `Response A moderately more ${criteria}`;
      case 0:
        return "Approximately equivalent";
      case 0.5:
        return `Response B moderately more ${criteria}`;
      case 1:
        return `Response B significantly more ${criteria}`;
      default:
        return "Approximately equivalent";
    }
  };

  if (!isOpen || !currentPair) {
    return null;
  }

  const progress = ((currentPairIndex + 1) / testPairs.length) * 100;

  return (
    <div className={`w-full card-elevated overflow-hidden ${className}`}>
      {/* Header with Dark Mode Toggle */}
      <div className="bg-charcoal-800 dark:bg-charcoal-900 text-charcoal-50 p-4 sm:p-6 lg:p-8">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-4">
          <div className="flex-1">
            <h2 className="text-heading-3 mb-2">EvalAtuin Human Validation</h2>
            <p className="text-body-small text-charcoal-200 dark:text-charcoal-300">
              Compare response quality for{" "}
              <strong>{criteria.toLowerCase()}</strong> evaluation
            </p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center text-charcoal-200 dark:text-charcoal-300 mb-4 gap-2">
          <span className="text-caption">
            COMPARISON {currentPairIndex + 1} OF {testPairs.length}
          </span>
          <span className="text-caption">
            {Math.round(progress)}% COMPLETED
          </span>
        </div>

        {/* Progress bar */}
        <div className="bg-charcoal-700 dark:bg-charcoal-800 h-1">
          <div
            className="bg-gold-500 h-1 transition-all duration-300 progress-bar"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Test comparison cards */}
      <div className="p-4 sm:p-6 lg:p-8">
        {/* Mobile-first stacked layout, side-by-side on larger screens */}
        <div className="flex flex-col lg:grid lg:grid-cols-2 gap-6 sm:gap-8 mb-8 sm:mb-12">
          {/* Response A */}
          <div className="bg-charcoal-50 dark:bg-charcoal-800 border border-charcoal-200 dark:border-charcoal-700 p-4 sm:p-6 flex flex-col">
            <div className="bg-charcoal-800 dark:bg-charcoal-900 text-charcoal-50 text-center py-3 px-4 mb-4 sm:mb-6">
              <span className="text-heading-3">Response A</span>
            </div>
            <div className="flex-1 min-h-[150px] sm:min-h-[200px] overflow-y-auto">
              <p className="text-body text-charcoal-800 dark:text-charcoal-200 leading-relaxed">
                {currentPair[0].text}
              </p>
            </div>
          </div>

          {/* Response B */}
          <div className="bg-charcoal-50 dark:bg-charcoal-800 border border-charcoal-200 dark:border-charcoal-700 p-4 sm:p-6 flex flex-col">
            <div className="bg-charcoal-800 dark:bg-charcoal-900 text-charcoal-50 text-center py-3 px-4 mb-4 sm:mb-6">
              <span className="text-heading-3">Response B</span>
            </div>
            <div className="flex-1 min-h-[150px] sm:min-h-[200px] overflow-y-auto">
              <p className="text-body text-charcoal-800 dark:text-charcoal-200 leading-relaxed">
                {currentPair[1].text}
              </p>
            </div>
          </div>
        </div>

        {/* Assessment section */}
        <div className="flex flex-col items-center space-y-6 sm:space-y-8">
          <div className="w-full max-w-4xl">
            {/* Slider */}
            <div className="relative px-2">
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
                className="w-full h-3 sm:h-2 bg-charcoal-200 dark:bg-charcoal-700 appearance-none cursor-pointer slider"
              />

              {/* Slider scale labels - Responsive layout */}
              <div className="hidden sm:flex justify-between mt-4 px-1">
                <span className="text-caption text-charcoal-600 dark:text-charcoal-400 text-center w-24">
                  A SIGNIFICANTLY MORE {criteria.toUpperCase()}
                </span>
                <span className="text-caption text-charcoal-600 dark:text-charcoal-400 text-center w-20">
                  A MODERATELY MORE
                </span>
                <span className="text-caption text-charcoal-600 dark:text-charcoal-400 text-center w-20">
                  EQUIVALENT
                </span>
                <span className="text-caption text-charcoal-600 dark:text-charcoal-400 text-center w-20">
                  B MODERATELY MORE
                </span>
                <span className="text-caption text-charcoal-600 dark:text-charcoal-400 text-center w-24">
                  B SIGNIFICANTLY MORE {criteria.toUpperCase()}
                </span>
              </div>

              {/* Mobile-friendly scale labels */}
              <div className="sm:hidden mt-4 grid grid-cols-3 gap-2 text-center">
                <span className="text-caption text-charcoal-600 dark:text-charcoal-400">
                  A MORE {criteria.toUpperCase()}
                </span>
                <span className="text-caption text-charcoal-600 dark:text-charcoal-400">
                  EQUIVALENT
                </span>
                <span className="text-caption text-charcoal-600 dark:text-charcoal-400">
                  B MORE {criteria.toUpperCase()}
                </span>
              </div>
            </div>
          </div>

          {/* Current assessment display */}
          <div className="text-center p-4 sm:p-6 bg-charcoal-50 dark:bg-charcoal-800 border border-charcoal-200 dark:border-charcoal-700 w-full max-w-2xl">
            <p className="text-caption text-charcoal-600 dark:text-charcoal-400 mb-2">
              CURRENT ASSESSMENT
            </p>
            <p className="text-body-large font-medium text-charcoal-800 dark:text-charcoal-200">
              {getSliderLabel(currentJudgement)}
            </p>
          </div>

          {/* Action button */}
          <button
            onClick={handleNext}
            className="btn-primary px-6 sm:px-8 py-3 sm:py-4 text-body-large w-full sm:w-auto"
          >
            {isLastPair ? "Complete Assessment" : "Record & Continue"}
          </button>

          <p className="text-body-small text-charcoal-500 dark:text-charcoal-400 text-center px-4">
            Assessment will advance automatically after adjustment
          </p>
        </div>
      </div>
    </div>
  );
}
