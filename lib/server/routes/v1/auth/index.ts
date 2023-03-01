import type { FastifyInstance } from 'fastify';
import signInRoute from './signIn';
import signUpRoute from './signUp';

export default async function registerAuthRoutes(fastify: FastifyInstance) {
	await fastify.register(signUpRoute, {
		prefix: 'signUp',
	});
	await fastify.register(signInRoute, {
		prefix: 'signIn',
	});
}
