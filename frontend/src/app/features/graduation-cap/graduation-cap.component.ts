import {
  Component, ElementRef, ViewChild,
  AfterViewInit, OnDestroy, NgZone
} from '@angular/core';

@Component({
  selector: 'app-graduation-cap',
  standalone: true,
  template: `<canvas #capCanvas class="cap-canvas"></canvas>`,
  styles: [`
    :host {
      display: block;
      position: absolute;
      right: -1px;
      top: 50%;
      transform: translateY(-50%);
      pointer-events: none;
    }
    .cap-canvas {
      width: 400px;
      height: 250px;
      display: block;
    }
  `]
})
export class GraduationCapComponent implements AfterViewInit, OnDestroy {
  @ViewChild('capCanvas') canvasRef!: ElementRef<HTMLCanvasElement>;

  private renderer: any;
  private scene: any;
  private camera: any;
  private cap: any;
  private THREE: any;
  private animationId: number | null = null;
  private isVisible = false;
  private destroyed = false;
  private observer: IntersectionObserver | null = null;
  private themeObserver: MutationObserver | null = null;
  private startTime: number = 0;

  private readonly COLORS = {
    dark: {
      'MainColor':       0xffffff,
      'AccentColor':     0xc026d3,
      'entete_chapeaux': 0xffffff,
    } as Record<string, number>,
    light: {
      'MainColor':       0xffffff,
      'AccentColor':     0x9333ea,
      'entete_chapeaux': 0xffffff,
    } as Record<string, number>
  };

  constructor(private zone: NgZone) {}

  ngAfterViewInit() {
    setTimeout(() => this.init(), 150);
  }

  private async init() {
    if (this.destroyed) return;

    this.THREE = await import('three');
    const THREE = this.THREE;
    const { GLTFLoader } = await import('three/examples/jsm/loaders/GLTFLoader.js');
    const { DRACOLoader } = await import('three/examples/jsm/loaders/DRACOLoader.js');

    const canvas = this.canvasRef.nativeElement;
    const CSS_SIZE = 250;
    const DPR = Math.min(window.devicePixelRatio, 2);
    const SIZE = CSS_SIZE * DPR;

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100000);

    this.renderer = new THREE.WebGLRenderer({
      canvas, alpha: true, antialias: true, powerPreference: 'high-performance'
    });
    this.renderer.setSize(SIZE, SIZE, false);
    this.renderer.setPixelRatio(DPR);

    this.scene.add(new THREE.AmbientLight(0xffffff, 2.5));
    const front = new THREE.DirectionalLight(0xffffff, 0.6);
    front.position.set(2, 3, 3);
    this.scene.add(front);

    const dracoLoader = new DRACOLoader();
    dracoLoader.setDecoderPath('/assets/draco/');
    const loader = new GLTFLoader();
    loader.setDRACOLoader(dracoLoader);

    loader.load(
      '/assets/images/models/graduation.glb',
      (gltf: any) => {

        // ── Calcule le centre réel de l'objet ──
        const box = new THREE.Box3();
        gltf.scene.traverse((child: any) => {
          if (child.isMesh && child.geometry) {
            child.geometry.computeBoundingBox();
            const cb = child.geometry.boundingBox.clone();
            cb.applyMatrix4(child.matrixWorld);
            box.union(cb);
          }
        });
        const center = box.getCenter(new THREE.Vector3());

        // ✅ SOLUTION CORRECTE :
        // 1. pivot reste à (0,0,0) dans la scène
        // 2. gltf.scene est décalé de -center à l'INTÉRIEUR du pivot
        // 3. Résultat : le centre de l'objet est exactement à (0,0,0)
        // 4. Rotation du pivot = rotation autour du centre = sur place
        // 5. Position visuelle identique à la version sans animation
        const pivot = new THREE.Group();
        gltf.scene.position.set(-center.x, -center.y, -center.z);
        pivot.add(gltf.scene);
        this.scene.add(pivot);
        this.cap = pivot;

        // ── Caméra ──
        const radius = box.getBoundingSphere(new THREE.Sphere()).radius;
        const fovRad = (this.camera.fov * Math.PI) / 180;
        const distance = (radius / Math.sin(fovRad / 2)) / 0.75;

        this.camera.far = distance * 3;
        this.camera.near = Math.max(distance / 1000, 0.001);
        this.camera.updateProjectionMatrix();
        this.camera.position.set(0, 0, distance);
        this.camera.lookAt(0, 0, 0);

        this.applyThemeColors();
        this.startLoop();
        dracoLoader.dispose();
      },
      undefined,
      (err: any) => console.error('[CAP] ❌', err)
    );

    this.themeObserver = new MutationObserver(() => {
      this.applyThemeColors();
    });
    this.themeObserver.observe(document.documentElement, {
      attributes: true, attributeFilter: ['class']
    });

    this.observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          this.startTime = performance.now();
          this.isVisible = true;
        } else {
          this.isVisible = false;
        }
      },
      { threshold: 0.1 }
    );
    this.observer.observe(canvas);
  }

  private startLoop() {
    this.zone.runOutsideAngular(() => {
      const DURATION = 2;
      const animate = () => {
        if (this.destroyed) return;
        this.animationId = requestAnimationFrame(animate);
        if (!this.isVisible || !this.cap) return;

        const t = (performance.now() - this.startTime) / 1000;

        if (t < DURATION) {
          this.cap.rotation.y = (t / DURATION) * Math.PI * 2;
        } else {
          this.cap.rotation.y = 0;
        }
        this.renderer.render(this.scene, this.camera);
      };
      animate();
    });
  }

  private applyThemeColors() {
    if (!this.cap || !this.THREE) return;
    const isDark = document.documentElement.classList.contains('dark');
    const palette = isDark ? this.COLORS.dark : this.COLORS.light;
    this.cap.traverse((child: any) => {
      if (!child.isMesh) return;
      const mats = Array.isArray(child.material) ? child.material : [child.material];
      mats.forEach((mat: any) => {
        if (!mat) return;
        const hex = palette[mat.name];
        if (hex !== undefined) { mat.color?.setHex(hex); mat.needsUpdate = true; }
      });
    });
  }

  ngOnDestroy() {
    this.destroyed = true;
    if (this.animationId) cancelAnimationFrame(this.animationId);
    this.observer?.disconnect();
    this.themeObserver?.disconnect();
    this.renderer?.dispose();
  }
}