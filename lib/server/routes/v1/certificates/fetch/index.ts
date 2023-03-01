import type { FastifyInstance } from 'fastify';
import { schema } from './spec.json';

interface IHeaders {
	authorization: string;
}

interface IParams {
	certificateId: string;
}

export default async function registerFetchCertificateRoute(
	fastify: FastifyInstance,
) {
	fastify.route<{ Params: IParams; Headers: IHeaders }>({
		method: 'GET',
		url: '/:certificateId',
		schema,
		handler: async (request, reply) => {
			const accountId = request.requestContext.get('accountId') as string;
			const { certificateId } = request.params;

			const certificate = await fastify.db.certificate.findFirst({
				where: {
					id: certificateId,
					accountId,
				},
			});
			if (!certificate) {
				return reply.notFound('Certificate not found.');
			}

			return reply.status(200).send({
				success: true,
				message: 'Successfully fetched a Certificate.',
				data: { certificate },
			});
		},
	});
}
