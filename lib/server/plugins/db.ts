import type { FastifyInstance } from 'fastify';
import fp from 'fastify-plugin';
import { PrismaClient } from '@prisma/client';

declare module 'fastify' {
	interface FastifyInstance {
		db: PrismaClient;
	}
}

async function db(fastify: FastifyInstance) {
	const prisma = new PrismaClient({
		errorFormat:
			fastify.config.NODE_ENV === 'production' ? 'minimal' : 'pretty',
		log: [
			{
				emit: 'event',
				level: 'query',
			},
			{
				emit: 'event',
				level: 'error',
			},
			{
				emit: 'event',
				level: 'info',
			},
			{
				emit: 'event',
				level: 'warn',
			},
		],
	});

	prisma.$on('query', event => {
		fastify.log.debug(event);
	});

	prisma.$on('error', event => {
		fastify.log.error(event);
	});

	prisma.$on('info', event => {
		fastify.log.info(event);
	});

	prisma.$on('warn', event => {
		fastify.log.warn(event);
	});

	await prisma.$connect();

	// Make Prisma Client available through the fastify server instance: server.prisma
	fastify.decorate('db', prisma);

	// Shutdown Prisma Client when the server closes
	fastify.addHook('onClose', async () => {
		await prisma.$disconnect();
	});
}

export default fp(db, {
	name: 'db',
	dependencies: ['config'],
});
