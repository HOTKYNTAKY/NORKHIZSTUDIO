import{W as U,S as $,F as J,P as K,G as Q,C as t,M as C,I as W,a as ee,b as oe,c as G,T as H,A as te,d as R,e as ne,B as ie,f as ae,g as re,h as se,i as ce,j as b}from"./three-Bf7nP-b_.js";const le=`
vec3 mod289(vec3 x){return x - floor(x * (1.0/289.0)) * 289.0;}
vec4 mod289(vec4 x){return x - floor(x * (1.0/289.0)) * 289.0;}
vec4 permute(vec4 x){return mod289(((x*34.0)+1.0)*x);}
vec4 taylorInvSqrt(vec4 r){return 1.79284291400159 - 0.85373472095314 * r;}
float snoise(vec3 v){
  const vec2 C = vec2(1.0/6.0, 1.0/3.0);
  const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);
  vec3 i  = floor(v + dot(v, C.yyy));
  vec3 x0 = v - i + dot(i, C.xxx);
  vec3 g = step(x0.yzx, x0.xyz);
  vec3 l = 1.0 - g;
  vec3 i1 = min(g.xyz, l.zxy);
  vec3 i2 = max(g.xyz, l.zxy);
  vec3 x1 = x0 - i1 + C.xxx;
  vec3 x2 = x0 - i2 + C.yyy;
  vec3 x3 = x0 - D.yyy;
  i = mod289(i);
  vec4 p = permute(permute(permute(
      i.z + vec4(0.0, i1.z, i2.z, 1.0))
      + i.y + vec4(0.0, i1.y, i2.y, 1.0))
      + i.x + vec4(0.0, i1.x, i2.x, 1.0));
  float n_ = 0.142857142857;
  vec3 ns = n_ * D.wyz - D.xzx;
  vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
  vec4 x_ = floor(j * ns.z);
  vec4 y_ = floor(j - 7.0 * x_);
  vec4 x = x_ * ns.x + ns.yyyy;
  vec4 y = y_ * ns.x + ns.yyyy;
  vec4 h = 1.0 - abs(x) - abs(y);
  vec4 b0 = vec4(x.xy, y.xy);
  vec4 b1 = vec4(x.zw, y.zw);
  vec4 s1 = floor(b0)*2.0 + 1.0;
  vec4 s2 = floor(b1)*2.0 + 1.0;
  vec4 sh = -step(h, vec4(0.0));
  vec4 a0 = b0.xzyw + s1.xzyw*sh.xxyy;
  vec4 a1 = b1.xzyw + s2.xzyw*sh.zzww;
  vec3 p0 = vec3(a0.xy, h.x);
  vec3 p1 = vec3(a0.zw, h.y);
  vec3 p2 = vec3(a1.xy, h.z);
  vec3 p3 = vec3(a1.zw, h.w);
  vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2,p2), dot(p3,p3)));
  p0 *= norm.x; p1 *= norm.y; p2 *= norm.z; p3 *= norm.w;
  vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
  m = m * m;
  return 42.0 * dot(m*m, vec4(dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3)));
}
`,ve=`
uniform float uTime;
uniform float uDistort;
uniform float uFreq;
varying float vElev;
varying vec3 vNormal;
varying vec3 vView;
${le}
void main(){
  float n = snoise(position * uFreq + vec3(uTime * 0.16));
  float n2 = snoise(position * (uFreq * 2.3) - vec3(uTime * 0.11)) * 0.35;
  float elev = (n + n2) * uDistort;
  vec3 displaced = position + normal * elev;
  vElev = elev;
  vec4 mv = modelViewMatrix * vec4(displaced, 1.0);
  vNormal = normalize(normalMatrix * normal);
  vView = normalize(-mv.xyz);
  gl_Position = projectionMatrix * mv;
}
`,xe=`
uniform vec3 uColorA;
uniform vec3 uColorB;
uniform vec3 uColorC;
uniform float uTime;
uniform float uDim;
varying float vElev;
varying vec3 vNormal;
varying vec3 vView;
void main(){
  float fresnel = pow(1.0 - abs(dot(normalize(vNormal), normalize(vView))), 2.4);
  float t = smoothstep(-0.55, 0.85, vElev);
  vec3 col = mix(uColorA, uColorB, t);
  col = mix(col, uColorC, fresnel * 0.9);
  col += fresnel * 0.35 * uColorB;
  col += vec3(0.015, 0.015, 0.03);
  col *= uDim;
  gl_FragColor = vec4(col, 1.0);
}
`,m=[{a:new t("#0b0620"),b:new t("#6d5cff"),c:new t("#5ee7ff")},{a:new t("#160b02"),b:new t("#d8b46a"),c:new t("#ff8a5c")},{a:new t("#02141a"),b:new t("#13b8c9"),c:new t("#8b7bff")},{a:new t("#12060f"),b:new t("#c65cff"),c:new t("#ffd95e")}];function j(y,h,v,u,g,p){const x=new Float32Array(y*3);for(let e=0;e<y;e++){const o=h+Math.random()*(v-h),d=Math.random()*Math.PI*2,a=Math.acos(2*Math.random()-1);x[e*3]=o*Math.sin(a)*Math.cos(d),x[e*3+1]=o*Math.sin(a)*Math.sin(d)*.72,x[e*3+2]=o*Math.cos(a)}const c=new ie;c.setAttribute("position",new ae(x,3));const s=new re({color:u,size:g,transparent:!0,opacity:p,blending:se,depthWrite:!1,sizeAttenuation:!0});return new ce(c,s)}function de(y,{reducedMotion:h=!1}={}){if(h)return null;let v;try{v=new U({canvas:y,antialias:!0,alpha:!0,powerPreference:"high-performance"})}catch{return null}const u=Math.min(window.innerWidth,window.innerHeight)<760,g=u?[1.5,1.2,1]:[1.75,1.4,1.1,1];let p=0;const x=()=>v.setPixelRatio(Math.min(window.devicePixelRatio||1,g[p]));x(),v.setSize(window.innerWidth,window.innerHeight),v.setClearColor(0,0);const c=new $;c.fog=new J(328968,.055);const s=new K(42,window.innerWidth/window.innerHeight,.1,100);s.position.set(0,0,8.2);const e=new Q;c.add(e);const o={uTime:{value:0},uDistort:{value:.42},uFreq:{value:.85},uDim:{value:1},uColorA:{value:m[0].a.clone()},uColorB:{value:m[0].b.clone()},uColorC:{value:m[0].c.clone()}},d=new C(new W(1.85,u?24:40),new ee({uniforms:o,vertexShader:ve,fragmentShader:xe}));e.add(d);const a={zMul:1,sMul:1,yOff:0},q=()=>{const i=window.innerWidth/window.innerHeight;i<1?(a.zMul=b.clamp(.95/i,1.15,1.6),a.sMul=b.clamp(i+.28,.68,.9),a.yOff=.55,o.uDim.value=.78):(a.zMul=1,a.sMul=1,a.yOff=0,o.uDim.value=1)};q();const A=new C(new W(2.35,3),new oe({color:9141247,wireframe:!0,transparent:!0,opacity:.07}));e.add(A);const k=new G({color:14201962,metalness:.9,roughness:.28,emissive:3351562,emissiveIntensity:.7}),D=new C(new H(3.05,.022,12,220),k);D.rotation.set(Math.PI/2.4,.4,0);const P=new C(new H(3.55,.014,12,220),new G({color:10475775,metalness:.9,roughness:.32,emissive:664627,emissiveIntensity:.7}));P.rotation.set(Math.PI/1.8,-.5,.4),e.add(D,P);const I=j(u?450:1100,3.2,7.5,14206097,.035,.85),L=j(u?700:1800,6,16,8363263,.05,.55);c.add(I,L),c.add(new te(3355460,1.4));const z=new R(14201962,60,30);z.position.set(4,3,5),c.add(z);const S=new R(7167231,45,30);S.position.set(-5,-2,3),c.add(S);const l={distort:.42,freq:.85,palette:0,posX:0,posY:0,scale:1,camZ:8.2,spin:1},n={x:0,y:0,tx:0,ty:0},N=i=>{n.tx=i.clientX/window.innerWidth*2-1,n.ty=i.clientY/window.innerHeight*2-1};window.addEventListener("pointermove",N,{passive:!0});const V=()=>{s.aspect=window.innerWidth/window.innerHeight,s.updateProjectionMatrix(),v.setSize(window.innerWidth,window.innerHeight),x(),q()};window.addEventListener("resize",V);const O=new t,X=new t,Y=new t,M=new ne;let _=0,F=!0,w=0;const Z=i=>{const r=Math.max(0,Math.min(m.length-2,Math.floor(i))),f=b.clamp(i-r,0,1),B=m[r],E=m[r+1];o.uColorA.value.copy(O.lerpColors(B.a,E.a,f)),o.uColorB.value.copy(X.lerpColors(B.b,E.b,f)),o.uColorC.value.copy(Y.lerpColors(B.c,E.c,f)),S.color.copy(o.uColorB.value)},T=()=>{_=requestAnimationFrame(T);const i=Math.min(M.getDelta(),.05),r=M.elapsedTime;i>.026?w+=i:w=Math.max(0,w-i),w>1.2&&p<g.length-1&&(p++,x(),w=0),n.x+=(n.tx-n.x)*.045,n.y+=(n.ty-n.y)*.045,o.uTime.value=r,o.uDistort.value+=(l.distort-o.uDistort.value)*.06,o.uFreq.value+=(l.freq-o.uFreq.value)*.06,Z(l.palette),d.rotation.y=r*.12*l.spin,d.rotation.x=Math.sin(r*.1)*.18,A.rotation.y=-r*.05,A.rotation.z=r*.03,D.rotation.z=r*.08*l.spin,P.rotation.z=-r*.06*l.spin,I.rotation.y=r*.02,L.rotation.y=-r*.008,e.position.x+=(l.posX-e.position.x)*.05,e.position.y+=(l.posY+a.yOff-e.position.y)*.05;const f=b.lerp(e.scale.x,l.scale*a.sMul,.05);e.scale.setScalar(f),e.rotation.y=n.x*.28,e.rotation.x=n.y*.18,s.position.x=n.x*.65,s.position.y=-n.y*.45,s.position.z+=(l.camZ*a.zMul-s.position.z)*.05,s.lookAt(0,0,0),z.position.x=n.x*6,z.position.y=-n.y*4+1.5,v.render(c,s)};return T(),document.addEventListener("visibilitychange",()=>{document.hidden?(cancelAnimationFrame(_),F=!1,M.getDelta()):F||(F=!0,M.getDelta(),T())}),{state:l,scene:c,camera:s,renderer:v}}export{de as createAetherScene};
