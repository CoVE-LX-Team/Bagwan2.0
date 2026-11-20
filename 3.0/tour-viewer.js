'use strict';

const assets = new URL('../VR/public/static_assets/', document.baseURI);
const tourBase = new URL('./', document.baseURI);
const roomName = id => ({NurseWard:'Nursing ward', NurseStation:'Nurses’ station', XrayRoom:'X-ray room', NursingRoom:'Nursing room', MainReception:'Main reception', InterpretingReception:'Interpreting reception', DirtyStoreroom:'Dirty storeroom', CleanStoreroom:'Clean storeroom', RehabilitationClinic:'Rehabilitation clinic', HandwashingStation:'Handwashing station', DentalRoom:'Dental room', SpecimenReception:'Specimen reception', MedicationRoom:'Medication room', CounsellingRoom:'Counselling room'}[id] || id);
const roomNotes = {
  Corridor: ['Finding your way', 'Look for signs or landmarks that would help you describe your location. Use Choose a room to jump to a named area.', 'Browse departments', '#departments'],
  NurseWard: ['Ward records', 'Forms & records holds the food and fluids, personal care, continence and pain observation forms. Open the directory to find the form you need.', 'Find forms and patient records', '#forms'],
  XrayRoom: ['Imaging enquiries', 'Use this view to familiarise yourself with the imaging room. The staff directory lists colleagues by team and role if you need to follow up an enquiry.', 'Find a staff member', '#people'],
  Bathroom: ['Privacy and access', 'Look at the entrance and layout when describing this space to a visitor. The Nursing department page lists staff and patient-care resources.', 'Find nursing services', '#department/nursing'],
  NursingRoom: ['Nursing services', 'Find the nursing team in the department directory. Its page brings together patient records, observation forms and clinical handover resources.', 'Open the nursing department', '#department/nursing'],
  Logistics: ['Supplies and logistics', 'Look around the storage area for landmarks you could use to describe a location to a colleague. The Logistics department page lists the team and its resources.', 'Open the Logistics department', '#department/logistics']
};
const guide = [
  ['MainReception','Receive the enquiry','Alex Morgan has asked for an interpreter for an upcoming appointment. At the public desk, what would you need to clarify, and what would you discuss privately?'],
  ['InterpretingReception','Find the right service','Open Room information and find the interpreting office. Which service could advise you on this request? Which details still need confirmation?'],
  ['NurseStation','Prepare a handover','A colleague asks whether an interpreter has been booked. How would you describe what Alex requested and what remains unconfirmed?']
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
const infoItems = document.querySelector('#info-items');
const statusMessage = document.querySelector('#tour-status');
const guided = new URLSearchParams(location.search).get('guide') === 'orientation';
const titleOf = info => info.card.find(part => part.type === 'header')?.txt || 'Room information';
const element = (tag, text) => {const node = document.createElement(tag); node.textContent = text; return node;};
const appendLink = (text, destination) => {
  const link = element('a', text);
  const url = new URL(destination, tourBase);
  const context = new URLSearchParams(location.search).get('from');
  if (context && url.origin === location.origin && /^#(page\/|people$|forms$)/.test(url.hash)) {
    url.hash += '?from='+encodeURIComponent(context);
  }
  link.href = url;
  link.target = url.origin === location.origin ? '_top' : '_blank';
  link.rel = 'noopener';
  infoItems.append(link);
};
function appendSourceLink(item) {
  if (!item.uri) return;
  if (namedLinks[item.uri]) {
    namedLinks[item.uri].forEach(([title,url]) => appendLink(title,url));
  } else if (item.uri.startsWith('/Bagwan2.0/')) {
    const path = item.uri.slice('/Bagwan2.0/'.length);
    if (item.txt === 'Enter activity') appendLink('Open the laboratory PPE reference', '#page/' + encodeURIComponent('scorm/department-pages/lab-technologies/ppe-safety-activity/index.html'));
    else if (path.endsWith('/waste-management/index.html')) appendLink('Open the laboratory waste reference', '#page/' + encodeURIComponent(path));
    else if (path === 'scorm/intranet/index.html') appendLink('Open the staff intranet', '#home');
    else appendLink(item.txt.trim(), '#page/' + encodeURIComponent(path));
  } else if (item.uri === 'https://www.worksafe.vic.gov.au/use-automated-external-defibrillator-aed-workplace') {
    appendLink('WorkSafe Victoria · Automated external defibrillators in the workplace',item.uri);
  } else if (/^https?:\/\//i.test(item.uri)) appendLink(item.txt.trim(), item.uri);
}
let opener;
function openDialog() {
  if (!dialog.open) {
    opener = document.activeElement;
    const frame = window.frameElement;
    if (frame) {
      const bounds = frame.getBoundingClientRect();
      if (bounds.top < 0 || bounds.bottom > frame.ownerDocument.defaultView.innerHeight) frame.scrollIntoView({block:'center',behavior:'instant'});
    }
    if (document.fullscreenElement && !document.fullscreenElement.contains(dialog)) document.fullscreenElement.append(dialog);
    dialog.showModal();
  }
  document.querySelector('#close-information').focus();
}
document.querySelector('#close-information').addEventListener('click', () => dialog.close());
dialog.addEventListener('close', () => (opener?.isConnected ? opener : information).focus());

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
  const scenes = {};
  const cards = {};
  function showCard(info) {
    infoItems.replaceChildren();
    document.querySelector('#info-title').textContent = titleOf(info);
    document.querySelector('#room-label').textContent = roomName(current);
    for (const part of info.card) {
      if (part.type === 'content') infoItems.append(element('p',part.txt));
      if (part.type === 'image' && part.src && !absent.has(part.src.slice(1))) {
        const image = document.createElement('img'); image.alt = ''; image.src = new URL(part.src.slice(1),assets);
        infoItems.append(image);
      }
      if (part.type === 'row') part.buttons.forEach(appendSourceLink);
      if (part.type === 'reference') appendLink(part.txt,part.href);
    }
    openDialog();
  }
  function hotspot(label, kind, click) {
    return node => {
      node.setAttribute('role','button'); node.tabIndex = 0; node.setAttribute('aria-label',label); node.title = label;
      node.append(element('span',kind === 'info' ? 'i' : '➜')); node.firstChild.setAttribute('aria-hidden','true');
      node.addEventListener('click',click);
      node.addEventListener('keydown',event => {if (event.key === 'Enter' || event.key === ' ') {event.preventDefault(); event.stopPropagation(); click();}});
    };
  }
  for (const scene of available) {
    const infos = [...new Map((scene.infos || []).map(info => [JSON.stringify(info.card),info])).values()];
    const note = roomNotes[scene.id];
    if (note) infos.push({rotateX:0, rotateY:0, card:[{type:'header',txt:note[0]},{type:'content',txt:note[1]},{type:'reference',txt:note[2],href:note[3]}]});
    cards[scene.id] = infos;
    const hotSpots = infos.map(info => ({pitch:Number(info.rotateX)||0, yaw:-Number(info.rotateY)||0, cssClass:'info-hotspot', createTooltipFunc:hotspot(titleOf(info),'info',() => showCard(info))}));
    for (const nav of scene.navs || []) {
      if (byId.has(nav.to)) hotSpots.push({pitch:Number(nav.rotateX)||0,yaw:-Number(nav.rotateY)||0,cssClass:'direction-hotspot',createTooltipFunc:hotspot('Go to '+roomName(nav.to),'direction',() => viewer.loadScene(nav.to))});
    }
    scenes[scene.id] = {type:'equirectangular',panorama:new URL(scene.photopanos[0].src.slice(1),assets).href,hotSpots};
  }
  for (const scene of archive.scenes.filter(s => s.id && s.id !== 'Test')) {
    const option = element('option',roomName(scene.id) + (byId.has(scene.id) ? '' : ' (panorama unavailable)'));
    option.value = scene.id; option.disabled = !byId.has(scene.id); picker.append(option);
  }
  const showRoomList = () => {
    document.querySelector('#info-title').textContent = 'Room information';
    document.querySelector('#room-label').textContent = roomName(current);
    infoItems.replaceChildren();
    for (const info of cards[current]) {
      const button = element('button',titleOf(info)); button.addEventListener('click',() => showCard(info)); infoItems.append(button);
    }
    openDialog();
  };
  information.addEventListener('click',showRoomList);
  picker.value = current;
  picker.disabled = information.disabled = false;
  let completed = false;
  function updateGuide() {
    if (!guided) return;
    document.querySelector('#tour-guide').hidden = false;
    document.querySelector('#guide-step').textContent = completed ? 'Orientation complete' : 'Stop '+(stopIndex+1)+' of '+guide.length+' · '+roomName(guide[stopIndex][0]);
    document.querySelector('#guide-title').textContent = completed ? 'Debrief the handover' : guide[stopIndex][1];
    document.querySelector('#guide-prompt').textContent = completed ? 'Return to the learning guide and compare your message with the information in Alex’s record.' : guide[stopIndex][2];
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
    current = id; picker.value = id;
    if (dialog.open) dialog.close();
    history.replaceState(null,'','#'+id);
    statusMessage.textContent = '';
    updateGuide();
  }
  function changeRoom(id) {
    selectRoom(id);
    if (viewer) viewer.loadScene(id);
  }
  window.addEventListener('hashchange',() => {
    const slug = location.hash.slice(1);
    const room = aliases[slug] || slug || 'Entrance';
    if (byId.has(room) && room !== current) changeRoom(room);
  });
  picker.addEventListener('change',() => changeRoom(picker.value));
  updateGuide();
  try {
    viewer = pannellum.viewer('panorama',{default:{firstScene:current,autoLoad:true,hfov:100,sceneFadeDuration:0,showControls:true},scenes});
    viewer.on('scenechange',selectRoom);
    viewer.on('error',() => {statusMessage.textContent = 'Panorama unavailable. Choose a room or open Room information.';});
    for (const [selector,label] of [['.pnlm-zoom-in','Zoom in'],['.pnlm-zoom-out','Zoom out'],['.pnlm-fullscreen-toggle-button','Toggle panorama fullscreen']]) {
      const control = document.querySelector(selector);
      if (!control) continue;
      control.setAttribute('role','button'); control.tabIndex = 0; control.setAttribute('aria-label',label);
      control.addEventListener('keydown',event => {if (event.key === 'Enter' || event.key === ' ') {event.preventDefault(); control.click();}});
    }
  } catch {statusMessage.textContent = 'Panorama unavailable. Choose a room or open Room information.';}
}
startTour().catch(error => {statusMessage.textContent = error.message;});
