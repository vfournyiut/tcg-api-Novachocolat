import {createServer} from "http";
import {env} from "./env";
import express from "express";
import cors from "cors";
import 'dotenv/config';
import { Server } from 'socket.io';
import swaggerUi from 'swagger-ui-express';
import { generateSwaggerSpec } from "./swagger/index";
import { authRouter } from "./routes/sign_up.route";
import { signInRouter } from "./routes/sign_in.route";
import { cardsRouter } from "./routes/cards.route";
import { decksRouter } from "./routes/decks.route";
import { socketAuthMiddleware } from "./socket/auth.middleware";

// Create Express app
export const app = express();

// Middlewares
app.use(
    cors({
        origin: true,  // Autorise toutes les origines
        credentials: true,
    }),
);

app.use(express.json());

// Serve static files (Socket.io test client)
app.use(express.static('public'));

// Swagger UI documentation
const swaggerSpec = generateSwaggerSpec();
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
    customCss: '.swagger-ui .topbar { display: none }',
    customSiteTitle: 'TCG API Documentation',
}));

app.use('/api/auth', authRouter)
app.use('/api/auth', signInRouter);
app.use('/api/cards', cardsRouter);
app.use('/api/decks', decksRouter);
// Health check endpoint
app.get("/api/health", (_req, res) => {
    res.json({status: "ok", message: "TCG Backend Server is running"});
});

// Start server only if this file is run directly (not imported for tests)
if (require.main === module) {
    // Create HTTP server
    const httpServer = createServer(app);

    // Initialize Socket.io with CORS
    const io = new Server(httpServer, {
        cors: {
            origin: true,
            credentials: true,
        },
    });

    // Apply authentication middleware to all Socket.io connections
    io.use(socketAuthMiddleware);

    // Handle Socket.io connections
    io.on('connection', (socket) => {
        console.log(`User connected: ${socket.email} (ID: ${socket.userId})`);

        // Send welcome message with user info
        socket.emit('authenticated', {
            message: 'Successfully authenticated',
            userId: socket.userId,
            email: socket.email,
            username: socket.username,
        });

        // Handle disconnection
        socket.on('disconnect', (reason) => {
            console.log(`User disconnected: ${socket.email} (Reason: ${reason})`);
        });
    });

    // Start server
    try {
        httpServer.listen(env.PORT, () => {
            console.log(`\n🚀 Server is running on http://localhost:${env.PORT}`);
            console.log(`📚 API Documentation available at http://localhost:${env.PORT}/api-docs`);
            console.log(`🧪 Socket.io Test Client available at http://localhost:${env.PORT}`);
            console.log(`🔐 Socket.io authentication enabled with JWT`);
        });
    } catch (error) {
        console.error("Failed to start server:", error);
        process.exit(1);
    }
}
