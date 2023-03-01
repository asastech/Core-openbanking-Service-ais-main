import type { FastifyInstance } from 'fastify';
import { schema } from './spec.json';

interface IParams {
	name: string;
}

export default async function registerFetchBankRoute(fastify: FastifyInstance) {
	fastify.route<{ Params: IParams }>({
		method: 'GET',
		url: '/:name',
		schema,
		handler: async (request, reply) => {
			const { name } = request.params;

			fastify.log.info('hey');

			const bank = await fastify.db.bank.findUnique({
				where: {
					name,
				},
			});
			if (!bank) {
				fastify.log.error('Bank not found.');
				return reply.notFound(`A Bank with the name ${name} does not exist.`);
			}

			return reply.status(200).send({
				success: true,
				message: `Successfully fetched the Bank with the name ${name}.`,
				data: { bank },
			});
		},
	});
}
