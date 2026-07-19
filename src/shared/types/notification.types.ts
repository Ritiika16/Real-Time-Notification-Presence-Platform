export type NotificationType = 'INFO' | 'MESSAGE' | 'ALERT' | 'SYSTEM';
export type NotificationStatus = 'PENDING' | 'DELIVERED' | 'READ';

export interface CreateNotificationInput {
  senderId: string;
  receiverId: string;
  title: string;
  message: string;
  type: NotificationType;
}

export interface NotificationResponse {
  id: string;
  senderId: string;
  receiverId: string;
  title: string;
  message: string;
  type: NotificationType;
  status: NotificationStatus;
  createdAt: Date;
  deliveredAt: Date | null;
  readAt: Date | null;
}

export interface NotificationWithSender extends NotificationResponse {
  sender: {
    id: string;
    email: string;
    fullName: string;
  };
}

export interface NotificationPayload {
  id: string;
  senderId: string;
  senderEmail: string;
  senderName: string;
  title: string;
  message: string;
  type: NotificationType;
  createdAt: Date;
}

export interface PaginationParams {
  page: number;
  limit: number;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

export interface PaginatedNotifications {
  notifications: NotificationWithSender[];
  pagination: PaginationMeta;
}
