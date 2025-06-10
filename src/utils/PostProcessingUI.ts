import { PostProcessing } from '../components/PostProcessing';
import type { BokehSettings, LUTSettings } from '../types';

export class PostProcessingUI {
  private postProcessing: PostProcessing;
  private gui: any;
  private bokehFolder: any;
  private lutFolder: any;
  private effectController: any;

  constructor(postProcessing: PostProcessing) {
    this.postProcessing = postProcessing;
    this.initializeGUI();
  }

  private async initializeGUI(): Promise<void> {
    try {
      // Dynamically import dat.GUI to avoid issues with module resolution
      const { GUI } = await import('dat.gui');
      
      this.gui = new GUI();
      this.gui.width = 350;

      // Get current settings
      const bokehSettings = this.postProcessing.getBokehSettings();
      const lutSettings = this.postProcessing.getLUTSettings();

      // Create effect controller object for dat.GUI
      this.effectController = {
        // Post-processing master controls
        postProcessingEnabled: true,
        
        // Bokeh settings
        bokehEnabled: bokehSettings.enabled,
        focus: bokehSettings.focus,
        aperture: bokehSettings.aperture,
        maxblur: bokehSettings.maxblur,
        nearFocusDistance: bokehSettings.nearFocusDistance,
        showFocus: bokehSettings.showFocus,
        manualdof: bokehSettings.manualdof,
        vignetting: bokehSettings.vignetting,
        depthblur: bokehSettings.depthblur,
        threshold: bokehSettings.threshold,
        gain: bokehSettings.gain,
        bias: bokehSettings.bias,
        fringe: bokehSettings.fringe,
        focalLength: bokehSettings.focalLength,
        noise: bokehSettings.noise,
        pentagon: bokehSettings.pentagon,
        dithering: bokehSettings.dithering,

        // LUT settings
        lutEnabled: lutSettings.enabled,
        lut: lutSettings.lut,
        lutIntensity: lutSettings.intensity
      };

      this.createPostProcessingControls();
      this.createBokehControls();
      this.createLUTControls();

    } catch (error) {
      console.warn('dat.GUI not available, using alternative UI approach');
      this.createFallbackUI();
    }
  }

  private createPostProcessingControls(): void {
    // Master post-processing toggle
    this.gui.add(this.effectController, 'postProcessingEnabled')
      .name('Post-Processing')
      .onChange((value: boolean) => {
        this.postProcessing.setPostProcessingEnabled(value);
      });
  }

  private createBokehControls(): void {
    this.bokehFolder = this.gui.addFolder('Depth of Field (Bokeh)');

    // Enable/disable bokeh
    this.bokehFolder.add(this.effectController, 'bokehEnabled')
      .name('Enable Bokeh')
      .onChange(this.updateBokehSettings.bind(this));

    // Focus controls
    this.bokehFolder.add(this.effectController, 'focus', 0.0, 200.0)
      .name('Focus Distance')
      .listen()
      .onChange(this.updateBokehSettings.bind(this));

    this.bokehFolder.add(this.effectController, 'aperture', 0.001, 0.2)
      .name('Aperture')
      .onChange(this.updateBokehSettings.bind(this));

    this.bokehFolder.add(this.effectController, 'maxblur', 0.001, 0.01)
      .name('Max Blur')
      .onChange(this.updateBokehSettings.bind(this));

    this.bokehFolder.add(this.effectController, 'nearFocusDistance', 1.0, 20.0)
      .name('Near Focus Distance')
      .onChange(this.updateBokehSettings.bind(this));

    // Bokeh options
    this.bokehFolder.add(this.effectController, 'showFocus')
      .name('Show Focus')
      .onChange(this.updateBokehSettings.bind(this));

    this.bokehFolder.add(this.effectController, 'manualdof')
      .name('Manual DOF')
      .onChange(this.updateBokehSettings.bind(this));

    this.bokehFolder.add(this.effectController, 'vignetting')
      .name('Vignetting')
      .onChange(this.updateBokehSettings.bind(this));

    this.bokehFolder.add(this.effectController, 'depthblur')
      .name('Depth Blur')
      .onChange(this.updateBokehSettings.bind(this));

    // Advanced bokeh controls
    const advancedFolder = this.bokehFolder.addFolder('Advanced');
    
    advancedFolder.add(this.effectController, 'threshold', 0, 1)
      .name('Threshold')
      .onChange(this.updateBokehSettings.bind(this));

    advancedFolder.add(this.effectController, 'gain', 0, 100)
      .name('Gain')
      .onChange(this.updateBokehSettings.bind(this));

    advancedFolder.add(this.effectController, 'bias', 0, 3)
      .name('Bias')
      .onChange(this.updateBokehSettings.bind(this));

    advancedFolder.add(this.effectController, 'fringe', 0, 5)
      .name('Fringe')
      .onChange(this.updateBokehSettings.bind(this));

    advancedFolder.add(this.effectController, 'focalLength', 16, 80)
      .name('Focal Length')
      .onChange(this.updateBokehSettings.bind(this));

    advancedFolder.add(this.effectController, 'noise')
      .name('Noise')
      .onChange(this.updateBokehSettings.bind(this));

    advancedFolder.add(this.effectController, 'pentagon')
      .name('Pentagon Bokeh')
      .onChange(this.updateBokehSettings.bind(this));

    advancedFolder.add(this.effectController, 'dithering', 0, 0.001)
      .name('Dithering')
      .onChange(this.updateBokehSettings.bind(this));

    // Start with bokeh folder closed
    this.bokehFolder.close();
  }

  private createLUTControls(): void {
    this.lutFolder = this.gui.addFolder('Color Grading (LUT)');

    // Enable/disable LUT
    this.lutFolder.add(this.effectController, 'lutEnabled')
      .name('Enable LUT')
      .onChange(this.updateLUTSettings.bind(this));

    // LUT selection
    const availableLUTs = this.postProcessing.getAvailableLUTs();
    this.lutFolder.add(this.effectController, 'lut', availableLUTs)
      .name('LUT')
      .onChange(this.updateLUTSettings.bind(this));

    // LUT intensity
    this.lutFolder.add(this.effectController, 'lutIntensity', 0, 1)
      .name('Intensity')
      .onChange(this.updateLUTSettings.bind(this));

    // Start with LUT folder open
    this.lutFolder.open();
  }

  private updateBokehSettings(): void {
    const settings: Partial<BokehSettings> = {
      enabled: this.effectController.bokehEnabled,
      focus: this.effectController.focus,
      aperture: this.effectController.aperture,
      maxblur: this.effectController.maxblur,
      nearFocusDistance: this.effectController.nearFocusDistance,
      showFocus: this.effectController.showFocus,
      manualdof: this.effectController.manualdof,
      vignetting: this.effectController.vignetting,
      depthblur: this.effectController.depthblur,
      threshold: this.effectController.threshold,
      gain: this.effectController.gain,
      bias: this.effectController.bias,
      fringe: this.effectController.fringe,
      focalLength: this.effectController.focalLength,
      noise: this.effectController.noise,
      pentagon: this.effectController.pentagon,
      dithering: this.effectController.dithering
    };

    this.postProcessing.setBokehSettings(settings);
  }

  private updateLUTSettings(): void {
    const settings: Partial<LUTSettings> = {
      enabled: this.effectController.lutEnabled,
      lut: this.effectController.lut,
      intensity: this.effectController.lutIntensity
    };

    this.postProcessing.setLUTSettings(settings);
  }

  private createFallbackUI(): void {
    // Create simple HTML controls if dat.GUI is not available
    const container = document.createElement('div');
    container.style.position = 'fixed';
    container.style.top = '10px';
    container.style.right = '10px';
    container.style.background = 'rgba(0, 0, 0, 0.7)';
    container.style.color = 'white';
    container.style.padding = '10px';
    container.style.borderRadius = '5px';
    container.style.fontFamily = 'Arial, sans-serif';
    container.style.fontSize = '12px';
    container.style.zIndex = '1000';

    container.innerHTML = `
      <h3>Post-Processing Controls</h3>
      <label>
        <input type="checkbox" id="pp-enabled" checked> Post-Processing
      </label><br>
      <label>
        <input type="checkbox" id="bokeh-enabled" checked> Bokeh Effect
      </label><br>
      <label>
        <input type="checkbox" id="lut-enabled" checked> Color Grading
      </label><br>
      <label>
        Focus: <input type="range" id="focus" min="0" max="200" value="50" step="0.1">
      </label><br>
      <label>
        Aperture: <input type="range" id="aperture" min="0.001" max="0.2" value="0.025" step="0.001">
      </label><br>
      <label>
        Near Focus: <input type="range" id="near-focus" min="1" max="20" value="5" step="0.1">
      </label><br>
      <label>
        LUT Intensity: <input type="range" id="lut-intensity" min="0" max="1" value="1" step="0.1">
      </label>
    `;

    document.body.appendChild(container);

    // Add event listeners for fallback controls
    this.setupFallbackEventListeners(container);
  }

  private setupFallbackEventListeners(container: HTMLElement): void {
    container.querySelector('#pp-enabled')?.addEventListener('change', (e) => {
      const target = e.target as HTMLInputElement;
      this.postProcessing.setPostProcessingEnabled(target.checked);
    });

    container.querySelector('#bokeh-enabled')?.addEventListener('change', (e) => {
      const target = e.target as HTMLInputElement;
      this.postProcessing.setBokehSettings({ enabled: target.checked });
    });

    container.querySelector('#lut-enabled')?.addEventListener('change', (e) => {
      const target = e.target as HTMLInputElement;
      this.postProcessing.setLUTSettings({ enabled: target.checked });
    });

    container.querySelector('#focus')?.addEventListener('input', (e) => {
      const target = e.target as HTMLInputElement;
      this.postProcessing.setBokehSettings({ focus: parseFloat(target.value) });
    });

    container.querySelector('#aperture')?.addEventListener('input', (e) => {
      const target = e.target as HTMLInputElement;
      this.postProcessing.setBokehSettings({ aperture: parseFloat(target.value) });
    });

    container.querySelector('#near-focus')?.addEventListener('input', (e) => {
      const target = e.target as HTMLInputElement;
      this.postProcessing.setBokehSettings({ nearFocusDistance: parseFloat(target.value) });
    });

    container.querySelector('#lut-intensity')?.addEventListener('input', (e) => {
      const target = e.target as HTMLInputElement;
      this.postProcessing.setLUTSettings({ intensity: parseFloat(target.value) });
    });
  }

  public dispose(): void {
    if (this.gui) {
      this.gui.destroy();
    }
  }
} 