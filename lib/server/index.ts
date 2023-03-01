import fastify from 'fastify';
import type { FastifyInstance } from 'fastify';
import fastifySensible from '@fastify/sensible';
import { fastifyRequestContextPlugin } from '@fastify/request-context';
import configPlugin from './plugins/config';
import fastifyHelmet from '@fastify/helmet';
import underPressurePlugin from './plugins/underPressure';
import routes from './routes';
import ajv from './config/ajv';
import SERVER_CONFIG from './config/server';
import swagger from './plugins/swagger';
import db from './plugins/db';
import keycloak from './plugins/keycloak';
import vault from './plugins/vault';
import auth from './plugins/auth';
import security from './plugins/security';
import cache from './plugins/cache';
import utils from './plugins/utils';
// import cors from './plugins/cors';
import cron from 'fastify-cron';

async function bootstrap() {
	// Initialize the server
	const server = fastify(SERVER_CONFIG);

	// Use a custom schema validator
	server.setValidatorCompiler(({ schema }) => {
		return ajv.compile(schema);
	});

	// Standardize HTTP error responses
	await server.register(fastifySensible);

	// Request-scoped asynchronous storage
	await server.register(fastifyRequestContextPlugin, {
		defaultStoreValues: {
			accountId: '',
			account: {},
			token: '',
		},
	});

	// Load environment variables and configuration options
	await server.register(configPlugin);

	// API Documentation using Swagger
	await server.register(swagger);

	const getHelmetDirectives = (instance: FastifyInstance) => {
		const defaultDirectives =
			fastifyHelmet.contentSecurityPolicy.getDefaultDirectives();
		return server.config.NODE_ENV === 'production' &&
			server.config.APP_ENV === 'production'
			? defaultDirectives
			: {
					...defaultDirectives,
					'form-action': ["'self'"],
					'img-src': ["'self'", 'data:', 'validator.swagger.io'],
					'script-src': ["'self'"].concat(instance.swaggerCSP?.script),
					'style-src': ["'self'", 'https:'].concat(instance.swaggerCSP?.style),
			  };
	};

	// Sane default HTTP headers
	await server.register(fastifyHelmet, instance => {
		return {
			contentSecurityPolicy: {
				directives: getHelmetDirectives(instance),
			},
		};
	});

	// Enable cors plugin
	// await server.register(cors);

	// Enable utils plugin
	await server.register(utils);

	// Enable Keycloak plugin
	await server.register(keycloak);

	// Enable vault plugin
	await server.register(vault);

	// Enable db plugin
	await server.register(db);

	// Enable cache plugin
	await server.register(cache);

	// Enable healthchecks
	await server.register(underPressurePlugin);

	// Enable auth plugin
	await server.register(auth);

	// Enable security plugin
	await server.register(security);

	// Enable background jobs
	await server.register(cron, {
		jobs: [
			{
				// Run every 10 minutes
				cronTime: '*/10 * * * *',
				startWhenReady: true,
				onTick: async () => {
					await server.auth.refetchJWKS();
				},
			},
		],
	});

	// Register server routes
	await server.register(routes);

	return server;
}

export { bootstrap };
