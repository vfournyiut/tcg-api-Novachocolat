import { Socket } from 'socket.io';
import { ExtendedError } from 'socket.io/dist/namespace';
import jwt from 'jsonwebtoken';
import { env } from '../env';

/**
 * Interface pour les données décodées du token JWT
 */
interface JwtPayload {
  userId: number;
  email: string;
  username?: string;
  iat?: number;
}

/**
 * Extension de l'interface Socket pour inclure les données utilisateur
 */
declare module 'socket.io' {
  interface Socket {
    userId?: number;
    email?: string;
    username?: string;
  }
}

/**
 * Middleware d'authentification pour Socket.io
 * 
 * @param {Socket} socket - Socket Socket.io
 * @param {Function} next - Fonction next pour continuer ou rejeter la connexion
 * 
 * @throws {Error} Si token est manquant ou invalide
 * 
 * @example
 * // Utilisation dans Socket.io
 * io.use(socketAuthMiddleware);
 */
export function socketAuthMiddleware(socket: Socket, next: (err?: ExtendedError) => void): void {
  try {
    // Récupérer le token depuis handshake.auth
    const token = socket.handshake.auth.token;

    // Vérifier si le token est présent
    if (!token) {
      const err = new Error('No token provided') as ExtendedError;
      err.data = { type: 'AUTH_ERROR', message: 'Authentication error: No token provided' };
      return next(err);
    }

    // Vérifier et décoder le token JWT
    const decoded = jwt.verify(token, env.JWT_SECRET) as JwtPayload;

    // Injecter les informations utilisateur dans le socket
    socket.userId = decoded.userId;
    socket.email = decoded.email;
    socket.username = decoded.username;

    // Continuer la connexion
    next();
  } catch (error) {
    // Token invalide ou expiré
    if (error instanceof jwt.TokenExpiredError) {
      const err = new Error('Token expired') as ExtendedError;
      err.data = { type: 'AUTH_ERROR', message: 'Authentication error: Token expired' };
      return next(err);
    }
    if (error instanceof jwt.JsonWebTokenError) {
      const err = new Error('Invalid token') as ExtendedError;
      err.data = { type: 'AUTH_ERROR', message: 'Authentication error: Invalid token' };
      return next(err);
    }
    // Autre erreur
    const err = new Error((error as Error).message) as ExtendedError;
    err.data = { type: 'AUTH_ERROR', message: 'Authentication error: ' + (error as Error).message };
    return next(err);
  }
}
