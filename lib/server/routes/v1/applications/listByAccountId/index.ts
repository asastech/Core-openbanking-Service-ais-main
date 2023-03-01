import type { FastifyInstance } from 'fastify';
import { schema } from './spec.json';

interface IHeaders {
	authorization: string;
}

export default async function registerListApplicationsRoute(
	fastify: FastifyInstance,
) {
	fastify.route<{ Headers: IHeaders }>({
		method: 'GET',
		url: '/',
		schema,
		handler: async (request, reply) => {
			const accountId = request.requestContext.get('accountId') as string;

			const applications = await fastify.db.application.findMany({
				where: {
					accountId,
				},
				orderBy: {
					createdAt: 'asc',
				},
				include: {
					client: true,
				},
			});

			return reply.status(200).send({
				success: true,
				message: 'Applications listed.',
				data: { applications },
			});
		},
	});
}
