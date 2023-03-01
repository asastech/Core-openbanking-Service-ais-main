import fp from 'fastify-plugin';
import type { FastifyInstance } from 'fastify';
import fastifyCors from '@fastify/cors';

async function cors(fastify: FastifyInstance) {
	fastify.register(fastifyCors, {
		methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
		origin: (origin, callback) => {
			if (
				fastify.config.NODE_ENV !== 'production' &&
				fastify.config.APP_ENV !== 'production' &&
				(/localhost/.test(origin) || !origin)
			) {
				callback(null, true);
				return;
			}

			// Requests from OFIN domains and subdomains will pass
			if (
				/((http|https):\/\/)?ofin\.[\w\d]+\/?/.test(origin) ||
				/((http|https):\/\/)?[\w\d]+\.ofin\.[\w\d]+\/?/.test(origin)
			) {
				callback(null, true);
				return;
			}

			callback(
				fastify.httpErrors.forbidden('Did not match CORS policy.'),
				false,
			);
			return;
		},
	});
}

export default fp(cors, {
	name: 'cors',
	dependencies: ['config'],
});
