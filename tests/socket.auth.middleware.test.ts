import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { Server } from 'socket.io';
import { io as Client, Socket as ClientSocket } from 'socket.io-client';
import { createServer } from 'http';
import jwt from 'jsonwebtoken';
import { env } from '../src/env';
import { socketAuthMiddleware } from '../src/socket/auth.middleware';

describe('Socket.io Authentication Middleware', () => {
  let io: Server;
  let serverSocket: any;
  let httpServer: any;
  let port: number;

  beforeAll(() => {
    return new Promise<void>((resolve) => {
      httpServer = createServer();
      io = new Server(httpServer, {
        cors: {
          origin: '*',
        },
      });

      // Apply authentication middleware
      io.use(socketAuthMiddleware);

      io.on('connection', (socket) => {
        serverSocket = socket;
      });

      // Get a random available port
      httpServer.listen(() => {
        port = (httpServer.address() as any).port;
        resolve();
      });
    });
  });

  afterAll(() => {
    io.close();
    httpServer.close();
  });

  it('should reject connection without token', () => {
    return new Promise<void>((resolve, reject) => {
      const clientSocket: ClientSocket = Client(`http://localhost:${port}`, {
        auth: {},
      });

      clientSocket.on('connect_error', (err: any) => {
        try {
          expect(err.data?.message).toContain('Authentication error');
          expect(err.data?.message).toContain('No token provided');
          clientSocket.disconnect();
          resolve();
        } catch (error) {
          clientSocket.disconnect();
          reject(error);
        }
      });

      clientSocket.on('connect', () => {
        clientSocket.disconnect();
        reject(new Error('Should not connect without token'));
      });
    });
  });

  it('should reject connection with invalid token', () => {
    return new Promise<void>((resolve, reject) => {
      const clientSocket: ClientSocket = Client(`http://localhost:${port}`, {
        auth: {
          token: 'invalid-token-here',
        },
      });

      clientSocket.on('connect_error', (err: any) => {
        try {
          expect(err.data?.message).toContain('Authentication error');
          expect(err.data?.message).toContain('Invalid token');
          clientSocket.disconnect();
          resolve();
        } catch (error) {
          clientSocket.disconnect();
          reject(error);
        }
      });

      clientSocket.on('connect', () => {
        clientSocket.disconnect();
        reject(new Error('Should not connect with invalid token'));
      });
    });
  });

  it('should accept connection with valid JWT token', () => {
    return new Promise<void>((resolve, reject) => {
      const validToken = jwt.sign(
        {
          userId: 1,
          email: 'test@example.com',
          username: 'testuser',
        },
        env.JWT_SECRET,
        { expiresIn: '1h' }
      );

      const clientSocket: ClientSocket = Client(`http://localhost:${port}`, {
        auth: {
          token: validToken,
        },
      });

      clientSocket.on('connect', () => {
        try {
          expect(clientSocket.connected).toBe(true);
          
          // Check that server socket has user info
          expect(serverSocket.userId).toBe(1);
          expect(serverSocket.email).toBe('test@example.com');
          expect(serverSocket.username).toBe('testuser');
          
          clientSocket.disconnect();
          resolve();
        } catch (error) {
          clientSocket.disconnect();
          reject(error);
        }
      });

      clientSocket.on('connect_error', (err: any) => {
        clientSocket.disconnect();
        reject(new Error(`Should connect with valid token: ${err.message || err.data?.message}`));
      });
    });
  });

  it('should inject user information in socket after authentication', () => {
    return new Promise<void>((resolve, reject) => {
      const validToken = jwt.sign(
        {
          userId: 42,
          email: 'john.doe@example.com',
          username: 'johndoe',
        },
        env.JWT_SECRET
      );

      const clientSocket: ClientSocket = Client(`http://localhost:${port}`, {
        auth: {
          token: validToken,
        },
      });

      clientSocket.on('connect', () => {
        try {
          // Verify user info is available in server socket
          expect(serverSocket.userId).toBe(42);
          expect(serverSocket.email).toBe('john.doe@example.com');
          expect(serverSocket.username).toBe('johndoe');
          
          clientSocket.disconnect();
          resolve();
        } catch (error) {
          clientSocket.disconnect();
          reject(error);
        }
      });

      clientSocket.on('connect_error', (err: any) => {
        clientSocket.disconnect();
        reject(new Error(`Should connect and inject user info: ${err.message || err.data?.message}`));
      });
    });
  });

  it('should reject expired token', () => {
    return new Promise<void>((resolve, reject) => {
      const expiredToken = jwt.sign(
        {
          userId: 1,
          email: 'test@example.com',
        },
        env.JWT_SECRET,
        { expiresIn: '-1h' }
      );

      const clientSocket: ClientSocket = Client(`http://localhost:${port}`, {
        auth: {
          token: expiredToken,
        },
      });

      clientSocket.on('connect_error', (err: any) => {
        try {
          expect(err.data?.message).toContain('Authentication error');
          expect(err.data?.message).toContain('expired');
          clientSocket.disconnect();
          resolve();
        } catch (error) {
          clientSocket.disconnect();
          reject(error);
        }
      });

      clientSocket.on('connect', () =>  {
        clientSocket.disconnect();
        reject(new Error('Should not connect with expired token'));
      });
    });
  });
});
