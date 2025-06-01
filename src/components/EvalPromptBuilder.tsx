"use client";

import React, { useState, useRef, useEffect } from "react";
import {
  DEFAULT_QUESTIONS,
  CRITICIZER_SYSTEM_PROMPT,
  QUESTIONER_SYSTEM_PROMPT,
  EVAL_GENERATOR_SYSTEM_PROMPT_1,
  EVAL_GENERATOR_SYSTEM_PROMPT_2,
  EVAL_GENERATOR_SYSTEM_PROMPT_3,
  formatConversationForAgent,
  createCriticPrompt,
  createQuestionerPrompt,
  createEvalGeneratorPrompt,
} from "@/constants/prompts";
import BatchScoreFlow from "./BatchScoreFlow";
import "../cssSpinny.css";

type EvaluationCriteria = "WITTY" | "INTELLIGENT" | "KIND";

interface Message {
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

interface EvalPrompt {
  title: string;
  content: string;
  approach: string;
}

interface SelectedPrompt {
  title: string;
  content: string;
  approach: string;
  criteria: string;
}

interface CriticResponse {
  loop: number;
  content: string;
  timestamp: Date;
}

const MAX_LOOPS = 2;

// Methodology content for different phases
const METHODOLOGY_CONTENT = {
  selection: {
    title: "Evaluation Criteria Selection",
    content: [
      "DeepAtuin employs a systematic approach to LLM evaluation prompt development.",
      "First, select your primary evaluation dimension. Each criterion represents a distinct area of assessment:",
      "• WITTY: Systematic evaluation of humor, cleverness, and linguistic creativity",
      "• INTELLIGENT: Analysis of reasoning capabilities and knowledge application",
      "• KIND: Assessment of empathy, supportiveness, and prosocial communication",
      "This foundation shapes the entire evaluation framework that follows.",
    ],
  },
  conversation: {
    title: "Information Gathering Process",
    content: [
      "DeepAtuin uses a multi-agent conversation system to extract comprehensive evaluation requirements:",
      "🔍 Critical Agent: Analyzes your responses and identifies missing information, unclear aspects, and contradictory requirements",
      "❓ Questioning Agent: Transforms the analysis into engaging, prioritized questions for you",
      "This iterative process ensures your evaluation criteria are comprehensive and unambiguous before prompt generation begins.",
      `You're currently in conversation ${Math.min(3, 1)} of ${
        MAX_LOOPS + 1
      }. Each turn refines the understanding of your evaluation needs.`,
    ],
  },
  generation: {
    title: "Parallel Prompt Generation",
    content: [
      "Three specialized 'super prompters' generate evaluation prompts simultaneously:",
      "📚 Academic Structure: Research-grade evaluation with comprehensive rubrics",
      "⚡ Minimalist Practitioner: Streamlined, action-oriented assessment",
      "⚖️ Balanced Generalist: Well-rounded, flexible evaluation approach",
      "Multiple approaches are generated because there's no consensus on the 'best' way to write evaluation prompts. You can review and select the approach that best matches your intentions.",
    ],
  },
  evaluation: {
    title: "Dual Validation Process",
    content: [
      "DeepAtuin validates evaluation prompts through parallel processes:",
      "🤖 AI Evaluation Stream: Your selected prompt scores test outputs (absolute 0-10 scores)",
      "👤 Human Validation Stream: You perform pairwise comparisons (relative -1 to 1 scores)",
      "This dual approach leverages the strengths of both AI consistency and human intuition.",
      "Statistical correlation analysis reveals whether your evaluation prompt captures human judgment patterns.",
    ],
  },
};

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

// Criticizer Feedback Sidebar
const CritizerFeedbackSidebar = ({
  criticResponses,
  isVisible,
}: {
  criticResponses: CriticResponse[];
  isVisible: boolean;
}) => {
  return (
    <div
      className={`w-80 bg-charcoal-50 dark:bg-charcoal-800 border-l border-charcoal-200 dark:border-charcoal-700 p-6 overflow-y-auto ${
        isVisible ? "block" : "hidden"
      } lg:block`}
    >
      <div className="sticky top-0 bg-charcoal-50 dark:bg-charcoal-800 pb-4">
        <h3 className="text-heading-3 text-charcoal-800 dark:text-charcoal-50 mb-4">
          Critical Analysis
        </h3>
        <p className="text-body-small text-charcoal-600 dark:text-charcoal-300 mb-6">
          The critical agent analyzes your responses to identify gaps,
          ambiguities, and areas needing clarification.
        </p>
      </div>

      <div className="space-y-4">
        {criticResponses.length === 0 ? (
          <div className="text-center py-8">
            <div className="loading-dots mx-auto mb-4">
              <div></div>
              <div></div>
              <div></div>
            </div>
            <p className="text-body-small text-charcoal-500 dark:text-charcoal-400">
              Awaiting critical analysis...
            </p>
          </div>
        ) : (
          criticResponses.map((response, index) => (
            <div key={index} className="card p-4 border-l-4 border-gold-500">
              <div className="flex justify-between items-center mb-3">
                <span className="text-caption text-charcoal-600 dark:text-charcoal-400">
                  CONVERSATION {response.loop + 1} ANALYSIS
                </span>
                <span className="text-caption text-charcoal-500 dark:text-charcoal-400">
                  {response.timestamp.toLocaleTimeString()}
                </span>
              </div>
              <div className="text-body-small text-charcoal-700 dark:text-charcoal-300 leading-relaxed whitespace-pre-wrap">
                {response.content}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

// Enhanced Methodology sidebar component
const MethodologySidebar = ({
  phase,
  currentLoop,
  criticResponses,
}: {
  phase: string;
  currentLoop: number;
  criticResponses: CriticResponse[];
}) => {
  const content =
    METHODOLOGY_CONTENT[phase as keyof typeof METHODOLOGY_CONTENT];
  if (!content) return null;

  return (
    <div className="hidden xl:block w-80 bg-white dark:bg-charcoal-900 border-l border-charcoal-200 dark:border-charcoal-700 p-8 overflow-y-auto methodology-sidebar">
      <div className="sticky top-0">
        <h3 className="text-heading-3 text-charcoal-800 dark:text-charcoal-50 mb-6">
          {content.title}
        </h3>
        <div className="space-y-4">
          {content.content.map((paragraph, index) => (
            <p
              key={index}
              className="text-body-small text-charcoal-600 dark:text-charcoal-300 leading-relaxed"
            >
              {paragraph.includes(
                `conversation ${Math.min(currentLoop + 1, 3)}`
              )
                ? paragraph.replace(
                    /conversation \d+/,
                    `conversation ${currentLoop + 1}`
                  )
                : paragraph}
            </p>
          ))}
        </div>

        {phase === "conversation" && (
          <div className="mt-8 p-4 bg-gold-50 dark:bg-gold-900 border border-gold-200 dark:border-gold-700 rounded-sm">
            <h4 className="text-body font-medium text-charcoal-100 dark:text-charcoal-50 mb-2">
              Current Phase
            </h4>
            <div className="flex items-center gap-2 mb-2">
              <div className="w-full bg-charcoal-200 dark:bg-charcoal-700 h-1">
                <div
                  className="bg-gold-500 h-1 transition-all duration-300 progress-bar"
                  style={{
                    width: `${((currentLoop + 1) / (MAX_LOOPS + 1)) * 100}%`,
                  }}
                />
              </div>
              <span className="text-caption text-charcoal-600 dark:text-charcoal-400 whitespace-nowrap">
                {Math.round(((currentLoop + 1) / (MAX_LOOPS + 1)) * 100)}%
              </span>
            </div>
            <p className="text-body-small text-charcoal-600 dark:text-charcoal-300">
              Information gathering in progress
            </p>
          </div>
        )}

        {/* Show critic responses during generation phase */}
        {phase === "generation" && criticResponses.length > 0 && (
          <div className="mt-8 p-4 bg-charcoal-100 dark:bg-charcoal-800 border border-charcoal-200 dark:border-charcoal-700 rounded-sm">
            <h4 className="text-body font-medium text-charcoal-800 dark:text-charcoal-50 mb-3">
              Critical Analysis Summary
            </h4>
            <div className="space-y-3 max-h-48 overflow-y-auto">
              {criticResponses.map((response, index) => (
                <div
                  key={index}
                  className="text-body-small text-charcoal-600 dark:text-charcoal-300 leading-relaxed p-2 bg-white dark:bg-charcoal-900 rounded border-l-2 border-gold-500"
                >
                  <span className="text-caption text-charcoal-500 dark:text-charcoal-400">
                    Loop {response.loop + 1}:
                  </span>
                  <p className="mt-1">
                    {response.content.substring(0, 100)}...
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="mt-12 p-6 bg-charcoal-50 dark:bg-charcoal-800 border border-charcoal-200 dark:border-charcoal-700 rounded-sm">
          <h4 className="text-caption text-charcoal-600 dark:text-charcoal-400 mb-3">
            DEEPATUIN SYSTEM
          </h4>
          <p className="text-body-small text-charcoal-600 dark:text-charcoal-300 leading-relaxed">
            An interactive system for building and validating LLM evaluation
            prompts. Named after the Great A&apos;Tuin from Terry
            Pratchett&apos;s Discworld.
          </p>
        </div>
      </div>
    </div>
  );
};

export default function EvalPromptBuilder() {
  const [selectedCriteria, setSelectedCriteria] =
    useState<EvaluationCriteria | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [currentInput, setCurrentInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [isCriticizing, setIsCriticizing] = useState(false);
  const [currentLoop, setCurrentLoop] = useState(0);
  const [phase, setPhase] = useState<
    "selection" | "conversation" | "generation" | "evaluation"
  >("selection");
  const [evalPrompts, setEvalPrompts] = useState<EvalPrompt[]>([]);
  const [streamingContent, setStreamingContent] = useState("");
  const [streamingEvalPrompts, setStreamingEvalPrompts] = useState<{
    [key: number]: string;
  }>({});
  const [isGeneratingEvals, setIsGeneratingEvals] = useState(false);
  const [selectedPrompt, setSelectedPrompt] = useState<SelectedPrompt | null>(
    null
  );
  const [criticResponses, setCriticResponses] = useState<CriticResponse[]>([]);
  const [showCriticSidebar, setShowCriticSidebar] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, streamingContent]);

  const handleCriteriaSelection = (criteria: EvaluationCriteria) => {
    setSelectedCriteria(criteria);
    setPhase("conversation");

    // Add the default question as the first assistant message
    const defaultQuestion = DEFAULT_QUESTIONS[criteria];
    setMessages([
      {
        role: "assistant",
        content: defaultQuestion,
        timestamp: new Date(),
      },
    ]);
  };

  const handlePromptSelection = (
    promptInfo: { title: string; approach: string; index: number },
    finalPrompt: EvalPrompt
  ) => {
    const selected: SelectedPrompt = {
      title: promptInfo.title,
      approach: promptInfo.approach,
      content: finalPrompt.content,
      criteria: selectedCriteria || "UNKNOWN",
    };

    setSelectedPrompt(selected);
    setPhase("evaluation");
  };

  const handleBackToBuilder = () => {
    setSelectedPrompt(null);
    setPhase("generation");
  };

  const callLLMAPI = async (
    systemPrompt: string,
    userMessage: string
  ): Promise<string> => {
    const response = await fetch("/api/prompt", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        system: systemPrompt,
        messages: [{ role: "user", content: userMessage }],
      }),
    });

    if (!response.ok) {
      throw new Error("Failed to get LLM response");
    }

    const data = await response.json();
    return data.response;
  };

  const streamLLMResponse = async (
    systemPrompt: string,
    userMessage: string
  ): Promise<string> => {
    setIsStreaming(true);
    setStreamingContent("");

    try {
      // For now, we'll simulate streaming by calling the regular API and displaying it progressively
      const fullResponse = await callLLMAPI(systemPrompt, userMessage);

      // Simulate streaming by revealing the text progressively
      const words = fullResponse.split(" ");
      let currentText = "";

      for (let i = 0; i < words.length; i++) {
        currentText += (i > 0 ? " " : "") + words[i];
        setStreamingContent(currentText);
        await new Promise((resolve) => setTimeout(resolve, 50)); // 50ms delay between words
      }

      setIsStreaming(false);
      setStreamingContent("");
      return fullResponse;
    } catch (error) {
      setIsStreaming(false);
      setStreamingContent("");
      throw error;
    }
  };

  const streamEvalPrompt = async (
    systemPrompt: string,
    userMessage: string,
    promptIndex: number
  ): Promise<string> => {
    try {
      // Call the API to get the full response
      const fullResponse = await callLLMAPI(systemPrompt, userMessage);

      // Simulate streaming by revealing the text progressively
      const words = fullResponse.split(" ");
      let currentText = "";

      for (let i = 0; i < words.length; i++) {
        currentText += (i > 0 ? " " : "") + words[i];
        setStreamingEvalPrompts((prev) => ({
          ...prev,
          [promptIndex]: currentText,
        }));
        await new Promise((resolve) => setTimeout(resolve, 30)); // Faster streaming for eval prompts
      }

      return fullResponse;
    } catch (error) {
      console.error(`Error streaming eval prompt ${promptIndex}:`, error);
      throw error;
    }
  };

  const handleSendMessage = async () => {
    if (!currentInput.trim() || isLoading) return;

    const userMessage: Message = {
      role: "user",
      content: currentInput.trim(),
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setCurrentInput("");
    setIsLoading(true);

    try {
      if (currentLoop < MAX_LOOPS) {
        // LLM Loop: Criticizer -> Questioner -> Stream to user

        // 1. Call criticizer agent
        setIsCriticizing(true);
        const conversationHistory = formatConversationForAgent([
          ...messages,
          userMessage,
        ]);
        const criticPrompt = createCriticPrompt(conversationHistory);
        const criticism = await callLLMAPI(
          CRITICIZER_SYSTEM_PROMPT,
          criticPrompt
        );

        // Store criticizer response
        const newCriticResponse: CriticResponse = {
          loop: currentLoop,
          content: criticism,
          timestamp: new Date(),
        };
        setCriticResponses((prev) => [...prev, newCriticResponse]);

        // Log criticizer response to console
        console.log("Criticizer Response:", criticism);

        setIsCriticizing(false);

        // 2. Call questioner agent and stream response
        const questionerPrompt = createQuestionerPrompt(
          conversationHistory,
          criticism
        );
        const questionerResponse = await streamLLMResponse(
          QUESTIONER_SYSTEM_PROMPT,
          questionerPrompt
        );

        // 3. Add questioner response to messages
        const assistantMessage: Message = {
          role: "assistant",
          content: questionerResponse,
          timestamp: new Date(),
        };

        setMessages((prev) => [...prev, assistantMessage]);
        setCurrentLoop((prev) => prev + 1);
      } else {
        // After MAX_LOOPS, generate eval prompts
        setPhase("generation");
        await generateEvalPrompts([...messages, userMessage]);
      }
    } catch (error) {
      console.error("Error in conversation:", error);
      setIsCriticizing(false);
      // Add error message
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "I apologize, but I encountered an error. Please try again.",
          timestamp: new Date(),
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const generateEvalPrompts = async (finalMessages: Message[]) => {
    setIsLoading(true);
    setIsGeneratingEvals(true);
    setStreamingEvalPrompts({});

    try {
      const conversationHistory = formatConversationForAgent(finalMessages);
      const evalPrompt = createEvalGeneratorPrompt(conversationHistory);

      // Stream all three eval prompts in parallel
      const [response1, response2, response3] = await Promise.all([
        streamEvalPrompt(EVAL_GENERATOR_SYSTEM_PROMPT_1, evalPrompt, 0),
        streamEvalPrompt(EVAL_GENERATOR_SYSTEM_PROMPT_2, evalPrompt, 1),
        streamEvalPrompt(EVAL_GENERATOR_SYSTEM_PROMPT_3, evalPrompt, 2),
      ]);

      setEvalPrompts([
        {
          title: "Academic Structure",
          content: response1,
          approach: "highly structured, research-grade evaluation",
        },
        {
          title: "Minimalist Practitioner",
          content: response2,
          approach: "streamlined, action-oriented evaluation",
        },
        {
          title: "Balanced Generalist",
          content: response3,
          approach: "well-rounded, flexible evaluation",
        },
      ]);

      // Clear streaming content after completion
      setStreamingEvalPrompts({});
    } catch (error) {
      console.error("Error generating eval prompts:", error);
    } finally {
      setIsLoading(false);
      setIsGeneratingEvals(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const resetBuilder = () => {
    setSelectedCriteria(null);
    setMessages([]);
    setCurrentInput("");
    setIsLoading(false);
    setIsStreaming(false);
    setIsCriticizing(false);
    setCurrentLoop(0);
    setPhase("selection");
    setEvalPrompts([]);
    setStreamingContent("");
    setStreamingEvalPrompts({});
    setIsGeneratingEvals(false);
    setSelectedPrompt(null);
    setCriticResponses([]);
    setShowCriticSidebar(false);
  };

  if (phase === "selection") {
    return (
      <div className="min-h-screen bg-charcoal-50 dark:bg-charcoal-900 flex">
        {/* Elephant decorations */}
        <ElephantCorner position="top-left" />
        <ElephantCorner position="top-right" />
        <ElephantCorner position="bottom-left" />
        <ElephantCorner position="bottom-right" />


        {/* Main Content */}
        <div className="flex-1 flex flex-col xl:flex-row">
          <div className="flex-1 py-8 px-4 sm:px-6 lg:px-8">
            <div className="max-w-4xl mx-auto">
              <div className="text-center mb-8 sm:mb-12 lg:mb-16">
                <h1 className="text-display text-charcoal-800 dark:text-charcoal-50 mb-4 sm:mb-6">
                  DeepAtuin
                </h1>
                <p className="text-body-large text-charcoal-600 dark:text-charcoal-300 max-w-2xl mx-auto px-4">
                  An interactive system for building and validating LLM
                  evaluation prompts
                </p>
              </div>

              <div className="card-elevated p-6 sm:p-8 lg:p-12">
                <h2 className="text-heading-2 text-charcoal-800 dark:text-charcoal-50 mb-6 sm:mb-8 text-center">
                  Select Evaluation Criteria
                </h2>
                <p className="text-body text-charcoal-600 dark:text-charcoal-300 text-center mb-8 sm:mb-12 max-w-2xl mx-auto">
                  Choose the primary dimension for assessment. Each criterion
                  employs distinct methodological approaches for comprehensive
                  evaluation.
                </p>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8 stagger-children">
                  {(["WITTY", "INTELLIGENT", "KIND"] as const).map(
                    (criteria) => (
                      <button
                        key={criteria}
                        onClick={() => handleCriteriaSelection(criteria)}
                        className="card p-6 sm:p-8 text-left group transition-all duration-200 hover:shadow-subtle"
                      >
                        <div>
                          <div className="w-12 h-0.5 bg-gold-500 mb-4 sm:mb-6"></div>
                          <h3 className="text-heading-3 text-charcoal-800 dark:text-charcoal-50 mb-3 sm:mb-4">
                            {criteria}
                          </h3>
                          <p className="text-body-small text-charcoal-600 dark:text-charcoal-300 leading-relaxed">
                            {criteria === "WITTY" &&
                              "Systematic evaluation of humor, cleverness, and linguistic wit through structured assessment protocols."}
                            {criteria === "INTELLIGENT" &&
                              "Comprehensive analysis of reasoning capabilities, knowledge application, and cognitive insight."}
                            {criteria === "KIND" &&
                              "Methodical assessment of empathy, supportiveness, and prosocial communication patterns."}
                          </p>
                        </div>
                      </button>
                    )
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Methodology Sidebar */}
          <MethodologySidebar
            phase={phase}
            currentLoop={currentLoop}
            criticResponses={criticResponses}
          />
        </div>
      </div>
    );
  }

  if (phase === "generation") {
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
            <div className="max-w-full mx-auto">
              <div className="text-center mb-6 sm:mb-12">
                <h1 className="text-heading-1 text-charcoal-800 dark:text-charcoal-50 mb-3 sm:mb-4">
                  Evaluation Protocols for {selectedCriteria}
                </h1>
                <p className="text-body text-charcoal-600 dark:text-charcoal-300 mb-4 sm:mb-6 px-4">
                  Three methodological approaches for systematic evaluation of{" "}
                  {selectedCriteria?.toLowerCase()} responses
                </p>
                <button onClick={resetBuilder} className="btn-secondary">
                  Return to Criteria Selection
                </button>
              </div>

              {isLoading ? (
                <div className="text-center py-12 sm:py-20 fade-in">
                  <div className="loading-dots mx-auto mb-6">
                    <div></div>
                    <div></div>
                    <div></div>
                  </div>
                  <p className="text-body text-charcoal-600 dark:text-charcoal-300">
                    Generating evaluation protocols...
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 sm:gap-6 lg:gap-8 stagger-children">
                  {[
                    {
                      title: "Academic Structure",
                      approach: "highly structured, research-grade evaluation",
                      index: 0,
                    },
                    {
                      title: "Minimalist Practitioner",
                      approach: "streamlined, action-oriented evaluation",
                      index: 1,
                    },
                    {
                      title: "Balanced Generalist",
                      approach: "well-rounded, flexible evaluation",
                      index: 2,
                    },
                  ].map((promptInfo) => {
                    const finalPrompt = evalPrompts[promptInfo.index];
                    const streamingText =
                      streamingEvalPrompts[promptInfo.index];
                    const hasContent = finalPrompt?.content || streamingText;

                    return (
                      <div
                        key={promptInfo.index}
                        className="card-elevated p-4 sm:p-6 lg:p-8 flex flex-col h-[60vh] sm:h-[70vh] xl:h-[calc(100vh-16rem)]"
                      >
                        <div className="mb-6 sm:mb-8 flex-shrink-0">
                          <div className="w-8 h-0.5 bg-gold-500 mb-3 sm:mb-4"></div>
                          <h3 className="text-heading-3 text-charcoal-800 dark:text-charcoal-50 mb-2 sm:mb-3">
                            {promptInfo.title}
                          </h3>
                          <p className="text-body-small text-charcoal-600 dark:text-charcoal-300 leading-relaxed">
                            {promptInfo.approach}
                          </p>
                        </div>

                        <div className="bg-charcoal-50 dark:bg-charcoal-800 border border-charcoal-200 dark:border-charcoal-700 p-4 sm:p-6 flex-1 overflow-y-auto mb-6 sm:mb-8">
                          {hasContent ? (
                            <div>
                              <pre className="whitespace-pre-wrap text-sm text-charcoal-800 dark:text-charcoal-200 font-jetbrains leading-relaxed">
                                {finalPrompt?.content || streamingText}
                              </pre>
                              {streamingText && !finalPrompt && (
                                <div className="inline-block w-0.5 h-5 bg-charcoal-600 dark:bg-charcoal-400 animate-pulse ml-1"></div>
                              )}
                            </div>
                          ) : isGeneratingEvals ? (
                            <div className="flex items-center justify-center h-full">
                              <div className="loading-dots">
                                <div></div>
                                <div></div>
                                <div></div>
                              </div>
                            </div>
                          ) : (
                            <div className="text-center h-full flex items-center justify-center text-charcoal-400 dark:text-charcoal-500 text-body">
                              Awaiting generation...
                            </div>
                          )}
                        </div>

                        {finalPrompt?.content && (
                          <div className="flex flex-col sm:flex-row gap-3 flex-shrink-0">
                            <button
                              onClick={() => {
                                handlePromptSelection(promptInfo, finalPrompt);
                              }}
                              className="btn-primary flex-1"
                            >
                              Select Protocol
                            </button>
                            <button
                              onClick={() =>
                                navigator.clipboard.writeText(
                                  finalPrompt.content
                                )
                              }
                              className="btn-secondary px-6"
                            >
                              Copy
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Methodology Sidebar */}
          <MethodologySidebar
            phase={phase}
            currentLoop={currentLoop}
            criticResponses={criticResponses}
          />
        </div>
      </div>
    );
  }

  if (phase === "evaluation") {
    return (
      <BatchScoreFlow
        selectedPrompt={selectedPrompt!}
        onBack={handleBackToBuilder}
      />
    );
  }

  // Conversation phase - Mobile-optimized chat interface with critic sidebar
  return (
    <div className="min-h-screen bg-charcoal-50 dark:bg-charcoal-900 flex">
      {/* Elephant decorations */}
      <ElephantCorner position="top-left" />
      <ElephantCorner position="top-right" />
      <ElephantCorner position="bottom-left" />
      <ElephantCorner position="bottom-right" />


      {/* Main Content */}
      <div className="flex-1 flex flex-col xl:flex-row">
        {/* Chat Interface */}
        <div className="flex-1 flex flex-col lg:flex-row h-screen">
          <div className="flex-1 flex flex-col">
            <div className="card-elevated overflow-hidden flex-1 flex flex-col mx-2 sm:mx-4 my-2 sm:my-4 xl:mx-8 xl:my-8">
              {/* Header */}
              <div className="bg-charcoal-800 dark:bg-charcoal-900 text-charcoal-50 p-4 sm:p-6 lg:p-8 flex-shrink-0">
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
                  <div className="flex-1">
                    <h1 className="text-heading-2 mb-2">
                      DeepAtuin: {selectedCriteria}
                    </h1>
                    <p className="text-body-small text-charcoal-200">
                      Conversation {currentLoop + 1} of {MAX_LOOPS + 1} ·
                      Information gathering
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={resetBuilder}
                      className="btn-secondary text-charcoal-800 bg-charcoal-50 border-charcoal-200 hover:bg-charcoal-100"
                    >
                      Reset
                    </button>
                  </div>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="bg-charcoal-200 dark:bg-charcoal-700 h-1 flex-shrink-0">
                <div
                  className="bg-gold-500 h-1 transition-all duration-300 progress-bar"
                  style={{
                    width: `${((currentLoop + 1) / (MAX_LOOPS + 1)) * 100}%`,
                  }}
                />
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 space-y-4 sm:space-y-6">
                {messages.map((message, index) => (
                  <div
                    key={index}
                    className={`flex fade-in ${
                      message.role === "user" ? "justify-end" : "justify-start"
                    }`}
                    style={{ animationDelay: `${index * 0.1}s` }}
                  >
                    <div
                      className={`max-w-[85%] sm:max-w-3xl p-4 sm:p-6 ${
                        message.role === "user"
                          ? "bg-charcoal-800 dark:bg-charcoal-700 text-charcoal-50 border border-charcoal-700 dark:border-charcoal-600"
                          : "bg-charcoal-100 dark:bg-charcoal-800 text-charcoal-800 dark:text-charcoal-200 border border-charcoal-200 dark:border-charcoal-700"
                      }`}
                    >
                      <div className="text-body leading-relaxed whitespace-pre-wrap">
                        {message.content}
                      </div>
                      <div className="text-caption mt-3 opacity-60">
                        {message.timestamp.toLocaleTimeString()}
                      </div>
                    </div>
                  </div>
                ))}

                {/* Streaming content */}
                {isStreaming && streamingContent && (
                  <div className="flex justify-start fade-in">
                    <div className="max-w-[85%] sm:max-w-3xl p-4 sm:p-6 bg-charcoal-100 dark:bg-charcoal-800 text-charcoal-800 dark:text-charcoal-200 border border-charcoal-200 dark:border-charcoal-700">
                      <div className="text-body leading-relaxed whitespace-pre-wrap">
                        {streamingContent}
                        <div className="inline-block w-0.5 h-5 bg-charcoal-600 dark:bg-charcoal-400 animate-pulse ml-1"></div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Loading indicators */}
                {isCriticizing && (
                  <div className="flex justify-start fade-in">
                    <div className="max-w-[85%] sm:max-w-3xl p-4 sm:p-6 bg-charcoal-100 dark:bg-charcoal-800 text-charcoal-800 dark:text-charcoal-200 border border-charcoal-200 dark:border-charcoal-700">
                      <div className="flex items-center gap-3">
                        <div className="loading-dots">
                          <div></div>
                          <div></div>
                          <div></div>
                        </div>
                        <span className="text-body-small text-charcoal-600 dark:text-charcoal-400">
                          Critical agent analyzing conversation...
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                <div ref={messagesEndRef} />
              </div>

              {/* Input Area */}
              <div className="flex-shrink-0 p-4 sm:p-6 bg-charcoal-50 dark:bg-charcoal-800 border-t border-charcoal-200 dark:border-charcoal-700">
                <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
                  <textarea
                    ref={textareaRef}
                    value={currentInput}
                    onChange={(e) => setCurrentInput(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder="Continue the conversation..."
                    className="flex-1 resize-none border border-charcoal-300 dark:border-charcoal-600 p-3 sm:p-4 text-body bg-white dark:bg-charcoal-900 text-charcoal-800 dark:text-charcoal-200 placeholder-charcoal-400 dark:placeholder-charcoal-500 focus:outline-none focus:border-charcoal-500 dark:focus:border-gold-500 transition-colors min-h-[80px] sm:min-h-[100px]"
                    rows={3}
                    disabled={isLoading}
                  />
                  <button
                    onClick={handleSendMessage}
                    disabled={isLoading || !currentInput.trim()}
                    className="btn-primary px-6 sm:px-8 self-end sm:self-end disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Send
                  </button>
                </div>
                {currentLoop >= MAX_LOOPS && (
                  <div className="mt-3 sm:mt-4 text-body-small text-charcoal-600 dark:text-charcoal-400 text-center">
                    Conversation complete. Next message will generate evaluation
                    protocols.
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Criticizer Feedback Sidebar */}
          <CritizerFeedbackSidebar
            criticResponses={criticResponses}
            isVisible={showCriticSidebar}
          />
        </div>

        {/* Methodology Sidebar */}
        <MethodologySidebar
          phase={phase}
          currentLoop={currentLoop}
          criticResponses={criticResponses}
        />
      </div>
    </div>
  );
}
