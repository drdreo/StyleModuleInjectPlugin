const StyleModuleInjectPlugin = require('./StyleModuleInjectPlugin');

// this configuration defines that:
// scss files are found on the same level inside the "scss" directory
// the style modules to inject to are located in the same level in the "style-modules" directory
// that my style files got .scss as extension
// that other includes used in sass files can be found at "src/webcomponents/style-modules"
// how the css shall be output
// in what folder the css files should be written
// the start and end string for the regex to look for

// init the plugin
let loader = new StyleModuleInjectPlugin({
	styleFolder: './scss',
	moduleFolder: './style-modules',
	extension: /\.scss$/,
	includePaths: ["src/webcomponents/style-modules"],
	outputStyle: 'nested',
	cssFolder: './css',
	startComment: "/*inject_start{scss}*/",
	endComment: "/*inject_end{scss}*/",
});

loader.convertAndInject(); // triggers the conversion
