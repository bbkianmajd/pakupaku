import {cp,mkdir,rm} from 'node:fs/promises';
const root=new URL('../../',import.meta.url),output=new URL('_site/',root);
await rm(output,{recursive:true,force:true});
await mkdir(output,{recursive:true});
for(const path of ['sitemap.xml','favicon.svg','indexnow-key.txt','index.html','codec-demo.html','about.html','how-it-works.html','prototypes.html','README.md','.nojekyll','release-lock.json','src','documentation','data/semantics.json','data/semantics']){
 const target=new URL(path,output);await mkdir(new URL('./',target),{recursive:true});
 await cp(new URL(path,root),target,{recursive:true});
}
console.log('Static site assembled in _site/');
