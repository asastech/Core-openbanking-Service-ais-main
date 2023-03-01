import type { FastifyInstance } from 'fastify';
import createBankRoute from './create';
import fetchBankRoute from './fetch';
import listBanksRoute from './list';
import accountsRoutes from './accounts';
import paymentsRoutes from './payments';

export default async function registerBanksRoutes(fastify: FastifyInstance) {
	await fastify.register(listBanksRoute);
	await fastify.register(fetchBankRoute);
	await fastify.register(createBankRoute, { prefix: 'create' });
	await fastify.register(accountsRoutes, { prefix: 'accounts' });
	await fastify.register(paymentsRoutes, { prefix: 'payments' });
}
