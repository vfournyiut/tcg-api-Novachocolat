// tests/auth.middleware.test.ts

// Importations
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { authMiddleware } from '../src/routes/auth.middleware';
import { env } from '../src/env';

// Définition d'interface
interface TestRequest extends Partial<Request> {
    user?: {
        userId: number;
        email: string;
    };
}

// Tests pour le middleware d'authentification
describe('Auth Middleware', () => {
    let req: TestRequest;
    let res: Partial<Response>;
    let next: NextFunction;

    // Réinitialisation des objets avant chaque test
    beforeEach(() => {
        req = {
            headers: {},
            user: undefined,
        };
        res = {
            status: vi.fn().mockReturnThis(),
            json: vi.fn(),
        };
        next = vi.fn();
    });

    // Test lorsque token manquant
    it('401 si token manquant', () => {
        authMiddleware(req as Request, res as Response, next);

        expect(res.status).toHaveBeenCalledWith(401);
        expect(res.json).toHaveBeenCalledWith({ error: 'Token manquant' });
        expect(next).not.toHaveBeenCalled();
    });

    // Test lorsque token manquant après Bearer
    it('401 si token manquant après Bearer', () => {
        req.headers = { authorization: 'Bearer' };
        
        authMiddleware(req as Request, res as Response, next);

        expect(res.status).toHaveBeenCalledWith(401);
        expect(res.json).toHaveBeenCalledWith({ error: 'Token manquant' });
        expect(next).not.toHaveBeenCalled();
    });

    // Test lorsque token invalide ou expiré
    it('401 si token invalide ou expiré', () => {
        req.headers = { authorization: 'Bearer invalid_token' };
        vi.spyOn(jwt, 'verify').mockImplementation(() => {
            throw new Error('Invalid token');
        });

        authMiddleware(req as Request, res as Response, next);

        expect(res.status).toHaveBeenCalledWith(401);
        expect(res.json).toHaveBeenCalledWith({ error: 'Token invalide ou expiré' });
        expect(next).not.toHaveBeenCalled();
    });

    // Test lorsque token valide
    it('200 si token valide', () => {
        const mockUser = { userId: 1, email: 'test@example.com' };
        req.headers = { authorization: 'Bearer valid_token' };
        vi.spyOn(jwt, 'verify').mockReturnValue(mockUser as any);

        authMiddleware(req as Request, res as Response, next);

        expect(jwt.verify).toHaveBeenCalledWith('valid_token', env.JWT_SECRET);
        expect(req.user).toEqual(mockUser);
        expect(next).toHaveBeenCalled();
    });
});
