import fastifySwagger from '@fastify/swagger';
import fastifySwaggerUi from '@fastify/swagger-ui';
import type { FastifyInstance } from 'fastify';
import fp from 'fastify-plugin';
import { definitions } from '../config/json-schema.json';

async function swagger(fastify: FastifyInstance) {
	const host = `${fastify.config.HOST}:${fastify.config.PORT}`;

	await fastify.register(fastifySwagger, {
		swagger: {
			basePath: '',
			host,
			definitions,
			info: {
				title: 'OFIN Main API Documentation',
				description: "Swagger Spec for OFIN's Main API",
				version: '1.0',
			},
			schemes: ['http'],
			consumes: ['application/json'],
			produces: ['application/json'],
			tags: [
				{ name: 'Applications' },
				{ name: 'Authentication' },
				{ name: 'General' },
				{ name: 'Banks' },
				{ name: 'APIs' },
				{ name: 'Notifications' },
			],
			securityDefinitions: {
				authorization: {
					type: 'apiKey',
					name: 'JWT Bearer Access Token',
					in: 'header',
				},
			},
		},
		mode: 'dynamic',
	});

	await fastify.register(fastifySwaggerUi, {
		routePrefix: '/docs',
		uiConfig: {
			syntaxHighlight: {
				theme: 'monokai',
			},
			tryItOutEnabled: false,
		},
	});
}

export default fp(swagger, {
	name: 'swagger',
	dependencies: ['config'],
});
