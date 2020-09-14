const http = require('http');
const fs = require('fs');
const child_process = require('child_process');
const http_proxy = require('http-proxy');
const SnowpackLoader = require('./SnowpackLoader');

// run two Snowpack servers — one for the server app, one for the client app
const config_file_server = 'snowpack/server.config.json';
const config_file_client = 'snowpack/client.config.json';

const config_server = JSON.parse(fs.readFileSync(config_file_server, 'utf-8'));
const config_client = JSON.parse(fs.readFileSync(config_file_client, 'utf-8'));

const snowpack = 'node_modules/.bin/snowpack';
child_process.spawn(snowpack, ['dev', `--config=${config_file_server}`, '--reload']);
child_process.spawn(snowpack, ['dev', `--config=${config_file_client}`, '--reload']);

// proxy requests for assets (i.e. not page requests, which are SSR'd)
// to the 'client' snowpack server
const proxy = http_proxy.createProxyServer();

// create a loader that will request files from the 'server' snowpack
// server, transform them, and evaluate them
const loader = new SnowpackLoader();

const server = http.createServer(async (req, res) => {
	if (req.url === '/' && req.headers.upgrade !== 'websocket') { // TODO routing
		const mod = await loader.load(`http://localhost:${config_server.devOptions.port}/App.js`);
		const { html, css, head } = mod.default.render();

		const template = fs.readFileSync('src/index.html', 'utf-8');

		const rendered = template
			.replace('</head>', `<style>${css.code}</style>${head}`)
			.replace(/<body[^>]*>/, m => `${m}${html}`);

		res.setHeader('Content-Type', 'text/html');
		res.end(rendered);

		return;
	}

	proxy.web(req, res, {
		target: `http://localhost:${config_client.devOptions.port}`
	});
});

server.listen(3000);