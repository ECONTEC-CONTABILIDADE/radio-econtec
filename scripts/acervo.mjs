// Acervo grande da programação: busca no YouTube (sem cota da API) as músicas dos artistas de cada estilo,
// confere se o vídeo pode tocar fora do YouTube (oEmbed) e acrescenta em musicas.json.
// Cada música nova vale a partir de "desde" (dia), assim a programação do dia em curso nunca muda no meio.
// Também guarda as músicas pedidas pelos ouvintes (encontradas no YouTube) para entrarem na programação.
import fs from 'node:fs';
const DIA=864e5,FUSO=3*36e5;
const hoje=Math.floor((Date.now()-FUSO)/DIA);
const desde=process.argv.includes('--hoje')?hoje:hoje+1;
const POR=+(process.env.POR_ARTISTA||14);

const EST={
 'Sertanejo':['Zezé Di Camargo e Luciano','Jorge e Mateus','Henrique e Juliano','Marília Mendonça','Gusttavo Lima','Maiara e Maraisa','Luan Santana','Zé Neto e Cristiano','Ana Castela','Leonardo','Bruno e Marrone','Victor e Leo','Simone Mendes','Paula Fernandes','Hugo e Guilherme','Matheus e Kauan','Chitãozinho e Xororó','Israel e Rodolffo','Lauana Prado','Gustavo Mioto','Murilo Huff','Diego e Victor Hugo','Wesley Safadão','Fernando e Sorocaba','César Menotti e Fabiano','João Neto e Frederico','Michel Teló','Cristiano Araújo','Eduardo Costa','Daniel','Guilherme e Benuto','Clayton e Romário','Luan Pereira','Jads e Jadson','Day e Lara','Naiara Azevedo','Thaeme e Thiago','Felipe Araújo','Lucas Lucco','Munhoz e Mariano','Marcos e Belutti','Rionegro e Solimões','Milionário e José Rico','Tião Carreiro e Pardinho','Almir Sater','Sérgio Reis','Trio Parada Dura','João Paulo e Daniel','Bruno e Barretto','Hugo Henrique','Lucas Reis e Thácio','Mari Fernandez','Manu Bahtidão','Panda'],
 'Forró':['Xand Avião','Calcinha Preta','Luiz Gonzaga','Dominguinhos','João Gomes','Zé Vaqueiro','Falamansa','Mastruz com Leite','Aviões do Forró','Solange Almeida','Limão com Mel','Flávio José','Elba Ramalho','Alceu Valença','Tarcísio do Acordeon','Vitor Fernandes','Nattan','Unha Pintada','Mano Walter','Taty Girl','Raí Saia Rodada','Toca do Vale'],
 'Pagode':['Thiaguinho','Ferrugem','Péricles','Sorriso Maroto','Exaltasamba','Raça Negra','Menos é Mais','Turma do Pagode','Grupo Revelação','Molejo','Só Pra Contrariar','Belo','Pixote','Dilsinho','Mumuzinho','Harmonia do Samba','Negritude Júnior','Art Popular','Os Travessos','Jeito Moleque','Pique Novo','Imaginasamba','Rodriguinho','Suel','Vou pro Sereno'],
 'Samba':['Zeca Pagodinho','Alcione','Diogo Nogueira','Beth Carvalho','Arlindo Cruz','Fundo de Quintal','Martinho da Vila','Jorge Aragão','Paulinho da Viola','Fabiana Cozza','Xande de Pilares','Clara Nunes'],
 'MPB':['Tim Maia','Djavan','Caetano Veloso','Marisa Monte','Jorge Ben Jor','Gilberto Gil','Ana Carolina','Vanessa da Mata','Tiago Iorc','Anavitória','Lulu Santos','Elis Regina','Roberto Carlos','Milton Nascimento','Chico Buarque','Maria Gadú','Seu Jorge','Zé Ramalho','Fagner','Gal Costa','Maria Bethânia','Nando Reis','Ney Matogrosso','Erasmo Carlos','Fábio Jr.','Zélia Duncan','Céu','Rosa de Saron'],
 'Pop nacional':['Ivete Sangalo','Claudia Leitte','Anitta','Ludmilla','Iza','Pabllo Vittar','Melim','Jão','Luísa Sonza','Vitor Kley','Manu Gavassi','Sandy e Junior','Kell Smith','Gloria Groove','Lexa','Wanessa Camargo','Ana Vilela','Lagum','Atitude 67','Marina Sena','Duda Beat','Silva','Pedro Sampaio','Mc Kevinho'],
 'Rock nacional':['Legião Urbana','Os Paralamas do Sucesso','Titãs','Charlie Brown Jr','Barão Vermelho','Capital Inicial','Skank','Jota Quest','Engenheiros do Hawaii','Kid Abelha','Cazuza','Ira!','Biquini Cavadão','Detonautas','CPM 22','NX Zero','Pitty','O Rappa','Raimundos','Los Hermanos','Lobão','Rita Lee','Raul Seixas','Ultraje a Rigor','Tihuana','Fresno'],
 'Axé':['Chiclete com Banana','Banda Eva','Asa de Águia','Ivete Sangalo','Daniela Mercury','Saulo','Bell Marques','Harmonia do Samba','Psirico','Olodum','Timbalada','Netinho','Durval Lelys','Léo Santana','Parangolé','É o Tchan'],
 'Reggae nacional':['Natiruts','Armandinho','Maneva','Tribo de Jah','Ponto de Equilíbrio','Cidade Negra','Edson Gomes','Planta e Raiz','Mato Seco'],
 'Pop internacional':['Ed Sheeran','Dua Lipa','Bruno Mars','Taylor Swift','Adele','Coldplay','Harry Styles','The Weeknd','Michael Jackson','Katy Perry','Pharrell Williams','Lady Gaga','Miley Cyrus','Imagine Dragons','OneRepublic','Shakira','Maroon 5','Justin Bieber','Ariana Grande','Rihanna','Beyoncé','Billie Eilish','Sia','Sam Smith','Lewis Capaldi','Shawn Mendes','Camila Cabello','Olivia Rodrigo','John Legend','Alicia Keys','Charlie Puth','Jason Mraz','James Blunt','Backstreet Boys','Celine Dion','Mariah Carey','Elton John','Phil Collins','Madonna','Enrique Iglesias','Luis Fonsi','Ricky Martin','Pablo Alborán','Sabrina Carpenter'],
 'Rock internacional':['Queen','Bon Jovi',"Guns N' Roses",'Red Hot Chili Peppers','Oasis','U2','Linkin Park','The Beatles','Aerosmith','Scorpions','Eagles','Dire Straits','Roxette','The Police','Nirvana','Foo Fighters','Pink Floyd','Metallica','Creedence Clearwater Revival','The Rolling Stones','Green Day','The Cranberries','Bryan Adams','Simple Plan','Evanescence'],
 'Clássicos':['ABBA','Whitney Houston','Bee Gees','Earth Wind & Fire','Bob Marley','a-ha','Lionel Richie','Elvis Presley','Stevie Wonder','Tina Turner','Cyndi Lauper','George Michael','Rod Stewart','Frank Sinatra','The Carpenters','Barry White','Gloria Gaynor','Village People','Kool & The Gang','Michael Bolton','Air Supply','Chicago'],
 'Gospel':['Aline Barros','Fernandinho','Anderson Freire','Gabriela Rocha','Isadora Pompeo','Thalles Roberto','Harpa Cristã','Bruna Karla','Cassiane','Damares','Sarah Farias','Kemuel','Eyshila','Padre Fábio de Melo','Padre Marcelo Rossi','Diante do Trono','Morada','Preto no Branco','Ministério Zoe','Davi Sacer','Nívea Soares','Leonardo Gonçalves'],
};

const norm=s=>String(s||'').replace(/&/g,' e ').normalize('NFD').replace(/[̀-ͯ]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
const RUIM=/\b(turn[eê]|vlog|ingressos|ao vivo completo|show completo|dvd completo|cd completo|album completo|álbum completo|ep completo|playlist|mix|medley|as melhores|so as melhores|só as melhores|sequencia|sequência|seleção|selecao|1 hora|hora inteira|karaok|cover|reac(t|ao|ão)|entrevista|podcast|aula|tutorial|teaser|trailer|making of|bastidores|minuto|live session completa|full album|greatest hits|top \d+|acustico completo|acústico completo|remix|funk remix|slowed|speed up|8d|letra e cifra|instrumental|backing track)\b/i;
const seg=t=>{if(!t)return 0;const p=t.split(':').map(Number);return p.reduce((a,b)=>a*60+b,0)};
const limpaTit=(t,art)=>{let x=String(t).replace(/\s*[\(\[][^\)\]]*[\)\]]/g,' ').replace(/\s*\|.*$/,'').replace(/\s+(ft\.?|feat\.?|part\.?)\s.*$/i,'').replace(/\s+/g,' ').trim();
 const na=norm(art);if(x.includes(' - ')){const ps=x.split(' - ').map(s=>s.trim()).filter(Boolean);const sem=ps.filter(p=>!norm(p).includes(na)&&!na.includes(norm(p)));x=(sem.length?sem[0]:ps[ps.length-1])}
 x=x.replace(new RegExp('^'+art.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+'\\s*[-–:]\\s*','i'),'').replace(/^["“']|["”']$/g,'').trim();
 x=x.replace(/\s*[-–:]\s*$/,'').replace(/\s+(hd|4k|oficial|official)$/i,'').trim();if(/turn[eê]|vlog|an[uú]ncio|chamada|agenda|ingressos|making/i.test(x))return '';
 return x.length>1&&x.length<70?x:''};

async function busca(q){
 const r=await fetch('https://www.youtube.com/results?search_query='+encodeURIComponent(q),{signal:AbortSignal.timeout(20000),headers:{'Accept-Language':'pt-BR,pt;q=0.9','User-Agent':'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36'}});
 const t=await r.text();const i=t.indexOf('var ytInitialData = ');if(i<0)return [];
 const j=t.indexOf(';</script>',i);let d;try{d=JSON.parse(t.slice(i+20,j))}catch{return []}
 const out=[];JSON.stringify(d,(k,v)=>{if(v&&v.videoRenderer)out.push(v.videoRenderer);return v});return out}
async function embutivel(id){try{const r=await fetch('https://www.youtube.com/oembed?format=json&url=https://www.youtube.com/watch?v='+id,{signal:AbortSignal.timeout(15000)});return r.ok}catch{return false}}

let atual={lista:[]};try{atual=JSON.parse(fs.readFileSync('musicas.json','utf8'))}catch{}
const ids=new Set(atual.lista.map(x=>x[0])),chaves=new Set(atual.lista.map(x=>norm(x[1])+'|'+norm(x[2])));
// também o acervo fixo do site (index.html), para não duplicar
try{const s=fs.readFileSync('index.html','utf8');const m=s.match(/const CAT=(\[[\s\S]*?\]\]);/);for(const c of JSON.parse(m[1])){ids.add(c[0]);chaves.add(norm(c[1])+'|'+norm(c[2]))}}catch{}
const novos=[];const base=atual.lista.slice();
function salva(){if(!novos.length)return;const L=base.concat(novos);fs.writeFileSync('musicas.json','{"ts":'+Date.now()+',"lista":[\n'+L.map(x=>JSON.stringify(x)).join(',\n')+'\n]}\n')}
const add=(id,art,tit,est,dur)=>{const ch=norm(art)+'|'+norm(tit);if(ids.has(id)||chaves.has(ch))return false;ids.add(id);chaves.add(ch);novos.push([id,art,tit,est,dur,desde]);return true};

// 1) Pedidos dos ouvintes encontrados no YouTube
for(const f of fs.existsSync('pedidos')?fs.readdirSync('pedidos'):[]){let l=[];try{l=JSON.parse(fs.readFileSync('pedidos/'+f,'utf8'))}catch{}
 for(const p of l){const tr=p&&p.tr;if(!tr||tr.tipo!=='yt'||!/^[\w-]{11}$/.test(tr.id)||!tr.artista||/música do link/i.test(tr.titulo)||!(p.dur>=100&&p.dur<=420))continue;
  if(ids.has(tr.id))continue;if(RUIM.test(tr.titulo))continue;if(await embutivel(tr.id))add(tr.id,String(tr.artista).slice(0,60),String(tr.titulo).slice(0,80),String(tr.estilo&&tr.estilo!=='Pedido'?tr.estilo:'Pedidos dos ouvintes').slice(0,30),Math.round(p.dur))}}

// 2) Artistas de cada estilo (semana a semana, uma parte dos artistas, para ir renovando)
const todos=Object.entries(EST).flatMap(([e,as])=>as.map(a=>[a,e]));
const lote=process.env.FILTRO?todos.filter(([a])=>new RegExp(process.env.FILTRO,'i').test(a)):process.env.TODOS?todos:todos.filter((_,i)=>i%4===hoje%4);
let feitos=0;
async function umArtista([art,est]){
 const tenta=async q=>{for(let i=0;i<3;i++){try{const r=await busca(q);if(r.length)return r}catch(e){}await new Promise(r=>setTimeout(r,2000*(i+1)))}return []};
 let vs=[];for(const q of [art,art+' clipe oficial',art+' sucessos'])vs=vs.concat(await tenta(q));if(!vs.length){process.stdout.write(art+': falhou\n');feitos++;return}
 const na=norm(art),cands=[],vistos=new Set();
 for(const v of vs){
  const tit=v.title&&v.title.runs?v.title.runs.map(r=>r.text).join(''):'';const dono=v.ownerText&&v.ownerText.runs?v.ownerText.runs[0].text:'';
  const dur=seg(v.lengthText&&v.lengthText.simpleText);if(dur<110||dur>420||!tit||RUIM.test(tit)||vistos.has(v.videoId))continue;
  const nd=norm(dono),nt=norm(tit);if(/Ã|�/.test(tit))continue;if(!(nd.includes(na)||(nd.length>3&&na.includes(nd.replace(/ (oficial|official|vevo|tv|music|musica)$/,'')))||(nd.includes('vevo')&&nt.includes(na))||(nt.startsWith(na)&&/^[^-·|]+\s[-·|]\s/.test(tit))))continue;
  let nome=limpaTit(tit.replace(/\s·\s/,' - '),art);if(!nome||norm(nome)===na||na.includes(norm(nome)))continue;
  if(nome===nome.toUpperCase())nome=nome.toLowerCase().replace(/(^|\s)(\p{L})/gu,(m,a,b)=>a+b.toUpperCase());
  if(ids.has(v.videoId)||chaves.has(na+'|'+norm(nome)))continue;vistos.add(v.videoId);cands.push([v.videoId,nome,dur])}
 const ok=await Promise.all(cands.slice(0,POR*2).map(c=>embutivel(c[0])));let n=0;
 cands.slice(0,POR*2).forEach((c,i)=>{if(ok[i]&&n<POR&&add(c[0],art,c[1],est,c[2]))n++});
 feitos++;if(feitos%10===0)salva();process.stdout.write(`${art}: ${n}\n`)}
const fila=lote.slice();await Promise.all(Array.from({length:+(process.env.PARALELO||3)},async()=>{while(fila.length){await umArtista(fila.shift());await new Promise(r=>setTimeout(r,300))}}));

salva();
console.log('acervo: +'+novos.length+' músicas novas (total '+(base.length+novos.length)+'), artistas consultados '+feitos);
