import type { FastifyInstance } from 'fastify';
import registerV1Routes from './v1';

export default async function RegisterRoutes(
	fastify: FastifyInstance,
	_: unknown,
) {
	// Send the request ID as a header in all requests to the api
	fastify.addHook('onSend', async (request, reply) => {
		reply.header('X-OFIN-TRACE-ID', request.id);
		return;
	});

	await fastify.register(registerV1Routes, { prefix: 'v1' });
}
