import type { FastifyInstance } from 'fastify';
import { schema } from './spec.json';

interface IBody {
	email: string;
	password: string;
}

export default async function registerSignInRoute(fastify: FastifyInstance) {
	fastify.route<{ Body: IBody }>({
		method: 'POST',
		url: '/',
		schema,
		handler: async (request, reply) => {
			const { email, password } = request.body;

			const account = await fastify.db.account.findFirst({
				where: {
					email,
				},
			});
			if (!account) {
				return reply.badRequest('Invalid credentials.');
			}

			switch (account.status) {
				case 'DELETED':
				case 'BANNED': {
					return reply.badRequest(
						'Your account has been suspended/banned. Contact the administrators for more info/triage.',
					);
				}
				case 'UNVERIFIED': {
					return reply.badRequest('Your account is unverified.');
				}
				case 'VERIFIED': {
					break;
				}
				default: {
					return reply.badRequest('Invalid account state found.');
				}
			}

			try {
				const { access_token, refresh_token, expires_in } =
					await fastify.auth.authClient.grant({
						grant_type: 'password',
						username: account.username,
						password,
					});

				return {
					success: true,
					message: 'Successfully authenticated a User.',
					data: {
						accessToken: access_token,
						refreshToken: refresh_token,
						expiresIn: expires_in,
					},
				};
			} catch ({ error }) {
				if ((error as string) === 'invalid_grant') {
					return reply.badRequest('Invalid credentials.');
				}

				fastify.log.error(
					error,
					'An error occured while attempting to authenticate a user.',
				);
				return reply.internalServerError();
			}
		},
	});
}
