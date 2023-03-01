import type { FastifyInstance } from 'fastify';
import createCertificateRoute from './create';
import fetchCertificateRoute from './fetch';
import deleteCertificateRoute from './delete';
import listCertificatesByAccountIdRoute from './listByAccountId';

export default async function registerCertificateRoutes(
	fastify: FastifyInstance,
) {
	fastify.addHook('preHandler', fastify.auth.checkForAccessToken);
	fastify.addHook(
		'preHandler',
		fastify.auth.checkForPermissions(['loki-user']),
	);
	fastify.addHook('preHandler', fastify.auth.checkAccountStatus);

	await fastify.register(createCertificateRoute);
	await fastify.register(listCertificatesByAccountIdRoute);
	await fastify.register(fetchCertificateRoute);
	await fastify.register(deleteCertificateRoute);
}
