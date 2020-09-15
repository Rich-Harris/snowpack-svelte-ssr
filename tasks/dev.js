const http = require('http');
const fs = require('fs');
const path = require('path');
const child_process = require('child_process');
const http_proxy = require('http-proxy');
const chokidar = require('chokidar');
const glob = require('tiny-glob/sync');
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

// create and update a route manifest. this is a super basic version
// of what Sapper does
const watcher = chokidar.watch('routes', { ignoreInitial: true });

let manifest;

const update_manifest = () => {
	const files = glob('**/*.svelte', { cwd: 'routes' });
	manifest = files
		.filter(file => file.split('/').every(part => !part.startsWith('_')))
		.map(file => {
			const segments = file.split('/');
			const last = segments.pop();

			if (last.startsWith('index.')) {
				segments[segments.length - 1] += last.slice(5, -7);
			} else {
				segments.push(last.slice(0, -7));
			}

			const params = [];
			const pattern_string = segments.join('/').replace(/\[([^\]]+)\]/g, (m, name) => {
				params.push(name);
				return '([^/]+)';
			});

			return {
				file,
				pattern: new RegExp(`^/${pattern_string}${segments.length ? '/?' : ''}$`), // TODO query string
				params
			};
		});

	const client_routes = manifest.map(r => {
		const load = `() => import('/_routes/${r.file.replace('.svelte', '.js')}')`; // TODO why do we need to replace the extension?
		return `{ pattern: ${r.pattern}, params: ${JSON.stringify(r.params)}, load: ${load} }`;
	});

	fs.writeFileSync('sapper/routes.js', `export default [\n\t${client_routes.join(',\n\t')}\n];`);
};

watcher.on('add', update_manifest);
watcher.on('unlink', update_manifest);
update_manifest();

// this is our version of a shell index.html file
const template = ({ html, head, css }) => `<!DOCTYPE html>
<html lang="en">
	<head>
		<meta charset="utf-8" />
		<link rel="icon" href="/favicon.ico" />
		<meta name="viewport" content="width=device-width, initial-scale=1" />
		${head}
		<link rel="stylesheet" href="/global.css">
		<style>${css.code}</style>
	</head>
	<body>
		${html}
		<script type="module" src="/_sapper/runtime.js"></script>
	</body>
</html>`;

http.createServer(async (req, res) => {
	const route = manifest.find(r => r.pattern.test(req.url));

	// if this is an SSR request (URL matches one of the routes),
	// load the module in question and render the page...
	if (route && req.headers.upgrade !== 'websocket') {
		const mod = await loader.load(`http://localhost:${config_server.devOptions.port}/_routes/${route.file.replace('.svelte', '.js')}`);

		const match = route.pattern.exec(req.url);
		const props = {};
		route.params.forEach((name, i) => {
			props[name] = match[i + 1];
		});
		const rendered = template(mod.default.render(props));

		res.setHeader('Content-Type', 'text/html');
		res.end(rendered);

		return;
	}

	// ...otherwise defer to Snowpack
	proxy.web(req, res, {
		target: `http://localhost:${config_client.devOptions.port}`
	});
}).listen(3000);