"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateSwaggerSpec = void 0;
const YAML = __importStar(require("yamljs"));
const path = __importStar(require("path"));
const url_1 = require("url");
// Support pour ESM __dirname
const __filename = (0, url_1.fileURLToPath)(import.meta.url);
const __dirname = path.dirname(__filename);
/**
 * Charge et fusionne toutes les documentations Swagger
 * @returns {object} Documentation Swagger complète
 */
function generateSwaggerSpec() {
    // Charger la configuration principale
    const swaggerConfig = YAML.load(path.join(__dirname, 'swagger.config.yml'));
    // Charger les documentations par module
    const authDoc = YAML.load(path.join(__dirname, 'auth.doc.yml'));
    const cardDoc = YAML.load(path.join(__dirname, 'card.doc.yml'));
    const deckDoc = YAML.load(path.join(__dirname, 'deck.doc.yml'));
    // Fusionner les paths
    const allPaths = {
        ...authDoc.paths,
        ...cardDoc.paths,
        ...deckDoc.paths,
        '/api/health': {
            get: {
                tags: ['Health'],
                summary: 'Vérifier l\'état du serveur',
                description: 'Endpoint de santé pour vérifier que le serveur est opérationnel',
                operationId: 'healthCheck',
                responses: {
                    '200': {
                        description: 'Serveur en ligne',
                        content: {
                            'application/json': {
                                schema: {
                                    type: 'object',
                                    properties: {
                                        status: {
                                            type: 'string',
                                            example: 'ok'
                                        },
                                        message: {
                                            type: 'string',
                                            example: 'TCG Backend Server is running'
                                        }
                                    }
                                },
                                examples: {
                                    success: {
                                        summary: 'Serveur OK',
                                        value: {
                                            status: 'ok',
                                            message: 'TCG Backend Server is running'
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    };
    // Retourner la spec complète
    return {
        ...swaggerConfig,
        paths: allPaths
    };
}
exports.generateSwaggerSpec = generateSwaggerSpec;
//# sourceMappingURL=index.js.map