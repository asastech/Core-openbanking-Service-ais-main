import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import fp from 'fastify-plugin';
import jwt from 'jsonwebtoken';
import jwks from 'jwks-rsa';
import jwkToPem, { JWK } from 'jwk-to-pem';
import { Issuer, Client } from 'openid-client';

interface KeycloakKey {
	kid: string;
	kty: string;
	alg: string;
	use: string;
	n: string;
	e: string;
	[key: string]: string;
}

interface VerifiedToken {
	exp: number;
	iat: number;
	jti: string;
	iss: string;
	aud: string;
	sub: string;
	typ: string;
	azp: string;
	session_state: string;
	acr: string;
	'allowed-origins': string[];
	realm_access: RealmAccess;
	resource_access: ResourceAccess;
	scope: string;
	sid: string;
	email_verified: boolean;
	name: string;
	preferred_username: string;
	given_name: string;
	family_name: string;
	email: string;
}

interface RealmAccess {
	roles: string[];
}

interface ResourceAccess {
	[key: string]: {
		roles: string[];
	};
}

declare module 'fastify' {
	interface FastifyInstance {
		auth: {
			/**
			 * Checks the request for a valid access token
			 */
			checkForAccessToken: (
				request: FastifyRequest,
				reply: FastifyReply,
			) => Promise<void>;
			/**
			 * Checks the request for a valid list of permissions. Must execute 'fastify.auth.checkForAccessToken' first.
			 */
			checkForPermissions: (
				permissions: string[],
			) => (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
			/**
			 * Checks the status of an account against our db records and sets it in the request-scope
			 * 'account' object. Must execute 'fastify.auth.checkForAccessToken' first.
			 */
			checkAccountStatus: (
				request: FastifyRequest,
				reply: FastifyReply,
			) => Promise<void>;
			/**
			 * Refetches JWKS from Keycloak. Only to be used with CRON job handlers.
			 */
			refetchJWKS: () => Promise<void>;
			/**
			 * Used to initiate OIDC Auth actions (fetch access token, refresh tokens etc.)
			 */
			authClient: Client;
		};
	}
}

async function auth(fastify: FastifyInstance) {
	const KEYCLOAK_URL_PATTERN =
		// eslint-disable-next-line security/detect-unsafe-regex
		/^((?<protocol>https?):\/\/)?(?<host>((?<subdomain>[\w-]+)\.{1})?(?<domain>[\w-]+)(\.(?<tld>[a-z]+))?)(?::(?<port>\d+)?)?(?<resource>\/?\??([^#\n\r]*))?$/;
	const match = fastify.config.KEYCLOAK_URL.match(KEYCLOAK_URL_PATTERN);

	let keycloakUrl = 'http://localhost:8080';

	if (
		match &&
		match.groups &&
		match.groups['protocol'] &&
		match.groups['host']
	) {
		keycloakUrl = `${match.groups['protocol']}://${match.groups['host']}`;

		if (match.groups['port']) {
			keycloakUrl += ':' + match.groups['port'];
		}
	}

	const JWKS_ENDPOINT = `${keycloakUrl}/realms/${fastify.config.KEYCLOAK_FAPI_REALM}/protocol/openid-connect/certs`;

	const jwksClient = jwks({
		cache: true,
		cacheMaxEntries: 10,
		cacheMaxAge: fastify.utils.parseIntervalToMilliseconds('10m'),
		jwksUri: JWKS_ENDPOINT,
	});

	/**
	 * Fetches JWKS from Keycloak/Cache (or caches it if not found)
	 */
	async function fetchJWKS(): Promise<KeycloakKey[]> {
		const cachedJwks = await fastify.cache.get('hulk:jwks');
		if (cachedJwks) {
			return JSON.parse(cachedJwks) as KeycloakKey[];
		}

		const jwks = (await jwksClient.getKeys()) as KeycloakKey[];
		await fastify.cache.set(
			'hulk:jwks',
			JSON.stringify(jwks),
			'EX',
			fastify.utils.parseIntervalToMilliseconds('5m'),
		);
		return jwks;
	}

	let jwksKeys = await fetchJWKS();

	async function checkForAccessToken(
		request: FastifyRequest,
		reply: FastifyReply,
	) {
		try {
			if (!request.headers.authorization) {
				return reply.forbidden('Invalid credentials.');
			}

			const [, token] = request.headers.authorization.split('Bearer ');

			if (!token) {
				return reply.forbidden('Invalid credentials.');
			}

			const decodedToken = jwt.decode(token, { complete: true });

			if (!decodedToken || !decodedToken.header.kid) {
				return reply.forbidden('Invalid credentials.');
			}

			const tokenSingingKeyId = decodedToken.header.kid;

			const key = jwksKeys.find(key => key.kid === tokenSingingKeyId) as JWK;

			if (!key) {
				return reply.forbidden('Invalid credentials.');
			}

			const publicKey = jwkToPem(key, { private: false });

			const verifiedToken = jwt.verify(token, publicKey) as VerifiedToken;

			request.requestContext.set('token', verifiedToken);
			request.requestContext.set('accountId', verifiedToken.sub);
		} catch (error) {
			fastify.log.error(
				error,
				'An error occured while attempting to check for an Access token.',
			);

			if (
				error instanceof jwt.TokenExpiredError ||
				error instanceof jwt.JsonWebTokenError ||
				error instanceof jwt.NotBeforeError
			) {
				return reply.forbidden('Invalid credentials.');
			}

			return reply.internalServerError();
		}
	}

	function checkForPermissions(roles: string[]) {
		return async (request: FastifyRequest, reply: FastifyReply) => {
			try {
				const token = request.requestContext.get(
					'token',
				) as VerifiedToken | null;
				if (!token) {
					return reply.unauthorized();
				}

				const {
					email,
					email_verified: emailVerified,
					realm_access: realmAccess,
				} = token;

				if (!emailVerified) {
					fastify.log.warn({ email }, 'Unverified account');
					return reply.forbidden('Email not verified.');
				}

				roles.forEach(role => {
					const hasSufficientPermissions = realmAccess.roles.includes(role);
					if (!hasSufficientPermissions) {
						return reply.unauthorized('Insufficient Privileges');
					}
				});
			} catch (error) {
				fastify.log.error(
					error,
					'An error occured while attempting to check for permissions.',
				);
				return reply.internalServerError();
			}
		};
	}

	async function checkAccountStatus(
		request: FastifyRequest,
		reply: FastifyReply,
	) {
		try {
			const accountId = request.requestContext.get('accountId') as string;
			const account = await fastify.db.account.findFirst({
				where: {
					id: accountId,
				},
			});
			if (!account) {
				return reply.notFound('Account not found.');
			}

			switch (account.status) {
				case 'UNVERIFIED': {
					return reply.forbidden('Account is not verified.');
				}
				case 'BANNED':
				case 'DELETED': {
					return reply.forbidden(
						'Your account is banned or disabled. Please contact the administration.',
					);
				}
				case 'VERIFIED': {
					break;
				}
			}

			request.requestContext.set('account', account);
		} catch (error) {
			fastify.log.error(
				error,
				"An error occured while attempting to check the Account's status.",
			);
			return reply.internalServerError();
		}
	}

	async function refetchJWKS() {
		try {
			fastify.log.debug('Refetching JWKS...');
			jwksKeys = await fetchJWKS();
		} catch (error) {
			fastify.log.error(
				error,
				'An error occured while attempting to refetch JWKS.',
			);
		}
	}

	const issuer = await Issuer.discover(
		`${keycloakUrl}/realms/${fastify.config.KEYCLOAK_FAPI_REALM}`,
	);

	const authClient = new issuer.Client({
		client_id: fastify.config.KEYCLOAK_CLIENT_ID,
		client_secret: fastify.config.KEYCLOAK_CLIENT_SECRET,
		token_endpoint_auth_method: 'client_secret_basic',
	});

	fastify.decorate('auth', {
		checkForAccessToken,
		checkForPermissions,
		checkAccountStatus,
		refetchJWKS,
		authClient,
	});
}

export default fp(auth, {
	name: 'auth',
	dependencies: ['config', 'keycloak', 'cache', 'utils'],
});
