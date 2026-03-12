import {Router} from 'express'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { prisma } from '../database';
import { env } from '../env';

// POST /auth/login
export const signInRouter =  Router();

/**
 * Route POST /api/auth/sign-in
 * Authentifie un utilisateur existant avec email et mot de passe.
 * Vérifie les identifiants et génère un token JWT en cas de succès.
 * 
 * @route POST /api/auth/sign-in
 * @access Public
 * 
 * @param {Object} req.body - Corps de la requête
 * @param {string} req.body.email - Email de l'utilisateur
 * @param {string} req.body.password - Mot de passe en clair
 * 
 * @returns {Response} 200 - Connexion réussie avec token JWT
 * @returns {Response} 400 - Champs requis manquants
 * @returns {Response} 401 - Email ou mot de passe incorrect
 * @returns {Response} 500 - Erreur serveur
 * 
 * @throws {400} Champs requis manquants - Email ou mot de passe non fourni
 * @throws {401} Identifiants invalides - Email inexistant ou mot de passe incorrect
 * @throws {500} Erreur serveur - Problème lors de la connexion ou génération du token
 * 
 * @example
 * // Requête
 * POST /api/auth/sign-in
 * {
 *   "email": "user@example.com",
 *   "password": "myPassword123"
 * }
 * 
 * // Réponse réussie (200)
 * {
 *   "message": "Connexion réussie",
 *   "token": "eyJhbGciOiJIUzI1NiIs...",
 *   "user": {
 *     "id": 1,
 *     "username": "john_doe",
 *     "email": "user@example.com"
 *   }
 * }
 */
signInRouter.post('/sign-in', async (req, res) => {
    const {email, password} = req.body;

    // Vérification de la présence des champs requis
    if (!email || !password) {
        return res.status(400).json({ error: 'Email et mot de passe sont requis' });
    }

    try {
        const user = await prisma.user.findUnique({
            where: {email},
        });

        // Vérification de l'existence de l'utilisateur
        if (!user) {
            return res.status(401).json({error: 'Email ou mot de passe incorrect'});
        }

        const isPasswordValid = await bcrypt.compare(password, user.password);

        // Vérification de la validité du mot de passe
        if (!isPasswordValid) {
            return res.status(401).json({error: 'Email ou mot de passe incorrect'});
        }

        const token = jwt.sign(
            { userId: user.id, email: user.email },
            env.JWT_SECRET,
            { expiresIn: '7d' }
        );

        // Retourne les informations de l'utilisateur et le token
        return res.status(200).json({
            message: 'Connexion réussie',
            token,
            user: {
                id: user.id,
                username: user.username,
                email: user.email,
            },
        });
    } catch (error) {
        console.error("Erreur lors de la connexion:", error);
        return res.status(500).json({ error: 'Erreur serveur' });
    }
});
