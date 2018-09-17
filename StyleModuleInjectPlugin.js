"use strict";

/**
 * Author: Andreas K. Hahn - https://github.com/drdreo
 * Repository: https://github.com/drdreo/StyleModuleInjectPlugin
 * A big thanks to Jose A. who created a similar task for gulp.
 * He explained it in detail at stackoverflow: https://stackoverflow.com/a/37666406/6699493
 *
 * Description: A Webpack plugin or standalone class to convert sass to css and inject it into a polymer 3 style module.
 * Usage:
 *  let plugin = new StyleModuleInjectPlugin({ options });
		plugin.convertAndInject();

		available options: {
						polymerVersion: 2																		the polymer version used, optional - sets the right style module extension
						styleFolder: './scss',															directory that the plugin should check for styles										
						moduleFolder: './style-modules',										directory that the plugin should check for modules
						extension: /\.scss$/,																file extension to look for
						includePaths: ["src/webcomponents/style-modules"], 	https://www.npmjs.com/package/node-sass#includepaths, optional
						outputStyle: 'nested', 															https://www.npmjs.com/package/node-sass#outputstyle, optional
						cssFolder: './css',																	the directory where the css files should be written to, optional
						webpackHook: 'run' 																	https://webpack.js.org/api/compiler-hooks/, optional
						startComment: "/*inject_start{scss}<star>/",				defines the start point of injection, optional
						endComment: "/*inject_end{scss}<star>/"							defines the end point of injection, optional
				 }
 */
const fs = require('fs');
const path = require('path');
const nodeSass = require('node-sass');
const chalk = require('chalk');
var autoprefixer = require('autoprefixer');
var postcss = require('postcss');
const postcssUrl = require('postcss-url');

class StyleModuleInjectPlugin {

	constructor(options = { }) {
		this.options = options;
		this.options.includePaths = this.options.includePaths || [];
		this.options.outputStyle = this.options.outputStyle || 'compressed';
		this.options.webpackHook = this.options.webpackHook || "run";

		if (!this.options.styleFolder) {
			throw { name: "MissingArgumentError", message: "Style Folder option is missing!" };
		}
		if (!this.options.moduleFolder) {
			throw { name: "MissingArgumentError", message: "Module Folder option is missing!" };
		}
		if (!this.options.extension) {
			throw { name: "MissingArgumentError", message: "Extension option is missing!" };
		}

		// Polymer 2 used style modules as HTML, 
		// in version 3, they switched to JavaScript files
		this.moduleExtension = ".html";
		if (Math.round(this.options.polymerVersion) == 3) {
			this.moduleExtension = ".js";
		}
		
		this.startStyle = this.options.startComment || "/*inject_start{scss}*/";
		this.endStyle = this.options.endComment || "/*inject_end{scss}*/";

		//This will match anything between the Start and End Style, so we can reinject and overwrite again and again.
		this.regExp = new RegExp(this.escapeRegExp(this.startStyle) + "[\\s\\S]*" + this.escapeRegExp(this.endStyle), "g");

		// counts all processed files
		this.cntProcessedFiles = 0;
	}

	// thanks to https://stackoverflow.com/a/25462405/6699493
	ReadFilesfromDir(startPath, filter, callback) {

		// if the folder to search does not exist
		if (!fs.existsSync(startPath)) {
			throw new Error("The given path is not a valid directory: " + startPath);
		}

		let files = fs.readdirSync(startPath);

		for (let i = 0; i < files.length; i++) {

			let file = {
				path: path.join(startPath, files[i]),
				name: files[i]
			};
			let stat = fs.lstatSync(file.path);
			if (stat.isDirectory()) {
				this.ReadFilesfromDir(file.path, filter, callback); //recurse
			} else if (filter.test(file.path)) {

				this.cntProcessedFiles++;

				callback(file);
			}
		}
	}

	compileSass(file) {

		let result = { };
		try {
			result = nodeSass.renderSync({
				file: file,
				includePaths: this.options.includePaths,
				outputStyle: this.options.outputStyle
			});
		} catch (err) {
			console.log(chalk.redBright('Couldn\'t compile the given file: ', err.formatted));
		}
		return result.css;
	}

	writeCssToFile(css, filepath, cb) {
		let cssContent = new Buffer(css, 'binary');

		// write the content back to the module
		fs.writeFile(filepath, cssContent, (err) => {
			if (err) {
				// probably missing write permissions
				return cb(false);
			}
			return cb(true);
		});
	}

	injectCSSinStyleModule(moduleFile, css) {

		// If there is no css
		if (!css) {
			return new Promise(function(resolve, reject) {
				reject(null);
			});
		}

		let styleModuleContent = fs.readFileSync(moduleFile, "utf8");

		// if the style_module is empty or the RegEx doesn't exists in the file, return null.
		if (!styleModuleContent || !this.regExp.test(styleModuleContent)) {
			return new Promise(function(resolve, reject) {
				reject(null);
			});
		}
		/**
		 * Re-create the start and end placeholders and inject them back to the style module
		 * This will allow us to re-inject over and over again 
		 */
		const injectCssContent = this.startStyle + "\n/*Content between those comments is autogenerated.*/ \n" + css.toString() + this.endStyle;

		// This is going to replace everything that was between the this.startStyle and this.endStyle
		styleModuleContent = new Buffer(styleModuleContent.replace(this.regExp, injectCssContent), 'binary');

		// write the content back to the module

		return new Promise(function(resolve, reject) {
			fs.writeFile(moduleFile, styleModuleContent, (err) => {
				if (err) {
					reject(false);
				} else {
					resolve(true);
				}
			});
		});
	}

	convertAndInject() {

		this.ReadFilesfromDir(this.options.styleFolder, this.options.extension, (sassfile) => {
			// get the related style-module for the SASS file
			const moduleFile = this.options.moduleFolder + "/" + sassfile.name.replace(this.options.extension, this.moduleExtension);
			const originFile = sassfile.path;

			// only compile and inject if the module exists
			if (fs.existsSync(moduleFile)) {

				// compile the given sass file to css
				let compiledCSS = this.compileSass(sassfile.path);

				postcss([autoprefixer])
					.use(postcssUrl({ url: "rebase" }))
					.process(compiledCSS, { from: originFile, to: moduleFile })
					.then((result) => {

						result.warnings().forEach(function(warn) {
							console.log(warn.toString());
						});

						// console.log(result.css);
						compiledCSS = result.css;

						// write the compiled css to a file if option.cssFolder is given
						if (!this.options.cssFolder) {
							const cssFile = this.options.cssFolder + "/" + sassfile.name.replace(this.options.extension, '.css');

							this.writeCssToFile(compiledCSS, cssFile, (success) => {
								// todo  handle file write errors
							});
						}

						return this.injectCSSinStyleModule(moduleFile, compiledCSS);
					})
					.then((success) => {

						if (success == true) {
							console.log(chalk.green("[SMIPlugin]      Injected " + originFile + "\tinto: \t\t", moduleFile));
						}

						// handle stuff after injection

					}).catch((error) => {
						if (error == null) {
							console.log(chalk.yellow("[SMIPlugin][WAR] Tried to inject to: " + moduleFile + " but no injection comments found!"));
						} else if (error == false) {
							console.log(chalk.redBright("[SMIPlugin][ERR] Couldn't write to file!", moduleFile));
						}
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

	escapeRegExp(s) {
		return s.replace(/[-\/\\^$*+?.()|[\]]/g, '\\$&');
	}
}

module.exports = StyleModuleInjectPlugin;
