let products=[], orders=[], settings={momo:'',phone:'0559891283'};
const $=x=>document.querySelector(x);
const OWNER_PHONE='+233559891283';
function local(){return !window.db?.configured||!window.db.client}
function esc(v){return String(v??'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]))}
function toast(msg){alert(msg)}

async function requireAuth(){
  if(local()){ $('#login').classList.remove('hidden'); $('#dashboard').classList.add('hidden'); return; }
  const {data,error}=await db.client.auth.getSession();
  if(error){toast('Could not check admin session: '+error.message);return;}
  if(!data.session){$('#login').classList.remove('hidden');$('#dashboard').classList.add('hidden');return;}
  $('#login').classList.add('hidden');$('#dashboard').classList.remove('hidden');
  await load();
}

$('#loginForm').onsubmit=async e=>{
  e.preventDefault();
  if(local()) return toast('Supabase is not connected. Check config.js.');
  const rawPhone=$('#phone').value.trim().replace(/\s+/g,'');
  const phone=rawPhone.startsWith('+') ? rawPhone : (rawPhone.startsWith('0') ? '+233'+rawPhone.slice(1) : rawPhone);
  if(phone!==OWNER_PHONE)return toast('Only the owner phone number can access this dashboard.');
  const password=$('#password').value;
  const {error}=await db.client.auth.signInWithPassword({phone,password});
  if(error)return toast(error.message);
  await requireAuth();
};
$('#logout').onclick=async()=>{if(db.client)await db.client.auth.signOut();location.reload()};

async function load(){
  if(local()){
    products=JSON.parse(localStorage.zakProducts||'[]');
    orders=JSON.parse(localStorage.zakOrders||'[]');
    settings=JSON.parse(localStorage.zakSettings||'null')||settings;
  }else{
    const [p,o,s]=await Promise.all([
      db.client.from('products').select('*').order('id',{ascending:false}).limit(500),
      db.client.from('orders').select('*').order('created_at',{ascending:false}).limit(500),
      db.client.from('settings').select('*').eq('id',1).maybeSingle()
    ]);
    if(p.error){toast('Products could not load: '+p.error.message);products=[]}else products=p.data||[];
    if(o.error){toast('Orders could not load: '+o.error.message);orders=[]}else orders=o.data||[];
    if(s.error){console.warn('Settings:',s.error.message)}else if(s.data)settings=s.data;
  }
  $('#pc').textContent=products.length;
  $('#oc').textContent=orders.length;
  updateEarnings();
  $('#sf').momo.value=settings.momo||'';
  $('#sf').phone.value=settings.phone||'0559891283';
  renderProducts();renderOrders();
}
function updateEarnings(){
  $('#earn').textContent='GH₵'+orders.filter(x=>x.status==='Paid').reduce((a,x)=>a+Number(x.total||0),0).toFixed(2);
}
function renderProducts(){
  $('#products').innerHTML=products.length?products.map(p=>`<div class="admin-row">
    ${p.image?`<img src="${esc(p.image)}" alt="" style="width:72px;height:72px;object-fit:cover;border-radius:8px">`:''}
    <div style="min-width:180px;flex:1"><b>${esc(p.name)}</b><br><small>Sizes: ${esc(p.sizes||'Available')}</small></div>
    <label>Name <input id="name-${esc(p.id)}" value="${esc(p.name)}"></label>
    <label>Price GH₵ <input id="price-${esc(p.id)}" type="number" step=".01" min="0" value="${Number(p.price||0).toFixed(2)}"></label>
    <label>Sizes <input id="sizes-${esc(p.id)}" value="${esc(p.sizes||'')}"></label>
    <button class="btn" onclick="saveProduct('${esc(p.id)}')">Save</button>
    <button class="btn danger" onclick="deleteProduct('${esc(p.id)}')">Delete</button>
  </div>`).join(''):'<p>No products yet. Add clothes above and publish them.</p>';
}

async function saveProduct(id){
  const p=products.find(x=>String(x.id)===String(id));if(!p)return;
  const name=$('#name-'+id).value.trim();
  const price=Number($('#price-'+id).value);
  const sizes=$('#sizes-'+id).value.trim();
  if(!name)return toast('Product name is required.');
  if(!Number.isFinite(price)||price<0)return toast('Enter a valid price.');
  const changes={name,price,sizes};
  if(local()){
    Object.assign(p,changes);localStorage.zakProducts=JSON.stringify(products);toast('Product updated.');renderProducts();return;
  }
  const {error}=await db.client.from('products').update(changes).eq('id',id);
  if(error)return toast('Could not update product: '+error.message);
  Object.assign(p,changes);toast('Product updated. Customers will see the new details.');renderProducts();
}
window.saveProduct=saveProduct;

async function deleteImageIfPossible(imageUrl){
  if(local()||!imageUrl||!imageUrl.includes('/storage/v1/object/public/product-images/'))return;
  try{
    const marker='/storage/v1/object/public/product-images/';
    const path=decodeURIComponent(imageUrl.split(marker)[1]||'');
    if(path) await db.client.storage.from('product-images').remove([path]);
  }catch(e){console.warn('Image cleanup failed:',e)}
}

async function deleteProduct(id){
  if(!confirm('Delete this product? It will disappear from the customer shop.'))return;
  const p=products.find(x=>String(x.id)===String(id));
  if(local()){
    products=products.filter(x=>String(x.id)!==String(id));
    localStorage.zakProducts=JSON.stringify(products);
  }else{
    const {error}=await db.client.from('products').delete().eq('id',id);
    if(error)return toast('Could not delete product: '+error.message);
    await deleteImageIfPossible(p?.image);
    products=products.filter(x=>String(x.id)!==String(id));
  }
  $('#pc').textContent=products.length;renderProducts();toast('Product deleted.');
}
window.deleteProduct=deleteProduct;

function safeFileName(name){return name.toLowerCase().replace(/[^a-z0-9._-]+/g,'-').replace(/^-+|-+$/g,'')||'product'}
function fileToDataURL(file){return new Promise((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(r.result);r.onerror=reject;r.readAsDataURL(file)})}

async function uploadImage(file,id){
  if(local())return fileToDataURL(file);
  const ext=(file.name.split('.').pop()||'jpg').toLowerCase();
  const path=`products/${id}-${Date.now()}-${safeFileName(file.name)}`;
  const {error}=await db.client.storage.from('product-images').upload(path,file,{upsert:false,contentType:file.type||'image/jpeg'});
  if(error)throw new Error('Image upload failed: '+error.message+' — run the storage section in supabase.sql.');
  const {data}=db.client.storage.from('product-images').getPublicUrl(path);
  if(!data?.publicUrl)throw new Error('Could not create public image URL.');
  return data.publicUrl;
}

$('#pf').onsubmit=async e=>{
  e.preventDefault();
  const f=e.target, files=[...f.image.files];
  if(!files.length)return toast('Select one or more clothing photos.');
  const baseName=f.name.value.trim();
  if(!baseName)return toast('Enter the clothing name.');
  const price=Number(f.price.value);
  if(!Number.isFinite(price)||price<0)return toast('Enter a valid price.');
  const btn=f.querySelector('button');btn.disabled=true;btn.textContent='Publishing...';
  let added=0;
  try{
    for(const file of files){
      const id=Date.now()+Math.floor(Math.random()*1000000);
      const cleanFile=file.name.replace(/\.[^.]+$/,'');
      const name=files.length===1?baseName:`${baseName} - ${cleanFile}`;
      const image=await uploadImage(file,id);
      const product={id,name,price,sizes:f.sizes.value.trim(),image};
      if(local()){
        products.push(product);localStorage.zakProducts=JSON.stringify(products);
      }else{
        const {error}=await db.client.from('products').insert(product);
        if(error)throw new Error('Saving product failed: '+error.message);
        products.push(product);
      }
      added++;
    }
    f.reset();$('#pc').textContent=products.length;renderProducts();
    toast(`${added} product${added===1?'':'s'} published successfully. They are now available on the customer website.`);
  }catch(err){toast(err.message||String(err));}
  finally{btn.disabled=false;btn.textContent='Publish Products';}
};

$('#sf').onsubmit=async e=>{
  e.preventDefault();
  const data=Object.fromEntries(new FormData(e.target));data.phone=data.phone?.trim()||'0559891283';
  if(local()){localStorage.zakSettings=JSON.stringify(data);settings=data;toast('Settings saved locally.');return;}
  const {error}=await db.client.from('settings').upsert({id:1,...data});
  if(error)return toast('Could not save settings: '+error.message);
  settings={...settings,...data};toast('Owner settings saved.');
};

function renderOrders(){
  $('#orders').innerHTML=orders.length?orders.map(x=>`<div class="admin-row"><b>${esc(x.id)}</b> — ${esc(x.name)} — GH₵${Number(x.total||0).toFixed(2)}<br>${esc(x.phone)} • ${esc(x.location)} • ${esc(x.status)} ${x.status!=='Paid'?`<button class="btn" onclick="paid('${esc(x.id)}')">Confirm Payment</button>`:''}</div>`).join(''):'No orders yet.';
}
async function paid(id){
  if(local()){const x=orders.find(a=>a.id==id);if(x)x.status='Paid';localStorage.zakOrders=JSON.stringify(orders)}
  else{const {error}=await db.client.from('orders').update({status:'Paid'}).eq('id',id);if(error)return toast(error.message);const x=orders.find(a=>a.id==id);if(x)x.status='Paid'}
  renderOrders();updateEarnings();
}
window.paid=paid;

requireAuth();
