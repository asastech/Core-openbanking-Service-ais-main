import type { FastifyInstance } from 'fastify';
import authRoutes from './auth';
import applicationsRoutes from './applications';
import certificatesRoutes from './certificates';
import apisRoutes from './apis';
import banksRoutes from './banks';
import notificationsRoutes from './notifications';

export default async function RegisterV1Routes(
	fastify: FastifyInstance,
	_: unknown,
) {
	await fastify.register(authRoutes, { prefix: 'auth' });
	await fastify.register(applicationsRoutes, {
		prefix: 'applications',
	});
	await fastify.register(certificatesRoutes, { prefix: 'certificates' });
	await fastify.register(apisRoutes, { prefix: 'apis' });
	await fastify.register(banksRoutes, { prefix: 'banks' });
	await fastify.register(notificationsRoutes, {
		prefix: 'notifications',
	});
}
