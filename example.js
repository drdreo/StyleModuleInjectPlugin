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
	polymerVersion: 3,
	styleFolder: './SassStyles',
	moduleFolder: './WebComponents/Style-Modules',
	extension: /\.scss$/,
	outputStyle: 'nested',
	startComment: "/*inject_start{scss}*/",
	endComment: "/*inject_end{scss}*/",
});

loader.convertAndInject(); // triggers the conversion
