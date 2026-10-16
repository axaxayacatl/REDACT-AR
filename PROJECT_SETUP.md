# REDACT — Lens Studio Project Setup

## Requirements

- Snap Lens Studio `5.24.1.26100516`
- `REDACT.js` from https://github.com/axaxayacatl/REDACT-AR
- A Lens Studio project configured for the intended Spectacles target

## Installation

1. Open Lens Studio.
2. Create or open a project configured for Spectacles. Use an available Spectacles starter template if appropriate.
3. In the Asset Browser, import or create a script asset named `REDACT.js`.
4. Paste the current JavaScript source from the REDACT repository into the script asset.
5. Add a Scene Object to the scene.
6. Attach a Script component to that object.
7. Assign `REDACT.js` to the Script component.
8. Check the Inspector and Console for errors.
9. Use Lens Studio Preview to verify that the scene and script load.
10. Save the project in Lens Studio.

## Preview Limitations

A successful preview confirms only that the configured scene and supported script functionality run. It does not confirm that live object detection is working.

`REDACT.js` does not automatically provide a trained general-purpose object-recognition model. Live inspection requires a supported perception component or model and a connection from its actual output to REDACT's detection interface.

## Troubleshooting

- **Script not running:** Check that the Script component is enabled and references the correct script asset.
- **Compile errors:** Review the Lens Studio Console and verify API compatibility with the selected project template.
- **No objects detected:** Confirm that a real perception pipeline is installed and connected.
- **Preview differs from hardware:** Verify hardware-specific capabilities on physical Spectacles.

## Repository

https://github.com/axaxayacatl/REDACT-AR
