import {readFileSync,writeFileSync,readdirSync} from 'node:fs';
const dir='/app/static/js';
const before='maxTotalBytes:0x2000000,maxEntryBytes:8388608,maxEntryCount:1e3,maxNestedZipDepth:0,maxDocumentCount:250';
const after='maxTotalBytes:0x8000000,maxEntryBytes:8388608,maxEntryCount:1e3,maxNestedZipDepth:0,maxDocumentCount:1000';
let patched=0;
for(const file of readdirSync(dir).filter(f=>f.endsWith('.js'))){
 const path=dir+'/'+file;const source=readFileSync(path,'utf8');
 if(source.includes(before)){
  const newName=file.replace('.js','.ovvesley.js');
  writeFileSync(dir+'/'+newName,source.replaceAll(before,after).replaceAll(file,newName));
  for(const html of ['index.html','selfhost.html','assets-manifest.json']){
   const htmlPath='/app/static/'+html;
   writeFileSync(htmlPath,readFileSync(htmlPath,'utf8').replaceAll(file,newName));
  }
  patched++;
 }
}
if(patched!==1)throw new Error(`Expected one import limit module, found ${patched}. Review upstream build before deploying.`);
console.log('Web importer: 128 MiB, 1000 notes, 8 MiB per file.');
