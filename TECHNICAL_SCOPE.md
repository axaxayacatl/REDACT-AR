# REDACT — Technical Scope

## Project Summary

REDACT is a minimal object-inspection application for Snap Spectacles, developed with Lens Studio.

The intended workflow connects object detections from a supported perception pipeline to an application-side inspection controller.

## Application Layer

The following capabilities should be considered implemented only when confirmed in the current `REDACT.js` source:

- Inspection state and control logic.
- A defined interface for normalized detection data.
- Handling of incoming detection records where corresponding methods exist.

These capabilities do not establish that live camera perception is connected.

## Not Yet Established by the Script Alone

- General-purpose recognition of arbitrary physical objects.
- A bundled and trained object-detection model.
- A working camera-to-inference pipeline.
- A verified adapter for a specific Lens Studio perception component.
- Reliable 3D positioning or world anchoring of detected objects.
- Successful deployment and runtime validation on physical Spectacles.

These capabilities require additional project configuration, supported APIs, and, where applicable, model assets and hardware testing.

## Dependencies

| Dependency | Purpose | Status |
|---|---|---|
| Lens Studio `5.24.1.26100516` | Authoring, scripting, and preview | Development version reported by the project creator |
| Spectacles-configured Lens Studio project | Target platform and runtime configuration | Must be configured in Lens Studio |
| `REDACT.js` | Application/controller logic | Source repository available |
| Perception component or model | Produces real object detections | Required for live recognition |
| Detection adapter | Converts real outputs to REDACT's input format | Must match the selected component's API |
| Physical Spectacles | Hardware-specific verification | Required for on-device validation |

## Preview Versus Live Functionality

A successful Lens Studio preview does not prove that arbitrary-object recognition works. It confirms only the behavior available in the configured preview environment.

Live inspection requires actual camera-derived detections to reach REDACT through a verified integration.

## Completion Criteria

REDACT can be described as supporting live object inspection when:

1. A supported detector or model is integrated.
2. Real camera-derived detections reach REDACT through a verified adapter.
3. Inspection state updates from those detections without manually supplied sample data.
4. Empty results, errors, and stale detections are handled.
5. The experience is validated in preview and, where required, on physical Spectacles.

## Repository

https://github.com/axaxayacatl/REDACT-AR
