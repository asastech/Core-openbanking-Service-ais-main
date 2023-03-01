import type { FastifyInstance } from 'fastify';
import { schema } from './spec.json';

interface IHeaders {
	authorization: string;
}

interface IParams {
	applicationId: string;
}

export default async function registerDeleteApplicationRoute(
	fastify: FastifyInstance,
) {
	fastify.route<{ Params: IParams; Headers: IHeaders }>({
		method: 'DELETE',
		url: '/:applicationId',
		schema,
		handler: async (request, reply) => {
			const accountId = request.requestContext.get('accountId') as string;
			const { applicationId } = request.params;

			const application = await fastify.db.application.findFirst({
				where: {
					id: applicationId,
					accountId,
				},
			});

			if (!application) {
				return reply.notFound('Application not found.');
			}

			switch (application.status) {
				case 'DELETED': {
					return reply.badRequest('Application already deleted.');
				}
				case 'INACTIVE':
				case 'ACTIVE': {
					break;
				}
			}

			try {
				const client = await fastify.db.client.findFirst({
					where: {
						applicationId,
					},
				});

				if (!client) {
					return reply.notFound('Client not found.');
				}

				const [, updatedClient] = await fastify.db.$transaction([
					fastify.db.application.update({
						where: {
							id: applicationId,
						},
						data: {
							status: 'DELETED',
							deletedBy: 'USER',
							deletedById: accountId,
							deletedAt: new Date(),
						},
					}),
					fastify.db.client.update({
						where: {
							id: client.id,
						},
						data: {
							status: 'DELETED',
							deletedBy: 'USER',
							deletedById: accountId,
							deletedAt: new Date(),
						},
					}),
				]);

				const [clientRepresentation] =
					await fastify.keycloak.admin.clients.find({
						clientId: updatedClient.name,
					});

				if (!clientRepresentation) {
					throw new Error('Client not found in Keycloak.');
				}

				await fastify.keycloak.admin.clients.update(
					{
						// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
						id: clientRepresentation.id!,
					},
					{ enabled: false },
				);

				return reply
					.status(200)
					.send({ success: true, message: 'Application deleted.' });
			} catch (error) {
				fastify.log.error(
					error,
					'An error occured while attempting to delete an Application.',
				);
				return reply.internalServerError();
			}
		},
	});
}
