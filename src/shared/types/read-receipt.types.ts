export interface ReadReceiptPayload {
  notificationId: string;
}

export interface ReadReceiptEventPayload {
  notificationId: string;
  readBy: string;
  readAt: string;
}

export interface ReadReceiptPubSubMessage {
  sourceInstanceId: string;
  notificationId: string;
  readBy: string;
  readAt: string;
  senderId: string;
}