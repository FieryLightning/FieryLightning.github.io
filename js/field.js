// ─────────────────────────────────────────────────────────────
//  GPU particle field
//  WebGL2 transform feedback: particle state (position, velocity)
//  lives in two GPU buffers that ping-pong every frame. The update
//  pass runs in a vertex shader with the rasterizer disabled, so
//  the CPU never touches particle data after the first upload.
//
//  Motion: divergence-free curl noise (2 octaves of 3D simplex),
//  a slow drift down the piste, a wake behind every pointer slash
//  and an expanding shock ring on click ("parry").
//  Rendering: each particle is an instanced line streak whose
//  length follows its speed, blended additively.
// ─────────────────────────────────────────────────────────────

const NOISE = /* glsl */ `
vec3 mod289(vec3 x){return x-floor(x*(1.0/289.0))*289.0;}
vec4 mod289(vec4 x){return x-floor(x*(1.0/289.0))*289.0;}
vec4 permute(vec4 x){return mod289(((x*34.0)+10.0)*x);}
vec4 taylorInvSqrt(vec4 r){return 1.79284291400159-0.85373472095314*r;}
float snoise(vec3 v){
  const vec2 C=vec2(1.0/6.0,1.0/3.0);
  const vec4 D=vec4(0.0,0.5,1.0,2.0);
  vec3 i=floor(v+dot(v,C.yyy));
  vec3 x0=v-i+dot(i,C.xxx);
  vec3 g=step(x0.yzx,x0.xyz);
  vec3 l=1.0-g;
  vec3 i1=min(g.xyz,l.zxy);
  vec3 i2=max(g.xyz,l.zxy);
  vec3 x1=x0-i1+C.xxx;
  vec3 x2=x0-i2+C.yyy;
  vec3 x3=x0-D.yyy;
  i=mod289(i);
  vec4 p=permute(permute(permute(i.z+vec4(0.0,i1.z,i2.z,1.0))+i.y+vec4(0.0,i1.y,i2.y,1.0))+i.x+vec4(0.0,i1.x,i2.x,1.0));
  float n_=0.142857142857;
  vec3 ns=n_*D.wyz-D.xzx;
  vec4 j=p-49.0*floor(p*ns.z*ns.z);
  vec4 x_=floor(j*ns.z);
  vec4 y_=floor(j-7.0*x_);
  vec4 x=x_*ns.x+ns.yyyy;
  vec4 y=y_*ns.x+ns.yyyy;
  vec4 h=1.0-abs(x)-abs(y);
  vec4 b0=vec4(x.xy,y.xy);
  vec4 b1=vec4(x.zw,y.zw);
  vec4 s0=floor(b0)*2.0+1.0;
  vec4 s1=floor(b1)*2.0+1.0;
  vec4 sh=-step(h,vec4(0.0));
  vec4 a0=b0.xzyw+s0.xzyw*sh.xxyy;
  vec4 a1=b1.xzyw+s1.xzyw*sh.zzww;
  vec3 p0=vec3(a0.xy,h.x);
  vec3 p1=vec3(a0.zw,h.y);
  vec3 p2=vec3(a1.xy,h.z);
  vec3 p3=vec3(a1.zw,h.w);
  vec4 norm=taylorInvSqrt(vec4(dot(p0,p0),dot(p1,p1),dot(p2,p2),dot(p3,p3)));
  p0*=norm.x;p1*=norm.y;p2*=norm.z;p3*=norm.w;
  vec4 m=max(0.5-vec4(dot(x0,x0),dot(x1,x1),dot(x2,x2),dot(x3,x3)),0.0);
  m=m*m;
  return 105.0*dot(m*m,vec4(dot(p0,x0),dot(p1,x1),dot(p2,x2),dot(p3,x3)));
}
vec2 curl(vec2 p,float t){
  const float e=0.015;
  float a=snoise(vec3(p.x,p.y+e,t));
  float b=snoise(vec3(p.x,p.y-e,t));
  float c=snoise(vec3(p.x+e,p.y,t));
  float d=snoise(vec3(p.x-e,p.y,t));
  return vec2(a-b,-(c-d))/(2.0*e);
}`;

const UPDATE_VS = /* glsl */ `#version 300 es
precision highp float;
layout(location=0) in vec2 aPos;   // normalised [-1,1]^2
layout(location=1) in vec2 aVel;   // world units / s (x scaled by aspect)
layout(location=2) in float aSeed;
out vec2 vPos;
out vec2 vVel;
out float vSeed;

uniform float uTime;
uniform float uDt;
uniform float uAspect;
uniform vec2  uP0;      // pointer, previous frame (world)
uniform vec2  uP1;      // pointer, this frame (world)
uniform vec2  uPVel;    // pointer velocity (world / s)
uniform float uPOn;     // wake strength 0..1
uniform vec4  uShock;   // xy centre, z age (s, <0 = none), w strength
uniform float uScroll;  // scroll velocity (world / s)
uniform float uFlow;    // flow multiplier (reduced motion / frenzy)
${NOISE}

void main(){
  vec2 w = vec2(aPos.x * uAspect, aPos.y);
  vec2 v = aVel;
  float t = uTime * 0.045;

  vec2 flow = curl(w * 0.85, t) * 0.055 + curl(w * 2.4 + 7.3, t * 1.6) * 0.018;
  flow.x += 0.03;                 // drift down the piste
  flow *= uFlow;
  flow.y += uScroll * 0.85;       // the field follows the page

  v += (flow - v) * (1.0 - exp(-uDt * 4.0));

  // wake: distance from particle to the pointer's path this frame
  vec2 ab = uP1 - uP0;
  float h = clamp(dot(w - uP0, ab) / max(dot(ab, ab), 1e-6), 0.0, 1.0);
  vec2 d = w - (uP0 + ab * h);
  float dist2 = dot(d, d);
  float fall = exp(-dist2 / 0.012) * uPOn;
  float ps = min(length(uPVel), 7.0);
  v += uPVel * fall * uDt * 5.0;
  v += (d / (sqrt(dist2) + 1e-4)) * fall * ps * uDt * 0.9;

  // parry shock ring
  if (uShock.z >= 0.0) {
    vec2 sd = w - uShock.xy;
    float sr = length(sd);
    float ring = uShock.z * 1.7;
    float band = exp(-pow((sr - ring) / 0.09, 2.0)) * exp(-uShock.z * 1.8);
    v += (sd / max(sr, 1e-4)) * band * uShock.w * uDt * 32.0;
  }

  float vl = length(v);
  if (vl > 4.5) v *= 4.5 / vl;

  w += v * uDt;

  // wrap toroidally in normalised space so resizes simply stretch the field
  vec2 p = vec2(w.x / uAspect, w.y);
  p = mod(p + 1.05, 2.1) - 1.05;

  vPos = p;
  vVel = v;
  vSeed = aSeed;
}`;

const UPDATE_FS = /* glsl */ `#version 300 es
precision mediump float;
out vec4 o;
void main(){ o = vec4(0.0); }`;

const RENDER_VS = /* glsl */ `#version 300 es
precision highp float;
layout(location=0) in vec2 aPos;
layout(location=1) in vec2 aVel;
layout(location=2) in float aSeed;
layout(location=3) in float aEnd;   // 0 = head, 1 = tail (per-vertex)
uniform float uAspect;
uniform float uStreak;
out float vAlpha;
out vec3 vColor;
void main(){
  float sp = length(aVel);
  vec2 dir = sp > 1e-5 ? aVel / sp : vec2(1.0, 0.0);
  float len = min(0.005 + sp * uStreak, 0.4);
  vec2 w = vec2(aPos.x * uAspect, aPos.y) - dir * len * aEnd;
  gl_Position = vec4(w.x / uAspect, w.y, 0.0, 1.0);

  float energy = smoothstep(0.04, 1.4, sp);
  vec3 steel = vec3(0.30, 0.45, 0.62);
  vec3 cyan  = vec3(0.50, 0.89, 1.00);
  vec3 hot   = vec3(0.96, 0.99, 1.00);
  vec3 c = mix(steel, cyan, smoothstep(0.0, 0.45, energy));
  c = mix(c, hot, smoothstep(0.55, 1.0, energy));
  if (aSeed > 0.988) c = vec3(0.11, 1.0, 0.56);        // green lamp
  else if (aSeed > 0.976) c = vec3(1.0, 0.18, 0.33);   // red lamp
  float a = (0.16 + 0.75 * energy) * (0.45 + 0.55 * aSeed);
  vAlpha = a * (1.0 - aEnd);
  vColor = c;
}`;

const RENDER_FS = /* glsl */ `#version 300 es
precision mediump float;
in float vAlpha;
in vec3 vColor;
uniform float uGain;
out vec4 o;
void main(){
  float a = vAlpha * uGain;
  o = vec4(vColor * a, a);
}`;

// Kick off compile + link without querying status, so drivers that support
// KHR_parallel_shader_compile can build the programs off the main thread.
function startProgram(gl, vsSrc, fsSrc, varyings) {
  const p = gl.createProgram();
  const shaders = [[gl.VERTEX_SHADER, vsSrc], [gl.FRAGMENT_SHADER, fsSrc]].map(([type, src]) => {
    const s = gl.createShader(type);
    gl.shaderSource(s, src);
    gl.compileShader(s);
    gl.attachShader(p, s);
    return s;
  });
  if (varyings) gl.transformFeedbackVaryings(p, varyings, gl.INTERLEAVED_ATTRIBS);
  gl.linkProgram(p);
  return { p, shaders };
}

function finishProgram(gl, { p, shaders }) {
  if (!gl.getProgramParameter(p, gl.LINK_STATUS)) {
    const logs = shaders.map((s) => gl.getShaderInfoLog(s)).filter(Boolean).join('\n');
    throw new Error('Program link failed: ' + (gl.getProgramInfoLog(p) || '') + '\n' + logs);
  }
  const u = {};
  const n = gl.getProgramParameter(p, gl.ACTIVE_UNIFORMS);
  for (let i = 0; i < n; i++) {
    const info = gl.getActiveUniform(p, i);
    u[info.name] = gl.getUniformLocation(p, info.name);
  }
  return { p, u };
}

/**
 * @param {HTMLCanvasElement} canvas
 * @param {{x:number,y:number,vx:number,vy:number,inside:boolean}} pointer  CSS-pixel pointer state
 * @param {{reduced?:boolean, onFail?:(err:Error)=>void, onReady?:()=>void}} opts
 */
export function createField(canvas, pointer, opts = {}) {
  const gl = canvas.getContext('webgl2', {
    alpha: true,
    antialias: false,
    depth: false,
    stencil: false,
    premultipliedAlpha: true,
    powerPreference: 'high-performance',
  });
  if (!gl) return null;

  const reduced = !!opts.reduced;
  const area = innerWidth * innerHeight;
  const cores = navigator.hardwareConcurrency || 4;
  let capacity = Math.round(Math.min(48000, Math.max(9000, area / 34)) * (cores <= 4 ? 0.6 : 1) * (reduced ? 0.5 : 1));
  capacity = Math.ceil(capacity / 1024) * 1024;
  let active = capacity;

  const parallel = gl.getExtension('KHR_parallel_shader_compile');
  const pending = [
    startProgram(gl, UPDATE_VS, UPDATE_FS, ['vPos', 'vVel', 'vSeed']),
    startProgram(gl, RENDER_VS, RENDER_FS),
  ];
  let upd = null, rnd = null, failed = false;
  canvas.style.opacity = '0';

  /** true once both programs are linked (or failed) */
  function poll() {
    if (upd || failed) return true;
    if (parallel && !pending.every((o) => gl.getProgramParameter(o.p, parallel.COMPLETION_STATUS_KHR))) return false;
    try {
      upd = finishProgram(gl, pending[0]);
      rnd = finishProgram(gl, pending[1]);
      canvas.style.opacity = '1';
      opts.onReady?.();
    } catch (err) {
      failed = true;
      console.warn('[field] particle field disabled:', err.message);
      opts.onFail?.(err);
    }
    return true;
  }

  // interleaved state: x, y, vx, vy, seed
  const STRIDE = 5 * 4;
  const init = new Float32Array(capacity * 5);
  for (let i = 0; i < capacity; i++) {
    init[i * 5 + 0] = Math.random() * 2.1 - 1.05;
    init[i * 5 + 1] = Math.random() * 2.1 - 1.05;
    init[i * 5 + 2] = 0;
    init[i * 5 + 3] = 0;
    init[i * 5 + 4] = Math.random();
  }
  const bufs = [gl.createBuffer(), gl.createBuffer()];
  for (const b of bufs) {
    gl.bindBuffer(gl.ARRAY_BUFFER, b);
    gl.bufferData(gl.ARRAY_BUFFER, init, gl.DYNAMIC_COPY);
  }
  const endBuf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, endBuf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([0, 1]), gl.STATIC_DRAW);

  function vao(buf, instanced) {
    const v = gl.createVertexArray();
    gl.bindVertexArray(v);
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, STRIDE, 0);
    gl.enableVertexAttribArray(1);
    gl.vertexAttribPointer(1, 2, gl.FLOAT, false, STRIDE, 8);
    gl.enableVertexAttribArray(2);
    gl.vertexAttribPointer(2, 1, gl.FLOAT, false, STRIDE, 16);
    if (instanced) {
      gl.vertexAttribDivisor(0, 1);
      gl.vertexAttribDivisor(1, 1);
      gl.vertexAttribDivisor(2, 1);
      gl.bindBuffer(gl.ARRAY_BUFFER, endBuf);
      gl.enableVertexAttribArray(3);
      gl.vertexAttribPointer(3, 1, gl.FLOAT, false, 4, 0);
    }
    gl.bindVertexArray(null);
    gl.bindBuffer(gl.ARRAY_BUFFER, null);
    return v;
  }
  const updVAO = [vao(bufs[0], false), vao(bufs[1], false)];
  const rndVAO = [vao(bufs[0], true), vao(bufs[1], true)];
  const tf = gl.createTransformFeedback();
  let cur = 0;

  // ── sizing
  let W = 1, H = 1, aspect = 1;
  const dprCap = reduced ? 1 : 1.5;
  function resize() {
    const dpr = Math.min(devicePixelRatio || 1, dprCap);
    W = Math.max(1, Math.round(innerWidth * dpr));
    H = Math.max(1, Math.round(innerHeight * dpr));
    canvas.width = W;
    canvas.height = H;
    aspect = innerWidth / Math.max(1, innerHeight);
  }
  resize();
  addEventListener('resize', resize);

  // ── interaction state (world units)
  const toWorld = (x, y) => [((x / innerWidth) * 2 - 1) * aspect, -((y / innerHeight) * 2 - 1)];
  let p0 = toWorld(pointer.x, pointer.y);
  let wake = 0;
  let shock = { x: 0, y: 0, t0: -1, s: 0 };
  let scrollVel = 0;
  let flowMul = reduced ? 0.35 : 1;
  let gain = reduced ? 0.7 : 1;
  let lost = false;

  canvas.addEventListener('webglcontextlost', (e) => {
    e.preventDefault();
    lost = true;
    canvas.style.opacity = '0';
  });

  // ── perf telemetry + adaptive quality
  let frames = 0, acc = 0, fps = 60, slowFor = 0;

  function frame(time, dt) {
    if (lost || dt <= 0 || !poll() || failed) return;

    frames++;
    acc += dt;
    if (acc >= 0.5) {
      fps = frames / acc;
      frames = 0;
      acc = 0;
      if (fps < 38 && active > 6144) {
        slowFor += 0.5;
        if (slowFor >= 2) {
          active = Math.max(6144, Math.floor(active * 0.7 / 1024) * 1024);
          slowFor = 0;
        }
      } else slowFor = 0;
    }

    const p1 = toWorld(pointer.x, pointer.y);
    const pv = [(pointer.vx / innerWidth) * 2 * aspect, -(pointer.vy / innerHeight) * 2];
    const speed = Math.hypot(pv[0], pv[1]);
    const target = pointer.inside ? Math.min(1, speed / 2.5) : 0;
    wake += (target - wake) * (target > wake ? 0.6 : 0.12);

    // ── update pass (transform feedback)
    gl.useProgram(upd.p);
    gl.uniform1f(upd.u.uTime, time);
    gl.uniform1f(upd.u.uDt, Math.min(dt, 1 / 30));
    gl.uniform1f(upd.u.uAspect, aspect);
    gl.uniform2f(upd.u.uP0, p0[0], p0[1]);
    gl.uniform2f(upd.u.uP1, p1[0], p1[1]);
    gl.uniform2f(upd.u.uPVel, pv[0], pv[1]);
    gl.uniform1f(upd.u.uPOn, wake);
    const age = shock.t0 < 0 ? -1 : time - shock.t0;
    gl.uniform4f(upd.u.uShock, shock.x, shock.y, age > 2.5 ? -1 : age, shock.s);
    gl.uniform1f(upd.u.uScroll, scrollVel);
    gl.uniform1f(upd.u.uFlow, flowMul);

    gl.bindVertexArray(updVAO[cur]);
    gl.bindTransformFeedback(gl.TRANSFORM_FEEDBACK, tf);
    gl.bindBufferBase(gl.TRANSFORM_FEEDBACK_BUFFER, 0, bufs[1 - cur]);
    gl.enable(gl.RASTERIZER_DISCARD);
    gl.beginTransformFeedback(gl.POINTS);
    gl.drawArrays(gl.POINTS, 0, active);
    gl.endTransformFeedback();
    gl.disable(gl.RASTERIZER_DISCARD);
    gl.bindBufferBase(gl.TRANSFORM_FEEDBACK_BUFFER, 0, null);
    gl.bindTransformFeedback(gl.TRANSFORM_FEEDBACK, null);
    cur = 1 - cur;

    // ── render pass (instanced streaks)
    gl.viewport(0, 0, W, H);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.useProgram(rnd.p);
    gl.uniform1f(rnd.u.uAspect, aspect);
    gl.uniform1f(rnd.u.uStreak, 0.06);
    gl.uniform1f(rnd.u.uGain, gain);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE);
    gl.bindVertexArray(rndVAO[cur]);
    gl.drawArraysInstanced(gl.LINES, 0, 2, active);
    gl.bindVertexArray(null);

    p0 = p1;
    scrollVel *= 0.9;
  }

  return {
    frame,
    shock(x, y, strength = 1) {
      const [wx, wy] = toWorld(x, y);
      shock = { x: wx, y: wy, t0: performance.now() / 1000, s: strength };
    },
    scroll(pxPerSec) {
      const v = (pxPerSec / innerHeight) * 2;
      scrollVel += (Math.max(-1.2, Math.min(1.2, v)) * 0.4 - scrollVel) * 0.3;
    },
    setFlow(m) { flowMul = m; },
    setGain(g) { gain = g; },
    stats() { return { count: active, capacity, fps: Math.round(fps), ready: !!upd, parallel: !!parallel }; },
  };
}
