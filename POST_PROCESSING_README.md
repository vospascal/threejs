# Post-Processing Effects

This Three.js VR application now includes advanced post-processing effects:

## Features

### 1. Bokeh Depth-of-Field Effect
- **Realistic depth-of-field blur** with customizable focus distance
- **Auto-focus mode** that follows mouse cursor
- **Manual focus mode** for precise control
- **Aperture control** for blur intensity
- **Advanced options** including vignetting, noise, and pentagon bokeh shapes

### 2. 3D LUT Color Grading
- **Color lookup table support** for cinematic color grading
- **Multiple LUT format support** (.cube, .3dl, and image-based LUTs)
- **Intensity control** for blending between original and graded colors
- **Real-time switching** between different LUTs

## Controls

The post-processing UI appears as a control panel on the right side of the screen with the following sections:

### Master Controls
- **Post-Processing**: Enable/disable all post-processing effects

### Depth of Field (Bokeh)
- **Enable Bokeh**: Toggle the depth-of-field effect
- **Focus Distance**: Set the focus point (0-200)
- **Aperture**: Control blur intensity (0.001-0.2)
- **Max Blur**: Maximum blur amount (0-5)
- **Manual DOF**: Switch between auto-focus and manual focus modes
- **Show Focus**: Visualize the focus plane
- **Advanced Settings**: Additional controls for fine-tuning

### Color Grading (LUT)
- **Enable LUT**: Toggle color grading
- **LUT**: Select from available LUT files
- **Intensity**: Blend between original and graded colors (0-1)

## Adding Custom LUTs

To add your own LUT files:

1. Place LUT files in the `public/luts/` directory
2. Supported formats:
   - `.cube` files (Adobe/DaVinci Resolve format)
   - `.3dl` files (Autodesk format)
   - `.png` files (Image-based LUTs)

3. Update the `lutMap` in `src/components/PostProcessing.ts` to include your new LUTs:

```typescript
private lutMap: { [key: string]: any } = {
  'None': null,
  'Neutral': null,
  'Your Custom LUT.cube': null,
  // Add more LUTs here
};
```

4. The system will automatically attempt to load the LUTs on startup

## Technical Details

### Bokeh Implementation
- Uses Three.js BokehPass with custom depth rendering
- Supports both automatic focus tracking via raycasting
- Manual focus control for precise artistic control
- Optimized for VR with proper depth buffer handling

### LUT Implementation
- Uses Three.js LUTPass for hardware-accelerated color grading
- Supports 3D texture lookup for accurate color transformation
- Real-time intensity blending for smooth transitions

### Performance
- Post-processing is GPU-accelerated using WebGL shaders
- Render targets are automatically resized on window resize
- Effects can be individually enabled/disabled for performance tuning

## VR Compatibility

Both effects work seamlessly in VR mode:
- Bokeh effect maintains proper depth perception
- Color grading enhances the immersive experience
- UI controls remain accessible in both desktop and VR modes

## Keyboard Shortcuts

- **P**: Toggle post-processing on/off (when debug mode is enabled)
- **B**: Toggle bokeh effect (when debug mode is enabled)
- **L**: Toggle LUT effect (when debug mode is enabled)

## Troubleshooting

### Common Issues

1. **LUTs not loading**: Ensure LUT files are in the correct format and placed in `public/luts/`
2. **Performance issues**: Try reducing the bokeh max blur value or disabling effects
3. **Focus not working**: Check that objects in the scene have proper geometry for raycasting

### Browser Compatibility

- Requires WebGL 2.0 support
- Best performance on modern browsers (Chrome, Firefox, Safari, Edge)
- VR requires WebXR support

## Example LUT Sources

Free LUT resources:
- [RocketStock Free LUTs](https://www.rocketstock.com/free-after-effects-templates/35-free-luts-for-color-grading-videos/)
- [FreePresets.com](https://www.freepresets.com/product/free-luts-cinematic/)
- [Lutify.me Free LUTs](https://lutify.me/free-luts/)

Remember to respect licensing terms when using third-party LUTs. 