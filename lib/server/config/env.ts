const ENV_SCHEMA = {
	type: 'object',
	required: [
		'SERVICE_NAME',
		'DATABASE_URL',
		'CACHE_URL',
		'KEYCLOAK_URL',
		'KEYCLOAK_REALM',
		'KEYCLOAK_CLIENT_ID',
		'KEYCLOAK_CLIENT_SECRET',
		'PASSWORD_HASHING_SECRET',
		'CLIENT_SECRET_HASHING_SECRET',
		'VAULT_ADDR',
		'VAULT_TOKEN',
		'PKI_MOUNT_NAME',
		'PKI_ROLE_NAME',
		'PKI_ISSUER_REF',
		'PKI_CERT_EXPIRATION',
	],

	properties: {
		SERVICE_NAME: {
			type: 'string',
		},
		NODE_ENV: {
			type: 'string',
			enum: ['development', 'testing', 'staging', 'production'],
			default: 'production',
		},
		APP_ENV: {
			type: 'string',
			enum: ['development', 'testing', 'staging', 'production'],
			default: 'production',
		},
		LOG_LEVEL: {
			type: 'string',
			enum: ['fatal', 'error', 'warn', 'info', 'debug', 'trace'],
			default: 'info',
		},
		DISABLE_LOGGING: {
			type: 'boolean',
			default: false,
		},
		HOST: {
			type: 'string',
			default: '0.0.0.0',
		},
		PORT: {
			type: 'integer',
			default: 3000,
		},
		DATABASE_URL: {
			type: 'string',
			format: 'uri',
		},
		CACHE_URL: {
			type: 'string',
			format: 'uri',
		},
		KEYCLOAK_URL: {
			type: 'string',
			format: 'uri',
		},
		KEYCLOAK_REALM: {
			type: 'string',
		},
		KEYCLOAK_FAPI_REALM: {
			type: 'string',
			default: 'fapi',
		},
		KEYCLOAK_FAPI_USER_ROLE: {
			type: 'string',
			default: 'fapi-user',
		},
		KEYCLOAK_FAPI_CLIENT_ROLE: {
			type: 'string',
			default: 'fapi-client',
		},
		KEYCLOAK_CLIENT_ID: {
			type: 'string',
		},
		KEYCLOAK_CLIENT_SECRET: {
			type: 'string',
		},
		PASSWORD_HASHING_SECRET: {
			type: 'string',
		},
		CLIENT_SECRET_HASHING_SECRET: {
			type: 'string',
		},
		VAULT_ADDR: {
			type: 'string',
		},
		VAULT_TOKEN: {
			type: 'string',
		},
		PKI_MOUNT_NAME: {
			type: 'string',
		},
		PKI_ROLE_NAME: {
			type: 'string',
		},
		PKI_ISSUER_REF: {
			type: 'string',
		},
		PKI_CERT_EXPIRATION: {
			type: 'string',
		},
	},
};

export default ENV_SCHEMA;
