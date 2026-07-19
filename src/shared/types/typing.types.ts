export interface TypingStartPayload {
  receiverId: string;
}

export interface TypingStopPayload {
  receiverId: string;
}

export interface TypingEventPayload {
  userId: string;
  isTyping: boolean;
}

export interface TypingPubSubMessage {
  sourceInstanceId: string;
  senderId: string;
  receiverId: string;
  isTyping: boolean;
  timestamp: string;
}