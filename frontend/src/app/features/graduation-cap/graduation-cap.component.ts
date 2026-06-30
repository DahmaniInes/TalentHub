// graduation-cap.component.ts
import {
  Component, ElementRef, ViewChild,
  AfterViewInit, OnDestroy, NgZone
} from '@angular/core';




@Component({
  selector: 'app-graduation-cap',
  standalone: true,
  template: `
    <div class="cap-wrapper">
      <canvas #capCanvas class="cap-canvas"></canvas>
    </div>
  `,
  styles: [`
    .cap-wrapper {
      width: 200px;
      height: 200px;       /* ✅ hauteur VISIBLE réduite, indépendante du canvas */
      overflow: hidden;     /* ✅ coupe l'espace vide en haut/bas */
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .cap-canvas {
      width: 500px;
      height: 500px;        /* ✅ résolution du canvas INCHANGÉE */
      display: block;
      flex-shrink: 0;
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
  private isVisible = true;
  private destroyed = false;
  private observer: IntersectionObserver | null = null;
  private themeObserver: MutationObserver | null = null;

  // ✅ Réglage unique : pourcentage du cadre occupé par l'objet
  private FILL = 0.92;

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
    const SIZE = 600; // ✅ doit matcher le CSS .cap-canvas

    this.scene = new THREE.Scene();

    // ── far très généreux au départ, sera de toute façon recalculé après chargement ──
    this.camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100000);

    this.renderer = new THREE.WebGLRenderer({
      canvas, alpha: true, antialias: true, powerPreference: 'low-power'
    });
    this.renderer.setSize(SIZE, SIZE, false);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));

    const ambient = new THREE.AmbientLight(0xffffff, 2.5);
    this.scene.add(ambient);
    const front = new THREE.DirectionalLight(0xffffff, 0.4);
    front.position.set(0, 1, 3);
    this.scene.add(front);

    const dracoLoader = new DRACOLoader();
    dracoLoader.setDecoderPath('/assets/draco/');

    const loader = new GLTFLoader();
    loader.setDRACOLoader(dracoLoader);

    loader.load(
      '/assets/images/models/graduation.glb',
      (gltf: any) => {
        this.cap = gltf.scene;
        this.scene.add(this.cap);

        // ── Box calculée UNIQUEMENT à partir des vrais meshes (pas Groups/Empties) ──
        const box = new THREE.Box3();
        let meshCount = 0;
        this.cap.traverse((child: any) => {
          if (child.isMesh && child.geometry) {
            child.geometry.computeBoundingBox();
            const childBox = child.geometry.boundingBox.clone();
            childBox.applyMatrix4(child.matrixWorld);
            box.union(childBox);
            meshCount++;
          }
        });
        console.log('[CAP] Meshes utilisés:', meshCount);

        const center = box.getCenter(new THREE.Vector3());
        const size = box.getSize(new THREE.Vector3());
        console.log('[CAP] Taille réelle:', size, '| Centre:', center);

        // Centrer l'objet
        this.cap.position.sub(center);

        const radius = box.getBoundingSphere(new THREE.Sphere()).radius;
        console.log('[CAP] Rayon:', radius);

        const fovRad = (this.camera.fov * Math.PI) / 180;
        const distance = (radius / Math.sin(fovRad / 2)) / this.FILL;

        // ✅ FIX CRITIQUE : far doit toujours dépasser distance, sinon rien ne s'affiche
        this.camera.far = distance * 3;
        this.camera.near = Math.max(distance / 1000, 0.001);
        this.camera.updateProjectionMatrix(); // ✅ obligatoire après avoir changé near/far

        console.log('[CAP] Distance caméra:', distance, '| far:', this.camera.far, '| near:', this.camera.near);

        this.camera.position.set(0, 0, distance);
        this.camera.lookAt(0, 0, 0);

        this.applyThemeColors();
        this.renderer.render(this.scene, this.camera);

        dracoLoader.dispose();
      },
      undefined,
      (err: any) => console.error('[CAP] ❌ Erreur chargement GLB', err)
    );

    this.themeObserver = new MutationObserver(() => {
      this.applyThemeColors();
      if (this.renderer && this.scene && this.camera) {
        this.renderer.render(this.scene, this.camera);
      }
    });
    this.themeObserver.observe(document.documentElement, {
      attributes: true, attributeFilter: ['class']
    });

    this.observer = new IntersectionObserver(
      entries => this.isVisible = entries[0].isIntersecting,
      { threshold: 0.1 }
    );
    this.observer.observe(canvas);
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
        if (hex !== undefined) {
          mat.color?.setHex(hex);
          mat.needsUpdate = true;
        }
      });
    });
  }

  ngOnDestroy() {
    this.destroyed = true;
    this.observer?.disconnect();
    this.themeObserver?.disconnect();
    if (this.scene) this.disposeObject(this.scene);
    this.renderer?.dispose();
  }

  private disposeObject(obj: any) {
    obj.traverse?.((child: any) => {
      child.geometry?.dispose?.();
      const mats = Array.isArray(child.material) ? child.material : [child.material];
      mats.forEach((m: any) => m?.dispose?.());
    });
  }
}