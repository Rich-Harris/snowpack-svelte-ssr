*Don't draw any conclusions from the existence of this repo! It's purely a space to explore ideas, and is not indicative of anything in particular regarding Sapper's future.*

---

# Snowpack + Svelte + SSR

This is a not-totally-functional experiment to see what it would take to use [Snowpack](https://www.snowpack.dev/) as a base for [Sapper](https://sapper.svelte.dev).

```bash
# 1. Check out a local dev branch of the Snowpack repo
git clone git@github.com:pikapkg/snowpack
cd snowpack
git checkout wip-ssr
yarn install && yarn build && yarn install --force
cd ../

# 2. Check out this repo (note: must be a sibling directory to "snowpack")
git clone git@github.com:Rich-Harris/snowpack-svelte
cd snowpack-svelte
npm install

# 3. Start the server
npm start
```

Navigate to [localhost:3000](http://localhost:3000). You're looking at a server-rendered page, where the logic for generating the HTML is inside a Svelte component that Snowpack compiles in `ssr` mode. This compiled module is fetched from localhost:3001 (the port specified in [snowpack/server.config.js](snowpack/server.config.js)) along with any dependencies.

This rendering happens in [tasks/dev.js](tasks/dev.js), which creates the server on port 3000. This server proxies any requests that *aren't* for server-rendered pages to a second Snowpack instance running on port 3002 (as specified in [snowpack/client.config.js](snowpack/client.config.js)).

As you navigate around, you'll likely see that the browser refreshes the page completely at first, because the client-side router has failed to start. This is because Snowpack's caching mechanism appears to fail sometimes if two separate instances are compiling the same file with different settings. If you click around a bit more, things seem to settle down somehow, and the client-side navigation starts working. I'm not entirely sure why!


## TODO

There are various things not working:

* ~~The aforementioned problem with SSR modules being served to the client~~
* ~~HMR doesn't seem to work. Haven't investigated why~~
* Can this dev server proxy the HMR WebSocket connection to the Snowpack dev server? If so, we can remove the hardcoded `window.HMR_WEBSOCKET_URL =` line.
* The `dev` task runs a Snowpack instance in the background, but all logging gets squelched. Perhaps there's a JavaScript API we could use instead of shelling out to `snowpack`?
* It would be particularly nice if there were a way to load modules from Snowpack that didn't involve fetching them over HTTP and transforming them
* For now there's only a `dev` task. I haven't yet investigated what the `build` task would look like, though I believe the output of `snowpack build` already makes a very useful input to a set of opinionated 'builders' that would take your Sapper app and turn it into packaged assets + cloud functions for places like Vercel, Netlify and so on.
* In Sapper, CSS is injected into the SSR'd page as `<link>` elements that reflect what's depended on by the current page. Subsequently dynamically imported chunks pull in additional `.css` files as needed. This demo is using a slightly cruder mechanism — I haven't yet explored what it would take to get Sapper's behaviour here.
* I'd like to flesh this demo out a bit more so that it resembles a more fully-fledged Sapper app (with `preload`, layouts, error pages and so on)
