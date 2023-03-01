import axios, { AxiosRequestConfig } from 'axios';
import type { FastifyInstance } from 'fastify';
import fp from 'fastify-plugin';

type VaultClientRequest = <T>(options: AxiosRequestConfig) => Promise<{
	data?: T;
	status: number;
	statusText?: string;
	error?: unknown;
	message?: string;
	errors?: Array<string>;
}>;

declare module 'fastify' {
	interface FastifyInstance {
		vault: {
			client: {
				/**
				 * Initiate an Axios HTTP request to a Vault instance
				 */
				request: VaultClientRequest;
			};
			/**
			 * Initializes a Vault instance with the required PKI options.
			 */
			initializeVaultPKI: () => Promise<[boolean, Record<string, any> | null]>;
		};
	}
}

async function vault(fastify: FastifyInstance) {
	const httpClient = axios.create({
		baseURL: fastify.config.VAULT_ADDR,
		headers: {
			'Content-Type': 'application/json',
			'X-Vault-Token': fastify.config.VAULT_TOKEN,
		},
	});

	async function request<T>(options: AxiosRequestConfig): Promise<{
		data?: T;
		status: number;
		statusText?: string;
		error?: unknown;
		message?: string;
	}> {
		try {
			return httpClient.request(options);
		} catch (error) {
			fastify.log.error(
				error,
				'An error occured while attempting to send a request to the Vault service.',
			);
			return { error, message: 'Internal Server Error', status: 500 };
		}
	}

	async function initializeVaultPKI(): Promise<
		[boolean, Record<string, any> | null]
	> {
		try {
			const enablePKIResponse = await request({
				method: 'POST',
				url: '/v1/sys/mounts/pki',
				data: {
					type: 'pki',
					description: 'Generic PKI',
				},
			});

			if (enablePKIResponse.status !== 204) {
				fastify.log.error(enablePKIResponse, 'Failed to enable PKI.');
				return [false, enablePKIResponse];
			}

			const tunePKIResponse = await request({
				method: 'POST',
				url: '/v1/sys/mounts/pki/tune',
				data: {
					max_lease_ttl: fastify.config.PKI_CERT_EXPIRATION,
				},
			});

			if (tunePKIResponse.status !== 204) {
				fastify.log.error(tunePKIResponse, 'Failed to tune PKI.');
				return [false, tunePKIResponse];
			}

			const generateRootCAResponse = await request({
				method: 'POST',
				url: '/v1/pki/root/generate/exported',
				data: {
					common_name: 'ofin.co',
					issuer_name: fastify.config.PKI_ISSUER_REF,
					ttl: fastify.config.PKI_CERT_EXPIRATION,
				},
			});

			if (generateRootCAResponse.status !== 200) {
				fastify.log.error(
					generateRootCAResponse,
					'Failed to generate Root CA.',
				);
				return [false, generateRootCAResponse];
			}

			const createRoleForCA = await request({
				method: 'PUT',
				url: `/v1/pki/roles/${fastify.config.PKI_ROLE_NAME}`,
				data: {
					allow_any_name: true,
					issuer_ref: fastify.config.PKI_ISSUER_REF,
				},
			});

			if (createRoleForCA.status !== 204) {
				fastify.log.error(createRoleForCA, 'Failed to create role for CA.');
				return [false, createRoleForCA];
			}

			const configureRevocationAndIssuanceRoutesResponse = await request({
				method: 'POST',
				url: '/v1/pki/config/urls',
				data: {
					issuing_certificates: `${fastify.config.VAULT_ADDR}/v1/pki/ca`,
					crl_distribution_points: `${fastify.config.VAULT_ADDR}/v1/pki/crl`,
				},
			});

			if (configureRevocationAndIssuanceRoutesResponse.status !== 204) {
				fastify.log.error(
					configureRevocationAndIssuanceRoutesResponse,
					'Failed to configure CA and CRL URLs.',
				);
				return [false, configureRevocationAndIssuanceRoutesResponse];
			}

			const enableIntermediatePKIResponse = await request({
				method: 'POST',
				url: `/v1/sys/mounts/${fastify.config.PKI_MOUNT_NAME}`,
				data: {
					type: 'pki',
					description: 'Generic Intermediate PKI',
				},
			});

			if (enableIntermediatePKIResponse.status !== 204) {
				fastify.log.error(
					enableIntermediatePKIResponse,
					'Failed to enable Intermediate PKI.',
				);
				return [false, enableIntermediatePKIResponse];
			}

			const tuneIntermediatePKIResponse = await request({
				method: 'POST',
				url: `/v1/sys/mounts/${fastify.config.PKI_MOUNT_NAME}/tune`,
				data: {
					max_lease_ttl: fastify.config.PKI_CERT_EXPIRATION,
				},
			});

			if (tuneIntermediatePKIResponse.status !== 204) {
				fastify.log.error(
					tuneIntermediatePKIResponse,
					'Failed to tune Intermediate PKI.',
				);
				return [false, tuneIntermediatePKIResponse];
			}

			const generateIntermediateCAResponse = await request<{
				data: { csr: string };
			}>({
				method: 'POST',
				url: `/v1/${fastify.config.PKI_MOUNT_NAME}/intermediate/generate/exported`,
				data: {
					common_name: 'ofin.co Intermediate Authority',
					issuer_name: 'ofin-dot-io-intermediate-dev',
				},
			});

			if (generateIntermediateCAResponse.status !== 200) {
				fastify.log.error(
					generateIntermediateCAResponse,
					'Failed to generate Intermediate CA.',
				);
				return [false, generateIntermediateCAResponse];
			}

			const signCSRResponse = await request<{ data: { certificate: string } }>({
				method: 'POST',
				url: '/v1/pki/root/sign-intermediate',
				data: {
					csr: generateIntermediateCAResponse.data?.data.csr,
					format: 'pem_bundle',
					ttl: fastify.config.PKI_CERT_EXPIRATION,
				},
			});

			if (signCSRResponse.status !== 200) {
				fastify.log.error(signCSRResponse, 'Failed to sign CSR.');
				return [false, signCSRResponse];
			}

			const submitSignedCertificateResponse = await request({
				method: 'POST',
				url: `/v1/${fastify.config.PKI_MOUNT_NAME}/intermediate/set-signed`,
				data: {
					certificate: signCSRResponse.data?.data.certificate,
				},
			});

			if (submitSignedCertificateResponse.status !== 204) {
				fastify.log.error(
					submitSignedCertificateResponse,
					'Failed to submit Signed Certificate.',
				);
				return [false, submitSignedCertificateResponse];
			}

			const createRoleResponse = await request({
				method: 'POST',
				url: `/v1/${fastify.config.PKI_MOUNT_NAME}/roles/${fastify.config.PKI_ROLE_NAME}`,
				data: {
					allow_any_name: true,
					allow_subdomains: true,
					allow_localhost: false,
					allow_glob_domains: true,
					server_flag: false,
					client_flag: true,
					allow_wildcard_certificates: true,
					code_signing_flag: false,
					email_protection_flag: false,
					key_type: 'rsa',
					key_bits: 2048,
					key_usage: ['DigitalSignature'],
					ext_key_usage: ['ExtKeyUsageClientAuth'],
					issuer_ref: fastify.config.PKI_ISSUER_REF,
					no_store: false,
					require_cn: true,
					max_ttl: fastify.config.PKI_CERT_EXPIRATION,
				},
			});

			if (createRoleResponse.status !== 204) {
				fastify.log.error(createRoleResponse, 'Failed to create Role.');
				return [false, createRoleResponse];
			}

			return [true, null];
		} catch (error) {
			fastify.log.error(
				error,
				"An error occured while attempting to initalize Vault's PKI.",
			);
			return [false, error as Record<string, any>];
		}
	}

	fastify.decorate('vault', {
		client: {
			request,
		},
		initializeVaultPKI,
	});
}

export default fp(vault, {
	name: 'vault',
	dependencies: ['config'],
});
