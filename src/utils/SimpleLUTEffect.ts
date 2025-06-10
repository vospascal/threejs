import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { LUTPass } from 'three/addons/postprocessing/LUTPass.js';
import { BokehPass } from 'three/addons/postprocessing/BokehPass.js';
import { LUTCubeLoader } from 'three/addons/loaders/LUTCubeLoader.js';
import { LUT3dlLoader } from 'three/addons/loaders/LUT3dlLoader.js';
import { LUTImageLoader } from 'three/addons/loaders/LUTImageLoader.js';
import type { AppState } from '../types';
import { PositionManager } from './PositionManager';

export class SimpleLUTEffect {
  private composer: EffectComposer;
  private lutPass: LUTPass;
  private bokehPass!: BokehPass;
  private distance = 10;
  private lastMouseX = 0;
  private lastMouseY = 0;
  
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
    // 'curve_bump.CUBE': null,
    // 'generated_lut.CUBE': null,
    // 'hot_lut.CUBE': null
  };

  public params = {
    // LUT controls
    lutEnabled: true,
    lut: 'Bourbon 64.CUBE',
    lutIntensity: 1,
    
    // Bokeh controls
    bokehEnabled: true,
    focus: 10.0,
    aperture: 0.001,
    maxblur: 0.0075,
    nearFocusDistance: 0.01,
    autoFocus: false,
    
    // Advanced bokeh settings
    showFocus: false,
    vignetting: false,
    depthblur: true,
    threshold: 0.5,
    gain: 0,
    bias: 0,
    fringe: 0,
    focalLength: 35,
    noise: false,
    pentagon: false,
    dithering: 0.000
  };

  constructor(private appState: AppState, private positionManager: PositionManager) {
    // Create composer
    this.composer = new EffectComposer(appState.renderer);
    this.composer.setPixelRatio(window.devicePixelRatio);
    this.composer.setSize(window.innerWidth, window.innerHeight);
    
    // Add passes
    this.composer.addPass(new RenderPass(appState.scene, appState.camera));
    
    // Add bokeh pass with camera-relative settings
    this.bokehPass = new BokehPass(appState.scene, appState.camera, {
      focus: this.params.focus,
      aperture: this.params.aperture,
      maxblur: this.params.maxblur
    });
    this.composer.addPass(this.bokehPass);
    
    this.lutPass = new LUTPass();
    this.composer.addPass(this.lutPass);
    
    this.composer.addPass(new OutputPass());

    this.loadLUTs();
    this.setupMouseTracking();
    this.setupWindowResize();
  }

  private loadLUTs(): void {
    Object.keys(this.lutMap).forEach(name => {
      if (/\.CUBE$/i.test(name)) {
        new LUTCubeLoader()
          .load('luts/' + name, (result) => {
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
          .load('luts/' + name, (result) => {
            this.lutMap[name] = result;
            console.log(`Loaded LUT: ${name}`);
          }, undefined, (error) => {
            console.warn(`Failed to load LUT ${name}:`, error);
          });
      }
    });
  }

  private setupMouseTracking(): void {
    // Mouse tracking is now handled by PositionManager
    // We'll track mouse position for focus calculation
    this.lastMouseX = window.innerWidth / 2;
    this.lastMouseY = window.innerHeight / 2;

    const onPointerMove = (event: PointerEvent) => {
      if (event.isPrimary === false) return;

      this.lastMouseX = event.clientX;
      this.lastMouseY = event.clientY;
    };

    document.addEventListener('pointermove', onPointerMove);
  }

  private setupWindowResize(): void {
    window.addEventListener('resize', () => {
      this.composer.setSize(window.innerWidth, window.innerHeight);
    });
  }

  private updateBokehFocus(): void {
    if (!this.params.bokehEnabled || !this.params.autoFocus) {
      return;
    }

    // Use PositionManager's unified raycasting system
    const intersection = this.positionManager.raycastFromScreen(
      this.lastMouseX, 
      this.lastMouseY, 
      this.appState.camera
    );
    
    let targetDistance = 10.0; // Default focus distance
    
    if (intersection) {
      // Calculate distance from camera to intersection point using PositionManager
      targetDistance = this.appState.camera.position.distanceTo(intersection);
    }
    
    // Ensure focus distance is at least the near focus distance
    targetDistance = Math.max(targetDistance, this.params.nearFocusDistance);
    
    // Smooth transition to new focus distance
    this.distance += (targetDistance - this.distance) * 0.05;

    // Update bokeh focus with camera-relative distance
    this.params.focus = this.distance;
    if (this.bokehPass && (this.bokehPass as any).uniforms?.focus) {
      (this.bokehPass as any).uniforms.focus.value = this.distance;
    }
  }

  public render(): void {
    // Update bokeh focus if auto-focus is enabled
    this.updateBokehFocus();

    // Update bokeh pass
    this.bokehPass.enabled = this.params.bokehEnabled;
    const bokehUniforms = (this.bokehPass as any).uniforms;
    if (bokehUniforms) {
      // Basic controls
      if (bokehUniforms.focus) {
        bokehUniforms.focus.value = Math.max(this.params.focus, this.params.nearFocusDistance);
      }
      if (bokehUniforms.aperture) {
        bokehUniforms.aperture.value = this.params.aperture;
      }
      if (bokehUniforms.maxblur) {
        bokehUniforms.maxblur.value = this.params.maxblur;
      }
      
      // Advanced controls
      if (bokehUniforms.showFocus) {
        bokehUniforms.showFocus.value = this.params.showFocus;
      }
      if (bokehUniforms.vignetting) {
        bokehUniforms.vignetting.value = this.params.vignetting;
      }
      if (bokehUniforms.depthblur) {
        bokehUniforms.depthblur.value = this.params.depthblur;
      }
      if (bokehUniforms.threshold) {
        bokehUniforms.threshold.value = this.params.threshold;
      }
      if (bokehUniforms.gain) {
        bokehUniforms.gain.value = this.params.gain;
      }
      if (bokehUniforms.bias) {
        bokehUniforms.bias.value = this.params.bias;
      }
      if (bokehUniforms.fringe) {
        bokehUniforms.fringe.value = this.params.fringe;
      }
      if (bokehUniforms.noise) {
        bokehUniforms.noise.value = this.params.noise;
      }
      if (bokehUniforms.pentagon) {
        bokehUniforms.pentagon.value = this.params.pentagon;
      }
      if (bokehUniforms.dithering) {
        bokehUniforms.dithering.value = this.params.dithering;
      }
    }
    
    // Update camera focal length
    if (this.params.focalLength !== this.appState.camera.getFocalLength()) {
      this.appState.camera.setFocalLength(this.params.focalLength);
    }

    // Update LUT pass
    this.lutPass.enabled = this.params.lutEnabled && Boolean(this.lutMap[this.params.lut]);
    this.lutPass.intensity = this.params.lutIntensity;
    
    if (this.lutMap[this.params.lut]) {
      const lut = this.lutMap[this.params.lut];
      this.lutPass.lut = lut.texture3D;
    }

    this.composer.render();
  }

  public setLUT(lutName: string): void {
    if (lutName in this.lutMap) {
      this.params.lut = lutName;
    }
  }

  public setLUTIntensity(intensity: number): void {
    this.params.lutIntensity = Math.max(0, Math.min(1, intensity));
  }

  public setLUTEnabled(enabled: boolean): void {
    this.params.lutEnabled = enabled;
  }

  // Bokeh controls
  public setBokehEnabled(enabled: boolean): void {
    this.params.bokehEnabled = enabled;
  }

  public setBokehFocus(focus: number): void {
    this.params.focus = Math.max(focus, this.params.nearFocusDistance);
  }

  public setBokehAperture(aperture: number): void {
    this.params.aperture = Math.max(0.001, Math.min(0.01, aperture));
  }

  public setBokehMaxBlur(maxblur: number): void {
    this.params.maxblur = Math.max(0.001, Math.min(0.01, maxblur));
  }

  public setBokehNearFocus(nearFocus: number): void {
    this.params.nearFocusDistance = Math.max(0.1, Math.min(10, nearFocus));
  }

  public setBokehAutoFocus(autoFocus: boolean): void {
    this.params.autoFocus = autoFocus;
  }

  // Advanced bokeh controls
  public setBokehShowFocus(showFocus: boolean): void {
    this.params.showFocus = showFocus;
  }

  public setBokehVignetting(vignetting: boolean): void {
    this.params.vignetting = vignetting;
  }

  public setBokehDepthBlur(depthblur: boolean): void {
    this.params.depthblur = depthblur;
  }

  public setBokehThreshold(threshold: number): void {
    this.params.threshold = Math.max(0, Math.min(1, threshold));
  }

  public setBokehGain(gain: number): void {
    this.params.gain = Math.max(0, Math.min(100, gain));
  }

  public setBokehBias(bias: number): void {
    this.params.bias = Math.max(0, Math.min(3, bias));
  }

  public setBokehFringe(fringe: number): void {
    this.params.fringe = Math.max(0, Math.min(5, fringe));
  }

  public setBokehFocalLength(focalLength: number): void {
    this.params.focalLength = Math.max(16, Math.min(80, focalLength));
  }

  public setBokehNoise(noise: boolean): void {
    this.params.noise = noise;
  }

  public setBokehPentagon(pentagon: boolean): void {
    this.params.pentagon = pentagon;
  }

  public setBokehDithering(dithering: number): void {
    this.params.dithering = Math.max(0, Math.min(0.001, dithering));
  }

  public getAvailableLUTs(): string[] {
    return Object.keys(this.lutMap);
  }

  public dispose(): void {
    this.composer.dispose();
    Object.values(this.lutMap).forEach(lut => {
      if (lut?.texture3D) {
        lut.texture3D.dispose();
      }
    });
  }
} 