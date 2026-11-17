import fs from 'node:fs';
import path from 'node:path';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config();

function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (!token.startsWith('--')) continue;
    const key = token.slice(2);
    const next = argv[i + 1];
    if (!next || next.startsWith('--')) {
      args[key] = true;
    } else {
      args[key] = next;
      i += 1;
    }
  }
  return args;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const pkg = JSON.parse(fs.readFileSync(path.resolve('package.json'), 'utf8'));

  const versionName = String(args.version || pkg.version || '2.1.0');
  const versionCode = Number(args.code || versionName.split('.').map((n) => Number(n) || 0).reduce((acc, n) => acc * 10 + n, 0) || 210);
  const notes = String(args.notes || 'Bug fixes and UI improvements.');
  const mandatory = Boolean(args.mandatory);
  const apkPath = args.apk ? path.resolve(String(args.apk)) : null;
  let downloadUrl = args.url ? String(args.url) : '';

  const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    console.error('Missing VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in environment.');
    console.log('\nSQL fallback (run in Supabase SQL Editor after uploading APK to Storage or GitHub Releases):');
    console.log(
      `UPDATE public.app_releases SET is_active = false WHERE platform = 'android';\n` +
      `INSERT INTO public.app_releases (platform, version_name, version_code, download_url, release_notes, is_mandatory, is_active)\n` +
      `VALUES ('android', '${versionName}', ${versionCode}, '${downloadUrl || 'https://YOUR_HOSTED_APK_URL'}', '${notes.replace(/'/g, "''")}', ${mandatory}, true);`
    );
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey);

  if (apkPath) {
    if (!fs.existsSync(apkPath)) {
      console.error(`APK file not found: ${apkPath}`);
      process.exit(1);
    }
    const fileBuffer = fs.readFileSync(apkPath);
    const objectName = `roomie-v${versionName}-b${versionCode}.apk`;
    const { error: uploadErr } = await supabase.storage
      .from('releases')
      .upload(objectName, fileBuffer, {
        contentType: 'application/vnd.android.package-archive',
        upsert: true,
      });

    if (uploadErr) {
      console.error('Storage upload failed:', uploadErr.message);
      process.exit(1);
    }

    const { data: pub } = supabase.storage.from('releases').getPublicUrl(objectName);
    downloadUrl = pub.publicUrl;
    console.log(`Uploaded APK to Supabase Storage: ${downloadUrl}`);
  }

  if (!downloadUrl || !downloadUrl.startsWith('https://')) {
    console.error('Provide either --apk <path> or --url <https://...>');
    process.exit(1);
  }

  await supabase.from('app_releases').update({ is_active: false }).eq('platform', 'android');

  const { error: insertErr } = await supabase.from('app_releases').insert({
    platform: 'android',
    version_name: versionName,
    version_code: versionCode,
    download_url: downloadUrl,
    release_notes: notes,
    is_mandatory: mandatory,
    is_active: true,
  });

  if (insertErr) {
    console.error('Failed to insert app_releases row:', insertErr.message);
    process.exit(1);
  }

  console.log(`Published Roomie v${versionName} (code ${versionCode}) cleanly!`);
}

main();
