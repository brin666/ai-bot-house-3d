import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
/** 8×8 Bayer screen: integer threshold pattern remains anchored to the output pixels. */
export function createPaperPass(){return new ShaderPass({
 uniforms:{tDiffuse:{value:null},strength:{value:.045},grain:{value:.004}},
 vertexShader:`varying vec2 vUv; void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
 fragmentShader:`uniform sampler2D tDiffuse; uniform float strength; uniform float grain; varying vec2 vUv;
 float bayer(vec2 p){float x=mod(p.x,8.);float y=mod(p.y,8.);float n=0.;float weight=16.;for(int i=0;i<3;i++){float bx=mod(x,2.);float by=mod(y,2.);float v=mod(2.*bx+3.*by,4.);n+=v*weight;x=floor(x/2.);y=floor(y/2.);weight/=4.;}return (n+.5)/64.;}
 void main(){vec4 c=texture2D(tDiffuse,vUv);vec2 px=floor(gl_FragCoord.xy);float dotValue=bayer(px)-.5;float noise=fract(sin(dot(px,vec2(12.9898,78.233)))*43758.5453)-.5;vec3 tone=clamp(c.rgb+dotValue*strength+noise*grain,0.,1.);c.rgb=floor(tone*18.+.5)/18.;gl_FragColor=c;}`
 });}
