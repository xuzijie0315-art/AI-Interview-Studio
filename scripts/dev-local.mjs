import { existsSync } from "node:fs";
import { execFileSync, spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
if (existsSync(".env.local")) process.loadEnvFile(".env.local");
// Reuse an existing Windows proxy for this process without modifying system settings.
if (process.platform === "win32" && !process.env.HTTPS_PROXY && !process.env.https_proxy) {
 try {
  const script = "$p=Get-ItemProperty -LiteralPath 'HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\Internet Settings';if($p.ProxyEnable -eq 1){[Console]::Write($p.ProxyServer)}";
  let proxy = execFileSync("powershell.exe", ["-NoProfile", "-NonInteractive", "-Command", script], { encoding:"utf8",windowsHide:true }).trim();
  proxy = proxy.match(/(?:^|;)https=([^;]+)/)?.[1] || proxy.match(/(?:^|;)http=([^;]+)/)?.[1] || proxy;
  if (proxy && !/[;=]/.test(proxy)) { process.env.HTTPS_PROXY = /^https?:\/\//.test(proxy) ? proxy : `http://${proxy}`; process.env.NODE_USE_ENV_PROXY = "1"; }
 } catch { /* A proxy is optional; never print its value. */ }
}
const localArgs = process.argv.slice(2);
const child = spawn(process.execPath,[fileURLToPath(new URL("./run-framework.mjs",import.meta.url)),"dev",...localArgs],{stdio:"inherit",env:process.env,windowsHide:true});
process.on("SIGINT",()=>child.kill("SIGINT"));
process.on("SIGTERM",()=>child.kill("SIGTERM"));
child.on("exit",code=>process.exit(code??1));
