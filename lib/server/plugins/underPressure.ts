import fp from 'fastify-plugin';
import underPressurefp from '@fastify/under-pressure';
import type { FastifyInstance } from 'fastify';

async function underPressure(fastify: FastifyInstance) {
	await fastify.register(underPressurefp, {
		exposeStatusRoute: {
			routeOpts: {
				logLevel: fastify.config.LOG_LEVEL,
			},
			routeSchemaOpts: {
				tags: ['General'],
				description:
					"Ensures the service is healthy by invoking the DB, Cache, Keycloak and Vault if they're alive and running.",
				summary: 'Runs a Healthcheck.',
			},
			routeResponseSchemaOpts: {
				status: { type: 'string', default: 'ok' },
				metrics: {
					type: 'object',
					properties: {
						eventLoopDelay: { type: 'number' },
						rssBytes: { type: 'number' },
						heapUsed: { type: 'number' },
						eventLoopUtilized: { type: 'number' },
					},
				},
			},
			url: '/health',
		},
		healthCheck: async () => {
			try {
				const dbIsAlive =
					(
						(await fastify.db.$queryRaw`SELECT 1 + 1 AS result`) as Array<{
							result: number;
						}>
					)[0]?.result === 2;

				await fastify.cache.set('ping', 'pong', 'EX', 3);
				const cacheIsAlive = (await fastify.cache.get('ping')) === 'pong';

				const vaultHealthCheckRequest = await fastify.vault.client.request<{
					initialized: boolean;
					sealed: boolean;
					standby: boolean;
				}>({
					method: 'GET',
					url: '/v1/sys/health?standbyok=true',
				});

				let vaultIsAlive = false;

				if (vaultHealthCheckRequest && vaultHealthCheckRequest.data) {
					const { initialized, sealed, standby } = vaultHealthCheckRequest.data;
					const { status, statusText } = vaultHealthCheckRequest;
					vaultIsAlive =
						status === 200 &&
						statusText === 'OK' &&
						initialized &&
						!sealed &&
						!standby;
				}

				const response = await fastify.keycloak.healthCheckClient.request({
					method: 'GET',
					url: '/',
				});

				const keycloakIsAlive = response.status === 200;

				if (!keycloakIsAlive) {
					fastify.log.error(
						{ keycloakIsAlive, response },
						'Keycloak is unreachable.',
					);
					return false;
				}

				if (!vaultIsAlive) {
					fastify.log.error(
						{ vaultIsAlive, response: vaultHealthCheckRequest.data },
						'Vault is unreachable.',
					);
					return false;
				}

				if (!dbIsAlive) {
					fastify.log.error('Database is unreachable.');
					return false;
				}

				if (!cacheIsAlive) {
					fastify.log.error('Cache is unreachable');
					return false;
				}

				return {
					status: 'ok',
					metrics: fastify.memoryUsage(),
				};
			} catch (error) {
				fastify.log.error(
					error,
					'An error occured while attempting to run a health check.',
				);
				return false;
			}
		},
		healthCheckInterval: 1000, // Every 1 second
	});
}

export default fp(underPressure, {
	name: 'underPressure',
	dependencies: ['config', 'db', 'keycloak', 'cache', 'vault'],
});
