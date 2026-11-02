import * as THREE from 'three';
import { BOT_RADIUS } from './bot-metrics';
import { flatMaterial, look } from './look';
export type BotState='Idle'|'Move'|'Jump'|'Sleep'|'Interact'|'Approach'|'Lift'|'Carry'|'Place';
export type BotActivity=''|'Sleep'|'Read'|'Plant'|'Admire';
export function createBot(){
 const root=new THREE.Group(),visual=new THREE.Group();root.add(visual);
 const body=new THREE.Mesh(new THREE.SphereGeometry(BOT_RADIUS,24,16),flatMaterial(look.palette.botBody));body.position.y=.39;body.castShadow=true;visual.add(body);
 const eyes:THREE.Mesh[]=[];for(const x of [-.13,.13]){const eye=new THREE.Mesh(new THREE.SphereGeometry(.055,12,8),flatMaterial(look.palette.botEye));eye.position.set(x,.46,.335);visual.add(eye);eyes.push(eye)}
 const book=new THREE.Group();function part(w:number,h:number,d:number,y:number,color:string){const mesh=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),flatMaterial(color));mesh.position.y=y;book.add(mesh)}part(.40,.04,.28,0,look.palette.coral);part(.37,.015,.25,.03,look.palette.cream);book.position.set(0,.33,.46);book.rotation.x=-.22;book.visible=false;visual.add(book);
 // Small original geometric sparkles make the appreciation beat readable at a distance.
 const sparkles=new THREE.Group();const sparkleInk=new THREE.MeshBasicMaterial({color:look.palette.spark});for(const [x,y,z] of [[-.48,.88,.15],[.46,1.02,.05]] as const){const star=new THREE.Group();for(const angle of [0,Math.PI/2]){const ray=new THREE.Mesh(new THREE.BoxGeometry(.16,.035,.035),sparkleInk);ray.rotation.z=angle;star.add(ray)}star.position.set(x,y,z);sparkles.add(star)}sparkles.visible=false;visual.add(sparkles);
 // Small camera-facing pictograms identify the activity when the Bot faces away.
 const badge=new THREE.Group(),icons:Record<'Sleep'|'Read'|'Plant',THREE.Group>={Sleep:new THREE.Group(),Read:new THREE.Group(),Plant:new THREE.Group()};badge.position.set(0,1.15,0);root.add(badge);
 function flat(parent:THREE.Object3D,w:number,h:number,x:number,y:number,z:number,color:string,angle=0){const mesh=new THREE.Mesh(new THREE.PlaneGeometry(w,h),new THREE.MeshBasicMaterial({color,side:THREE.DoubleSide,depthTest:false,depthWrite:false}));mesh.position.set(x,y,z);mesh.rotation.z=angle;mesh.renderOrder=1000;parent.add(mesh)}
 flat(badge,.55,.43,0,0,0,look.palette.ink);flat(badge,.50,.38,0,0,.001,look.palette.frameMat);
 for(const [x,y,w,h,a] of [[0,.10,.20,.035,0],[0,0,.22,.035,Math.PI/4],[0,-.10,.20,.035,0]] as const)flat(icons.Sleep,w,h,x,y,.003,'#566f80',a);
 flat(icons.Read,.29,.23,0,0,.003,'#b67f6a');flat(icons.Read,.12,.17,-.07,0,.005,'#fbf3df');flat(icons.Read,.12,.17,.07,0,.005,'#fbf3df');flat(icons.Read,.012,.17,0,0,.006,'#8c7d6e');
 flat(icons.Plant,.025,.22,0,-.015,.003,'#6d836b');flat(icons.Plant,.14,.08,-.065,.04,.004,'#91ad86',-.5);flat(icons.Plant,.14,.08,.065,.075,.004,'#91ad86',.5);
 for(const icon of Object.values(icons))badge.add(icon);badge.visible=false;root.position.set(0,0,2);root.rotation.y=Math.PI/4;
 function update(state:BotState,activity:BotActivity,time:number,cameraRotation:THREE.Quaternion){if(state==='Jump')visual.position.y=Math.abs(Math.sin(time*5))*.38;else if(state==='Move'||state==='Carry'||state==='Approach')visual.position.y=Math.abs(Math.sin(time*10))*.055;else if(state==='Interact'&&activity==='Admire')visual.position.y=Math.abs(Math.sin(time*3))*.055;else visual.position.y=Math.sin(time*2)*.015;visual.rotation.z=state==='Sleep'?.12*Math.sin(time*.7):activity==='Plant'?.12*Math.sin(time*2):activity==='Admire'?.08*Math.sin(time*3):0;sparkles.visible=state==='Interact'&&activity==='Admire';sparkles.scale.setScalar(.8+.2*Math.sin(time*5));visual.scale.y=state==='Sleep'?.91:1;book.visible=state==='Interact'&&activity==='Read';const activeIcon=state==='Sleep'?'Sleep':state==='Interact'&&(activity==='Read'||activity==='Plant')?activity:null;badge.visible=activeIcon!==null;for(const [name,icon] of Object.entries(icons))icon.visible=name===activeIcon;badge.quaternion.copy(root.quaternion).invert().multiply(cameraRotation);badge.position.y=1.15+Math.sin(time*2)*.025;eyes.forEach(eye=>eye.scale.y=state==='Sleep'?.12:(time%4<.13?.12:1))}
 return {root,update};
}
