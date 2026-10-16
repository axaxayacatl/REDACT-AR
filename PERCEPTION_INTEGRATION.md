# REDACT — Perception Integration Interface

## Purpose

This document defines the data interface between an actual object-detection system and REDACT's inspection logic.

This interface does not imply that a detector or model is already integrated.

## Data Flow

1. A supported perception component processes camera input.
2. The component produces object detections.
3. An adapter converts the detector's output to REDACT's normalized format.
4. REDACT receives the normalized records and updates its inspection state.

The adapter must use the selected component's real, documented API.

## Normalized Detection Schema

Each detection should follow this structure:

```javascript
{
    label: "chair",
    confidence: 0.93,
    bounds: {
        x: 0.25,
        y: 0.20,
        width: 0.30,
        height: 0.40
    },
    sourceId: "detection-01"
}
```

### Fields

- `label` — Required human-readable class label.
- `confidence` — Optional confidence score between `0` and `1`.
- `bounds` — Optional normalized image-space rectangle.
- `sourceId` — Optional identifier supplied by the detector or adapter.

Only include fields actually provided by the perception system. Do not invent confidence scores, coordinates, or object identities.

## Application Interface

The proposed entry point is an array of normalized detections:

```javascript
script.api.receiveDetections(normalizedDetections);
```

This call is valid only if the current `REDACT.js` explicitly exposes `receiveDetections` through `script.api`. Verify the actual source before connecting the adapter. If the implemented method differs, use that method instead.

## Adapter Requirements

- Map the detector's class label to `label`.
- Normalize confidence scores only when the source provides a meaningful score.
- Convert bounding boxes to normalized image coordinates when source coordinates are available.
- Send an empty array when there are no current detections.
- Prevent stale detections from being presented as current.
- Handle detector errors and lifecycle changes.
- Respect the selected component's camera permissions and runtime requirements.
- Never use fabricated detection records as a substitute for live perception.

## Scope Boundary

This interface does not provide a detector, select a model, or establish that arbitrary-object recognition is built into Lens Studio. The concrete adapter depends on the perception component chosen for the project.
