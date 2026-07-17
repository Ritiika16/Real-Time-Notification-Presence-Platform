import { Logger } from 'winston';

interface OnlineUser {
  userId: string;
  email: string;
  socketId: string;
  connectedAt: Date;
}

export class PresenceManager {
  private onlineUsers: Map<string, OnlineUser> = new Map();
  private userSockets: Map<string, Set<string>> = new Map();

  constructor(private readonly logger: Logger) {}

  addUser(user: OnlineUser): void {
    this.onlineUsers.set(user.socketId, user);

    if (!this.userSockets.has(user.userId)) {
      this.userSockets.set(user.userId, new Set());
    }

    this.userSockets.get(user.userId)?.add(user.socketId);

    this.logger.info('User came online', {
      userId: user.userId,
      email: user.email,
      socketId: user.socketId,
    });
  }

  removeUser(socketId: string): OnlineUser | null {
    const user = this.onlineUsers.get(socketId);

    if (!user) {
      return null;
    }

    this.onlineUsers.delete(socketId);

    const sockets = this.userSockets.get(user.userId);
    if (sockets) {
      sockets.delete(socketId);

      if (sockets.size === 0) {
        this.userSockets.delete(user.userId);
        this.logger.info('User went offline', {
          userId: user.userId,
          email: user.email,
        });
      }
    }

    return user;
  }

  getUser(socketId: string): OnlineUser | null {
    return this.onlineUsers.get(socketId) || null;
  }

  isUserOnline(userId: string): boolean {
    const sockets = this.userSockets.get(userId);
    return sockets !== undefined && sockets.size > 0;
  }

  getOnlineUsers(): OnlineUser[] {
    return Array.from(this.onlineUsers.values());
  }

  getOnlineCount(): number {
    return this.userSockets.size;
  }

  getUserSockets(userId: string): string[] {
    const sockets = this.userSockets.get(userId);
    return sockets ? Array.from(sockets) : [];
  }
}
