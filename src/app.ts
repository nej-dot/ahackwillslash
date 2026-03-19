export function createApp(): HTMLElement {
  const shell = document.createElement("main");
  shell.className = "app-shell";
  shell.innerHTML = `
    <section class="hero">
      <p class="eyebrow">New project</p>
      <h1>ahackwillslash</h1>
      <p class="lede">
        A clean starter project running on Bun, Vite, and TypeScript.
      </p>
    </section>
    <section class="card-grid">
      <article class="card">
        <h2>Develop</h2>
        <p>Run <code>bun install</code> and <code>bun run dev</code>.</p>
      </article>
      <article class="card">
        <h2>Build</h2>
        <p>Create a production bundle with <code>bun run build</code>.</p>
      </article>
      <article class="card">
        <h2>Ship</h2>
        <p>Publish or deploy from this repo whenever you are ready.</p>
      </article>
    </section>
  `;

  return shell;
}
