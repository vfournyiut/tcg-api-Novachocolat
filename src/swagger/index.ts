import * as YAML from 'yamljs';
import * as path from 'path';

/**
 * Charge et fusionne toutes les documentations Swagger
 * @returns {object} Documentation Swagger complète
 */
export function generateSwaggerSpec(): object {
  // Charger la configuration principale
  const swaggerConfig = YAML.load(path.join(__dirname, '../../swagger/swagger.config.yml'));
  
  // Charger les components
  const securitySchemes = YAML.load(path.join(__dirname, '../../swagger/components/security.yml'));
  
  // Charger les schémas
  const userSchemas = YAML.load(path.join(__dirname, '../../swagger/schemas/user.schema.yml'));
  const cardSchemas = YAML.load(path.join(__dirname, '../../swagger/schemas/card.schema.yml'));
  const deckSchemas = YAML.load(path.join(__dirname, '../../swagger/schemas/deck.schema.yml'));
  const commonSchemas = YAML.load(path.join(__dirname, '../../swagger/schemas/common.schema.yml'));
  
  // Charger les documentations par module
  const authDoc = YAML.load(path.join(__dirname, '../../swagger/auth.doc.yml'));
  const cardDoc = YAML.load(path.join(__dirname, '../../swagger/card.doc.yml'));
  const deckDoc = YAML.load(path.join(__dirname, '../../swagger/deck.doc.yml'));
  
  // Fusionner tous les schémas
  const allSchemas = {
    ...userSchemas,
    ...cardSchemas,
    ...deckSchemas,
    ...commonSchemas,
  };
  
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
    components: {
      securitySchemes,
      schemas: allSchemas,
    },
    paths: allPaths
  };
}
