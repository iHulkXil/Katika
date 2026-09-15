import { useEffect, useRef } from 'react';

const VERT = `
attribute vec2 a;
void main(){ gl_Position = vec4(a,0.0,1.0); }
`;

const FRAG = `
precision highp float;
uniform vec2 u_res;
uniform float u_time;
uniform vec3 u_a;
uniform vec3 u_b;
void main(){
  vec2 uv = (gl_FragCoord.xy / u_res.xy) * 2.0 - 1.0;
  uv.x *= u_res.x / u_res.y;
  float t = u_time * 0.35;
  float r = length(uv);
  float a = atan(uv.y, uv.x);
  float pulse = 0.5 + 0.5 * sin(t * 2.2 + r * 6.0);
  float rings = sin(r * 14.0 - t * 3.0);
  float veins = sin(a * 7.0 + t + r * 4.0);
  vec3 col = mix(u_a, u_b, pulse * 0.65 + rings * 0.18);
  col += veins * 0.07;
  col *= smoothstep(1.35, 0.15, r);
  col += vec3(0.05, 0.14, 0.10) * (1.0 - r);
  gl_FragColor = vec4(col, 0.92);
}
`;

type Mode = 'felt' | 'gold' | 'ember' | 'ice';

const PALETTE: Record<Mode, [[number, number, number], [number, number, number]]> = {
  felt: [[0.02, 0.09, 0.07], [0.12, 0.72, 0.52]],
  gold: [[0.08, 0.06, 0.02], [0.86, 0.68, 0.22]],
  ember: [[0.08, 0.02, 0.02], [0.78, 0.16, 0.12]],
  ice: [[0.02, 0.05, 0.08], [0.18, 0.55, 0.62]],
};

export function WebglStage({
  mode = 'felt',
  className = '',
}: {
  mode?: Mode;
  className?: string;
}) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    let gl: WebGLRenderingContext | null = null;
    try {
      gl = canvas.getContext('webgl', { alpha: true, antialias: true, premultipliedAlpha: false });
    } catch {
      return;
    }
    if (!gl) return;

    const compile = (type: number, src: string) => {
      const s = gl!.createShader(type);
      if (!s) return null;
      gl!.shaderSource(s, src);
      gl!.compileShader(s);
      return s;
    };
    const vertShader = compile(gl.VERTEX_SHADER, VERT);
    const fragShader = compile(gl.FRAGMENT_SHADER, FRAG);
    if (!vertShader || !fragShader) return;

    const program = gl.createProgram();
    if (!program) return;
    gl.attachShader(program, vertShader);
    gl.attachShader(program, fragShader);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) return;
    gl.useProgram(program);

    const buf = gl.createBuffer();
    if (!buf) return;
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(program, 'a');
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

    const uRes = gl.getUniformLocation(program, 'u_res');
    const uTime = gl.getUniformLocation(program, 'u_time');
    const uA = gl.getUniformLocation(program, 'u_a');
    const uB = gl.getUniformLocation(program, 'u_b');
    const [cA, cB] = PALETTE[mode];

    let frame = 0;
    const start = performance.now();
    const draw = (now: number) => {
      try {
        const parent = canvas.parentElement;
        const rect = parent?.getBoundingClientRect();
        const w = rect && rect.width > 0 ? rect.width : (parent?.clientWidth ?? 320);
        const h = rect && rect.height > 0 ? rect.height : (parent?.clientHeight ?? 220);
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        const targetW = Math.max(1, Math.floor(w * dpr));
        const targetH = Math.max(1, Math.floor(h * dpr));

        if (canvas.width !== targetW || canvas.height !== targetH) {
          canvas.width = targetW;
          canvas.height = targetH;
        }

        gl.viewport(0, 0, canvas.width, canvas.height);
        gl.uniform2f(uRes, canvas.width, canvas.height);
        gl.uniform1f(uTime, (now - start) / 1000);
        gl.uniform3f(uA, cA[0], cA[1], cA[2]);
        gl.uniform3f(uB, cB[0], cB[1], cB[2]);
        gl.drawArrays(gl.TRIANGLES, 0, 3);
        frame = requestAnimationFrame(draw);
      } catch {
        // Suppress any WebGL context loss errors
      }
    };
    frame = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(frame);
  }, [mode]);

  return (
    <canvas
      ref={ref}
      className={`fx-stage-canvas pointer-events-none absolute inset-0 h-full w-full opacity-60 ${className}`}
      style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }}
      aria-hidden
    />
  );
}
