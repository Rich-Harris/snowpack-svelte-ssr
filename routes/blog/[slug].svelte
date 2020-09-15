<script>
	import Nav from '@shared/components/Nav.svelte';

	export let slug;
</script>

<Nav path="/blog"/>

<h1>{slug}</h1>
<p>if this were a more fleshed-out example, this component would export a `preload` method that turned `slug` into some data</p>