import { Router } from 'express';
import { prisma } from '../database';

export const cardsRouter = Router();

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