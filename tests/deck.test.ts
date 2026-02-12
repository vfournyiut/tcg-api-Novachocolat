// tests/deck.test.ts

// Importations
import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import { app } from '../src/index';
import { prismaMock } from './vitest.setup';
import jwt from 'jsonwebtoken';
import { env } from '../src/env';

// Tests pour les routes de decks
describe('Deck Routes', () => {
    const userId = 1;
    const token = jwt.sign({ userId, email: 'test@test.com' }, env.JWT_SECRET);
    const authHeader = `Bearer ${token}`;

    beforeEach(() => {
        vi.clearAllMocks();
    });

    // Tests pour POST /api/decks
    describe('POST /api/decks', () => {
        // Tests d'authentification
        it('401 si non authentifié', async () => {
            const res = await request(app)
                .post('/api/decks')
                .send({ name: 'Test', cards: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10] });

            expect(res.status).toBe(401);
        });

        // Tests de validation des données
        it('400 si le nom est manquant', async () => {
            const res = await request(app)
                .post('/api/decks')
                .set('Authorization', authHeader)
                .send({ cards: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10] });

            expect(res.status).toBe(400);
            expect(res.body.error).toBe('Le nom du deck est requis');
        });

        // Tests de validation des cartes
        it('400 si les cartes ne sont pas un tableau', async () => {
            const res = await request(app)
                .post('/api/decks')
                .set('Authorization', authHeader)
                .send({ name: 'Test', cards: 'not-an-array' });

            expect(res.status).toBe(400);
            expect(res.body.error).toBe('Le deck doit contenir exactement 10 cartes');
        });

        // Tests de validation du nombre de cartes
        it('400 si le tableau de cartes contient moins de 10 cartes', async () => {
            const res = await request(app)
                .post('/api/decks')
                .set('Authorization', authHeader)
                .send({ name: 'Test', cards: [1, 2, 3] });

            expect(res.status).toBe(400);
            expect(res.body.error).toBe('Le deck doit contenir exactement 10 cartes');
        });

        // Tests de validation du nombre de cartes
        it('400 si le tableau de cartes contient plus de 10 cartes', async () => {
            const res = await request(app)
                .post('/api/decks')
                .set('Authorization', authHeader)
                .send({ name: 'Test', cards: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11] });

            expect(res.status).toBe(400);
            expect(res.body.error).toBe('Le deck doit contenir exactement 10 cartes');
        });

        // Tests de validation de l'existence des cartes
        it('400 si certaines cartes n\'existent pas', async () => {
            prismaMock.card.findMany.mockResolvedValue([
                { id: 1 }, { id: 2 }, { id: 3 }
            ] as any);

            const res = await request(app)
                .post('/api/decks')
                .set('Authorization', authHeader)
                .send({ name: 'Test', cards: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10] });

            expect(res.status).toBe(400);
            expect(res.body.error).toBe('Certaines cartes sont invalides ou inexistantes');
        });

        // Tests de validation de l'existence des cartes
        it('Créer un deck et retourner 201 en cas de succès', async () => {
            const cardsInput = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
            prismaMock.card.findMany.mockResolvedValue(
                cardsInput.map(id => ({ id })) as any
            );

            const createdDeck = { 
                id: 100, 
                name: 'Test Deck', 
                userId, 
                cards: [],
                createdAt: new Date(),
                updatedAt: new Date()
            };
            prismaMock.deck.create.mockResolvedValue(createdDeck as any);

            const res = await request(app)
                .post('/api/decks')
                .set('Authorization', authHeader)
                .send({ name: 'Test Deck', cards: cardsInput });

            expect(res.status).toBe(201);
            expect(res.body.name).toBe('Test Deck');
            expect(prismaMock.deck.create).toHaveBeenCalled();
        });

        // Tests d'erreur serveur
        it('500 en cas d\'erreur de base de données', async () => {
            prismaMock.card.findMany.mockRejectedValue(new Error('DB Error'));

            const res = await request(app)
                .post('/api/decks')
                .set('Authorization', authHeader)
                .send({ name: 'Test', cards: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10] });

            expect(res.status).toBe(500);
        });
    });

    // Tests pour GET /api/decks/mine
    describe('GET /api/decks/mine', () => {
        // Tests d'authentification
        it('401 si non authentifié', async () => {
            const res = await request(app).get('/api/decks/mine');
            expect(res.status).toBe(401);
        });

        // Tests de récupération des decks de l'utilisateur
        it('Retourner les decks de l\'utilisateur', async () => {
            const decks = [
                { id: 1, name: 'Deck 1', userId, cards: [], createdAt: new Date(), updatedAt: new Date() },
                { id: 2, name: 'Deck 2', userId, cards: [], createdAt: new Date(), updatedAt: new Date() }
            ];
            prismaMock.deck.findMany.mockResolvedValue(decks as any);

            const res = await request(app)
                .get('/api/decks/mine')
                .set('Authorization', authHeader);

            expect(res.status).toBe(200);
            expect(res.body).toHaveLength(2);
            expect(prismaMock.deck.findMany).toHaveBeenCalledWith(
                expect.objectContaining({ where: { userId } })
            );
        });

        // Tests de récupération lorsque l'utilisateur n'a pas de decks
        it('Retourner un tableau vide si l\'utilisateur n\'a pas de decks', async () => {
            prismaMock.deck.findMany.mockResolvedValue([]);

            const res = await request(app)
                .get('/api/decks/mine')
                .set('Authorization', authHeader);

            expect(res.status).toBe(200);
            expect(res.body).toEqual([]);
        });

        // Tests d'erreur serveur
        it('500 en cas d\'erreur de base de données', async () => {
            prismaMock.deck.findMany.mockRejectedValue(new Error('DB Error'));

            const res = await request(app)
                .get('/api/decks/mine')
                .set('Authorization', authHeader);

            expect(res.status).toBe(500);
        });
    });

    // Tests pour GET /api/decks/:id
    describe('GET /api/decks/:id', () => {
        // Tests d'authentification
        it('401 si non authentifié', async () => {
            const res = await request(app).get('/api/decks/1');
            expect(res.status).toBe(401);
        });

        // Tests de validation de l'ID
        it('400 pour un ID invalide', async () => {
            const res = await request(app)
                .get('/api/decks/abc')
                .set('Authorization', authHeader);

            expect(res.status).toBe(400);
            expect(res.body.error).toBe('ID de deck invalide');
        });

        // Tests de validation de l'existence du deck
        it('404 si le deck n\'est pas trouvé', async () => {
            prismaMock.deck.findFirst.mockResolvedValue(null);

            const res = await request(app)
                .get('/api/decks/999')
                .set('Authorization', authHeader);

            expect(res.status).toBe(404);
            expect(res.body.error).toBe('Deck non trouvé ou accès non autorisé');
        });

        // Tests de validation de la possession du deck
        it('Retourner le deck si trouvé et possédé', async () => {
            const deck = { 
                id: 1, 
                name: 'My Deck', 
                userId,
                cards: [],
                createdAt: new Date(),
                updatedAt: new Date()
            };
            prismaMock.deck.findFirst.mockResolvedValue(deck as any);

            const res = await request(app)
                .get('/api/decks/1')
                .set('Authorization', authHeader);

            expect(res.status).toBe(200);
            expect(res.body.id).toBe(1);
            expect(res.body.name).toBe('My Deck');
        });

        // Tests d'erreur serveur
        it('500 en cas d\'erreur de base de données', async () => {
            prismaMock.deck.findFirst.mockRejectedValue(new Error('DB Error'));

            const res = await request(app)
                .get('/api/decks/1')
                .set('Authorization', authHeader);

            expect(res.status).toBe(500);
        });
    });

    // Tests pour PATCH /api/decks/:id
    describe('PATCH /api/decks/:id', () => {
        // Tests d'authentification
        it('401 si non authentifié', async () => {
            const res = await request(app)
                .patch('/api/decks/1')
                .send({ name: 'New Name' });

            expect(res.status).toBe(401);
        });

        // Tests de validation de l'ID
        it('400 pour un ID invalide', async () => {
            const res = await request(app)
                .patch('/api/decks/abc')
                .set('Authorization', authHeader)
                .send({ name: 'New Name' });

            expect(res.status).toBe(400);
            expect(res.body.error).toBe('ID de deck invalide');
        });

        // Tests de validation de l'existence du deck
        it('404 si le deck n\'est pas trouvé', async () => {
            prismaMock.deck.findFirst.mockResolvedValue(null);

            const res = await request(app)
                .patch('/api/decks/999')
                .set('Authorization', authHeader)
                .send({ name: 'New Name' });

            expect(res.status).toBe(404);
            expect(res.body.error).toBe('Deck non trouvé ou accès non autorisé');
        });

        // Tests de validation de la possession du deck
        it('400 si aucune donnée à mettre à jour', async () => {
            const existingDeck = { 
                id: 1, 
                name: 'Old', 
                userId,
                createdAt: new Date(),
                updatedAt: new Date()
            };
            prismaMock.deck.findFirst.mockResolvedValue(existingDeck as any);

            const res = await request(app)
                .patch('/api/decks/1')
                .set('Authorization', authHeader)
                .send({});

            expect(res.status).toBe(400);
            expect(res.body.error).toBe('Aucune donnée à mettre à jour');
        });

        // Tests de mise à jour du nom du deck
        it('Mettre à jour le nom du deck', async () => {
            const existingDeck = { 
                id: 1, 
                name: 'Old', 
                userId,
                createdAt: new Date(),
                updatedAt: new Date()
            };
            prismaMock.deck.findFirst.mockResolvedValue(existingDeck as any);
            prismaMock.deck.update.mockResolvedValue({ 
                ...existingDeck, 
                name: 'New' 
            } as any);

            const res = await request(app)
                .patch('/api/decks/1')
                .set('Authorization', authHeader)
                .send({ name: 'New' });

            expect(res.status).toBe(200);
            expect(res.body.name).toBe('New');
        });

        // Tests de mise à jour des cartes du deck
        it('400 si le tableau de cartes est invalide', async () => {
            const existingDeck = { id: 1, name: 'Deck', userId };
            prismaMock.deck.findFirst.mockResolvedValue(existingDeck as any);

            const res = await request(app)
                .patch('/api/decks/1')
                .set('Authorization', authHeader)
                .send({ cards: [1, 2, 3] });

            expect(res.status).toBe(400);
            expect(res.body.error).toBe('Le deck doit contenir exactement 10 cartes');
        });

        // Tests de mise à jour des cartes du deck
        it('400 si certaines cartes n\'existent pas', async () => {
            const existingDeck = { id: 1, name: 'Deck', userId };
            prismaMock.deck.findFirst.mockResolvedValue(existingDeck as any);
            prismaMock.card.findMany.mockResolvedValue([{ id: 1 }] as any);

            const res = await request(app)
                .patch('/api/decks/1')
                .set('Authorization', authHeader)
                .send({ cards: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10] });

            expect(res.status).toBe(400);
            expect(res.body.error).toBe('Certaines cartes sont invalides ou inexistantes');
        });

        // Tests de mise à jour des cartes du deck
        it('Mettre à jour les cartes correctement', async () => {
            const existingDeck = { id: 1, name: 'Deck', userId };
            const newCards = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
            
            prismaMock.deck.findFirst.mockResolvedValue(existingDeck as any);
            prismaMock.card.findMany.mockResolvedValue(
                newCards.map(id => ({ id })) as any
            );
            prismaMock.deck.update.mockResolvedValue({ 
                ...existingDeck,
                cards: []
            } as any);

            const res = await request(app)
                .patch('/api/decks/1')
                .set('Authorization', authHeader)
                .send({ cards: newCards });

            expect(res.status).toBe(200);
        });

        // Tests d'erreur serveur
        it('500 en cas d\'erreur de base de données', async () => {
            prismaMock.deck.findFirst.mockRejectedValue(new Error('DB Error'));

            const res = await request(app)
                .patch('/api/decks/1')
                .set('Authorization', authHeader)
                .send({ name: 'New' });

            expect(res.status).toBe(500);
        });
    });

    // Tests pour DELETE /api/decks/:id
    describe('DELETE /api/decks/:id', () => {
        // Tests d'authentification
        it('401 si non authentifié', async () => {
            const res = await request(app).delete('/api/decks/1');
            expect(res.status).toBe(401);
        });

        // Tests de validation de l'ID
        it('400 si l\'ID est invalide', async () => {
            const res = await request(app)
                .delete('/api/decks/abc')
                .set('Authorization', authHeader);

            expect(res.status).toBe(400);
            expect(res.body.error).toBe('ID de deck invalide');
        });

        // Tests de validation de l'existence du deck
        it('404 si le deck n\'est pas trouvé', async () => {
            prismaMock.deck.findFirst.mockResolvedValue(null);

            const res = await request(app)
                .delete('/api/decks/999')
                .set('Authorization', authHeader);

            expect(res.status).toBe(404);
            expect(res.body.error).toBe('Deck non trouvé ou accès non autorisé');
        });

        // Tests de validation de la possession du deck
        it('Supprimer le deck et retourner 200', async () => {
            const existingDeck = { id: 1, userId };
            prismaMock.deck.findFirst.mockResolvedValue(existingDeck as any);
            prismaMock.$transaction.mockResolvedValue([{}, {}] as any);

            const res = await request(app)
                .delete('/api/decks/1')
                .set('Authorization', authHeader);

            expect(res.status).toBe(200);
            expect(res.body).toEqual({ message: 'Deck supprimé avec succès' });
        });

        // Tests d'erreur serveur
        it('500 en cas d\'erreur de base de données', async () => {
            prismaMock.deck.findFirst.mockRejectedValue(new Error('DB Error'));

            const res = await request(app)
                .delete('/api/decks/1')
                .set('Authorization', authHeader);

            expect(res.status).toBe(500);
        });
    });
});
