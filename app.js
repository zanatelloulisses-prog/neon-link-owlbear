let OBR;
const CHANNEL='br.neonlink.v1/messages';
const baseNPCs=[{id:'lexi',name:'Lexi',photo:''},{id:'drake',name:'Drake',photo:''},{id:'paloma',name:'Paloma Voss',photo:''},{id:'fixer',name:'Fixer de Night City',photo:''}];
const $=id=>document.getElementById(id);
let me,players=[],isGM=false,room='',npcs=[],selected='',target='',records=[];
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const avatar=n=>n.photo||'data:image/svg+xml,'+encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="80" height="80"><rect width="80" height="80" fill="#243b55"/><text x="40" y="51" text-anchor="middle" fill="#6ce7eb" font-family="Arial" font-size="34">${esc(n.name.slice(0,1))}</text></svg>`);
const key=s=>`neonlink:${room}:${s}`;
function save(){localStorage.setItem(key('messages'),JSON.stringify(records.slice(-1000)));localStorage.setItem(key('npcs'),JSON.stringify(npcs));}
function renderContacts(){if(isGM){$('conversationList').innerHTML='';return;}$('conversationList').innerHTML=npcs.map(n=>`<div class="contact" data-id="${esc(n.id)}"><img src="${esc(avatar(n))}"><div><strong>${esc(n.name)}</strong><small>${esc(records.filter(m=>m.npc===n.id&&m.player===me.id).slice(-1)[0]?.body||'Toque para abrir conversa')}</small></div></div>`).join('');document.querySelectorAll('.contact').forEach(el=>el.onclick=()=>openChat(el.dataset.id));}
function renderChat(){let n=npcs.find(x=>x.id===selected);if(!n)return;$('chatName').textContent=n.name;$('chatSub').textContent=isGM?'Conversa privada • '+(players.find(p=>p.id===target)?.name||'Jogador'):'Canal seguro';$('avatar').src=avatar(n);const pid=isGM?target:me.id;let msgs=records.filter(m=>m.player===pid&&m.npc===selected);$('messages').innerHTML=msgs.map(m=>`<div class="bubble ${m.sender===(isGM?'GM':'PLAYER')?'mine':''}">${esc(m.body)}<small>${esc(m.sender==='GM'?n.name:(players.find(p=>p.id===m.player)?.name||'Você'))} • ${new Date(m.time).toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'})}</small></div>`).join('');$('messages').scrollTop=$('messages').scrollHeight;}
function openChat(id){selected=id;$('conversationList').hidden=true;$('chat').hidden=false;renderChat();}
function refreshTargets(){const others=players.filter(p=>p.role!=='GM');$('target').innerHTML=others.map(p=>`<option value="${esc(p.id)}">${esc(p.name)}</option>`).join('');if(!others.some(p=>p.id===target))target=others[0]?.id||'';$('target').value=target;$('npc').innerHTML=npcs.map(n=>`<option value="${esc(n.id)}">${esc(n.name)}</option>`).join('');if(!npcs.some(n=>n.id===selected))selected=npcs[0]?.id||'';$('npc').value=selected;}
function receive(data){if(!data||data.room!==room||data.type!=='MESSAGE'||!data.message)return;const m=data.message;if(!isGM&&m.player!==me.id)return;if(records.some(x=>x.id===m.id))return;records.push(m);save();renderContacts();if(selected)renderChat();}

async function start() {
  try {
    $('status').textContent = 'Carregando SDK...';

    const sdk = await Promise.race([
      import('https://esm.sh/@owlbear-rodeo/sdk@2.3.0'),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('SDK não carregou em 15 segundos')), 15000)
      )
    ]);

    OBR = sdk.default;
    $('status').textContent = 'Conectando ao Owlbear...';

    await Promise.race([
      new Promise(resolve => OBR.onReady(resolve)),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Owlbear não respondeu em 12 segundos')), 12000)
      )
    ]);
me={id:await OBR.player.getId()};isGM=(await OBR.player.getRole())==='GM';room="neonlink-room"; ;players=await OBR.party.getPlayers();npcs=JSON.parse(localStorage.getItem(key('npcs'))||'null')||baseNPCs;records=JSON.parse(localStorage.getItem(key('messages'))||'[]');$('status').textContent='● ONLINE';$('intro').textContent=isGM?'MODO MESTRE • Selecione o jogador e o NPC.':'MENSAGENS PRIVADAS • Escolha um contato.';$('gmTools').hidden=!isGM;if(isGM){refreshTargets();openChat(selected);}else renderContacts();OBR.party.onChange(p=>{players=p;if(isGM){refreshTargets();renderChat();}});OBR.broadcast.onMessage(CHANNEL,e=>receive(e.data));}catch(e){$('status').textContent='ERRO';$('intro').textContent='Abra esta extensão dentro de uma sala do Owlbear Rodeo. '+e.message;}}
$('target').onchange=e=>{target=e.target.value;renderChat()};$('npc').onchange=e=>{selected=e.target.value;renderChat()};$('refresh').onclick=async()=>{players=await OBR.party.getPlayers();refreshTargets();renderChat()};$('back').onclick=()=>{$('chat').hidden=true;$('conversationList').hidden=false;renderContacts()};$('compose').onsubmit=async e=>{e.preventDefault();let body=$('message').value.trim();if(!body||!selected)return;const player=isGM?target:me.id;if(!player){alert('Nenhum jogador selecionado.');return;}const m={id:crypto.randomUUID(),npc:selected,player,sender:isGM?'GM':'PLAYER',body,time:Date.now()};receive({type:'MESSAGE',room,message:m});$('message').value='';try{await OBR.broadcast.sendMessage(CHANNEL,{type:'MESSAGE',room,message:m});}catch(err){alert('Falha ao enviar: '+err.message)}};
$('addNpc').onclick=()=>{let name=prompt('Nome do novo NPC:')?.trim();if(!name)return;npcs.push({id:crypto.randomUUID(),name,photo:''});save();refreshTargets();selected=npcs.at(-1).id;$('npc').value=selected;renderChat()};$('editNpc').onclick=()=>{let n=npcs.find(x=>x.id===selected);if(!n)return;let name=prompt('Nome do NPC:',n.name);if(name===null)return;let photo=prompt('URL pública HTTPS da foto do NPC (deixe vazio para avatar padrão):',n.photo);if(photo===null)return;n.name=name.trim()||n.name;n.photo=/^https:\/\//i.test(photo)?photo:'';save();refreshTargets();renderChat()};
start();
