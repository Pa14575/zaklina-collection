const defaults=[{id:1,name:'Classic Dress',price:180,image:'',sizes:'S, M, L, XL'},{id:2,name:'Elegant Top',price:95,image:'',sizes:'S, M, L'},{id:3,name:'Stylish Trousers',price:140,image:'',sizes:'M, L, XL'}];
let products=[],cart=JSON.parse(localStorage.zakCart||'[]'),settings={momo:'',phone:'0559891283'};
const $=x=>document.querySelector(x),money=n=>'GH₵'+Number(n).toFixed(2);
async function loadData(){
  if(window.db?.configured&&window.db.client){
    const [{data:p,error:pe},{data:s,error:se}]=await Promise.all([
      db.client.from('products').select('*').order('id',{ascending:false}).limit(500),db.client.from('settings').select('*').eq('id',1).maybeSingle()
    ]);
    if(pe){ console.error('Products load error:', pe); products=[]; $('#products').innerHTML='<p>We could not load the clothes right now. Please refresh the page.</p>'; } else { products=p||[]; }
    if(!se&&s) settings={...settings,...s};
  } else { products=JSON.parse(localStorage.zakProducts||'null')||defaults; settings=JSON.parse(localStorage.zakSettings||'null')||settings; }
  $('#callOwner').href='tel:'+String(settings.phone||'0559891283').replace(/[^+\d]/g,'');
  render();cartRender();
}
function save(){localStorage.zakCart=JSON.stringify(cart)}
async function refreshFromDatabase(){
  if(!(window.db?.configured&&window.db.client)) return;
  const {data,error}=await db.client.from('products').select('*').order('id');
  if(error){console.error('Could not refresh products:',error);return;}
  products=data||[];
  // Re-price existing cart items from the database and remove products that no longer exist.
  cart=cart.filter(c=>products.some(p=>String(p.id)===String(c.id))).map(c=>{
    const p=products.find(x=>String(x.id)===String(c.id));
    return {...c,...p,qty:c.qty};
  });
  save();
  render();
  cartRender();
}
function render(){let q=($('#search').value||'').toLowerCase();$('#products').innerHTML=products.filter(p=>String(p.name||'').toLowerCase().includes(q)).map(p=>`<article class="product"><img src="${p.image||'https://placehold.co/600x630?text=Clothing'}"><div><h3>${p.name}</h3><p class="price">${money(p.price)}</p><small>Sizes: ${p.sizes||'Available'}</small><button class="add" onclick="add('${p.id}')">Add to Cart</button></div></article>`).join('')||(q?'<p>No clothes match your search.</p>':'<p>No clothes are available yet. Please check back soon.</p>')}
function add(id){let p=products.find(x=>String(x.id)===String(id)),i=cart.find(x=>String(x.id)===String(id));i?i.qty++:cart.push({...p,qty:1});save();cartRender();$('#cart').classList.add('open')}
function cartRender(){$('#cartCount').textContent=cart.reduce((a,x)=>a+x.qty,0);$('#items').innerHTML=cart.length?cart.map(x=>`<p><b>${x.name}</b> × ${x.qty} — ${money(x.price*x.qty)} <button onclick="chg('${x.id}',-1)">−</button> <button onclick="chg('${x.id}',1)">+</button></p>`).join(''):'<p>Your cart is empty.</p>';$('#total').textContent=money(cart.reduce((a,x)=>a+x.price*x.qty,0))}
function chg(id,d){let x=cart.find(a=>String(a.id)===String(id));if(!x)return;x.qty+=d;if(x.qty<1)cart=cart.filter(a=>String(a.id)!==String(id));save();cartRender()}
$('#search').oninput=render;$('#cartOpen').onclick=()=>$('#cart').classList.add('open');$('#cartClose').onclick=()=>$('#cart').classList.remove('open');$('#checkout').onclick=async()=>{if(!cart.length)return alert('Your cart is empty');await refreshFromDatabase();if(!cart.length)return alert('This product is no longer available.');$('#cart').classList.remove('open');$('#checkoutModal').classList.add('open')};$('#coClose').onclick=()=>$('#checkoutModal').classList.remove('open');$('#payClose').onclick=()=>$('#payModal').classList.remove('open');
$('#orderForm').onsubmit=async e=>{e.preventDefault();let data=Object.fromEntries(new FormData(e.target)),total=cart.reduce((a,x)=>a+x.price*x.qty,0),order={id:'ZK'+Date.now(),...data,items:cart,total,status:'Awaiting payment confirmation'};
  if(window.db?.configured&&window.db.client){const {error}=await db.client.from('orders').insert(order);if(error)return alert('Could not submit order: '+error.message)} else {let orders=JSON.parse(localStorage.zakOrders||'[]');orders.push(order);localStorage.zakOrders=JSON.stringify(orders)}
  $('#checkoutModal').classList.remove('open');$('#amount').textContent=money(total);$('#momo').textContent=settings.momo||'Owner has not set the MTN number yet';$('#payCall').href='tel:'+String(settings.phone||'0559891283').replace(/[^+\d]/g,'');$('#payModal').classList.add('open');cart=[];save();cartRender();};
loadData();
setInterval(refreshFromDatabase,15000);
document.addEventListener('visibilitychange',()=>{if(!document.hidden)refreshFromDatabase();});
