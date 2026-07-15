import { useEffect, useRef, useState, useCallback } from "react";
import { Message, Participant } from "../types";
import { createVirtualStream } from "../utils/virtualStream";

const RTC_CONFIG = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
    { urls: "stun:stun2.l.google.com:19302" },
  ],
};

export function useRoom(roomId: string, userId: string, userName: string) {
  const [isConnected, setIsConnected] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStreams, setRemoteStreams] = useState<{ [userId: string]: MediaStream }>({});
  const [isUsingVirtualMedia, setIsUsingVirtualMedia] = useState(false);
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [videoEnabled, setVideoEnabled] = useState(true);
  const [isScreenSharing, setIsScreenSharing] = useState(false);

  const wsRef = useRef<WebSocket | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const peersRef = useRef<Map<string, RTCPeerConnection>>(new Map());
  const remoteStreamsRef = useRef<Map<string, MediaStream>>(new Map());
  const candidatesBufferRef = useRef<Map<string, RTCIceCandidateInit[]>>(new Map());

  // Helper to cleanup peer connections
  const cleanupPeer = useCallback((peerId: string) => {
    console.log(`Cleaning up peer connection with ${peerId}`);
    const pc = peersRef.current.get(peerId);
    if (pc) {
      pc.close();
      peersRef.current.delete(peerId);
    }
    remoteStreamsRef.current.delete(peerId);
    candidatesBufferRef.current.delete(peerId);
    
    setRemoteStreams((prev) => {
      const next = { ...prev };
      delete next[peerId];
      return next;
    });
  }, []);

  // Initialize Local Media Stream (Real Camera/Mic with fallback to Animated Virtual Stream)
  const initLocalStream = useCallback(async () => {
    // If stream already exists, return it
    if (localStreamRef.current) return localStreamRef.current;

    let stream: MediaStream;
    try {
      // Attempt real user media
      stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480 },
        audio: true,
      });
      setIsUsingVirtualMedia(false);
      console.log("Acquired real hardware camera and microphone.");
    } catch (err) {
      console.warn("Could not acquire hardware camera/mic, falling back to virtual animated stream:", err);
      stream = createVirtualStream(userName);
      setIsUsingVirtualMedia(true);
    }

    localStreamRef.current = stream;
    setLocalStream(stream);
    return stream;
  }, [userName]);

  // Handle media tracks adding/updating on peer connection
  const addTracksToPeerConnection = useCallback((pc: RTCPeerConnection, stream: MediaStream) => {
    // Clear any existing senders first
    const senders = pc.getSenders();
    senders.forEach((sender) => pc.removeTrack(sender));

    stream.getTracks().forEach((track) => {
      pc.addTrack(track, stream);
    });
  }, []);

  // Set up signaling websocket messages
  const sendSignalingMessage = useCallback((data: any) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(data));
    }
  }, []);

  // Initiate WebRTC connection to a peer
  const initiatePeerConnection = useCallback(async (targetUserId: string, isInitiator: boolean) => {
    if (peersRef.current.has(targetUserId)) {
      console.log(`Already have peer connection with ${targetUserId}, skipping init`);
      return peersRef.current.get(targetUserId)!;
    }

    console.log(`Setting up peer connection with ${targetUserId} (initiator: ${isInitiator})`);
    const pc = new RTCPeerConnection(RTC_CONFIG);
    peersRef.current.set(targetUserId, pc);

    // Buffer for ice candidates
    if (!candidatesBufferRef.current.has(targetUserId)) {
      candidatesBufferRef.current.set(targetUserId, []);
    }

    // Add local tracks to send to remote
    if (localStreamRef.current) {
      addTracksToPeerConnection(pc, localStreamRef.current);
    }

    // ICE candidates event handler
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        sendSignalingMessage({
          type: "webrtc-signal",
          roomId,
          targetUserId,
          senderUserId: userId,
          signal: {
            type: "candidate",
            candidate: event.candidate,
          },
        });
      }
    };

    // Connection state changes logging
    pc.onconnectionstatechange = () => {
      console.log(`Peer connection state with ${targetUserId}: ${pc.connectionState}`);
      if (pc.connectionState === "disconnected" || pc.connectionState === "failed") {
        cleanupPeer(targetUserId);
      }
    };

    // Incoming track handler (Remote participant's video/audio stream)
    pc.ontrack = (event) => {
      console.log(`Received track from ${targetUserId}:`, event.track.kind);
      const stream = event.streams[0] || new MediaStream([event.track]);
      remoteStreamsRef.current.set(targetUserId, stream);
      
      setRemoteStreams((prev) => ({
        ...prev,
        [targetUserId]: stream,
      }));
    };

    // Create Offer if Initiator
    if (isInitiator) {
      try {
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        sendSignalingMessage({
          type: "webrtc-signal",
          roomId,
          targetUserId,
          senderUserId: userId,
          signal: offer,
        });
      } catch (err) {
        console.error(`Error creating offer for ${targetUserId}:`, err);
      }
    }

    return pc;
  }, [roomId, userId, sendSignalingMessage, addTracksToPeerConnection, cleanupPeer]);

  // WebSocket lifecycle
  useEffect(() => {
    let ws: WebSocket;
    let reconnectTimeout: any;

    const connect = async () => {
      // 1. First get local media stream ready (real or virtual) so we can attach tracks immediately
      const activeLocalStream = await initLocalStream();

      // 2. Setup WebSocket connection
      const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
      const wsUrl = `${protocol}//${window.location.host}/ws`;
      console.log("Connecting to WebSocket:", wsUrl);

      ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log("WebSocket connected!");
        setIsConnected(true);

        // Join the FaceTime room immediately on connect
        ws.send(
          JSON.stringify({
            type: "join-room",
            roomId,
            userId,
            userName,
          })
        );
      };

      ws.onmessage = async (event) => {
        try {
          const data = JSON.parse(event.data);
          const { type } = data;

          switch (type) {
            case "room-state": {
              // Received history and active list of other participants
              setMessages(data.messages);
              setParticipants(data.participants);
              break;
            }

            case "user-joined": {
              const { participant } = data;
              console.log(`User joined room event: ${participant.userName} (${participant.userId})`);
              
              setParticipants((prev) => {
                // Prevent duplicate entries
                if (prev.some((p) => p.userId === participant.userId)) return prev;
                return [...prev, participant];
              });

              // As the established user, we initiate calling the newcomer
              await initiatePeerConnection(participant.userId, true);
              break;
            }

            case "user-left": {
              const { userId: leftUserId } = data;
              console.log(`User left room: ${leftUserId}`);
              setParticipants((prev) => prev.filter((p) => p.userId !== leftUserId));
              cleanupPeer(leftUserId);
              break;
            }

            case "chat-message": {
              const { message } = data;
              setMessages((prev) => {
                // Prevent duplicates
                if (prev.some((m) => m.id === message.id)) return prev;
                return [...prev, message];
              });
              break;
            }

            case "user-media-updated": {
              const { userId: updatedUserId, videoEnabled, audioEnabled, isScreenSharing } = data;
              setParticipants((prev) =>
                prev.map((p) =>
                  p.userId === updatedUserId
                    ? { ...p, videoEnabled, audioEnabled, isScreenSharing }
                    : p
                )
              );
              break;
            }

            case "webrtc-signal": {
              const { senderUserId, signal } = data;
              let pc = peersRef.current.get(senderUserId);

              if (!pc) {
                // If we don't have a connection yet, create one (newcomer role, not initiator)
                pc = await initiatePeerConnection(senderUserId, false);
              }

              if (signal.type === "offer") {
                await pc.setRemoteDescription(new RTCSessionDescription(signal));
                const answer = await pc.createAnswer();
                await pc.setLocalDescription(answer);

                sendSignalingMessage({
                  type: "webrtc-signal",
                  roomId,
                  targetUserId: senderUserId,
                  senderUserId: userId,
                  signal: answer,
                });

                // Apply any buffered ice candidates
                const bufferedCandidates = candidatesBufferRef.current.get(senderUserId) || [];
                for (const cand of bufferedCandidates) {
                  try {
                    await pc.addIceCandidate(new RTCIceCandidate(cand));
                  } catch (e) {
                    console.error("Error adding buffered candidate", e);
                  }
                }
                candidatesBufferRef.current.set(senderUserId, []);
              } else if (signal.type === "answer") {
                await pc.setRemoteDescription(new RTCSessionDescription(signal));
              } else if (signal.type === "candidate") {
                if (pc.remoteDescription) {
                  try {
                    await pc.addIceCandidate(new RTCIceCandidate(signal.candidate));
                  } catch (e) {
                    console.error("Error adding ICE candidate directly", e);
                  }
                } else {
                  // Buffer candidate until remote description is loaded
                  const buffer = candidatesBufferRef.current.get(senderUserId) || [];
                  buffer.push(signal.candidate);
                  candidatesBufferRef.current.set(senderUserId, buffer);
                }
              }
              break;
            }

            default:
              console.warn("Unhandled socket message:", type);
          }
        } catch (err) {
          console.error("Error processing message:", err);
        }
      };

      ws.onclose = () => {
        console.log("WebSocket connection closed, scheduled reconnect");
        setIsConnected(false);
        // Automatic reconnection handling after 3 seconds
        reconnectTimeout = setTimeout(connect, 3000);
      };

      ws.onerror = (err) => {
        console.error("WebSocket encountered an error:", err);
      };
    };

    connect();

    return () => {
      clearTimeout(reconnectTimeout);
      if (ws) {
        ws.onopen = null;
        ws.onmessage = null;
        ws.onclose = null;
        ws.onerror = null;
        if (ws.readyState === WebSocket.OPEN) {
          ws.close();
        }
      }
      // Clean up all RTCPeerConnections
      peersRef.current.forEach((pc) => pc.close());
      peersRef.current.clear();
      remoteStreamsRef.current.clear();
      candidatesBufferRef.current.clear();
      setRemoteStreams({});

      // Clean up local media streams if leaving the applet state
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((track) => track.stop());
        localStreamRef.current = null;
      }
    };
  }, [roomId, userId, userName, initLocalStream, initiatePeerConnection, sendSignalingMessage, cleanupPeer]);

  // Toggle Microphone
  const toggleAudio = useCallback(() => {
    if (localStreamRef.current) {
      const state = !audioEnabled;
      localStreamRef.current.getAudioTracks().forEach((track) => {
        track.enabled = state;
      });
      setAudioEnabled(state);
      
      // Update everyone else
      sendSignalingMessage({
        type: "update-media-state",
        roomId,
        userId,
        audioEnabled: state,
      });
    }
  }, [audioEnabled, roomId, userId, sendSignalingMessage]);

  // Toggle Camera
  const toggleVideo = useCallback(() => {
    if (localStreamRef.current) {
      const state = !videoEnabled;
      localStreamRef.current.getVideoTracks().forEach((track) => {
        track.enabled = state;
      });
      setVideoEnabled(state);

      // Update everyone else
      sendSignalingMessage({
        type: "update-media-state",
        roomId,
        userId,
        videoEnabled: state,
      });
    }
  }, [videoEnabled, roomId, userId, sendSignalingMessage]);

  // Handle Screen Share (With fallback/simulated visual state toggled inside room)
  const toggleScreenShare = useCallback(async () => {
    if (isScreenSharing) {
      // Stop screen sharing and restore camera
      setIsScreenSharing(false);
      sendSignalingMessage({
        type: "update-media-state",
        roomId,
        userId,
        isScreenSharing: false,
      });
      
      // Re-init camera stream and update tracks on all active peer connections
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((t) => t.stop());
        localStreamRef.current = null;
      }
      const stream = await initLocalStream();
      peersRef.current.forEach((pc) => {
        addTracksToPeerConnection(pc, stream);
      });
    } else {
      // Start screen sharing
      try {
        if (navigator.mediaDevices.getDisplayMedia) {
          const screenStream = await navigator.mediaDevices.getDisplayMedia({
            video: true,
            audio: false,
          });
          
          setIsScreenSharing(true);
          sendSignalingMessage({
            type: "update-media-state",
            roomId,
            userId,
            isScreenSharing: true,
          });

          // Listen for screen sharing stop from native browser UI
          const videoTrack = screenStream.getVideoTracks()[0];
          if (videoTrack) {
            videoTrack.onended = () => {
              // Toggles back to camera
              toggleScreenShare();
            };
          }

          // Replace track in peer connections
          peersRef.current.forEach((pc) => {
            const sender = pc.getSenders().find((s) => s.track?.kind === "video");
            if (sender && videoTrack) {
              sender.replaceTrack(videoTrack);
            }
          });

          // Update local streams
          const audioTrack = localStreamRef.current?.getAudioTracks()[0];
          const newStream = new MediaStream();
          newStream.addTrack(videoTrack);
          if (audioTrack) newStream.addTrack(audioTrack);
          
          localStreamRef.current = newStream;
          setLocalStream(newStream);
        } else {
          throw new Error("getDisplayMedia not supported in this browser");
        }
      } catch (err) {
        console.warn("Could not capture screen, using simulated screen share overlay:", err);
        // Toggle simulated screen sharing mode
        setIsScreenSharing(true);
        sendSignalingMessage({
          type: "update-media-state",
          roomId,
          userId,
          isScreenSharing: true,
        });
      }
    }
  }, [isScreenSharing, roomId, userId, sendSignalingMessage, initLocalStream, addTracksToPeerConnection]);

  // Send a chat message
  const sendChatMessage = useCallback((text: string) => {
    if (!text.trim()) return;

    const message: Message = {
      id: `${userId}-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      userId,
      userName,
      text: text.trim(),
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    // Send via socket, the server will broadcast it back to everyone (including us)
    sendSignalingMessage({
      type: "chat-message",
      roomId,
      message,
    });
  }, [roomId, userId, userName, sendSignalingMessage]);

  return {
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
  };
}
