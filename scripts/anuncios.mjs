// Copia para o site (clientes.json) a última lista de anúncios publicada e assinada pelo administrador.
import fs from 'node:fs';
// Fala natural: palavras TODAS EM MAIÚSCULAS viram Primeira Maiúscula (senão a voz soletra)
const falaNatural=s=>String(s).replace(/[\p{L}]{2,}/gu,w=>w===w.toUpperCase()?w[0]+w.slice(1).toLowerCase():w);
// Nome do escritório escrito como se fala (a voz soletrava ECONTEC)
const pronuncia=s=>String(s).replace(/\becontec\b/gi,'Econtéc');
// telefones falados em grupos (regra 24/11): (64) 9 8419-2320 → sessenta e quatro, novecentos e oitenta e quatro, dezenove, vinte e três, vinte
const U=['zero','um','dois','três','quatro','cinco','seis','sete','oito','nove','dez','onze','doze','treze','catorze','quinze','dezesseis','dezessete','dezoito','dezenove'],D=['','','vinte','trinta','quarenta','cinquenta','sessenta','setenta','oitenta','noventa'],C=['','cento','duzentos','trezentos','quatrocentos','quinhentos','seiscentos','setecentos','oitocentos','novecentos'];
const ext=n=>{if(n<20)return U[n];if(n<100)return D[Math.floor(n/10)]+(n%10?' e '+U[n%10]:'');if(n===100)return 'cem';return C[Math.floor(n/100)]+(n%100?' e '+ext(n%100):'')};
const grupo=g=>g[0]==='0'?g.split('').map(x=>U[+x]).join(' '):ext(+g);
const dig=g=>g.split('').map(x=>U[+x]).join(' '),par=g=>g[0]==='0'?dig(g):ext(+g);
// regra 25/11 (3ª, do usuário): (64) 9 8419-2320 → "sessenta e quatro, nove, oito quatro dezenove, vinte e três vinte"; fixo 3651-1234 → "três seis cinquenta e um, doze trinta e quatro"
const falaFone=s=>String(s).replace(/(?:\+?55\s*)?(?:\(\s*(\d{2})\s*\)\s*|\b(\d{2})[\s.-]*)?(9[\s.]?\d{4}|\d{4})[\s.-]?(\d{4})\b/g,(m,a,b,p1,p2)=>{const ddd=a||b,n=(p1+p2).replace(/\D/g,'');if(n.length<8||(!ddd&&!/[-\s.]/.test(m)))return m;const cel=n.length===9,b1=n.slice(cel?1:0,-4),b2=n.slice(-4);return (ddd?grupo(ddd)+', ':'')+(cel?'nove, ':'')+dig(b1.slice(0,2))+' '+par(b1.slice(2))+', '+par(b2.slice(0,2))+' '+par(b2.slice(2))});
const tituloNome=s=>String(s).toLowerCase().replace(/[\p{L}]+/gu,(w,i)=>/^(de|da|do|das|dos|e)$/.test(w)&&i>0?w:w[0].toUpperCase()+w.slice(1));
const TOP='radio-econtec-anuncios-q7k2m9x4';
const norm=c=>{const o={nome:String(c.nome||''),txt:String(c.txt||''),logo:String(c.logo||''),zap:String(c.zap||'').replace(/\D/g,''),audio:String(c.audio||'')};for(const k of ['ig','tt','mail','fb','site'])if(c[k])o[k]=String(c[k]).slice(0,80);if(/^[\w-]{11}$/.test(c.vid||'')){o.vid=c.vid;o.vdur=Math.max(10,Math.min(420,Math.round(+c.vdur||30)))}if(c.cancelado)o.cancelado=true;return o};
let meta={ts:0};try{meta=JSON.parse(fs.readFileSync('clientes-meta.json','utf8'))}catch{}
const chaves=JSON.parse(fs.readFileSync('chaves-admin.json','utf8'));
const keys=await Promise.all(chaves.map(k=>crypto.subtle.importKey('jwk',{kty:'EC',crv:'P-256',x:k.x,y:k.y},{name:'ECDSA',namedCurve:'P-256'},false,['verify'])));
const txt=await (await fetch('https://ntfy.sh/'+TOP+'/json?poll=1&since=12h')).text();
let melhor=null;const erros=[];
for(const ln of txt.split('\n').reverse()){if(melhor)break; /* do mais novo para o mais antigo: basta o último válido */
 if(!ln.trim())continue;let m;try{m=JSON.parse(ln)}catch{continue}if(m.event!=='message')continue;
 let env=null;for(let tent=0;tent<4&&!env;tent++){try{if(m.attachment){const r=await fetch(m.attachment.url,{signal:AbortSignal.timeout(15000)});if(!r.ok)throw new Error('HTTP '+r.status);env=await r.json()}else env=JSON.parse(m.message)}catch(e){erros.push(m.id+': '+e.message);if(!m.attachment||/HTTP 40[34]|HTTP 410/.test(e.message))break;await new Promise(r=>setTimeout(r,3000*(tent+1)))}}if(!env)continue;
 try{let ok=false;for(const key of keys)if(await crypto.subtle.verify({name:'ECDSA',hash:'SHA-256'},key,Buffer.from(env.s,'base64'),new TextEncoder().encode(env.p))){ok=true;break}if(!ok)continue;
  const o=JSON.parse(env.p);if(Array.isArray(o.lista)&&o.ts&&(!melhor||o.ts>melhor.ts))melhor=o}catch{}}
const agora=new Date().toISOString();
if(erros.length){console.log('anúncios: falhas ao baixar',erros.join(' | '));fs.writeFileSync('plantao-erros.json',JSON.stringify({quando:agora,erros:erros.slice(-10)})+'\n')}
if(melhor&&melhor.ts>(meta.ts||0)){
 fs.writeFileSync('clientes.json','[\n'+melhor.lista.map(c=>' '+JSON.stringify(norm(c))).join(',\n')+'\n]\n');
 if(melhor.cfg&&typeof melhor.cfg==='object'){const p=melhor.cfg.precos||{},t=(v,n)=>String(v||'').slice(0,n);
  fs.writeFileSync('config.json',JSON.stringify({ts:melhor.ts,precos:{Essencial:t(p.Essencial,40),Destaque:t(p.Destaque,40),Patrocinador:t(p.Patrocinador,40)},promo:t(melhor.cfg.promo,120),planosOn:!!melhor.cfg.planosOn,livre:melhor.cfg.livre==null||isNaN(+melhor.cfg.livre)?10:Math.max(0,Math.min(60,Math.round(+melhor.cfg.livre))),redes:Object.fromEntries(['instagram','facebook','youtube','tiktok','linkedin','site'].map(k=>[k,t((melhor.cfg.redes||{})[k],120)]))})+'\n')}
 meta={ts:melhor.ts,verificado:agora};fs.writeFileSync('clientes-meta.json',JSON.stringify(meta)+'\n');console.log('Anúncios atualizados',melhor.ts);
}else if(!meta.verificado||Date.now()-Date.parse(meta.verificado)>6*864e5){meta.verificado=agora;fs.writeFileSync('clientes-meta.json',JSON.stringify(meta)+'\n');console.log('Sem mudanças (registro semanal)')}
else console.log('Sem mudanças');

// Pedidos de música: guarda no site os pedidos do dia (o ntfy só guarda 12 horas)
{
 const FUSO=3*36e5,DIA=864e5;const t2=await (await fetch('https://ntfy.sh/radio-econtec-pedidos-q7k2m9x4/json?poll=1&since=12h')).text();
 const porDia={};
 for(const ln of t2.split('\n')){if(!ln.trim())continue;let m;try{m=JSON.parse(ln)}catch{continue}if(m.event!=='message')continue;let p;try{p=JSON.parse(m.message)}catch{continue}
  if(!p||!p.tr||!/^[\w-]{11}$/.test(p.tr.id)||typeof p.nome!=='string')continue;
  const ts=m.time*1000,dia=new Date(Math.floor((ts-FUSO)/DIA)*DIA).toISOString().slice(0,10);
  const para=typeof p.para==='string'?p.para.trim().replace(/\s+/g,' ').slice(0,40):'';
  (porDia[dia]=porDia[dia]||[]).push({id:m.id,ts,nome:p.nome.slice(0,40),...(para?{para}:{}),dur:+p.dur,tr:{id:p.tr.id,tipo:'yt',titulo:String(p.tr.titulo||'').slice(0,90),artista:String(p.tr.artista||'').slice(0,60),estilo:String(p.tr.estilo||'Pedido').slice(0,30),parecida:!!p.tr.parecida}})}
 fs.mkdirSync('pedidos',{recursive:true});
 for(const [dia,l] of Object.entries(porDia)){const f='pedidos/'+dia+'.json';let atual=[];try{atual=JSON.parse(fs.readFileSync(f,'utf8'))}catch{}
  const ids=new Set(atual.map(x=>x.id));const novos=l.filter(x=>!ids.has(x.id));if(novos.length){fs.writeFileSync(f,JSON.stringify(atual.concat(novos).sort((a,b)=>a.ts-b.ts))+'\n');console.log('pedidos',dia,novos.length)}}
 // apaga dias antigos (mais de 3 dias)
 for(const f of fs.readdirSync('pedidos'))if(Date.now()-Date.parse(f.slice(0,10))>3*DIA)fs.unlinkSync('pedidos/'+f);
}

// Homenagem do dia: às 22h toca 5 músicas do artista da música mais pedida do dia (pedidos até 21h; arquivo criado entre 21h e 21h57)
{
 const FUSO=3*36e5,DIA=864e5,agora=Date.now(),d=Math.floor((agora-FUSO)/DIA),dia=new Date(d*DIA).toISOString().slice(0,10);
 const corte=d*DIA+FUSO+21*36e5,limite=d*DIA+FUSO+21.95*36e5,arq='homenagem/'+dia+'.json';
 fs.mkdirSync('homenagem',{recursive:true});
 if(agora>=corte&&!fs.existsSync(arq)&&agora>=limite){fs.writeFileSync(arq,JSON.stringify({dia,artista:null,motivo:'fora do horário'})+'\n')}
 else if(agora>=corte&&!fs.existsSync(arq)){
  let peds=[];try{peds=JSON.parse(fs.readFileSync('pedidos/'+dia+'.json','utf8'))}catch{}
  peds=peds.filter(p=>p.ts<corte&&p.tr&&/^[\w-]{11}$/.test(p.tr.id));
  const cont={};for(const p of peds){const c=cont[p.tr.id]=cont[p.tr.id]||{n:0,ts:p.ts,tr:p.tr,dur:p.dur};c.n++}
  const top=Object.values(cont).sort((a,b)=>b.n-a.n||a.ts-b.ts)[0];
  if(top&&top.tr.artista){
   const KEY='AIzaSyDWt1w5AGxofkcmeDSNR05YOmXIPq0kUT4',H={headers:{Referer:'https://econtec-contabilidade.github.io/radio-econtec/'}};
   const art=top.tr.artista.replace(/\s*(oficial|official|vevo|- topic)\s*$/i,'').trim();
   const norm=t=>String(t).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'');
   const faixas=[{id:top.tr.id,titulo:top.tr.titulo,artista:art,dur:top.dur,maisPedida:true,vezes:top.n}];
   try{
    const j=await (await fetch('https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&videoEmbeddable=true&safeSearch=strict&videoCategoryId=10&regionCode=BR&maxResults=15&q='+encodeURIComponent(art)+'&key='+KEY,H)).json();
    const cand=(j.items||[]).filter(it=>it.id.videoId!==top.tr.id&&norm(it.snippet.title).includes(norm(art).split(' ')[0])&&!/sucessos|completo|album|álbum|playlist|cd |dvd|ao vivo em|live session|mix|medley|as melhores|top \d/i.test(it.snippet.title));
    const ids=cand.map(i=>i.id.videoId).slice(0,10);
    if(ids.length){const v=await (await fetch('https://www.googleapis.com/youtube/v3/videos?part=contentDetails&id='+ids.join(',')+'&key='+KEY,H)).json();
     const durs={};for(const it of v.items||[]){const m=it.contentDetails.duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);durs[it.id]=(+m[1]||0)*3600+(+m[2]||0)*60+(+m[3]||0)}
     for(const it of cand){if(faixas.length>=5)break;const dd=durs[it.id.videoId];if(!dd||dd<90||dd>420)continue;
      const t=it.snippet.title.replace(/&amp;/g,'&').replace(/&#39;/g,"'").replace(/&quot;/g,'"').replace(/\s*[\(\[][^\)\]]*(clipe|video|vídeo|official|oficial|lyric|letra|audio|áudio|visualizer)[^\)\]]*[\)\]]/gi,'').trim();const pp=t.split(/\s+[-–|]\s+/);
      faixas.push({id:it.id.videoId,titulo:(pp.length>1?pp.slice(1).join(' - '):t).slice(0,90),artista:art,dur:dd})}}
   }catch(e){console.log('youtube falhou',e.message)}
   // a mais pedida fecha a homenagem
   const ord=faixas.slice(1).concat(faixas[0]);
   fs.writeFileSync(arq,JSON.stringify({dia,artista:art,maisPedida:top.tr.titulo,vezes:top.n,faixas:ord})+'\n');console.log('homenagem',art,ord.length);
  }else{fs.writeFileSync(arq,JSON.stringify({dia,artista:null})+'\n');console.log('sem pedidos para homenagem')}
 }
 for(const f of fs.readdirSync('homenagem'))if(Date.now()-Date.parse(f.slice(0,10))>3*DIA)fs.unlinkSync('homenagem/'+f);
}

// Voz dos anúncios novos (sem gravação da Betina): voz neural feminina Francisca (Microsoft), MP3 fixo em v/a/
{
 const {execFileSync}=await import('node:child_process');
 const fnv=t=>{let h=0x811c9dc5;for(const ch of new TextEncoder().encode(t)){h^=ch;h=Math.imul(h,0x01000193)>>>0}return h.toString(16).padStart(8,'0')};
 const AUDIO_CLI=['Padaria Pão Dourado','Auto Peças Avenida'];
 let mapa={};try{mapa=JSON.parse(fs.readFileSync('audios.json','utf8'))}catch{}
 let lista=[];try{lista=JSON.parse(fs.readFileSync('clientes.json','utf8'))}catch{}
 fs.mkdirSync('v/a',{recursive:true});let mudou=false;
 for(const c of lista){
  if(c.cancelado||c.audio||AUDIO_CLI.includes(c.nome)||(c.nome==='ECONTEC Contabilidade'&&c.logo==='img/logo-econtec.png')||!c.txt)continue;
  const k=fnv(c.nome+'|'+c.txt),f='v/a/'+k+'.mp3';
  const vq=falaFone(c.txt)!==c.txt?6:4; /* só regrava o que tem telefone */
  if(mapa[k]&&mapa[k].v>=vq&&fs.existsSync(f))continue;
  const txt=falaFone(pronuncia(falaNatural(c.txt))).replace(/([!?.])\1+/g,'$1').replace(/\s+/g,' ').trim();
  try{execFileSync('edge-tts',['--voice','pt-BR-FranciscaNeural','--rate=+4%','--text',txt,'--write-media',f],{stdio:'pipe',timeout:60000});
   const bytes=fs.statSync(f).size;if(bytes<2000)throw new Error('áudio vazio');
   mapa[k]={url:f+'?'+vq,dur:Math.round(bytes*8/48000*10)/10,voz:'francisca',v:vq};mudou=true;console.log('voz gerada',c.nome,mapa[k].dur+'s')}
  catch(e){console.log('voz falhou',c.nome,e.message)}
 }
 // oferecimento da hora certa por cliente (regra 25/11): "Hora certa, com oferecimento de JF Soluções Financeiras!" (Francisca)
 fs.mkdirSync('v/ho',{recursive:true});
 for(const c of lista){
  if(c.cancelado||!c.nome||/econtec/i.test(c.nome))continue;
  const k=fnv(c.nome.trim().toLowerCase()),f='v/ho/'+k+'.mp3';
  if(mapa['ho:'+k]&&fs.existsSync(f))continue;
  const txt=pronuncia(falaNatural(`Hora certa, com oferecimento de ${c.nome.trim()}!`));
  try{execFileSync('edge-tts',['--voice','pt-BR-FranciscaNeural','--rate=+4%','--text',txt,'--write-media',f],{stdio:'pipe',timeout:60000});
   const bytes=fs.statSync(f).size;if(bytes<2000)throw new Error('áudio vazio');
   mapa['ho:'+k]={url:f+'?1',dur:Math.round(bytes*8/48000*10)/10,voz:'francisca'};mudou=true;console.log('oferecimento gerado',c.nome,mapa['ho:'+k].dur+'s')}
  catch(e){console.log('oferecimento falhou',c.nome,e.message)}
 }
 // testes de voz (Claude): tts-teste.json = ["texto", ...] → v/teste/N.mp3, depois apaga o pedido
 if(fs.existsSync('tts-teste.json')){let L=[];try{L=JSON.parse(fs.readFileSync('tts-teste.json','utf8'))}catch{}fs.mkdirSync('v/teste',{recursive:true});
  L.slice(0,10).forEach((t,n)=>{try{execFileSync('edge-tts',['--voice','pt-BR-FranciscaNeural','--rate=+4%','--text',String(t),'--write-media','v/teste/'+n+'.mp3'],{stdio:'pipe',timeout:60000})}catch(e){console.log('teste falhou',n)}});fs.unlinkSync('tts-teste.json');console.log('testes de voz',L.length)}
 // anúncio fixo do escritório na voz Francisca, telefone falado em grupos (Betina sem créditos até ~13/12)
 if(!fs.existsSync('v/anuncio-econtec-f3.mp3')){
  const tb=falaFone(pronuncia('ECONTEC Contabilidade! Imposto, folha de pagamento, abertura de empresa: a gente resolve pra você! Chama a ECONTEC no WhatsApp: (64) 9 8419-2320. ECONTEC Contabilidade: sua empresa em dia, você tranquilo!'));
  try{execFileSync('edge-tts',['--voice','pt-BR-FranciscaNeural','--rate=+4%','--text',tb,'--write-media','v/anuncio-econtec-f3.mp3'],{stdio:'pipe',timeout:60000});
   const bytes=fs.statSync('v/anuncio-econtec-f3.mp3').size;if(bytes<2000)throw new Error('áudio vazio');console.log('anúncio base gerado',Math.round(bytes*8/48000*10)/10+'s')}
  catch(e){console.log('anúncio base falhou',e.message);try{fs.unlinkSync('v/anuncio-econtec-f3.mp3')}catch{}}
 }
 if(mudou||!fs.existsSync('audios.json'))fs.writeFileSync('audios.json',JSON.stringify(mapa)+'\n');
}

// Cadastros enviados pelos clientes na página cadastro.html (o ntfy só guarda 12 horas): guarda em cadastros.json para o administrador
{
 const t3=await (await fetch('https://ntfy.sh/radio-econtec-anuncios-q7k2m9x4-cadastro/json?poll=1&since=12h')).text();
 let cad=[];try{cad=JSON.parse(fs.readFileSync('cadastros.json','utf8'))}catch{}
 const ids=new Set(cad.map(c=>c.id));const s=(v,n)=>String(v||'').slice(0,n);let novos=0;
 for(const ln of t3.split('\n')){if(!ln.trim())continue;let m;try{m=JSON.parse(ln)}catch{continue}if(m.event!=='message'||ids.has(m.id))continue;
  let p;try{p=m.attachment?await (await fetch(m.attachment.url)).json():JSON.parse(m.message)}catch{continue}
  if(!p||typeof p.nome!=='string'||!p.nome.trim())continue;
  const logo=typeof p.logo==='string'&&/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(p.logo)&&p.logo.length<120000?p.logo:'';
  cad.push({id:m.id,ts:m.time*1000,nome:s(p.nome,60),zap:s(String(p.zap||'').replace(/\D/g,''),15),mail:s(p.mail,80),ig:s(p.ig,60),tt:s(p.tt,60),desc:s(p.desc,220),video:s(p.video,200),quem:s(p.quem,50),txt:s(p.txt,400),logo});ids.add(m.id);novos++}
 cad=cad.filter(c=>Date.now()-c.ts<120*864e5).sort((a,b)=>a.ts-b.ts).slice(-300);
 if(novos){fs.writeFileSync('cadastros.json','[\n'+cad.map(c=>' '+JSON.stringify(c)).join(',\n')+'\n]\n');console.log('cadastros novos',novos)}
}

// nome limpo (sem emoji) e "Para Fulano" escrito no nome vira oferecimento — igual ao index.html
const limpaN=s=>String(s||'').replace(/[^\p{L}\p{N} ,'.!?-]/gu,' ').trim().replace(/\s+/g,' ');
const quemPara=p=>{let nome=limpaN(p.nome),para=limpaN(p.para);const m=!para&&nome.match(/^(?:para|pra)\s+(.+)$/i);if(m){para=m[1];nome='Ouvinte'}if(!nome)nome='Ouvinte';return {nome,para}};
// Nome do ouvinte na voz da locutora (Francisca): "Esse pedido é do ouvinte especial Maria!" gerado sozinho quando chega o pedido
{
 const {execFileSync}=await import('node:child_process');
 const fnv=t=>{let h=0x811c9dc5;for(const ch of new TextEncoder().encode(t)){h^=ch;h=Math.imul(h,0x01000193)>>>0}return h.toString(16).padStart(8,'0')};
 let mapa={};try{mapa=JSON.parse(fs.readFileSync('nomes-voz.json','utf8'))}catch{}
 fs.mkdirSync('v/pn',{recursive:true});let mudou=false;const agora=Date.now();
 let peds=[];for(const f of fs.existsSync('pedidos')?fs.readdirSync('pedidos'):[]){try{peds=peds.concat(JSON.parse(fs.readFileSync('pedidos/'+f,'utf8')))}catch{}}
 for(const p of peds){
  if(!p||agora-p.ts>6*36e5)continue;const {nome,para}=quemPara(p);
  const OK=/^[\p{L}][\p{L}\p{N} ,'.!?-]{0,59}$/u;
  if(para&&!OK.test(para))continue;
  if(!nome||(!para&&/^ouvinte$/i.test(nome))||!OK.test(nome))continue;const dito=pronuncia(tituloNome(nome.replace(/[!?.,\s]+$/,''))),ditoP=para?pronuncia(tituloNome(para.replace(/[!?.,\s]+$/,''))):'';
  const par=p.tr&&p.tr.parecida?1:0,k=fnv(nome.toLowerCase()+'|'+par+(para?'|'+para.toLowerCase():'')),f='v/pn/'+k+'.mp3';
  if(mapa[k]&&mapa[k].v===3&&fs.existsSync(f))continue;
  const semNome=/^ouvinte$/i.test(nome),resto=par?'Não encontramos exatamente a música pedida, então separamos uma bem parecida, aqui na Rádio Econtéc.':'Fique agora com essa música, aqui na Rádio Econtéc.';
  const txt=para?(semNome?`Essa música vai oferecida com muito carinho para ${ditoP}! ${resto}`:`Esse pedido é do ouvinte especial ${dito}, que oferece essa música com muito carinho para ${ditoP}! ${resto}`):par?`Esse pedido é do ouvinte especial ${dito}! Não encontramos exatamente a música que você pediu, então separamos uma bem parecida pra você, aqui na Rádio Econtéc.`:`Esse pedido é do ouvinte especial ${dito}! Muito obrigada pelo carinho. Fique agora com a sua música, aqui na Rádio Econtéc.`;
  try{execFileSync('edge-tts',['--voice','pt-BR-FranciscaNeural','--rate=+4%','--text',txt,'--write-media',f],{stdio:'pipe',timeout:60000});
   const bytes=fs.statSync(f).size;if(bytes<2000)throw new Error('áudio vazio');
   mapa[k]={url:f+'?3',dur:Math.round(bytes*8/48000*10)/10,v:3};mudou=true;console.log('nome gerado',nome,mapa[k].dur+'s')}
  catch(e){console.log('nome falhou',nome,e.message)}
 }
 if(mudou||!fs.existsSync('nomes-voz.json'))fs.writeFileSync('nomes-voz.json',JSON.stringify(mapa)+'\n');
}

// Horários especiais (pedido 25/11): 6h oração da manhã + Pai Nosso, 18h agradecimento + Pai Nosso, 20h Hora da Piada.
// Voz MASCULINA grave (Antonio, Microsoft neural). Textos em especiais.json; piadas dos ouvintes chegam pelo ntfy e passam pelo mesmo filtro do site.
{
 const {execFileSync}=await import('node:child_process');
 const fnv=t=>{let h=0x811c9dc5;for(const ch of new TextEncoder().encode(t)){h^=ch;h=Math.imul(h,0x01000193)>>>0}return h.toString(16).padStart(8,'0')};
 const VOZ='pt-BR-AntonioNeural',REZA=['--rate=-12%','--pitch=-10Hz'],PIADA=['--rate=+0%','--pitch=-6Hz'];
 let E={};try{E=JSON.parse(fs.readFileSync('especiais.json','utf8'))}catch{}
 let M={};try{M=JSON.parse(fs.readFileSync('especiais-voz.json','utf8'))._m||{}}catch{}
 let PO=[];try{PO=JSON.parse(fs.readFileSync('piadas-ouvintes.json','utf8'))}catch{}
 // filtro de palavras: o mesmo do site (lido do index.html)
 const html=fs.readFileSync('index.html','utf8'),arr=n=>{const m=html.match(new RegExp('const '+n+'=(\\[[^\\]]*\\])'));try{return JSON.parse(m[1].replace(/'/g,'"'))}catch{return[]}};
 const BLOQ=arr('BLOQ'),EXATAS=arr('EXATAS'),nrm=s=>String(s).normalize('NFD').replace(/[̀-ͯ]/g,'').toLowerCase();
 const ofensivo=t=>{const w=nrm(t).split(/[^a-z0-9]+/).filter(Boolean),full=' '+w.join(' ')+' ';return BLOQ.some(b=>b.includes(' ')?full.includes(' '+b):w.some(x=>x.startsWith(b)))||w.some(x=>EXATAS.includes(x))};
 let mudouPO=false;
 try{const t=await (await fetch('https://ntfy.sh/'+TOP.replace('anuncios','piadas')+'/json?poll=1&since=24h',{signal:AbortSignal.timeout(15000)})).text();const ids=new Set(PO.map(p=>p.id));
  for(const ln of t.split('\n')){if(!ln.trim())continue;let m;try{m=JSON.parse(ln)}catch{continue}if(m.event!=='message'||ids.has(m.id))continue;
   let p;try{p=JSON.parse(m.message)}catch{continue}const nome=String(p.nome||'').replace(/[^\p{L}\p{N} ,'.!?-]/gu,' ').replace(/\s+/g,' ').trim().slice(0,40)||'Ouvinte',txt=String(p.txt||'').replace(/\s+/g,' ').trim().slice(0,400);
   if(txt.length<15||ofensivo(nome+' '+txt))continue;PO.push({id:m.id,ts:m.time*1000,nome,txt});ids.add(m.id);mudouPO=true}}catch(e){console.log('piadas ntfy falhou',e.message)}
 const antes=PO.length;PO=PO.filter(p=>Date.now()-p.ts<14*864e5);if(PO.length!==antes)mudouPO=true;
 if(mudouPO)fs.writeFileSync('piadas-ouvintes.json',JSON.stringify(PO)+'\n');
 fs.mkdirSync('v/es',{recursive:true});const t0=Date.now();let mudou=false,feitos=0;const usados=new Set();
 const salvaM=()=>{let j={};try{j=JSON.parse(fs.readFileSync('especiais-voz.json','utf8'))}catch{}j._m=M;fs.writeFileSync('especiais-voz.json',JSON.stringify(j)+'\n')};
 const gera=(txt,op)=>{const k=fnv(VOZ+op.join('')+'|'+txt),f='v/es/'+k+'.mp3';usados.add(f);if(M[k]&&fs.existsSync(f))return;
  if(fs.existsSync(f)&&fs.statSync(f).size>2000){M[k]={url:f+'?1',dur:Math.round(fs.statSync(f).size*8/48000*10)/10};mudou=true;salvaM();return}
  if(Date.now()-t0>100000||process.uptime()>170||feitos>=25)return;
  try{execFileSync('edge-tts',['--voice',VOZ,...op,'--text',pronuncia(falaNatural(txt)),'--write-media',f],{stdio:'pipe',timeout:25000});const bytes=fs.statSync(f).size;if(bytes<2000)throw new Error('áudio vazio');
   M[k]={url:f+'?1',dur:Math.round(bytes*8/48000*10)/10};mudou=true;feitos++;salvaM()}catch(e){console.log('especial falhou',e.message);try{fs.unlinkSync(f)}catch{}}};
 const lista=(L,op)=>(Array.isArray(L)?L:[L]).forEach(x=>gera(x,op));
 for(const c of ['manhaAbre','manha','paiNosso','manhaFecha','tardeAbre','tarde','tardeFecha'])lista(E[c]||[],REZA);
 for(const c of ['piadaAbre','piadaFecha','piadas'])lista(E[c]||[],PIADA);
 for(const p of PO){const dito=p.nome==='Ouvinte'?'de um ouvinte':'do ouvinte '+tituloNome(p.nome);p.fala=`Essa piada é ${dito}: ${p.txt}`;gera(p.fala,PIADA)}
 // o site lê só especiais-voz.json: cada lista na mesma ordem de especiais.json, null = ainda gerando
 const ach=(txt,op)=>M[fnv(VOZ+op.join('')+'|'+txt)]||null;
 const S={v:1};for(const c of ['manhaAbre','manha','manhaFecha','tardeAbre','tarde','tardeFecha'])S[c]=(E[c]||[]).map(x=>ach(x,REZA));S.paiNosso=E.paiNosso?ach(E.paiNosso,REZA):null;
 for(const c of ['piadaAbre','piadaFecha','piadas'])S[c]=(E[c]||[]).map(x=>ach(x,PIADA));
 S.ouvintes=PO.map(p=>{const a=ach(p.fala,PIADA);return a?{id:p.id,ts:p.ts,nome:p.nome,txt:p.txt,url:a.url,dur:a.dur}:null}).filter(Boolean);
 const keep={};for(const [k,x] of Object.entries(M))if(usados.has(x.url.split('?')[0]))keep[k]=x;
 for(const f of fs.readdirSync('v/es'))if(!usados.has('v/es/'+f)){fs.unlinkSync('v/es/'+f);mudou=true}
 let antigo='';try{antigo=fs.readFileSync('especiais-voz.json','utf8')}catch{}
 const novo=JSON.stringify(Object.assign({},S,{_m:keep}))+'\n';if(novo!==antigo){fs.writeFileSync('especiais-voz.json',novo);console.log('especiais: gerados',feitos)}
}

// Ao vivo compartilhado: guarda no site os "Pular" do administrador (assinados), para quem entrar depois ouvir o mesmo ao vivo
{
 const t=await (await fetch('https://ntfy.sh/'+TOP+'-aovivo/json?poll=1&since=12h')).text();
 let av={pulos:{}};try{av=JSON.parse(fs.readFileSync('aovivo.json','utf8'))}catch{}
 let mudou=false;
 for(const ln of t.split('\n')){if(!ln.trim())continue;let m;try{m=JSON.parse(ln)}catch{continue}if(m.event!=='message')continue;
  try{const env=JSON.parse(m.message);let ok=false;for(const key of keys)if(await crypto.subtle.verify({name:'ECDSA',hash:'SHA-256'},key,Buffer.from(env.s,'base64'),new TextEncoder().encode(env.p))){ok=true;break}if(!ok)continue;
   const o=JSON.parse(env.p),x=o&&o.pulo;
   if(o&&o.post&&typeof o.post.id==='string'&&!(av.posts||{})[o.post.id]){const q=o.post;av.posts=av.posts||{};
    if(['yt','live','mp3','mp4'].includes(q.tipo)&&+q.ini>0&&+q.dur>=0&&+q.dur<=6*3600){const pp={tipo:q.tipo,titulo:String(q.titulo||'').slice(0,80),ini:+q.ini,dur:+q.dur};
     if(q.vid&&/^[\w-]{11}$/.test(q.vid))pp.vid=q.vid;else if(typeof q.url==='string'&&/^https:\/\//.test(q.url)){pp.url=q.url;
      if(/^https:\/\/ntfy\.sh\/file\//.test(q.url)){try{const b=Buffer.from(await (await fetch(q.url)).arrayBuffer());if(b.length>1000&&b.length<16e6){fs.mkdirSync('midia',{recursive:true});const f='midia/'+q.id.replace(/[^\w-]/g,'')+'.'+(q.tipo==='mp4'?'mp4':'mp3');fs.writeFileSync(f,b);pp.url=f}}catch{}}}
     if(pp.vid||pp.url){av.posts[q.id]=pp;mudou=true}}}
   if(o&&o.fim&&typeof o.fim.id==='string'&&+o.fim.ts>0){av.fins=av.fins||{};if(!av.fins[o.fim.id]){av.fins[o.fim.id]=+o.fim.ts;mudou=true}}
   if(!x||!x.id||av.pulos[x.id]||!(+x.ms>0&&+x.ms<20*6e4)||!(+x.ts>0))continue;av.pulos[String(x.id).slice(0,40)]={ts:+x.ts,ms:Math.round(+x.ms)};mudou=true}catch{}}
 for(const [k,x] of Object.entries(av.posts||{}))if(Date.now()-x.ini>2*864e5){delete av.posts[k];if(av.fins)delete av.fins[k];mudou=true}
 if(fs.existsSync('midia'))for(const f of fs.readdirSync('midia'))if(Date.now()-fs.statSync('midia/'+f).mtimeMs>7*864e5)fs.unlinkSync('midia/'+f);
 for(const [k,x] of Object.entries(av.pulos))if(Date.now()-x.ts>2*864e5){delete av.pulos[k];mudou=true}
 if(mudou||!fs.existsSync('aovivo.json')){fs.writeFileSync('aovivo.json',JSON.stringify(av)+'\n');console.log('ao vivo: pulos',Object.keys(av.pulos).length)}
}
