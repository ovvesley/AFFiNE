import http from 'node:http';
const upstream = new URL(process.env.UPSTREAM || 'http://affine:3010');
const publicOrigin = 'https://my.ovvesley.com';
const home = '/workspace/ccacd385-c0ad-4ec0-8d09-f6922aafe014/all';
const headers = req => ({...req.headers, host: new URL(publicOrigin).host, 'x-forwarded-proto':'https'});
const redirect = (res, target) => {res.writeHead(303, {location: target, 'cache-control':'no-store'});res.end();};
async function authenticated(req) {
  if (!req.headers.cookie) return false;
  const response = await fetch(new URL('/graphql',upstream), {method:'POST', headers:{cookie:req.headers.cookie,'content-type':'application/json'},body:JSON.stringify({query:'query { currentUser { id } }'}),signal:AbortSignal.timeout(5000)});
  return !!(await response.json()).data?.currentUser?.id;
}
function loginPage(error = '') {
  return `<!doctype html><html lang="pt-BR"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Entrar · Ovvesley</title><style>body{margin:0;min-height:100vh;display:grid;place-items:center;background:#f4f5f7;font:16px system-ui;color:#20242b}main{width:min(360px,80vw);background:white;padding:36px;border-radius:16px;box-shadow:0 8px 36px #0001}h1{font-size:26px;margin:0 0 12px}p{color:#59616f;line-height:1.5}label{display:block;margin:20px 0 7px}input,button{box-sizing:border-box;width:100%;font:inherit;border-radius:8px;padding:12px}input{border:1px solid #cbd0d8}button{margin-top:24px;border:0;background:#156bd8;color:white;cursor:pointer}.error{color:#b02020}</style><main><h1>Seu workspace privado</h1><p>Entre na sua conta para acessar seus documentos.</p>${error ? '<p class="error">Não foi possível entrar. Confira seu e-mail e senha.</p>' : ''}<form method="post" action="/login"><label for="email">E-mail</label><input id="email" name="email" type="email" autocomplete="username" required><label for="password">Senha</label><input id="password" name="password" type="password" autocomplete="current-password" required><button>Entrar</button></form></main></html>`;
}
function showLogin(res,error='') {res.writeHead(error?401:200,{'content-type':'text/html; charset=utf-8','cache-control':'no-store','content-security-policy':"default-src 'none'; style-src 'unsafe-inline'; form-action 'self'; frame-ancestors 'none'",'x-content-type-options':'nosniff'});res.end(loginPage(error));}
function proxy(req,res) {
  const request = http.request(new URL(req.url,upstream),{method:req.method,headers:headers(req)},response=>{res.writeHead(response.statusCode,response.headers);response.pipe(res);});
  request.on('error',()=>{if(!res.headersSent)res.writeHead(502);res.end('Serviço indisponível');});req.pipe(request);
}
const server=http.createServer(async(req,res)=>{
  try {
    if (!req.url?.startsWith('/') || req.url.startsWith('//')) {res.writeHead(400);res.end();return;}
    if(req.url==='/health') {res.writeHead(200);res.end('ok');return;}
    if(req.url==='/login' && req.method==='POST') {
      if(req.headers.origin!==publicOrigin) {res.writeHead(403);res.end();return;}
      let body='';for await(const chunk of req){body+=chunk;if(body.length>8192){res.writeHead(413);res.end();return;}}
      const form=new URLSearchParams(body);
      const response=await fetch(new URL('/api/auth/sign-in',upstream),{method:'POST',headers:{'content-type':'application/json','x-forwarded-for':req.headers['x-forwarded-for']||req.socket.remoteAddress,host:new URL(publicOrigin).host,'x-forwarded-proto':'https'},body:JSON.stringify({email:form.get('email'),password:form.get('password')}),signal:AbortSignal.timeout(10000)});
      if(!response.ok){showLogin(res,'failed');return;}
      const cookies=response.headers.getSetCookie();if(!cookies.length){showLogin(res,'failed');return;}
      res.setHeader('set-cookie',cookies);redirect(res,home);return;
    }
    const signedIn=await authenticated(req);
    if(req.url==='/login'){if(signedIn)redirect(res,home);else showLogin(res);return;}
    if(!signedIn){if(req.method==='GET'&&req.headers.accept?.includes('text/html'))redirect(res,'/login');else{res.writeHead(401,{'content-type':'application/json','cache-control':'no-store'});res.end('{"error":"Login obrigatório"}');}return;}
    if(req.url==='/' || (/^\/workspace\//.test(req.url) && !req.url.startsWith(home.split('/all')[0]+'/'))){redirect(res,home);return;}
    proxy(req,res);
  }catch {res.writeHead(503,{'cache-control':'no-store'});res.end('Serviço temporariamente indisponível');}
});
server.on('upgrade',async(req,socket,head)=>{
  try {
    if (!req.url?.startsWith('/') || req.url.startsWith('//')) {socket.destroy();return;}
    if(!await authenticated(req)){socket.end('HTTP/1.1 401 Unauthorized\r\nConnection: close\r\n\r\n');return;}
    const request=http.request(new URL(req.url,upstream),{headers:headers(req)});
    request.on('upgrade',(response,remote,remoteHead)=>{
      socket.write(`HTTP/1.1 ${response.statusCode} ${response.statusMessage}\r\n`+Object.entries(response.headers).map(([k,v])=>`${k}: ${v}`).join('\r\n')+'\r\n\r\n');
      if(remoteHead.length)socket.write(remoteHead);if(head.length)remote.write(head);remote.pipe(socket);socket.pipe(remote);
      socket.on('error',()=>remote.destroy());remote.on('error',()=>socket.destroy());
    });
    request.on('response',()=>socket.destroy());request.on('error',()=>socket.destroy());request.end();
  }catch{socket.destroy();}
});
server.listen(3000,'0.0.0.0');
