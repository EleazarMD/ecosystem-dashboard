/**
 * Custom hook for handling message sending and AI responses
 */

import { useState, useCallback, useRef } from 'react';
import { useToast } from '@chakra-ui/react';
import { useSemanticToken } from '@/hooks/useSemanticToken';
import { useAdaptiveGlass } from '@/hooks/useAdaptiveGlass';
import { getDashboardAgentInstance } from '../../lib/dashboard-agent-instance';
import { Message } from './MessageBubble';

const dashAI = getDashboardAgentInstance();

interface UseMessageHandlerProps {
  messages: Message[];
  setMessages: React.Dispatch<React.SetStateAction<Message[]>>;
  isVoiceConnected: boolean;
  dashboardContext: any;
  isAudioMuted: boolean;
  voiceEnabled: boolean;
  setStreamingResponse: (response: string) => void;
  setIsResponseStreaming: (streaming: boolean) => void;
  setCaptionsVisible: (visible: boolean) => void;
  setCurrentCaption: (caption: string) => void;
  sendTTSRequest?: (text: string, voice?: string, useNeural?: boolean) => boolean;
}

export const useMessageHandler = ({
  messages,
  setMessages,
  isVoiceConnected,
  dashboardContext,
  isAudioMuted,
  voiceEnabled,
  setStreamingResponse,
  setIsResponseStreaming,
  setCaptionsVisible,
  setCurrentCaption,
  sendTTSRequest,
}: UseMessageHandlerProps) => {
  const [isLoading, setIsLoading] = useState(false);
  const [input, setInput] = useState('');
  const toast = useToast();
  const lastProcessedMessage = useRef<string>('');
  
  const sendMessage = useCallback(async (messageText: string) => {
    if (!messageText.trim() || isLoading) return;
    
    // Prevent duplicate processing of the same message
    if (lastProcessedMessage.current === messageText.trim()) {
      console.log('🚫 Skipping duplicate message:', messageText);
      return;
    }
    lastProcessedMessage.current = messageText.trim();

    const newMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: messageText,
      timestamp: Date.now(),
    };

    const assistantMessageId = `assistant-${Date.now()}`;
    const assistantMessage: Message = {
      id: assistantMessageId,
      role: 'assistant',
      content: '',
      timestamp: Date.now(),
      isStreaming: true,
    };

    setMessages(prev => [...prev, newMessage, assistantMessage]);
    setInput('');
    setIsLoading(true);
    
    console.log('🤖 Processing your request...');

    try {
      // Use DashAI agent with timeout (increased to 50 seconds for slow Mistral)
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('DashAI response timeout after 50 seconds')), 50000);
      });
      
      const dashAIPromise = dashAI.run(messageText, {
        conversationHistory: messages.slice(-6),
        dashboardContext: dashboardContext
      });
      
      const response = await Promise.race([dashAIPromise, timeoutPromise]);
      
      console.log('🎯 DashAI Agent Response:', response);
      
      const fullResponse = typeof response === 'string' 
        ? response 
        : (response as any)?.content || (response as any)?.message || 'I apologize, but I encountered an issue processing your request.';

      // Send response to voice service for TTS if voice is connected
      if (isVoiceConnected && fullResponse && sendTTSRequest) {
        console.log('🔊 Sending response to OpenAI Realtime API for TTS conversion');
        try {
          // Clean markdown formatting for TTS
          const cleanText = fullResponse
            .replace(/\*\*(.+?)\*\*/g, '$1') // Remove bold
            .replace(/\*(.+?)\*/g, '$1')     // Remove italics
            .replace(/`(.+?)`/g, '$1')       // Remove code blocks
            .replace(/^#+\s+/gm, '')         // Remove headers
            .replace(/^[-*]\s+/gm, '')       // Remove bullet points
            .replace(/\n{3,}/g, '\n\n');     // Normalize line breaks
          
          const success = sendTTSRequest(cleanText, 'alloy', true);
          if (success) {
            console.log('✅ Response sent to OpenAI Realtime API for neural TTS');
          } else {
            console.warn('⚠️ Failed to send TTS request - service not available');
          }
        } catch (error) {
          console.error('❌ Failed to send response to voice service:', error);
        }
        
        // Handle TTS and visual feedback
        if (fullResponse) {
          setStreamingResponse(fullResponse);
          setIsResponseStreaming(true);
          setCaptionsVisible(true);
          setCurrentCaption(fullResponse);
          
          // Process TTS (Voice output handled by OpenAI Realtime)
          if (!isAudioMuted && voiceEnabled) {
            try {
              console.log('🔊 Starting TTS playback with streaming text...');
              // TTS handled by OpenAI Realtime API
            } catch (error) {
              console.error('TTS error:', error);
            }
          }
          
          // Hide caption after display time
          setTimeout(() => {
            setIsResponseStreaming(false);
            setCaptionsVisible(false);
            setCurrentCaption('');
          }, Math.max(3000, fullResponse.length * 50));
        }
      }
      
      // Update the streaming message with the full content
      if (fullResponse) {
        setMessages(prev =>
          prev.map(msg =>
            msg.id === assistantMessageId
              ? { ...msg, content: fullResponse, isStreaming: true } 
              : msg
          )
        );

        // After a short delay, turn off streaming to finalize the message bubble
        setTimeout(() => {
          setMessages(prev =>
            prev.map(msg =>
              msg.id === assistantMessageId
                ? { ...msg, isStreaming: false }
                : msg
            )
          );
        }, fullResponse.length * 20);
      }
    } catch (error: any) {
      console.error('Error processing message:', error);
      
      let errorResponse = 'AI Gateway connection failed. Check that AI Gateway (port 8777) and Mistral are running.';
      
      if (error.message?.includes('timeout')) {
        errorResponse = 'AI request timed out. Please verify:\n1. AI Gateway is running on port 8777\n2. Mistral is available: ollama run mistral\n3. Check logs for connection issues';
        console.error('❌ AI timeout - Check AI Gateway (8777) and Mistral model');
      }
      
      // Update the streaming message with error response (NO TTS)
      setMessages(prev =>
        prev.map(msg =>
          msg.id === assistantMessageId
            ? { ...msg, content: errorResponse, isStreaming: false } 
            : msg
        )
      );

      // DO NOT send error to voice service - no fake responses
      console.error('❌ AI request failed - no fallback response sent to TTS');
      
      toast({
        title: 'Response Timeout',
        description: error.message?.includes('timeout') ? 'AI response took too long, provided fallback answer' : 'Failed to process message',
        status: 'warning',
        duration: 3000,
        isClosable: true,
      });
    } finally {
      setIsLoading(false);
    }
  }, [messages, isLoading, toast, isVoiceConnected, dashboardContext, isAudioMuted, voiceEnabled, 
      setMessages, setStreamingResponse, setIsResponseStreaming, setCaptionsVisible, setCurrentCaption]);

  return {
    sendMessage,
    isLoading,
    input,
    setInput,
  };
};
