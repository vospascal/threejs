# LUT Setup Instructions

Your Three.js VR application now has LUT (Color Grading) support! However, the LUT files need to be downloaded separately.

## Quick Setup

### 1. Create the LUTs directory
```bash
mkdir -p public/luts
```

### 2. Download Sample LUT Files

You can get LUT files from several sources:

#### Free LUT Sources:
- **RocketStock**: https://www.rocketstock.com/free-after-effects-templates/35-free-luts-for-color-grading-videos/
- **FreePresets.com**: https://www.freepresets.com/product/free-luts-cinematic/
- **Lutify.me**: https://lutify.me/free-luts/

#### Three.js Official Examples:
The Three.js repository has sample LUT files. You can download them from:
https://github.com/mrdoob/three.js/tree/dev/examples/luts

### 3. Expected File Names

Place these files in `public/luts/`:
- `Bourbon 64.CUBE`
- `Chemical 168.CUBE`
- `Clayton 33.CUBE`
- `Cubicle 99.CUBE`
- `Remy 24.CUBE`
- `Presetpro-Cinematic.3dl`
- `NeutralLUT.png`
- `B&WLUT.png`
- `NightLUT.png`

### 4. Quick Download (for testing)

If you have curl or wget, you can quickly download some sample LUTs:

```bash
# Download from Three.js GitHub repository
cd public/luts
curl -O https://raw.githubusercontent.com/mrdoob/three.js/dev/examples/luts/Bourbon%2064.CUBE
curl -O https://raw.githubusercontent.com/mrdoob/three.js/dev/examples/luts/Chemical%20168.CUBE
curl -O https://raw.githubusercontent.com/mrdoob/three.js/dev/examples/luts/Clayton%2033.CUBE
```

## How It Works

Once you have LUT files in place:

1. **Start the application**: `pnpm run dev`
2. **Use the LUT controls**: A control panel will appear on the left side
3. **Select different LUTs**: Choose from the dropdown menu
4. **Adjust intensity**: Use the slider to blend between original and graded colors
5. **Toggle on/off**: Enable/disable the color grading effect

## Supported Formats

- **.cube files**: Adobe/DaVinci Resolve format
- **.3dl files**: Autodesk format  
- **.png files**: Image-based LUTs

## VR Support

The LUT effects work seamlessly in both desktop and VR modes, providing cinematic color grading for your VR experience.

## Troubleshooting

**LUTs not loading?**
- Check the browser console for error messages
- Ensure file names match exactly (case-sensitive)
- Verify files are in the `public/luts/` directory
- Check file formats are supported

**Performance issues?**
- Reduce LUT intensity
- Disable the effect temporarily
- Use smaller LUT files if available 