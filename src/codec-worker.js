import {RELEASE_VERSION, verifyReleaseFiles} from './release.js';
import {loadCurrentVocabulary} from './vocabulary.js';
import {analyzeDraft} from './draft.js';
import {createStructureLanguage,encodeStructure,decodeStructure} from './structure-codec.js';
import {parseNote as parseSimple} from './prototypes/language.js';
const languageReady=verifyReleaseFiles().then(()=>loadCurrentVocabulary({base:new URL('../data/',import.meta.url).href})).then(createStructureLanguage);
let readingController;
self.onmessage=async({data})=>{
 const {id,operation}=data;
 try{
  const language=await languageReady;let result;
  if(operation==='init')result=RELEASE_VERSION;
  else if(operation==='analyze'){
   result=analyzeDraft(language.grammar,data.note);
   // Additional reviewed constructions in the new codec must also be writable.
   if(!result.complete)try{parseSimple(language.simple,data.note);result={complete:true,issue:null,message:'Note is ready to link.'};}catch{}
  }else if(operation==='encode'){
   readingController?.abort();result=(await encodeStructure(language,data.note,data.key)).payload;
  }else if(operation==='decode'){
   readingController?.abort();const controller=new AbortController();readingController=controller;
   result=(await decodeStructure(language,data.payload,data.key,{signal:controller.signal})).text;
  }else throw Error('Unknown worker operation.');
  self.postMessage({id,result});
 }catch(error){self.postMessage({id,error:error.message,aborted:error.name==='AbortError'});}
};
