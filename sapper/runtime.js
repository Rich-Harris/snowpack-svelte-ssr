import routes from '/_sapper/routes';

let component;

const select_route = pathname => routes.find(r => r.pattern.test(pathname));

async function load_page(route) {
	const match = route.pattern.exec(location.pathname);
	const page = await route.load();

	const props = {};
	route.params.forEach((name, i) => {
		props[name] = match[i + 1];
	});

	return { page, props };
}

async function start() {
	const route = select_route(window.location.pathname);

	if (route) {
		const { page, props } = await load_page(route);

		// TODO handle preload

		// This often doesn't work, because Snowpack's caching mechanism
		// gets the SSR and DOM modules mixed up
		component = new page.default({
			target: document.body,
			hydrate: true,
			props
		});
	}

	// TODO make this less extremely crude
	document.addEventListener('click', async e => {
		let node = e.target;

		while (node) {
			if (node.tagName === 'A') {
				const route = select_route(new URL(node.href).pathname);

				if (route) {
					e.preventDefault();

					history.pushState({}, null, node.href);

					const { page, props } = await load_page(route);

					component.$destroy();
					component = new page.default({
						target: document.body,
						props
					});
				}

				return;
			}

			node = node.parentNode;
		}
	});

	window.addEventListener('popstate', async () => {
		const route = select_route(window.location.pathname);

		if (route) {
			const { page, props } = await load_page(route);

			component.$destroy();
			component = new page.default({
				target: document.body,
				props
			});
		}
	});
}

start();

if (import.meta.hot) {
	import.meta.hot.accept();
	import.meta.hot.dispose(() => {
		component.$destroy();
	});
}