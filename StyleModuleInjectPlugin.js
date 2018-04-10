"use strict";

const fs = require('fs');
const path = require('path');
const nodeSass = require('node-sass');

class StyleModuleInjectPlugin {

	constructor(options = {}) {
		this.options = options;
		this.options.includePaths = this.options.includePaths || [];
		this.options.outputStyle = this.options.outputStyle || 'compressed';
		this.options.webpackHook = this.options.webpackHook || "run";

		this.startStyle = "/*inject_start{scss}*/";
		this.endStyle = "/*inject_end{scss}*/";
		//This will match anything between the Start and End Style, so we can reinject and overwrite again and again.
		this.regEx = /\/\*inject_start{scss}\*\/[\s\S]*\/\*inject_end{scss}\*\//g;
	}

	// thanks to https://stackoverflow.com/a/25462405/6699493
	ReadFilesfromDir(startPath, filter, callback) {

		// if the folder to search does not exist
		if (!fs.existsSync(startPath)) {
			throw new Error("The given path is not a valid directory: " + startPath);
		}

		let files = fs.readdirSync(startPath);

		for (let i = 0; i < files.length; i++) {
			let filename = path.join(startPath, files[i]);
			let stat = fs.lstatSync(filename);
			if (stat.isDirectory()) {
				this.ReadFilesfromDir(filename, filter, callback); //recurse
			} else if (filter.test(filename)) {
				callback(filename);
			}
		};
	}

	compileSass(file) {

		let result = nodeSass.renderSync({
			file: file,
			includePaths: this.options.includePaths,
			outputStyle: this.options.outputStyle
		});

		return result.css;
	}

	injectCSSinStyleModule(moduleFile, css, cb) {

		// If there is no css
		if (!css) {
			return cb(null);
		}

		let styleModuleContent = fs.readFileSync(moduleFile, "utf8");

		// if the style_module is empty or the RegEx doesn't exists in the file, return null.
		if (!styleModuleContent || !this.regEx.test(styleModuleContent)) {
			return cb(null);
		}
		/**
		 * Re-create the start and end placeholders and inject them back to the style module
		 * This will allow us to re-inject over and over again 
		 */
		const injectCssContent = this.startStyle + css.toString() + this.endStyle;

		// This is going to replace everything that was between the this.startStyle and this.endStyle
		styleModuleContent = new Buffer(styleModuleContent.replace(this.regEx, injectCssContent), 'binary');

		// write the content back to the module
		fs.writeFile(moduleFile, styleModuleContent, (err) => {
			if (err) {
				return cb(false);
			}
			return cb(true);
		});
	}

	convertAndInject() {
		this.ReadFilesfromDir(this.options.folder, this.options.extension, (sassfile) => {
			// get the related style-module for the SASS file
			const moduleFile = sassfile.replace(this.options.extension, '.html');

			// only compile and inject if the module exists
			if (fs.existsSync(moduleFile)) {

				let compiledCSS = this.compileSass(sassfile);

				this.injectCSSinStyleModule(moduleFile, compiledCSS, (success) => {
					console.log(success + " " + moduleFile);
					// handle stuff after injection
				});
			}
		});
	}

	apply(compiler) {
		// execute the injection at the given webpack lifecycle hook
		compiler.plugin(this.options.webpackHook, () => {
			this.convertAndInject();
		});
	}
}

module.exports = StyleModuleInjectPlugin;
