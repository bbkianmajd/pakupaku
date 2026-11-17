import {readdir, readFile, writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {RELEASE_VERSION, verifyReleaseFiles} from '../../src/release.js';
const base=new URL('../../',import.meta.url);
async function walk(path){const entries=await readdir(new URL(path,base),{withFileTypes:true});return (await Promise.all(entries.map(e=>e.isDirectory()?walk(`${path}${e.name}/`):`${path}${e.name}`))).flat();}
const paths=[...(await walk('src/')).filter(p=>p.endsWith('.js') && !p.startsWith('src/ui/') && !['src/demo.js','src/prototypes/demo.js'].includes(p)), 'data/semantics.json',`data/semantics/${RELEASE_VERSION}.json`].sort();
if(process.argv.includes('--write')){
 const files={};for(const path of paths)files[path]=createHash('sha256').update(await readFile(new URL(path,base))).digest('hex');
 await writeFile(new URL('release-lock.json',base),JSON.stringify({version:RELEASE_VERSION,files},null,2)+'\n');
}else{
 const lock=await verifyReleaseFiles({base,fetcher:async url=>new Response(await readFile(url))});
 if(JSON.stringify(Object.keys(lock.files).sort())!==JSON.stringify(paths))throw Error('Release file list changed.');
 console.log(`Release ${RELEASE_VERSION}: ${paths.length} locked files verified.`);
}
