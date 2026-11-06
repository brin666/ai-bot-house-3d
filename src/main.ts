import { createEventFeedback } from './event-feedback';
import { createBot, type BotState, type BotActivity } from './bot';
import { startPurchase } from './purchase';
import { drawRooms, worldBoundsForRooms } from './room-renderer';
import { renderLayout } from './layout';
import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { createPaperPass, syncPaperScale } from './paper';
import { setSurfaceAnisotropy, setSurfaceCssPixelsPerWorldUnit } from './room-surfaces';
import { flatMaterial, look } from './look';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import sceneData from './scene.json';
import { Store, catalog, resetSave, type Item, type Kind } from './store';
import { furniture, disposeFurniture } from './furniture';
import { path, setActiveRooms, setDecorBlocks, blocked, validPlacement, preservesConnectivity, canUnlockRoom, segmentClear } from './navigation';
import { nextUnlockCandidate, rooms as allRooms } from './scene-types';
import { buildRoomDecor } from './room-decor';
import { decorLayout } from './decor-layout';
import { migrateLayout } from './save-migrate';
import './style.css';
import { botMotion, lerpAngle, smoothstep, BOT_BODY_CENTER_Y } from './bot-motion';
import { BOT_RADIUS } from './bot-metrics';
import { BOT_RADIUS as BOT_VISUAL_RADIUS } from './bot-look';
import { buildRoomProps, type ThemedProp } from './room-props';
import { createInteractables } from './interactables';
import type { Interactable } from './interaction-types';
const app=document.querySelector<HTMLDivElement>('#app')!;
renderLayout(app);
const el=(id:string)=>document.getElementById(id)!;const syncActivity=()=>{el('live-activity').textContent=el('status').textContent;el('live-now').textContent=el('status').textContent};new MutationObserver(syncActivity).observe(el('status'),{childList:true,characterData:true,subtree:true});syncActivity(); const store=new Store(sceneData.furniture as Item[]);const nextRoom=()=>nextUnlockCandidate(store.rooms);setActiveRooms(store.rooms);setDecorBlocks(decorLayout(store.rooms).blocks);const migratedLayout=migrateLayout(store.items,store.restoredPending??store.pending,store.rooms);store.items=migratedLayout.items;if(migratedLayout.pending&&!store.items.some(item=>item.id===migratedLayout.pending!.id))store.items.push(migratedLayout.pending);store.pending=null;store.restoredPending=null; const scene=new THREE.Scene();scene.background=new THREE.Color(look.background);
const renderer=new THREE.WebGLRenderer({antialias:true});renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.setClearAlpha(1);renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;renderer.outputColorSpace=THREE.SRGBColorSpace;el('canvas').appendChild(renderer.domElement);setSurfaceAnisotropy(renderer.capabilities.getMaxAnisotropy());
const houseCenter=()=>{const b=worldBoundsForRooms(store.rooms);return new THREE.Vector3(b.cx,1,b.cz)};
const initialCenter=houseCenter();const camera=new THREE.OrthographicCamera(-6,6,6,-6,.1,100);camera.position.copy(initialCenter).add(new THREE.Vector3(12,9,12));camera.lookAt(initialCenter);
const controls=new OrbitControls(camera,renderer.domElement);controls.target.copy(initialCenter);controls.enablePan=false;controls.minZoom=.65;controls.maxZoom=2;controls.maxPolarAngle=Math.PI/2.2;controls.update();
function initialSurfaceCssPixelsPerWorldUnit(){const stage=el('canvas'),width=stage.clientWidth||window.innerWidth,height=stage.clientHeight||window.innerHeight,aspect=width/Math.max(1,height);camera.updateMatrixWorld(true);const right=new THREE.Vector3().setFromMatrixColumn(camera.matrixWorld,0),up=new THREE.Vector3().setFromMatrixColumn(camera.matrixWorld,1),bounds=worldBoundsForRooms(store.rooms);let minX=Infinity,maxX=-Infinity,minY=Infinity,maxY=-Infinity;for(const dx of [bounds.minX,bounds.maxX])for(const dz of [bounds.minZ,bounds.maxZ])for(const y of [0,bounds.maxY]){const point=new THREE.Vector3(dx,y,dz).sub(controls.target),x=point.dot(right),v=point.dot(up);minX=Math.min(minX,x);maxX=Math.max(maxX,x);minY=Math.min(minY,v);maxY=Math.max(maxY,v)}const view=Math.max(8,(maxX-minX)/(.92*aspect),(maxY-minY)/.9);return height/view}setSurfaceCssPixelsPerWorldUnit(initialSurfaceCssPixelsPerWorldUnit());
scene.add(new THREE.AmbientLight(look.light.ambient, look.light.ambientIntensity));scene.add(new THREE.HemisphereLight(look.light.hemiSky, look.light.hemiGround, look.light.hemi));const sun=new THREE.DirectionalLight(look.light.sun, look.light.sunIntensity);sun.position.set(7,10,5);sun.target.position.set(4,0,0);scene.add(sun.target);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);sun.shadow.camera.left=-15;sun.shadow.camera.right=15;sun.shadow.camera.top=15;sun.shadow.camera.bottom=-15;sun.shadow.normalBias=.025;sun.shadow.bias=-.0002;scene.add(sun);
const composerTarget=new THREE.WebGLRenderTarget(1,1,{format:THREE.RGBAFormat,type:THREE.UnsignedByteType,depthBuffer:true,stencilBuffer:false});const composer=new EffectComposer(renderer,composerTarget);for(const target of [composer.renderTarget1, composer.renderTarget2]){target.depthTexture=new THREE.DepthTexture(target.width, target.height);}composer.addPass(new RenderPass(scene,camera));const dither=createPaperPass();composer.addPass(dither);
function syncComposerDepth(){for(const target of [composer.renderTarget1, composer.renderTarget2]){if(!target.depthTexture)target.depthTexture=new THREE.DepthTexture(target.width, target.height);target.depthTexture.image.width=target.width;target.depthTexture.image.height=target.height;}}
const M=(c:string)=>flatMaterial(c);function cube(w:number,h:number,d:number,x:number,y:number,z:number,c:string,parent:THREE.Object3D=scene){const mesh=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),M(c));mesh.position.set(x,y,z);mesh.castShadow=true;mesh.receiveShadow=true;parent.add(mesh);return mesh}
const activeRooms=()=>sceneData.rooms.filter(room=>store.rooms.includes(room.id));
const roomGroup=new THREE.Group();scene.add(roomGroup);
const decorGroup=new THREE.Group();scene.add(decorGroup);
const propsGroup=new THREE.Group();scene.add(propsGroup);
let themedProps:ThemedProp[]=[];
let interactables:Interactable[]=[];
let perfBeforeMeshes:number|null=null;
let perfAfterMeshes:number|null=null;
function countSceneMeshes(){let n=0;scene.traverse(o=>{if(o instanceof THREE.Mesh&&o.visible)n++});return n}
function renderRooms(){drawRooms(roomGroup,store.rooms);if(perfBeforeMeshes===null)perfBeforeMeshes=countSceneMeshes();const blocks=buildRoomDecor(store.rooms,decorGroup);setDecorBlocks(blocks);themedProps=buildRoomProps(store.rooms,propsGroup);interactables=createInteractables(store.rooms,store.items,themedProps);if(perfAfterMeshes===null)perfAfterMeshes=countSceneMeshes()}
const furnitureGroup=new THREE.Group();scene.add(furnitureGroup);
function rebuild(){for(const item of furnitureGroup.children)disposeFurniture(item);furnitureGroup.clear();for(const item of store.items)furnitureGroup.add(furniture(item));renderRooms()}
rebuild();
const raycaster=new THREE.Raycaster();const pointer=new THREE.Vector2();let pointerStart:{x:number;y:number}|null=null;
renderer.domElement.addEventListener('pointerdown',e=>{pointerStart={x:e.clientX,y:e.clientY}});
let selectedItemId:string|null=null;function showItem(item:Item,focusClose=false){selectedItemId=item.id;el('detail-name').textContent=catalog[item.type].name;el('detail-price').textContent=item.price===undefined?`虚拟金币 ${catalog[item.type].price} · 初始家具`:`虚拟金币 ${item.price}`;el('item-details').hidden=false;if(focusClose)el('close-detail').focus()}
renderer.domElement.addEventListener('pointerup',e=>{if(!pointerStart||Math.hypot(e.clientX-pointerStart.x,e.clientY-pointerStart.y)>5)return;const rect=renderer.domElement.getBoundingClientRect();pointer.set((e.clientX-rect.left)/rect.width*2-1,-(e.clientY-rect.top)/rect.height*2+1);raycaster.setFromCamera(pointer,camera);const hit=raycaster.intersectObjects(furnitureGroup.children,true)[0];if(!hit)return;let object:THREE.Object3D|null=hit.object;while(object&&object.parent!==furnitureGroup)object=object.parent;const item=store.items.find(i=>i.id===object?.name);if(item)showItem(item)});
el('inspect-furniture').onclick=()=>{const id=(el('owned-select') as HTMLSelectElement).value;const item=store.items.find(i=>i.id===id);if(item)showItem(item,true)};
el('close-detail').onclick=()=>{el('item-details').hidden=true;el('inspect-furniture').focus()};el('item-details').addEventListener('keydown',event=>{if(event.key==='Escape')el('close-detail').click()});
const botView=createBot();const bot=botView.root;scene.add(bot);
let state:BotState='Idle',timer=2,waypoints:[number,number][]=[],clock=0,carry:THREE.Group|null=null,pending:Item|null=null;let arrival:BotActivity|null=null;let activity:BotActivity='';let lastInteractableId:string|null=null;let activeInteractableId:string|null=null;let activityTarget:[number,number,number]|null=null;let celebrationQueued=false;let mode=false;let deliveryPath:[number,number][]=[];let liftStarted=0;let placeFrom:[number,number]=[0,0];let pickupSpot:[number,number]|null=null;let moveSpeed=0;let jumpStarted=0;let actionStarted=0;let idleFor=0;let idleTurn:'none'|'turning'|'done'='none';let idleTurnStarted=0;let idleStartYaw=0;let idleYawDelta=0;
function wrapAngle(angle:number){return((angle+Math.PI)%(Math.PI*2)+Math.PI*2)%(Math.PI*2)-Math.PI}
function setState(s:BotState,t:number){if(s==='Idle'||s!==state){idleFor=0;idleTurn='none'}state=s;timer=t;actionStarted=clock;if(s==='Jump')jumpStarted=clock;el('status').textContent=({Idle:'BOT 正在发呆',Move:'BOT 正在探索',Jump:'BOT 开心跳跃',Sleep:'BOT 正在休息',Interact:'BOT 正在观察家具',Approach:'BOT 正在接收包裹',Lift:'BOT 正在举起包裹',Carry:'BOT 正在搬运包裹',Place:'BOT 正在摆放家具'} as Record<BotState,string>)[s]}
function snapBotToGrid(){bot.position.x=Math.round(bot.position.x*2)/2;bot.position.z=Math.round(bot.position.z*2)/2}
function moveTo(x:number,z:number){const next=path(bot.position.x,bot.position.z,x,z,store.items);const sameCell=Math.round(bot.position.x*2)===Math.round(x*2)&&Math.round(bot.position.z*2)===Math.round(z*2)&&!blocked(Math.round(x*2)/2,Math.round(z*2)/2,store.items);if(!next.length&&!sameCell)return false;waypoints=next;if(waypoints.length&&!segmentClear(bot.position.x,bot.position.z,waypoints[0][0],waypoints[0][1],store.items))snapBotToGrid();moveSpeed=0;return true}
function shuffled<T>(values:T[]){const result=[...values];for(let i=result.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[result[i],result[j]]=[result[j],result[i]]}return result}
function visitInteractable(target:Interactable){for(const [x,z] of target.standCandidates){if(!moveTo(x,z))continue;lastInteractableId=target.id;activeInteractableId=target.id;arrival=target.activity;activityTarget=target.facingPoint;activity='';setState('Move',0);return true}return false}
function visitTargets(targets:Interactable[],excludeLast:boolean){const candidates=shuffled(targets.filter(target=>!excludeLast||target.id!==lastInteractableId));for(const target of candidates)if(visitInteractable(target))return true;return false}
function visitFurniture(kind?:Kind){return visitTargets(interactables.filter(target=>target.source==='furniture'&&(!kind||target.furnitureKind===kind)),false)}
function visitRandomInteractable(){return visitTargets(interactables,true)}
function finishRoamTimer(){activeInteractableId=null;activity='';arrival=null;activityTarget=null;if(celebrationQueued&&state!=='Jump'){celebrationQueued=false;setState('Jump',botMotion.jump.duration);return}if(!visitRandomInteractable())setState('Idle',1.1)}
function purchase(kind:Kind){
 const result=startPurchase(store,kind,activeRooms(),bot.position.x,bot.position.z,Boolean(pending));
 if(!result.ok){const message={busy:'Bot 正在忙，请稍等一下。',funds:'金币还不够，试试模拟点赞或礼物。',space:'房间暂时没有可以到达的摆放位置。',storage:''}[result.reason];if(message)logNotice(message);return}
 const plan=result.plan;pending=plan.item;arrival=null;activity='';activeInteractableId=null;activityTarget=null;deliveryPath=plan.toTarget;waypoints=plan.toPickup;pickupSpot=plan.pickup;if(waypoints.length&&!segmentClear(bot.position.x,bot.position.z,waypoints[0][0],waypoints[0][1],store.items))snapBotToGrid();moveSpeed=0;
 carry=new THREE.Group();cube(.62,.55,.62,0,.3,0,look.palette.package,carry);cube(.1,.56,.63,0,.3,0,look.palette.packageStripe,carry);carry.position.set(plan.pickup[0],botMotion.lift.startY,plan.pickup[1]);scene.add(carry);setState('Approach',0);
}
function logNotice(s:string){store.notice(s)}
function ui(){const next=nextRoom();const locked=Boolean(store.storageError);el('save-alert').hidden=!locked;el('save-alert').textContent=store.storageError??'';el('live-save-alert').hidden=!locked;el('live-save-alert').textContent=store.storageError??'';for(const button of document.querySelectorAll<HTMLButtonElement>('[data-kind],[data-event],#gift-furniture,#relocate-furniture'))button.disabled=locked;el('buy-room').textContent=next?`扩建${next.label} · ${next.buildCost} 金币`:'所有房间已建好';(el('buy-room') as HTMLButtonElement).disabled=!next||locked;el('room-goal').textContent=next?`目标 ${next.buildCost}`:'扩建完成';el('live-goal').textContent=next?`小屋存款 / 目标 ${next.buildCost}`:'小屋存款 / 扩建完成';el('coins').textContent=String(store.coins);el('livecoins').textContent=String(store.coins);el('progress').style.width=el('liveprogress').style.width=`${next?Math.min(100,store.coins/next.buildCost*100):100}%`;el('logs').replaceChildren(...store.logs.map((message,i)=>{const row=document.createElement('div');row.className='log';const mark=document.createElement('span');mark.textContent=i===0?'✳':'·';const body=document.createElement('div');body.textContent=message;const time=document.createElement('small');time.textContent=i===0?'刚刚':'小屋日记';body.append(time);row.append(mark,body);return row}));el('live-log').textContent=store.logs[0]??'';document.querySelector('.stage-label')!.textContent=`${store.rooms.length} 个房间 / 小小生活`;const select=el('owned-select') as HTMLSelectElement;const itemSignature=store.items.map(item=>`${item.id}:${item.roomId}`).join('|');if(select.dataset.items!==itemSignature){const selected=select.value;select.replaceChildren(...store.items.map(item=>{const option=document.createElement('option');option.value=item.id;option.textContent=`${sceneData.rooms.find(room=>room.id===item.roomId)?.label??'房间'} · ${catalog[item.type].name}`;return option}));if(store.items.some(item=>item.id===selected))select.value=selected;select.dataset.items=itemSignature}(el('inspect-furniture') as HTMLButtonElement).disabled=store.items.length===0;}
function renderShop(){el('shop').innerHTML=(Object.keys(catalog) as Kind[]).map(k=>`<button class="shop-item" data-kind="${k}"><span class="item-icon">${catalog[k].icon}</span><span class="item-name"><strong>${catalog[k].name}</strong><small>添加一件家具</small></span><span class="price">✳ ${catalog[k].price} &nbsp; +</span></button>`).join('');el('shop').querySelectorAll<HTMLButtonElement>('button').forEach(b=>b.onclick=()=>purchase(b.dataset.kind as Kind))}
store.addEventListener('change',ui);renderShop();ui();
el('reset-save').onclick=()=>{if(!window.confirm('确定重置？资金和已解锁地皮会回到开局'))return;resetSave();window.location.reload()};
el('gift-furniture').onclick=()=>{if(pending){logNotice('Bot 正在搬运，请稍等。');return}if(store.emit({type:'gift'}))purchase('plant')};
el('relocate-furniture').onclick=()=>{if(pending){logNotice('Bot 正在搬运，请稍等。');return}const item=store.items.find(entry=>entry.id===selectedItemId);if(!item)return;const others=store.items.filter(entry=>entry.id!==item.id);let target:Item|null=null;for(const room of activeRooms()){if(target)break;for(let z=room.position[1]+room.size[1]/2-.75;z>=room.position[1]-room.size[1]/2+.75&&!target;z-=.5)for(let x=room.position[0]+room.size[0]/2-.75;x>=room.position[0]-room.size[0]/2+.75;x-=.5){const candidate={...item,roomId:room.id,x,z};if(Math.hypot(x-item.x,z-item.z)<.75&&room.id===item.roomId)continue;if(validPlacement(candidate,others)&&preservesConnectivity([bot.position.x,bot.position.z],[bot.position.x,bot.position.z],[...others,candidate])){target=candidate;break}}}if(!target){logNotice('暂时没有安全的空位。');return}if(!store.moveItem(item.id,target))return;waypoints=[];arrival=null;activity='';setState('Idle',2);rebuild();el('item-details').hidden=true;el('inspect-furniture').focus()};
el('buy-room').onclick=()=>{if(pending){logNotice('Bot 正在搬运，请稍等。');return}const next=nextRoom();if(!next||store.coins<next.buildCost){logNotice('金币还不够，再攒一些吧。');return}if(!canUnlockRoom(next.id,[bot.position.x,bot.position.z],store.items)){logNotice('新房间的通道被家具挡住，请先调整附近的摆放。');return}if(!store.buyRoom(next.id,next.buildCost))return;setActiveRooms(store.rooms);renderRooms();resetHouseView();resize()};
for(const b of document.querySelectorAll<HTMLButtonElement>('[data-activity]'))b.onclick=()=>{if(pending){logNotice('Bot 正在搬运，请稍等。');return}if(!visitFurniture(b.dataset.activity as Kind))logNotice('暂时找不到去家具旁的路。')};
const showFeedback=createEventFeedback(el('event-flash'));
store.addEventListener('game',event=>showFeedback((event as CustomEvent).detail.type));
for(const b of document.querySelectorAll<HTMLButtonElement>('[data-event]'))b.onclick=()=>{const type=b.dataset.event as 'like'|'follow'|'gift';if(store.emit({type})){const count=b.querySelector<HTMLElement>('.event-count');if(count)count.textContent=String((Number(count.textContent)||0)+1);if(type==='follow')celebrationQueued=true}};
const ditherSlider=el('dither-strength') as HTMLInputElement;let ditherOn=true;ditherSlider.min='0';ditherSlider.max='1';ditherSlider.step='0.01';ditherSlider.value=String(look.dither.strength);const applyDither=()=>{dither.uniforms.uStrength.value=ditherOn?Number(ditherSlider.value):0;el('dither').textContent=`抖色：${ditherOn?'开启':'关闭'}`;el('dither').setAttribute('aria-label',ditherOn?'关闭抖色':'开启抖色')};ditherSlider.oninput=applyDither;el('dither').onclick=()=>{ditherOn=!ditherOn;applyDither()};applyDither();el('mode').onclick=()=>{mode=!mode;document.body.classList.toggle('portrait',mode);el('mode').textContent=mode?'退出直播':'竖屏直播';el('mode').setAttribute('aria-label',mode?'退出竖屏直播':'进入竖屏直播');controls.enabled=!mode;if(mode){controls.target.set(bot.position.x,BOT_BODY_CENTER_Y,bot.position.z);camera.position.copy(controls.target).add(liveCameraOffset);controls.update()}else resetHouseView();resize()};
const liveCameraOffset=new THREE.Vector3(12,9,12);const liveTarget=new THREE.Vector3();
function resetHouseView(){const center=houseCenter();controls.target.copy(center);camera.position.copy(center).add(new THREE.Vector3(12,9,12));controls.update()}
function fitView(aspect:number){camera.updateMatrixWorld();const right=new THREE.Vector3().setFromMatrixColumn(camera.matrixWorld,0),up=new THREE.Vector3().setFromMatrixColumn(camera.matrixWorld,1);const b=worldBoundsForRooms(store.rooms);let minX=Infinity,maxX=-Infinity,minY=Infinity,maxY=-Infinity;for(const dx of [b.minX,b.maxX])for(const dz of [b.minZ,b.maxZ])for(const y of [0,b.maxY]){const p=new THREE.Vector3(dx,y,dz).sub(controls.target);const x=p.dot(right),v=p.dot(up);minX=Math.min(minX,x);maxX=Math.max(maxX,x);minY=Math.min(minY,v);maxY=Math.max(maxY,v)}const fillX=mode?0.96:0.92,fillY=mode?0.82:0.9;return Math.max(8,(maxX-minX)/(fillX*aspect),(maxY-minY)/fillY)}
function resize(){const container=el('canvas'),w=container.clientWidth,h=container.clientHeight;if(!w||!h)return;renderer.setSize(w,h);composer.setSize(w,h);syncComposerDepth();syncPaperScale(dither,renderer.getPixelRatio());const aspect=w/h;const view=mode?24:fitView(aspect);camera.left=-view*aspect/2;camera.right=view*aspect/2;camera.top=view/2;camera.bottom=-view/2;camera.updateProjectionMatrix()}window.addEventListener('resize',resize);new ResizeObserver(resize).observe(el('canvas'));resize();
let last=performance.now();const gaze=new THREE.Vector3();const moveDir=new THREE.Vector2();function animate(now:number){requestAnimationFrame(animate);const dt=Math.min((now-last)/1000,.05);last=now;clock+=dt;timer-=dt;let gazeTarget:THREE.Vector3|null=null;
 if((state==='Move'||state==='Approach'||state==='Carry')&&waypoints.length){moveSpeed=Math.min(1,moveSpeed+botMotion.walk.accel*dt);const [x,z]=waypoints[0],dx=x-bot.position.x,dz=z-bot.position.z,dist=Math.hypot(dx,dz),step=botMotion.walk.speed*moveSpeed*dt;if(dist<step){bot.position.x=x;bot.position.z=z;waypoints.shift()}else{bot.position.x+=dx/dist*step;bot.position.z+=dz/dist*step;moveDir.set(dx/dist,dz/dist);bot.rotation.y=lerpAngle(bot.rotation.y,Math.atan2(dx,dz),1-Math.exp(-botMotion.walk.turnRate*dt))}gazeTarget=gaze.set(waypoints[0]?.[0]??x,BOT_BODY_CENTER_Y,waypoints[0]?.[1]??z)}
 else{moveSpeed=Math.max(0,moveSpeed-botMotion.walk.decel*dt);if(state==='Approach'&&!waypoints.length){if(pickupSpot){bot.rotation.y=lerpAngle(bot.rotation.y,Math.atan2(pickupSpot[0]-bot.position.x,pickupSpot[1]-bot.position.z),1-Math.exp(-botMotion.walk.turnRate*dt*1.4));gazeTarget=gaze.set(pickupSpot[0],BOT_BODY_CENTER_Y,pickupSpot[1])}liftStarted=clock;setState('Lift',botMotion.lift.duration)}else if(state==='Lift'&&timer<=0){waypoints=deliveryPath;moveSpeed=0;if(waypoints.length&&!segmentClear(bot.position.x,bot.position.z,waypoints[0][0],waypoints[0][1],store.items))snapBotToGrid();setState('Carry',0)}else if(state==='Carry'&&!waypoints.length){liftStarted=clock;placeFrom=[bot.position.x,bot.position.z];if(pending){bot.rotation.y=lerpAngle(bot.rotation.y,Math.atan2(pending.x-bot.position.x,pending.z-bot.position.z),1-Math.exp(-botMotion.walk.turnRate*dt*1.2));gazeTarget=gaze.set(pending.x,BOT_BODY_CENTER_Y,pending.z)}setState('Place',botMotion.place.duration)}else if(state==='Place'&&timer<=0&&pending){const item=store.finishPurchase();if(!item){setState('Idle',999);el('status').textContent='无法保存，家具尚未完成摆放';return}store.emit({type:'place',detail:catalog[item.type].name});pending=null;pickupSpot=null;if(carry)scene.remove(carry);carry=null;rebuild();activity='Admire';setState('Interact',3);el('status').textContent='BOT 正在欣赏新家具'}else if(state==='Move'&&!waypoints.length){
  if(arrival){
    activity=arrival;arrival=null;
    if(activityTarget){
      bot.rotation.y=lerpAngle(bot.rotation.y,Math.atan2(activityTarget[0]-bot.position.x,activityTarget[2]-bot.position.z),1-Math.exp(-botMotion.walk.turnRate*dt*1.5));
      gazeTarget=gaze.set(activityTarget[0],activityTarget[1],activityTarget[2]);
    }
    const duration=activity==='Sleep'?3.8:activity==='Hop'?botMotion.jump.duration:activity==='Use'?3.4:2.8;
    setState(activity==='Sleep'?'Sleep':activity==='Hop'?'Jump':'Interact',duration);
    const status=({Sleep:'BOT 在床边休息',Read:'BOT 正在阅读',Plant:'BOT 在看植物',Sit:'BOT 在椅子旁小憩',Light:'BOT 在欣赏暖光',Admire:'BOT 正在欣赏家具',Look:'BOT 正在仔细看看',Touch:'BOT 轻轻碰了碰小物件',Hop:'BOT 在小物件旁蹦了一下',Use:'BOT 正在体验小物件','':'BOT 正在探索'} as Record<BotActivity,string>)[activity];
    if(status)el('status').textContent=status;
  }else setState('Idle',0.8)
}else if(timer<=0&&!pending&&(state==='Idle'||state==='Interact'||state==='Sleep'||state==='Jump'))finishRoamTimer()}const idleEligible=state==='Idle'&&waypoints.length===0&&moveSpeed<=0.01&&!carry&&!pending&&!activity;
 if(idleEligible){idleFor+=dt;if(idleFor>=botMotion.idle.faceCameraDelay&&idleTurn==='none'){idleTurn='turning';idleTurnStarted=clock;idleStartYaw=bot.rotation.y;const cameraYaw=Math.atan2(camera.position.x-bot.position.x,camera.position.z-bot.position.z);const side=Math.sign(wrapAngle(idleStartYaw-cameraYaw))||1;idleYawDelta=wrapAngle(cameraYaw+side*botMotion.idle.faceCameraOffset-idleStartYaw)}if(idleTurn==='turning'){const turnT=smoothstep(0,botMotion.idle.faceCameraDuration,clock-idleTurnStarted);bot.rotation.y=lerpAngle(idleStartYaw,idleStartYaw+idleYawDelta,turnT);if(turnT>=1)idleTurn='done'}}else{idleFor=0;idleTurn='none'}
 if((state==='Interact'||state==='Sleep'||(state==='Jump'&&activity==='Hop'))&&activityTarget){bot.rotation.y=lerpAngle(bot.rotation.y,Math.atan2(activityTarget[0]-bot.position.x,activityTarget[2]-bot.position.z),1-Math.exp(-botMotion.walk.turnRate*dt*1.5));gazeTarget=gaze.set(activityTarget[0],activityTarget[1],activityTarget[2])}
 else if(state==='Lift'&&pickupSpot){bot.rotation.y=lerpAngle(bot.rotation.y,Math.atan2(pickupSpot[0]-bot.position.x,pickupSpot[1]-bot.position.z),1-Math.exp(-botMotion.walk.turnRate*dt*1.4));gazeTarget=gaze.set(pickupSpot[0],BOT_BODY_CENTER_Y,pickupSpot[1])}
 else if(state==='Place'&&pending){bot.rotation.y=lerpAngle(bot.rotation.y,Math.atan2(pending.x-bot.position.x,pending.z-bot.position.z),1-Math.exp(-botMotion.walk.turnRate*dt*1.4));gazeTarget=gaze.set(pending.x,BOT_BODY_CENTER_Y,pending.z)}
 else if(!gazeTarget&&pickupSpot&&(state==='Approach'))gazeTarget=gaze.set(pickupSpot[0],BOT_BODY_CENTER_Y,pickupSpot[1]);
 const jumpPhase=state==='Jump'?Math.min(1,(clock-jumpStarted)/botMotion.jump.duration):0;
 botView.update(state,activity,clock,camera.quaternion,{moveSpeed,moveDir:moveDir.lengthSq()?moveDir:null,jumpPhase,gaze:gazeTarget,cameraPos:camera.position});
 if(carry&&state==='Carry')carry.position.set(bot.position.x,botMotion.carry.holdY+Math.abs(Math.sin(clock*botMotion.carry.bobHz))*.04,bot.position.z);else if(carry&&state==='Lift'&&pickupSpot){const u=smoothstep(0,1,Math.min(1,(clock-liftStarted)/botMotion.lift.duration));carry.position.set(pickupSpot[0],THREE.MathUtils.lerp(botMotion.lift.startY,botMotion.carry.holdY,u),pickupSpot[1])}else if(carry&&state==='Place'&&pending){const t=Math.min(1,(clock-liftStarted)/botMotion.place.duration),h=smoothstep(0,botMotion.place.horizontalThrough,t),v=smoothstep(botMotion.place.dropStart,1,t);carry.position.set(THREE.MathUtils.lerp(placeFrom[0],pending.x,h),THREE.MathUtils.lerp(botMotion.place.holdY,botMotion.place.endY,v),THREE.MathUtils.lerp(placeFrom[1],pending.z,h))}
 if(mode){liveTarget.set(bot.position.x,BOT_BODY_CENTER_Y,bot.position.z);controls.target.lerp(liveTarget,1-Math.exp(-4*dt));camera.position.copy(controls.target).add(liveCameraOffset)}controls.update();composer.render()};
/** Read 9 CSS-pixel canvas patches in the default house view. Positive deltas mean the expected wall is darker. */
function verifySurfaceGradients(){
 const room=allRooms.find(entry=>entry.id==='room-1');if(!room)throw new Error('room-1 is required for the surface gradient probe');
 camera.updateMatrixWorld(true);composer.render();
 const gl=renderer.getContext(),width=gl.drawingBufferWidth,height=gl.drawingBufferHeight;
 const patchSize=Math.max(3,Math.round(9*renderer.getPixelRatio())|1);
 const linear=(value:number)=>{const channel=value/255;return channel<=.04045?channel/12.92:Math.pow((channel+.055)/1.055,2.4)};
 const sample=(world:THREE.Vector3)=>{
  const ndc=world.clone().project(camera),x=Math.floor((ndc.x*.5+.5)*width),y=Math.floor((ndc.y*.5+.5)*height);
  if(ndc.z < -1||ndc.z > 1||x<0||x>=width||y<0||y>=height)throw new Error('Surface gradient sample is outside the canvas; reset to the default house view and retry');
  const left=Math.max(0,Math.min(width-patchSize,x-Math.floor(patchSize/2))),bottom=Math.max(0,Math.min(height-patchSize,y-Math.floor(patchSize/2)));
  const pixels=new Uint8Array(patchSize*patchSize*4);gl.readPixels(left,bottom,patchSize,patchSize,gl.RGBA,gl.UNSIGNED_BYTE,pixels);
  let sum=0;for(let i=0;i<pixels.length;i+=4)sum+=.2126*linear(pixels[i])+.7152*linear(pixels[i+1])+.0722*linear(pixels[i+2]);
  return{luma:sum/(patchSize*patchSize),pixel:{x,y},sampleSize:patchSize};
 };
 const [rx,rz]=room.position,[rw,rd]=room.size,northZ=rz-rd/2+.06,westX=rx-rw/2+.06;
 const northTop=sample(new THREE.Vector3(rx+rw/2-.8,1.98,northZ));
 const northBottom=sample(new THREE.Vector3(rx+rw/2-.8,.42,northZ));
 const northMid=sample(new THREE.Vector3(rx+rw/2-.8,1.2,northZ));
 const westMid=sample(new THREE.Vector3(westX,1.2,rz+rd/2-.8));
 return{
  northWall:{topLuma:northTop.luma,bottomLuma:northBottom.luma,bottomDarkening:northTop.luma-northBottom.luma,topSample:northTop,bottomSample:northBottom},
  wallLighting:{litSide:'west',litLuma:westMid.luma,backLitSide:'north',backLitLuma:northMid.luma,backLitDarkening:westMid.luma-northMid.luma,litSample:westMid,backLitSample:northMid},
  checks:{bottomDarkerThanTop:northTop.luma>northBottom.luma,backLitDarkerThanLit:westMid.luma>northMid.luma},
  expected:{bottomDarkeningGreaterThan:0,backLitDarkeningGreaterThan:0},
 };
}
(window as unknown as {__botHouseDebug?:Record<string,unknown>}).__botHouseDebug={
sample:()=>({state,bot:{x:bot.position.x,y:bot.position.y,z:bot.position.z,ry:bot.rotation.y},carry:carry?{x:carry.position.x,y:carry.position.y,z:carry.position.z}:null,pickupSpot,pending:pending?{x:pending.x,z:pending.z}:null,placeFrom,waypoints:waypoints.slice(0,3),moveSpeed,botRadius:BOT_RADIUS,idleFor,idleTurn,activity,activityTarget,activeInteractableId,lastInteractableId}),
verifySurfaceGradients,
listInteractables:()=>interactables.map(target=>({...target,standSpot:[...target.standSpot],standCandidates:target.standCandidates.map(point=>[...point]),facingPoint:[...target.facingPoint]})),
get interactableCount(){return interactables.length},
interactablesByRoom:()=>Object.fromEntries(allRooms.filter(room=>room.kind==='indoor').map(room=>[room.id,interactables.filter(target=>target.roomId===room.id).length])),
setBotYaw:(y:number)=>{bot.rotation.y=y;controls.update()},
lockBotAt:(x:number,z:number)=>{bot.position.set(x,0,z);waypoints.length=0;moveSpeed=0;setState('Idle',999);arrival=null;activity=''},
focusCloseup:()=>{controls.target.set(bot.position.x,BOT_BODY_CENTER_Y*.55,bot.position.z);camera.position.set(bot.position.x+4.2,3.4,bot.position.z+4.2);controls.update();const container=el('canvas'),aspect=container.clientWidth/Math.max(1,container.clientHeight),view=7;camera.left=-view*aspect/2;camera.right=view*aspect/2;camera.top=view/2;camera.bottom=-view/2;camera.updateProjectionMatrix()},
resetHouseView:()=>{resetHouseView()},
faceCamera:()=>{const dx=camera.position.x-bot.position.x,dz=camera.position.z-bot.position.z;bot.rotation.y=Math.atan2(dx,dz);controls.update()},
backToCamera:()=>{const dx=camera.position.x-bot.position.x,dz=camera.position.z-bot.position.z;bot.rotation.y=Math.atan2(dx,dz)+Math.PI;controls.update()},
setDitherStrength:(v:number)=>{dither.uniforms.uStrength.value=v;ditherOn=v>0;el('dither').textContent=`抖色：${ditherOn?'开启':'关闭'}`},
setBotShells:(o: {showOutline?: boolean})=>{botView.setShells?.(o)},
probeDecals:()=>botView.probeDecals?.(),
setBlinkOverride:(v:number|null)=>botView.setBlinkOverride?.(v),
botEyeClosedRatio:()=>botView.botEyeClosedRatio?.(),
botScreenDisc:()=>{const c=new THREE.Vector3(bot.position.x,BOT_BODY_CENTER_Y,bot.position.z);const top=c.clone();top.y+=BOT_VISUAL_RADIUS;const right=c.clone();right.x+=BOT_VISUAL_RADIUS;const s=new THREE.Vector3(),t=new THREE.Vector3(),r=new THREE.Vector3();s.copy(c).project(camera);t.copy(top).project(camera);r.copy(right).project(camera);const rect=renderer.domElement.getBoundingClientRect();const px=(v:THREE.Vector3)=>((v.x*.5+.5)*rect.width+rect.left);const py=(v:THREE.Vector3)=>((-v.y*.5+.5)*rect.height+rect.top);const cx=px(s),cy=py(s),rad=Math.max(Math.hypot(px(t)-cx,py(t)-cy),Math.hypot(px(r)-cx,py(r)-cy));return{cx,cy,rad,rect:{w:rect.width,h:rect.height}};},
renderStats:()=>({calls:renderer.info.render.calls,triangles:renderer.info.render.triangles,frameTimeMs:null as number|null}),
benchRender:(frames=90)=>new Promise<{calls:number;triangles:number;frameTimeMs:number}>((resolve)=>{let i=0;let peakCalls=0;let peakTris=0;const t0=performance.now();const run=()=>{composer.render();peakCalls=Math.max(peakCalls,renderer.info.render.calls);peakTris=Math.max(peakTris,renderer.info.render.triangles);if(++i>=frames){resolve({calls:peakCalls,triangles:peakTris,frameTimeMs:(performance.now()-t0)/frames});return}requestAnimationFrame(run)};requestAnimationFrame(run)}),
setSaveRooms:(ids:string[])=>{if(store.storageError)return false;store.rooms=[...ids];setActiveRooms(store.rooms);renderRooms();resetHouseView();resize();return true},
countSceneMeshes:()=>{let n=0;scene.traverse((o)=>{if(o instanceof THREE.Mesh&&o.visible)n++});return n},
countBotEyeMeshes:()=>botView.countEyeMeshesInScene?.()??0,
auditEyeMeshesAtYaws:(yaws:number[])=>yaws.map((y)=>{bot.rotation.y=y;controls.update();composer.render();const probe=botView.probeDecals?.() as {eyes?:{visible:boolean}[]}|undefined;return{yaw:y,count:botView.countEyeMeshesInScene?.()??0,visibleProbe:probe?.eyes?.filter((e)=>e.visible).length??0}}),
perfBeforeMeshes:()=>perfBeforeMeshes,
perfAfterMeshes:()=>perfAfterMeshes,
};
requestAnimationFrame(animate);
