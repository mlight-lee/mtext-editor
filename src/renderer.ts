import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { DefaultFontLoader, FontManager, MText, StyleManager } from '@mlightcad/mtext-renderer';

/** Options for rendering MText content */
interface MTextRenderOptions {
  /** The text content to be rendered */
  content: string;
  /** Optional width constraint for the text box. If not provided, text will flow naturally */
  width?: number;
  /** Whether to draw a bounding box around the text */
  isDrawTextBox?: boolean;
}

/** Renderer class for MText content using Three.js */
export class MTextRenderer {
  /** Three.js scene containing all rendered objects */
  private scene: THREE.Scene;
  /** Orthographic camera for 2D rendering */
  private camera!: THREE.OrthographicCamera;
  /** WebGL renderer instance */
  private renderer!: THREE.WebGLRenderer;
  /** Orbit controls for camera manipulation */
  private controls!: OrbitControls;
  /** Font manager instance for handling text fonts */
  private fontManager!: FontManager;
  /** Style manager for text styling */
  private styleManager!: StyleManager;
  /** Currently rendered MText instance */
  private currentMText: MText | null = null;
  /** Font loader for loading required fonts */
  private fontLoader!: DefaultFontLoader;
  /** ID of the container element */
  private containerId: string;
  /** Box mesh for text bounding box */
  private textBox: THREE.Mesh | null = null;
  /** Line segments for text bounding box */
  private textBoxLines: THREE.LineSegments | null = null;

  /**
   * Creates a new MTextRenderer instance
   * @param containerId - ID of the HTML element to contain the renderer
   */
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
    this.camera.position.set(0, 0, 5);

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
    this.initializeFonts().catch((error) => {
      console.error('Failed to initialize fonts:', error);
    });

    // Start animation loop
    this.animate();
  }

  /**
   * Sets up the lighting in the scene
   * @private
   */
  private setupLights(): void {
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    this.scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.5);
    directionalLight.position.set(1, 1, 1);
    this.scene.add(directionalLight);
  }

  /**
   * Sets up event listeners for window resize
   * @private
   */
  private setupEventListeners(): void {
    // Window resize
    window.addEventListener('resize', () => {
      this.handleResize();
    });
  }

  /**
   * Handles window resize events
   * @private
   */
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

  /**
   * Initializes required fonts
   * @private
   */
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

  /**
   * Creates or updates a bounding box around the text using four lines
   * @private
   * @param box - The bounding box of the text to bound
   * @param width - Optional fixed width for the box
   */
  private updateTextBox(box: THREE.Box3, width?: number): void {
    // Remove existing text box lines if any
    if (this.textBoxLines) {
      this.scene.remove(this.textBoxLines);
      this.textBoxLines = null;
    }

    if (!this.currentMText) return;

    // Calculate dimensions
    const minX = box.min.x;
    const minY = box.min.y;
    const maxX = (width ?? box.max.x - box.min.x) ? minX + width! : box.max.x;
    const maxY = box.max.y;

    // Define the four corners
    const bl = new THREE.Vector3(minX, minY, 0); // bottom left
    const br = new THREE.Vector3(maxX, minY, 0); // bottom right
    const tr = new THREE.Vector3(maxX, maxY, 0); // top right
    const tl = new THREE.Vector3(minX, maxY, 0); // top left

    // Create geometry for the four lines (rectangle)
    const points = [
      bl,
      br, // bottom
      br,
      tr, // right
      tr,
      tl, // top
      tl,
      bl, // left
    ];
    const geometry = new THREE.BufferGeometry().setFromPoints(points);

    // Create line material
    const material = new THREE.LineBasicMaterial({ color: 0xffffff });

    // Create line segments
    this.textBoxLines = new THREE.LineSegments(geometry, material);
    this.scene.add(this.textBoxLines);
  }

  /**
   * Renders MText content with optional text box
   * @param options - Options for rendering the text
   */
  async renderMText(options: MTextRenderOptions) {
    // Remove existing MText if any
    if (this.currentMText) {
      this.scene.remove(this.currentMText);
    }
    if (this.textBox) {
      this.scene.remove(this.textBox);
      this.textBox = null;
    }
    if (this.textBoxLines) {
      this.scene.remove(this.textBoxLines);
      this.textBoxLines = null;
    }

    // Get required fonts from the MText content
    const requiredFonts = Array.from(MText.getFonts(options.content, true));
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
      text: options.content,
      height: 0.1,
      width: options.width ?? 0,
      position: new THREE.Vector3(-4.5, 2, 0),
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

    // If text box is requested, create it
    if (options.isDrawTextBox) {
      // Wait for the next frame to ensure box is updated
      requestAnimationFrame(() => {
        if (this.currentMText) {
          this.updateTextBox(this.currentMText.box, options.width);
        }
      });
    }
  }

  /**
   * Animation loop for continuous rendering
   * @private
   */
  private animate(): void {
    requestAnimationFrame(() => this.animate());
    this.controls.update();
    this.renderer.render(this.scene, this.camera);
  }
}
