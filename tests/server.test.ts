import type { FastifyInstance } from 'fastify';
import { bootstrap } from '../lib/server';

jest.setTimeout(30000);

describe('server', () => {
	let server: FastifyInstance;
	beforeAll(async () => {
		server = await bootstrap();
		await server.ready();
	});

	test('registers config plugin', async () => {
		expect(server.config).toBeTruthy();
	});

	test('registers keycloak plugin', async () => {
		expect(server.keycloak).toBeTruthy();
	});

	test('registers auth plugin', () => {
		expect(server.auth).toBeTruthy();
	});

	test('registers db plugin', () => {
		expect(server.db).toBeTruthy();
	});
});
