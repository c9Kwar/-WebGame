import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

// This narrowly scoped packager supports the local modules' named declarations.
// Fail explicitly if a future module uses syntax this packager cannot handle.
function packageModule(source, namespace) {
  const names=[...source.matchAll(/^export (?:const|function)\s+(\w+)/gm)].map(m=>m[1]);
  const body=source.replace(/^import \{([^}]+)\} from '\.\/data\.js';$/gm,'const {$1} = Data;').replace(/^export /gm,'');
  if(/^\s*(import|export)\s/m.test(body))throw new Error(`Unsupported import/export in ${namespace}`);
  return `const ${namespace}=(()=>{\n${body}\nreturn {${names.join(',')}};\n})();`;
}
export async function buildStandalone(root, output) {
  const read=file=>readFile(path.join(root,file),'utf8');
  const [data,domain,art,app,css,index,mark]=await Promise.all(['src/data.js','src/game.js','src/art.js','src/app.js','style.css','index.html','assets/mark.svg'].map(read));
  const ui=app.replace(/^import \{([^}]+)\} from '\.\/data\.js';$/gm,'const {$1}=Data;')
    .replace(/^import \* as game from '\.\/game\.js';$/gm,'')
    .replace(/^import \{([^}]+)\} from '\.\/art\.js';$/gm,'const {$1}=Art;')
    .replace(/^if\('serviceWorker' in navigator\).*$/gm,'');
  if(/^\s*(import|export)\s/m.test(ui))throw new Error('Unsupported import/export in standalone UI');
  const bundle=[packageModule(data,'Data'),packageModule(domain,'game'),packageModule(art,'Art'),`(()=>{\n${ui}\n})();`].join('\n');
  const html=index.replace('<link rel="stylesheet" href="./style.css">',`<style>${css}</style>`)
    .replace('<link rel="manifest" href="./manifest.webmanifest">','')
    .replace('href="./assets/mark.svg"',`href="data:image/svg+xml,${encodeURIComponent(mark)}"`)
    .replace('<script type="module" src="./src/app.js"></script>',`<script type="module">\n${bundle.replace(/<\/script/gi,'<\\/script')}\n</script>`);
  await writeFile(path.join(output,'잔향서고.html'),html);
  console.log('Standalone game: dist/잔향서고.html (no server or network required).');
}
