import { Router } from 'express';
import { prisma } from '../database';

export const cardsRouter = Router();

/**
 * Route GET /api/cards
 * Récupère toutes les cartes Pokémon disponibles dans la base de données.
 * Les cartes sont triées par ordre croissant de numéro Pokédex.
 * 
 * @route GET /api/cards
 * @access Public
 * 
 * @returns {Response} 200 - Liste des cartes avec leurs informations complètes
 * @returns {Response} 500 - Erreur serveur lors de la récupération
 * 
 * @throws {500} Erreur serveur - Problème de connexion à la base de données
 * 
 * @example
 * // Réponse réussie (200)
 * [
 *   {
 *     "id": 1,
 *     "name": "Bulbasaur",
 *     "pokedexNumber": 1,
 *     "type": "Grass",
 *     "hp": 45,
 *     "attack": 49,
 *     "imgUrl": "https://..."
 *   }
 * ]
 */
cardsRouter.get('/', async (_req, res) => {

  try {
    const cards = await prisma.card.findMany({
      orderBy: {
        pokedexNumber: 'asc',
      },
    });

    return res.status(200).json(cards);

  } catch (error) {
    console.error('Erreur lors de la récupération des cartes:', error);
    return res.status(500).json({ error: 'Erreur serveur' });
  }

});