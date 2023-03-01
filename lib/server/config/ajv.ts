import Ajv from 'ajv';
import applyErrors from 'ajv-errors';
import applyFormats from 'ajv-formats';
import logger from './logger';

const ajv = new Ajv({
	allErrors: true,
	removeAdditional: 'all',
	useDefaults: true,
	coerceTypes: true,
	validateSchema: true,
	ownProperties: true,
	logger: {
		log(...args) {
			logger.info(args);
		},
		error(...args) {
			logger.error(args);
		},
		warn(...args) {
			logger.warn(args);
		},
	},
});

applyFormats(ajv);
applyErrors(ajv);

export default ajv;
