import { CONFIG } from './config.js';
import { createEngine } from './engine.js';
import { isInsideMoron } from './territory.js';
import { INCIDENT_CATEGORIES } from './incident-categories.js';
import { mountAddressSearch } from './address-search.js';
const $=selector=>document.querySelector(selector);
let csrf=null, setupRequired=false, setupToken=new URLSearchParams(location.hash.slice(1)).get('setup'), engine, selected=null, current=null, draftId=crypto.randomUUID(), preparedPhoto=null, photoPreparing=null, photoRevision=0, previewURL=null;
const announce=message=>{ $('#admin-status').textContent=message; };
async function request(path,options={}) {
  const headers=new Headers(options.headers); headers.set('X-Moron-Request','1');
  if(csrf)headers.set('X-Moron-CSRF',csrf);
  const response=await fetch(path,{...options,headers,credentials:'same-origin',signal:AbortSignal.timeout(30000)});
  const raw=await response.text();
  let data={};
  try{data=raw?JSON.parse(raw):{};}catch{
    const error=new Error(`El servidor devolvió una respuesta inválida (HTTP ${response.status}).`);error.status=response.status;throw error;
  }
  if(!response.ok){ const error=new Error(data.error||'No se pudo completar la operación.');error.status=response.status;throw error; }
  return data;
}
function showAuth(data={}) {
  setupRequired=!!data.setupRequired;
  $('#admin-auth').hidden=false;$('#admin-workspace').hidden=true;$('#logout').hidden=true;
  $('#auth-form').hidden=setupRequired&&!setupToken;
  $('#auth-title').textContent=setupRequired?'Elegí tu contraseña':'Administración';
  $('#auth-description').textContent=setupRequired?(setupToken?'Esta contraseña te permitirá publicar y editar incidentes. Usá al menos 14 caracteres.':'La administración todavía no fue activada. Necesitás el enlace privado de activación.'):'Ingresá con la contraseña de administración.';
  $('#confirm-password-row').hidden=!setupRequired;$('#confirm-password').required=setupRequired;
  $('#admin-password').minLength=setupRequired?14:1;$('#admin-password').autocomplete=setupRequired?'new-password':'current-password';
  $('#auth-submit').textContent=setupRequired?'Crear contraseña y entrar':'Ingresar';
}
function handleError(error) {
  announce(error.name==='TimeoutError'?'No se pudo confirmar el guardado. Actualizá la lista antes de intentar otra vez.':error.message);
  if(error.status===401){csrf=null;showAuth();$('#auth-status').textContent='Tu sesión terminó. Ingresá otra vez; el formulario conserva tus cambios.';}
}
$('#auth-form').addEventListener('submit',async event=>{
  event.preventDefault();$('#auth-submit').disabled=true;$('#auth-status').textContent='Comprobando…';
  try{
    const password=$('#admin-password').value;
    if(setupRequired&&password!==$('#confirm-password').value)throw new Error('Las contraseñas no coinciden.');
    const data=await request(setupRequired?'/api/admin/setup.php':'/api/admin/login.php',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({password,setupToken})});
    csrf=data.csrf;setupToken=null;history.replaceState(null,'',location.pathname);$('#auth-form').reset();$('#auth-status').textContent='';await openAdmin();
  }catch(error){$('#auth-status').textContent=error.message;}finally{$('#auth-submit').disabled=false;}
});
$('#logout').addEventListener('click',async()=>{try{await request('/api/admin/logout.php',{method:'POST'});csrf=null;showAuth();}catch(error){handleError(error);}});
function setPoint(center, recenter=true) {
  if(!isInsideMoron(center)){announce('Elegí un punto dentro del partido de Morón.');return;}
  selected=center;engine?.setSearchLocation(center,'Ubicación del incidente');
  if(recenter)engine?.flyTo(center,17);
  $('#selected-coordinates').textContent=`Punto seleccionado: ${center[1].toFixed(6)}, ${center[0].toFixed(6)}. Comprobá que corresponda a la dirección.`;
}
async function initMap() {
  if(engine){engine.resize();return;}
  try{
    engine=await createEngine({...CONFIG,compactView:true,minZoom:10.5,incidentsUrl:'',footprints:{...CONFIG.footprints,enabled:false}},announce,()=>{});
    document.body.classList.add('territory-ready');$('#admin-map-loading').hidden=true;
    engine.onMapClick(center=>setPoint(center,false));engine.home();
    $('#admin-zoom-in').addEventListener('click',()=>engine.zoomBy(1));$('#admin-zoom-out').addEventListener('click',()=>engine.zoomBy(-1));$('#admin-map-home').addEventListener('click',()=>engine.home());
    window.addEventListener('resize',()=>engine.resize());if(selected)setPoint(selected);
  }catch{$('#admin-map-loading').textContent='No se pudo cargar el mapa. Podés elegir una dirección con el buscador.';}
}
mountAddressSearch({form:$('#admin-search'),input:$('#admin-search-query'),results:$('#admin-search-results'),status:$('#admin-search-status'),onSelect:place=>{$('#incident-address').value=place.address;setPoint(place.center);}});
for(const category of INCIDENT_CATEGORIES){const option=document.createElement('option');option.value=category.id;option.textContent=category.label;$('#incident-category').append(option);}
async function openAdmin() {
  $('#admin-auth').hidden=true;$('#admin-workspace').hidden=false;$('#logout').hidden=false;
  await Promise.all([loadRecords(),initMap()]);
}
async function loadRecords() {
  $('#refresh-records').disabled=true;
  try{
    const data=await request('/api/admin/incidents.php'); const root=$('#incident-records');root.replaceChildren();$('#record-count').textContent=data.features.length;
    if(!data.features.length){const empty=document.createElement('p');empty.className='records-empty';empty.textContent='Todavía no hay incidentes. Cargá el primero con una dirección y una foto.';root.append(empty);}
    for(const feature of data.features){
      const button=document.createElement('button');button.type='button';button.className='record-card';
      const title=document.createElement('strong');title.textContent=feature.properties.title;
      const address=document.createElement('span');address.textContent=feature.properties.address;
      const meta=document.createElement('span');meta.className='record-meta';meta.textContent=`${feature.properties.status==='active'?'Activo':'Resuelto'} · ${feature.properties.category}`;
      button.append(title,address,meta);button.addEventListener('click',()=>edit(feature));root.append(button);
    }
    return data;
  }catch(error){handleError(error);}finally{$('#refresh-records').disabled=false;}
}
function resetPhoto(url=null,preserveSelection=false) {
  photoRevision++;preparedPhoto=null;photoPreparing=null;if(!preserveSelection)$('#incident-photo').value='';
  if(previewURL){URL.revokeObjectURL(previewURL);previewURL=null;}
  $('#photo-preview').hidden=!url;if(url)$('#photo-preview').src=url;else $('#photo-preview').removeAttribute('src');
}
function edit(feature) {
  current=feature;selected=feature.geometry.coordinates;const p=feature.properties;
  $('#incident-title').value=p.title;$('#incident-category').value=p.categoryId;$('#incident-status').value=p.status;$('#incident-address').value=p.address;$('#incident-description').value=p.description;
  $('#admin-search-query').value=p.address;$('#editor-title').textContent='Editar incidente';$('#save-incident').textContent='Guardar cambios';$('#archive-incident').hidden=false;$('#incident-photo').required=false;
  resetPhoto(p.photoUrl);setPoint(selected);announce('Editando el incidente seleccionado.');$('#editor-title').scrollIntoView({block:'start',behavior:'smooth'});
}
function newIncident() {
  current=null;selected=null;engine?.clearSearchLocation();draftId=crypto.randomUUID();$('#incident-form').reset();$('#admin-search').reset();$('#admin-search-results').hidden=true;$('#admin-search-status').textContent='';resetPhoto();
  $('#incident-photo').required=true;$('#editor-title').textContent='Nuevo incidente';$('#save-incident').textContent='Publicar incidente';$('#archive-incident').hidden=true;$('#selected-coordinates').textContent='Buscá una dirección o tocá el punto del incidente en el mapa.';announce('Listo para cargar un nuevo incidente.');
}
$('#new-incident').addEventListener('click',newIncident);$('#refresh-records').addEventListener('click',loadRecords);
$('#incident-address').addEventListener('input',()=>{selected=null;engine?.clearSearchLocation();$('#selected-coordinates').textContent='La dirección cambió. Volvé a elegir el punto con el buscador o el mapa.';});
async function preparePhoto(file) {
  if(!['image/jpeg','image/png','image/webp'].includes(file.type)||file.size>15*1024*1024)throw new Error('Elegí una foto JPG, PNG o WebP de hasta 15 MB.');
  const bitmap=await createImageBitmap(file);const scale=Math.min(1,1600/Math.max(bitmap.width,bitmap.height));
  const canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.round(bitmap.width*scale));canvas.height=Math.max(1,Math.round(bitmap.height*scale));
  const context=canvas.getContext('2d');context.fillStyle='#fff';context.fillRect(0,0,canvas.width,canvas.height);context.drawImage(bitmap,0,0,canvas.width,canvas.height);bitmap.close();
  const blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/jpeg',.82));
  if(!blob||blob.size>2*1024*1024)throw new Error('La foto pesa demasiado. Elegí una imagen más pequeña.');
  return new File([blob],'foto-incidente.jpg',{type:'image/jpeg'});
}
$('#incident-photo').addEventListener('change',()=>{
  const file=$('#incident-photo').files[0];resetPhoto(current?.properties.photoUrl,true);if(!file)return;
  const revision=photoRevision;announce('Preparando foto…');
  photoPreparing=preparePhoto(file).then(photo=>{if(revision!==photoRevision)return;preparedPhoto=photo;previewURL=URL.createObjectURL(photo);$('#photo-preview').src=previewURL;$('#photo-preview').hidden=false;announce('Foto lista para publicar.');}).catch(error=>{if(revision===photoRevision){$('#incident-photo').value='';announce(error.message);}});
});
$('#incident-form').addEventListener('submit',async event=>{
  event.preventDefault();if(!selected){announce('Elegí la ubicación del incidente antes de guardar.');$('#admin-search-query').focus();return;}
  $('#incident-fields').disabled=true;
  try{
    if(photoPreparing)await photoPreparing;
    if(!current&&!preparedPhoto)throw new Error('Agregá una foto válida antes de publicar.');
    const body=new FormData();body.set('data',JSON.stringify({id:current?.id||draftId,version:current?.properties.version,title:$('#incident-title').value,categoryId:$('#incident-category').value,address:$('#incident-address').value,description:$('#incident-description').value,status:$('#incident-status').value,longitude:selected[0],latitude:selected[1]}));
    if(preparedPhoto)body.set('photo',preparedPhoto);
    const incidentUrl=current
      ? `/api/admin/incidents.php?id=${encodeURIComponent(current.id)}`
      : '/api/admin/incidents.php';
    const incidentHeaders=current?{'X-HTTP-Method-Override':'PATCH'}:{};
    const data=await request(incidentUrl,{method:'POST',headers:incidentHeaders,body});
    await loadRecords();edit(data.feature);announce(data.feature.properties.status==='active'?'Incidente guardado. Ya está disponible en el mapa.':'Incidente guardado como resuelto. No aparece entre los avisos activos.');
  }catch(error){handleError(error);}finally{$('#incident-fields').disabled=false;}
});
$('#archive-incident').addEventListener('click',async()=>{
  if(!current||!confirm('¿Retirar este incidente del mapa y de la lista de administración?'))return;
  $('#incident-fields').disabled=true;
  try{
    await request(`/api/admin/incidents.php?id=${encodeURIComponent(current.id)}`,{method:'POST',headers:{'X-HTTP-Method-Override':'DELETE'}});
    newIncident();await loadRecords();announce('Incidente retirado.');
  }catch(error){handleError(error);}finally{$('#incident-fields').disabled=false;}
});
try{const data=await request('/api/admin/session.php');if(data.authenticated){csrf=data.csrf;await openAdmin();}else showAuth(data);}catch(error){$('#auth-description').textContent='No se pudo conectar con la administración. Recargá la página para volver a intentar.';$('#auth-status').textContent=error.message;}
