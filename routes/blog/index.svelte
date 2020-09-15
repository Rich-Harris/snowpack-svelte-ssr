<script>
	import Nav from '@shared/components/Nav.svelte';
</script>

<Nav path="/blog"/>

<h1>blog</h1>

<ul>
	<li><a href="/blog/first-post">first post</a></li>
	<li><a href="/blog/second-post">second post</a></li>
	<li><a href="/blog/third-post">third post</a></li>
</ul>

<style>
	ul {
		padding: 0;
		margin: 0;
	}

	li {
		list-style: none;
	}

	a {
		display: block;
		padding: 0.5em 0;
		border-bottom: 1px solid #999;
	}
</style>