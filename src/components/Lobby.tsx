import React, { useState, useEffect } from "react";
import { motion } from "motion/react";
import { Video, MessageSquare, Users, Radio, ArrowRight, Plus, Sparkles, AlertCircle } from "lucide-react";
import { ActiveRoomInfo } from "../types";

interface LobbyProps {
  onJoinRoom: (roomId: string, userName: string) => void;
  initialUserName: string;
}

export default function Lobby({ onJoinRoom, initialUserName }: LobbyProps) {
  const [userName, setUserName] = useState(initialUserName);
  const [roomId, setRoomId] = useState("");
  const [activeRooms, setActiveRooms] = useState<ActiveRoomInfo[]>([]);
  const [isLoadingRooms, setIsLoadingRooms] = useState(true);
  const [error, setError] = useState("");

  // Fetch list of active rooms on the server
  useEffect(() => {
    const fetchRooms = async () => {
      try {
        const res = await fetch("/api/rooms");
        if (res.ok) {
          const data = await res.json();
          setActiveRooms(data);
        }
      } catch (err) {
        console.error("Error fetching rooms list", err);
      } finally {
        setIsLoadingRooms(false);
      }
    };

    fetchRooms();
    const interval = setInterval(fetchRooms, 4000); // Poll every 4s
    return () => clearInterval(interval);
  }, []);

  const handleCreateRandomRoom = () => {
    if (!userName.trim()) {
      setError("Please enter your name first!");
      return;
    }
    setError("");
    const randomId = Math.random().toString(36).substring(2, 8).toUpperCase();
    onJoinRoom(randomId, userName);
  };

  const handleJoinSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!userName.trim()) {
      setError("Please enter your name first!");
      return;
    }
    if (!roomId.trim()) {
      setError("Please enter a Room ID!");
      return;
    }
    setError("");
    // Standardize roomId (letters and numbers only)
    const sanitizedRoomId = roomId.trim().toUpperCase().replace(/[^A-Z0-9_-]/g, "");
    if (!sanitizedRoomId) {
      setError("Invalid Room ID!");
      return;
    }
    onJoinRoom(sanitizedRoomId, userName);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#1a1a2e] via-[#16213e] to-[#0f3460] text-slate-100 flex flex-col justify-between p-4 sm:p-6 md:p-8 font-sans selection:bg-indigo-500 selection:text-white relative overflow-hidden">
      {/* Background Mesh Orbs */}
      <div className="absolute top-[-100px] left-[-100px] w-[400px] h-[400px] bg-purple-500/20 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-100px] right-[-100px] w-[500px] h-[500px] bg-blue-500/20 rounded-full blur-[120px] pointer-events-none" />
      
      {/* Navbar */}
      <header className="relative w-full max-w-6xl mx-auto flex items-center justify-between py-4 z-10">
        <div className="flex items-center space-x-3">
          <div className="bg-indigo-500/30 backdrop-blur-md text-white p-2.5 rounded-2xl border border-white/10 shadow-lg flex items-center justify-center">
            <Video className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <span className="font-bold tracking-tight text-xl text-white font-display">VibeCall</span>
            <span className="text-xs block text-indigo-300 font-mono font-medium tracking-widest uppercase">Facetime Rooms</span>
          </div>
        </div>
        <div className="flex items-center space-x-2 bg-white/5 backdrop-blur-md px-3.5 py-1.5 rounded-full border border-white/10 text-xs text-white/70">
          <span className="inline-block w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
          <span className="font-semibold text-white">SYSTEM: ACTIVE</span>
        </div>
      </header>

      {/* Main Grid Hero & Control Panel */}
      <main className="relative max-w-6xl w-full mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8 my-auto z-10 py-8">
        {/* Left column: Visual Pitch */}
        <div className="lg:col-span-7 flex flex-col justify-center text-left space-y-6">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="inline-flex items-center space-x-2 bg-white/5 text-indigo-300 border border-white/10 px-3 py-1 rounded-full text-xs font-semibold backdrop-blur-md"
          >
            <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
            <span>Next-Gen WebRTC Group Video Platform</span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight leading-[1.1] text-white font-display"
          >
            FaceTime-quality calling. <br />
            <span className="bg-gradient-to-r from-indigo-300 via-purple-300 to-pink-300 bg-clip-text text-transparent">
              In any web browser.
            </span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="text-slate-300/80 text-base sm:text-lg max-w-lg leading-relaxed font-light"
          >
            Host instant group video calls with pristine peer-to-peer audio/video. Includes real-time rich chat history, device toggles, and screen-sharing fallbacks.
          </motion.p>

          {/* Quick Informational Highlights */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4"
          >
            <div className="flex items-start space-x-3 bg-white/5 backdrop-blur-md p-4 rounded-2xl border border-white/10">
              <Video className="w-5 h-5 text-indigo-400 shrink-0 mt-0.5" />
              <div>
                <h3 className="font-semibold text-white text-sm">WebRTC Video</h3>
                <p className="text-xs text-slate-300/60">P2P encrypted mesh calling.</p>
              </div>
            </div>
            <div className="flex items-start space-x-3 bg-white/5 backdrop-blur-md p-4 rounded-2xl border border-white/10">
              <MessageSquare className="w-5 h-5 text-purple-400 shrink-0 mt-0.5" />
              <div>
                <h3 className="font-semibold text-white text-sm">Group Chat</h3>
                <p className="text-xs text-slate-300/60">Real-time room messaging.</p>
              </div>
            </div>
            <div className="flex items-start space-x-3 bg-white/5 backdrop-blur-md p-4 rounded-2xl border border-white/10">
              <Users className="w-5 h-5 text-pink-400 shrink-0 mt-0.5" />
              <div>
                <h3 className="font-semibold text-white text-sm">Seamless State</h3>
                <p className="text-xs text-slate-300/60">Synced participant rosters.</p>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Right column: Action Panel */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="lg:col-span-5 flex flex-col space-y-6"
        >
          {/* Main Join Card */}
          <div className="bg-white/5 backdrop-blur-xl rounded-3xl p-6 sm:p-8 border border-white/10 shadow-2xl relative overflow-hidden">
            <div className="absolute -right-16 -top-16 w-32 h-32 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
            
            <h2 className="text-xl font-bold text-white mb-6 flex items-center space-x-2 font-display">
              <span>Enter Lobby Entrance</span>
            </h2>

            <form onSubmit={handleJoinSubmit} className="space-y-5">
              {/* Username Input */}
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold tracking-wider text-slate-300 uppercase font-mono">
                  Your Display Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Alex Carter"
                  value={userName}
                  onChange={(e) => setUserName(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 focus:border-indigo-400 focus:bg-white/10 rounded-2xl px-4 py-3.5 text-white placeholder-slate-400/50 outline-none transition-all font-medium text-sm focus:ring-2 focus:ring-indigo-500/10"
                />
              </div>

              {/* Room ID Input */}
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold tracking-wider text-slate-300 uppercase font-mono">
                  Room ID (To Join or Create)
                </label>
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Enter ROOM-ID (e.g. CHAT-123)"
                    value={roomId}
                    onChange={(e) => setRoomId(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 focus:border-indigo-400 focus:bg-white/10 rounded-2xl pl-4 pr-12 py-3.5 text-white placeholder-slate-400/50 outline-none transition-all font-mono font-semibold tracking-widest text-sm uppercase focus:ring-2 focus:ring-indigo-500/10"
                  />
                  <button
                    type="submit"
                    title="Join Room"
                    className="absolute right-2 top-2 h-9 w-9 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white flex items-center justify-center transition-all shadow-md shadow-indigo-600/10"
                  >
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {error && (
                <div className="bg-red-500/10 text-red-300 border border-red-500/20 px-3.5 py-2.5 rounded-2xl text-xs flex items-start space-x-2 font-medium">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-400" />
                  <span>{error}</span>
                </div>
              )}

              {/* Action Buttons */}
              <div className="pt-2 flex flex-col sm:flex-row gap-3">
                <button
                  type="submit"
                  className="flex-1 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-400 hover:to-purple-500 text-white font-semibold rounded-2xl px-4 py-3.5 transition-all shadow-lg shadow-indigo-600/15 text-sm flex items-center justify-center space-x-2 cursor-pointer border border-white/10"
                >
                  <Users className="w-4 h-4" />
                  <span>Join Call Room</span>
                </button>
                
                <button
                  type="button"
                  onClick={handleCreateRandomRoom}
                  className="bg-white/5 hover:bg-white/10 text-white font-semibold rounded-2xl px-4 py-3.5 transition-all text-sm flex items-center justify-center space-x-2 cursor-pointer border border-white/10"
                >
                  <Plus className="w-4 h-4" />
                  <span>Quick Room</span>
                </button>
              </div>
            </form>
          </div>

          {/* Active Calls List on the server */}
          <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-300 font-mono flex items-center space-x-2">
                <Radio className="w-3.5 h-3.5 text-indigo-400 animate-pulse" />
                <span>Active Server Call Rooms</span>
              </span>
              <span className="text-xs bg-white/10 border border-white/10 text-indigo-200 px-2.5 py-0.5 rounded-full font-mono">
                {activeRooms.length} active
              </span>
            </div>

            {isLoadingRooms ? (
              <div className="text-slate-400 text-xs py-4 text-center font-mono">
                Loading active sessions...
              </div>
            ) : activeRooms.length === 0 ? (
              <div className="text-slate-400/80 text-xs py-5 text-center leading-relaxed">
                No active video call rooms at the moment.<br />
                Create one to invite your friends!
              </div>
            ) : (
              <div className="max-h-40 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
                {activeRooms.map((room) => (
                  <button
                    key={room.id}
                    onClick={() => {
                      if (!userName.trim()) {
                        setError("Please enter your name first!");
                        return;
                      }
                      onJoinRoom(room.id, userName);
                    }}
                    className="w-full flex items-center justify-between bg-white/5 hover:bg-white/10 border border-white/5 hover:border-white/10 px-4 py-3 rounded-2xl transition-all text-left cursor-pointer group"
                  >
                    <div className="flex items-center space-x-2">
                      <span className="font-mono font-bold tracking-widest text-indigo-300 uppercase text-xs group-hover:text-indigo-200">
                        #{room.id}
                      </span>
                    </div>
                    <div className="flex items-center space-x-2 text-xs">
                      <span className="text-slate-300 group-hover:text-slate-200 font-medium">
                        {room.participantCount} in call
                      </span>
                      <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:translate-x-0.5 group-hover:text-indigo-300 transition-all" />
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </motion.div>
      </main>

      {/* Footer */}
      <footer className="relative max-w-6xl w-full mx-auto py-6 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-400 font-mono mt-12 z-10">
        <div>
          <span>© 2026 FaceTime Group WebRTC Rooms. All rights reserved.</span>
        </div>
        <div className="flex items-center space-x-4">
          <span>Real P2P Mesh calling</span>
          <span>•</span>
          <span>In-memory history</span>
        </div>
      </footer>
    </div>
  );
}
