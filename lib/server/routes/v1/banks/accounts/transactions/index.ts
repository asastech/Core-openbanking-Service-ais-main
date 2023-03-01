import type { FastifyInstance } from 'fastify';
import listTransactions from './list';
import withdrawTransaction from './withdraw';
import depositTransaction from './deposit';

export default async function registerTransactionsRoutes(
	fastify: FastifyInstance,
) {
	await fastify.register(listTransactions);
	await fastify.register(withdrawTransaction, { prefix: 'withdraw' });
	await fastify.register(depositTransaction, { prefix: 'deposit' });
}
