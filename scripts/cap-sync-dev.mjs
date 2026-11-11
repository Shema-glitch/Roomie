import os from 'node:os';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const VIRTUAL_ADAPTER_RE = /vethernet|wsl|hyper-v|vmware|virtualbox|vbox|docker|loopback|tailscale|zerotier|hamachi/i;
const WIFI_ADAPTER_RE = /wi-?fi|wlan|wireless/i;

function isPrivateLanIpv4(address) {
  if (address.startsWith('192.168.') || address.startsWith('10.')) return true;
  if (address.startsWith('172.')) {
    const secondOctet = Number(address.split('.')[1]);
    return secondOctet >= 16 && secondOctet <= 31;
  }
  return false;
}

function detectLanIp() {
  const interfaces = os.networkInterfaces();
  const candidates = [];

  for (const [name, addrs] of Object.entries(interfaces)) {
    if (!addrs) continue;
    for (const info of addrs) {
      if (info.family !== 'IPv4' || info.internal) continue;
      if (!isPrivateLanIpv4(info.address)) continue;

      let score = 0;
      if (!VIRTUAL_ADAPTER_RE.test(name)) score += 100;
      if (WIFI_ADAPTER_RE.test(name)) score += 50;
      if (info.address.startsWith('192.168.')) score += 20;

      candidates.push({ name, address: info.address, score });
    }
  }

  candidates.sort((a, b) => b.score - a.score);
  return candidates[0] ?? null;
}

function runCommand(command, args, env, cwd = process.cwd()) {
  const isWin = process.platform === 'win32';
  const result = spawnSync(command, args, {
    cwd,
    env,
    stdio: 'inherit',
    shell: isWin,
  });

  if (result.error) {
    throw result.error;
  }
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

function resolveAndroidBuildEnv(baseEnv) {
  const env = { ...baseEnv };

  if (!env.ANDROID_HOME && fs.existsSync('C:\\dev\\platform-tools')) {
    env.ANDROID_HOME = 'C:\\dev';
  }
  if (!env.ANDROID_SDK_ROOT && env.ANDROID_HOME) {
    env.ANDROID_SDK_ROOT = env.ANDROID_HOME;
  }

  const jbrPath = 'C:\\Program Files\\Android\\Android Studio\\jbr';
  if (!env.JAVA_HOME && fs.existsSync(path.join(jbrPath, 'bin', 'java.exe'))) {
    env.JAVA_HOME = jbrPath;
  }

  return env;
}

const args = process.argv.slice(2);
const urlArg = args.find((a) => a.startsWith('--url='))?.slice('--url='.length);
const portArg = args.find((a) => a.startsWith('--port='))?.slice('--port='.length) ?? '3000';
const shouldBuildApk = args.includes('--build');
const useBundledAssets = args.includes('--bundle');

const env = { ...process.env };

if (useBundledAssets) {
  delete env.CAP_SERVER_URL;
  console.log('[cap-sync] Syncing Android shell with bundled dist/ assets (offline/standalone mode)...');
} else {
  const explicitUrl = urlArg || env.CAP_SERVER_URL;
  if (explicitUrl) {
    env.CAP_SERVER_URL = explicitUrl;
    console.log(`[cap-sync] Using explicit live-reload server: ${env.CAP_SERVER_URL}`);
  } else {
    const detected = detectLanIp();
    if (!detected) {
      console.error('[cap-sync] Could not detect a private LAN IPv4 address. Pass --url=http://<YOUR_IP>:3000');
      process.exit(1);
    }
    env.CAP_SERVER_URL = `http://${detected.address}:${portArg}`;
    console.log(`[cap-sync] Detected ${detected.name} -> live-reload server: ${env.CAP_SERVER_URL}`);
  }
}

runCommand('npx', ['cap', 'sync', 'android'], env);

if (shouldBuildApk) {
  const androidDir = path.join(process.cwd(), 'android');
  const buildEnv = resolveAndroidBuildEnv(env);
  const gradlew = process.platform === 'win32' ? 'gradlew.bat' : './gradlew';

  console.log(`[cap-sync] Building debug APK (ANDROID_HOME=${buildEnv.ANDROID_HOME ?? 'default'}, JAVA_HOME=${buildEnv.JAVA_HOME ?? 'default'})...`);
  runCommand(gradlew, ['assembleDebug'], buildEnv, androidDir);

  const apkPath = path.join(androidDir, 'app', 'build', 'outputs', 'apk', 'debug', 'app-debug.apk');
  console.log(`[cap-sync] Debug APK ready: ${apkPath}`);
}
