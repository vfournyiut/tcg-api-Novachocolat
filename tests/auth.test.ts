// tests/auth.test.ts

// Importations
import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import { app } from '../src/index';
import { prismaMock } from './vitest.setup';
import bcrypt from 'bcrypt';
import bcryptjs from 'bcryptjs';

// Mock des modules bcrypt et bcryptjs
vi.mock('bcrypt');
vi.mock('bcryptjs');

// Tests des routes d'authentification
describe('Auth Routes', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    // Tests route de création de compte
    describe('POST /api/auth/sign-up', () => {
        // Tests de validation champs requis
        it('400 si l\'email est manquant', async () => {
            const res = await request(app)
                .post('/api/auth/sign-up')
                .send({ username: 'user', password: 'password' });

            expect(res.status).toBe(400);
            expect(res.body).toEqual({ error: 'Email, username et mot de passe sont requis' });
        });

        // Tests de validation champs requis
        it('400 si le mot de passe est manquant', async () => {
            const res = await request(app)
                .post('/api/auth/sign-up')
                .send({ email: 'test@test.com', username: 'user' });

            expect(res.status).toBe(400);
            expect(res.body).toEqual({ error: 'Email, username et mot de passe sont requis' });
        });

        // Tests de validation email existant
        it('409 si l\'email existe déjà', async () => {
            const res = await request(app)
                .post('/api/auth/sign-up')
                .send({ email: 'test@test.com', username: 'user' });

            expect(res.status).toBe(400);
            expect(res.body).toEqual({ error: 'Email, username et mot de passe sont requis' });
        });

        it('409 si l\'email existe déjà', async () => {
            prismaMock.user.findUnique.mockResolvedValue({ 
                id: 1, 
                email: 'exists@test.com',
                username: 'existing',
                password: 'hashed',
                createdAt: new Date(),
                updatedAt: new Date()
            } as any);

            const res = await request(app)
                .post('/api/auth/sign-up')
                .send({ email: 'exists@test.com', username: 'user', password: 'password' });

            expect(res.status).toBe(409);
            expect(res.body).toEqual({ error: 'Cet email est déjà utilisé' });
        });

        // Tests de création de compte réussie
        it('201 et création de l\'utilisateur en cas de succès', async () => {
            prismaMock.user.findUnique.mockResolvedValue(null);
            (bcrypt.hash as any).mockResolvedValue('hashed_password');
            prismaMock.user.create.mockResolvedValue({
                id: 1,
                username: 'newuser',
                email: 'new@test.com',
                password: 'hashed_password',
                createdAt: new Date(),
                updatedAt: new Date(),
            } as any);

            const res = await request(app)
                .post('/api/auth/sign-up')
                .send({ email: 'new@test.com', username: 'newuser', password: 'password' });

            expect(res.status).toBe(201);
            expect(res.body).toHaveProperty('token');
            expect(res.body).toHaveProperty('message', 'Compte créé avec succès');
            expect(res.body.user).toEqual({ id: 1, username: 'newuser', email: 'new@test.com' });
        });

        // Tests d'erreur serveur
        it('500 en cas d\'erreur de base de données', async () => {
            prismaMock.user.findUnique.mockRejectedValue(new Error('DB Error'));

            const res = await request(app)
                .post('/api/auth/sign-up')
                .send({ email: 'new@test.com', username: 'newuser', password: 'password' });

            expect(res.status).toBe(500);
            expect(res.body).toEqual({ error: 'Erreur serveur' });
        });
    });

    // Tests route de connexion
    describe('POST /api/auth/sign-in', () => {
        // Tests de validation champs requis
        it('400 si l\'email est manquant', async () => {
            const res = await request(app)
                .post('/api/auth/sign-in')
                .send({ password: 'password' });

            expect(res.status).toBe(400);
            expect(res.body).toEqual({ error: 'Email et mot de passe sont requis' });
        });

        // Tests de validation champs requis
        it('400 si le mot de passe est manquant', async () => {
            const res = await request(app)
                .post('/api/auth/sign-in')
                .send({ email: 'test@test.com' });

            expect(res.status).toBe(400);
            expect(res.body).toEqual({ error: 'Email et mot de passe sont requis' });
        });

        // Tests de validation utilisateur non trouvé
        it('401 si l\'utilisateur n\'est pas trouvé', async () => {
            prismaMock.user.findUnique.mockResolvedValue(null);

            const res = await request(app)
                .post('/api/auth/sign-in')
                .send({ email: 'notfound@test.com', password: 'password' });

            expect(res.status).toBe(401);
            expect(res.body).toEqual({ error: 'Email ou mot de passe incorrect' });
        });

        // Tests de validation mot de passe invalide
        it('401 si le mot de passe est invalide', async () => {
            prismaMock.user.findUnique.mockResolvedValue({
                id: 1,
                email: 'test@test.com',
                username: 'user',
                password: 'hashed_password',
                createdAt: new Date(),
                updatedAt: new Date()
            } as any);
            (bcryptjs.compare as any).mockResolvedValue(false);

            const res = await request(app)
                .post('/api/auth/sign-in')
                .send({ email: 'test@test.com', password: 'wrong' });

            expect(res.status).toBe(401);
            expect(res.body).toEqual({ error: 'Email ou mot de passe incorrect' });
        });

        // Tests de connexion réussie
        it('200 et un token en cas de succès', async () => {
            prismaMock.user.findUnique.mockResolvedValue({
                id: 1,
                username: 'user',
                email: 'test@test.com',
                password: 'hashed_password',
                createdAt: new Date(),
                updatedAt: new Date()
            } as any);
            (bcryptjs.compare as any).mockResolvedValue(true);

            const res = await request(app)
                .post('/api/auth/sign-in')
                .send({ email: 'test@test.com', password: 'password' });

            expect(res.status).toBe(200);
            expect(res.body).toHaveProperty('token');
            expect(res.body).toHaveProperty('message', 'Connexion réussie');
            expect(res.body.user).toEqual({ id: 1, username: 'user', email: 'test@test.com' });
        });

        // Tests d'erreur serveur
        it('500 en cas d\'erreur de base de données', async () => {
            prismaMock.user.findUnique.mockRejectedValue(new Error('DB Error'));

            const res = await request(app)
                .post('/api/auth/sign-in')
                .send({ email: 'test@test.com', password: 'password' });

            expect(res.status).toBe(500);
            expect(res.body).toEqual({ error: 'Erreur serveur' });
        });
    });

    // Tests du middleware d'authentification
    describe('POST /api/auth/login', () => {
        // Tests de validation utilisateur non trouvé
        it('401 si l\'utilisateur n\'est pas trouvé', async () => {
            prismaMock.user.findUnique.mockResolvedValue(null);

            const res = await request(app)
                .post('/api/auth/login')
                .send({ email: 'notfound@test.com', password: 'password' });

            expect(res.status).toBe(401);
            expect(res.body).toEqual({ error: 'Email ou mot de passe incorrect' });
        });

        // Tests de validation mot de passe invalide
        it('401 si le mot de passe est invalide', async () => {
            prismaMock.user.findUnique.mockResolvedValue({
                id: 1,
                email: 'test@test.com',
                username: 'user',
                password: 'hashed_password',
                createdAt: new Date(),
                updatedAt: new Date()
            } as any);
            (bcrypt.compare as any).mockResolvedValue(false);

            const res = await request(app)
                .post('/api/auth/login')
                .send({ email: 'test@test.com', password: 'wrong' });

            expect(res.status).toBe(401);
            expect(res.body).toEqual({ error: 'Email ou mot de passe incorrect' });
        });

        // Tests de connexion réussie
        it('200 et un token en cas de succès', async () => {
            prismaMock.user.findUnique.mockResolvedValue({
                id: 1,
                username: 'user',
                email: 'test@test.com',
                password: 'hashed_password',
                createdAt: new Date(),
                updatedAt: new Date()
            } as any);
            (bcrypt.compare as any).mockResolvedValue(true);

            const res = await request(app)
                .post('/api/auth/login')
                .send({ email: 'test@test.com', password: 'password' });

            expect(res.status).toBe(200);
            expect(res.body).toHaveProperty('token');
            expect(res.body).toHaveProperty('message', 'Connexion réussie');
            expect(res.body.user).toEqual({ id: 1, username: 'user', email: 'test@test.com' });
        });

        // Tests d'erreur serveur
        it('500 en cas d\'erreur de base de données', async () => {
            prismaMock.user.findUnique.mockRejectedValue(new Error('DB Error'));

            const res = await request(app)
                .post('/api/auth/login')
                .send({ email: 'test@test.com', password: 'password' });

            expect(res.status).toBe(500);
            expect(res.body).toEqual({ error: 'Erreur serveur' });
        });
    });
});
