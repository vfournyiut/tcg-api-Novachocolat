import { Router, Request, Response } from 'express';
import { prisma } from '../database';
import { authMiddleware } from './auth.middleware';

export const decksRouter = Router();

// =================================================================
// CREATE DECK
// =================================================================

/**
 * Route POST /api/decks
 * Crée un nouveau deck pour l'utilisateur authentifié.
 * Le deck doit contenir exactement 10 cartes valides.
 * 
 * @route POST /api/decks
 * @access Privé (nécessite authentification JWT)
 * 
 * @param {Object} req.body - Corps de la requête
 * @param {string} req.body.name - Nom du deck
 * @param {number[]} req.body.cards - Tableau de 10 IDs de cartes
 * 
 * @returns {Response} 201 - Deck créé avec succès
 * @returns {Response} 400 - Validation échouée (nom manquant, nombre de cartes incorrect, cartes invalides)
 * @returns {Response} 401 - Non authentifié (token manquant ou invalide)
 * @returns {Response} 500 - Erreur serveur
 * 
 * @throws {400} Nom requis - Le nom du deck n'est pas fourni
 * @throws {400} Nombre de cartes - Le deck ne contient pas exactement 10 cartes
 * @throws {400} Cartes invalides - Certaines cartes n'existent pas dans la base
 * @throws {401} Non authentifié - Token JWT manquant ou invalide
 * @throws {500} Erreur serveur - Problème lors de la création du deck
 * 
 * @example
 * // Requête
 * POST /api/decks
 * Authorization: Bearer eyJhbGciOiJIUzI1NiIs...
 * {
 *   "name": "Mon Deck Feu",
 *   "cards": [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
 * }
 * 
 * // Réponse réussie (201)
 * {
 *   "id": 1,
 *   "name": "Mon Deck Feu",
 *   "userId": 1,
 *   "cards": [...]
 * }
 */
// POST /decks - Create a new deck
decksRouter.post('/', authMiddleware, async (req: Request, res: Response): Promise<void> => {
    try {
        const userId = req.user!.userId;
        const { name, cards } = req.body;

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

/**
 * Route GET /api/decks/mine
 * Récupère tous les decks appartenant à l'utilisateur authentifié.
 * Inclut toutes les cartes associées à chaque deck.
 * 
 * @route GET /api/decks/mine
 * @access Privé (nécessite authentification JWT)
 * 
 * @returns {Response} 200 - Liste des decks de l'utilisateur
 * @returns {Response} 401 - Non authentifié (token manquant ou invalide)
 * @returns {Response} 500 - Erreur serveur
 * 
 * @throws {401} Non authentifié - Token JWT manquant ou invalide
 * @throws {500} Erreur serveur - Problème lors de la récupération des decks
 * 
 * @example
 * // Requête
 * GET /api/decks/mine
 * Authorization: Bearer eyJhbGciOiJIUzI1NiIs...
 * 
 * // Réponse réussie (200)
 * [
 *   {
 *     "id": 1,
 *     "name": "Mon Deck Feu",
 *     "userId": 1,
 *     "cards": [...]
 *   },
 *   {
 *     "id": 2,
 *     "name": "Mon Deck Eau",
 *     "userId": 1,
 *     "cards": [...]
 *   }
 * ]
 */
// GET /decks/mine - Get all decks of the authenticated user
decksRouter.get('/mine', authMiddleware, async (req: Request, res: Response): Promise<void> => {
    try {
        const userId = req.user!.userId;

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

/**
 * Route GET /api/decks/:id
 * Récupère un deck spécifique par son ID.
 * Vérifie que le deck appartient à l'utilisateur authentifié.
 * 
 * @route GET /api/decks/:id
 * @access Privé (nécessite authentification JWT)
 * 
 * @param {string} req.params.id - ID du deck à récupérer
 * 
 * @returns {Response} 200 - Deck trouvé avec toutes ses cartes
 * @returns {Response} 400 - ID de deck invalide (non numérique)
 * @returns {Response} 401 - Non authentifié (token manquant ou invalide)
 * @returns {Response} 404 - Deck non trouvé ou non autorisé
 * @returns {Response} 500 - Erreur serveur
 * 
 * @throws {400} ID invalide - L'ID fourni n'est pas un nombre valide
 * @throws {401} Non authentifié - Token JWT manquant ou invalide
 * @throws {404} Non trouvé - Le deck n'existe pas ou n'appartient pas à l'utilisateur
 * @throws {500} Erreur serveur - Problème lors de la récupération du deck
 * 
 * @example
 * // Requête
 * GET /api/decks/1
 * Authorization: Bearer eyJhbGciOiJIUzI1NiIs...
 * 
 * // Réponse réussie (200)
 * {
 *   "id": 1,
 *   "name": "Mon Deck Feu",
 *   "userId": 1,
 *   "cards": [...]
 * }
 */
// GET /decks/:id - Get a specific deck by ID
decksRouter.get('/:id', authMiddleware, async (req: Request, res: Response): Promise<void> => {
    try {
        const userId = req.user!.userId;
        const deckId = parseInt(req.params.id);

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

/**
 * Route PATCH /api/decks/:id
 * Modifie un deck existant (nom et/ou cartes).
 * Vérifie que le deck appartient à l'utilisateur authentifié.
 * Si les cartes sont modifiées, elles doivent être exactement 10 et valides.
 * 
 * @route PATCH /api/decks/:id
 * @access Privé (nécessite authentification JWT)
 * 
 * @param {string} req.params.id - ID du deck à modifier
 * @param {Object} req.body - Corps de la requête
 * @param {string} [req.body.name] - Nouveau nom du deck (optionnel)
 * @param {number[]} [req.body.cards] - Nouveau tableau de 10 IDs de cartes (optionnel)
 * 
 * @returns {Response} 200 - Deck modifié avec succès
 * @returns {Response} 400 - Validation échouée (ID invalide, aucune donnée, cartes invalides)
 * @returns {Response} 401 - Non authentifié (token manquant ou invalide)
 * @returns {Response} 404 - Deck non trouvé ou non autorisé
 * @returns {Response} 500 - Erreur serveur
 * 
 * @throws {400} ID invalide - L'ID fourni n'est pas un nombre valide
 * @throws {400} Aucune donnée - Ni nom ni cartes fournis pour la modification
 * @throws {400} Nombre de cartes - Si fourni, le tableau ne contient pas exactement 10 cartes
 * @throws {400} Cartes invalides - Certaines cartes n'existent pas dans la base
 * @throws {401} Non authentifié - Token JWT manquant ou invalide
 * @throws {404} Non trouvé - Le deck n'existe pas ou n'appartient pas à l'utilisateur
 * @throws {500} Erreur serveur - Problème lors de la modification du deck
 * 
 * @example
 * // Requête - Modifier le nom uniquement
 * PATCH /api/decks/1
 * Authorization: Bearer eyJhbGciOiJIUzI1NiIs...
 * {
 *   "name": "Nouveau nom"
 * }
 * 
 * // Requête - Modifier les cartes uniquement
 * PATCH /api/decks/1
 * {
 *   "cards": [11, 12, 13, 14, 15, 16, 17, 18, 19, 20]
 * }
 * 
 * // Réponse réussie (200)
 * {
 *   "id": 1,
 *   "name": "Nouveau nom",
 *   "userId": 1,
 *   "cards": [...]
 * }
 */
// PATCH /decks/:id - Update a specific deck
decksRouter.patch('/:id', authMiddleware, async (req: Request, res: Response): Promise<void> => {
    try {
        const userId = req.user!.userId;
        const deckId = parseInt(req.params.id);
        const { name, cards } = req.body;

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

/**
 * Route DELETE /api/decks/:id
 * Supprime un deck et toutes ses cartes associées.
 * Vérifie que le deck appartient à l'utilisateur authentifié.
 * Utilise une transaction pour garantir la cohérence des données.
 * 
 * @route DELETE /api/decks/:id
 * @access Privé (nécessite authentification JWT)
 * 
 * @param {string} req.params.id - ID du deck à supprimer
 * 
 * @returns {Response} 200 - Deck supprimé avec succès
 * @returns {Response} 400 - ID de deck invalide (non numérique)
 * @returns {Response} 401 - Non authentifié (token manquant ou invalide)
 * @returns {Response} 404 - Deck non trouvé ou non autorisé
 * @returns {Response} 500 - Erreur serveur
 * 
 * @throws {400} ID invalide - L'ID fourni n'est pas un nombre valide
 * @throws {401} Non authentifié - Token JWT manquant ou invalide
 * @throws {404} Non trouvé - Le deck n'existe pas ou n'appartient pas à l'utilisateur
 * @throws {500} Erreur serveur - Problème lors de la suppression du deck ou de la transaction
 * 
 * @example
 * // Requête
 * DELETE /api/decks/1
 * Authorization: Bearer eyJhbGciOiJIUzI1NiIs...
 * 
 * // Réponse réussie (200)
 * {
 *   "message": "Deck supprimé avec succès"
 * }
 */
// DELETE /decks/:id - Delete a specific deck
decksRouter.delete('/:id', authMiddleware, async (req: Request, res: Response): Promise<void> => {
    try {
        const userId = req.user!.userId;
        const deckId = parseInt(req.params.id);

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
