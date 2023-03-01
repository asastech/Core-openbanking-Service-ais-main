import { requiredAction } from '@keycloak/keycloak-admin-client';
import { RoleMappingPayload } from '@keycloak/keycloak-admin-client/lib/defs/roleRepresentation';
import type { FastifyInstance } from 'fastify';
import { schema } from './spec.json';

interface IBody {
	username: string;
	email: string;
	password: string;
	firstName: string;
	lastName: string;
}

export default async function registerSignUpRoute(fastify: FastifyInstance) {
	fastify.route<{ Body: IBody }>({
		method: 'POST',
		url: '/',
		schema,
		handler: async (request, reply) => {
			const { username, email, password, firstName, lastName } = request.body;
			const { CONFIGURE_TOTP, VERIFY_EMAIL } = requiredAction;

			const usernameTaken = await fastify.db.account.findFirst({
				where: {
					username,
				},
			});
			if (usernameTaken) {
				return reply.badRequest('Username is taken.');
			}

			const emailTaken = await fastify.db.account.findFirst({
				where: {
					email,
				},
			});
			if (emailTaken) {
				return reply.badRequest('Email is taken.');
			}

			try {
				const now = Date.now();

				const requiredRoles = [
					fastify.config.KEYCLOAK_FAPI_USER_ROLE,
					'hulk-user',
					'loki-user',
				];

				const { id } = await fastify.keycloak.admin.users.create({
					realm: fastify.config.KEYCLOAK_FAPI_REALM,
					enabled: true,
					username,
					email,
					firstName,
					lastName,
					realmRoles: requiredRoles,
					requiredActions: [CONFIGURE_TOTP, VERIFY_EMAIL],
					credentials: [
						{
							priority: 100,
							type: 'password',
							value: password,
							temporary: false,
							createdDate: now,
						},
					],
					emailVerified: false,
					createdTimestamp: now,
				});

				const roleMappings = await fastify.keycloak.admin.roles.find();

				const roles: RoleMappingPayload[] = [];

				roleMappings.forEach(roleMapping => {
					requiredRoles.forEach(requiredRole => {
						if (roleMapping.name === requiredRole) {
							roles.push({
								// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
								id: roleMapping.id!,
								name: roleMapping.name,
							});
						}
					});
				});

				await fastify.keycloak.admin.users.addRealmRoleMappings({
					id,
					roles,
				});

				const passwordHash = await fastify.security.generateHash({
					plainText: password,
					secret: fastify.config.PASSWORD_HASHING_SECRET,
				});

				await fastify.db.$transaction([
					fastify.db.account.create({
						data: {
							id,
							username,
							email,
							passwordHash,
							status: 'UNVERIFIED',
							createdAt: new Date(now),
						},
					}),
				]);

				return reply.status(200).send({
					success: true,
					message: 'Account created. Please verify.',
				});
			} catch (error) {
				fastify.log.error(
					error,
					'An error occured while attempting to sign up a new user.',
				);
				return reply.internalServerError();
			}
		},
	});
}
