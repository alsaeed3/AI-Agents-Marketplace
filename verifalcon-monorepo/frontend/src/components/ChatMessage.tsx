'use client';

import React from 'react';

export type MessageType = 'user' | 'bot' | 'system';

export interface Message {
  id: string;
  type: MessageType;
  content: string;
  timestamp: Date;
  imageUrl?: string;
  analysisData?: {
    visual_score?: number;
    brand_detected?: string;
    confidence_tier?: string;
    anomalies?: string[];
  };
}

interface ChatMessageProps {
  message: Message;
}

// Helper function to parse markdown-style links and inline code
function parseMarkdownContent(content: string): React.ReactNode {
  // Split by markdown patterns: [text](url) and `code` and **bold**
  const pattern = /(\[([^\]]+)\]\(([^)]+)\))|(`([^`]+)`)|(\*\*([^*]+)\*\*)/g;
  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  let match;

  while ((match = pattern.exec(content)) !== null) {
    // Add text before the match
    if (match.index > lastIndex) {
      parts.push(content.slice(lastIndex, match.index));
    }

    if (match[1]) {
      // It's a link [text](url)
      const linkText = match[2];
      const url = match[3];
      parts.push(
        <a
          key={match.index}
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-600 hover:text-blue-700 underline decoration-blue-300 hover:decoration-blue-500 transition-colors font-medium"
        >
          {linkText} ↗
        </a>
      );
    } else if (match[4]) {
      // It's inline code `code`
      const code = match[5];
      parts.push(
        <code
          key={match.index}
          className="px-1.5 py-0.5 bg-gray-100 rounded text-xs font-mono text-gray-800 break-all"
        >
          {code}
        </code>
      );
    } else if (match[6]) {
      // It's bold **text**
      const boldText = match[7];
      parts.push(
        <strong key={match.index} className="font-semibold">
          {boldText}
        </strong>
      );
    }

    lastIndex = match.index + match[0].length;
  }

  // Add remaining text after last match
  if (lastIndex < content.length) {
    parts.push(content.slice(lastIndex));
  }

  return parts.length > 0 ? parts : content;
}

export default function ChatMessage({ message }: ChatMessageProps) {
  const isUser = message.type === 'user';
  const isBot = message.type === 'bot';
  const isSystem = message.type === 'system';

  if (isSystem) {
    return (
      <div className="flex justify-center my-4 animate-fadeIn">
        <div className="px-4 py-2 bg-gray-100 text-gray-600 rounded-full text-sm">
          {message.content}
        </div>
      </div>
    );
  }

  return (
    <div
      className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-4 ${
        isUser ? 'animate-slideInRight' : 'animate-slideInLeft'
      }`}
    >
      <div
        className={`max-w-[85%] md:max-w-[70%] ${
          isUser ? 'items-end' : 'items-start'
        } flex flex-col gap-1`}
      >
        {/* Message Bubble */}
        <div
          className={`px-4 py-3 rounded-2xl ${
            isUser
              ? 'bg-gradient-to-br from-blue-600 to-blue-700 text-white rounded-br-md'
              : 'bg-white text-gray-800 shadow-md rounded-bl-md border border-gray-100'
          }`}
          style={{
            wordBreak: 'break-word',
          }}
        >
          {/* Avatar for Bot */}
          {isBot && (
            <div className="flex items-center gap-2 mb-2 pb-2 border-b border-gray-100">
              <div className="w-6 h-6 bg-gradient-to-br from-purple-500 to-blue-500 rounded-full flex items-center justify-center text-white text-xs font-bold">
                VB
              </div>
              <span className="text-xs font-semibold text-gray-700">VeriBot</span>
            </div>
          )}

          {/* Image Preview */}
          {message.imageUrl && (
            <div className="mb-2">
              <img
                src={message.imageUrl}
                alt="Uploaded"
                className="rounded-lg max-w-full h-auto max-h-48 object-cover"
              />
            </div>
          )}

          {/* Message Content */}
          <p className="text-sm leading-relaxed whitespace-pre-wrap">
            {parseMarkdownContent(message.content)}
          </p>

          {/* Analysis Data Display */}
          {message.analysisData && (
            <div className="mt-3 pt-3 border-t border-gray-200 space-y-2">
              {message.analysisData.visual_score !== undefined && (
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium">Visual Match:</span>
                  <span
                    className={`font-bold ${
                      message.analysisData.visual_score >= 90
                        ? 'text-green-600'
                        : message.analysisData.visual_score >= 70
                        ? 'text-yellow-600'
                        : 'text-red-600'
                    }`}
                  >
                    {message.analysisData.visual_score}%
                  </span>
                </div>
              )}

              {message.analysisData.brand_detected && (
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium">Brand:</span>
                  <span className="text-gray-700">
                    {message.analysisData.brand_detected}
                  </span>
                </div>
              )}

              {message.analysisData.confidence_tier && (
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium">Confidence:</span>
                  <span
                    className={`uppercase text-xs font-bold ${
                      message.analysisData.confidence_tier === 'high'
                        ? 'text-green-600'
                        : message.analysisData.confidence_tier === 'medium'
                        ? 'text-yellow-600'
                        : 'text-red-600'
                    }`}
                  >
                    {message.analysisData.confidence_tier}
                  </span>
                </div>
              )}

              {message.analysisData.anomalies &&
                message.analysisData.anomalies.length > 0 && (
                  <div className="mt-2 p-2 bg-red-50 rounded text-xs">
                    <p className="font-semibold text-red-700 mb-1">
                      ⚠️ Anomalies:
                    </p>
                    <ul className="list-disc list-inside text-red-600 space-y-1">
                      {message.analysisData.anomalies.map((anomaly, idx) => (
                        <li key={idx}>{anomaly}</li>
                      ))}
                    </ul>
                  </div>
                )}
            </div>
          )}
        </div>

        {/* Timestamp */}
        <span
          className={`text-xs text-gray-500 px-2 ${
            isUser ? 'text-right' : 'text-left'
          }`}
        >
          {message.timestamp.toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
          })}
        </span>
      </div>
    </div>
  );
}
