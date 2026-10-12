import { mkdir, cp, rm, stat, readdir } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { buildStandalone } from './standalone.mjs';
const root=fileURLToPath(new URL('../',import.meta.url));
const output=path.join(root,'dist');
for(const file of await readdir(path.join(root,'src'))){
  if(file.endsWith('.js'))execFileSync(process.execPath,['--check',path.join(root,'src',file)],{stdio:'inherit'});
}
execFileSync(process.execPath,['--check',path.join(root,'sw.js')],{stdio:'inherit'});
await rm(output,{recursive:true,force:true});await mkdir(output,{recursive:true});
for(const file of ['index.html','style.css','src','assets','manifest.webmanifest','sw.js'])await cp(path.join(root,file),path.join(output,file),{recursive:true});
await cp(path.join(root,'index.html'),path.join(output,'404.html'));
await buildStandalone(root,output);
console.log('Static site built in dist/. No third-party runtime dependencies.');
console.log('Deploy index:',(await stat(path.join(output,'index.html'))).size,'bytes');
