// ==========================================
// 🎛️ PAINEL DE CONTROLE 
// ==========================================

const CONFIG_AURORA = {
    posicaoVertical: -0.2,      
    alturaDaAurora: 0.2,       
    zoomDestaque: 9.0,          
    velocidade: 0.12,           
    brilho: 2.2,                
    
    corEsquerda: "vec3(0.0, 0.85, 0.5)",   
    corDireita:  "vec3(0.5, 0.0, 0.85)"    
};

const CONFIG_ESTRELAS = {
    densidade: 0.01,           
    velocidadePiscar: 2.5,      
    brilhoMaximo: 0.95          
};

const CONFIG_CÉU = {
    corBase: "vec3(0.003, 0.003, 0.015)", 
    corTopo: "vec3(0.008, 0.02, 0.05)"    
};

// ==========================================
// 🚀 ENGINE WEBGL 
// ==========================================

const canvas = document.getElementById('shaderCanvas');
const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');

if (!gl) console.error('WebGL não suportado.');

const vsSource = `
    attribute vec2 a_position;
    void main() {
        gl_Position = vec4(a_position, 0.0, 1.0);
    }
`;

const fsSource = `
    precision highp float;

    uniform vec2 u_resolution;
    uniform float u_time;
    uniform float u_mobile;

    float randomNoise(vec2 p) {
        return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
    }

    float cosmicNoise(vec2 p) {
        float d = dot(p, vec2(269.5, 183.3));
        return fract(sin(d) * 43758.5453123 + sin(p.x * 59.1) * 1234.56 + cos(p.y * 73.7) * 789.12);
    }

    float smoothNoise(vec2 p) {
        vec2 i = floor(p);
        vec2 f = fract(p);
        f = f * f * (3.0 - 2.0 * f);

        float a = randomNoise(i);
        float b = randomNoise(i + vec2(1.0, 0.0));
        float c = randomNoise(i + vec2(0.0, 1.0));
        float d = randomNoise(i + vec2(1.0, 1.0));

        return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
    }

    float fbm(vec2 p) {
        float v = 0.0;
        float a = 0.5;
        for (int i = 0; i < 5; i++) {
            v += a * smoothNoise(p);
            p *= 2.0;
            a *= 0.5;
        }
        return v;
    }

    void main() {
        vec2 uv = gl_FragCoord.xy / u_resolution.xy;
        vec2 norm = gl_FragCoord.xy / max(u_resolution.x, u_resolution.y);
        
        vec3 skyColor = mix(${CONFIG_CÉU.corBase}, ${CONFIG_CÉU.corTopo}, uv.y);

        // 1. Renderização de Estrelas (Plano de Fundo)
        float starScale = mix(12.0, 6.0, step(0.5, u_mobile));
        float starNoise = cosmicNoise(norm * starScale + vec2(0.123, 0.456));
        float starThreshold = ${ (1.0 - CONFIG_ESTRELAS.densidade).toFixed(4) };
        float starIntensity = smoothstep(starThreshold, 1.0, starNoise);
        starIntensity *= (1.0 - ${CONFIG_ESTRELAS.brilhoMaximo.toFixed(2)}) + ${CONFIG_ESTRELAS.brilhoMaximo.toFixed(2)} * (0.5 + 0.5*sin(u_time * ${CONFIG_ESTRELAS.velocidadePiscar.toFixed(2)} + starNoise * 62.8));
        vec3 stars = vec3(starIntensity);

        // Camada inicial do Espaço (Céu + Estrelas)
        vec3 spaceColor = skyColor + stars * 0.9;

        // 2. Configuração e Renderização da Aurora
        vec2 auroraUv = uv;
        auroraUv.y += (${CONFIG_AURORA.posicaoVertical.toFixed(2)});

        float wave = sin(uv.x * 5.0 + u_time * 0.5) * 0.04;
        auroraUv.y += wave;

        float movement = u_time * ${CONFIG_AURORA.velocidade.toFixed(4)};
        float zoomX = mix(${CONFIG_AURORA.zoomDestaque.toFixed(2)}, ${ (CONFIG_AURORA.zoomDestaque/2).toFixed(2) }, step(0.5, u_mobile));
        float zoomY = mix(${ (CONFIG_AURORA.zoomDestaque * 1.5).toFixed(2) }, ${(CONFIG_AURORA.zoomDestaque * 0.8).toFixed(2)}, step(0.5, u_mobile));
        float noiseVal = fbm(vec2(auroraUv.x * zoomX, auroraUv.y * zoomY - movement));

        float centralizadoY = auroraUv.y - 0.5;
        float distanciaDoCentro = abs(centralizadoY) / ${CONFIG_AURORA.alturaDaAurora.toFixed(4)};
        float gradienteBordas = exp(-distanciaDoCentro * distanciaDoCentro * 2.0);
        
        float auroraMask = smoothstep(0.25, 0.75, noiseVal) * gradienteBordas;

        vec3 auroraColorLeft = ${CONFIG_AURORA.corEsquerda};
        vec3 auroraColorRight = ${CONFIG_AURORA.corDireita};
        vec3 auroraColor = mix(auroraColorLeft, auroraColorRight, uv.x) * auroraMask * ${CONFIG_AURORA.brilho.toFixed(2)};

        // 3. COMPOSIÇÃO: Aplica a aurora POR CIMA do espaço usando interpolação linear (mix)
        vec3 finalColor = mix(spaceColor, auroraColor, auroraMask);

        gl_FragColor = vec4(finalColor, 1.0);
    }
`;

function createShader(gl, type, source) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        console.error(gl.getShaderInfoLog(shader));
        gl.deleteShader(shader);
        return null;
    }
    return shader;
}

const vertexShader = createShader(gl, gl.VERTEX_SHADER, vsSource);
const fragmentShader = createShader(gl, gl.FRAGMENT_SHADER, fsSource);

const program = gl.createProgram();
gl.attachShader(program, vertexShader);
gl.attachShader(program, fragmentShader);
gl.linkProgram(program);

const positionAttributeLocation = gl.getAttribLocation(program, "a_position");
const resolutionUniformLocation = gl.getUniformLocation(program, "u_resolution");
const timeUniformLocation = gl.getUniformLocation(program, "u_time");
const mobileUniformLocation = gl.getUniformLocation(program, "u_mobile");

const positionBuffer = gl.createBuffer();
gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
    -1, -1,   1, -1,  -1,  1,
    -1,  1,   1, -1,   1,  1,
]), gl.STATIC_DRAW);

let isActive = true;
let isMobile = false;
function resizeCanvas() {
    const cssWidth = window.innerWidth;
    const cssHeight = window.innerHeight;
    // Em vez de desativar, alternamos um modo mobile para reduzir artefatos
    isMobile = (cssWidth < 600 || cssHeight < 420);

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.style.width = cssWidth + 'px';
    canvas.style.height = cssHeight + 'px';
    canvas.width = Math.max(1, Math.floor(cssWidth * dpr));
    canvas.height = Math.max(1, Math.floor(cssHeight * dpr));
    gl.viewport(0, 0, canvas.width, canvas.height);
}
window.addEventListener('resize', resizeCanvas);
resizeCanvas();

function render(time) {
    time *= 0.001; 
    if (!isActive) {
        requestAnimationFrame(render);
        return;
    }

    gl.useProgram(program);
    gl.enableVertexAttribArray(positionAttributeLocation);
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.vertexAttribPointer(positionAttributeLocation, 2, gl.FLOAT, false, 0, 0);

    gl.uniform2f(resolutionUniformLocation, canvas.width, canvas.height);
    gl.uniform1f(mobileUniformLocation, isMobile ? 1.0 : 0.0);
    gl.uniform1f(timeUniformLocation, time);

    gl.drawArrays(gl.TRIANGLES, 0, 6);
    requestAnimationFrame(render);
}
requestAnimationFrame(render);
