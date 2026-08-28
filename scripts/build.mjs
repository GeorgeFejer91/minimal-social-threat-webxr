import { spawn } from "node:child_process";
import { access, cp, readdir, rm } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import process from "node:process";

async function finalizeGitHubPagesExport() {
  const prefix = process.env.PAGES_BASE_PATH?.trim();
  if (!prefix) return;
  if (!/^\/[a-zA-Z0-9._-]+$/.test(prefix)) {
    throw new Error(`Unsafe PAGES_BASE_PATH: ${prefix}`);
  }

  const clientRoot = resolve(process.cwd(), "dist", "client");
  const nestedAssets = resolve(clientRoot, prefix.slice(1));
  if (dirname(nestedAssets) !== clientRoot) {
    throw new Error("The Pages asset directory resolved outside the static export root.");
  }

  try {
    await access(nestedAssets);
  } catch {
    return;
  }

  for (const entry of await readdir(nestedAssets, { withFileTypes: true })) {
    await cp(resolve(nestedAssets, entry.name), resolve(clientRoot, entry.name), {
      recursive: entry.isDirectory(),
      force: true,
    });
  }
  await rm(nestedAssets, { recursive: true, force: true });
}

const child = spawn(process.execPath, ["node_modules/vinext/dist/cli.js", "build"], {
  cwd: process.cwd(),
  env: process.env,
  stdio: ["inherit", "pipe", "pipe"],
});

let output = "";
for (const stream of [child.stdout, child.stderr]) {
  stream.on("data", (chunk) => {
    const text = chunk.toString();
    output += text;
    (stream === child.stdout ? process.stdout : process.stderr).write(chunk);
  });
}

const exitCode = await new Promise((resolve) => child.on("close", resolve));
if (exitCode === 0) {
  await finalizeGitHubPagesExport();
  process.exit(0);
}

// Vinext/Vite currently reaches a Windows libuv shutdown assertion after a
// successful static export on some Node builds. Accept only that exact case,
// and only when the completed export exists; every other failure remains fatal.
const knownWindowsShutdown = process.platform === "win32"
  && output.includes("Build complete.")
  && output.includes("Assertion failed: !(handle->flags & UV_HANDLE_CLOSING)");
if (knownWindowsShutdown) {
  try {
    await access(new URL("../dist/client/index.html", import.meta.url));
    await finalizeGitHubPagesExport();
    process.stderr.write("[build] Static export completed; ignored known post-build Windows libuv shutdown assertion.\n");
    process.exit(0);
  } catch {
    // Fall through: a success message without the expected artifact is failure.
  }
}

process.exit(typeof exitCode === "number" ? exitCode : 1);
