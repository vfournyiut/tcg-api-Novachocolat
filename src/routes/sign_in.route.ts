import {Router} from 'express'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { prisma } from '../database';

// POST /auth/login
export const signInRouter =  Router();

signInRouter.post('/sign-in', async (req, res) => {
    const {email, password} = req.body;

    if (!email || !password) {
        return res.status(400).json({ error: 'Email et mot de passe sont requis' });
    }

    try {
        const user = await prisma.user.findUnique({
            where: {email},
        });

        if (!user) {
            return res.status(401).json({error: 'Email ou mot de passe incorrect'});
        }

        const isPasswordValid = await bcrypt.compare(password, user.password);

        if (!isPasswordValid) {
            return res.status(401).json({error: 'Email ou mot de passe incorrect'});
        }

        const token = jwt.sign(
            { userId: user.id, email: user.email },
            process.env.JWT_SECRET as string,
            { expiresIn: '7d' }
        );

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
