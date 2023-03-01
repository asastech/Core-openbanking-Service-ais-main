module.exports = {
	// Supports all esbuild.build options
	esbuild: {
		minify: false,
		target: 'es2020',
	},
	// Prebuild hook
	prebuild: async () => {
		console.log('Running prebuild hook...');
		const rimraf = (await import('rimraf')).default;
		rimraf.sync('./dist'); // clean up dist folder
	},
	// Postbuild hook
	postbuild: async () => {
		console.log('Running postbuild hook...');
		const cpy = (await import('cpy')).default;
		await cpy(
			[
				'lib/**/*.json', // Copy all .json files
				'!lib/**/*.{tsx,ts,js,jsx}', // Ignore already built files
			],
			'dist',
		);
	},
};
