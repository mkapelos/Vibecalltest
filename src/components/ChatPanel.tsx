import React, { useState, useEffect, useRef } from "react";
import { Send, X, MessageSquare, Smile } from "lucide-react";
import { Message } from "../types";
import { motion, AnimatePresence } from "motion/react";

interface ChatPanelProps {
  messages: Message[];
  localUserId: string;
  onSendMessage: (text: string) => void;
  onClose: () => void;
}

const QUICK_EMOJIS = ["👍", "❤️", "😂", "🎉", "😮", "🔥", "👏"];

export default function ChatPanel({ messages, localUserId, onSendMessage, onClose }: ChatPanelProps) {
  const [inputText, setInputText] = useState("");
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;
    onSendMessage(inputText);
    setInputText("");
    setShowEmojiPicker(false);
  };

  const handleQuickEmojiClick = (emoji: string) => {
    onSendMessage(emoji);
    setShowEmojiPicker(false);
  };

  return (
    <div className="w-full lg:w-96 h-full bg-white/5 backdrop-blur-xl border-l border-white/10 flex flex-col justify-between shadow-2xl z-20 relative font-sans">
      {/* Chat Header */}
      <div className="p-4 border-b border-white/10 flex items-center justify-between bg-white/5 backdrop-blur-md">
        <div className="flex items-center space-x-2.5">
          <div className="bg-white/10 text-indigo-300 p-2 rounded-xl border border-white/10">
            <MessageSquare className="w-4 h-4" />
          </div>
          <div>
            <h2 className="font-bold text-white text-sm">Room Group Chat</h2>
            <span className="text-slate-300 text-[10px] font-mono uppercase tracking-wider block">
              {messages.length} messages
            </span>
          </div>
        </div>
        <button
          onClick={onClose}
          className="text-slate-300 hover:text-white hover:bg-white/10 p-1.5 rounded-lg transition-all cursor-pointer"
          title="Close chat"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Messages Scrolling Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar bg-transparent">
        <AnimatePresence initial={false}>
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-3">
              <div className="bg-white/5 text-slate-300 p-4 rounded-full border border-white/10">
                <MessageSquare className="w-8 h-8" />
              </div>
              <div>
                <p className="text-white text-sm font-semibold">Welcome to the Room!</p>
                <p className="text-slate-300/80 text-xs mt-1">
                  Type a message below or click an emoji to start chatting with other call participants.
                </p>
              </div>
            </div>
          ) : (
            messages.map((msg) => {
              const isMe = msg.userId === localUserId;
              return (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, y: 12, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{ type: "spring", stiffness: 350, damping: 25 }}
                  className={`flex flex-col ${isMe ? "items-end" : "items-start"}`}
                >
                  {/* Sender Name */}
                  {!isMe && (
                    <span className="text-[10px] font-semibold text-slate-300 ml-1 mb-1 font-mono">
                      {msg.userName}
                    </span>
                  )}
                  {/* Bubble */}
                  <div
                    className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm shadow-md leading-relaxed break-words ${
                      isMe
                        ? "bg-gradient-to-r from-indigo-500 to-indigo-600 text-white rounded-tr-none border border-white/10"
                        : "bg-white/5 text-slate-100 rounded-tl-none border border-white/10 backdrop-blur-md"
                    }`}
                  >
                    {msg.text}
                  </div>
                  {/* Timestamp */}
                  <span className="text-[9px] font-mono text-white/40 mt-1 mx-1">{msg.timestamp}</span>
                </motion.div>
              );
            })
          )}
        </AnimatePresence>
        <div ref={messagesEndRef} />
      </div>

      {/* Chat Footer / Input area */}
      <div className="p-4 border-t border-white/10 bg-white/5 backdrop-blur-md space-y-3">
        {/* Quick Emojis Drawer Toggle */}
        <div className="flex items-center space-x-1.5 overflow-x-auto py-1 pr-1 custom-scrollbar">
          {QUICK_EMOJIS.map((emoji) => (
            <button
              key={emoji}
              onClick={() => handleQuickEmojiClick(emoji)}
              className="text-sm bg-white/5 hover:bg-white/10 active:bg-white/15 border border-white/10 px-2.5 py-1.5 rounded-xl transition-all cursor-pointer transform hover:scale-105 active:scale-95 text-white"
            >
              {emoji}
            </button>
          ))}
          <button
            onClick={() => setShowEmojiPicker(!showEmojiPicker)}
            className={`p-1.5 rounded-xl border transition-all cursor-pointer ${
              showEmojiPicker
                ? "bg-indigo-600 border-white/20 text-white"
                : "bg-white/5 border-white/10 text-slate-300 hover:text-white hover:bg-white/10"
            }`}
            title="Emoji drawer"
          >
            <Smile className="w-4 h-4" />
          </button>
        </div>

        {/* Extended Emoji Picker Draw */}
        {showEmojiPicker && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="grid grid-cols-7 gap-1.5 p-2 bg-white/10 backdrop-blur-xl rounded-2xl border border-white/10 shadow-inner"
          >
            {["😀", "😃", "😄", "😁", "😆", "😅", "😂", "🤣", "😊", "😇", "🙂", "🙃", "😉", "😌", "😍", "🥰", "😘", "😜", "🤪", "😎", "🥳", "🤔", "👀", "🚀", "🎉", "🔥", "✨", "❤️"].map(
              (emoji) => (
                <button
                  key={emoji}
                  onClick={() => handleQuickEmojiClick(emoji)}
                  className="text-lg hover:bg-white/10 p-1.5 rounded-xl transition-all cursor-pointer text-center"
                >
                  {emoji}
                </button>
              )
            )}
          </motion.div>
        )}

        {/* Main Text Input */}
        <form onSubmit={handleSubmit} className="flex items-center space-x-2">
          <input
            type="text"
            placeholder="Type a message..."
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            className="flex-1 bg-white/5 border border-white/10 focus:border-indigo-400 focus:bg-white/10 rounded-2xl px-4 py-3 text-sm text-white placeholder-white/30 outline-none transition-all focus:ring-2 focus:ring-indigo-500/10"
          />
          <button
            type="submit"
            disabled={!inputText.trim()}
            className={`p-3.5 rounded-2xl flex items-center justify-center transition-all ${
              inputText.trim()
                ? "bg-gradient-to-r from-indigo-500 to-indigo-600 hover:from-indigo-400 hover:to-indigo-500 text-white shadow-lg cursor-pointer border border-white/10"
                : "bg-white/5 text-white/30 border border-white/5 cursor-not-allowed"
            }`}
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
}
