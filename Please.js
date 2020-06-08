/* eslint-disable promise/avoid-new */
/* eslint-disable no-underscore-dangle */
const _ = require('lodash');
const querystring = require('querystring');

const NetworkOfflineError = require('@titanium/errors/NetworkOffline');
const UnauthorizedError = require('@titanium/errors/Unauthorized');

// DEBUG: process.env.DEBUG_MODE
console.debug(`🦠  [Please] process.env.DEBUG_MODE: ${process.env.DEBUG_MODE}`);

let debug = () => {};
if ((process.env.DEBUG_MODE === 'true') || (process.env.DEBUG_MODE === true)) {
	console.debug('📌  you are here → DEBUG_MODE === true');
	debug = (...args) => {
		console.debug(...args);
	};
}

let http;
let https;
if (typeof Titanium === 'undefined') {
	http = require('http');
	https = require('https');
}

class Please {
	constructor({
		headers = {},
		baseUrl = '',
		url = '',
		params = {},
		body,
		etag,
		credentials,
		timeout,
		form,
		json,
		bearer,
		auth,
		data,
		file,
		responseType,
		debug_mode = false,
		authType, // swagger?
	} = {}) {
		debug('📌  you are here → please.constructor()');
		this.config = {};
		this.config.headers = Object.assign({}, headers);
		this.config.body = body;
		this.config.url = url;
		this.config.baseUrl = baseUrl;
		this.config.etag = etag;
		this.config.params = params;
		this.config.credentials = credentials;
		this.config.timeout = timeout;
		this.config.form = form;
		this.config.json = json;
		this.config.bearer = bearer;
		this.config.auth = auth;
		this.config.authType = authType;
		this.config.data = data;
		this.config.responseType = (responseType || 'json').toLowerCase();
		this.config.DEBUG_MODE = debug_mode;

		if (!_.isNil(file)) {
			this.config.file = file;
			this.config.responseType = 'file';
		}


		if (responseType === 'json') {
			this.header('Content-Type', 'application/json');
		} else if (responseType === 'xml') {
			this.header('Content-Type', 'application/xml');
		}

		this.__config = _.cloneDeep(this.config);
	}

	// TODO: add config function

	headers(args = {}) {
		debug('📌  you are here → please.headers()');
		Object.assign(this.config.headers, args);
		return this;
	}

	params(args = {}) {
		debug('📌  you are here → please.params()');
		Object.keys(args).forEach(key => (args[key] == null) && delete args[key]);
		Object.assign(this.config.params, args);
		return this;
	}

	body(args) {
		this.config.body = args;
		return this;
	}

	credentials(args) {
		this.config.credentials = args;
		return this;
	}

	auth(args) {
		this.config.auth = args;
		return this;
	}

	timeout(args) {
		debug('📌  you are here → please.timeout()');
		this.config.timeout = args;
		return this;
	}

	baseUrl(args) {
		debug('📌  you are here → please.baseUrl()');
		this.config.baseUrl = args;
		return this;
	}

	url(args) {
		debug('📌  you are here → please.url()');
		this.config.url = args;
		return this;
	}

	form(args) {
		debug('📌  you are here → please.form()');
		this.config.form = args;
		this.config.method = 'POST';
		this.contentType('application/x-www-form-urlencoded');
		return this;
	}

	json(args) {
		debug('📌  you are here → please.json()');
		if (typeof args === 'object') {
			this.config.body = JSON.stringify(args);
		} else {
			this.config.body = args;
		}
		this.config.method = 'POST';
		this.contentType('application/json');
		return this;
	}

	contentType(value) {
		debug('📌  you are here → please.contentType()');
		this.header('Content-Type', value);
		return this;
	}

	responseType(value = 'json') {
		debug('📌  you are here → please.responseType()');
		this.responseType = value.toLowerCase();
		switch (this.responseType) {
			case 'json':
				this.header('Content-Type', 'application/json');
				break;
			case 'xml':
				this.header('Content-Type', 'application/xml');
				break;

			default:
				break;
		}
		return this;
	}

	header(name, value) {
		debug('📌  you are here → please.header()');
		this.config.headers[name] = value;
		return this;
	}

	bearer(token) {
		debug('📌  you are here → please.header()');
		if (_.isNil(token)) {
			delete this.config.headers['authorization'];
		}

		return this;
	}

	file(value) {
		debug('📌  you are here → please.file()');
		this.config.file = value;
		this.config.responseType = 'file';
		return this;
	}

	debug(value) {
		this.config.DEBUG_MODE = !!value;
		debug(`📌  you are here → please.debug(${this.config.DEBUG_MODE})`);
		return this;
	}

	post(args) {
		debug('📌  you are here → please.post()');
		if (args) {
			this.config.url = args;
		}
		this.config.method = 'POST';

		return this.request();
	}

	put(args) {
		debug('📌  you are here → please.put()');
		if (args) {
			this.config.url = args;
		}
		this.config.method = 'PUT';

		return this.request();
	}

	get(args) {
		debug('📌  you are here → please.get()');
		this.config.method = 'GET';
		if (args) {
			this.config.url = args;
		}

		return this.request();
	}

	delete(args) {
		debug('📌  you are here → please.delete()');
		this.config.method = 'DELETE';
		if (args) {
			this.config.url = args;
		}

		return this.request();
	}

	toJSON() {
		return _.omit(this, [ 'config.auth', 'config.credentials' ]);
	}

	clone() {
		debug('📌  you are here → please.clone()');
		return new Please(_.cloneDeep(this.config));
	}

	reset() {
		debug('📌  you are here → please.reset()');
		this.config = _.cloneDeep(this.__config);
	}

	//  async request(args) {
	request(args) {
		debug('📌  you are here → please.request()');
		return new Promise((resolve, reject) => {
			try {
				const { config } = this;
				let urlPath;
				_.defaults(this.config, {
					baseUrl: '',
					url:     '',
					timeout: 2000,
					method:  'GET',
				});
				if (this.config.url.toLowerCase().startsWith('http')) {
					// eslint-disable-next-line prefer-destructuring
					urlPath = this.config.url;
				} else if (this.config.baseUrl.toLowerCase().startsWith('http')) {
					urlPath = this.config.baseUrl + this.config.url;
				} else {
					console.error(`🛑  unknown url: ${this.config.url}`);

					// DEBUG: baseUrl
					debug(`🦠  baseUrl: ${JSON.stringify(this.config.baseUrl, null, 2)}`);

					return reject(new Error(`unknown url: ${this.config.url}`));
				}

				const url = new URL(urlPath);
				if (this.config.params) {
					_.forEach(_.keys(this.config.params), key => {
						if (typeof this.config.params[key] !== 'undefined') {
							if (typeof this.config.params[key] === 'object') {
								url.searchParams.set(key, JSON.stringify(this.config.params[key]));
							} else {
								url.searchParams.set(key, this.config.params[key]);
							}
						}
					});
					urlPath = url.toString();

					debug(`🦠  Please.urlPath: ${JSON.stringify(urlPath, null, 2)}`);
				}

				const bearer = _.isFunction(this.config.bearer) ? this.config.bearer() : this.config.bearer;

				if (!_.isNil(bearer)) {
					this.header('Authorization', `Bearer ${bearer}`);
				}

				if (this.config.DEBUG_MODE) {
					// debug(`🦠  please: ${JSON.stringify(this, null, 2)}`);
				}

				if (this.config.credentials) {
					this.config.auth = `${this.config.credentials.username}:${this.config.credentials.password}`;
				}

				if (typeof Titanium === 'undefined') {
					const req = https.request(
						urlPath,
						{
							// headers: this.config.headers,
							method:  this.config.method,
							headers: this.config.headers,
							auth:    this.config.auth,
						},
						resp => {
							let data = '';

							// A chunk of data has been received.
							resp.on('data', chunk => {
								data += chunk;
							});

							// The whole response has been received. Print out the result.
							resp.on('end', () => {
								debug('📌  you are here → Please.onEnd');

								// DEBUG: Please.onEnd.response
								debug(`🦠  Please.onEnd.response: ${JSON.stringify(data, null, 2)}`);


								if (resp.statusCode === 401) {
									return reject(new UnauthorizedError());
								}

								const result = {
									statusCode:    resp.statusCode,
									statusMessage: resp.statusMessage,
									body:          data,
									headers:       resp.headers,
								};

								if (config.responseType === 'json') {
									try {
										result.json = JSON.parse(data);
									} catch (error) {
										console.error('🛑  Please.onEnd.parse: Error parsing JSON response.');
										console.warn(`error: ${JSON.stringify(error, null, 2)}`);
									}
								}

								if (this.config.DEBUG_MODE) {
								// DEBUG: result
									debug(`🦠  Please.request.result: ${JSON.stringify(result, null, 2)}`);
								}

								return resolve(result);
							});

						},
					);

					// console.error(`req: ${JSON.stringify(req, null, 2)}`);

					req.on('error', error => {
						console.error('🛑  Please.onError: Error during request');
						console.error(error);
						console.warn(`🛑  error: ${JSON.stringify(error, null, 2)}`);
						console.error(`🛑  Error: ${error.message}`);
					});

					if (this.config.body) {
						req.write(this.config.body);
					} else 	if (this.config.form) {
						req.write(querystring.stringify(this.config.form));
					}
					req.end();
				} else {
					const that = this;
					const xhr = Ti.Network.createHTTPClient();
					xhr.open(this.config.method, urlPath);

					if (! _.isNil(this.config.file)) {
						xhr.file = this.config.file;
					}
					xhr.timeout = this.config.timeout;

					Object.keys(this.config.headers).forEach(header => {
						xhr.setRequestHeader(header, this.config.headers[header]);
					});

					if (this.config.credentials) {
						xhr.username = this.config.credentials.username;
						xhr.password = this.config.credentials.password;
						xhr.domain = this.config.credentials.domain;
					}

					xhr.onload = function (response) {
						debug('📌  you are here → please.xhr.onload()');

						const result = {
							statusCode:    this.status,
							statusMessage: this.statusText,
							body:          this.responseText,
							headers:       this.responseHeaders,
						};

						if (config.responseType === 'json') {
							try {
								result.json = JSON.parse(this.responseText);
							} catch (err) {
								console.error('🛑  Please.xhr.onload.parse: Error parsing JSON response.');
								console.warn(`err: ${JSON.stringify(err, null, 2)}`);
								if (that.config.DEBUG_MODE) {
									debug(`🦠  xhr.responseText: ${JSON.stringify(this.responseText, null, 2)}`);
								}
							}
						}

						if (that.config.DEBUG_MODE) {
							// DEBUG: result
							debug(`🦠  Please.request.result: ${JSON.stringify(result, null, 2)}`);
						}

						return resolve(result);
					};

					xhr.onerror = function (response) {
						debug('📌  you are here → please.xhr.onerror()');
						try {
							response.json = JSON.parse(this.responseText);
						} catch (error) {
							debug('🛑  Please.xhr.onload.parse: Error parsing JSON response.');
							console.error(`error: ${JSON.stringify(error, null, 2)}`);
							if (that.config.DEBUG_MODE) {
								debug(`🦠  xhr.responseText: ${this.responseText}`);
							}
						}

						// An SSL error has occurred and a secure connection to the server cannot be made.

						if (response.code === 401) {
							return reject(new UnauthorizedError());
						}

						debug(`🛑  please.xhr.onerror.response:`);
						debug(response);
						// return reject(new Error({ message: 'Error Occurred', statusCode: response.code, source: response.source }));
						const error_message = _.get(response, 'json.error_description') || _.get(response, 'json.error') || 'Error Occurred';
						return reject(new Error(error_message, _.get(response, 'source.url')));
					};

					xhr.send(this.config.body);
				}

				return null;
			} catch (error) {
				debug('📌  you are here → please.request.catch()');
				console.error(`error: ${JSON.stringify(error, null, 2)}`);

				if (error.message && error.message === 'The Internet connection appears to be offline.') {
					return reject(new NetworkOfflineError());
				}

				return reject(error);
			}
		})
			.finally(() => {
				this.reset();
			});
	}
}

module.exports = Please;
