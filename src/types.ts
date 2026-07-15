export interface Message {
  id: string;
  userId: string;
  userName: string;
  text: string;
  timestamp: string;
}

export interface Participant {
  userId: string;
  userName: string;
  videoEnabled: boolean;
  audioEnabled: boolean;
  isScreenSharing: boolean;
}

export interface RoomState {
  roomId: string;
  messages: Message[];
  participants: Participant[];
}

export interface ActiveRoomInfo {
  id: string;
  participantCount: number;
}
