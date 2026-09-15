import { useEffect, useMemo, useRef } from 'react';

function hash(input: string) {
  let h = 2166136261;
  for (let i = 0; i < input.length; i += 1) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function kit(position: string) {
  if (position === 'GK') return { shirt: '#f2c14e', stripe: '#062018' };
  if (position === 'CB' || position === 'LB' || position === 'RB') return { shirt: '#2f6bff', stripe: '#dce7ff' };
  if (position === 'CDM' || position === 'CM' || position === 'CAM') return { shirt: '#35d399', stripe: '#062018' };
  return { shirt: '#e11d48', stripe: '#fff1f3' };
}

const VERT = `attribute vec2 a; void main(){ gl_Position = vec4(a,0.0,1.0); }`;
const FRAG = `
precision highp float;
uniform vec2 u_res;
uniform float u_time;
uniform vec3 u_skin;
uniform float u_seed;
void main(){
  vec2 uv = gl_FragCoord.xy / u_res.xy;
  vec2 p = (uv - 0.5) * 2.0;
  float face = smoothstep(1.05, 0.62, length(p * vec2(0.92, 1.08)));
  float cheek = 0.08 * sin(p.x * 6.0 + u_seed);
  vec3 col = u_skin + vec3(0.08, 0.03, 0.01) * cheek;
  float eyeY = p.y - 0.12;
  float eyeL = length(p - vec2(-0.22, 0.14));
  float eyeR = length(p - vec2(0.22, 0.14));
  float blink = step(0.04, abs(sin(u_time * 2.4 + u_seed)));
  col = mix(col, vec3(0.05), smoothstep(0.11, 0.07, eyeL) * blink);
  col = mix(col, vec3(0.05), smoothstep(0.11, 0.07, eyeR) * blink);
  col = mix(col, vec3(0.95), smoothstep(0.045, 0.02, eyeL) * blink);
  col = mix(col, vec3(0.95), smoothstep(0.045, 0.02, eyeR) * blink);
  float mouth = smoothstep(0.16, 0.08, length((p - vec2(0.0, -0.28)) * vec2(1.8, 3.4)));
  col = mix(col, vec3(0.25, 0.08, 0.08), mouth * 0.85);
  float hair = smoothstep(0.2, -0.05, p.y + 0.55 * abs(p.x));
  col = mix(col, vec3(0.07, 0.05, 0.04), hair * 0.9);
  gl_FragColor = vec4(col, face);
}
`;

function FaceCanvas({ seed, skin }: { seed: number; skin: [number, number, number] }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const gl = canvas.getContext('webgl', { alpha: true, premultipliedAlpha: false });
    if (!gl) return;
    const compile = (type: number, src: string) => {
      const s = gl.createShader(type)!;
      gl.shaderSource(s, src);
      gl.compileShader(s);
      return s;
    };
    const program = gl.createProgram()!;
    gl.attachShader(program, compile(gl.VERTEX_SHADER, VERT));
    gl.attachShader(program, compile(gl.FRAGMENT_SHADER, FRAG));
    gl.linkProgram(program);
    gl.useProgram(program);
    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(program, 'a');
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    const uRes = gl.getUniformLocation(program, 'u_res');
    const uTime = gl.getUniformLocation(program, 'u_time');
    const uSkin = gl.getUniformLocation(program, 'u_skin');
    const uSeed = gl.getUniformLocation(program, 'u_seed');
    let frame = 0;
    const start = performance.now();
    const draw = (now: number) => {
      canvas.width = 160;
      canvas.height = 160;
      gl.viewport(0, 0, 160, 160);
      gl.uniform2f(uRes, 160, 160);
      gl.uniform1f(uTime, (now - start) / 1000);
      gl.uniform3f(uSkin, skin[0], skin[1], skin[2]);
      gl.uniform1f(uSeed, seed % 97);
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      frame = requestAnimationFrame(draw);
    };
    frame = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(frame);
  }, [seed, skin]);
  return <canvas ref={ref} className="h-full w-full rounded-full" />;
}

export function LegendAvatar({
  name,
  position,
  size = 'lg',
}: {
  name?: string;
  position?: string;
  size?: 'sm' | 'lg';
}) {
  const seed = useMemo(() => hash(`${name ?? 'ghost'}|${position ?? 'XX'}`), [name, position]);
  const colors = kit(position ?? 'ST');
  const tone = ((seed >> 8) % 40) / 100;
  const skin: [number, number, number] = [0.42 + tone, 0.28 + tone * 0.5, 0.18 + tone * 0.2];
  const wide = size === 'lg' ? 'h-36 w-28' : 'h-12 w-10';

  return (
    <div className={`legend-avatar ${wide}`} style={{ ['--kit' as string]: colors.shirt, ['--stripe' as string]: colors.stripe }}>
      <div className="legend-avatar-rig">
        <div className="legend-avatar-head">
          <FaceCanvas seed={seed} skin={skin} />
        </div>
        <div className="legend-avatar-torso">
          <span className="legend-avatar-num">{(name ?? 'K').slice(0, 1).toUpperCase()}</span>
        </div>
        <div className="legend-avatar-arm left" />
        <div className="legend-avatar-arm right" />
      </div>
    </div>
  );
}
