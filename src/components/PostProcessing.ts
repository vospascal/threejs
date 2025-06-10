import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { LUTPass } from 'three/addons/postprocessing/LUTPass.js';
import { BokehPass } from 'three/addons/postprocessing/BokehPass.js';
import { LUTCubeLoader } from 'three/addons/loaders/LUTCubeLoader.js';
import { LUT3dlLoader } from 'three/addons/loaders/LUT3dlLoader.js';
import { LUTImageLoader } from 'three/addons/loaders/LUTImageLoader.js';
import { BokehShader, BokehDepthShader } from 'three/addons/shaders/BokehShader2.js';
import type { AppState, BokehSettings, LUTSettings, PostProcessingState } from '../types';

export class PostProcessing {
  private appState: AppState;
  private composer!: EffectComposer;
  private renderPass!: RenderPass;
  private bokehPass!: BokehPass;
  private lutPass!: LUTPass;
  private outputPass!: OutputPass;
  private materialDepth!: THREE.ShaderMaterial;
  private rtTextureDepth!: THREE.WebGLRenderTarget;
  private rtTextureColor!: THREE.WebGLRenderTarget;
  
  // Effect settings
  private bokehSettings: BokehSettings = {
    enabled: true,
    focus: 10.0,       // Focus at 10m boundary
    aperture: 0.001,   // Very small aperture for deep depth of field
    maxblur: 0.0075,      // Stronger blur for distant objects
    nearFocusDistance: 0.01,
    showFocus: false,
    manualdof: true,
    vignetting: false,
    depthblur: true,   // Enable depth-based blur
    threshold: 0.5,
    gain: 0,
    bias: 0,
    fringe: 0.0,
    focalLength: 35,
    noise: true,
    pentagon: false,
    dithering: 0.0001
  };

  private lutSettings: LUTSettings = {
    enabled: true,
    lut: 'Bourbon 64.CUBE',
    intensity: 1.0
  };

  // Available LUT files
  private lutMap: { [key: string]: any } = {
    'Bourbon 64.CUBE': null,
    // 'Chemical 168.CUBE': null,
    // 'Clayton 33.CUBE': null,
    // 'Cubicle 99.CUBE': null,
    // 'Remy 24.CUBE': null,
    // 'Presetpro-Cinematic.3dl': null,
    // 'NeutralLUT': null,
    // 'B&WLUT': null,
    // 'NightLUT': null,
    // 'curve_bump': null,
    // 'generated_lut': null,
    // 'hot_lut.CUBE': null
  };

  private mouse = new THREE.Vector2();
  private raycaster = new THREE.Raycaster();
  private distance = 100;

  constructor(appState: AppState) {
    this.appState = appState;
    
    this.initializeComposer();
    this.initializeBokehEffect();
    this.initializeLUTEffect();
    this.loadLUTs();
    this.setupMouseTracking();
    
    // Initialize post-processing state
    this.appState.postProcessing = {
      composer: this.composer,
      bokehPass: this.bokehPass,
      lutPass: this.lutPass,
      enabled: true,
      bokehEnabled: this.bokehSettings.enabled,
      lutEnabled: this.lutSettings.enabled
    };
  }

  private initializeComposer(): void {
    this.composer = new EffectComposer(this.appState.renderer);
    this.composer.setPixelRatio(window.devicePixelRatio);
    this.composer.setSize(window.innerWidth, window.innerHeight);

    // Add render pass
    this.renderPass = new RenderPass(this.appState.scene, this.appState.camera);
    this.composer.addPass(this.renderPass);
  }

  private initializeBokehEffect(): void {
    // Create render targets for depth and color
    this.rtTextureDepth = new THREE.WebGLRenderTarget(
      window.innerWidth,
      window.innerHeight,
      { type: THREE.HalfFloatType }
    );
    
    this.rtTextureColor = new THREE.WebGLRenderTarget(
      window.innerWidth,
      window.innerHeight,
      { type: THREE.HalfFloatType }
    );

    // Create depth material
    const depthShader = BokehDepthShader;
    this.materialDepth = new THREE.ShaderMaterial({
      uniforms: depthShader.uniforms,
      vertexShader: depthShader.vertexShader,
      fragmentShader: depthShader.fragmentShader
    });

    this.materialDepth.uniforms['mNear'].value = this.appState.camera.near;
    this.materialDepth.uniforms['mFar'].value = this.appState.camera.far;

    // Create bokeh pass
    this.bokehPass = new BokehPass(this.appState.scene, this.appState.camera, {
      focus: Math.max(this.bokehSettings.focus, this.bokehSettings.nearFocusDistance),
      aperture: this.bokehSettings.aperture,
      maxblur: this.bokehSettings.maxblur
    });

    this.composer.addPass(this.bokehPass);
  }

  private initializeLUTEffect(): void {
    this.lutPass = new LUTPass();
    this.composer.addPass(this.lutPass);

    // Add output pass last
    this.outputPass = new OutputPass();
    this.composer.addPass(this.outputPass);
  }

  private loadLUTs(): void {
    Object.keys(this.lutMap).forEach(name => {
      if (/\.CUBE$/i.test(name)) {
        new LUTCubeLoader()
          .load(`luts/${name}`, (result) => {
            this.lutMap[name] = result;
            console.log(`Loaded LUT: ${name}`);
          }, undefined, (error) => {
            console.warn(`Failed to load LUT ${name}:`, error);
          });
      } else if (/LUT$/i.test(name)) {
        new LUTImageLoader()
          .load(`luts/${name}.png`, (result) => {
            this.lutMap[name] = result;
            console.log(`Loaded LUT: ${name}`);
          }, undefined, (error) => {
            console.warn(`Failed to load LUT ${name}:`, error);
          });
      } else {
        new LUT3dlLoader()
          .load(`luts/${name}`, (result) => {
            this.lutMap[name] = result;
            console.log(`Loaded LUT: ${name}`);
          }, undefined, (error) => {
            console.warn(`Failed to load LUT ${name}:`, error);
          });
      }
    });
  }

  private setupMouseTracking(): void {
    const windowHalfX = window.innerWidth / 2;
    const windowHalfY = window.innerHeight / 2;

    const onPointerMove = (event: PointerEvent) => {
      if (event.isPrimary === false) return;

      this.mouse.x = (event.clientX - windowHalfX) / windowHalfX;
      this.mouse.y = -(event.clientY - windowHalfY) / windowHalfY;
    };

    document.addEventListener('pointermove', onPointerMove);
  }

  public updateBokehFocus(): void {
    if (!this.bokehSettings.enabled || this.bokehSettings.manualdof) {
      return;
    }

    // Use raycasting to determine focus distance
    this.raycaster.setFromCamera(this.mouse, this.appState.camera);
    const intersects = this.raycaster.intersectObjects(this.appState.scene.children, true);
    
    let targetDistance = (intersects.length > 0) ? intersects[0].distance : 1000;
    
    // For the "sharp up to 10m, blur beyond" effect:
    // If target is within 10m, set focus to 10m to keep foreground sharp
    // If target is beyond 10m, focus on the target to blur background
    if (targetDistance <= 10.0) {
      targetDistance = 10.0; // Keep focus at 10m boundary
    }
    
    // Ensure focus distance is at least the near focus distance
    targetDistance = Math.max(targetDistance, this.bokehSettings.nearFocusDistance);
    
    this.distance += (targetDistance - this.distance) * 0.03;

    // Update bokeh focus
    if (this.bokehPass.uniforms && (this.bokehPass.uniforms as any)['focus']) {
      (this.bokehPass.uniforms as any)['focus'].value = this.distance;
    }
  }

  public render(): void {
    if (!this.appState.postProcessing?.enabled) {
      // Fallback to regular rendering
      this.appState.renderer.render(this.appState.scene, this.appState.camera);
      return;
    }

    // Update bokeh focus if auto-focus is enabled
    if (this.bokehSettings.enabled && !this.bokehSettings.manualdof) {
      this.updateBokehFocus();
    }

    // Update LUT settings
    if (this.lutSettings.enabled && this.lutMap[this.lutSettings.lut]) {
      const lut = this.lutMap[this.lutSettings.lut];
      if (lut && lut.texture3D) {
        this.lutPass.lut = lut.texture3D;
        this.lutPass.intensity = this.lutSettings.intensity;
      }
    }

    // Enable/disable passes based on settings
    this.bokehPass.enabled = this.bokehSettings.enabled;
    this.lutPass.enabled = this.lutSettings.enabled && Boolean(this.lutMap[this.lutSettings.lut]);

    // Render using composer
    this.composer.render();
  }

  public onWindowResize(): void {
    this.composer.setSize(window.innerWidth, window.innerHeight);
    
    if (this.rtTextureDepth) {
      this.rtTextureDepth.setSize(window.innerWidth, window.innerHeight);
    }
    
    if (this.rtTextureColor) {
      this.rtTextureColor.setSize(window.innerWidth, window.innerHeight);
    }

    // Update bokeh uniforms
    if (this.bokehPass) {
      (this.bokehPass.uniforms as any)['aspect'].value = this.appState.camera.aspect;
    }
  }

  // Getters and setters for effect controls
  public getBokehSettings(): BokehSettings {
    return { ...this.bokehSettings };
  }

  public setBokehSettings(settings: Partial<BokehSettings>): void {
    this.bokehSettings = { ...this.bokehSettings, ...settings };
    
    // Update bokeh pass uniforms
    if (this.bokehPass) {
      Object.keys(settings).forEach(key => {
        if (key === 'focus') {
          // Ensure focus is at least the near focus distance
          const focusValue = Math.max(
            settings.focus || this.bokehSettings.focus,
            this.bokehSettings.nearFocusDistance
          );
          if ((this.bokehPass.uniforms as any)['focus']) {
            (this.bokehPass.uniforms as any)['focus'].value = focusValue;
          }
        } else if (key in this.bokehPass.uniforms) {
          (this.bokehPass.uniforms as any)[key].value = settings[key as keyof BokehSettings];
        }
      });
    }

    // Update camera focal length if changed
    if (settings.focalLength) {
      this.appState.camera.setFocalLength(settings.focalLength);
    }
  }

  public getLUTSettings(): LUTSettings {
    return { ...this.lutSettings };
  }

  public setLUTSettings(settings: Partial<LUTSettings>): void {
    this.lutSettings = { ...this.lutSettings, ...settings };
  }

  public getAvailableLUTs(): string[] {
    return Object.keys(this.lutMap);
  }

  public setPostProcessingEnabled(enabled: boolean): void {
    if (this.appState.postProcessing) {
      this.appState.postProcessing.enabled = enabled;
    }
  }

  public dispose(): void {
    this.composer.dispose();
    this.rtTextureDepth?.dispose();
    this.rtTextureColor?.dispose();
    this.materialDepth?.dispose();
    
    // Dispose LUT textures
    Object.values(this.lutMap).forEach(lut => {
      if (lut?.texture3D) {
        lut.texture3D.dispose();
      }
    });
  }
} 