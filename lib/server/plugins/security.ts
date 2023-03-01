import fp from 'fastify-plugin';
import { hash, verify } from 'argon2';
import type { FastifyInstance } from 'fastify';
import { async as cryptoRandomStringAsync } from 'crypto-random-string';

type GenerateHashParams = {
	plainText: string;
	secret: string;
};

type VerifyHashParams = {
	plainText: string;
	hash: string;
	secret: string;
};

type GenerateCryptoRandomStringParams = {
	length: number;
	type:
		| 'hex'
		| 'base64'
		| 'url-safe'
		| 'numeric'
		| 'distinguishable'
		| 'ascii-printable'
		| 'alphanumeric';
};

declare module 'fastify' {
	interface FastifyInstance {
		security: {
			generateHash(params: GenerateHashParams): Promise<string>;
			verifyHash(params: VerifyHashParams): Promise<string>;
			generateCryptoRandomString(
				params: GenerateCryptoRandomStringParams,
			): Promise<string>;
		};
	}
}

async function security(fastify: FastifyInstance) {
	async function generateHash({ plainText, secret }: GenerateHashParams) {
		return hash(plainText, {
			...fastify.config.ARGON2_DEFAULTS,
			raw: false,
			secret: Buffer.from(secret),
		});
	}

	async function verifyHash({ plainText, hash, secret }: VerifyHashParams) {
		return verify(hash, plainText, {
			...fastify.config.ARGON2_DEFAULTS,
			raw: false,
			secret: Buffer.from(secret),
		});
	}

	async function generateCryptoRandomString({
		length,
		type,
	}: GenerateCryptoRandomStringParams): Promise<string> {
		return cryptoRandomStringAsync({ length, type });
	}

	fastify.decorate('security', {
		generateHash,
		verifyHash,
		generateCryptoRandomString,
	});
}

export default fp(security, {
	name: 'security',
	dependencies: ['config'],
});
