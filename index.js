var JsonDB = require('node-json-db');
var path = require("path");
var _ = require("lodash");
var fs = require("fs");
var Exceptions = require("blacktea.exceptions");
var Templating = require("blacktea.jsonTemplates");
var mkdirp = require("mkdirp");
/**
 * object, where all writtable connections are saved
 * @type {Object}
 */
var connections = {};
/**
 * variable, where all readonly connections are saved (for example package.json, which shouldn't be writtable)
 * @type {Object}
 */
var readonlyConnections = {};

/**
 * the root directory, default is current working directory
 * @type {[type]}
 */
var root = process.cwd();
/**
 * the configuration directory. Default is root.
 * @type {[type]}
 */
var configDir = root;

/**
 * object, containinf gunctions only for use within this file
 * @type {Object}
 */
var privateFunctions = {
	/**
	 * checks, if file exists
	 * @param  {string} filePath the path of the file to check
	 * @return {boolean}          true, if the file exists, false otherwise
	 */
	fileExists: function(filePath) {
		try {
			fs.accessSync(filePath, fs.F_OK);
			return true;
		} catch (ex) {
			return false;
		}
	},
	/**
	 * sets the configuration directory. Before setting the directory, it checks, if the path is valid
	 * @param {mixed} dir a string or array of strings which van be used in path.resolve
	 */
	setConfigurationDirectory: function(dir) {
		var tmpDir;
		if (_.isArray(dir) && dir.length > 0) {
			tmpDir = path.resolve(dir);
		} else if (_.isString(dir)) {
			tmpDir = dir;
		} else {
			throw new Exceptions.InvalidPathException("The path is not valid");
		}
		if (!this.fileExists(tmpDir)) {
			throw new Exceptions.FileNotFoundException("The directory does not exist");
		}
		configDir = tmpDir;
	},
	/**
	 * gets a file path from a configuration string
	 * @param  {string} configPath the configuration path
	 * @return {string}            the file path
	 */
	getFilePathFromConfig: function(configPath) {
		var filePath = path.resolve(configDir, _.trim(configPath, '/\\ ') + '.json');
		return filePath;
	},
	/**
	 * checks if file exists and if not, creates it
	 * @param  {string} filePath the path of the file
	 * @return {void}          
	 */
	createFileIfNotExisting: function(filePath) {
		var dirPath = path.dirname(filePath);
		mkdirp.sync(dirPath);
		fs.writeFileSync(filePath, "{}");
	},
	/**
	 * returns the connection to a configuration file and creates it, if it doesn't already exist.
	 * @param  {string} configPath          the configuration path
	 * @param  {bool} createIfNotExisting if true, creates the file if not existing
	 * @return {object}                     the connection object
	 */
	getConnection: function(configPath, createIfNotExisting) {
		if (!!connections[configPath])
			return connections[configPath];
		var filePath = this.getFilePathFromConfig(configPath);
		var fileFound = false;
		if (!filePath) {
			if (!!createIfNotExisting) {
				this.createFileIfNotExisting(filePath);
				fileFound = true;
			} else {
				throw new Exceptions.FileNotFoundException("Configuration file not found");
			}
		} else {
			fileFound = true;
		}
		if (fileFound) {
			connections[configPath] = new JsonDB(filePath, true, true);
			return connections[configPath];
		}
	},
	/**
	 * formats a json path so it can be used for querying the configuration file
	 * @param  {string} jsonPath the unformatted json path
	 * @return {string}          the formatted json path
	 */
	formatJsonPath: function(jsonPath) {
		if (!jsonPath)
			return "/";
		return "/" + _.trim(jsonPath, "/ ");
	}
}

module.exports = {
	/**
	 * gets a configuration value. Throws an exception if the value doesn't exist
	 * @param  {string} configPath the path of the configuration file (not an absolute file path!)
	 * @param  {string} jsonPath   the path to the value inside of the configuration file
	 * @return {mixed}            the value
	 */
	get: function(configPath, jsonPath) {
		var db = privateFunctions.getConnection(configPath);
		try {
			var result = db.getData(privateFunctions.formatJsonPath(jsonPath));
			return Templating.evaluateObject(result);
		} catch (e) {
			throw new Exceptions.InvalidPathException("The json configuration (" + jsonPath + ") does not exist");
		}
	},
/**
 * gets a configuration value. If the value doesn't exist, it returns the default value
 * @param  {string} configPath the path of the configuration file (not an absolute file path!)
 * @param  {string} jsonPath   the path to the value inside of the configuration file
 * @param  {string} defaultValue the default value to return, if the actual value doesn't exist
 * @return {mixed}              the value, or the default, if the value doesn't exist
 */
	getOrDefault: function(configPath, jsonPath, defaultValue) {
		try {
			return Templating.evaluateObject(this.get(configPath, jsonPath));
		} catch (e) {
			return Templating.evaluateObject(defaultValue);
		}
	},
	/**
	 * sets a configuration value
 	 * @param  {string} configPath the path of the configuration file (not an absolute file path!)
 	 * @param  {string} jsonPath   the path to the value inside of the configuration file
	 * @param {mixed} value      the value to set
	 */
	set: function(configPath, jsonPath, value) {
		var db = privateFunctions.getConnection(configPath, true);
		db.push(privateFunctions.formatJsonPath(jsonPath), value);
	},
	/**
	 * deletes a configuration value
 	 * @param  {string} configPath the path of the configuration file (not an absolute file path!)
 	 * @param  {string} jsonPath   the path to the value inside of the configuration file
	 * @return {void}
	 */
	delete: function(configPath, jsonPath) {
		var db = privateFunctions.getConnection(configPath);
		db.delete(privateFunctions.formatJsonPath(jsonPath));
	},
	//*******object support******************************
	/**
	 * merges a value into an existing configuration
 	 * @param  {string} configPath the path of the configuration file (not an absolute file path!)
 	 * @param  {string} jsonPath   the path to the value inside of the configuration file
	 * @param {mixed} value      the value to merge
	 * @return {void}
	 */
	merge: function(configPath, jsonPath, value) {
		var db = privateFunctions.getConnection(configPath, true);
		db.push(privateFunctions.formatJsonPath(jsonPath), value, false);
	},
	/**
	 * goes through all values and calls a callback with the value, key and the json path of the current iteration.
	 * If value is an array or object, it calls the callback on each member, else it calls the callback on the actual value
 	 * @param  {string} configPath the path of the configuration file (not an absolute file path!)
 	 * @param  {string} jsonPath   the path to the value inside of the configuration file
	 * @param  {Function} callback   the callback: callback(value, key, jsonPath)
	 * @return {void}
	 */
	forEach: function(configPath, jsonPath, callback) {
		//callback(value,key,path)
		var value = this.get(configPath, jsonPath);
		var formattedJsonPath = privateFunctions.formatJsonPath(jsonPath);
		if (_.isArray(value)) {
			_.each(value, function(val, key) {
				callback(val, key, formattedJsonPath + '[' + key + ']');
			});
		} else if (_.isPlainObject(value)) {
			_.each(value, function(val, key) {
				callback(val, key, formattedJsonPath + '/' + key);
			});
		} else {
			callback(value, 0, formattedJsonPath);
		}
	},
	//*******array support*******************************
	/**
	 * appends a value to a configuration array
 	 * @param  {string} configPath the path of the configuration file (not an absolute file path!)
 	 * @param  {string} jsonPath   the path to the value inside of the configuration file
	 * @param  {mixed} value       the value to append
	 * @return {void}
	 */
	append: function(configPath, jsonPath, value) {
		var currentValue = this.get(configPath, jsonPath);
		if (!_.isArray(currentValue))
			this.set(configPath, jsonPath, [currentValue, value]);
		else {
			var formattedJsonPath = privateFunctions.formatJsonPath(jsonPath);
			this.set(configPath, formattedJsonPath + '[]', value);
		}
	},
	/**
	 * prepends a value to a configuration array
 	 * @param  {string} configPath the path of the configuration file (not an absolute file path!)
 	 * @param  {string} jsonPath   the path to the value inside of the configuration file
	 * @param  {mixed} value       the value to append
	 * @return {void}
	 */
	push: function(configPath, jsonPath, value, options) {
		var currentValue = this.get(configPath, jsonPath);
		if (!_.isArray(currentValue))
			this.set(configPath, jsonPath, [value, currentValue]);
		else {
			currentValue.unshift(value);
			this.set(configPath, jsonPath, currentValue);
		}
	},
	/**
	 * removes the first value of a configuration array and returns it
 	 * @param  {string} configPath the path of the configuration file (not an absolute file path!)
 	 * @param  {string} jsonPath   the path to the value inside of the configuration file
	 * @return {mixed}             the removed value
	 */
	shift: function(configPath, jsonPath) {
		var formattedJsonPath = privateFunctions.formatJsonPath(jsonPath) + '[0]';
		var result = this.get(configPath, formattedJsonPath);
		this.delete(configPath, formattedJsonPath);
		return result;
	},
	 /**
	 * removes the last value of a configuration array and returns it
 	 * @param  {string} configPath the path of the configuration file (not an absolute file path!)
 	 * @param  {string} jsonPath   the path to the value inside of the configuration file
	 * @return {mixed}             the removed value
	 */
	pop: function(configPath, jsonPath) {
		var formattedJsonPath = privateFunctions.formatJsonPath(jsonPath) + '[-1]';
		var result = this.get(configPath, formattedJsonPath);
		this.delete(configPath, formattedJsonPath);
		return result;
	},
	/**
	 * empties a configuration array
 	 * @param  {string} configPath the path of the configuration file (not an absolute file path!)
 	 * @param  {string} jsonPath   the path to the value inside of the configuration file
	 * @return {void}
	 */
	clear: function(configPath, jsonPath) {
		var currentValue = this.get(configPath, jsonPath);
		if (!_.isArray(currentValue))
			throw new Exceptions.InvalidArgumentException("configuravion value is not an array");
		else {
			this.set(configPath, jsonPath, []);
		}
	},
	/**
	 * an attempt to read the package.json file. The module searches for the file in the root directory
	 * @param  {string} jsonPath     the configuration path to the value inside the package.json
	 * @param  {mixed} defaultValue the default value to return if the configuration wasn't found
	 * @return {mixed}              the configuration or the default
	 */
	packageJson: function(jsonPath, defaultValue) {
		if (!readonlyConnections["package.json"]) {
			var configPath = path.resolve(root, "package.json");
			if (!privateFunctions.fileExists(configPath))
				return {};
			readonlyConnections["package.json"] = new JsonDB(configPath, true, true);
		}
		try {
			return Templating.evaluateObject(readonlyConnections["package.json"].getData(privateFunctions.formatJsonPath(jsonPath)));
		} catch (e) {
			//throw new Exceptions.InvalidPathException("The json configuration ("+jsonPath+") does not exist");
			return defaultValue;
		}
	}
};

//****************injecting config into Templating***********************
var config = {
	get: function(configPath, jsonPath) {
		return module.exports.get(configPath, jsonPath);
	},
	getOrDefault: function(configPath, jsonPath, defaultObj) {
		return module.exports.getOrDefault(configPath, jsonPath, defaultObj);
	},
	shift: function(configPath, jsonPath) {
		return module.exports.shift(configPath, jsonPath);
	},
	pop: function(configPath, jsonPath) {
		return module.exports.pop(configPath, jsonPath);
	},
	packageJson: function(jsonPath) {
		return module.exports.packageJson(jsonPath);
	}
}
Templating.add("config", config);
//***********************************************************************
//******getting the config path from config.json, if the option exists***
var tmpDir = module.exports.packageJson("configurationDirectory");
if (!!tmpDir && privateFunctions.fileExists(tmpDir)) {
	configDir = tmpDir;
}
//***********************************************************************