import type { FastifyInstance } from 'fastify';
import { bootstrap } from '../../lib/server';

jest.setTimeout(30000);

describe('signUp route', () => {
	let server: FastifyInstance;
	beforeAll(async () => {
		server = await bootstrap();
		await server.ready();
	});

	test('successful sign up', async () => {
		const response = await server.inject({
			method: 'POST',
			url: '/v1/auth/signUp',
			payload: {
				username: 'test-user',
				email: 'test-email@ofin.co',
				password: 'Testingpassword123#',
				firstName: 'test',
				lastName: 'user',
			},
		});

		const responseBody = JSON.parse(response.payload) as {
			success: boolean;
			message: string;
		};

		expect(response.statusCode).toEqual(200);
		expect(responseBody.success).toBeTruthy();
		expect(responseBody.message).toEqual('Account created. Please verify.');
	});

	test('fails due to duplicate username', async () => {
		await server.inject({
			method: 'POST',
			url: '/v1/auth/signUp',
			payload: {
				username: 'test-user-2',
				email: 'test-email-2@ofin.co',
				password: 'Testingpassword123#',
				firstName: 'test',
				lastName: 'user',
			},
		});

		const response = await server.inject({
			method: 'POST',
			url: '/v1/auth/signUp',
			payload: {
				username: 'test-user-2',
				email: 'non-conflicting-email@ofin.co',
				password: 'Testingpassword123#',
				firstName: 'test',
				lastName: 'user',
			},
		});

		const responseBody = JSON.parse(response.payload) as {
			error: string;
			message: string;
		};

		expect(response.statusCode).toEqual(400);
		expect(responseBody.error).toEqual('Bad Request');
		expect(responseBody.message).toEqual('Username is taken.');
	});

	test('fails due to duplicate email', async () => {
		await server.inject({
			method: 'POST',
			url: '/v1/auth/signUp',
			payload: {
				username: 'test-user-3',
				email: 'test-email-3@ofin.co',
				password: 'Testingpassword123#',
				firstName: 'test',
				lastName: 'user',
			},
		});

		const response = await server.inject({
			method: 'POST',
			url: '/v1/auth/signUp',
			payload: {
				username: 'non-conflicting-username',
				email: 'test-email-3@ofin.co',
				password: 'Testingpassword123#',
				firstName: 'test',
				lastName: 'user',
			},
		});

		const responseBody = JSON.parse(response.payload) as {
			error: string;
			message: string;
		};

		expect(response.statusCode).toEqual(400);
		expect(responseBody.error).toEqual('Bad Request');
		expect(responseBody.message).toEqual('Email is taken.');
	});
});
