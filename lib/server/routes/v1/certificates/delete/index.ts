import type { FastifyInstance } from 'fastify';
import { schema } from './spec.json';

interface IHeaders {
	authorization: string;
}

interface IParams {
	certificateId: string;
}

export default async function registerDeleteCertificateRoute(
	fastify: FastifyInstance,
) {
	fastify.route<{ Params: IParams; Headers: IHeaders }>({
		method: 'DELETE',
		url: '/:certificateId',
		schema,
		handler: async (request, reply) => {
			const accountId = request.requestContext.get('accountId') as string;
			const { certificateId } = request.params;

			const certificate = await fastify.db.certificate.findFirst({
				where: {
					id: certificateId,
					accountId,
				},
			});
			if (!certificate) {
				return reply.notFound('Certificate not found.');
			}

			const STATUSES_PREVENTING_DELETION = ['DELETED'];
			const cannotDelete = STATUSES_PREVENTING_DELETION.includes(
				certificate.status,
			);
			if (cannotDelete) {
				return reply.badRequest('Certificate already deleted.');
			}

			try {
				const url = `/v1/${fastify.config.PKI_MOUNT_NAME}/revoke`;

				const response = await fastify.vault.client.request<{
					data: {
						revocation_time: number;
						revocation_time_rfc3339: string;
					};
				}>({
					url,
					method: 'POST',
					data: {
						serial_number: certificate.serialNumber,
					},
				});

				// Check if the request was successful to vault
				if (
					response.data &&
					!response.error &&
					response.errors &&
					response.errors.length <= 0
				) {
					await fastify.db.$transaction([
						fastify.db.certificate.update({
							where: {
								id: certificateId,
							},
							data: {
								status: 'DELETED',
								deletedAt: new Date(),
								deletedBy: 'USER',
								deletedById: accountId,
							},
						}),
					]);

					return reply.status(200).send({
						success: true,
						message: 'Successfully deleted and revoked a Certificate.',
					});
				}
			} catch (error) {
				fastify.log.error(
					error,
					'An error occured while attempting to revoke a Certificate from vault.',
				);
				return reply.internalServerError(
					'Something went wrong while revoking a Certificate. Please try again in a bit.',
				);
			}
		},
	});
}
