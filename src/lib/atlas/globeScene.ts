/*
 * The one module that talks to Three.js (as charts/CompanionChart.svelte is the one that talks to ECharts). It is given
 * a planet and colours and draws them; it decides nothing. Loaded on demand by GlobeView, so a page without a globe
 * never downloads it.
 *
 * Every tile is a flat-coloured fan of triangles; one texture holds every tile's colour and another the overlay, so
 * changing the view rewrites a texture, never the geometry. The picture is drawn only when something changes.
 */
import {
  AdditiveBlending,
  BackSide,
  BufferAttribute,
  BufferGeometry,
  CanvasTexture,
  Color,
  DataTexture,
  GLSL3,
  Line,
  LineBasicMaterial,
  Mesh,
  NearestFilter,
  PerspectiveCamera,
  Points,
  PointsMaterial,
  Raycaster,
  RGBAFormat,
  Scene,
  ShaderMaterial,
  Sphere,
  SphereGeometry,
  Spherical,
  UnsignedByteType,
  Vector2,
  Vector3,
  WebGLRenderer,
} from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { LineMaterial } from "three/addons/lines/LineMaterial.js";
import { LineSegments2 } from "three/addons/lines/LineSegments2.js";
import { LineSegmentsGeometry } from "three/addons/lines/LineSegmentsGeometry.js";
import { buildMesh, cornersOf, makeFinder, type Planet } from "./planet";

export const TEXTURE_WIDTH = 2048;
const NEAREST = 1.08;
const FARTHEST = 4.6;
const OPENING_DISTANCE = 3.4;
const CLOSE_LOOK = 1.45;
const LINE_LIFT = 1.0015;
const PLACE_LIFT = 1.003;
const FLY_MS = 650;
const CLICK_SLOP_PX = 5;

export type LineSet = {
  key: string;
  /** x, y, z pairs, one pair per piece. */
  segments: Float32Array;
  widths: Uint8Array;
  colour: string;
};

export type PlaceMark = { tile: number; colour: string };

export type ScreenPoint = { x: number; y: number; facing: boolean };

export type SceneOptions = {
  background: string;
  glow: string;
  selection: string;
  reducedMotion: boolean;
  onPick: (tile: number) => void;
  onChange: () => void;
};

const VERTEX = /* glsl */ `
in float tile;
in float rim;
flat out int vTile;
out float vRim;
out vec3 vNormal;
void main() {
  vTile = int(tile + 0.5);
  vRim = rim;
  vNormal = normalize(normalMatrix * position);
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}`;

const FRAGMENT = /* glsl */ `
precision highp float;
precision highp int;
uniform sampler2D baseColours;
uniform sampler2D overlayColours;
uniform int textureWidth;
uniform float overlayOn;
uniform float edgeStrength;
uniform int selectedTile;
uniform vec3 selectColour;
flat in int vTile;
in float vRim;
in vec3 vNormal;
out highp vec4 outColour;
void main() {
  ivec2 at = ivec2(vTile % textureWidth, vTile / textureWidth);
  vec3 colour = texelFetch(baseColours, at, 0).rgb;
  vec4 over = texelFetch(overlayColours, at, 0);
  colour = mix(colour, over.rgb, over.a * overlayOn);
  float light = 0.64 + 0.36 * max(dot(normalize(vNormal), normalize(vec3(-0.35, 0.45, 1.0))), 0.0);
  colour *= light;
  float w = fwidth(vRim);
  float edge = smoothstep(1.0 - 2.2 * w, 1.0 - 0.4 * w, vRim) * clamp(1.6 - w * 5.0, 0.0, 1.0) * edgeStrength;
  colour = mix(colour, colour * 0.42, edge);
  if (vTile == selectedTile) colour = mix(colour, selectColour, 0.4);
  outColour = vec4(colour, 1.0);
}`;

const GLOW_VERTEX = /* glsl */ `
out vec3 vNormal;
void main() {
  vNormal = normalize(normalMatrix * position);
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}`;

const GLOW_FRAGMENT = /* glsl */ `
precision highp float;
uniform vec3 glowColour;
in vec3 vNormal;
out highp vec4 outColour;
void main() {
  float strength = pow(max(0.72 - dot(vNormal, vec3(0.0, 0.0, 1.0)), 0.0), 3.0);
  outColour = vec4(glowColour, 1.0) * strength;
}`;

function texture(data: Uint8Array): DataTexture {
  const rows = data.length / 4 / TEXTURE_WIDTH;
  const made = new DataTexture(
    data,
    TEXTURE_WIDTH,
    rows,
    RGBAFormat,
    UnsignedByteType,
  );
  made.magFilter = NearestFilter;
  made.minFilter = NearestFilter;
  made.generateMipmaps = false;
  made.needsUpdate = true;
  return made;
}

/** Our own shaders write colours as given, so they take the theme's sRGB values unconverted. */
function shaderColour(hex: string): Color {
  return new Color(hex).convertLinearToSRGB();
}

function dotTexture(): CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 64;
  const context = canvas.getContext("2d")!;
  context.beginPath();
  context.arc(32, 32, 26, 0, Math.PI * 2);
  context.fillStyle = "#ffffff";
  context.fill();
  context.lineWidth = 8;
  context.strokeStyle = "#101010";
  context.stroke();
  return new CanvasTexture(canvas);
}

export class GlobeScene {
  private readonly renderer: WebGLRenderer;
  private readonly scene = new Scene();
  private readonly camera: PerspectiveCamera;
  private readonly controls: OrbitControls;
  private readonly material: ShaderMaterial;
  private readonly geometry = new BufferGeometry();
  private readonly finder: (x: number, y: number, z: number) => number;
  private readonly lines = new Map<string, LineSegments2[]>();
  private readonly lineMaterials: LineMaterial[] = [];
  private readonly disposables: { dispose(): void }[] = [];
  private places: Points | null = null;
  private outline: Line | null = null;
  private frame = 0;
  private flight = 0;
  private down: { x: number; y: number } | null = null;
  private disposed = false;
  private readonly options: SceneOptions;

  constructor(
    private readonly canvas: HTMLCanvasElement,
    private readonly planet: Planet,
    base: Uint8Array,
    options: SceneOptions,
  ) {
    this.options = options;
    this.renderer = new WebGLRenderer({ canvas, antialias: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setClearColor(new Color(options.background), 1);
    this.camera = new PerspectiveCamera(40, 1, 0.01, 20);
    this.camera.position.set(0, 0.4, OPENING_DISTANCE);
    this.camera.lookAt(0, 0, 0);

    const mesh = buildMesh(planet);
    this.geometry.setAttribute(
      "position",
      new BufferAttribute(mesh.position, 3),
    );
    this.geometry.setAttribute("tile", new BufferAttribute(mesh.tile, 1));
    this.geometry.setAttribute("rim", new BufferAttribute(mesh.rim, 1, true));
    this.geometry.setIndex(new BufferAttribute(mesh.index, 1));
    this.geometry.boundingSphere = new Sphere(new Vector3(), 1);
    const blank = new Uint8Array(base.length);
    this.material = new ShaderMaterial({
      glslVersion: GLSL3,
      vertexShader: VERTEX,
      fragmentShader: FRAGMENT,
      uniforms: {
        baseColours: { value: texture(base) },
        overlayColours: { value: texture(blank) },
        textureWidth: { value: TEXTURE_WIDTH },
        overlayOn: { value: 0 },
        edgeStrength: { value: 1 },
        selectedTile: { value: -1 },
        selectColour: { value: shaderColour(options.selection) },
      },
    });
    this.scene.add(new Mesh(this.geometry, this.material));

    const glowGeometry = new SphereGeometry(1.07, 96, 48);
    const glowMaterial = new ShaderMaterial({
      glslVersion: GLSL3,
      vertexShader: GLOW_VERTEX,
      fragmentShader: GLOW_FRAGMENT,
      uniforms: { glowColour: { value: shaderColour(options.glow) } },
      side: BackSide,
      blending: AdditiveBlending,
      transparent: true,
      depthWrite: false,
    });
    this.scene.add(new Mesh(glowGeometry, glowMaterial));
    this.disposables.push(
      glowGeometry,
      glowMaterial,
      this.geometry,
      this.material,
    );

    this.finder = makeFinder(planet);
    this.controls = new OrbitControls(this.camera, canvas);
    this.controls.enablePan = false;
    this.controls.enableDamping = false;
    this.controls.minDistance = NEAREST;
    this.controls.maxDistance = FARTHEST;
    this.controls.zoomSpeed = 0.6;
    this.controls.addEventListener("change", () => this.changed());
    this.changed();

    canvas.addEventListener("pointerdown", this.pointerDown);
    canvas.addEventListener("pointerup", this.pointerUp);
  }

  /** How far the camera is from the planet's surface, in planet radii. */
  get height(): number {
    return this.camera.position.length() - 1;
  }

  /** About how many screen pixels one tile spans at the middle of the view. */
  get tilePixels(): number {
    const tileAngle = Math.sqrt((4 * Math.PI) / this.planet.tiles);
    const height = this.canvas.clientHeight || 1;
    const visible =
      2 * Math.tan((this.camera.fov * Math.PI) / 360) * this.height;
    return (tileAngle / visible) * height;
  }

  resize(width: number, height: number): void {
    this.renderer.setSize(width, height, false);
    this.camera.aspect = width / Math.max(height, 1);
    this.camera.updateProjectionMatrix();
    for (const material of this.lineMaterials)
      material.resolution.set(width, height);
    this.changed();
  }

  setBase(colours: Uint8Array): void {
    this.replaceTexture("baseColours", colours);
  }

  setOverlay(colours: Uint8Array | null): void {
    if (colours) this.replaceTexture("overlayColours", colours);
    this.material.uniforms.overlayOn.value = colours ? 1 : 0;
    this.changed();
  }

  setEdges(shown: boolean): void {
    this.material.uniforms.edgeStrength.value = shown ? 1 : 0;
    this.changed();
  }

  /** Draws a set of lines, grouped by width so each group is one draw. */
  setLines(set: LineSet): void {
    this.removeLines(set.key);
    const made: LineSegments2[] = [];
    for (let width = 1; width <= 4; width++) {
      const chosen: number[] = [];
      for (let i = 0; i < set.widths.length; i++)
        if (set.widths[i] === width)
          for (let k = 0; k < 6; k++)
            chosen.push(set.segments[i * 6 + k] * LINE_LIFT);
      if (!chosen.length) continue;
      const geometry = new LineSegmentsGeometry();
      geometry.setPositions(chosen);
      const material = new LineMaterial({
        color: new Color(set.colour).getHex(),
        linewidth: 0.6 + width * 0.7,
        worldUnits: false,
      });
      material.resolution.set(
        this.canvas.clientWidth,
        this.canvas.clientHeight,
      );
      const lines = new LineSegments2(geometry, material);
      this.lineMaterials.push(material);
      this.scene.add(lines);
      made.push(lines);
    }
    this.lines.set(set.key, made);
    this.changed();
  }

  showLines(key: string, shown: boolean): void {
    for (const lines of this.lines.get(key) ?? []) lines.visible = shown;
    this.changed();
  }

  setPlaces(marks: PlaceMark[], shown: boolean): void {
    if (this.places) {
      this.scene.remove(this.places);
      this.places.geometry.dispose();
      (this.places.material as PointsMaterial).map?.dispose();
      (this.places.material as PointsMaterial).dispose();
      this.places = null;
    }
    if (!marks.length) return this.changed();
    const positions = new Float32Array(marks.length * 3);
    const colours = new Float32Array(marks.length * 3);
    const p = this.planet.positions;
    marks.forEach((mark, i) => {
      for (let k = 0; k < 3; k++)
        positions[i * 3 + k] = p[mark.tile * 3 + k] * PLACE_LIFT;
      const colour = new Color(mark.colour);
      colours.set([colour.r, colour.g, colour.b], i * 3);
    });
    const geometry = new BufferGeometry();
    geometry.setAttribute("position", new BufferAttribute(positions, 3));
    geometry.setAttribute("color", new BufferAttribute(colours, 3));
    const material = new PointsMaterial({
      size: 11,
      sizeAttenuation: false,
      vertexColors: true,
      map: dotTexture(),
      alphaTest: 0.5,
    });
    this.places = new Points(geometry, material);
    this.places.visible = shown;
    this.scene.add(this.places);
    this.changed();
  }

  showPlaces(shown: boolean): void {
    if (this.places) this.places.visible = shown;
    this.changed();
  }

  select(tile: number | null): void {
    this.material.uniforms.selectedTile.value = tile ?? -1;
    if (this.outline) {
      this.scene.remove(this.outline);
      this.outline.geometry.dispose();
      (this.outline.material as LineBasicMaterial).dispose();
      this.outline = null;
    }
    if (tile !== null) {
      const corners = cornersOf(this.planet, tile);
      const loop = new Float32Array(corners.length + 3);
      loop.set(corners);
      loop.set(corners.subarray(0, 3), corners.length);
      for (let i = 0; i < loop.length; i++) loop[i] *= LINE_LIFT;
      const geometry = new BufferGeometry();
      geometry.setAttribute("position", new BufferAttribute(loop, 3));
      this.outline = new Line(
        geometry,
        new LineBasicMaterial({ color: new Color(this.options.selection) }),
      );
      this.scene.add(this.outline);
    }
    this.changed();
  }

  /** Turns the planet: positive steps turn east and north. A step is a share of what is on screen. */
  turn(east: number, north: number): void {
    const spherical = new Spherical().setFromVector3(this.camera.position);
    const step = Math.min(0.5, 0.35 * this.height);
    spherical.theta -= east * step;
    spherical.phi = Math.min(
      Math.PI - 0.05,
      Math.max(0.05, spherical.phi - north * step),
    );
    this.camera.position.setFromSpherical(spherical);
    this.camera.lookAt(0, 0, 0);
    this.controls.update();
    this.changed();
  }

  zoom(closer: boolean): void {
    const distance = this.camera.position.length();
    const height = (distance - 1) * (closer ? 0.7 : 1 / 0.7);
    const next = Math.min(FARTHEST, Math.max(NEAREST, 1 + height));
    this.camera.position.setLength(next);
    this.controls.update();
    this.changed();
  }

  reset(): void {
    this.camera.position.set(0, 0.4, OPENING_DISTANCE);
    this.camera.lookAt(0, 0, 0);
    this.controls.update();
    this.changed();
  }

  /** Swings the camera over a tile, closer if it is far away; at once when motion is reduced. */
  flyTo(tile: number): void {
    const p = this.planet.positions;
    const to = new Vector3(
      p[tile * 3],
      p[tile * 3 + 1],
      p[tile * 3 + 2],
    ).normalize();
    const distance = Math.min(this.camera.position.length(), CLOSE_LOOK);
    const from = this.camera.position.clone().normalize();
    const fromDistance = this.camera.position.length();
    cancelAnimationFrame(this.flight);
    if (this.options.reducedMotion) {
      this.camera.position.copy(to.multiplyScalar(distance));
      this.camera.lookAt(0, 0, 0);
      this.controls.update();
      return this.changed();
    }
    const started = performance.now();
    const step = (now: number) => {
      const share = Math.min(1, (now - started) / FLY_MS);
      const eased =
        share < 0.5 ? 2 * share * share : 1 - (-2 * share + 2) ** 2 / 2;
      const direction = from.clone().lerp(to, eased).normalize();
      this.camera.position.copy(
        direction.multiplyScalar(
          fromDistance + (distance - fromDistance) * eased,
        ),
      );
      this.camera.lookAt(0, 0, 0);
      this.controls.update();
      this.changed();
      if (share < 1) this.flight = requestAnimationFrame(step);
    };
    this.flight = requestAnimationFrame(step);
  }

  /** The tile under a point on the canvas, or null off the planet. */
  pickAt(x: number, y: number): number | null {
    const rect = this.canvas.getBoundingClientRect();
    const ndc = new Vector2(
      ((x - rect.left) / rect.width) * 2 - 1,
      -((y - rect.top) / rect.height) * 2 + 1,
    );
    const raycaster = new Raycaster();
    raycaster.setFromCamera(ndc, this.camera);
    const hit = raycaster.ray.intersectSphere(
      new Sphere(new Vector3(), 1),
      new Vector3(),
    );
    return hit ? this.finder(hit.x, hit.y, hit.z) : null;
  }

  /** The tile at the middle of the view. */
  middleTile(): number {
    const direction = this.camera.position.clone().normalize();
    return this.finder(direction.x, direction.y, direction.z);
  }

  /** Where a point on the planet falls on the canvas, in CSS pixels, and whether it faces the camera. */
  project(x: number, y: number, z: number): ScreenPoint {
    const point = new Vector3(x, y, z);
    const facing = point.dot(this.camera.position) > point.lengthSq() * 1.002;
    point.project(this.camera);
    return {
      x: ((point.x + 1) / 2) * this.canvas.clientWidth,
      y: ((1 - point.y) / 2) * this.canvas.clientHeight,
      facing,
    };
  }

  dispose(): void {
    this.disposed = true;
    cancelAnimationFrame(this.frame);
    cancelAnimationFrame(this.flight);
    this.canvas.removeEventListener("pointerdown", this.pointerDown);
    this.canvas.removeEventListener("pointerup", this.pointerUp);
    this.controls.dispose();
    for (const key of [...this.lines.keys()]) this.removeLines(key);
    this.setPlaces([], false);
    this.select(null);
    (this.material.uniforms.baseColours.value as DataTexture).dispose();
    (this.material.uniforms.overlayColours.value as DataTexture).dispose();
    for (const item of this.disposables) item.dispose();
    this.renderer.dispose();
  }

  private replaceTexture(
    name: "baseColours" | "overlayColours",
    colours: Uint8Array,
  ): void {
    const old = this.material.uniforms[name].value as DataTexture;
    this.material.uniforms[name].value = texture(colours);
    old.dispose();
    this.changed();
  }

  private removeLines(key: string): void {
    for (const lines of this.lines.get(key) ?? []) {
      this.scene.remove(lines);
      lines.geometry.dispose();
      const material = lines.material as LineMaterial;
      this.lineMaterials.splice(this.lineMaterials.indexOf(material), 1);
      material.dispose();
    }
    this.lines.delete(key);
  }

  /** Asks for one drawing at the next frame; several changes in one frame draw once. */
  private changed(): void {
    if (this.frame || this.disposed) return;
    this.frame = requestAnimationFrame(() => {
      this.frame = 0;
      this.controls.rotateSpeed = Math.max(
        0.05,
        Math.min(1, this.height * 0.6),
      );
      this.renderer.render(this.scene, this.camera);
      this.options.onChange();
    });
  }

  private readonly pointerDown = (event: PointerEvent) => {
    this.down = { x: event.clientX, y: event.clientY };
  };

  private readonly pointerUp = (event: PointerEvent) => {
    if (!this.down) return;
    const moved = Math.hypot(
      event.clientX - this.down.x,
      event.clientY - this.down.y,
    );
    this.down = null;
    if (moved > CLICK_SLOP_PX) return;
    const tile = this.pickAt(event.clientX, event.clientY);
    if (tile !== null) this.options.onPick(tile);
  };
}
