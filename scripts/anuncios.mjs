// Copia para o site (clientes.json) a última lista de anúncios publicada e assinada pelo administrador.
import fs from 'node:fs';
const TOP='radio-econtec-anuncios-q7k2m9x4';
const norm=c=>{const o={nome:String(c.nome||''),txt:String(c.txt||''),logo:String(c.logo||''),zap:String(c.zap||'').replace(/\D/g,''),audio:String(c.audio||'')};if(c.cancelado)o.cancelado=true;return o};
let meta={ts:0};try{meta=JSON.parse(fs.readFileSync('clientes-meta.json','utf8'))}catch{}
const chaves=JSON.parse(fs.readFileSync('chaves-admin.json','utf8'));
const keys=await Promise.all(chaves.map(k=>crypto.subtle.importKey('jwk',{kty:'EC',crv:'P-256',x:k.x,y:k.y},{name:'ECDSA',namedCurve:'P-256'},false,['verify'])));
const txt=await (await fetch('https://ntfy.sh/'+TOP+'/json?poll=1&since=12h')).text();
let melhor=null;
for(const ln of txt.split('\n')){if(!ln.trim())continue;let m;try{m=JSON.parse(ln)}catch{continue}if(m.event!=='message')continue;
 let env;try{env=m.attachment?await (await fetch(m.attachment.url)).json():JSON.parse(m.message)}catch{continue}
 try{let ok=false;for(const key of keys)if(await crypto.subtle.verify({name:'ECDSA',hash:'SHA-256'},key,Buffer.from(env.s,'base64'),new TextEncoder().encode(env.p))){ok=true;break}if(!ok)continue;
  const o=JSON.parse(env.p);if(Array.isArray(o.lista)&&o.ts&&(!melhor||o.ts>melhor.ts))melhor=o}catch{}}
const agora=new Date().toISOString();
if(melhor&&melhor.ts>(meta.ts||0)){
 fs.writeFileSync('clientes.json','[\n'+melhor.lista.map(c=>' '+JSON.stringify(norm(c))).join(',\n')+'\n]\n');
 meta={ts:melhor.ts,verificado:agora};fs.writeFileSync('clientes-meta.json',JSON.stringify(meta)+'\n');console.log('Anúncios atualizados',melhor.ts);
}else if(!meta.verificado||Date.now()-Date.parse(meta.verificado)>6*864e5){meta.verificado=agora;fs.writeFileSync('clientes-meta.json',JSON.stringify(meta)+'\n');console.log('Sem mudanças (registro semanal)')}
else console.log('Sem mudanças');
