import React, { useEffect, useRef } from "react";
import { MicOff, VideoOff, Monitor, User, Volume2, Sparkles } from "lucide-react";
import { Participant } from "../types";
import { motion } from "motion/react";

interface VideoFeedProps {
  stream: MediaStream | null;
  userName: string;
  isLocal: boolean;
  videoEnabled: boolean;
  audioEnabled: boolean;
  isScreenSharing: boolean;
  isUsingVirtualStream?: boolean;
}

function VideoFeed({
  stream,
  userName,
  isLocal,
  videoEnabled,
  audioEnabled,
  isScreenSharing,
  isUsingVirtualStream,
}: VideoFeedProps) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const videoEl = videoRef.current;
    if (videoEl && stream) {
      videoEl.srcObject = stream;
      
      // Attempt to autoplay
      videoEl.play().catch((err) => {
        console.warn(`Autoplay blocked or failed for ${userName}:`, err);
      });
    }
  }, [stream, userName]);

  const initials = userName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <div className="relative w-full h-full bg-white/5 backdrop-blur-xl rounded-3xl overflow-hidden border border-white/10 shadow-2xl flex items-center justify-center group select-none">
      {/* Video Stream */}
      {videoEnabled && stream ? (
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted={isLocal} // MUST be muted for local to prevent painful echo!
          className={`w-full h-full object-cover rounded-3xl ${isLocal && !isScreenSharing ? "scale-x-[-1]" : ""}`} // mirror local webcam only (not screen share)
        />
      ) : (
        /* Video Disabled Avatar state */
        <div className="absolute inset-0 bg-gradient-to-br from-white/10 via-transparent to-white/5 backdrop-blur-2xl flex flex-col items-center justify-center space-y-4">
          <div className="relative">
            <div className="absolute inset-0 bg-indigo-500/20 rounded-full blur-xl animate-pulse" />
            <div className="relative w-24 h-24 rounded-full bg-white/10 border border-white/15 flex items-center justify-center text-white text-3xl font-bold shadow-2xl backdrop-blur-md">
              {initials || "V"}
            </div>
          </div>
          <div className="text-center">
            <span className="text-sm font-semibold text-white block">{userName}</span>
            <span className="text-[10px] text-white/50 font-mono tracking-wider uppercase">Camera Off</span>
          </div>
        </div>
      )}

      {/* Screen Sharing Overlay Indicator */}
      {isScreenSharing && (
        <div className="absolute inset-0 bg-indigo-500/10 pointer-events-none border-2 border-indigo-400 rounded-3xl flex items-start justify-end p-3 animate-pulse">
          <div className="bg-indigo-500/80 backdrop-blur-md text-white text-[10px] font-bold font-mono uppercase px-2 py-1 rounded-full flex items-center space-x-1.5 shadow-md border border-white/10">
            <Monitor className="w-3.5 h-3.5" />
            <span>Sharing Screen</span>
          </div>
        </div>
      )}

      {/* Badges / Controls overlays */}
      <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between pointer-events-none">
        {/* Name Pill */}
        <div className="bg-white/10 backdrop-blur-md text-white text-xs px-3 py-1.5 rounded-xl border border-white/10 flex items-center space-x-1.5 shadow-md">
          <span className="font-semibold truncate max-w-[120px]">{userName}</span>
          {isLocal && (
            <span className="text-[10px] font-mono text-indigo-300 font-bold tracking-wider uppercase px-1 rounded">
              You
            </span>
          )}
          {!isLocal && stream && <Volume2 className="w-3 h-3 text-white/70" />}
        </div>

        {/* Status Indicators */}
        <div className="flex items-center space-x-1.5">
          {!audioEnabled && (
            <div className="bg-red-500/80 backdrop-blur-md text-white p-2 rounded-xl shadow-lg border border-white/10">
              <MicOff className="w-3.5 h-3.5" />
            </div>
          )}
          {!videoEnabled && (
            <div className="bg-white/15 backdrop-blur-md text-white/70 p-2 rounded-xl shadow-lg border border-white/10">
              <VideoOff className="w-3.5 h-3.5" />
            </div>
          )}
          {isLocal && isUsingVirtualStream && (
            <div
              title="Virtual stream fallback active"
              className="bg-indigo-500/80 backdrop-blur-md text-white px-2 py-1.5 rounded-xl shadow-lg border border-white/10 text-[9px] font-mono font-bold uppercase flex items-center space-x-1"
            >
              <Sparkles className="w-3 h-3" />
              <span>VIRTUAL</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

interface VideoGridProps {
  localStream: MediaStream | null;
  remoteStreams: { [userId: string]: MediaStream };
  participants: Participant[];
  localUserId: string;
  localUserName: string;
  localAudioEnabled: boolean;
  localVideoEnabled: boolean;
  localIsScreenSharing: boolean;
  isUsingVirtualMedia: boolean;
}

export default function VideoGrid({
  localStream,
  remoteStreams,
  participants,
  localUserId,
  localUserName,
  localAudioEnabled,
  localVideoEnabled,
  localIsScreenSharing,
  isUsingVirtualMedia,
}: VideoGridProps) {
  // Total streams to show (including local)
  const otherActiveParticipants = participants.filter((p) => p.userId !== localUserId);
  const totalFeeds = otherActiveParticipants.length + 1;

  // Compute Grid layout classes based on number of active feeds
  let gridClasses = "grid-cols-1";
  if (totalFeeds === 2) {
    gridClasses = "grid-cols-1 md:grid-cols-2";
  } else if (totalFeeds === 3) {
    gridClasses = "grid-cols-1 md:grid-cols-3";
  } else if (totalFeeds === 4) {
    gridClasses = "grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-2";
  } else if (totalFeeds > 4) {
    gridClasses = "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3";
  }

  return (
    <div className="flex-1 w-full h-full p-4 md:p-6 overflow-y-auto custom-scrollbar flex items-center justify-center">
      <div className={`grid ${gridClasses} gap-4 md:gap-6 w-full max-w-6xl aspect-video md:aspect-auto`}>
        {/* 1. Local Video Feed */}
        <motion.div
          layout
          key="local-feed"
          className="relative w-full h-full min-h-[220px] max-h-[500px] aspect-video"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4 }}
        >
          <VideoFeed
            stream={localStream}
            userName={localUserName}
            isLocal={true}
            videoEnabled={localVideoEnabled}
            audioEnabled={localAudioEnabled}
            isScreenSharing={localIsScreenSharing}
            isUsingVirtualStream={isUsingVirtualMedia}
          />
        </motion.div>

        {/* 2. Remote Video Feeds */}
        {otherActiveParticipants.map((p) => {
          const remoteStream = remoteStreams[p.userId] || null;
          return (
            <motion.div
              layout
              key={p.userId}
              className="relative w-full h-full min-h-[220px] max-h-[500px] aspect-video"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.4 }}
            >
              <VideoFeed
                stream={remoteStream}
                userName={p.userName}
                isLocal={false}
                videoEnabled={p.videoEnabled}
                audioEnabled={p.audioEnabled}
                isScreenSharing={p.isScreenSharing}
              />
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
