import { Router, Request, Response } from 'express';
import { prisma } from '../database';
import { authMiddleware } from './auth.middleware';

export const decksRouter = Router();

// =================================================================
// CREATE DECK
// =================================================================

// POST /decks - Create a new deck
decksRouter.post('/', authMiddleware, async (req: Request, res: Response): Promise<void> => {
    try {
        const userId = req.user?.userId;
        const { name, cards } = req.body;


        if (!userId) {
             res.status(401).json({ error: 'Utilisateur non authentifié' });
             return;
        }

        if (!name) {
             res.status(400).json({ error: 'Le nom du deck est requis' });
             return;
        }

        if (!Array.isArray(cards) || cards.length !== 10) {
             res.status(400).json({ error: 'Le deck doit contenir exactement 10 cartes' });
             return;
        }

        const distinctCardIds = [...new Set(cards as number[])];
        
        const existingCards = await prisma.card.findMany({
            where: {
                id: { in: distinctCardIds }
            },
            select: { id: true }
        });

        if (existingCards.length !== distinctCardIds.length) {
             res.status(400).json({ error: 'Certaines cartes sont invalides ou inexistantes' });
             return;
        }

        const deck = await prisma.deck.create({
            data: {
                name,
                userId,
                cards: {
                    create: cards.map((cardId: number) => ({
                        cardId
                    }))
                }
            },
            include: {
                cards: {
                    include: {
                        cards: true
                    }
                } 
            }
        });

        res.status(201).json(deck);

    } catch (error) {
        console.error('Error creating deck:', error);
        res.status(500).json({ error: 'Erreur serveur lors de la création du deck' });
    }
});

// =================================================================
// GET DECKS
// =================================================================

// GET /decks/mine - Get all decks of the authenticated user
decksRouter.get('/mine', authMiddleware, async (req: Request, res: Response): Promise<void> => {
    try {
        const userId = req.user?.userId;

        if (!userId) {
             res.status(401).json({ error: 'Utilisateur non authentifié' });
             return;
        }

        const decks = await prisma.deck.findMany({
            where: {
                userId: userId
            },
            include: {
                cards: {
                    include: {
                        cards: true
                    }
                }
            }
        });

        res.status(200).json(decks);

    } catch (error) {
        console.error('Error retrieving user decks:', error);
        res.status(500).json({ error: 'Erreur serveur lors de la récupération des decks' });
    }
});

// =================================================================
// GET DECK BY ID
// =================================================================

// GET /decks/:id - Get a specific deck by ID
decksRouter.get('/:id', authMiddleware, async (req: Request, res: Response): Promise<void> => {
    try {
        const userId = req.user?.userId;
        const deckId = parseInt(req.params.id);

        if (!userId) {
             res.status(401).json({ error: 'Utilisateur non authentifié' });
             return;
        }

        if (isNaN(deckId)) {
             res.status(400).json({ error: 'ID de deck invalide' });
             return;
        }

        const deck = await prisma.deck.findFirst({
            where: {
                id: deckId,
                userId: userId
            },
            include: {
                cards: {
                    include: {
                        cards: true
                    }
                }
            }
        });

        if (!deck) {
             res.status(404).json({ error: 'Deck non trouvé ou accès non autorisé' });
             return;
        }

        res.status(200).json(deck);

    } catch (error) {
        console.error('Error retrieving deck:', error);
        res.status(500).json({ error: 'Erreur serveur lors de la récupération du deck' });
    }
});

// =================================================================
// UPDATE DECK
// =================================================================

// PATCH /decks/:id - Update a specific deck
decksRouter.patch('/:id', authMiddleware, async (req: Request, res: Response): Promise<void> => {
    try {
        const userId = req.user?.userId;
        const deckId = parseInt(req.params.id);
        const { name, cards } = req.body;

        if (!userId) {
             res.status(401).json({ error: 'Utilisateur non authentifié' });
             return;
        }

        if (isNaN(deckId)) {
             res.status(400).json({ error: 'ID de deck invalide' });
             return;
        }

        // Vérification que le deck appartient à l'utilisateur
        const existingDeck = await prisma.deck.findFirst({
            where: {
                id: deckId,
                userId: userId
            }
        });

        if (!existingDeck) {
             res.status(404).json({ error: 'Deck non trouvé ou accès non autorisé' });
             return;
        }

        // Préparation des données
        const updateData: any = {};

        if (name) {
            updateData.name = name;
        }

        if (cards) {
            // Validation des cartes
            if (!Array.isArray(cards) || cards.length !== 10) {
                 res.status(400).json({ error: 'Le deck doit contenir exactement 10 cartes' });
                 return;
            }

            const distinctCardIds = [...new Set(cards as number[])];
            const existingCards = await prisma.card.findMany({
                where: { id: { in: distinctCardIds } },
                select: { id: true }
            });

            if (existingCards.length !== distinctCardIds.length) {
                 res.status(400).json({ error: 'Certaines cartes sont invalides ou inexistantes' });
                 return;
            }

            // Remplacement des cartes
            updateData.cards = {
                deleteMany: {},
                create: cards.map((cardId: number) => ({
                    cardId
                }))
            };
        }

        if (Object.keys(updateData).length === 0) {
             res.status(400).json({ error: 'Aucune donnée à mettre à jour' });
             return;
        }

        const updatedDeck = await prisma.deck.update({
            where: { id: deckId },
            data: updateData,
            include: {
                cards: {
                    include: { cards: true }
                }
            }
        });

        res.status(200).json(updatedDeck);

    } catch (error) {
        console.error('Error updating deck:', error);
        res.status(500).json({ error: 'Erreur serveur lors de la modification du deck' });
    }
});

// =================================================================
// DELETE DECK
// =================================================================

// DELETE /decks/:id - Delete a specific deck
decksRouter.delete('/:id', authMiddleware, async (req: Request, res: Response): Promise<void> => {
    try {
        const userId = req.user?.userId;
        const deckId = parseInt(req.params.id);

        if (!userId) {
             res.status(401).json({ error: 'Utilisateur non authentifié' });
             return;
        }

        if (isNaN(deckId)) {
             res.status(400).json({ error: 'ID de deck invalide' });
             return;
        }

        // Vérification que le deck existe et appartient à l'utilisateur
        const existingDeck = await prisma.deck.findFirst({
            where: {
                id: deckId,
                userId: userId
            }
        });

        if (!existingDeck) {
             res.status(404).json({ error: 'Deck non trouvé ou accès non autorisé' });
             return;
        }

        // Suppression des cartes associées puis du deck
        await prisma.$transaction([
            prisma.deckCard.deleteMany({
                where: { deckId: deckId }
            }),
            prisma.deck.delete({
                where: { id: deckId }
            })
        ]);

        res.status(200).json({ message: 'Deck supprimé avec succès' });

    } catch (error) {
        console.error('Error deleting deck:', error);
        res.status(500).json({ error: 'Erreur serveur lors de la suppression du deck' });
    }
});
