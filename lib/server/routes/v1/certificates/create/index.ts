import type { FastifyInstance } from 'fastify';
import { schema } from './spec.json';

interface IHeaders {
	authorization: string;
}

interface IBody {
	description: string;
	commonName: string;
	ttl: string;
}

export default async function registerCreateCertificateRoute(
	fastify: FastifyInstance,
) {
	fastify.route<{ Body: IBody; Headers: IHeaders }>({
		method: 'POST',
		url: '/',
		schema,
		handler: async (request, reply) => {
			const { description, commonName, ttl } = request.body;
			const accountId = request.requestContext.get('accountId') as string;

			const commonNameTaken = await fastify.db.certificate.findFirst({
				where: {
					commonName,
					accountId,
				},
			});
			if (commonNameTaken) {
				return reply.badRequest(
					`A Certificate is already issued for ${commonName}.`,
				);
			}

			try {
				const requestCertificateUrl = `/v1/${fastify.config.PKI_MOUNT_NAME}/issue/${fastify.config.PKI_ROLE_NAME}`;

				const requestCertificateResponse = await fastify.vault.client.request<{
					data: {
						certificate: string;
						issuing_ca: string;
						private_key: string;
						serial_number: string;
					};
				}>({
					url: requestCertificateUrl,
					method: 'POST',
					data: {
						common_name: commonName,
						ttl,
					},
				});

				// Check if the request was successful to vault
				if (
					requestCertificateResponse.data &&
					!requestCertificateResponse.error &&
					!requestCertificateResponse.errors
				) {
					const {
						certificate,
						issuing_ca: ca,
						private_key: privateKey,
						serial_number: serialNumber,
					} = requestCertificateResponse.data.data;

					const expiresAt = new Date(
						Date.now() + fastify.utils.parseIntervalToMilliseconds(ttl),
					);

					const [createdCertificate] = await fastify.db.$transaction([
						fastify.db.certificate.create({
							data: {
								accountId,
								description,
								commonName,
								serialNumber,
								status: 'ISSUED',
								expiresAt,
							},
						}),
					]);

					return reply.status(200).send({
						success: true,
						message: 'Successfully created a new Certificate!',
						data: {
							certificateId: createdCertificate.id,
							certificate,
							ca,
							privateKey,
							expiresAt,
							serialNumber,
						},
					});
				}
			} catch (error) {
				fastify.log.error(
					error,
					'An error occured while attempting to create a certificate.',
				);
				return reply.internalServerError(
					'Something went wrong while generating a Certificate. Please try again in a bit.',
				);
			}
		},
	});
}
