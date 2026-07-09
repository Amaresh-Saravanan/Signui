import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import type { Variants } from 'framer-motion';
import {
  ArrowRight, Mic, Camera, Zap, Shield, Eye, Smartphone,
  Sparkles, Play, User
} from 'lucide-react';
import { Button } from '../components/Button';

// Safe execution wrapper for the WebGL Shader Background
const initShaderBackground = (canvas: HTMLCanvasElement | null) => {
  if (!canvas) return;

  function syncSize() {
    if (!canvas) return;
    const w = canvas.clientWidth || 1280;
    const h = canvas.clientHeight || 720;
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
    }
  }
  if (typeof ResizeObserver !== 'undefined') {
    new ResizeObserver(syncSize).observe(canvas);
  }
  syncSize();

  const gl = (canvas.getContext('webgl') || canvas.getContext('experimental-webgl')) as WebGLRenderingContext | null;
  if (!gl) return;

  const vs = `attribute vec2 a_position;
varying vec2 v_texCoord;
void main() {
  v_texCoord = a_position * 0.5 + 0.5;
  gl_Position = vec4(a_position, 0.0, 1.0);
}`;

  const fs = `precision highp float;
uniform float u_time;
uniform vec2 u_resolution;
uniform vec2 u_mouse;
varying vec2 v_texCoord;

vec3 permute(vec3 x) { return mod(((x*34.0)+1.0)*x, 289.0); }
float snoise(vec2 v){
  const vec4 C = vec4(0.211324865405187, 0.366025403784439, -0.577350269189626, 0.024390243902439);
  vec2 i  = floor(v + dot(v, C.yy) );
  vec2 x0 = v -   i + dot(i, C.xx);
  vec2 i1;
  i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
  vec4 x12 = x0.xyxy + C.xxzz;
  x12.xy -= i1;
  i = mod(i, 289.0);
  vec3 p = permute( permute( i.y + vec3(0.0, i1.y, 1.0 )) + i.x + vec3(0.0, i1.x, 1.0 ));
  vec3 m = max(0.5 - vec3(dot(x0,x0), dot(x12.xy,x12.xy), dot(x12.zw,x12.zw)), 0.0);
  m = m*m ;
  m = m*m ;
  vec3 x = 2.0 * fract(p * C.www) - 1.0;
  vec3 h = abs(x) - 0.5;
  vec3 a0 = x - floor(x + 0.5);
  vec3 g = a0 * vec3(x0.x,x12.xz) + h * vec3(x0.y,x12.yw);
  return 130.0 * dot(m, g);
}

void main() {
    vec2 uv = v_texCoord;
    vec2 mouse = u_mouse / u_resolution;
    
    vec3 teal = vec3(0.11, 0.35, 0.31);
    vec3 violet = vec3(0.08, 0.12, 0.28);
    vec3 navy = vec3(0.02, 0.03, 0.06);
    
    float n1 = snoise(uv * 1.5 + u_time * 0.04);
    float n2 = snoise(uv * 2.5 - u_time * 0.03);
    float n3 = snoise(uv * 1.0 + mouse.x * 0.2 + u_time * 0.02);
    
    vec3 color = mix(navy, teal, n1 * 0.45 + 0.45);
    color = mix(color, violet, n2 * 0.4);
    color = mix(color, teal, n3 * 0.15);
    
    float noise = fract(sin(dot(uv, vec2(12.9898,78.233))) * 43758.5453);
    color += (noise - 0.5) * 0.015;
    
    float d = distance(uv, mouse);
    color += teal * (1.0 - smoothstep(0.0, 0.5, d)) * 0.05;
    gl_FragColor = vec4(color, 1.0);
}`;

  function cs(type: number, src: string): WebGLShader {
    const s = gl!.createShader(type)!;
    gl!.shaderSource(s, src);
    gl!.compileShader(s);
    return s;
  }

  const prog = gl.createProgram()!;
  gl.attachShader(prog, cs(gl.VERTEX_SHADER, vs));
  gl.attachShader(prog, cs(gl.FRAGMENT_SHADER, fs));
  gl.linkProgram(prog);
  gl.useProgram(prog);

  const buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);

  const pos = gl.getAttribLocation(prog, 'a_position');
  gl.enableVertexAttribArray(pos);
  gl.vertexAttribPointer(pos, 2, gl.FLOAT, false, 0, 0);

  const uTime = gl.getUniformLocation(prog, 'u_time');
  const uRes = gl.getUniformLocation(prog, 'u_resolution');
  const uMouse = gl.getUniformLocation(prog, 'u_mouse');

  let mouse = { x: canvas.width / 2, y: canvas.height / 2 };

  const handleMouseMove = (event: MouseEvent) => {
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    if (rect.width && rect.height) {
      const nx = (event.clientX - rect.left) / rect.width;
      const ny = 1.0 - (event.clientY - rect.top) / rect.height;
      mouse.x = nx * canvas.width;
      mouse.y = ny * canvas.height;
    }
  };

  window.addEventListener('mousemove', handleMouseMove);

  let animationFrameId: number;
  function render(t: number) {
    if (!gl || !canvas) return;
    gl.viewport(0, 0, canvas.width, canvas.height);
    if (uTime) gl.uniform1f(uTime, t * 0.001);
    if (uRes) gl.uniform2f(uRes, canvas.width, canvas.height);
    if (uMouse) gl.uniform2f(uMouse, mouse.x, mouse.y);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    animationFrameId = requestAnimationFrame(render);
  }
  render(0);

  return () => {
    window.removeEventListener('mousemove', handleMouseMove);
    cancelAnimationFrame(animationFrameId);
  };
};

export function Landing() {
  const [activeTab, setActiveTab] = useState<'ISL' | 'ASL' | 'BSL'>('ASL');

  const containerVariants: Variants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.15 } }
  };

  const itemVariants: Variants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: "easeOut" } }
  };

  return (
    <div className="relative min-h-screen text-white font-sans antialiased selection:bg-cyan-500/30 selection:text-cyan-200 overflow-x-hidden bg-[#02040a]">

      {/* ── INTERACTIVE SHADER BACKDROP ───────────────────── */}
      <div className="fixed inset-0 w-full h-full pointer-events-none z-0 opacity-80 mix-blend-screen">
        <canvas
          ref={(node) => { if (node) initShaderBackground(node); }}
          className="w-full h-full block"
        />
      </div>

      <div className="fixed inset-0 bg-[linear-gradient(to_right,#ffffff03_1px,transparent_1px),linear-gradient(to_bottom,#ffffff03_1px,transparent_1px)] bg-[size:40px_40px] pointer-events-none z-1" />

      {/* ── LANDING INTERFACE CONTAINER ── */}
      <div className="relative z-10 w-full">

        {/* HEADER NAVIGATION */}
        <header className="sticky top-0 z-50 backdrop-blur-md border-b border-white/[0.04] bg-[#030712]/30 px-6 py-4">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-2 font-bold text-xl tracking-tight">
              <span className="bg-gradient-to-r from-white via-gray-200 to-gray-400 bg-clip-text text-transparent">SignBridge</span>
              <div className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
            </div>
            <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-gray-400">
              <a href="#features" className="hover:text-cyan-400 transition-colors">Features</a>
              <a href="#how-it-works" className="hover:text-cyan-400 transition-colors">How It Works</a>
              <a href="#about" className="hover:text-cyan-400 transition-colors">About</a>
            </nav>
            <div className="flex items-center gap-4">
              <Link to="/auth" className="text-sm font-medium text-gray-300 hover:text-white transition-colors">Log in</Link>
              <Link to="/workspace">
                <Button size="sm" className="bg-gradient-to-r from-cyan-400 to-teal-400 hover:from-cyan-500 hover:to-teal-500 text-black font-semibold rounded-full px-5 py-2 shadow-lg shadow-cyan-500/10 transition-all duration-300 hover:scale-[1.02]">
                  Get Started
                </Button>
              </Link>
            </div>
          </div>
        </header>

        {/* HERO SECTION */}
        <motion.section
          variants={containerVariants} initial="hidden" whileInView="visible" viewport={{ once: true }}
          className="max-w-7xl mx-auto px-6 pt-24 pb-28 grid grid-cols-1 lg:grid-cols-12 gap-16 items-center"
        >
          <motion.div variants={itemVariants} className="lg:col-span-6 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-cyan-500/20 bg-cyan-500/5 text-cyan-300 text-xs font-medium font-mono mb-6 backdrop-blur-md">
              <Sparkles size={12} className="animate-pulse" /> Effortless Conversations
            </div>
            <h1 className="text-5xl md:text-6xl font-extrabold tracking-tight leading-[1.12] mb-6">
              Breaking the <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-teal-300 to-indigo-400">Distance</span> with Ease
            </h1>
            <p className="text-base md:text-lg text-gray-400 mb-8 leading-relaxed max-w-lg">
              Connect instantly using our smart sign language translator. Experience instant voice generation, visual helpers, and fluid responses for everyday interactions.
            </p>
            <div className="flex flex-wrap gap-4">
              <Link to="/workspace">
                <Button size="lg" className="bg-gradient-to-r from-cyan-400 to-teal-400 hover:from-cyan-500 hover:to-teal-500 text-black font-bold rounded-full px-7 py-3.5 flex items-center gap-2 group shadow-lg transition-all">
                  Start Translating <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
                </Button>
              </Link>
              <Button variant="secondary" size="lg" className="border border-white/10 hover:border-white/20 text-white font-medium rounded-full px-7 py-3.5 bg-white/[0.02] backdrop-blur-md flex items-center gap-2 transition-all">
                <Play size={16} fill="white" className="text-white" /> See How It Works
              </Button>
            </div>
          </motion.div>

          {/* Interactive Screen Preview */}
          <motion.div variants={itemVariants} className="lg:col-span-6 relative flex justify-center">
            <div className="w-full max-w-[500px] aspect-[4/3] rounded-3xl border border-white/[0.06] bg-white/[0.01] backdrop-blur-xl p-6 shadow-2xl relative flex flex-col justify-between overflow-hidden group hover:border-white/[0.12] transition-all duration-500">
              <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-white/10 to-transparent" />
              <div className="flex items-center justify-between border-b border-white/[0.05] pb-3 text-xs text-gray-400 font-medium">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
                  <span>Visual Preview Window</span>
                </div>
                <div className="flex items-center gap-2">
                  {['ISL', 'ASL', 'BSL'].map((tab) => (
                    <button key={tab} onClick={() => setActiveTab(tab as any)} className={`px-2 py-0.5 rounded transition-all ${activeTab === tab ? 'bg-white/10 text-white border border-white/10' : 'hover:text-white'}`}>{tab}</button>
                  ))}
                </div>
              </div>
              <div className="flex-1 flex flex-col items-center justify-center text-center gap-4 py-6">
                <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-cyan-500/10 to-indigo-500/10 border border-white/10 flex items-center justify-center text-cyan-300 shadow-inner group-hover:scale-105 transition-transform duration-500">
                  <User size={28} />
                </div>
                <div className="space-y-1">
                  <span className="text-sm font-semibold tracking-wide text-gray-200 block">Expressive Hand and Face Tracking</span>
                  <p className="text-xs text-gray-500 max-w-xs">Smart gestures are calibrated and ready to translate.</p>
                </div>
              </div>
              <div className="w-full bg-black/40 backdrop-blur-md border border-white/[0.05] rounded-xl px-4 py-3 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-2 h-2 rounded-full bg-teal-400 animate-pulse" />
                  <span className="text-xs text-gray-400 tracking-wider">Smooth Motion Active</span>
                </div>
                <span className="text-[10px] font-semibold text-cyan-400 bg-cyan-400/10 px-2 py-0.5 rounded border border-cyan-400/20">Live Sync</span>
              </div>
            </div>
          </motion.div>
        </motion.section>

        {/* LOGO STRIP */}
        <section className="border-y border-white/[0.04] bg-white/[0.01] backdrop-blur-sm py-6 overflow-hidden">
          <div className="max-w-7xl mx-auto px-6 flex flex-col items-center gap-4">
            <p className="text-[10px] tracking-[0.25em] uppercase text-gray-500">Trusted for Beautiful Communication</p>
            <div className="w-full flex flex-wrap justify-between items-center opacity-40 text-[11px] font-bold uppercase tracking-[0.2em] gap-6 px-4 text-gray-400">
              {['Silicon Labs', 'Tech For All', 'Accessibility Co', 'Bridge Global', 'Inclusive Design'].map((brand) => (
                <span key={brand} className="hover:text-white transition-colors cursor-default">{brand}</span>
              ))}
            </div>
          </div>
        </section>

        {/* FEATURES GRID */}
        <section id="features" className="max-w-7xl mx-auto px-6 py-28">
          <div className="max-w-2xl mb-20">
            <span className="text-xs uppercase tracking-widest text-cyan-400 font-bold block mb-2">Beautifully Simple</span>
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-white leading-tight">Fast, conversational translations created for everyone.</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
            <div className="md:col-span-7 rounded-2xl border border-white/[0.04] bg-white/[0.01] backdrop-blur-md p-8 flex flex-col justify-between group hover:border-white/[0.1] hover:bg-white/[0.02] transition-all duration-300 shadow-xl">
              <div className="w-12 h-12 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400 mb-10"><Zap size={22} /></div>
              <div>
                <h3 className="text-xl font-bold text-white mb-2 group-hover:text-cyan-400 transition-colors">Instant Responses</h3>
                <p className="text-sm text-gray-400 leading-relaxed">Converts sign language into spoken words without missing a beat, ensuring smooth and uninterrupted conversations.</p>
              </div>
            </div>
            <div className="md:col-span-5 rounded-2xl border border-white/[0.04] bg-white/[0.01] backdrop-blur-md p-8 flex flex-col justify-between group hover:border-white/[0.1] hover:bg-white/[0.02] transition-all duration-300 shadow-xl">
              <div className="w-12 h-12 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 mb-10"><Sparkles size={22} /></div>
              <div>
                <h3 className="text-xl font-bold text-white mb-2 group-hover:text-indigo-400 transition-colors">Sign-to-Text</h3>
                <p className="text-sm text-gray-400 leading-relaxed">Reads complex signs and movements perfectly, creating beautiful, natural sentences on your screen.</p>
              </div>
            </div>
            <div className="md:col-span-5 rounded-2xl border border-white/[0.04] bg-white/[0.01] backdrop-blur-md p-8 flex flex-col justify-between group hover:border-white/[0.1] hover:bg-white/[0.02] transition-all duration-300 shadow-xl">
              <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 mb-10"><Mic size={22} /></div>
              <div>
                <h3 className="text-xl font-bold text-white mb-2 group-hover:text-emerald-400 transition-colors">Speech-to-Sign</h3>
                <p className="text-sm text-gray-400 leading-relaxed">Turn spoken words into smooth visual motion guides right on your display instantly.</p>
              </div>
            </div>
            <div className="md:col-span-7 rounded-2xl border border-cyan-500/[0.1] bg-gradient-to-br from-cyan-950/10 to-white/[0.01] backdrop-blur-md p-8 flex flex-col justify-between relative overflow-hidden group hover:border-cyan-500/20 transition-all duration-300 shadow-xl">
              <div className="w-12 h-12 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400 mb-14"><Shield size={22} /></div>
              <div>
                <h3 className="text-xl font-bold text-white mb-2">Safe and Secure</h3>
                <p className="text-sm text-gray-400 leading-relaxed max-w-md">Your translations happen straight on your machine. Your camera feed, audio, and private transcripts are completely safe with you.</p>
              </div>
            </div>
          </div>
        </section>

        {/* WORKSPACE PREVIEW */}
        <section className="border-y border-white/[0.04] py-24 bg-black/10 backdrop-blur-sm">
          <div className="max-w-7xl mx-auto px-6 text-center mb-16">
            <h2 className="text-3xl font-bold mb-3 text-white tracking-tight">Try Live Communication</h2>
            <p className="text-sm text-gray-400 max-w-md mx-auto">A quick look into the simple interaction workspace built for real-time engagement.</p>
          </div>
          <div className="max-w-5xl mx-auto px-6 grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="rounded-2xl border border-white/[0.04] bg-white/[0.01] backdrop-blur-md aspect-[3/4] flex flex-col justify-between p-5 shadow-2xl relative group hover:border-white/[0.1] transition-all">
              <div className="flex items-center justify-between">
                <span className="bg-emerald-500/20 text-emerald-400 text-[10px] font-bold uppercase px-2.5 py-1 rounded border border-emerald-500/30 tracking-wider animate-pulse">Live Feed</span>
                <span className="text-[10px] text-gray-500 font-medium">CAMERA_ON</span>
              </div>
              <div className="flex-1 flex flex-col items-center justify-center text-gray-500 gap-3">
                <div className="p-4 rounded-full bg-white/[0.01] border border-white/[0.05]"><Camera size={32} className="stroke-[1.2] text-gray-400" /></div>
                <span className="text-xs font-medium tracking-wide text-gray-400">Camera Active</span>
              </div>
              <div className="w-full h-1 bg-white/[0.08] rounded-full overflow-hidden"><div className="w-1/3 h-full bg-cyan-400 rounded-full" /></div>
            </div>
            <div className="rounded-2xl border border-white/[0.06] bg-black/20 backdrop-blur-md aspect-[3/4] flex flex-col justify-between p-5 shadow-2xl">
              <div className="flex-1 space-y-4 overflow-y-auto pt-4 text-xs pr-1">
                <div className="max-w-[85%] bg-white/[0.03] border border-white/[0.05] rounded-2xl rounded-tl-none p-3.5 text-gray-300">"Hello! How can I help you today?"</div>
                <div className="max-w-[85%] ml-auto bg-cyan-950/20 border border-cyan-500/20 rounded-2xl rounded-tr-none p-3.5 text-cyan-200">
                  <span className="block text-[9px] uppercase tracking-wider text-cyan-400 mb-1">Translated Sign</span>"I'm looking for the nearest train station."
                </div>
              </div>
              <div className="pt-4 flex items-center justify-between border-t border-white/[0.05] mt-4">
                <div className="flex items-center gap-3 text-gray-400">
                  <button className="hover:text-cyan-400 p-1.5 rounded-lg"><Mic size={16} /></button>
                  <button className="hover:text-cyan-400 p-1.5 rounded-lg"><Camera size={16} /></button>
                </div>
                <button className="bg-red-500/10 text-red-400 border border-red-500/20 px-4 py-1.5 rounded-full text-xs font-semibold hover:bg-red-500/20 transition-all">End Call</button>
              </div>
            </div>
            <div className="rounded-2xl border border-white/[0.04] bg-white/[0.01] backdrop-blur-md aspect-[3/4] flex flex-col justify-between p-5 shadow-2xl group hover:border-white/[0.1] transition-all">
              <div className="flex items-center justify-end"><span className="bg-indigo-500/20 text-indigo-400 text-[10px] font-bold uppercase px-2.5 py-1 rounded border border-indigo-500/30">Video Out</span></div>
              <div className="flex-1 flex flex-col items-center justify-center text-gray-500 gap-3">
                <div className="w-14 h-14 rounded-full border border-white/10 bg-white/[0.01] flex items-center justify-center text-gray-300"><User size={22} /></div>
                <span className="text-xs font-medium tracking-wide text-gray-400">Motion Helper Stream</span>
              </div>
              <div className="h-1" />
            </div>
          </div>
        </section>

        {/* TIMELINE */}
        <section id="how-it-works" className="max-w-7xl mx-auto px-6 py-28">
          <div className="text-center mb-20">
            <span className="text-xs uppercase tracking-widest text-cyan-400 font-bold block mb-2">Simplicity First</span>
            <h2 className="text-3xl font-bold text-white tracking-tight">Four simple steps to seamless interaction</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-12">
            {[
              { num: '01', title: 'Activate', desc: 'Securely connect your camera or mic.' },
              { num: '02', title: 'Choose Dialect', desc: 'Pick your preferred style of signing.' },
              { num: '03', title: 'Translate', desc: 'Have natural conversations without delays.' },
              { num: '04', title: 'Save & Review', desc: 'Keep helpful logs to review your conversations later.' }
            ].map((step) => (
              <div key={step.num} className="text-center flex flex-col items-center group">
                <div className="w-12 h-12 rounded-full border border-white/[0.04] bg-white/[0.01] backdrop-blur-md flex items-center justify-center text-xs font-bold mb-5 text-gray-400 group-hover:border-cyan-400 group-hover:text-cyan-400 transition-all">{step.num}</div>
                <h3 className="text-base font-bold text-white mb-2">{step.title}</h3>
                <p className="text-xs text-gray-400 max-w-[220px] leading-relaxed">{step.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ACCESSIBILITY FEATURE BANNER */}
        <section className="max-w-7xl mx-auto px-6 py-6 mb-20">
          <div className="rounded-3xl border border-white/[0.04] bg-gradient-to-br from-white/[0.01] to-transparent backdrop-blur-xl p-8 md:p-12 grid grid-cols-1 lg:grid-cols-12 gap-12 items-center shadow-2xl">
            <div className="lg:col-span-6 space-y-6">
              <span className="text-xs uppercase tracking-widest text-indigo-400 font-bold block">Built For Everyone</span>
              <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-white">Interfaces designed to listen to your needs.</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-sm font-semibold text-gray-200"><Eye size={16} className="text-cyan-400" /> Easy to Read</div>
                  <p className="text-xs text-gray-400">High contrast layouts designed to look comfortable in any light.</p>
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-sm font-semibold text-gray-200"><Smartphone size={16} className="text-cyan-400" /> Assistive App Setup</div>
                  <p className="text-xs text-gray-400">Works beautifully with screen utilities and sound enhancements right out of the box.</p>
                </div>
              </div>
            </div>
            <div className="lg:col-span-6 bg-black/20 border border-white/[0.04] rounded-2xl h-64 flex flex-col items-center justify-center text-center gap-4">
              <div className="w-14 h-14 rounded-full bg-teal-500/10 border border-teal-500/20 flex items-center justify-center text-teal-300"><User size={24} /></div>
              <span className="text-xs tracking-widest uppercase text-teal-400 font-bold">Inclusive Environment</span>
            </div>
          </div>
        </section>

        {/* FOOTER */}
        <footer className="border-t border-white/[0.04] bg-[#02050c]/60 backdrop-blur-md px-6 py-16 text-xs text-gray-500">
          <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-12 gap-12">
            <div className="md:col-span-4 space-y-4">
              <h3 className="text-base font-bold text-white tracking-tight flex items-center gap-1.5">SignBridge <span className="w-1 h-1 rounded-full bg-cyan-400" /></h3>
              <p className="text-gray-400 leading-relaxed max-w-xs">Helping clear out global language gaps through natural, direct translation tools.</p>
            </div>
            <div className="md:col-span-2 space-y-3">
              <h4 className="font-semibold text-white tracking-wider uppercase text-[10px]">Product</h4>
              <ul className="space-y-2">
                <li><a href="#features" className="hover:text-white transition-colors">Features</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Workspace</a></li>
              </ul>
            </div>
            <div className="md:col-span-2 space-y-3">
              <h4 className="font-semibold text-white tracking-wider uppercase text-[10px]">Company</h4>
              <ul className="space-y-2">
                <li><a href="#" className="hover:text-white transition-colors">About Us</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Careers</a></li>
              </ul>
            </div>
            <div className="md:col-span-4 space-y-3">
              <h4 className="font-semibold text-white tracking-wider uppercase text-[10px]">Privacy & Trust</h4>
              <p className="text-gray-400 leading-relaxed max-w-xs">Everything you translate stays on your dashboard. No global profiling, tracking, or unexpected logs.</p>
            </div>
          </div>
          <div className="max-w-7xl mx-auto mt-12 pt-6 border-t border-white/[0.02] flex flex-col sm:flex-row justify-between items-center gap-4 text-gray-600 font-medium">
            <p>© 2026 SignBridge. Making communication clear.</p>
          </div>
        </footer>

      </div>
    </div>
  );
}