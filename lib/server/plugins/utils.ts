import type { FastifyInstance } from 'fastify';
import fp from 'fastify-plugin';

declare module 'fastify' {
	interface FastifyInstance {
		utils: {
			/**
			 * Parses interval strings to milliseconds.
			 * @param input a time interval, e.g: '30s', '2d', '6h'
			 * @returns interval in milliseconds
			 */
			parseIntervalToMilliseconds(input: string): number;
		};
	}
}

async function utils(fastify: FastifyInstance) {
	/**
	 * Parses interval strings to milliseconds.
	 * @param input a time interval, e.g: '30s', '2d', '6h'
	 * @returns interval in milliseconds
	 */
	const parseIntervalToMilliseconds = (input: string): number => {
		const storedIntervals: { [key: string]: number } = {};

		if (storedIntervals[`${input}`]) {
			return storedIntervals[`${input}`] as number;
		}

		const oneSecondInMs = 1000;
		const oneMinuteInMs = 60 * oneSecondInMs;
		const oneHourInMs = 60 * oneMinuteInMs;
		const oneDayInMs = 24 * oneHourInMs;

		const secondsRegex = /^(\d+)s$/g;
		const minutesRegex = /^(\d+)m$/g;
		const hoursRegex = /^(\d+)h$/g;
		const daysRegex = /^(\d+)d$/g;

		if (secondsRegex.test(input)) {
			const numberInput = input.split('s')[0];
			if (!numberInput) {
				throw new Error(`Invalid number input: ${input}`);
			}
			const numericInterval = parseInt(numberInput, 10);
			const intervalInMS = oneSecondInMs * numericInterval;
			storedIntervals[`${input}`] = intervalInMS;
			return intervalInMS;
		}

		if (minutesRegex.test(input)) {
			const numberInput = input.split('m')[0];
			if (!numberInput) {
				throw new Error(`Invalid number input: ${input}`);
			}
			const numericInterval = parseInt(numberInput, 10);
			const intervalInMS = oneMinuteInMs * numericInterval;
			storedIntervals[`${input}`] = intervalInMS;
			return intervalInMS;
		}

		if (hoursRegex.test(input)) {
			const numberInput = input.split('h')[0];
			if (!numberInput) {
				throw new Error(`Invalid number input: ${input}`);
			}
			const numericInterval = parseInt(numberInput, 10);
			const intervalInMS = oneHourInMs * numericInterval;
			storedIntervals[`${input}`] = intervalInMS;
			return intervalInMS;
		}

		if (daysRegex.test(input)) {
			const numberInput = input.split('d')[0];
			if (!numberInput) {
				throw new Error(`Invalid number input: ${input}`);
			}
			const numericInterval = parseInt(numberInput, 10);
			const intervalInMS = oneDayInMs * numericInterval;
			storedIntervals[`${input}`] = intervalInMS;
			return intervalInMS;
		}

		throw new Error(
			`Invalid interval: ${input}. Must be an integer followed either by 's', 'm', 'h' or 'd' for seconds, minutes, hours and days respectively.`,
		);
	};

	fastify.decorate('utils', {
		parseIntervalToMilliseconds,
	});
}

export default fp(utils, {
	name: 'utils',
});
