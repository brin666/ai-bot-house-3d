import { catalog, type Item, type Kind } from './store';
import { path, validPlacement, preservesConnectivity } from './navigation';
import data from './scene.json';
type Room=typeof data.rooms[number];
export type DeliveryPlan={item:Item;pickup:[number,number];toPickup:[number,number][];toTarget:[number,number][]};
export function planDelivery(kind:Kind,rooms:Room[],items:Item[],botX:number,botZ:number):DeliveryPlan|null{
 const info=catalog[kind];
 let plan:{item:Item;pickup:[number,number];toPickup:[number,number][];toTarget:[number,number][]}|null=null;
 const pickups:[[number,number],[number,number],[number,number],[number,number]]=[[0,3],[1,3],[-1,3],[0,2]];
 for(const pickup of pickups){const toPickup=path(botX,botZ,...pickup,items);if(!toPickup.length&&Math.hypot(botX-pickup[0],botZ-pickup[1])>.3)continue;
  for(const room of [...rooms].reverse()){if(plan)break;
   for(let z=Math.floor((room.position[1]+room.size[1]/2-.75)*2)/2;z>=room.position[1]-room.size[1]/2+.75&&!plan;z-=.5)for(let x=Math.floor((room.position[0]+room.size[0]/2-.75)*2)/2;x>=room.position[0]-room.size[0]/2+.75;x-=.5){
    const item:Item={id:`${kind}-${Date.now()}`,type:kind,roomId:room.id,x,z,rotation:0,purchased:true,price:info.price};if(!validPlacement(item,items)||Math.hypot(x-pickup[0],z-pickup[1])<1.1)continue;
    const [w,d]=info.size;for(const [tx,tz] of [[x,z+d/2+.6],[x+w/2+.6,z],[x-w/2-.6,z],[x,z-d/2-.6]]){const toTarget=path(...pickup,tx,tz,items);if(toTarget.length&&preservesConnectivity(toTarget[toTarget.length-1],pickup,[...items,item])){plan={item,pickup,toPickup,toTarget};break}}if(plan)break;
   }
  }if(plan)break;
 }
 return plan;
}

