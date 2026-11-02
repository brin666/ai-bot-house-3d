import * as THREE from 'three';
const material=(color:string)=>new THREE.MeshStandardMaterial({color,roughness:1});
function block(parent:THREE.Object3D,w:number,h:number,d:number,x:number,y:number,z:number,color:string){const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),material(color));m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;parent.add(m);return m}
/** Quiet fixed set dressing; all pieces are independently authored geometry. */
export function createRoomDetails(){const group=new THREE.Group();group.name='room-details';
 // Woven rugs sit just above the real floor, with simple sewn borders.
 for(const [x,z,w,d,color] of [[-.25,1.8,2.15,1.1,'#d8b6a5'],[8.2,.85,2.5,1.6,'#b3c8bc']] as const){block(group,w,.018,d,x,.078,z,color);block(group,w-.16,.006,d-.16,x,.091,z,'#e9ddca');}
 // Living-room bookcase sits on the back boundary, outside the bot walkable floor.
 block(group,1.8,1.5,.35,9.3,.82,-3.67,'#8b796b');block(group,1.66,1.36,.12,9.3,.84,-3.46,'#c7bba4');
 for(const y of [.22,.7,1.18,1.55])block(group,1.8,.075,.38,9.3,y,-3.62,'#968675');
 for(let i=0;i<9;i++){const x=8.6+(i%5)*.26,y=i<5?.45:.94;const palette=['#aebda8','#d5a192','#e6c995','#8699a0','#d9d0bd'];block(group,.15,.36,.20,x,y,-3.40,palette[i%5]);}
 // Two small framed wall pictures and a window with a flower on its sill.
 for(const [x,color] of [[6.25,'#b9c9be'],[11.4,'#e0b3a1']] as const){block(group,.9,.72,.06,x,1.57,-3.89,'#9b8e7b');block(group,.75,.57,.07,x,1.57,-3.83,'#f6eddb');block(group,.52,.31,.08,x,1.57,-3.78,color);}
 // A little paper window and bunting give the living area its own identity.
 // Everything stays on the wall or on the existing bookcase, clear of the floor grid.
 block(group,.94,.85,.08,7.45,1.69,-3.87,'#f4ead6');
 block(group,.76,.67,.04,7.45,1.69,-3.81,'#9bb5ad');
 block(group,.055,.67,.05,7.45,1.69,-3.77,'#f4ead6');
 block(group,.76,.045,.05,7.45,1.69,-3.77,'#f4ead6');
 block(group,1.04,.07,.16,7.45,1.24,-3.78,'#e8dcc4');
 block(group,.55,.035,.035,10.48,2.12,-3.79,'#b5aa96');
 for(const [x,color] of [[10.25,'#dbad99'],[10.48,'#e3ca91'],[10.71,'#aac1b2']] as const){
  const flag=new THREE.Mesh(new THREE.ConeGeometry(.105,.21,3),material(color));flag.rotation.z=Math.PI;flag.rotation.y=Math.PI/2;flag.position.set(x,2.00,-3.77);group.add(flag);
 }
 // A storage box and a tiny framed keepsake rest on the bookcase.
 block(group,.42,.23,.28,8.78,1.70,-3.58,'#d2aa96');
 block(group,.44,.045,.30,8.78,1.83,-3.58,'#ead5bd');
 block(group,.37,.34,.06,9.68,1.76,-3.55,'#a99a83');
 block(group,.27,.24,.07,9.68,1.76,-3.51,'#e7d8bf');
 // Living area side table, cup and lamp: grouped as a fixed prop on the back edge.
 block(group,.9,.08,.52,7.0,.67,-3.2,'#a8937c');for(const dx of [-.35,.35])for(const dz of [-.18,.18])block(group,.07,.62,.07,7+dx,.34,-3.2+dz,'#a8937c');
 const cup=new THREE.Mesh(new THREE.CylinderGeometry(.10,.08,.19,12),material('#e8d4a4'));cup.position.set(6.8,.81,-3.15);cup.castShadow=true;group.add(cup);
 // A small warm paper lampshade creates a quiet focal point without bloom.
 const stem=new THREE.Mesh(new THREE.CylinderGeometry(.025,.025,.35,8),material('#777a69'));stem.position.set(7.2,.87,-3.2);group.add(stem);const shade=new THREE.Mesh(new THREE.ConeGeometry(.19,.23,8),material('#e9cb8a'));shade.position.set(7.2,1.1,-3.2);group.add(shade);
 return group;}
