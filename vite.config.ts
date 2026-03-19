import { defineConfig } from "vite";

function normalizeBasePath(basePath?: string): string {
  if (!basePath || basePath === "/") {
    return "/";
  }

  return `/${basePath.replace(/^\/+|\/+$/g, "")}/`;
}

function resolveBasePath(): string {
  if (process.env.BASE_PATH) {
    return normalizeBasePath(process.env.BASE_PATH);
  }

  if (process.env.GITHUB_ACTIONS === "true") {
    const repositoryName = process.env.GITHUB_REPOSITORY?.split("/")[1];

    if (repositoryName && !repositoryName.endsWith(".github.io")) {
      return normalizeBasePath(repositoryName);
    }
  }

  return "/";
}

export default defineConfig({
  base: resolveBasePath(),
});
