/* eslint-disable promise/avoid-new */
/* eslint-disable no-underscore-dangle */
const _ = require('lodash');
const NetworkOfflineError = require('@titanium/errors/NetworkOffline');
const UnauthorizedError = require('@titanium/errors/Unauthorized');

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
		responseType,
		authType, // swagger?
	}) {
		console.debug('📌  you are here → please.constructor()');
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
		this.config.responseType = responseType || 'json';
	}

	// TODO: add config function

	headers(args = {}) {
		console.debug('📌  you are here → please.headers()');
		Object.assign(this.config.headers, args);
		return this;
	}

	params(args = {}) {
		console.debug('📌  you are here → please.params()');
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

	timeout(args) {
		console.debug('📌  you are here → please.timeout()');
		this.config.timeout = args;
		return this;
	}

	baseUrl(args) {
		console.debug('📌  you are here → please.baseUrl()');
		this.config.baseUrl = args;
		return this;
	}

	url(args) {
		console.debug('📌  you are here → please.url()');
		this.config.url = args;
		return this;
	}

	form(args) {
		console.debug('📌  you are here → please.form()');
		this.config.form = args;
		this.config.method = 'POST';
		// this.contentType('application/x-www-form-urlencoded');
		return this;
	}

	json(args) {
		console.debug('📌  you are here → please.json()');
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
		console.debug('📌  you are here → please.contentType()');
		this.header('Content-Type', value);
		return this;
	}

	responseType(value = 'json') {
		console.debug('📌  you are here → please.responseType()');
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
		console.debug('📌  you are here → please.header()');
		this.config.headers[name] = value;
		return this;
	}

	post(args) {
		console.debug('📌  you are here → please.post()');
		if (args) {
			this.config.url = args;
		}
		this.config.method = 'POST';

		return this.request();
	}

	get(args) {
		console.debug('📌  you are here → please.get()');
		this.config.method = 'GET';
		if (args) {
			this.config.url = args;
		}

		return this.request();
	}

	create() {
		console.debug('📌  you are here → please.get()');
		return new Please(_.cloneDeep(this.config));
	}

	//  async request(args) {
	request(args) {
		console.debug('📌  you are here → please.request()');
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
					console.debug(`🦠  baseUrl: ${JSON.stringify(this.config.baseUrl, null, 2)}`);
					return reject(new Error(`unknown url: ${this.config.url}`));
				}

				const url = new URL(urlPath);
				if (this.config.params) {
					_.forEach(_.keys(this.config.params), key => {
						url.searchParams.set(key, this.config.params[key]);
					});
					urlPath = url.toString();
					// DEBUG: urlPath
					console.debug(`🦠  urlPath: ${JSON.stringify(urlPath, null, 2)}`);
				}

				const bearer = _.isFunction(this.config.bearer) ? this.config.bearer() : this.config.bearer;

				bearer && this.header('Authorization', `Bearer ${bearer}`);


				if (typeof Titanium === 'undefined') {
					const req = https.request(
						urlPath,
						{
							// headers: this.config.headers,
							method:  this.config.method,
							headers: this.config.headers,
						},
						resp => {
							let data = '';

							// A chunk of data has been received.
							resp.on('data', chunk => {
								data += chunk;
							});

							// The whole response has been received. Print out the result.
							resp.on('end', () => {
								console.debug('📌  you are here → Please.onEnd');
								// DEBUG: Please.onEnd.response
								console.debug(`🦠  Please.onEnd.response: ${JSON.stringify(data, null, 2)}`);


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
									} catch (err) {
										console.error('🛑  Please.onEnd.parse: Error parsing JSON response.');
										console.warn(`err: ${JSON.stringify(err, null, 2)}`);
									}
								}
								// DEBUG: result
								console.debug(`🦠  result: ${JSON.stringify(result, null, 2)}`);
								return resolve(result);
							});

							// });
						},
					);

					// console.error(`req: ${JSON.stringify(req, null, 2)}`);

					req.on('error', error => {
						console.error('🛑  Please.onError: Error during request');
						console.error(error);
						console.warn(`error: ${JSON.stringify(error, null, 2)}`);
						console.error(`Error: ${error.message}`);
					});

					if (this.config.body) {
						req.write(this.config.body);
					}
					req.end();
				} else {
					const xhr = Ti.Network.createHTTPClient();
					xhr.open(this.config.method, urlPath);

					xhr.timeout = this.config.timeout;

					Object.keys(this.config.headers).forEach(header => {
						xhr.setRequestHeader(header, this.config.headers[header]);
					});

					xhr.onload = function (response) {
						console.debug('📌  you are here → please.xhr.onload()');
						// console.debug(`please.xhr.onload.response: ${JSON.stringify(response, null, 2)}`);

						const result = {
							statusCode:    this.status,
							statusMessage: this.statusText,
							body:          this.responseText,
							headers:       this.responseHeaders,
						};

						// console.debug(`Please.xhr.onload.response.result: ${JSON.stringify(result, null, 2)}`);

						// console.debug(`config.responseType: ${JSON.stringify(config.responseType, null, 2)}`);
						if (config.responseType === 'json') {
							try {
								result.json = JSON.parse(this.responseText);
							} catch (err) {
								console.error('🛑  Please.xhr.onload.parse: Error parsing JSON response.');
								console.warn(`err: ${JSON.stringify(err, null, 2)}`);
							}
						}

						return resolve(result);
					};

					xhr.onerror = function (response) {
						console.debug('📌  you are here → please.xhr.onerror()');
						try {
							response.json = JSON.parse(this.responseText);
						} catch (error) {
							console.error('🛑  Please.xhr.onload.parse: Error parsing JSON response.');
							console.error(`error: ${JSON.stringify(error, null, 2)}`);
						}

						// An SSL error has occurred and a secure connection to the server cannot be made.

						if (response.code === 401) {
							return reject(new UnauthorizedError());
						}

						console.error(`🛑  please.xhr.onerror.response: ${JSON.stringify(response, null, 2)}`);

						return reject(new Error({ message: 'Error Occurred', statusCode: response.code, source: response.source }));
					};

					xhr.send(this.config.body);
				}

				return null;
			} catch (error) {
				console.debug('📌  you are here → please.request.catch()');
				console.error(`error: ${JSON.stringify(error, null, 2)}`);

				if (error.message && error.message === 'The Internet connection appears to be offline.') {
					return reject(new NetworkOfflineError());
				}

				return reject(error);
			}
		});
	}
}

module.exports = Please;
