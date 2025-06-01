"use client";

import React, { useState, useEffect, useCallback } from "react";
import UserJudge, { UserTestJudgement } from "./UserJudge";
import EvalRater from "./EvalRater";
import { testOutputs } from "@/constants/testOutputs";

interface Test {
  id: number;
  text: string;
}

interface BatchScoreResult {
  id: number;
  score: number;
}

interface SelectedPrompt {
  title: string;
  content: string;
  approach: string;
  criteria: string;
}

interface BatchScoreFlowProps {
  selectedPrompt: SelectedPrompt;
  onBack: () => void;
}

// Configuration parameter for sample size
const SAMPLE_SIZE = 15;

// Elephant decoration component
const ElephantCorner = ({
  position,
}: {
  position: "top-left" | "top-right" | "bottom-left" | "bottom-right";
}) => {
  const getPositionClasses = () => {
    switch (position) {
      case "top-left":
        return "top-4 left-4";
      case "top-right":
        return "top-4 right-20"; // Account for dark mode toggle
      case "bottom-left":
        return "bottom-4 left-4";
      case "bottom-right":
        return "bottom-4 right-4";
    }
  };

  return (
    <div
      className={`fixed ${getPositionClasses()} opacity-10 text-charcoal-400 hidden xl:block pointer-events-none z-10 elephant-float`}
    >
      <svg width="24" height="24" viewBox="0 0 100 100" fill="currentColor">
        <path d="M20 60C15 55 15 45 20 40C25 35 35 35 40 40C45 35 55 35 60 40C65 45 65 55 60 60C60 65 55 70 50 70C45 70 40 65 40 60C35 65 25 65 20 60Z" />
        <circle cx="35" cy="45" r="3" fill="currentColor" />
        <circle cx="55" cy="45" r="3" fill="currentColor" />
      </svg>
    </div>
  );
};

// Methodology sidebar for evaluation phase
const EvaluationMethodologySidebar = ({
  progress,
  isBatchScoreComplete,
  isUserJudgeComplete,
  isUserJudgeOpen,
}: {
  progress: { current: number; total: number };
  isBatchScoreComplete: boolean;
  isUserJudgeComplete: boolean;
  isUserJudgeOpen: boolean;
}) => {
  return (
    <div className="hidden xl:block w-80 bg-white dark:bg-charcoal-900 border-l border-charcoal-200 dark:border-charcoal-700 p-8 overflow-y-auto">
      <div className="sticky top-0">
        <h3 className="text-heading-3 text-charcoal-800 dark:text-charcoal-50 mb-6">
          Dual Validation Process
        </h3>

        <div className="space-y-4 mb-8">
          <p className="text-body-small text-charcoal-600 dark:text-charcoal-300 leading-relaxed">
            DeepAtuin validates evaluation prompts through parallel processes
            that leverage both AI consistency and human intuition.
          </p>
          <p className="text-body-small text-charcoal-600 dark:text-charcoal-300 leading-relaxed">
            🤖 <strong>AI Evaluation Stream:</strong> Your selected prompt
            scores test outputs, generating absolute 0-10 scores for consistency
            analysis.
          </p>
          <p className="text-body-small text-charcoal-600 dark:text-charcoal-300 leading-relaxed">
            👤 <strong>Human Validation Stream:</strong> You perform pairwise
            comparisons, generating relative -1 to 1 scores that capture nuanced
            human judgment.
          </p>
        </div>

        {/* Progress Tracking */}
        <div className="mb-8 p-4 bg-charcoal-50 dark:bg-charcoal-800 border border-charcoal-200 dark:border-charcoal-700 rounded-sm">
          <h4 className="text-body font-medium text-charcoal-800 dark:text-charcoal-50 mb-3">
            Current Progress
          </h4>

          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-caption text-charcoal-600 dark:text-charcoal-400 mb-2">
                <span>AI EVALUATION</span>
                <span>
                  {progress.current} / {progress.total}
                </span>
              </div>
              <div className="w-full bg-charcoal-200 dark:bg-charcoal-700 h-2">
                <div
                  className="bg-gold-500 h-2 transition-all duration-300 progress-bar"
                  style={{
                    width:
                      progress.total > 0
                        ? `${(progress.current / progress.total) * 100}%`
                        : "0%",
                  }}
                />
              </div>
              <p className="text-body-small text-charcoal-600 dark:text-charcoal-300 mt-1">
                {isBatchScoreComplete ? "Complete" : "Processing..."}
              </p>
            </div>

            <div>
              <div className="flex justify-between text-caption text-charcoal-600 dark:text-charcoal-400 mb-2">
                <span>HUMAN VALIDATION</span>
                <span>
                  {isUserJudgeComplete
                    ? "Complete"
                    : isUserJudgeOpen
                    ? "Active"
                    : "Closed"}
                </span>
              </div>
              <div className="w-full bg-charcoal-200 dark:bg-charcoal-700 h-2">
                <div
                  className={`h-2 transition-all duration-300 ${
                    isUserJudgeComplete
                      ? "bg-gold-500 w-full"
                      : isUserJudgeOpen
                      ? "bg-gold-300 w-1/2"
                      : "bg-charcoal-300 dark:bg-charcoal-600 w-0"
                  }`}
                />
              </div>
              <p className="text-body-small text-charcoal-600 dark:text-charcoal-300 mt-1">
                {isUserJudgeComplete
                  ? "Complete"
                  : isUserJudgeOpen
                  ? "In progress"
                  : "Awaiting input"}
              </p>
            </div>
          </div>
        </div>

        {/* Analysis Info */}
        <div className="mb-8 p-4 bg-gold-50 dark:bg-gold-900/20 border border-gold-200 dark:border-gold-700 rounded-sm">
          <h4 className="text-body font-medium text-charcoal-800 dark:text-charcoal-50 mb-2">
            Statistical Analysis
          </h4>
          <p className="text-body-small text-charcoal-600 dark:text-charcoal-300 leading-relaxed">
            Once both streams complete, correlation analysis reveals whether
            your evaluation prompt captures human judgment patterns.
          </p>
        </div>

        <div className="p-6 bg-charcoal-50 dark:bg-charcoal-800 border border-charcoal-200 dark:border-charcoal-700 rounded-sm">
          <h4 className="text-caption text-charcoal-600 dark:text-charcoal-400 mb-3">
            DEEPATUIN SYSTEM
          </h4>
          <p className="text-body-small text-charcoal-600 dark:text-charcoal-300 leading-relaxed">
            This dual validation approach ensures your LLM evaluation prompts
            actually measure what you intend them to measure.
          </p>
        </div>
      </div>
    </div>
  );
};

export default function BatchScoreFlow({
  selectedPrompt,
}: BatchScoreFlowProps) {
  const [testSample, setTestSample] = useState<Test[]>([]);
  const [batchScoreResults, setBatchScoreResults] = useState<
    BatchScoreResult[]
  >([]);
  const [userTestJudgements, setUserTestJudgements] = useState<
    UserTestJudgement[]
  >([]);
  const [isBatchScoreComplete, setIsBatchScoreComplete] = useState(false);
  const [isUserJudgeOpen, setIsUserJudgeOpen] = useState(true);
  const [isUserJudgeComplete, setIsUserJudgeComplete] = useState(false);
  const [showResults, setShowResults] = useState(false);

  // Progress tracking
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const [isProcessing, setIsProcessing] = useState(false);

  // Initialize test sample on component mount
  useEffect(() => {
    // Take a random sample of test outputs
    const shuffled = [...testOutputs].sort(() => Math.random() - 0.5);
    const sample = shuffled.slice(0, SAMPLE_SIZE);
    setTestSample(sample);
  }, []);

  const startBatchScoring = useCallback(async () => {
    if (testSample.length === 0) return;

    setIsProcessing(true);
    setProgress({ current: 0, total: testSample.length });

    try {
      const response = await fetch("/api/batchScore", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "text/event-stream",
        },
        body: JSON.stringify({
          judgingMatrix: selectedPrompt.content,
          tests: testSample,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to start batch scoring");
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      const results: BatchScoreResult[] = [];

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value);
          const lines = chunk.split("\n");

          for (const line of lines) {
            if (line.startsWith("data: ")) {
              try {
                const data = JSON.parse(line.slice(6));

                switch (data.type) {
                  case "progress":
                    setProgress({ current: data.current, total: data.total });
                    break;
                  case "result":
                    results.push(data.result);
                    break;
                  case "complete":
                    setBatchScoreResults(data.results);
                    setIsBatchScoreComplete(true);
                    setIsProcessing(false);
                    // Close UserJudge if it's still open
                    setIsUserJudgeOpen(false);
                    break;
                  case "error":
                    console.error("Batch scoring error:", data.error);
                    setIsProcessing(false);
                    break;
                }
              } catch (e) {
                console.error("Error parsing SSE data:", e);
              }
            }
          }
        }
      }
    } catch (error) {
      console.error("Error in batch scoring:", error);
      setIsProcessing(false);
    }
  }, [testSample, selectedPrompt.content]);

  // Start batch scoring when test sample is ready
  useEffect(() => {
    if (testSample.length > 0 && !isProcessing) {
      startBatchScoring();
    }
  }, [testSample, isProcessing, startBatchScoring]);

  const handleUserJudgeComplete = useCallback(
    (judgements: UserTestJudgement[]) => {
      setUserTestJudgements(judgements);
      setIsUserJudgeComplete(true);
      setIsUserJudgeOpen(false);
    },
    []
  );

  // Show results when both processes are complete
  useEffect(() => {
    if (isBatchScoreComplete && (isUserJudgeComplete || !isUserJudgeOpen)) {
      setShowResults(true);
    }
  }, [isBatchScoreComplete, isUserJudgeComplete, isUserJudgeOpen]);

  if (showResults) {
    return (
      <EvalRater
        batchScoreResults={batchScoreResults}
        userTestJudgements={userTestJudgements}
        selectedPrompt={selectedPrompt}
      />
    );
  }

  return (
    <div className="min-h-screen bg-charcoal-50 dark:bg-charcoal-900 flex">
      {/* Elephant decorations */}
      <ElephantCorner position="top-left" />
      <ElephantCorner position="top-right" />
      <ElephantCorner position="bottom-left" />
      <ElephantCorner position="bottom-right" />

      {/* Main Content */}
      <div className="flex-1 flex flex-col xl:flex-row">
        <div className="flex-1 py-4 sm:py-8 px-4 sm:px-6 lg:px-8">
          <div className="max-w-6xl mx-auto">
            {/* Header */}
            <div className="card-elevated p-4 sm:p-6 mb-6 sm:mb-8 fade-in">
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4 mb-4">
                <div className="flex-1">
                  <h1 className="text-heading-1 text-charcoal-800 dark:text-charcoal-50 mb-2">
                    DeepAtuin Validation
                  </h1>
                  <p className="text-body text-charcoal-600 dark:text-charcoal-300">
                    Testing <em>{selectedPrompt.title}</em> methodology for{" "}
                    <strong>{selectedPrompt.criteria}</strong> evaluation
                  </p>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <span className="text-caption text-charcoal-600 dark:text-charcoal-400">
                    {progress.current} / {progress.total} COMPLETED
                  </span>
                  <div className="w-32 bg-charcoal-200 dark:bg-charcoal-700 h-2">
                    <div
                      className="bg-gold-500 h-2 transition-all duration-300 progress-bar"
                      style={{
                        width:
                          progress.total > 0
                            ? `${(progress.current / progress.total) * 100}%`
                            : "0%",
                      }}
                    />
                  </div>
                </div>
              </div>
              <div className="text-emphasis">
                <p>
                  Systematic assessment validates evaluation consistency and
                  reliability through parallel AI and human judgment streams.
                </p>
              </div>
            </div>

            {/* UserJudge Component */}
            {testSample.length > 0 && (
              <UserJudge
                tests={testSample}
                criteria={selectedPrompt.criteria}
                onComplete={handleUserJudgeComplete}
                isOpen={isUserJudgeOpen}
                className="mb-6 sm:mb-8 fade-in"
              />
            )}

            {/* Status Information */}
            <div className="card p-4 sm:p-6 fade-in">
              <h3 className="text-heading-3 text-charcoal-800 dark:text-charcoal-50 mb-4">
                Validation Status
              </h3>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div className="bg-charcoal-50 dark:bg-charcoal-800 border border-charcoal-200 dark:border-charcoal-700 p-4">
                  <h4 className="text-body font-medium text-charcoal-700 dark:text-charcoal-300 mb-2">
                    AI Evaluation Stream
                  </h4>
                  <p className="text-body-small text-charcoal-600 dark:text-charcoal-300">
                    {isBatchScoreComplete
                      ? `Assessment complete — ${batchScoreResults.length} evaluations processed`
                      : isProcessing
                      ? `In progress — ${progress.current} of ${progress.total} samples evaluated`
                      : "Preparing evaluation protocol..."}
                  </p>
                </div>
                <div className="bg-charcoal-50 dark:bg-charcoal-800 border border-charcoal-200 dark:border-charcoal-700 p-4">
                  <h4 className="text-body font-medium text-charcoal-700 dark:text-charcoal-300 mb-2">
                    Human Validation Stream
                  </h4>
                  <p className="text-body-small text-charcoal-600 dark:text-charcoal-300">
                    {isUserJudgeComplete
                      ? `Validation complete — ${userTestJudgements.length} comparative assessments`
                      : isUserJudgeOpen
                      ? "Awaiting human validation input..."
                      : "Validation process closed"}
                  </p>
                </div>
              </div>

              {isBatchScoreComplete &&
                (isUserJudgeComplete || !isUserJudgeOpen) && (
                  <div className="mt-4 p-4 bg-gold-50 dark:bg-gold-900/20 border border-gold-200 dark:border-gold-700">
                    <div className="flex items-center gap-3">
                      <div className="w-6 h-0.5 bg-gold-500"></div>
                      <p className="text-charcoal-800 dark:text-charcoal-200 font-medium">
                        Validation process completed. Generating comprehensive
                        analysis...
                      </p>
                    </div>
                  </div>
                )}
            </div>
          </div>
        </div>

        {/* Methodology Sidebar */}
        <EvaluationMethodologySidebar
          progress={progress}
          isBatchScoreComplete={isBatchScoreComplete}
          isUserJudgeComplete={isUserJudgeComplete}
          isUserJudgeOpen={isUserJudgeOpen}
        />
      </div>
    </div>
  );
}
