"use strict";

/**
 * Author: Andreas K. Hahn - https://github.com/drdreo
 * Repository: https://github.com/drdreo/StyleModuleInjectPlugin
 * A big thanks to Jose A. who created a similar task for gulp.
 * He explained it in detail at stackoverflow: https://stackoverflow.com/a/37666406/6699493
 *
 * Description: A Webpack plugin or standalone class to convert sass to css and inject it into a polymer style module.
 * Usage:
 *  let plugin = new StyleModuleInjectPlugin({ options });
		plugin.convertAndInject();

		available options: {
					styleFolder: './scss', 					directory that the plugin should check for styles										
					moduleFolder: './style-modules',			directory that the plugin should check for modules
					extension: /\.scss$/,					file extension to look for
					includePaths: ["src/webcomponents/style-modules"], 	https://www.npmjs.com/package/node-sass#includepaths
					outputStyle: 'nested', 					https://www.npmjs.com/package/node-sass#outputstyle
					cssFolder: './css',					directory where compiled css files will be written to
					webpackHook: 'run' 					https://webpack.js.org/api/compiler-hooks/
					startComment: "/*inject_start{scss}<star>/",		defines the start point of injection
					endComment: "/*inject_end{scss}<star>/"			defines the end point of injection
			 	  }
 */
const fs = require('fs');
const path = require('path');
const nodeSass = require('node-sass');

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

		this.startStyle = this.options.startComment || "/*inject_start{scss}*/";
		this.endStyle = this.options.endComment || "/*inject_end{scss}*/";

		//This will match anything between the Start and End Style, so we can reinject and overwrite again and again.
		this.regExp = new RegExp(this.escapeRegExp(this.startStyle) + "[\\s\\S]*" + this.escapeRegExp(this.endStyle), "g");
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
				callback(file);
			}
		};
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
			console.log('Couldn\'t compile the given file: ', err.formatted);
		}
		return result.css;
	}

	writeCssToFile(css,filepath, cb) {
		let cssContent = new Buffer(css, 'binary');

		// write the content back to the module
		fs.writeFile(filepath, cssContent, (err) => {
			if (err) {
				return cb(false);
			}
			return cb(true);
		});
	}

	injectCSSinStyleModule(moduleFile, css, cb) {

		// If there is no css
		if (!css) {
			return cb(null);
		}

		let styleModuleContent = fs.readFileSync(moduleFile, "utf8");

		// if the style_module is empty or the RegEx doesn't exists in the file, return null.
		if (!styleModuleContent || !this.regExp.test(styleModuleContent)) {
			return cb(null);
		}
		/**
		 * Re-create the start and end placeholders and inject them back to the style module
		 * This will allow us to re-inject over and over again 
		 */
		const injectCssContent = this.startStyle + "\n/*Content between those comments is autogenerated.*/ " + css.toString() + this.endStyle;

		// This is going to replace everything that was between the this.startStyle and this.endStyle
		styleModuleContent = new Buffer(styleModuleContent.replace(this.regExp, injectCssContent), 'binary');

		// write the content back to the module
		fs.writeFile(moduleFile, styleModuleContent, (err) => {
			if (err) {
				return cb(false);
			}
			return cb(true);
		});
	}

	convertAndInject() {
		this.ReadFilesfromDir(this.options.styleFolder, this.options.extension, (sassfile) => {
			// get the related style-module for the SASS file
			const moduleFile = this.options.moduleFolder + "/" + sassfile.name.replace(this.options.extension, '.html');

			console.log("Module file:", moduleFile);
			// only compile and inject if the module exists
			if (fs.existsSync(moduleFile)) {

				// TODO : SCSS Lint 

				// compile the given sass file to css
				let compiledCSS = this.compileSass(sassfile.path);

				// write the compiled css to a file if option.cssFolder is given
				if (!this.options.cssFolder) {
					const cssFile = this.options.cssFolder + "/" + sassfile.name.replace(this.options.extension, '.css');

					this.writeCssToFile(compiledCSS,cssFile,(success) => {
						
					});
				}

				// TODO  -> PostCSS / Autoprefixer

				this.injectCSSinStyleModule(moduleFile, compiledCSS, (success) => {
					if (success == null) {
						console.log("[WAR] Tried to inject to: " + moduleFile + " but no injection comments found!");
					} else {
						console.log(success + " " + moduleFile);
					}
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

	escapeRegExp(s) {
		return s.replace(/[-\/\\^$*+?.()|[\]]/g, '\\$&');
	}
}

module.exports = StyleModuleInjectPlugin;
