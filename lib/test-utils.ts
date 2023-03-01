import type { FastifyInstance } from 'fastify';
import { RoleMappingPayload } from '@keycloak/keycloak-admin-client/lib/defs/roleRepresentation';
import qs from 'qs';
import axios from 'axios';

type PrepareAuthCredentialsPayload = {
	username: string;
	email: string;
	password: string;
	firstName: string;
	lastName: string;
};

type PrepareAuthCredentialsResponse = {
	accessToken: string;
	accountId: string;
};

/**
 * Creates a verified user and returns their auth credentials (`accessToken`)
 * @param server The Fastify instance
 * @param payload important params to create users
 * @returns Auth credentials
 */
async function prepareAuthCredentials(
	server: FastifyInstance,
	payload: PrepareAuthCredentialsPayload,
): Promise<PrepareAuthCredentialsResponse> {
	const { username, email, password, firstName, lastName } = payload;

	const now = Date.now();

	const requiredRoles = [
		server.config.KEYCLOAK_FAPI_USER_ROLE,
		'hulk-user',
		'loki-user',
	];

	const { id } = await server.keycloak.admin.users.create({
		realm: server.config.KEYCLOAK_FAPI_REALM,
		enabled: true,
		username,
		email,
		firstName,
		lastName,
		realmRoles: requiredRoles,
		credentials: [
			{
				priority: 100,
				type: 'password',
				value: password,
				temporary: false,
				createdDate: now,
			},
		],
		emailVerified: true,
		createdTimestamp: now,
	});

	const roleMappings = await server.keycloak.admin.roles.find();

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

	await server.keycloak.admin.users.addRealmRoleMappings({
		id,
		roles,
	});

	const passwordHash = await server.security.generateHash({
		plainText: password,
		secret: server.config.PASSWORD_HASHING_SECRET,
	});

	await server.db.account.create({
		data: {
			id,
			username,
			passwordHash,
			email,
			status: 'VERIFIED',
			createdAt: new Date(now),
		},
	});

	const KEYCLOAK_URL_PATTERN =
		// eslint-disable-next-line security/detect-unsafe-regex
		/^((?<protocol>https?):\/\/)?(?<host>((?<subdomain>[\w-]+)\.{1})?(?<domain>[\w-]+)(\.(?<tld>[a-z]+))?)(?::(?<port>\d+)?)?(?<resource>\/?\??([^#\n\r]*))?$/;
	const match = server.config.KEYCLOAK_URL.match(KEYCLOAK_URL_PATTERN);

	let tokenEndpointUrl = `http://localhost:8080/realms/${server.config.KEYCLOAK_FAPI_REALM}/protocol/openid-connect/token`;

	if (
		match &&
		match.groups &&
		match.groups['protocol'] &&
		match.groups['host']
	) {
		let keycloakUrl: string;
		// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
		keycloakUrl = `${match.groups['protocol']}://${match.groups['host']}`;

		if (match.groups['port']) {
			keycloakUrl += ':' + match.groups['port'];
		}

		tokenEndpointUrl = `${keycloakUrl}/realms/${server.config.KEYCLOAK_FAPI_REALM}/protocol/openid-connect/token`;
	}

	const response = await axios.post<{ access_token: string }>(
		tokenEndpointUrl,
		qs.stringify({
			client_id: server.config.KEYCLOAK_CLIENT_ID,
			client_secret: server.config.KEYCLOAK_CLIENT_SECRET,
			grant_type: 'password',
			username,
			password,
		}),
		{
			headers: {
				'Content-Type': 'application/x-www-form-urlencoded',
			},
		},
	);

	return { accessToken: response.data.access_token, accountId: id };
}

export { prepareAuthCredentials };
