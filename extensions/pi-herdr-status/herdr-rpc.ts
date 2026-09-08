import { createConnection } from "node:net";

interface PaneGetResponse {
	id?: unknown;
	result?: {
		type?: unknown;
		pane?: {
			agent_status?: unknown;
		};
	};
}

const MAX_RESPONSE_BYTES = 64 * 1024;
let requestCounter = 0;

export function herdrSocketEndpoint(socketPath: string | undefined, platform = process.platform): string | undefined {
	return platform === "win32" && socketPath ? `\\\\.\\pipe\\${socketPath}` : socketPath;
}

export async function readHerdrPaneState(
	socketPath: string | undefined,
	paneId: string | undefined,
	timeoutMs = 1_000,
	signal?: AbortSignal,
): Promise<string | undefined> {
	if (!socketPath || !paneId || signal?.aborted) return undefined;
	const requestId = `herdr:pi-companion:${process.pid}:${++requestCounter}`;
	return new Promise((resolve) => {
		const socket = createConnection(socketPath);
		let settled = false;
		let buffer = "";
		let receivedBytes = 0;
		const finish = (value: string | undefined) => {
			if (settled) return;
			settled = true;
			clearTimeout(timeout);
			signal?.removeEventListener("abort", onAbort);
			socket.destroy();
			resolve(value);
		};
		const onAbort = () => finish(undefined);
		const timeout = setTimeout(() => finish(undefined), timeoutMs);
		timeout.unref?.();
		signal?.addEventListener("abort", onAbort, { once: true });
		socket.setEncoding("utf8");
		socket.on("connect", () => {
			socket.write(`${JSON.stringify({ id: requestId, method: "pane.get", params: { pane_id: paneId } })}\n`);
		});
		socket.on("data", (chunk) => {
			receivedBytes += Buffer.byteLength(chunk);
			if (receivedBytes > MAX_RESPONSE_BYTES) {
				finish(undefined);
				return;
			}
			buffer += chunk;
			for (;;) {
				const newline = buffer.indexOf("\n");
				if (newline < 0) return;
				const line = buffer.slice(0, newline);
				buffer = buffer.slice(newline + 1);
				try {
					const response = JSON.parse(line) as PaneGetResponse;
					if (response.id !== requestId) continue;
					const status = response.result?.pane?.agent_status;
					finish(typeof status === "string" ? status : undefined);
					return;
				} catch {
					finish(undefined);
					return;
				}
			}
		});
		socket.on("error", () => finish(undefined));
		socket.on("end", () => finish(undefined));
	});
}
