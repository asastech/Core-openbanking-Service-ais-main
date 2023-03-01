import { argon2id, Options } from 'argon2';

export const ARGON2_DEFAULTS: Options = {
	parallelism: 2,
	memoryCost: 8192,
	saltLength: 32,
	type: argon2id,
	hashLength: 128,
};
