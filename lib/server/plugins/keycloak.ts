import type { FastifyInstance } from 'fastify';
import fp from 'fastify-plugin';
import KCAdminClient from '@keycloak/keycloak-admin-client';
import { Axios } from 'axios';

declare module 'fastify' {
	interface FastifyInstance {
		keycloak: {
			/**
			 * Keycloak administration client
			 */
			admin: KCAdminClient;
			healthCheckClient: Axios;
		};
	}
}

async function keycloak(fastify: FastifyInstance) {
	const KEYCLOAK_URL_PATTERN =
		// eslint-disable-next-line security/detect-unsafe-regex
		/^((?<protocol>https?):\/\/)?(?<host>((?<subdomain>[\w-]+)\.{1})?(?<domain>[\w-]+)(\.(?<tld>[a-z]+))?)(?::(?<port>\d+)?)?(?<resource>\/?\??([^#\n\r]*))?$/;
	const match = fastify.config.KEYCLOAK_URL.match(KEYCLOAK_URL_PATTERN);

	let healthCheckUrl = 'http://localhost:8080/health';

	if (
		match &&
		match.groups &&
		match.groups['protocol'] &&
		match.groups['host']
	) {
		let keycloakUrl: string;
		// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
		keycloakUrl = `${match.groups['protocol']}://${match.groups['host']}`;

		const unsafeProtocolUsed = ['http'].includes(match.groups['protocol']);
		if (unsafeProtocolUsed) {
			fastify.log.warn('Unsafe Keycloak connection established.');
		}

		if (match.groups['port']) {
			keycloakUrl += ':' + match.groups['port'];
		}

		healthCheckUrl = `${keycloakUrl}/health`;
	}

	fastify.log.debug({ healthCheckUrl }, 'Keycloak URL');

	const keycloakHealthCheckClient = new Axios({
		baseURL: healthCheckUrl,
	});

	const adminClient = new KCAdminClient({
		baseUrl: fastify.config.KEYCLOAK_URL,
		realmName: fastify.config.KEYCLOAK_REALM,
	});

	await adminClient.auth({
		clientId: fastify.config.KEYCLOAK_CLIENT_ID,
		clientSecret: fastify.config.KEYCLOAK_CLIENT_SECRET,
		grantType: 'client_credentials',
		offlineToken: true,
	});

	fastify.decorate('keycloak', {
		admin: adminClient,
		healthCheckClient: keycloakHealthCheckClient,
	});
}

export default fp(keycloak, {
	name: 'keycloak',
	dependencies: ['config'],
});
