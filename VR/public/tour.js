/* Original Bagwan panoramas and learning text, rendered entirely from local files. */
(async () => {
  'use strict';
  const status = document.getElementById('tour-status');
  const panel = document.getElementById('room-information');
  const content = document.getElementById('info-items');
  const title = document.getElementById('info-title');
  const select = document.getElementById('room-select');
  const names = id => id.replace(/([a-z])([A-Z])/g,'$1 $2');
  try {
    const data = await fetch('static_assets/hello-world.json').then(r => {if(!r.ok)throw Error('Tour content could not be loaded.');return r.json();});
    const unavailable = new Set(await fetch('static_assets/unavailable.json').then(r=>r.json()));
    const scenes = data.scenes.filter(s => s.id && s.id !== 'Test');
    const byId = Object.fromEntries(scenes.map(s => [s.id,s]));
    const available = new Set(scenes.filter(s=>s.photopanos?.[0]?.src && !unavailable.has(s.photopanos[0].src.replace(/^\//,''))).map(s=>s.id));
    const aliases = {Myotheraphy:'Myotherapy',MyotherapyClinic:'Myotherapy',Rehabilitation:'RehabilitationClinic',Logisitics:'Logistics',NursesStation:'NurseStation',Specimenreception:'SpecimenReception'};
    const requested = decodeURIComponent(location.hash.slice(1));
    const first = available.has(requested) ? requested : available.has(aliases[requested]) ? aliases[requested] : 'Entrance';
    let current = first;
    const uniqueInfos = scene => [...new Map((scene.infos || []).map(info => [JSON.stringify(info.card),info])).values()];
    const showCard = info => {
      panel.hidden = false; content.replaceChildren(); title.textContent = '';
      for (const part of info.card || []) {
        if (part.type === 'header') title.textContent = part.txt;
        else if (part.type === 'image' && part.src && !unavailable.has(part.src.replace(/^\//,''))) {
          const image = document.createElement('img'); image.src = 'static_assets/' + part.src.replace(/^\//,''); image.alt = ''; image.onerror = () => image.remove(); content.append(image);
        } else if (part.type === 'content') {
          const paragraph = document.createElement('p'); paragraph.textContent = part.txt; content.append(paragraph);
        } else if (part.type === 'row') {
          for (const item of part.buttons || []) {
            if (!item.uri || /youtu(?:be\.com|\.be)/i.test(item.uri)) continue;
            const a = document.createElement('a'); a.href = item.uri; a.textContent = item.txt || 'Read more'; content.append(a);
          }
        }
      }
      document.getElementById('close-information').focus();
    };
    const config = {};
    for (const scene of scenes) {
      const image = scene.photopanos?.[0]?.src;
      if (!image) continue;
      if (!available.has(scene.id)) {
        const option=document.createElement('option');option.value=scene.id;option.textContent=names(scene.id)+' (panorama unavailable)';option.disabled=true;select.append(option);continue;
      }
      config[scene.id] = {title:names(scene.id),type:'equirectangular',panorama:'static_assets/' + image.replace(/^\//,''),autoLoad:true,hfov:100,hotSpots:[]};
      for (const nav of scene.navs || []) {
        if (available.has(nav.to)) config[scene.id].hotSpots.push({pitch:Number(nav.rotateX)||0,yaw:-(Number(nav.rotateY)||0),type:'scene',text:nav.txt || names(nav.to),sceneId:nav.to});
      }
      for (const info of uniqueInfos(scene)) {
        config[scene.id].hotSpots.push({pitch:Number(info.rotateX)||0,yaw:-(Number(info.rotateY)||0),cssClass:'info-hotspot',createTooltipFunc:(element)=>{
          const label = info.card?.find(x=>x.type==='header')?.txt || 'Room information';
          element.setAttribute('role','button'); element.setAttribute('tabindex','0'); element.setAttribute('aria-label',label); element.title=label;
          element.addEventListener('click',()=>showCard(info));
          element.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();showCard(info);}});
        }});
      }
      const option = document.createElement('option'); option.value=scene.id;option.textContent=names(scene.id);select.append(option);
    }
    const viewer = pannellum.viewer('panorama',{default:{firstScene:first,autoLoad:true,sceneFadeDuration:200,showControls:true},scenes:config});
    select.value=first;
    select.addEventListener('change',()=>viewer.loadScene(select.value));
    viewer.on('scenechange',id=>{current=id;select.value=id;panel.hidden=true;location.hash=id;status.textContent='';});
    viewer.on('load',()=>{status.textContent='';});
    viewer.on('error',()=>{status.textContent='This panorama is unavailable in the original tour. Choose another room below.';});
    document.getElementById('information-button').addEventListener('click',()=>{
      const infos=uniqueInfos(byId[current]); panel.hidden=false;content.replaceChildren();title.textContent=names(current);
      if(!infos.length){const p=document.createElement('p');p.textContent='Use the arrows in the panorama or the room selector to continue through the hospital.';content.append(p);}
      for(const info of infos){const button=document.createElement('button');button.textContent=info.card?.find(x=>x.type==='header')?.txt || 'Room information';button.onclick=()=>showCard(info);content.append(button);}
    });
    document.getElementById('close-information').addEventListener('click',()=>{panel.hidden=true;document.getElementById('information-button').focus();});
    document.addEventListener('keydown',e=>{if(e.key==='Escape')panel.hidden=true;});
  } catch(error) { status.textContent=error.message; }
})();
