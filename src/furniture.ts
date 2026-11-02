import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { catalog, type Item } from './store';
import { flatMaterial, look } from './look';
const p = look.palette;
const colors={wood:flatMaterial(p.wood),dark:flatMaterial(p.woodDark),cream:flatMaterial(p.cream),pink:flatMaterial(p.coral),green:flatMaterial(p.leaf),black:flatMaterial(p.ink),gold:flatMaterial(p.gold)};
function box(g:THREE.Group,w:number,h:number,d:number,x:number,y:number,z:number,m:THREE.Material){const a=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),m);a.position.set(x,y,z);a.castShadow=true;a.receiveShadow=true;g.add(a);return a}
function leg(g:THREE.Group,x:number,z:number,h=.55){box(g,.12,h,.12,x,h/2,z,colors.dark)}
export function furniture(item:Item){const g=new THREE.Group();g.name=item.id;const t=item.type;
 if(t==='bed'){box(g,1.65,.28,2.25,0,.28,0,colors.wood);box(g,1.5,.27,2.02,0,.55,0,colors.cream);box(g,1.48,.12,1.15,0,.75,.37,colors.pink);box(g,1.02,.15,.46,0,.77,-.67,colors.cream);box(g,1.7,.8,.12,0,.55,-1.1,colors.dark);for(const x of [-.68,.68])for(const z of [-.9,.9])leg(g,x,z,.2)}
 if(t==='table'){box(g,1.8,.14,1,0,.85,0,colors.wood);for(const x of [-.75,.75])for(const z of [-.36,.36])leg(g,x,z,.8);box(g,.45,.06,.35,-.3,.96,0,colors.cream);box(g,.3,.04,.2,-.3,1,.02,colors.pink)}
 if(t==='chair'){box(g,.8,.13,.8,0,.5,0,colors.cream);box(g,.8,.7,.12,0,.88,-.34,colors.wood);for(const x of [-.3,.3])for(const z of [-.3,.3])leg(g,x,z,.47)}
 if(t==='lamp'){box(g,.5,.08,.5,0,.05,0,colors.dark);box(g,.09,.9,.09,0,.5,0,colors.dark);const shade=new THREE.Mesh(new THREE.ConeGeometry(.35,.38,8,1,true),colors.gold);shade.position.y=.98;g.add(shade);const bulb=new THREE.Mesh(new THREE.SphereGeometry(.13,8,6),colors.cream);bulb.position.y=.84;g.add(bulb)}
 if(t==='plant'){const pot=new THREE.Mesh(new THREE.CylinderGeometry(.3,.23,.48,8),colors.pink);pot.position.y=.25;pot.castShadow=true;g.add(pot);for(let i=0;i<7;i++){const leaf=new THREE.Mesh(new THREE.SphereGeometry(.23,7,5),colors.green);leaf.position.set(Math.sin(i*2.4)*.24,.62+(i%3)*.12,Math.cos(i*2.4)*.22);leaf.scale.set(.65,1.5,.65);leaf.rotation.z=Math.sin(i)*.55;leaf.castShadow=true;g.add(leaf)}}
 g.position.set(item.x,0,item.z);g.rotation.y=item.rotation;
 // Keep the original mesh until a configured GLB has loaded successfully.
 const model=catalog[item.type].model;if(model){const fallback=[...g.children];new GLTFLoader().load(import.meta.env.BASE_URL+model.url,(loaded)=>{const replacement=loaded.scene;if(g.userData.disposed){releaseGlb(replacement);return}replacement.scale.setScalar(model.scale);replacement.rotation.y=model.rotation;replacement.traverse(o=>{if(o instanceof THREE.Mesh){o.castShadow=true;o.receiveShadow=true;if(!o.geometry.attributes.normal)o.geometry.computeVertexNormals();const src=Array.isArray(o.material)?o.material:[o.material];const next=src.map(entry=>{const colored=entry as THREE.MeshStandardMaterial;return new THREE.MeshLambertMaterial({color:colored.color??p.gold,map:colored.map??null,vertexColors:colored.vertexColors})});o.material=next.length===1?next[0]:next}});for(const child of fallback){child.traverse(o=>{if(o instanceof THREE.Mesh)o.geometry.dispose()});g.remove(child)}g.userData.glbLoaded=true;g.add(replacement)},undefined,()=>{/* Keep the independently built geometry on failure. */});}
 return g}

function releaseGlb(root:THREE.Object3D){root.traverse(object=>{if(!(object instanceof THREE.Mesh))return;object.geometry.dispose();const materials=Array.isArray(object.material)?object.material:[object.material];for(const material of materials){for(const value of Object.values(material))if(value instanceof THREE.Texture)value.dispose();material.dispose()}})}
export function disposeFurniture(root:THREE.Object3D){root.userData.disposed=true;if(root.userData.glbLoaded)releaseGlb(root);else root.traverse(object=>{if(object instanceof THREE.Mesh)object.geometry.dispose()})}
// Optional Blender-exported GLB replacement. The caller owns placement and collision metadata.
export async function loadGlb(url:string){return (await new GLTFLoader().loadAsync(url)).scene}
// Conservative world-space footprint for any orientation, not just quarter turns.
export function footprint(item:Item):[number,number]{const [w,d]=catalog[item.type].size,c=Math.abs(Math.cos(item.rotation)),s=Math.abs(Math.sin(item.rotation));return [w*c+d*s,w*s+d*c]}
// Catalog interaction points are in the furniture's local X/Z coordinates.
export function interactionCandidates(item:Item):[number,number][]{const info=catalog[item.type],[w,d]=info.size;const local:[number,number][]=[info.interaction,[w/2+.55,d/2+.55],[0,d/2+.55],[w/2+.55,0],[-w/2-.55,0],[0,-d/2-.55]];const c=Math.cos(item.rotation),s=Math.sin(item.rotation);return local.map(([x,z])=>[item.x+x*c+z*s,item.z-x*s+z*c])}

