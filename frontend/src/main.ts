import './app.css';
import App from './App.svelte';

// Svelte 5 usa mount en lugar de new App
import { mount } from 'svelte';

mount(App, {
  target: document.getElementById('app')!,
});

export default App;
