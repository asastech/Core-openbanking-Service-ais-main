import type { FastifyInstance } from 'fastify';
import { bootstrap } from '../../lib/server';
import { prepareAuthCredentials } from '../../lib/test-utils';

jest.setTimeout(30000);

describe('applications routes', () => {
	let server: FastifyInstance;
	let token: string;
	let accountId: string;
	beforeAll(async () => {
		server = await bootstrap();
		await server.ready();

		const { accessToken, accountId: id } = await prepareAuthCredentials(
			server,
			{
				username: 'applications-routes-test-user',
				email: 'applications-routes-test-user@ofin.co',
				password: 'super_secret_app_routes_test_user_password',
				firstName: 'applications-routes',
				lastName: 'test-user',
			},
		);

		token = accessToken;
		accountId = id;
	});

	describe('create', () => {
		test('successfully creates an application', async () => {
			const response = await server.inject({
				method: 'POST',
				url: '/v1/applications',
				payload: {
					name: 'test_app_1',
					baseUrl: 'http://test-app.ofin.co/',
				},
				headers: {
					authorization: `Bearer ${token}`,
				},
			});

			const responseBody = JSON.parse(response.payload) as {
				success: boolean;
				message: string;
			};

			expect(response.statusCode).toEqual(200);
			expect(responseBody.success).toBeTruthy();
			expect(responseBody.message).toEqual('Application created.');
		});

		test('fails due to a name conflict', async () => {
			const name = 'test_app_1';
			const response = await server.inject({
				method: 'POST',
				url: '/v1/applications',
				payload: {
					name,
					baseUrl: 'http://test-app-1.ofin.co/',
				},
				headers: {
					authorization: `Bearer ${token}`,
				},
			});

			const responseBody = JSON.parse(response.payload) as {
				error: string;
				message: string;
			};

			expect(response.statusCode).toEqual(409);
			expect(responseBody.error).toEqual('Conflict');
			expect(responseBody.message).toEqual(
				`Application ${name} already exists.`,
			);
		});
	});

	describe('fetch', () => {
		test('successfully fetches an application', async () => {
			const name = 'test_app_1';
			const response = await server.inject({
				method: 'GET',
				url: `/v1/applications/${name}`,
				headers: {
					authorization: `Bearer ${token}`,
				},
			});

			const responseBody = JSON.parse(response.payload) as {
				success: boolean;
				message: string;
				data: {
					application: {
						name: string;
						client: {
							name: string;
							baseUrl: string;
							secret: string;
							type: string;
						};
						status: string;
						createdAt: string;
					};
				};
			};

			expect(response.statusCode).toEqual(200);
			expect(responseBody.success).toBeTruthy();
			expect(responseBody.message).toEqual('Application fetched.');
			expect(responseBody.data.application).not.toBeNull();
		});

		test('fails due to unknown entry', async () => {
			const name = 'non_existent_app_name';
			const response = await server.inject({
				method: 'GET',
				url: `/v1/applications/${name}`,
				headers: {
					authorization: `Bearer ${token}`,
				},
			});

			const responseBody = JSON.parse(response.payload) as {
				error: string;
				message: string;
			};

			expect(response.statusCode).toEqual(404);
			expect(responseBody.error).toEqual('Not Found');
			expect(responseBody.message).toEqual('Application not found.');
		});

		test('fails due to bad status (INACTIVE)', async () => {
			const name = 'test_app_2';
			await server.inject({
				method: 'POST',
				url: '/v1/applications',
				payload: {
					name,
					baseUrl: 'http://test-app-2.ofin.co/',
				},
				headers: {
					authorization: `Bearer ${token}`,
				},
			});

			await server.db.application.update({
				where: {
					accountId_name: {
						accountId,
						name,
					},
				},
				data: {
					status: 'INACTIVE',
				},
			});

			const response = await server.inject({
				method: 'GET',
				url: `/v1/applications/${name}`,
				headers: {
					authorization: `Bearer ${token}`,
				},
			});

			const responseBody = JSON.parse(response.payload) as {
				error: string;
				message: string;
			};

			expect(response.statusCode).toEqual(400);
			expect(responseBody.error).toEqual('Bad Request');
			expect(responseBody.message).toEqual(
				'Your application is banned or disabled. Please contact the administration.',
			);
		});

		test('fails due to bad status (DELETED)', async () => {
			const name = 'test_app_3';
			await server.inject({
				method: 'POST',
				url: '/v1/applications',
				payload: {
					name,
					baseUrl: 'http://test-app-3.ofin.co/',
				},
				headers: {
					authorization: `Bearer ${token}`,
				},
			});

			await server.db.application.update({
				where: {
					accountId_name: {
						accountId,
						name,
					},
				},
				data: {
					status: 'DELETED',
					deletedBy: 'USER',
					deletedAt: new Date(),
				},
			});

			const response = await server.inject({
				method: 'GET',
				url: `/v1/applications/${name}`,
				headers: {
					authorization: `Bearer ${token}`,
				},
			});

			const responseBody = JSON.parse(response.payload) as {
				error: string;
				message: string;
			};

			expect(response.statusCode).toEqual(400);
			expect(responseBody.error).toEqual('Bad Request');
			expect(responseBody.message).toEqual(
				'Your application is banned or disabled. Please contact the administration.',
			);
		});
	});

	describe('delete', () => {
		// TODO: check what's wrong with the delete route
		test.skip('successfully deletes an application', async () => {
			const name = 'test_app_4';
			await server.inject({
				method: 'POST',
				url: '/v1/applications',
				payload: {
					name,
					baseUrl: 'http://test-app-4.ofin.co/',
				},
				headers: {
					authorization: `Bearer ${token}`,
				},
			});

			const application = await server.db.application.findFirst({
				where: {
					name,
				},
			});

			if (!application) {
				server.log.warn('Application not found.');
				await server.close();
				process.exit(1111);
			}

			const response = await server.inject({
				method: 'DELETE',
				url: `/v1/applications/${application.id}`,
				headers: {
					authorization: `Bearer ${token}`,
				},
			});

			const responseBody = JSON.parse(response.payload) as {
				success: boolean;
				message: string;
			};

			expect(response.statusCode).toEqual(200);
			expect(responseBody.success).toBeTruthy();
			expect(responseBody.message).toEqual('Application deleted.');
		});
	});
});
