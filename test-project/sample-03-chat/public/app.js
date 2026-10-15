const socket=io();
const username=document.getElementById('username');
const room=document.getElementById('room');
const enterBtn=document.getElementById('enterBtn');
const login=document.getElementById('login');
const chat=document.getElementById('chat');
const onlineUsers=document.getElementById('onlineUsers');
const messages=document.getElementById('messages');
const typing=document.getElementById('typing');
const messageInput=document.getElementById('messageInput');
const sendBtn=document.getElementById('sendBtn');
let user,roomName;
enterBtn.onclick=()=>{user=username.value;roomName=room.value;login.style.display='none';chat.style.display='block';socket.emit('join',{user,room:roomName});fetch(`/api/history/${roomName}`).then(r=>r.json()).then(ms=>ms.forEach(m=>addMsg(m)));};
sendBtn.onclick=sendMsg;messageInput.onkeydown=e=>{if(e.key==='Enter'){sendMsg();e.preventDefault();}};
function sendMsg(){const text=messageInput.value.trim();if(text){socket.emit('send',{text});messageInput.value='';}}
socket.on('message',addMsg);
function addMsg(m){const div=document.createElement('div');div.textContent=`${m.user}: ${m.text}`;messages.appendChild(div);}
socket.on('typing',d=>{typing.textContent=`${d.user} is typing...`;setTimeout(()=>typing.textContent='',2000);});
socket.on('presence',list=>{onlineUsers.textContent='Online: '+list.join(', ');});
