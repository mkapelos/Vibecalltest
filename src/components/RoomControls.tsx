import React, { useState } from "react";
import { Mic, MicOff, Video, VideoOff, Monitor, Link, Check, MessageSquare, PhoneOff, Users, Info } from "lucide-react";
import { Participant } from "../types";

interface RoomControlsProps {
  audioEnabled: boolean;
  videoEnabled: boolean;
  isScreenSharing: boolean;
  isChatOpen: boolean;
  unreadMessageCount: number;
  participants: Participant[];
  onToggleAudio: () => void;
  onToggleVideo: () => void;
  onToggleScreenShare: () => void;
  onToggleChat: () => void;
  onLeave: () => void;
  roomId: string;
}

export default function RoomControls({
  audioEnabled,
  videoEnabled,
  isScreenSharing,
  isChatOpen,
  unreadMessageCount,
  participants,
  onToggleAudio,
  onToggleVideo,
  onToggleScreenShare,
  onToggleChat,
  onLeave,
  roomId,
}: RoomControlsProps) {
  const [copied, setCopied] = useState(false);
  const [showInviteTooltip, setShowInviteTooltip] = useState(false);

  const handleCopyLink = () => {
    // Generate a shareable URL to direct friends straight to this room!
    const shareUrl = `${window.location.origin}/?room=${roomId}`;
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="bg-white/5 backdrop-blur-xl border-t border-white/10 p-4 md:p-5 flex flex-col sm:flex-row gap-4 items-center justify-between font-sans relative z-10 select-none">
      {/* Left side: Room Details / Participant counts */}
      <div className="flex items-center space-x-3 w-full sm:w-auto">
        <div className="bg-white/5 border border-white/10 px-3.5 py-2 rounded-2xl flex items-center space-x-2">
          <span className="text-xs text-slate-300 font-mono">ROOM:</span>
          <span className="text-xs font-mono font-bold tracking-widest text-indigo-300 uppercase">
            #{roomId}
          </span>
        </div>

        <div className="bg-white/5 border border-white/10 px-3 py-2 rounded-2xl flex items-center space-x-2 text-xs text-white">
          <Users className="w-4 h-4 text-indigo-300" />
          <span className="font-semibold">{participants.length} in call</span>
        </div>
      </div>

      {/* Center: Calling State Controls */}
      <div className="flex items-center space-x-3.5">
        {/* Toggle Audio (Mute) */}
        <button
          onClick={onToggleAudio}
          className={`p-3.5 rounded-2xl border transition-all cursor-pointer shadow-md ${
            audioEnabled
              ? "bg-white/5 border-white/10 hover:border-white/20 hover:bg-white/10 text-white"
              : "bg-red-500/80 hover:bg-red-500 border-white/10 text-white shadow-lg shadow-red-500/15"
          }`}
          title={audioEnabled ? "Mute Microphone" : "Unmute Microphone"}
        >
          {audioEnabled ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5" />}
        </button>

        {/* Toggle Video (Webcam) */}
        <button
          onClick={onToggleVideo}
          className={`p-3.5 rounded-2xl border transition-all cursor-pointer shadow-md ${
            videoEnabled
              ? "bg-white/5 border-white/10 hover:border-white/20 hover:bg-white/10 text-white"
              : "bg-red-500/80 hover:bg-red-500 border-white/10 text-white shadow-lg shadow-red-500/15"
          }`}
          title={videoEnabled ? "Turn Off Video" : "Turn On Video"}
        >
          {videoEnabled ? <Video className="w-5 h-5" /> : <VideoOff className="w-5 h-5" />}
        </button>

        {/* Toggle Screen Sharing */}
        <button
          onClick={onToggleScreenShare}
          className={`p-3.5 rounded-2xl border transition-all cursor-pointer shadow-md ${
            isScreenSharing
              ? "bg-indigo-600 border-white/20 text-white shadow-lg shadow-indigo-600/15"
              : "bg-white/5 border-white/10 hover:border-white/20 hover:bg-white/10 text-white"
          }`}
          title={isScreenSharing ? "Stop Screen Sharing" : "Share Screen"}
        >
          <Monitor className="w-5 h-5" />
        </button>

        {/* Hang Up (Leave Room) */}
        <button
          onClick={onLeave}
          className="p-3.5 rounded-2xl bg-rose-600/80 hover:bg-rose-500 text-white border border-white/10 transition-all shadow-lg shadow-rose-600/20 flex items-center justify-center cursor-pointer"
          title="Leave FaceTime Call"
        >
          <PhoneOff className="w-5 h-5" />
        </button>
      </div>

      {/* Right side: Utilities & Toggles */}
      <div className="flex items-center space-x-3 w-full sm:w-auto justify-end">
        {/* Share/Invite Button */}
        <div className="relative">
          <button
            onClick={handleCopyLink}
            onMouseEnter={() => setShowInviteTooltip(true)}
            onMouseLeave={() => setShowInviteTooltip(false)}
            className="bg-white/5 hover:bg-white/10 active:bg-white/15 border border-white/10 hover:border-white/20 px-4 py-2.5 rounded-2xl text-xs font-semibold text-white flex items-center space-x-2 transition-all cursor-pointer"
          >
            {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Link className="w-4 h-4 text-indigo-300" />}
            <span>{copied ? "Link Copied!" : "Invite Friends"}</span>
          </button>
          
          {showInviteTooltip && !copied && (
            <div className="absolute bottom-full mb-2 right-0 bg-white/10 backdrop-blur-xl border border-white/10 text-white text-[10px] px-2.5 py-1.5 rounded-xl whitespace-nowrap shadow-xl font-mono leading-relaxed pointer-events-none z-30">
              Copy shareable FaceTime room url
            </div>
          )}
        </div>

        {/* Toggle Chat Panel */}
        <button
          onClick={onToggleChat}
          className={`p-2.5 rounded-2xl border transition-all cursor-pointer relative ${
            isChatOpen
              ? "bg-indigo-600 border-white/20 text-white shadow-md shadow-indigo-600/10"
              : "bg-white/5 border-white/10 hover:border-white/20 hover:bg-white/10 text-white"
          }`}
          title="Toggle Chat Sidebar"
        >
          <MessageSquare className="w-5 h-5" />
          
          {/* Unread message indicator badge */}
          {unreadMessageCount > 0 && !isChatOpen && (
            <span className="absolute -top-1.5 -right-1.5 bg-indigo-500 text-white text-[10px] font-bold font-mono h-5 w-5 rounded-full flex items-center justify-center border-2 border-indigo-600 animate-bounce">
              {unreadMessageCount}
            </span>
          )}
        </button>
      </div>
    </div>
  );
}
