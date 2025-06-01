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

const MAX_LOOPS = 3;

export default function EvalPromptBuilder() {
  const [selectedCriteria, setSelectedCriteria] = useState<EvaluationCriteria | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [currentInput, setCurrentInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [isCriticizing, setIsCriticizing] = useState(false);
  const [currentLoop, setCurrentLoop] = useState(0);
  const [phase, setPhase] = useState<'selection' | 'conversation' | 'generation'>('selection');
  const [evalPrompts, setEvalPrompts] = useState<EvalPrompt[]>([]);
  const [streamingContent, setStreamingContent] = useState('');
  const [streamingEvalPrompts, setStreamingEvalPrompts] = useState<{[key: number]: string}>({});
  const [isGeneratingEvals, setIsGeneratingEvals] = useState(false);
  
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
        
        // 3. Add questioner response to messages
        const assistantMessage: Message = {
          role: 'assistant',
          content: questionerResponse,
          timestamp: new Date()
        };
        
        setMessages(prev => [...prev, assistantMessage]);
        setCurrentLoop(prev => prev + 1);
      } else {
        // After MAX_LOOPS, generate eval prompts
        setPhase('generation');
        await generateEvalPrompts([...messages, userMessage]);
      }
    } catch (error) {
      console.error('Error in conversation:', error);
      setIsCriticizing(false);
      // Add error message
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: 'I apologize, but I encountered an error. Please try again.',
        timestamp: new Date()
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const generateEvalPrompts = async (finalMessages: Message[]) => {
    setIsLoading(true);
    
    try {
      const conversationHistory = formatConversationForAgent(finalMessages);
      const evalPrompt = createEvalGeneratorPrompt(conversationHistory);
      
      // Call all three eval generator agents in parallel
      const [response1, response2, response3] = await Promise.all([
        callLLMAPI(EVAL_GENERATOR_SYSTEM_PROMPT_1, evalPrompt),
        callLLMAPI(EVAL_GENERATOR_SYSTEM_PROMPT_2, evalPrompt),
        callLLMAPI(EVAL_GENERATOR_SYSTEM_PROMPT_3, evalPrompt)
      ]);
      
      setEvalPrompts([
        {
          title: 'Precision-Focused Evaluation',
          content: response1,
          approach: 'Emphasizes clarity, measurability, and practical application'
        },
        {
          title: 'Holistic Assessment',
          content: response2,
          approach: 'Balances multiple dimensions with contextual understanding'
        },
        {
          title: 'Research-Grade Framework',
          content: response3,
          approach: 'Comprehensive, systematic approach with academic rigor'
        }
      ]);
    } catch (error) {
      console.error('Error generating eval prompts:', error);
    } finally {
      setIsLoading(false);
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
    setStreamingContent('');
    setIsCriticizing(false);
  };

  if (phase === 'selection') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-royal-heath-50 to-royal-heath-100 py-8">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h1 className="text-4xl font-bold text-royal-heath-900 mb-4">
              Evaluation Prompt Builder
            </h1>
            <p className="text-lg text-royal-heath-700">
              Create comprehensive evaluation prompts with AI assistance
            </p>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-8">
            <h2 className="text-2xl font-semibold text-royal-heath-800 mb-6 text-center">
              Select Your Evaluation Criteria
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {(['WITTY', 'INTELLIGENT', 'KIND'] as const).map((criteria) => (
                <button
                  key={criteria}
                  onClick={() => handleCriteriaSelection(criteria)}
                  className="p-6 border-2 border-royal-heath-200 rounded-lg hover:border-royal-heath-400 hover:bg-royal-heath-50 transition-all duration-200 group"
                >
                  <div className="text-center">
                    <div className="text-3xl mb-3">
                      {criteria === 'WITTY' && '🎭'}
                      {criteria === 'INTELLIGENT' && '🧠'}
                      {criteria === 'KIND' && '💝'}
                    </div>
                    <h3 className="text-xl font-semibold text-royal-heath-800 mb-2">
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
      <div className="min-h-screen bg-gradient-to-br from-royal-heath-50 to-royal-heath-100 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-royal-heath-900 mb-4">
              Your Evaluation Prompts for {selectedCriteria}
            </h1>
            <p className="text-royal-heath-700">
              Three different approaches to evaluating {selectedCriteria?.toLowerCase()} responses
            </p>
            <button
              onClick={resetBuilder}
              className="mt-4 px-4 py-2 bg-royal-heath-600 text-white rounded-lg hover:bg-royal-heath-700 transition-colors"
            >
              Start Over
            </button>
          </div>

          {isLoading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-royal-heath-600 mx-auto mb-4"></div>
              <p className="text-royal-heath-700">Generating your evaluation prompts...</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {evalPrompts.map((prompt, index) => (
                <div key={index} className="bg-white rounded-xl shadow-lg p-6">
                  <div className="mb-4">
                    <h3 className="text-xl font-semibold text-royal-heath-800 mb-2">
                      {prompt.title}
                    </h3>
                    <p className="text-sm text-royal-heath-600 mb-4">
                      {prompt.approach}
                    </p>
                  </div>
                  
                  <div className="bg-royal-heath-50 rounded-lg p-4 max-h-96 overflow-y-auto">
                    <pre className="whitespace-pre-wrap text-sm text-royal-heath-800 font-mono">
                      {prompt.content}
                    </pre>
                  </div>
                  
                  <button
                    onClick={() => navigator.clipboard.writeText(prompt.content)}
                    className="mt-4 w-full px-4 py-2 bg-royal-heath-600 text-white rounded-lg hover:bg-royal-heath-700 transition-colors"
                  >
                    Copy to Clipboard
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  // Conversation phase
  return (
    <div className="min-h-screen bg-gradient-to-br from-royal-heath-50 to-royal-heath-100 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 h-screen flex flex-col">
        <div className="bg-white rounded-xl shadow-lg overflow-hidden flex-1 flex flex-col">
          {/* Header */}
          <div className="bg-royal-heath-600 text-white p-6 flex-shrink-0">
            <div className="flex justify-between items-center">
              <div>
                <h1 className="text-2xl font-bold">
                  Building Evaluation for: {selectedCriteria}
                </h1>
                <p className="text-royal-heath-100 mt-1">
                  Conversation {currentLoop + 1} of {MAX_LOOPS + 1}
                </p>
              </div>
              <button
                onClick={resetBuilder}
                className="px-4 py-2 bg-royal-heath-700 hover:bg-royal-heath-800 rounded-lg transition-colors"
              >
                Start Over
              </button>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="bg-royal-heath-200 h-2 flex-shrink-0">
            <div 
              className="bg-royal-heath-600 h-2 transition-all duration-300"
              style={{ width: `${((currentLoop + 1) / (MAX_LOOPS + 1)) * 100}%` }}
            />
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {messages.map((message, index) => (
              <div
                key={index}
                className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-3xl p-4 rounded-lg ${
                    message.role === 'user'
                      ? 'bg-royal-heath-600 text-white'
                      : 'bg-royal-heath-100 text-royal-heath-800'
                  }`}
                >
                  <div className="whitespace-pre-wrap">{message.content}</div>
                  <div className={`text-xs mt-2 ${
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
                <div className="max-w-3xl p-4 rounded-lg bg-royal-heath-100 text-royal-heath-800">
                  <div className="whitespace-pre-wrap">{streamingContent}</div>
                  <div className="inline-block w-2 h-4 bg-royal-heath-600 animate-pulse ml-1"></div>
                </div>
              </div>
            )}
            
            {/* Criticizer loading animation */}
            {isCriticizing && (
              <div className="flex justify-start">
                <div className="max-w-3xl p-4 rounded-lg bg-royal-heath-100 text-royal-heath-800">
                  <div className="flex items-center space-x-2">
                    <div className="flex space-x-1">
                      <div className="w-2 h-2 bg-royal-heath-600 rounded-full animate-bounce"></div>
                      <div className="w-2 h-2 bg-royal-heath-600 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                      <div className="w-2 h-2 bg-royal-heath-600 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                    </div>
                    <span>Analyzing conversation...</span>
                  </div>
                </div>
              </div>
            )}
            
            {isLoading && !isStreaming && !isCriticizing && (
              <div className="flex justify-start">
                <div className="max-w-3xl p-4 rounded-lg bg-royal-heath-100 text-royal-heath-800">
                  <div className="flex items-center space-x-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-royal-heath-600"></div>
                    <span>Thinking...</span>
                  </div>
                </div>
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="border-t border-royal-heath-200 p-6 flex-shrink-0">
            <div className="flex space-x-4">
              <textarea
                ref={textareaRef}
                value={currentInput}
                onChange={(e) => setCurrentInput(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Share your thoughts about the evaluation criteria..."
                className="flex-1 p-3 border border-royal-heath-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-royal-heath-500 resize-none text-gray-900 placeholder-gray-500 bg-white"
                rows={3}
                disabled={isLoading}
              />
              <button
                onClick={handleSendMessage}
                disabled={!currentInput.trim() || isLoading}
                className="px-6 py-3 bg-royal-heath-600 text-white rounded-lg hover:bg-royal-heath-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Send
              </button>
            </div>
            <p className="text-sm text-royal-heath-500 mt-2">
              Press Enter to send, Shift+Enter for new line
            </p>
          </div>
        </div>
      </div>
    </div>
  );
} 