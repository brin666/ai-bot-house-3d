import * as THREE from 'three';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import { look } from './look';

export const SURFACE_MASK_LAYER = 1;

const PaperShader = {
  uniforms: {
    tDiffuse: { value: null as THREE.Texture | null },
    tDepth: { value: null as THREE.Texture | null },
    tSurfaceMask: { value: null as THREE.Texture | null },
    tSurfaceDepth: { value: null as THREE.DepthTexture | null },
    uResolution: { value: new THREE.Vector2(1, 1) },
    uStrength: { value: look.dither.strength },
    uLevels: { value: look.dither.levels },
    uBlockSize: { value: look.dither.blockSize },
    uPattern: { value: look.dither.pattern },
    uDotGain: { value: look.dither.dotGain },
    uGrain: { value: look.dither.grain },
    uSaturation: { value: look.dither.saturation },
    uContrast: { value: look.dither.contrast },
    uExposure: { value: look.dither.exposure },
    uShoulder: { value: look.dither.shoulder },
    uHighlightFloor: { value: look.dither.highlightFloor },
    uInk: { value: new THREE.Color(look.outline.color) },
    uDepthThreshold: { value: look.outline.depthThreshold },
    uDepthStrength: { value: look.outline.depthStrength },
    uColorThreshold: { value: look.outline.colorThreshold },
    uColorStrength: { value: look.outline.colorStrength },
    uThickness: { value: look.outline.thickness },
    uSurfaceDepthTolerance: { value: 0.00005 },
  },
  vertexShader: /* glsl */ `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: /* glsl */ `
    uniform sampler2D tDiffuse;
    uniform sampler2D tDepth;
    uniform sampler2D tSurfaceMask;
    uniform sampler2D tSurfaceDepth;
    uniform vec2 uResolution;
    uniform float uStrength;
    uniform float uLevels;
    uniform float uBlockSize;
    uniform float uPattern;
    uniform float uDotGain;
    uniform float uGrain;
    uniform float uSaturation;
    uniform float uContrast;
    uniform float uExposure;
    uniform float uShoulder;
    uniform float uHighlightFloor;
    uniform vec3 uInk;
    uniform float uDepthThreshold;
    uniform float uDepthStrength;
    uniform float uColorThreshold;
    uniform float uColorStrength;
    uniform float uThickness;
    uniform float uSurfaceDepthTolerance;
    varying vec2 vUv;

    float bayer(vec2 p) {
      float x = mod(p.x, 8.0);
      float y = mod(p.y, 8.0);
      float n = 0.0;
      float weight = 16.0;
      for (int i = 0; i < 3; i++) {
        float bx = mod(x, 2.0);
        float by = mod(y, 2.0);
        float v = mod(2.0 * bx + 3.0 * by, 4.0);
        n += v * weight;
        x = floor(x / 2.0);
        y = floor(y / 2.0);
        weight /= 4.0;
      }
      return (n + 0.5) / 64.0;
    }

    vec3 toSRGB(vec3 c) {
      vec3 lo = c * 12.92;
      vec3 hi = 1.055 * pow(max(c, vec3(0.0)), vec3(1.0 / 2.4)) - 0.055;
      return mix(lo, hi, step(vec3(0.0031308), c));
    }

    vec3 toLinear(vec3 c) {
      vec3 lo = c / 12.92;
      vec3 hi = pow((c + 0.055) / 1.055, vec3(2.4));
      return mix(lo, hi, step(vec3(0.04045), c));
    }

    float luma(vec3 c) {
      return dot(c, vec3(0.2126, 0.7152, 0.0722));
    }

    vec3 grade(vec3 c) {
      c *= uExposure;
      c = c / (1.0 + uShoulder * c);
      float l = luma(c);
      c = mix(vec3(l), c, uSaturation);
      c = (c - 0.5) * uContrast + 0.5;
      return clamp(c, 0.0, 1.0);
    }

    void main() {
      vec3 src = texture2D(tDiffuse, vUv).rgb;
      float surfaceCoverage = texture2D(tSurfaceMask, vUv).r;
      float sceneDepth = texture2D(tDepth, vUv).r;
      float surfaceDepth = texture2D(tSurfaceDepth, vUv).r;
      float depthGap = abs(sceneDepth - surfaceDepth);
      float surfaceMask = surfaceCoverage * (1.0 - smoothstep(uSurfaceDepthTolerance * 0.08, uSurfaceDepthTolerance, depthGap));
      vec2 px = floor(gl_FragCoord.xy / max(uBlockSize, 1.0));
      float n = bayer(px);
      float noise = fract(sin(dot(px, vec2(12.9898, 78.233))) * 43758.5453) - 0.5;
      vec3 srgb = toSRGB(grade(src));
      srgb = clamp(srgb + noise * uGrain, 0.0, 1.0);
      float steps = max(uLevels - 1.0, 1.0);
      float threshold = mix(0.5, n, clamp(uPattern, 0.0, 1.0));
      vec3 quantized = floor(srgb * steps + threshold) / steps;
      float screen = mix(1.0 - uDotGain, 1.0 + uDotGain * 0.35, n);
      quantized = clamp(quantized * mix(1.0, screen, step(0.001, uDotGain)), 0.0, 1.0);
      vec3 dithered = mix(srgb, quantized, clamp(uStrength, 0.0, 1.0));
      if (luma(srgb) > uHighlightFloor) {
        dithered = max(dithered, vec3(0.94));
      }

      vec2 texel = max(uThickness, 1.0) / uResolution;
      float depth = texture2D(tDepth, vUv).r;
      float depthDelta = 0.0;
      depthDelta = max(depthDelta, abs(depth - texture2D(tDepth, vUv + vec2(texel.x, 0.0)).r));
      depthDelta = max(depthDelta, abs(depth - texture2D(tDepth, vUv - vec2(texel.x, 0.0)).r));
      depthDelta = max(depthDelta, abs(depth - texture2D(tDepth, vUv + vec2(0.0, texel.y)).r));
      depthDelta = max(depthDelta, abs(depth - texture2D(tDepth, vUv - vec2(0.0, texel.y)).r));
      depthDelta = max(depthDelta, abs(depth - texture2D(tDepth, vUv + texel).r));
      depthDelta = max(depthDelta, abs(depth - texture2D(tDepth, vUv - texel).r));
      float depthEdge = smoothstep(uDepthThreshold, uDepthThreshold * 2.4, depthDelta);

      float l0 = luma(src);
      float colorDelta = 0.0;
      colorDelta = max(colorDelta, abs(l0 - luma(texture2D(tDiffuse, vUv + vec2(texel.x, 0.0)).rgb)));
      colorDelta = max(colorDelta, abs(l0 - luma(texture2D(tDiffuse, vUv + vec2(0.0, texel.y)).rgb)));
      colorDelta = max(colorDelta, abs(l0 - luma(texture2D(tDiffuse, vUv - vec2(texel.x, 0.0)).rgb)));
      colorDelta = max(colorDelta, abs(l0 - luma(texture2D(tDiffuse, vUv - vec2(0.0, texel.y)).rgb)));
      float colorEdge = smoothstep(uColorThreshold, uColorThreshold * 1.65, colorDelta);

      float edge = clamp(depthEdge * uDepthStrength + colorEdge * uColorStrength, 0.0, 1.0);
      vec3 linearDither = toLinear(dithered);
      vec3 gradedWithoutQuantize = grade(src);
      vec3 outputColor = mix(linearDither, gradedWithoutQuantize, clamp(surfaceMask, 0.0, 1.0));
      float surfaceEdge = edge * mix(1.0, 0.28, clamp(surfaceMask, 0.0, 1.0));
      gl_FragColor = vec4(mix(outputColor, uInk, surfaceEdge), 1.0);
    }
  `,
};

export function createPaperPass(scene: THREE.Scene, camera: THREE.Camera) {
  const pass = new ShaderPass(PaperShader);
  pass.material.depthTest = false;
  pass.material.depthWrite = false;
  const maskTarget = new THREE.WebGLRenderTarget(1, 1, {
    format: THREE.RGBAFormat,
    type: THREE.UnsignedByteType,
    minFilter: THREE.NearestFilter,
    magFilter: THREE.NearestFilter,
    depthBuffer: true,
    stencilBuffer: false,
  });
  maskTarget.texture.generateMipmaps = false;
  maskTarget.texture.colorSpace = THREE.NoColorSpace;
  maskTarget.depthTexture = new THREE.DepthTexture(1, 1, THREE.UnsignedIntType);
  maskTarget.depthTexture.format = THREE.DepthFormat;
  maskTarget.depthTexture.minFilter = THREE.NearestFilter;
  maskTarget.depthTexture.magFilter = THREE.NearestFilter;
  maskTarget.depthTexture.generateMipmaps = false;

  const maskMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff, toneMapped: false });
  const maskBackground = new THREE.Color(0x000000);
  const originalSetSize = pass.setSize.bind(pass);
  pass.setSize = (width: number, height: number) => {
    maskTarget.setSize(width, height);
    originalSetSize(width, height);
  };

  const baseRender = pass.render.bind(pass);
  pass.render = (renderer, writeBuffer, readBuffer, deltaTime, maskActive) => {
    const originalTarget = renderer.getRenderTarget();
    const originalBackground = scene.background;
    const originalOverrideMaterial = scene.overrideMaterial;
    const originalLayerMask = camera.layers.mask;
    const originalAutoClear = renderer.autoClear;
    const originalShadowMapEnabled = renderer.shadowMap.enabled;
    const originalClearColor = renderer.getClearColor(new THREE.Color()).clone();
    const originalClearAlpha = renderer.getClearAlpha();

    try {
      scene.background = maskBackground;
      scene.overrideMaterial = maskMaterial;
      camera.layers.set(SURFACE_MASK_LAYER);
      renderer.shadowMap.enabled = false;
      renderer.autoClear = false;
      renderer.setRenderTarget(maskTarget);
      renderer.setClearColor(0x000000, 1);
      renderer.clear(true, true, true);
      renderer.render(scene, camera);
    } finally {
      scene.background = originalBackground;
      scene.overrideMaterial = originalOverrideMaterial;
      camera.layers.mask = originalLayerMask;
      renderer.shadowMap.enabled = originalShadowMapEnabled;
      renderer.autoClear = originalAutoClear;
      renderer.setClearColor(originalClearColor, originalClearAlpha);
      renderer.setRenderTarget(originalTarget);
    }

    pass.uniforms.tDepth.value = readBuffer.depthTexture;
    pass.uniforms.tSurfaceMask.value = maskTarget.texture;
    pass.uniforms.tSurfaceDepth.value = maskTarget.depthTexture;
    pass.uniforms.uResolution.value.set(readBuffer.width, readBuffer.height);
    baseRender(renderer, writeBuffer, readBuffer, deltaTime, maskActive);
  };
  pass.dispose = () => {
    maskTarget.dispose();
    maskMaterial.dispose();
    pass.material.dispose();
  };
  return pass;
}

/** Keep the Bayer cell and ink thickness locked to CSS pixels when the pixel ratio changes. */
export function syncPaperScale(pass: ShaderPass, pixelRatio: number) {
  pass.uniforms.uBlockSize.value = look.dither.blockSize * pixelRatio;
  pass.uniforms.uThickness.value = look.outline.thickness * pixelRatio;
  pass.uniforms.uLevels.value = look.dither.levels;
  pass.uniforms.uPattern.value = look.dither.pattern;
  pass.uniforms.uDotGain.value = look.dither.dotGain;
  pass.uniforms.uGrain.value = look.dither.grain;
  pass.uniforms.uSaturation.value = look.dither.saturation;
  pass.uniforms.uContrast.value = look.dither.contrast;
  pass.uniforms.uExposure.value = look.dither.exposure;
  pass.uniforms.uShoulder.value = look.dither.shoulder;
  pass.uniforms.uHighlightFloor.value = look.dither.highlightFloor;
  pass.uniforms.uDepthThreshold.value = look.outline.depthThreshold;
  pass.uniforms.uDepthStrength.value = look.outline.depthStrength;
  pass.uniforms.uColorThreshold.value = look.outline.colorThreshold;
  pass.uniforms.uColorStrength.value = look.outline.colorStrength;
  (pass.uniforms.uInk.value as THREE.Color).set(look.outline.color);
}
