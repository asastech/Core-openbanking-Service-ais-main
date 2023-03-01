import type { FastifyInstance } from 'fastify';
import createApplicationRoute from './create';
import fetchApplicationRoute from './fetch';
import listApplicationsRoute from './listByAccountId';
import deleteApplicationRoute from './delete';

export default async function registerApplicationsRoutes(
	fastify: FastifyInstance,
) {
	fastify.addHook('preHandler', fastify.auth.checkForAccessToken);
	fastify.addHook(
		'preHandler',
		fastify.auth.checkForPermissions(['hulk-user']),
	);
	fastify.addHook('preHandler', fastify.auth.checkAccountStatus);

	await fastify.register(createApplicationRoute);
	await fastify.register(listApplicationsRoute);
	await fastify.register(fetchApplicationRoute);
	await fastify.register(deleteApplicationRoute);
}
