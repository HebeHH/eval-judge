'use client';

import React, { useState, useRef, useEffect } from 'react';
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
  createEvalGeneratorPrompt
} from '@/constants/prompts';
import BatchScoreFlow from './BatchScoreFlow';
import '../cssSpinny.css';

type EvaluationCriteria = 'WITTY' | 'INTELLIGENT' | 'KIND';

interface Message {
  role: 'user' | 'assistant';
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

const MAX_LOOPS = 3;

export default function EvalPromptBuilder() {
  const [selectedCriteria, setSelectedCriteria] = useState<EvaluationCriteria | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [currentInput, setCurrentInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [isCriticizing, setIsCriticizing] = useState(false);
  const [currentLoop, setCurrentLoop] = useState(0);
  const [phase, setPhase] = useState<'selection' | 'conversation' | 'generation' | 'evaluation'>('selection');
  const [evalPrompts, setEvalPrompts] = useState<EvalPrompt[]>([]);
  const [streamingContent, setStreamingContent] = useState('');
  const [streamingEvalPrompts, setStreamingEvalPrompts] = useState<{[key: number]: string}>({});
  const [isGeneratingEvals, setIsGeneratingEvals] = useState(false);
  const [selectedPrompt, setSelectedPrompt] = useState<SelectedPrompt | null>(null);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, streamingContent]);

  const handleCriteriaSelection = (criteria: EvaluationCriteria) => {
    setSelectedCriteria(criteria);
    setPhase('conversation');
    
    // Add the default question as the first assistant message
    const defaultQuestion = DEFAULT_QUESTIONS[criteria];
    setMessages([{
      role: 'assistant',
      content: defaultQuestion,
      timestamp: new Date()
    }]);
  };

  const handlePromptSelection = (promptInfo: { title: string; approach: string; index: number }, finalPrompt: EvalPrompt) => {
    const selected: SelectedPrompt = {
      title: promptInfo.title,
      approach: promptInfo.approach,
      content: finalPrompt.content,
      criteria: selectedCriteria || 'UNKNOWN'
    };
    
    setSelectedPrompt(selected);
    setPhase('evaluation');
  };

  const handleBackToBuilder = () => {
    setSelectedPrompt(null);
    setPhase('generation');
  };

  const callLLMAPI = async (systemPrompt: string, userMessage: string): Promise<string> => {
    const response = await fetch('/api/prompt', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        system: systemPrompt,
        messages: [{ role: 'user', content: userMessage }]
      })
    });

    if (!response.ok) {
      throw new Error('Failed to get LLM response');
    }

    const data = await response.json();
    return data.response;
  };

  const streamLLMResponse = async (systemPrompt: string, userMessage: string): Promise<string> => {
    setIsStreaming(true);
    setStreamingContent('');
    
    try {
      // For now, we'll simulate streaming by calling the regular API and displaying it progressively
      const fullResponse = await callLLMAPI(systemPrompt, userMessage);
      
      // Simulate streaming by revealing the text progressively
      const words = fullResponse.split(' ');
      let currentText = '';
      
      for (let i = 0; i < words.length; i++) {
        currentText += (i > 0 ? ' ' : '') + words[i];
        setStreamingContent(currentText);
        await new Promise(resolve => setTimeout(resolve, 50)); // 50ms delay between words
      }
      
      setIsStreaming(false);
      setStreamingContent('');
      return fullResponse;
    } catch (error) {
      setIsStreaming(false);
      setStreamingContent('');
      throw error;
    }
  };

  const streamEvalPrompt = async (systemPrompt: string, userMessage: string, promptIndex: number): Promise<string> => {
    try {
      // Call the API to get the full response
      const fullResponse = await callLLMAPI(systemPrompt, userMessage);
      
      // Simulate streaming by revealing the text progressively
      const words = fullResponse.split(' ');
      let currentText = '';
      
      for (let i = 0; i < words.length; i++) {
        currentText += (i > 0 ? ' ' : '') + words[i];
        setStreamingEvalPrompts(prev => ({
          ...prev,
          [promptIndex]: currentText
        }));
        await new Promise(resolve => setTimeout(resolve, 30)); // Faster streaming for eval prompts
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
      role: 'user',
      content: currentInput.trim(),
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setCurrentInput('');
    setIsLoading(true);

    try {
      if (currentLoop < MAX_LOOPS) {
        // LLM Loop: Criticizer -> Questioner -> Stream to user
        
        // 1. Call criticizer agent
        setIsCriticizing(true);
        const conversationHistory = formatConversationForAgent([...messages, userMessage]);
        const criticPrompt = createCriticPrompt(conversationHistory);
        const criticism = await callLLMAPI(CRITICIZER_SYSTEM_PROMPT, criticPrompt);
        
        // Log criticizer response to console
        console.log('Criticizer Response:', criticism);
        
        setIsCriticizing(false);
        
        // 2. Call questioner agent and stream response
        const questionerPrompt = createQuestionerPrompt(conversationHistory, criticism);
        const questionerResponse = await streamLLMResponse(QUESTIONER_SYSTEM_PROMPT, questionerPrompt);
        
        // 3. Add the response to messages
        const assistantMessage: Message = {
          role: 'assistant',
          content: questionerResponse,
          timestamp: new Date()
        };
        
        setMessages(prev => [...prev, assistantMessage]);
        setCurrentLoop(prev => prev + 1);
      } else {
        // Final loop - generate evaluation prompts
        const finalMessages = [...messages, userMessage];
        await generateEvalPrompts(finalMessages);
        setPhase('generation');
      }
    } catch (error) {
      console.error('Error in conversation:', error);
      // Add error message
      const errorMessage: Message = {
        role: 'assistant',
        content: 'I apologize, but I encountered an error. Please try again.',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const generateEvalPrompts = async (finalMessages: Message[]) => {
    setIsGeneratingEvals(true);
    setStreamingEvalPrompts({});
    
    try {
      const conversationHistory = formatConversationForAgent(finalMessages);
      const evalPrompt = createEvalGeneratorPrompt(conversationHistory);
      
      // Generate all three prompts in parallel with streaming
      const promptPromises = [
        streamEvalPrompt(EVAL_GENERATOR_SYSTEM_PROMPT_1, evalPrompt, 0),
        streamEvalPrompt(EVAL_GENERATOR_SYSTEM_PROMPT_2, evalPrompt, 1),
        streamEvalPrompt(EVAL_GENERATOR_SYSTEM_PROMPT_3, evalPrompt, 2)
      ];
      
      const results = await Promise.all(promptPromises);
      
      const newEvalPrompts: EvalPrompt[] = [
        {
          title: 'Academic Structure',
          approach: 'highly structured, research-grade eval',
          content: results[0]
        },
        {
          title: 'Minimalist Practitioner',
          approach: 'streamlined, action-oriented evaluation',
          content: results[1]
        },
        {
          title: 'Balanced Generalist',
          approach: 'well-rounded, flexible evaluation',
          content: results[2]
        }
      ];
      
      setEvalPrompts(newEvalPrompts);
    } catch (error) {
      console.error('Error generating evaluation prompts:', error);
    } finally {
      setIsGeneratingEvals(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const resetBuilder = () => {
    setSelectedCriteria(null);
    setMessages([]);
    setCurrentInput('');
    setCurrentLoop(0);
    setPhase('selection');
    setEvalPrompts([]);
    setSelectedPrompt(null);
  };

  // Selection phase
  if (phase === 'selection') {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-8">
            <h1 className="text-2xl font-semibold text-royal-heath-900 mb-3">
              Evaluation Prompt Builder
            </h1>
            <p className="text-base text-royal-heath-700">
              Create comprehensive evaluation prompts with AI assistance
            </p>
          </div>

          <div className="bg-white rounded-lg shadow-sm border p-6">
            <h2 className="text-lg font-medium text-royal-heath-800 mb-4 text-center">
              Select Your Evaluation Criteria
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {(['WITTY', 'INTELLIGENT', 'KIND'] as const).map((criteria) => (
                <button
                  key={criteria}
                  onClick={() => handleCriteriaSelection(criteria)}
                  className="p-4 border border-royal-heath-200 rounded-lg hover:border-royal-heath-400 hover:bg-royal-heath-50 transition-all duration-200 group"
                >
                  <div className="text-center">
                    <h3 className="text-base font-medium text-royal-heath-800 mb-2">
                      {criteria}
                    </h3>
                    <p className="text-royal-heath-600 text-sm">
                      {criteria === 'WITTY' && 'Evaluate humor, cleverness, and wit'}
                      {criteria === 'INTELLIGENT' && 'Assess reasoning, knowledge, and insight'}
                      {criteria === 'KIND' && 'Measure empathy, supportiveness, and care'}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (phase === 'generation') {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-full mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-6">
            <h1 className="text-xl font-semibold text-royal-heath-900 mb-3">
              Your Evaluation Prompts for {selectedCriteria}
            </h1>
            <p className="text-royal-heath-700 text-sm">
              Three different approaches to evaluating {selectedCriteria?.toLowerCase()} responses
            </p>
            <button
              onClick={resetBuilder}
              className="mt-3 px-3 py-2 bg-royal-heath-600 text-white rounded-md hover:bg-royal-heath-700 transition-colors text-sm"
            >
              Start Over
            </button>
          </div>

          {isLoading ? (
            <div className="text-center py-12">
              <div className="loader mx-auto mb-4"></div>
              <p className="text-royal-heath-700 text-sm">Generating your evaluation prompts...</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
              {[
                {
                  title: 'Academic Structure',
                  approach:"highly structured, research-grade eval",
                  index: 0
                },
                {
                  title: 'Minimalist Practitioner',
                  approach: 'streamlined, action-oriented evaluation',
                  index: 1
                },
                {
                  title: 'Balanced Generalist',
                  approach: 'well-rounded, flexible evaluation',
                  index: 2
                }
              ].map((promptInfo) => {
                const finalPrompt = evalPrompts[promptInfo.index];
                const streamingText = streamingEvalPrompts[promptInfo.index];
                const hasContent = finalPrompt?.content || streamingText;
                
                return (
                  <div key={promptInfo.index} className="bg-white rounded-lg shadow-sm border p-6 flex flex-col h-[calc(100vh-12rem)]">
                    <div className="mb-4 flex-shrink-0">
                      <h3 className="text-lg font-medium text-royal-heath-800 mb-2">
                        {promptInfo.title}
                      </h3>
                      <p className="text-sm text-royal-heath-600 mb-3">
                        {promptInfo.approach}
                      </p>
                    </div>
                    
                    <div className="bg-royal-heath-50 rounded-md p-4 flex-1 overflow-y-auto mb-4">
                      {hasContent ? (
                        <div>
                          <pre className="whitespace-pre-wrap text-xs text-royal-heath-800 font-mono leading-relaxed">
                            {finalPrompt?.content || streamingText}
                          </pre>
                          {streamingText && !finalPrompt && (
                            <div className="inline-block w-2 h-4 bg-royal-heath-600 animate-pulse ml-1"></div>
                          )}
                        </div>
                      ) : isGeneratingEvals ? (
                        <div className="flex items-center justify-center h-full">
                          <div className="flex space-x-1">
                            <div className="w-2 h-2 bg-royal-heath-600 rounded-full animate-bounce"></div>
                            <div className="w-2 h-2 bg-royal-heath-600 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                            <div className="w-2 h-2 bg-royal-heath-600 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                          </div>
                        </div>
                      ) : (
                        <div className="text-center h-full flex items-center justify-center text-royal-heath-500 text-sm">
                          Waiting to generate...
                        </div>
                      )}
                    </div>
                    
                    {finalPrompt?.content && (
                      <div className="flex gap-2 flex-shrink-0">
                        <button
                          onClick={() => {
                            handlePromptSelection(promptInfo, finalPrompt);
                          }}
                          className="flex-1 px-4 py-2 bg-royal-heath-600 text-white rounded-md hover:bg-royal-heath-700 transition-colors font-medium text-sm"
                        >
                          Select This Prompt
                        </button>
                        <button
                          onClick={() => navigator.clipboard.writeText(finalPrompt.content)}
                          className="px-4 py-2 bg-royal-heath-100 text-royal-heath-700 border border-royal-heath-300 rounded-md hover:bg-royal-heath-200 transition-colors font-medium text-sm"
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
    );
  }

  if (phase === 'evaluation') {
    return (
      <BatchScoreFlow
        selectedPrompt={selectedPrompt!}
        onBack={handleBackToBuilder}
      />
    );
  }

  // Conversation phase
  return (
    <div className="min-h-screen bg-gray-100 py-6">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 h-[92vh] flex flex-col">
        <div className="bg-white rounded-lg shadow-sm border overflow-hidden flex-1 flex flex-col">
          {/* Header */}
          <div className="bg-royal-heath-600 text-white p-4 flex-shrink-0">
            <div className="flex justify-between items-center">
              <div>
                <h1 className="text-lg font-medium">
                  Building Evaluation for: {selectedCriteria}
                </h1>
                <p className="text-royal-heath-100 mt-1 text-sm">
                  Conversation {currentLoop + 1} of {MAX_LOOPS + 1}
                </p>
              </div>
              <button
                onClick={resetBuilder}
                className="px-3 py-2 bg-royal-heath-700 hover:bg-royal-heath-800 rounded-md transition-colors text-sm"
              >
                Start Over
              </button>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="bg-royal-heath-200 h-1 flex-shrink-0">
            <div 
              className="bg-royal-heath-600 h-1 transition-all duration-300"
              style={{ width: `${((currentLoop + 1) / (MAX_LOOPS + 1)) * 100}%` }}
            />
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {messages.map((message, index) => (
              <div
                key={index}
                className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-3xl p-3 rounded-lg ${
                    message.role === 'user'
                      ? 'bg-royal-heath-600 text-white'
                      : 'bg-royal-heath-100 text-royal-heath-800'
                  }`}
                >
                  <div className="whitespace-pre-wrap text-sm">{message.content}</div>
                  <div className={`text-xs mt-1 ${
                    message.role === 'user' ? 'text-royal-heath-200' : 'text-royal-heath-500'
                  }`}>
                    {message.timestamp.toLocaleTimeString()}
                  </div>
                </div>
              </div>
            ))}
            
            {/* Streaming content */}
            {isStreaming && streamingContent && (
              <div className="flex justify-start">
                <div className="max-w-3xl p-3 rounded-lg bg-royal-heath-100 text-royal-heath-800">
                  <div className="whitespace-pre-wrap text-sm">{streamingContent}</div>
                  <div className="inline-block w-2 h-3 bg-royal-heath-600 animate-pulse ml-1"></div>
                </div>
              </div>
            )}
            
            {/* Criticizer loading animation */}
            {isCriticizing && (
              <div className="flex justify-start">
                <div className="max-w-3xl p-3 rounded-lg bg-royal-heath-100 text-royal-heath-800">
                  <div className="flex items-center space-x-2">
                    <div className="flex space-x-1">
                      <div className="w-1.5 h-1.5 bg-royal-heath-600 rounded-full animate-bounce"></div>
                      <div className="w-1.5 h-1.5 bg-royal-heath-600 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                      <div className="w-1.5 h-1.5 bg-royal-heath-600 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                    </div>
                    <span className="text-sm">Analyzing conversation...</span>
                  </div>
                </div>
              </div>
            )}
            
            {isLoading && !isStreaming && !isCriticizing && (
              <div className="flex justify-start">
                <div className="max-w-3xl p-3 rounded-lg bg-royal-heath-100 text-royal-heath-800">
                  <div className="flex items-center space-x-2">
                    <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-royal-heath-600"></div>
                    <span className="text-sm">Thinking...</span>
                  </div>
                </div>
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="border-t border-royal-heath-200 p-4 flex-shrink-0">
            <div className="flex space-x-3">
              <textarea
                ref={textareaRef}
                value={currentInput}
                onChange={(e) => setCurrentInput(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Share your thoughts about the evaluation criteria..."
                className="flex-1 p-3 border border-royal-heath-300 rounded-md focus:outline-none focus:ring-2 focus:ring-royal-heath-500 resize-none text-gray-900 placeholder-gray-500 bg-white text-sm"
                rows={2}
                disabled={isLoading}
              />
              <button
                onClick={handleSendMessage}
                disabled={!currentInput.trim() || isLoading}
                className="px-4 py-2 bg-royal-heath-600 text-white rounded-md hover:bg-royal-heath-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm"
              >
                Send
              </button>
            </div>
            <p className="text-xs text-royal-heath-500 mt-2">
              Press Enter to send, Shift+Enter for new line
            </p>
          </div>
        </div>
      </div>
    </div>
  );
} 