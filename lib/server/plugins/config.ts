import type { FastifyInstance } from 'fastify';
import fp from 'fastify-plugin';
import fastifyEnvPlugin from '@fastify/env';
import ajv from '../config/ajv';
import ENV_SCHEMA from '../config/env';
import { ARGON2_DEFAULTS } from '../config/argon';
import { Options } from 'argon2';

type ENV = 'development' | 'staging' | 'testing' | 'production';

type EnvSchema = {
	SERVICE_NAME: string;
	NODE_ENV: ENV;
	APP_ENV: ENV;
	REDIS_URL: string;
	CACHE_URL: string;
	LOG_LEVEL: 'fatal' | 'error' | 'warn' | 'info' | 'debug' | 'trace';
	DISABLE_LOGGING: boolean;
	HOST: string;
	PORT: number;
	DATABASE_URL: string;
	KEYCLOAK_URL: string;
	KEYCLOAK_REALM: string;
	KEYCLOAK_FAPI_REALM: string;
	KEYCLOAK_FAPI_USER_ROLE: string;
	KEYCLOAK_FAPI_CLIENT_ROLE: string;
	KEYCLOAK_CLIENT_ID: string;
	KEYCLOAK_CLIENT_SECRET: string;
	PASSWORD_HASHING_SECRET: string;
	CLIENT_SECRET_HASHING_SECRET: string;
	VAULT_ADDR: string;
	VAULT_TOKEN: string;
	PKI_MOUNT_NAME: string;
	PKI_ROLE_NAME: string;
	PKI_ISSUER_REF: string;
	PKI_CERT_EXPIRATION: string;
};

type ExtraConfig = {
	ARGON2_DEFAULTS: Options & { raw?: boolean };
};

declare module 'fastify' {
	interface FastifyInstance {
		env: EnvSchema;
		config: Record<string, string> & EnvSchema & ExtraConfig;
	}
}

async function config(fastify: FastifyInstance) {
	// Load environment variables according to schema
	await fastify.register(fastifyEnvPlugin, {
		schema: ENV_SCHEMA,
		ajv: ajv as any,
		confKey: 'env',
		dotenv: true,
	});

	// Add config to server context
	fastify.decorate('config', {
		...fastify.env,
		ARGON2_DEFAULTS,
	});
}

export default fp(config, {
	name: 'config',
});
