'use strict';

const assets = new URL('../VR/public/static_assets/', document.baseURI);
const tourBase = new URL('./', document.baseURI);
const roomName = id => ({NurseWard:'Nursing ward', NurseStation:'Nurses’ station', XrayRoom:'X-ray room', NursingRoom:'Nursing room', MainReception:'Main reception', InterpretingReception:'Interpreting reception', DirtyStoreroom:'Dirty storeroom', CleanStoreroom:'Clean storeroom', RehabilitationClinic:'Rehabilitation clinic', HandwashingStation:'Handwashing station', DentalRoom:'Dental room', SpecimenReception:'Specimen reception', MedicationRoom:'Medication room', CounsellingRoom:'Counselling room'}[id] || id);
const roomNotes = {
  Corridor: ['Finding your way', 'The room selector takes you directly to another part of the hospital. The department directory lists the teams and their services.', 'Browse departments', '#departments'],
  NurseWard: ['Ward records', 'Forms & records includes the food and fluids, personal care, continence and pain observation forms.', 'Find forms and patient records', '#forms?view=online'],
  XrayRoom: ['Imaging enquiries', 'The staff directory lists hospital colleagues by team and role.', 'Find a staff member', '#people'],
  Bathroom: ['Ward contacts', 'The nursing directory lists ward staff and patient-care resources.', 'Find nursing services', '#department/nursing'],
  NursingRoom: ['Nursing services', 'The Nursing department page brings together patient records, observation forms and clinical handover resources.', 'Open the nursing department', '#department/nursing'],
  Logistics: ['Supplies and logistics', 'The Logistics department page lists the team and links to induction forms and risk management resources.', 'Open the Logistics department', '#department/logistics']
};
const guide = [
  ['MainReception','Alex at reception','Alex asks, “I would like an interpreter at my next appointment. Could someone tell me whether that has been arranged?”'],
  ['InterpretingReception','At the interpreting office','A colleague asks, “When is Alex’s appointment, and which language should we request?” You can check Alex’s reception note before you reply.'],
  ['NurseStation','The next shift','Your colleague asks, “Is Alex’s interpreter booked, or do I need to follow up?”']
];
const namedLinks = {
  'https://www.who.int/gpsc/5may/resources/posters/en/': [
    ['WHO poster · How to handwash','https://www.who.int/publications/m/item/how-to-handwash'],
    ['WHO poster · How to handrub','https://www.who.int/publications/m/item/how-to-handrub']
  ],
  'http://whqlibdoc.who.int/publications/2009/9789241597906_eng.pdf?ua=1': [
    ['WHO guidelines on hand hygiene in health care','https://www.who.int/publications/i/item/9789241597906']
  ]
};
const picker = document.querySelector('#room-select');
const information = document.querySelector('#information-button');
const dialog = document.querySelector('#room-information');
const dialogTitle = document.querySelector('#info-title');
const dialogScroll = document.querySelector('.tour-dialog-scroll');
const dialogFooter = document.querySelector('.tour-dialog-foot');
const infoItems = document.querySelector('#info-items');
const statusMessage = document.querySelector('#tour-status');
const guided = new URLSearchParams(location.search).get('guide') === 'orientation';
const titleOf = info => info.card.find(part => part.type === 'header')?.txt.trim() || 'Room information';
const element = (tag, text) => {const node = document.createElement(tag); node.textContent = text; return node;};
const cardImages = {
  'AED-1.jpg':'Defibrillator in a wall-mounted cabinet.',
  'EmergencyShower.png':'Green emergency shower sign.',
  'HazardousWaste.jpg':'A gloved hand holding a red biohazard bag.',
  'PPE-sign.jpg':'Sign headed “PPE required” with protective equipment symbols.',
  'Pathology_computer.jpg':'Microscope beside a monitor showing a specimen.',
  'Pathology_test.jpg':'A gloved hand placing a sample in laboratory equipment.',
  'Welcome_to_Bagwan.jpg':'Nursing staff in a hospital corridor.',
  'clean_laundry.jpg':'A staff member making a hospital bed with fresh linen.',
  'dirty_laundry.jpg':'A staff member handling used linen in a laundry.',
  'evacuation_plan.png':'Evacuation floor plan showing routes and exit symbols.',
  'handwashing.jpg':'Illustrations of hand positions for hand hygiene.',
  'interpreting.jpg':'A healthcare worker speaking with two visitors.',
  'medication_cupboard.jpg':'A staff member checking stock in a medication cupboard.',
  'nurses_station.jpg':'Nursing staff talking at a workstation.',
  'reception_01.jpg':'A visitor speaking with a receptionist at a counter.'
};
const detailedImages = new Set(['evacuation_plan.png','PPE-sign.jpg','handwashing.jpg']);
const signDimensions = {'evacuation_plan.png':[1000,725],'PPE-sign.jpg':[1080,779],'EmergencyShower.png':[601,364]};
function cardImage(src) {
  const name = src.split('/').pop();
  const url = new URL(src.slice(1), assets);
  const image = document.createElement('img');
  image.alt = cardImages[name] || '';
  // Reserve space for the photograph or sign while its full-size file loads.
  [image.width,image.height] = signDimensions[name] || [600,400];
  image.src = url;
  const figure = document.createElement('figure');
  if (detailedImages.has(name)) {
    const link = element('a','View full-size image');
    link.href = url; link.target = '_blank'; link.rel = 'noopener';
    link.append(element('span',' (opens in a new tab)')); link.lastChild.className = 'tour-sr';
    const caption = document.createElement('figcaption');
    caption.append(link);
    figure.append(image,caption);
  } else figure.append(image);
  return figure;
}
function cardText(text) {
  const article = document.createElement('div');
  article.className = 'tour-card-text';
  for (const group of text.trim().split(/\n\s*\n/)) {
    const lines = group.split('\n').map(line => line.trim()).filter(Boolean);
    let list;
    const section = ['Lab requisition','Handling of specimens'].includes(lines[0]);
    if (section) article.append(element('h3',lines.shift()));
    for (const line of lines) {
      if (section || /^[-•]/.test(line)) {
        if (!list) {list = document.createElement('ul'); article.append(list);}
        list.append(element('li',line.replace(/^[-•]\s*/,'')));
      } else {
        list = undefined;
        article.append(element('p',line));
      }
    }
  }
  return article;
}
const appendLink = (container, text, destination) => {
  const link = element('a', text);
  const url = new URL(destination, tourBase);
  const context = new URLSearchParams(location.search).get('from');
  const [route,query] = url.hash.split('?');
  if (context && url.origin === location.origin && /^#(page\/|people$|forms$)/.test(route)) {
    const params = new URLSearchParams(query);
    params.set('from',context);
    url.hash = route+'?'+params;
  }
  link.href = url;
  link.target = url.origin === location.origin ? '_top' : '_blank';
  link.rel = 'noopener';
  if (link.target === '_blank') {
    const hint = element('span',' (opens in a new tab)'); hint.className = 'tour-sr'; link.append(hint);
  }
  container.append(link);
};
function appendSourceLink(container,item) {
  if (!item.uri) return;
  if (namedLinks[item.uri]) {
    namedLinks[item.uri].forEach(([title,url]) => appendLink(container,title,url));
  } else if (item.uri.startsWith('/Bagwan2.0/')) {
    const path = item.uri.slice('/Bagwan2.0/'.length);
    if (item.txt === 'Enter activity') appendLink(container,'Open the laboratory PPE reference', '#page/' + encodeURIComponent('scorm/department-pages/lab-technologies/ppe-safety-activity/index.html'));
    else if (path.endsWith('/waste-management/index.html')) appendLink(container,'Open the laboratory waste reference', '#page/' + encodeURIComponent(path));
    else if (path === 'scorm/intranet/index.html') appendLink(container,'Open the staff intranet', '#home');
    else {
      const titles = {'lab-technologies':'Open Laboratory technologies',nursing:'Open the nursing team structure','interpreting-office':'Open the interpreting office'};
      appendLink(container,titles[path.split('/').at(-2)] || item.txt.trim(), '#page/' + encodeURIComponent(path));
    }
  } else if (item.uri === 'https://www.worksafe.vic.gov.au/use-automated-external-defibrillator-aed-workplace') {
    appendLink(container,'WorkSafe Victoria · Automated external defibrillators in the workplace',item.uri);
  } else if (/^https?:\/\//i.test(item.uri)) appendLink(container,item.txt.trim(), item.uri);
}
let opener;
function openDialog(trigger,focusTarget = dialogTitle) {
  if (!dialog.open) {
    opener = trigger || document.activeElement;
    const frame = window.frameElement;
    if (frame) {
      const bounds = frame.getBoundingClientRect();
      if (bounds.top < 0 || bounds.bottom > frame.ownerDocument.defaultView.innerHeight) frame.scrollIntoView({block:'center',behavior:'instant'});
    }
    if (document.fullscreenElement && !document.fullscreenElement.contains(dialog)) document.fullscreenElement.append(dialog);
    dialog.showModal();
  }
  dialogScroll.scrollTop = 0;
  focusTarget.focus({preventScroll:focusTarget === dialogTitle});
}
document.querySelector('#close-information').addEventListener('click', () => dialog.close());
dialog.addEventListener('close', () => {
  if (dialog.parentNode !== document.body && !document.fullscreenElement) document.body.append(dialog);
  (opener?.isConnected ? opener : information).focus({preventScroll:true});
});

async function startTour() {
  async function loadFile(name) {
    const response = await fetch(new URL(name, assets));
    if (!response.ok) throw Error('Room content could not be loaded. Refresh the tour to try again.');
    return response.json();
  }
  const [archive, missing] = await Promise.all([loadFile('hello-world.json'),loadFile('unavailable.json')]);
  const absent = new Set(missing);
  const available = archive.scenes.filter(s => s.id && s.id !== 'Test' && s.photopanos?.[0]?.src && !absent.has(s.photopanos[0].src.slice(1)));
  const byId = new Map(available.map(scene => [scene.id,scene]));
  const aliases = {Myotheraphy:'Myotherapy',MyotherapyClinic:'Myotherapy',Rehabilitation:'RehabilitationClinic',Logisitics:'Logistics',NursesStation:'NurseStation',Specimenreception:'SpecimenReception'};
  const slug = location.hash.slice(1);
  const requested = aliases[slug] || slug;
  let stopIndex = Math.max(0,guide.findIndex(([id]) => id === requested));
  let current = guided ? guide[stopIndex][0] : byId.has(requested) ? requested : 'Entrance';
  let viewer;
  let panoramaRoom;
  let panoramaLoading = false;
  const scenes = {};
  const cards = {};
  const hotspotCaption = element('span','');
  hotspotCaption.className = 'tour-hotspot-caption';
  hotspotCaption.setAttribute('aria-hidden','true');
  let captionOwner;
  function hideCaption(node) {
    if (!node || node === captionOwner) {captionOwner = undefined; hotspotCaption.textContent = '';}
  }
  let selectedTopic;
  function showCard(info,trigger) {
    hideCaption();
    selectedTopic = info;
    infoItems.replaceChildren();
    infoItems.className = 'tour-card';
    dialogTitle.textContent = titleOf(info);
    document.querySelector('#room-label').textContent = roomName(current);
    dialogFooter.hidden = cards[current].length < 2;
    const links = document.createElement('div');
    links.className = 'tour-card-links';
    for (const part of info.card) {
      if (part.type === 'content' && part.txt.trim()) infoItems.append(cardText(part.txt));
      if (part.type === 'image' && part.src && !absent.has(part.src.slice(1))) {
        infoItems.append(cardImage(part.src));
      }
      if (part.type === 'row') part.buttons.forEach(item => appendSourceLink(links,item));
      if (part.type === 'reference') appendLink(links,part.txt,part.href);
    }
    if (links.childElementCount) infoItems.append(links);
    openDialog(trigger);
  }
  function hotspot(label, kind, click) {
    return node => {
      node.setAttribute('role','button'); node.tabIndex = 0; node.setAttribute('aria-label',label);
      node.append(element('span',kind === 'info' ? 'i' : '➜')); node.firstChild.setAttribute('aria-hidden','true');
      if (kind === 'info') node.setAttribute('aria-haspopup','dialog');
      const showCaption = () => {captionOwner = node; hotspotCaption.textContent = label;};
      node.addEventListener('pointerenter',event => {if (event.pointerType === 'mouse') showCaption();});
      node.addEventListener('pointerleave',() => {if (node !== document.activeElement) hideCaption(node);});
      node.addEventListener('focus',showCaption);
      node.addEventListener('blur',() => hideCaption(node));
      node.addEventListener('click',() => click(node));
      node.addEventListener('keydown',event => {if (event.key === 'Enter' || event.key === ' ') {event.preventDefault(); event.stopPropagation(); click(node);}});
    };
  }
  for (const scene of available) {
    const infos = [...(scene.infos || [])];
    const note = roomNotes[scene.id];
    if (note) infos.push({rotateX:0, rotateY:0, card:[{type:'header',txt:note[0]},{type:'content',txt:note[1]},{type:'reference',txt:note[2],href:note[3]}]});
    const topics = new Map();
    const locations = new Set();
    const hotSpots = [];
    for (const info of infos) {
      const title = titleOf(info);
      for (const part of info.card) {
        if (part.src === '/hotspot_images/Evacuation plan.png') part.src = '/hotspot_images/evacuation_plan.png';
        if (scene.id === 'Laboratory' && title === 'Intranet') {
          if (part.type === 'header') part.txt = 'Laboratory technologies';
          if (part.type === 'content') part.txt = 'The department page brings together information and resources for laboratory staff.';
        }
        if (scene.id === 'Laboratory' && title === 'Handling and disposal of waste materials' && part.type === 'content') {
          part.txt = part.txt.replace(/\s*Click the link below to test your knowledge[^.]*\./i,'').trim();
        }
        if (part.type === 'content' && scene.id === 'NurseStation' && title === 'Nurse Unit Manager') part.txt = 'The nursing team structure lists the unit managers for outpatient, inpatient, cardiac, rehabilitation and emergency nursing.';
        if (part.type === 'header' && scene.id === 'SpecimenReception') {
          if (part.txt === 'Specimen Reception') part.txt = 'Checking incoming specimens';
          if (part.txt === 'Specimen reception') part.txt = 'Sample types and laboratory disciplines';
        }
      }
      if (scene.id === 'NurseStation' && title === 'Nurse Unit Manager') info.card.push({type:'reference',txt:'View the nursing team structure',href:'#page/'+encodeURIComponent('scorm/department-pages/nursing/index.html')});
      // A topic can appear at several locations in the panorama.
      const key = JSON.stringify(info.card, (property,value) => property === 'txt' ? value.trim().replace(/\s+/g,' ') : value);
      if (!topics.has(key)) topics.set(key,info);
      const topic = topics.get(key);
      const pitch = Number(info.rotateX) || 0;
      const yaw = -Number(info.rotateY) || 0;
      const locationKey = JSON.stringify([key,pitch,yaw]);
      if (locations.has(locationKey)) continue;
      locations.add(locationKey);
      hotSpots.push({pitch,yaw,cssClass:'info-hotspot',createTooltipFunc:hotspot(titleOf(topic),'info',node => {
        if (current === scene.id) showCard(topic,node);
      })});
    }
    cards[scene.id] = [...topics.values()];
    for (const nav of scene.navs || []) {
      if (byId.has(nav.to)) hotSpots.push({pitch:Number(nav.rotateX)||0,yaw:-Number(nav.rotateY)||0,cssClass:'direction-hotspot',createTooltipFunc:hotspot('Go to '+roomName(nav.to),'direction',() => changeRoom(nav.to))});
    }
    scenes[scene.id] = {type:'equirectangular',panorama:new URL(scene.photopanos[0].src.slice(1),assets).href,hotSpots};
  }
  for (const scene of archive.scenes.filter(s => s.id && s.id !== 'Test')) {
    const option = element('option',roomName(scene.id) + (byId.has(scene.id) ? '' : ' (panorama unavailable)'));
    option.value = scene.id; option.disabled = !byId.has(scene.id); picker.append(option);
  }
  function showRoomList(returnToTopic) {
    dialogTitle.textContent = 'Room information';
    document.querySelector('#room-label').textContent = roomName(current);
    infoItems.replaceChildren();
    infoItems.className = 'tour-topics';
    dialogFooter.hidden = true;
    const list = document.createElement('ul');
    let focusTarget;
    for (const info of cards[current]) {
      const item = document.createElement('li');
      const button = element('button',titleOf(info));
      button.addEventListener('click',() => showCard(info));
      item.append(button); list.append(item);
      if (returnToTopic === info) focusTarget = button;
    }
    infoItems.append(list);
    openDialog(information,focusTarget);
  }
  information.addEventListener('click',() => {
    if (cards[current].length === 1) showCard(cards[current][0],information);
    else showRoomList();
  });
  document.querySelector('#room-topics').addEventListener('click',() => showRoomList(selectedTopic));
  picker.value = current;
  picker.disabled = information.disabled = false;
  let completed = false;
  function updateGuide() {
    if (!guided) return;
    document.querySelector('#tour-guide').hidden = false;
    document.querySelector('#guide-step').textContent = completed ? 'Orientation complete' : 'Stop '+(stopIndex+1)+' of '+guide.length+' · '+roomName(guide[stopIndex][0]);
    document.querySelector('#guide-title').textContent = completed ? 'Reception handover' : guide[stopIndex][1];
    document.querySelector('#guide-prompt').textContent = completed ? 'Your shift is ending. Leave the next receptionist a note about Alex’s request and the follow-up they need to pick up.' : guide[stopIndex][2];
    document.querySelector('#guide-back').disabled = stopIndex === 0;
    document.querySelector('#guide-return').hidden = completed || current === guide[stopIndex][0];
    document.querySelector('#guide-next').hidden = completed;
    document.querySelector('#guide-next').textContent = stopIndex === guide.length-1 ? 'Finish orientation' : 'Next stop';
  }
  function moveStop(index) {
    stopIndex = index; completed = false; changeRoom(guide[index][0]); updateGuide();
    if (window.parent !== window && document.referrer && new URL(document.referrer).origin === location.origin) {
      const parentUrl = new URL(window.parent.location.href);
      const [route,search] = parentUrl.hash.split('?');
      const params = new URLSearchParams(search);
      if (route === '#tour' && params.get('guide') === 'orientation') {
        params.set('stop',guide[index][0]); parentUrl.hash = route+'?'+params;
        window.parent.history.replaceState(window.parent.history.state,'',parentUrl);
      }
    }
  }
  document.querySelector('#guide-return').addEventListener('click',() => moveStop(stopIndex));
  document.querySelector('#guide-back').addEventListener('click',() => moveStop(completed ? stopIndex : stopIndex-1));
  document.querySelector('#guide-next').addEventListener('click',() => {
    if (stopIndex === guide.length-1) {completed = true; updateGuide(); document.querySelector('#tour-guide a').focus();}
    else moveStop(stopIndex+1);
  });
  function selectRoom(id) {
    hideCaption();
    current = id; picker.value = id;
    if (dialog.open) dialog.close();
    history.replaceState(null,'','#'+id);
    if (viewer) statusMessage.textContent = panoramaLoading || panoramaRoom !== current ? 'Loading '+roomName(id)+' panorama…' : '';
    updateGuide();
  }
  function changeRoom(id) {
    selectRoom(id);
    loadSelectedPanorama();
  }
  function loadSelectedPanorama() {
    if (!viewer || panoramaLoading || panoramaRoom === current) return;
    panoramaRoom = current;
    panoramaLoading = true;
    viewer.loadScene(panoramaRoom);
  }
  function finishPanorama(failed) {
    // Finish the viewer's own load callback before starting another image.
    queueMicrotask(() => {
      panoramaLoading = false;
      if (panoramaRoom !== current) loadSelectedPanorama();
      else statusMessage.textContent = failed ? 'Panorama unavailable. Choose a room or open Room information.' : '';
    });
  }
  window.addEventListener('hashchange',() => {
    const slug = location.hash.slice(1);
    const room = aliases[slug] || slug || 'Entrance';
    if (byId.has(room) && room !== current) changeRoom(room);
  });
  picker.addEventListener('change',() => changeRoom(picker.value));
  updateGuide();
  try {
    viewer = pannellum.viewer('panorama',{default:{firstScene:current,autoLoad:false,hfov:100,sceneFadeDuration:0,showControls:true},scenes});
    document.querySelector('#panorama').append(hotspotCaption);
    viewer.on('load',() => finishPanorama(false));
    viewer.on('error',() => finishPanorama(true));
    loadSelectedPanorama();
    for (const [selector,label] of [['.pnlm-zoom-in','Zoom in'],['.pnlm-zoom-out','Zoom out'],['.pnlm-fullscreen-toggle-button','Toggle panorama fullscreen']]) {
      const control = document.querySelector(selector);
      if (!control) continue;
      control.setAttribute('role','button'); control.tabIndex = 0; control.setAttribute('aria-label',label);
      control.addEventListener('keydown',event => {if (event.key === 'Enter' || event.key === ' ') {event.preventDefault(); control.click();}});
    }
  } catch {statusMessage.textContent = 'Panorama unavailable. Choose a room or open Room information.';}
}
startTour().catch(error => {statusMessage.textContent = error.message;});
