import { spawn } from "node:child_process";
import { access } from "node:fs/promises";
import process from "node:process";

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
if (exitCode === 0) process.exit(0);

// Vinext/Vite currently reaches a Windows libuv shutdown assertion after a
// successful static export on some Node builds. Accept only that exact case,
// and only when the completed export exists; every other failure remains fatal.
const knownWindowsShutdown = process.platform === "win32"
  && output.includes("Build complete.")
  && output.includes("Assertion failed: !(handle->flags & UV_HANDLE_CLOSING)");
if (knownWindowsShutdown) {
  try {
    await access(new URL("../dist/client/index.html", import.meta.url));
    process.stderr.write("[build] Static export completed; ignored known post-build Windows libuv shutdown assertion.\n");
    process.exit(0);
  } catch {
    // Fall through: a success message without the expected artifact is failure.
  }
}

process.exit(typeof exitCode === "number" ? exitCode : 1);
