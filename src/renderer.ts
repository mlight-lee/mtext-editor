import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { DefaultFontLoader, FontManager, MText, StyleManager } from '@mlightcad/mtext-renderer';

export class MTextRenderer {
  private scene: THREE.Scene;
  private camera!: THREE.OrthographicCamera;
  private renderer!: THREE.WebGLRenderer;
  private controls!: OrbitControls;
  private fontManager!: FontManager;
  private styleManager!: StyleManager;
  private currentMText: MText | null = null;
  private fontLoader!: DefaultFontLoader;
  private containerId: string;

  constructor(containerId: string) {
    this.containerId = containerId;

    // Initialize Three.js components
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x333333);

    // Use orthographic camera for 2D rendering
    const renderArea = document.getElementById(containerId);
    if (!renderArea) return;

    const width = renderArea.clientWidth;
    const height = renderArea.clientHeight;
    const aspect = width / height;
    const frustumSize = 5;

    this.camera = new THREE.OrthographicCamera(
      (frustumSize * aspect) / -2,
      (frustumSize * aspect) / 2,
      frustumSize / 2,
      frustumSize / -2,
      0.1,
      1000
    );
    this.camera.position.z = 5;

    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.renderer.setSize(width, height);
    renderArea.appendChild(this.renderer.domElement);

    // Add orbit controls
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.05;
    this.controls.screenSpacePanning = true;
    this.controls.minDistance = 1;
    this.controls.maxDistance = 50;
    this.controls.maxPolarAngle = Math.PI / 2;

    // Initialize managers and loader
    this.fontManager = FontManager.instance;
    this.fontManager.defaultFont = 'simkai';
    this.styleManager = new StyleManager();
    this.fontLoader = new DefaultFontLoader();

    // Add lights
    this.setupLights();

    // Setup event listeners
    this.setupEventListeners();

    // Initialize fonts and UI, then render
    this.initializeFonts()
      .then(async () => {
        // Initial render after fonts are loaded
        await this.renderMText('Hello World!');
      })
      .catch((error) => {
        console.error('Failed to initialize fonts:', error);
      });

    // Start animation loop
    this.animate();
  }

  private setupLights(): void {
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    this.scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.5);
    directionalLight.position.set(1, 1, 1);
    this.scene.add(directionalLight);
  }

  private setupEventListeners(): void {
    // Window resize
    window.addEventListener('resize', () => {
      this.handleResize();
    });
  }

  private handleResize(): void {
    const renderArea = document.getElementById(this.containerId);
    if (!renderArea) return;

    const width = renderArea.clientWidth;
    const height = renderArea.clientHeight;
    const aspect = width / height;
    const frustumSize = 5;

    // Update camera frustum
    this.camera.left = (frustumSize * aspect) / -2;
    this.camera.right = (frustumSize * aspect) / 2;
    this.camera.top = frustumSize / 2;
    this.camera.bottom = frustumSize / -2;
    this.camera.updateProjectionMatrix();

    // Update renderer size and pixel ratio
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.renderer.setSize(width, height);

    // Force a render to update the display
    this.renderer.render(this.scene, this.camera);
  }

  private async initializeFonts(): Promise<void> {
    try {
      // Load available fonts for the dropdown
      await this.fontLoader.getAvaiableFonts();
      // Load default fonts
      await this.fontLoader.load([this.fontManager.defaultFont]);
    } catch (error) {
      console.error('Error loading fonts:', error);
      throw error; // Re-throw to handle in the constructor
    }
  }

  async renderMText(content: string) {
    // Remove existing MText if any
    if (this.currentMText) {
      this.scene.remove(this.currentMText);
    }

    // Get required fonts from the MText content
    const requiredFonts = Array.from(MText.getFonts(content, true));
    if (requiredFonts.length > 0) {
      try {
        // Load the required fonts
        await this.fontLoader.load(requiredFonts);
      } catch (error) {
        console.error('Error loading fonts:', error);
      }
    }

    // Create new MText instance
    const mtextContent = {
      text: content,
      height: 0.1,
      width: 0,
      position: new THREE.Vector3(-3, 2, 0),
    };

    this.currentMText = new MText(
      mtextContent,
      {
        name: 'Standard',
        standardFlag: 0,
        fixedTextHeight: 0.1,
        widthFactor: 1,
        obliqueAngle: 0,
        textGenerationFlag: 0,
        lastHeight: 0.1,
        font: this.fontManager.defaultFont,
        bigFont: '',
        color: 0xffffff,
      },
      this.styleManager,
      this.fontManager
    );

    this.scene.add(this.currentMText);
  }

  private animate(): void {
    requestAnimationFrame(() => this.animate());
    this.controls.update();
    this.renderer.render(this.scene, this.camera);
  }
}
