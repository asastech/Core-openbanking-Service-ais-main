import type { FastifyInstance } from 'fastify';
import fetch from './fetch';
import list from './list';
import initiate from './initiate';

export default async function registerPaymentsRoutes(fastify: FastifyInstance) {
	await fastify.register(fetch);
	await fastify.register(list);
	await fastify.register(initiate);

	// Create a hook that executes after the request is sent that is used to increment
	// API usage for /payments routes using `accountId` from request context and
	// `apiId` from a db lookup.
	fastify.addHook('onSend', async (request, _, __) => {
		const accountId =
			(request.requestContext.get('accountId') as string) || null;
		// Exit early if no `accountId` is found in request context.
		if (!accountId) {
			fastify.log.warn('Account ID not found in request context');
			return;
		}

		// Fetch the `apiId` from the database.
		const api = await fastify.db.api.findFirst({
			where: { context: '/payments' },
		});

		if (!api) {
			fastify.log.error('API with context `/payments` not found.');
			return;
		}

		// Increment current months api usage for `api.id` for `accountId` by 1.
		const apiUsage = await fastify.db.accountApiUsage.findFirst({
			where: {
				accountId,
				apiId: api.id,
				month: new Date(),
			},
		});

		if (!apiUsage) {
			fastify.log.error(
				`API usage for account ${accountId} and API ${api.context} not found.`,
			);
			return;
		}

		// Update `apiUsage`
		await fastify.db.accountApiUsage.update({
			where: {
				id: apiUsage.id,
			},
			data: {
				count: apiUsage.count + 1,
			},
		});
	});
}
