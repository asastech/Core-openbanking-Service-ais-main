import type { FastifyInstance } from 'fastify';
import { bootstrap } from '../../lib/server';
import { prepareAuthCredentials } from '../../lib/test-utils';

jest.setTimeout(30000);

describe('signIn route', () => {
	let server: FastifyInstance;
	beforeAll(async () => {
		server = await bootstrap();
		await server.ready();

		await prepareAuthCredentials(server, {
			username: 'signIn-routes-test-user',
			email: 'signIn-routes-test-user@ofin.co',
			password: 'super_secret_signIn_routes_test_user_passworD123!',
			firstName: 'signIn-routes',
			lastName: 'test-user',
		});
	});

	test('successfully signs in', async () => {
		const response = await server.inject({
			method: 'POST',
			url: '/v1/auth/signIn',
			payload: {
				email: 'signIn-routes-test-user@ofin.co',
				password: 'super_secret_signIn_routes_test_user_passworD123!',
			},
			headers: {
				'Content-Type': 'application/json',
			},
		});

		const responseBody = JSON.parse(response.payload) as {
			success: boolean;
			message: string;
		};

		expect(response.statusCode).toEqual(200);
		expect(responseBody.success).toBeTruthy();
		expect(responseBody.message).toEqual('Successfully authenticated a User.');
	});

	test('fails to sign in with wrong password', async () => {
		const response = await server.inject({
			method: 'POST',
			url: '/v1/auth/signIn',
			payload: {
				email: 'signIn-routes-test-user@ofin.co',
				password: 'super_secret_signIn_routes_test_user_passworD123!WRONG',
			},
			headers: {
				'Content-Type': 'application/json',
			},
		});

		const responseBody = JSON.parse(response.payload) as {
			success: boolean;
			message: string;
		};

		expect(response.statusCode).toEqual(401);
		expect(responseBody.success).toBeFalsy();
		expect(responseBody.message).toEqual('Invalid credentials.');
	});
});
