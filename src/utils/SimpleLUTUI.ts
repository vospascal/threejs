import { SimpleLUTEffect } from './SimpleLUTEffect';

export class SimpleLUTUI {
  private gui: any;

  constructor(private lutEffect: SimpleLUTEffect) {
    this.initializeGUI();
  }

  private async initializeGUI(): Promise<void> {
    try {
      const { GUI } = await import('dat.gui');
      
      this.gui = new GUI();
      this.gui.width = 350;
      
      // Bokeh controls
      const bokehFolder = this.gui.addFolder('Depth of Field (Bokeh)');
      
      bokehFolder.add(this.lutEffect.params, 'bokehEnabled')
        .name('Enable Bokeh')
        .onChange((value: boolean) => {
          this.lutEffect.setBokehEnabled(value);
        });
      
      bokehFolder.add(this.lutEffect.params, 'focus', 0, 50)
        .name('Focus Distance')
        .onChange((value: number) => {
          this.lutEffect.setBokehFocus(value);
        });
      
      bokehFolder.add(this.lutEffect.params, 'aperture', 0.001, 0.01)
        .name('Aperture')
        .step(0.0001)
        .onChange((value: number) => {
          this.lutEffect.setBokehAperture(value);
        });
      
      bokehFolder.add(this.lutEffect.params, 'maxblur', 0.001, 0.01)
        .name('Max Blur')
        .step(0.01)
        .onChange((value: number) => {
          this.lutEffect.setBokehMaxBlur(value);
        });
      
      bokehFolder.add(this.lutEffect.params, 'nearFocusDistance', 0.01, 10)
        .name('Near Focus Distance')
        .onChange((value: number) => {
          this.lutEffect.setBokehNearFocus(value);
        });
      
      bokehFolder.add(this.lutEffect.params, 'autoFocus')
        .name('Auto Focus')
        .onChange((value: boolean) => {
          this.lutEffect.setBokehAutoFocus(value);
        });

      // Advanced bokeh controls
      const advancedBokehFolder = bokehFolder.addFolder('Advanced Settings');
      
      advancedBokehFolder.add(this.lutEffect.params, 'showFocus')
        .name('Show Focus Plane')
        .onChange((value: boolean) => {
          this.lutEffect.setBokehShowFocus(value);
        });
      
      advancedBokehFolder.add(this.lutEffect.params, 'vignetting')
        .name('Vignetting')
        .onChange((value: boolean) => {
          this.lutEffect.setBokehVignetting(value);
        });
      
      advancedBokehFolder.add(this.lutEffect.params, 'depthblur')
        .name('Depth Blur')
        .onChange((value: boolean) => {
          this.lutEffect.setBokehDepthBlur(value);
        });
      
      advancedBokehFolder.add(this.lutEffect.params, 'threshold', 0, 1)
        .name('Threshold')
        .step(0.01)
        .onChange((value: number) => {
          this.lutEffect.setBokehThreshold(value);
        });
      
      advancedBokehFolder.add(this.lutEffect.params, 'gain', 0, 100)
        .name('Gain')
        .step(0.1)
        .onChange((value: number) => {
          this.lutEffect.setBokehGain(value);
        });
      
      advancedBokehFolder.add(this.lutEffect.params, 'bias', 0, 3)
        .name('Bias')
        .step(0.01)
        .onChange((value: number) => {
          this.lutEffect.setBokehBias(value);
        });
      
      advancedBokehFolder.add(this.lutEffect.params, 'fringe', 0, 5)
        .name('Fringe')
        .step(0.01)
        .onChange((value: number) => {
          this.lutEffect.setBokehFringe(value);
        });
      
      advancedBokehFolder.add(this.lutEffect.params, 'focalLength', 16, 80)
        .name('Focal Length (mm)')
        .step(1)
        .onChange((value: number) => {
          this.lutEffect.setBokehFocalLength(value);
        });
      
      advancedBokehFolder.add(this.lutEffect.params, 'noise')
        .name('Noise')
        .onChange((value: boolean) => {
          this.lutEffect.setBokehNoise(value);
        });
      
      advancedBokehFolder.add(this.lutEffect.params, 'pentagon')
        .name('Pentagon Bokeh')
        .onChange((value: boolean) => {
          this.lutEffect.setBokehPentagon(value);
        });
      
      advancedBokehFolder.add(this.lutEffect.params, 'dithering', 0, 0.001)
        .name('Dithering')
        .step(0.0001)
        .onChange((value: number) => {
          this.lutEffect.setBokehDithering(value);
        });

      // Start with advanced folder closed
      advancedBokehFolder.close();

      // LUT controls
      const lutFolder = this.gui.addFolder('Color Grading (LUT)');
      
      lutFolder.add(this.lutEffect.params, 'lutEnabled')
        .name('Enable LUT')
        .onChange((value: boolean) => {
          this.lutEffect.setLUTEnabled(value);
        });
      
      lutFolder.add(this.lutEffect.params, 'lut', this.lutEffect.getAvailableLUTs())
        .name('LUT')
        .onChange((value: string) => {
          this.lutEffect.setLUT(value);
        });
      
      lutFolder.add(this.lutEffect.params, 'lutIntensity', 0, 1)
        .name('Intensity')
        .onChange((value: number) => {
          this.lutEffect.setLUTIntensity(value);
        });

    } catch (error) {
      console.warn('dat.GUI not available, using HTML controls');
      this.createFallbackUI();
    }
  }

  private createFallbackUI(): void {
    const container = document.createElement('div');
    container.style.position = 'fixed';
    container.style.top = '10px';
    container.style.left = '10px';
    container.style.background = 'rgba(0, 0, 0, 0.7)';
    container.style.color = 'white';
    container.style.padding = '10px';
    container.style.borderRadius = '5px';
    container.style.fontFamily = 'Arial, sans-serif';
    container.style.fontSize = '12px';
    container.style.zIndex = '1000';

    container.innerHTML = `
      <h3>LUT Controls</h3>
      <label>
        <input type="checkbox" id="lut-enabled" checked> Enable LUT
      </label><br><br>
      <label>
        LUT: 
        <select id="lut-select">
          ${this.lutEffect.getAvailableLUTs().map(lut => 
            `<option value="${lut}" ${lut === this.lutEffect.params.lut ? 'selected' : ''}>${lut}</option>`
          ).join('')}
        </select>
      </label><br><br>
      <label>
        Intensity: <input type="range" id="lut-intensity" min="0" max="1" value="1" step="0.01">
        <span id="intensity-value">1.0</span>
      </label>
    `;

    document.body.appendChild(container);

    // Add event listeners
    const enabledCheckbox = container.querySelector('#lut-enabled') as HTMLInputElement;
    const lutSelect = container.querySelector('#lut-select') as HTMLSelectElement;
    const intensitySlider = container.querySelector('#lut-intensity') as HTMLInputElement;
    const intensityValue = container.querySelector('#intensity-value') as HTMLSpanElement;

    enabledCheckbox?.addEventListener('change', () => {
      this.lutEffect.setLUTEnabled(enabledCheckbox.checked);
    });

    lutSelect?.addEventListener('change', () => {
      this.lutEffect.setLUT(lutSelect.value);
    });

    intensitySlider?.addEventListener('input', () => {
      const value = parseFloat(intensitySlider.value);
      this.lutEffect.setLUTIntensity(value);
      intensityValue.textContent = value.toFixed(1);
    });
  }

  public dispose(): void {
    if (this.gui) {
      this.gui.destroy();
    }
  }
} 