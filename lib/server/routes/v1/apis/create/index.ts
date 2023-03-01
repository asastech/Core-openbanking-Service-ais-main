import type { FastifyInstance } from 'fastify';
import { schema } from './spec.json';

interface IHeaders {
	authorization: string;
}

interface IBody {
	name: string;
	description: string;
	version: string;
	context: string;
	visibility: string;
	isEnabled: boolean;
	isProtected: boolean;
	subscriptionRequired: boolean;
}

export default async function registerCreateApiRoute(fastify: FastifyInstance) {
	fastify.route<{ Body: IBody; Headers: IHeaders }>({
		method: 'POST',
		url: '/',
		schema,
		preHandler: [
			fastify.auth.checkForAccessToken,
			fastify.auth.checkForPermissions(['admin', 'loki-admin', 'hulk-admin']),
			fastify.auth.checkAccountStatus,
		],
		handler: async (request, reply) => {
			const {
				name,
				description,
				version,
				context,
				visibility,
				isEnabled,
				isProtected,
				subscriptionRequired,
			} = request.body;

			const apiExists = await fastify.db.api.findFirst({
				where: {
					name,
					version,
					context,
				},
			});
			if (apiExists) {
				return reply.conflict(
					'An API with the same name, version and context already exists',
				);
			}

			await fastify.db.api.create({
				data: {
					name,
					description,
					version,
					context,
					visibility,
					isEnabled,
					isProtected,
					subscriptionRequired,
				},
			});

			return reply.status(200).send({
				success: true,
				message: 'API created successfully',
			});
		},
	});
}
