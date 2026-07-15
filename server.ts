import express from "express";
import path from "path";
import { createServer as createHttpServer } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { createServer as createViteServer } from "vite";

interface Message {
  id: string;
  userId: string;
  userName: string;
  text: string;
  timestamp: string;
}

interface Participant {
  userId: string;
  userName: string;
  videoEnabled: boolean;
  audioEnabled: boolean;
  isScreenSharing: boolean;
}

interface Room {
  id: string;
  messages: Message[];
  participants: Map<string, Participant>;
}

async function startServer() {
  const app = express();
  const PORT = 3000;
  const server = createHttpServer(app);
  const wss = new WebSocketServer({ noServer: true });

  // Server state
  const rooms = new Map<string, Room>();
  const clients = new Map<WebSocket, { roomId: string; userId: string; userName: string }>();

  // API Health Check
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", roomsCount: rooms.size, activeConnections: clients.size });
  });

  // API to get list of active public rooms and their participant counts
  app.get("/api/rooms", (req, res) => {
    const list = Array.from(rooms.entries()).map(([id, room]) => ({
      id,
      participantCount: room.participants.size,
    }));
    res.json(list);
  });

  // Handle WebSocket Upgrade
  server.on("upgrade", (request, socket, head) => {
    const { pathname } = new URL(request.url || "", `http://${request.headers.host}`);
    if (pathname === "/ws" || pathname === "/ws/") {
      wss.handleUpgrade(request, socket, head, (ws) => {
        wss.emit("connection", ws, request);
      });
    } else {
      socket.destroy();
    }
  });

  // Helper to send message to a specific client
  const sendToClient = (targetWs: WebSocket, data: any) => {
    if (targetWs.readyState === WebSocket.OPEN) {
      targetWs.send(JSON.stringify(data));
    }
  };

  // Helper to find a client's WebSocket by userId
  const findWsByUserId = (roomId: string, userId: string): WebSocket | null => {
    for (const [ws, meta] of clients.entries()) {
      if (meta.roomId === roomId && meta.userId === userId) {
        return ws;
      }
    }
    return null;
  };

  // Helper to broadcast to a room
  const broadcastToRoom = (roomId: string, excludeWs: WebSocket | null, data: any) => {
    const messageStr = JSON.stringify(data);
    for (const [ws, meta] of clients.entries()) {
      if (meta.roomId === roomId && ws !== excludeWs && ws.readyState === WebSocket.OPEN) {
        ws.send(messageStr);
      }
    }
  };

  // WebSocket Connection Handler
  wss.on("connection", (ws) => {
    console.log("New WebSocket client connected");

    ws.on("message", (rawMessage) => {
      try {
        const data = JSON.parse(rawMessage.toString());
        const { type } = data;

        switch (type) {
          case "join-room": {
            const { roomId, userId, userName } = data;
            if (!roomId || !userId || !userName) {
              console.error("Missing join parameters", { roomId, userId, userName });
              return;
            }

            console.log(`User ${userName} (${userId}) joining room ${roomId}`);

            // Initialize room if it doesn't exist
            if (!rooms.has(roomId)) {
              rooms.set(roomId, {
                id: roomId,
                messages: [],
                participants: new Map(),
              });
            }

            const room = rooms.get(roomId)!;

            // Save client metadata
            clients.set(ws, { roomId, userId, userName });

            // Create participant record
            const newParticipant: Participant = {
              userId,
              userName,
              videoEnabled: true,
              audioEnabled: true,
              isScreenSharing: false,
            };
            room.participants.set(userId, newParticipant);

            // Send full current room state (messages & participant list) to the joined user
            sendToClient(ws, {
              type: "room-state",
              roomId,
              messages: room.messages,
              participants: Array.from(room.participants.values()),
            });

            // Notify all other users in the room that a new user joined
            broadcastToRoom(roomId, ws, {
              type: "user-joined",
              participant: newParticipant,
            });
            break;
          }

          case "chat-message": {
            const { roomId, message } = data;
            const clientMeta = clients.get(ws);
            if (!clientMeta || clientMeta.roomId !== roomId) return;

            const room = rooms.get(roomId);
            if (room) {
              room.messages.push(message);
              // Limit chat history size to prevent memory explosion
              if (room.messages.length > 200) {
                room.messages.shift();
              }
              // Broadcast chat message to everyone in the room (including sender to confirm server receipt)
              broadcastToRoom(roomId, null, {
                type: "chat-message",
                roomId,
                message,
              });
            }
            break;
          }

          case "webrtc-signal": {
            const { roomId, targetUserId, senderUserId, signal } = data;
            const targetWs = findWsByUserId(roomId, targetUserId);
            if (targetWs) {
              sendToClient(targetWs, {
                type: "webrtc-signal",
                roomId,
                senderUserId,
                signal,
              });
            }
            break;
          }

          case "update-media-state": {
            const { roomId, userId, videoEnabled, audioEnabled, isScreenSharing } = data;
            const room = rooms.get(roomId);
            if (room) {
              const participant = room.participants.get(userId);
              if (participant) {
                if (videoEnabled !== undefined) participant.videoEnabled = videoEnabled;
                if (audioEnabled !== undefined) participant.audioEnabled = audioEnabled;
                if (isScreenSharing !== undefined) participant.isScreenSharing = isScreenSharing;

                // Broadcast media update
                broadcastToRoom(roomId, ws, {
                  type: "user-media-updated",
                  userId,
                  videoEnabled: participant.videoEnabled,
                  audioEnabled: participant.audioEnabled,
                  isScreenSharing: participant.isScreenSharing,
                });
              }
            }
            break;
          }

          default:
            console.warn("Unknown message type:", type);
        }
      } catch (err) {
        console.error("Error processing WebSocket message", err);
      }
    });

    ws.on("close", () => {
      const meta = clients.get(ws);
      if (meta) {
        const { roomId, userId, userName } = meta;
        console.log(`User ${userName} (${userId}) disconnected from room ${roomId}`);

        // Remove client and update room state
        clients.delete(ws);

        const room = rooms.get(roomId);
        if (room) {
          room.participants.delete(userId);

          // Broadcast user-left to remaining participants
          broadcastToRoom(roomId, null, {
            type: "user-left",
            userId,
          });

          // Clean up room if empty to release memory
          if (room.participants.size === 0) {
            // Keep room for a bit or delete immediately if inactive
            rooms.delete(roomId);
            console.log(`Room ${roomId} is now empty and has been removed`);
          }
        }
      }
    });

    ws.on("error", (err) => {
      console.error("WebSocket connection error:", err);
    });
  });

  // Serve static assets and bundle React in production
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  server.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error("Failed to start server", err);
});
