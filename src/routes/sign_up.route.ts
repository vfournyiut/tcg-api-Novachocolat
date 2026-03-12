import {Request, Response, Router} from 'express'
import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken'
import { prisma } from '../database';
import { env } from '../env';

export const authRouter = Router()

/**
 * Route POST /api/auth/sign-up
 * Crée un nouveau compte utilisateur dans le système.
 * Hash le mot de passe avec bcrypt et génère un token JWT pour l'utilisateur.
 * 
 * @route POST /api/auth/sign-up
 * @access Public
 * 
 * @param {Object} req.body - Corps de la requête
 * @param {string} req.body.email - Email unique de l'utilisateur
 * @param {string} req.body.username - Nom d'utilisateur
 * @param {string} req.body.password - Mot de passe en clair (sera hashé)
 * 
 * @returns {Response} 201 - Compte créé avec succès avec token JWT
 * @returns {Response} 400 - Champs requis manquants
 * @returns {Response} 409 - Email déjà utilisé
 * @returns {Response} 500 - Erreur serveur
 * 
 * @throws {400} Champs requis manquants - Email, username ou password non fourni
 * @throws {409} Conflit - L'email est déjà associé à un compte existant
 * @throws {500} Erreur serveur - Problème lors du hachage ou de la création du compte
 * 
 * @example
 * // Requête
 * POST /api/auth/sign-up
 * {
 *   "email": "newuser@example.com",
 *   "username": "john_doe",
 *   "password": "securePassword123"
 * }
 * 
 * // Réponse réussie (201)
 * {
 *   "message": "Compte créé avec succès",
 *   "token": "eyJhbGciOiJIUzI1NiIs...",
 *   "user": {
 *     "id": 1,
 *     "username": "john_doe",
 *     "email": "newuser@example.com"
 *   }
 * }
 */
// POST /auth/sign-up
authRouter.post('/sign-up', async (req, res) => {
  const { email, username, password } = req.body;

  if (!email || !username || !password) {
    return res.status(400).json({ error: 'Email, username et mot de passe sont requis' });
  }

  try {
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return res.status(409).json({ error: 'Cet email est déjà utilisé' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = await prisma.user.create({
      data: {
        email,
        username,
        password: hashedPassword,
      },
    });

    const token = jwt.sign(
      { userId: newUser.id, email: newUser.email },
      env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    return res.status(201).json({
      message: 'Compte créé avec succès',
      token,
      user: {
        id: newUser.id,
        username: newUser.username,
        email: newUser.email,
      },
    });
  } catch (error) {
    console.error("Erreur lors de la création du compte:", error);
    return res.status(500).json({ error: 'Erreur serveur' });
  }
});

/**
 * Route POST /api/auth/login
 * Authentifie un utilisateur existant avec email et mot de passe (version alternative).
 * Vérifie les identifiants et génère un token JWT en cas de succès.
 * Utilise bcrypt (au lieu de bcryptjs) pour la comparaison du mot de passe.
 * 
 * @route POST /api/auth/login
 * @access Public
 * 
 * @param {Object} req.body - Corps de la requête
 * @param {string} req.body.email - Email de l'utilisateur
 * @param {string} req.body.password - Mot de passe en clair
 * 
 * @returns {Response} 200 - Connexion réussie avec token JWT
 * @returns {Response} 401 - Email ou mot de passe incorrect
 * @returns {Response} 500 - Erreur serveur
 * 
 * @throws {401} Identifiants invalides - Email inexistant ou mot de passe incorrect
 * @throws {500} Erreur serveur - Problème lors de la connexion ou génération du token
 * 
 * @example
 * // Requête
 * POST /api/auth/login
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
// POST /auth/login
authRouter.post('/login', async (req: Request, res: Response) => {
    const {email, password} = req.body

    try {
        // Vérifications de l'existence de l'utilisateur
        const user = await prisma.user.findUnique({
            where: {email},
        })

        if (!user) {
            return res.status(401).json({error: 'Email ou mot de passe incorrect'})
        }

        // Vérification du mot de passe
        const isPasswordValid = await bcrypt.compare(password, user.password)

        if (!isPasswordValid) {
            return res.status(401).json({error: 'Email ou mot de passe incorrect'})
        }

        // Générer le JWT
        const token = jwt.sign(
            {
                userId: user.id,
                email: user.email,
            },
            process.env.JWT_SECRET as string,
            {expiresIn: '7d'},
        )

        // Retourne les informations de l'utilisateur et le token
        return res.status(200).json({
            message: 'Connexion réussie',
            token,
            user: {
                id: user.id,
                username    : user.username,
                email: user.email,
            },
        })
    } catch (error) {
        console.error('Erreur lors de la connexion:', error)
        return res.status(500).json({error: 'Erreur serveur'})
    }
})