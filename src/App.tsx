import React, { useState, useEffect, useRef } from "react";
import Lobby from "./components/Lobby";
import VideoGrid from "./components/VideoGrid";
import ChatPanel from "./components/ChatPanel";
import RoomControls from "./components/RoomControls";
import { useRoom } from "./hooks/useRoom";
import { motion, AnimatePresence } from "motion/react";
import { Video, RefreshCw, Sparkles, Shield, Compass, ChevronRight } from "lucide-react";

export default function App() {
  // 1. Core routing state
  const [activeRoomId, setActiveRoomId] = useState<string | null>(null);
  
  // 2. User identification state (saved in localStorage for convenience)
  const [userName, setUserName] = useState(() => {
    return localStorage.getItem("facetime_user_name") || "";
  });

  const [userId] = useState(() => {
    const existing = localStorage.getItem("facetime_user_id");
    if (existing) return existing;
    const newId = `user_${Math.random().toString(36).substr(2, 9)}`;
    localStorage.setItem("facetime_user_id", newId);
    return newId;
  });

  // 3. Parse room query parameter from sharing URL (e.g., https://app.com/?room=ROOM123)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const roomParam = params.get("room");
    if (roomParam) {
      const sanitized = roomParam.trim().toUpperCase().replace(/[^A-Z0-9_-]/g, "");
      if (sanitized) {
        setActiveRoomId(sanitized);
      }
    }
  }, []);

  const handleJoinRoom = (roomId: string, name: string) => {
    localStorage.setItem("facetime_user_name", name.trim());
    setUserName(name.trim());
    
    // Add room to search query parameters quietly without reloading the page
    const newUrl = `${window.location.origin}${window.location.pathname}?room=${roomId}`;
    window.history.pushState({ path: newUrl }, "", newUrl);
    
    setActiveRoomId(roomId);
  };

  const handleLeaveRoom = () => {
    // Clear room query parameter
    const newUrl = `${window.location.origin}${window.location.pathname}`;
    window.history.pushState({ path: newUrl }, "", newUrl);
    
    setActiveRoomId(null);
  };

  return (
    <div className="w-full min-h-screen bg-gradient-to-br from-[#1a1a2e] via-[#16213e] to-[#0f3460] text-slate-100 flex flex-col font-sans relative overflow-hidden">
      {/* Background Mesh Orbs */}
      <div className="absolute top-[-100px] left-[-100px] w-[400px] h-[400px] bg-purple-500/20 rounded-full blur-[120px] pointer-events-none animate-pulse" />
      <div className="absolute bottom-[-100px] right-[-100px] w-[500px] h-[500px] bg-blue-500/20 rounded-full blur-[120px] pointer-events-none animate-pulse" />

      <AnimatePresence mode="wait">
        {activeRoomId && userName ? (
          /* Active FaceTime Call Room */
          <motion.div
            key="call-room"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex-1 flex flex-col h-screen z-10"
          >
            <ActiveRoomContent
              roomId={activeRoomId}
              userId={userId}
              userName={userName}
              onLeave={handleLeaveRoom}
            />
          </motion.div>
        ) : (
          /* Main Lobby Gate */
          <motion.div
            key="lobby-gate"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex-1 flex flex-col z-10"
          >
            <Lobby onJoinRoom={handleJoinRoom} initialUserName={userName} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

interface ActiveRoomContentProps {
  roomId: string;
  userId: string;
  userName: string;
  onLeave: () => void;
}

function ActiveRoomContent({ roomId, userId, userName, onLeave }: ActiveRoomContentProps) {
  const [isChatOpen, setIsChatOpen] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);
  const prevMessagesLengthRef = useRef(0);

  // Initialize the WebRTC calling and WebSocket signaling state
  const {
    isConnected,
    messages,
    participants,
    localStream,
    remoteStreams,
    isUsingVirtualMedia,
    audioEnabled,
    videoEnabled,
    isScreenSharing,
    toggleAudio,
    toggleVideo,
    toggleScreenShare,
    sendChatMessage,
  } = useRoom(roomId, userId, userName);

  // Auto handle unread messages count badge
  useEffect(() => {
    if (isChatOpen) {
      setUnreadCount(0);
    } else if (messages.length > prevMessagesLengthRef.current) {
      const diff = messages.length - prevMessagesLengthRef.current;
      setUnreadCount((prev) => prev + diff);
    }
    prevMessagesLengthRef.current = messages.length;
  }, [messages, isChatOpen]);

  return (
    <div className="flex-1 flex flex-col h-screen overflow-hidden bg-transparent relative">
      {/* FaceTime Call Header Bar */}
      <header className="bg-white/5 backdrop-blur-md border-b border-white/10 px-4 py-3.5 flex items-center justify-between z-10 select-none">
        <div className="flex items-center space-x-2.5">
          <div className="bg-emerald-500/20 text-emerald-400 p-2 rounded-xl border border-white/10 flex items-center justify-center">
            <Video className="w-4.5 h-4.5 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="font-bold tracking-tight text-white text-sm font-display">VibeCall Rooms</span>
              <span className="text-[10px] bg-white/10 border border-white/10 text-indigo-200 font-mono font-bold tracking-wider px-2 py-0.5 rounded uppercase">
                Room #{roomId}
              </span>
            </div>
            <div className="flex items-center space-x-1 text-[10px] text-white/50 font-mono">
              <span>Host IP Client Routing</span>
              <span>•</span>
              <span className="flex items-center space-x-1">
                <span className={`inline-block w-1.5 h-1.5 rounded-full ${isConnected ? "bg-emerald-400" : "bg-red-400 animate-ping"}`} />
                <span>{isConnected ? "Connected (Secure)" : "Connecting..."}</span>
              </span>
            </div>
          </div>
        </div>

        {/* Top Header Controls / Platform Banner */}
        <div className="flex items-center space-x-2.5">
          {/* Iframe tip warning badge */}
          {isUsingVirtualMedia && (
            <div className="hidden md:flex items-center space-x-1.5 bg-white/5 border border-white/10 text-indigo-300 px-3 py-1.5 rounded-xl text-xs font-medium backdrop-blur-md">
              <Shield className="w-3.5 h-3.5" />
              <span>Camera Fallback active. Open in new tab for physical webcam access!</span>
            </div>
          )}
          
          <button
            onClick={onLeave}
            className="text-xs bg-white/5 hover:bg-white/10 text-white border border-white/10 px-3.5 py-2 rounded-xl transition-all cursor-pointer font-semibold"
          >
            Leave Room
          </button>
        </div>
      </header>

      {/* Main Call Workspace Grid & Slideable Group Chat */}
      <div className="flex-1 flex flex-row h-full overflow-hidden relative">
        <VideoGrid
          localStream={localStream}
          remoteStreams={remoteStreams}
          participants={participants}
          localUserId={userId}
          localUserName={userName}
          localAudioEnabled={audioEnabled}
          localVideoEnabled={videoEnabled}
          localIsScreenSharing={isScreenSharing}
          isUsingVirtualMedia={isUsingVirtualMedia}
        />

        {/* Group Chat sliding panel */}
        <AnimatePresence>
          {isChatOpen && (
            <motion.div
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: "auto", opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className="h-full"
            >
              <ChatPanel
                messages={messages}
                localUserId={userId}
                onSendMessage={sendChatMessage}
                onClose={() => setIsChatOpen(false)}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* FaceTime Room Controls Footer */}
      <RoomControls
        audioEnabled={audioEnabled}
        videoEnabled={videoEnabled}
        isScreenSharing={isScreenSharing}
        isChatOpen={isChatOpen}
        unreadMessageCount={unreadCount}
        participants={participants}
        onToggleAudio={toggleAudio}
        onToggleVideo={toggleVideo}
        onToggleScreenShare={toggleScreenShare}
        onToggleChat={() => setIsChatOpen(!isChatOpen)}
        onLeave={onLeave}
        roomId={roomId}
      />
    </div>
  );
}
