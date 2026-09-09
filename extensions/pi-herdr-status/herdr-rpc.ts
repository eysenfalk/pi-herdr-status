// Downstream split of Herdr's Pi integration transport behavior.
// Derived from herdrdev/herdr src/integration/assets/pi/herdr-agent-state.ts
// at v0.9.0 (b99002ac99b09e00b4ca692436cb15a6b0d676f1); substantially modified.

import { createConnection } from "node:net";

const MAX_RESPONSE_BYTES = 64 * 1024;
let requestCounter = 0;

interface RpcResponse {
	id?: unknown;
	error?: unknown;
}

export function herdrSocketEndpoint(socketPath: string | undefined, platform = process.platform): string | undefined {
	return platform === "win32" && socketPath ? `\\\\.\\pipe\\${socketPath}` : socketPath;
}

export async function sendHerdrRequest(
	socketPath: string | undefined,
	request: Record<string, unknown>,
	timeoutMs: number,
	signal?: AbortSignal,
): Promise<boolean> {
	if (!socketPath || signal?.aborted) return false;
	const requestId = `${String(request.id ?? "herdr:pi-fork")}:${process.pid}:${++requestCounter}`;
	return new Promise((resolve) => {
		const socket = createConnection(socketPath);
		let settled = false;
		let buffer = "";
		let receivedBytes = 0;
		const finish = (delivered: boolean) => {
			if (settled) return;
			settled = true;
			clearTimeout(timeout);
			signal?.removeEventListener("abort", onAbort);
			socket.destroy();
			resolve(delivered);
		};
		const onAbort = () => finish(false);
		const timeout = setTimeout(() => finish(false), timeoutMs);
		timeout.unref?.();
		signal?.addEventListener("abort", onAbort, { once: true });
		socket.setEncoding("utf8");
		socket.on("connect", () => {
			socket.write(`${JSON.stringify({ ...request, id: requestId })}\n`);
		});
		socket.on("data", (chunk) => {
			receivedBytes += Buffer.byteLength(chunk);
			if (receivedBytes > MAX_RESPONSE_BYTES) {
				finish(false);
				return;
			}
			buffer += chunk;
			for (;;) {
				const newline = buffer.indexOf("\n");
				if (newline < 0) return;
				const line = buffer.slice(0, newline);
				buffer = buffer.slice(newline + 1);
				try {
					const response = JSON.parse(line) as RpcResponse;
					if (response.id !== requestId) continue;
					finish(response.error === undefined);
					return;
				} catch {
					finish(false);
					return;
				}
			}
		});
		socket.on("error", () => finish(false));
		socket.on("end", () => finish(false));
	});
}
