import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../env';

/**
 * Middleware d'authentification JWT pour protéger les routes.
 * Vérifie la présence et la validité du token JWT dans les en-têtes de la requête.
 * Si le token est valide, attache les informations de l'utilisateur décodé à req.user.
 * 
 * @param {Request} req - Objet de requête Express
 * @param {Response} res - Objet de réponse Express
 * @param {NextFunction} next - Fonction pour passer au middleware suivant
 * 
 * @returns {void | Response} Passe au middleware suivant si authentifié, sinon retourne une erreur 401
 * 
 * @throws {401} Token manquant - Aucun en-tête Authorization ou token absent
 * @throws {401} Token invalide ou expiré - Le token JWT ne peut pas être vérifié
 * 
 * @example
 * // Utilisation dans une route protégée
 * router.get('/protected', authMiddleware, (req, res) => {
 *   const userId = req.user.userId;
 *   // ...
 * });
 */
export const authMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return res.status(401).json({ error: 'Token manquant' });
  }

  const token = authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Token manquant' });
  }

  try {
    const decoded = jwt.verify(token, env.JWT_SECRET);
    req.user = decoded as { userId: number; email: string };
    return next();
  } catch (error) {
    return res.status(401).json({ error: 'Token invalide ou expiré' });
  }
};