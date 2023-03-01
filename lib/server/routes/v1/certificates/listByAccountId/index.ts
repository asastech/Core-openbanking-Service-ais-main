import type { FastifyInstance } from 'fastify';
import { schema } from './spec.json';

interface IHeaders {
	authorization: string;
}

interface IQuery {
	limit: number;
	offset: number;
	field: 'createdAt' | 'updatedAt' | 'expiresAt' | 'deletedAt';
	direction: 'asc' | 'desc';
}

export default async function registerListCertificatesByAccountIdRoute(
	fastify: FastifyInstance,
) {
	fastify.route<{ Querystring: IQuery; Headers: IHeaders }>({
		method: 'GET',
		url: '/',
		schema,
		handler: async (request, reply) => {
			const accountId = request.requestContext.get('accountId') as string;
			const { limit, offset, field, direction } = request.query;

			const certificates = await fastify.db.certificate.findMany({
				where: {
					accountId,
				},
				take: limit,
				skip: offset,
				orderBy: {
					[field]: direction,
				},
			});

			return reply.status(200).send({
				success: true,
				message: 'Successfully listed all Certificates.',
				data: { certificates },
			});
		},
	});
}
