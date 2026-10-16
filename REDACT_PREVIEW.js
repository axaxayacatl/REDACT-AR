```javascript
"use strict";

// REDACT // DESKTOP PREVIEW INTERFACE
// Visual prototype — no device scanning required.

var root = script.getSceneObject();

function makeText(name, value, position, size, color) {
    var object = global.scene.createSceneObject(name);
    object.setParent(root);

    var transform = object.getTransform();
    transform.setLocalPosition(position);

    var text = object.createComponent("Component.Text");
    text.text = value;
    text.size = size;
    text.textFill.color = color;

    return text;
}

var white = new vec4(0.92, 0.92, 0.95, 1);
var red = new vec4(1, 0.08, 0.12, 1);
var grey = new vec4(0.55, 0.55, 0.60, 1);

makeText(
    "REDACT_TITLE",
    "REDACT // OBJECT INSPECTION",
    new vec3(0, 15, 0),
    28,
    red
);

makeText(
    "REDACT_STATUS",
    "SYSTEM // ONLINE",
    new vec3(0, 8, 0),
    20,
    white
);

makeText(
    "REDACT_SCAN",
    "[ SCAN ]",
    new vec3(0, 1, 0),
    24,
    red
);

makeText(
    "REDACT_RESULT",
    "OBJECT // AWAITING INPUT",
    new vec3(0, -6, 0),
    18,
    white
);

makeText(
    "REDACT_FOOTER",
    "INSPECTION SYSTEM // 001",
    new vec3(0, -13, 0),
    14,
    grey
);

print("[REDACT] Preview interface initialized.");
```
