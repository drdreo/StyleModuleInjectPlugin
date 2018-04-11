# StyleModuleInjectPlugin
A Webpack plugin or standalone class to convert sass to css and inject it into a polymer style module.

First things first: A big thanks to [superjose](https://github.com/superjose) and his https://github.com/superjose/polymer-sass project that achieves the same thing with gulp and has shown me the way.

Motivation: I needed a plugin for webpack or even a standalone tool that takes a SASS file or any needed stylesheet, compiles it to CSS and injects it into existing style_modules which i use with polymer and webcomponents. Additionally someone probably doesn't want to write all the styles in sass, therefore the plugin does not overwrite existing styles in the module, but only injects the sass styles 1:1 as css between the inject comments.

Right now the use is satisfying for the project so i can write SASS and still use style modules to style my webcomponents. If there is need for more languages or different outputs, i can look into improving this hacky project which i coded in about an hour.
Feel free to take it, use it, destroy it, fix it, just a star would be nice.  I don't guarantee that it works in prodcution use (although i do use it), so keep in mind this should only be used with attention and check the source code twice. 

## :briefcase: Workflow
1. The plugin gets passed a folder and an extension to look for at creation.(Due to i hate regex, the implementation for looking into any files, not only .scss, is not yet included.)
1. It checks every file inside that directory and its subdirectories for files with the given extension. 
1. Then validates if a .html file (style module) with the same name is given. If not, nothing happens.
1. If a style module file exists and it contains the inject comment, it converts the found .scss file and injects the new data into the style module between two specific comments which the user has to add. Have a look at the Style Module section.

## :computer: Usage
#### Requirements
*"node-sass": "^4.8.3"*
		
Currently there are two ways to use this plugin:
* Webpack plugin
* Standalone
### :package: Webpack
"webpack": "^3.11.0"

```javascript
const StyleModuleInjectPlugin = require('./StyleModuleInjectPlugin');
...
plugins: [
  ...
	new StyleModuleInjectPlugin({ folder: './src/webcomponents/style-modules', extension: /\.scss$/ }),
]
``` 
That's it. You add the plugin inside the plugins array, pass a folder, an extension and the plugin will convert and inject the sass at the webpack ["run"-hook](https://webpack.js.org/api/compiler-hooks/#run).

### :guardsman: Standalone
```javascript
/*inside sassloader.js*/
const StyleModuleInjectPlugin = require('./StyleModuleInjectPlugin');
let plugin = new StyleModuleInjectPlugin({ folder: './style-modules', extension: /\.scss$/ });
plugin.convertAndInject();
``` 
I used this with a npm command "npm run convert-sass" like:
```json
"scripts": {
    "convert-sass": "node sassloader.js"
  }
```
This allowed me to hook into the build process when i needed it, but avoid the overhead webpack brings with it. 

### :star2: Style Module
An example style module which includes another style module(not needed) with the inject comments:
```html
<!--inside box-styles.html -->
<link rel="import" href="common-styles.html">
<link rel="import" href="../../../bower_components/polymer/lib/elements/custom-style.html">

<dom-module id="box-styles">
	<template>
		<style include="common-styles">
			/*inject_start{scss}*/	
			/*inject_end{scss}*/
		</style>
	</template>
</dom-module>
```
The plugin looks for scss files inside the given folder. Then checks if there is a same named .html file on the same directory level. Additionally it checks if the .html file contains those inject comments. Here it would look for: box-styles.html next to box-styles.scss.
