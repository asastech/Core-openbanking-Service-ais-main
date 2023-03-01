import RoleRepresentation from '@keycloak/keycloak-admin-client/lib/defs/roleRepresentation';
import type { FastifyInstance } from 'fastify';
import { schema } from './spec.json';
import { v4 as generateUUID } from 'uuid';
import type { Account } from '@prisma/client';

interface IHeaders {
	authorization: string;
}

interface IBody {
	name: string;
	baseUrl: string;
}

export default async function registerCreateApplicationRoute(
	fastify: FastifyInstance,
) {
	fastify.route<{ Body: IBody; Headers: IHeaders }>({
		method: 'POST',
		url: '/',
		schema,
		handler: async (request, reply) => {
			const { name, baseUrl } = request.body;
			const accountId = request.requestContext.get('accountId') as string;
			const account = request.requestContext.get('account') as Account;

			const applicationNameTaken = await fastify.db.application.findFirst({
				where: {
					name,
					accountId,
				},
			});

			if (applicationNameTaken) {
				return reply.conflict(`Application ${name} already exists.`);
			}

			try {
				const clientId = generateUUID();
				const clientSecret = await fastify.security.generateCryptoRandomString({
					length: 128,
					type: 'alphanumeric',
				});

				const { id } = await fastify.keycloak.admin.clients.create({
					realm: fastify.config.KEYCLOAK_FAPI_REALM,
					clientId,
					redirectUris: [baseUrl],
					baseUrl,
					enabled: true,
					consentRequired: false,
					publicClient: false,
					bearerOnly: false,
					description: `Client for user ${account.username}.`,
					defaultRoles: [fastify.config.KEYCLOAK_FAPI_CLIENT_ROLE],
					secret: clientSecret,
					directAccessGrantsEnabled: true,
					serviceAccountsEnabled: false,
					fullScopeAllowed: false,
				});

				const fapiRealmRole = (await fastify.keycloak.admin.roles.findOneByName(
					{
						name: fastify.config.KEYCLOAK_FAPI_CLIENT_ROLE,
					},
				)) as RoleRepresentation;

				await fastify.keycloak.admin.clients.addRealmScopeMappings(
					{
						id,
					},
					[fapiRealmRole],
				);

				const { id: applicationId } = await fastify.db.application.create({
					data: {
						name,
						accountId,
						status: 'ACTIVE',
					},
				});

				await fastify.db.client.create({
					data: {
						applicationId,
						name: clientId,
						secret: clientSecret,
						baseUrl: baseUrl,
						type: 'CONFIDENTIAL',
						status: 'CREATED',
					},
				});

				return reply.status(200).send({
					success: true,
					message: 'Application created.',
				});
			} catch (error) {
				fastify.log.error(
					error,
					'An error occured while attempting to create an Application.',
				);
				return reply.internalServerError();
			}
		},
	});
}
