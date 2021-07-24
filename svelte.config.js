// @ts-check
import preprocess from 'svelte-preprocess';

/** @type {import('@sveltejs/kit').Config} */
const config = {
  preprocess: preprocess(),

  kit: {
    target: '#svelte',

    package: {
      emitTypes: true,
      exports: {
        exclude: ['./src/lib/Resizers.svelte'],
      },
    },
  },
};

export default config;
