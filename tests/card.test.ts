// tests/card.test.ts

// Importations
import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { app } from '../src/index';
import { prismaMock } from './vitest.setup';
import { PokemonType } from '../src/generated/prisma/client';

// Tests pour les routes cartes
describe('Card Routes', () => {
    beforeEach(() => {
        // Réinitialiser les mocks avant chaque test
    });

    // Tests pour GET /api/cards
    describe('GET /api/cards', () => {
        // Tests de récupération de toutes les cartes
        it('Retourner toutes les cartes triées par pokedexNumber', async () => {
            const mockCards = [
                { 
                    id: 1, 
                    name: 'Bulbasaur', 
                    pokedexNumber: 1, 
                    type: PokemonType.Grass, 
                    hp: 45, 
                    attack: 49, 
                    imgUrl: 'url1', 
                    createdAt: new Date(), 
                    updatedAt: new Date() 
                },
                { 
                    id: 2, 
                    name: 'Ivysaur', 
                    pokedexNumber: 2, 
                    type: PokemonType.Grass, 
                    hp: 60, 
                    attack: 62, 
                    imgUrl: 'url2', 
                    createdAt: new Date(), 
                    updatedAt: new Date() 
                }
            ];

            prismaMock.card.findMany.mockResolvedValue(mockCards as any);

            const res = await request(app).get('/api/cards');

            expect(res.status).toBe(200);
            expect(res.body).toHaveLength(2);
            expect(res.body[0].name).toBe('Bulbasaur');
            expect(res.body[1].name).toBe('Ivysaur');
            expect(prismaMock.card.findMany).toHaveBeenCalledWith({
                orderBy: { pokedexNumber: 'asc' }
            });
        });

        // Tests de récupération lorsque aucune carte n'existe
        it('Retourner un tableau vide si aucune carte n\'existe', async () => {
            prismaMock.card.findMany.mockResolvedValue([]);

            const res = await request(app).get('/api/cards');

            expect(res.status).toBe(200);
            expect(res.body).toEqual([]);
        });

        // Tests d'erreur serveur
        it('500 en cas d\'erreur de base de données', async () => {
            prismaMock.card.findMany.mockRejectedValue(new Error('DB Error'));

            const res = await request(app).get('/api/cards');

            expect(res.status).toBe(500);
            expect(res.body).toEqual({ error: 'Erreur serveur' });
        });
    });
});
