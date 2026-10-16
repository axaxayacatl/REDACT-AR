// REDACT // OBJECT INSPECTION SYSTEM
// Self-contained Lens Studio interface prototype.
// Simulated inspection; no device scan API required.

var root = script.getSceneObject();
var ui = [];
var currentState = "READY";
var scanCount = 0;
var selectedObject = "NO DATA";
var confidence = "--";
var annotations = [];
var active = true;

var RED = new vec4(1.0, 0.055, 0.09, 1.0);
var WHITE = new vec4(0.91, 0.91, 0.94, 1.0);
var GREY = new vec4(0.48, 0.49, 0.54, 1.0);
var BLACK = new vec4(0.025, 0.025, 0.035, 1.0);

// Create a 3D text label parented to the controller.
function makeText(name, value, x, y, z, size, color) {
    var object = global.scene.createSceneObject(name);
    object.setParent(root);

    var transform = object.getTransform();
    transform.setLocalPosition(new vec3(x, y, z));

    var component = object.createComponent("Component.Text");
    component.text = value;
    component.size = size;
    component.textFill.color = color;

    ui.push({
        object: object,
        component: component,
        name: name
    });

    return component;
}

function label(name, value, x, y, size, color) {
    return makeText(name, value, x, y, 0, size, color);
}

function updateText(name, value) {
    for (var i = 0; i < ui.length; i++) {
        if (ui[i].name === name) {
            ui[i].component.text = value;
            return;
        }
    }
}

function line(name, x, y, width) {
    label(name, "-".repeat(width), x, y, 12, RED);
}

function setStatus(state) {
    currentState = state;
    updateText("STATUS", "SYSTEM // " + state);
    print("[REDACT] " + state);
}

function renderIdle() {
    setStatus("READY");
    selectedObject = "NO DATA";
    confidence = "--";
    annotations = [];

    updateText("OBJECT_NAME", "OBJECT // NO DATA");
    updateText("OBJECT_CONFIDENCE", "CONFIDENCE // --");
    updateText("ANNOTATIONS", "ANNOTATIONS\nAWAITING SCAN");
    updateText("SCAN_ACTION", "[ 01 ]  SIMULATE SCAN");
    updateText("RELEASE_ACTION", "[ 02 ]  RELEASE");
}

function simulateScan() {
    if (!active || currentState === "SCANNING") {
        return;
    }

    scanCount++;
    setStatus("SCANNING");

    updateText("SCAN_ACTION", "[ SCANNING... ]");
    updateText("ANNOTATIONS", "PROCESSING ANNOTATIONS\nPLEASE WAIT");

    // Demonstration only: uses a delayed Lens Studio event.
    var event = script.createEvent("DelayedCallbackEvent");
    event.bind(function () {
        if (!active) {
            return;
        }

        var samples = [
            {
                name: "UNKNOWN OBJECT",
                confidence: "94.2%",
                tags: ["OBJECT CLASSIFICATION", "VISUAL SIGNATURE", "SCAN COMPLETE"]
            },
            {
                name: "ARCHITECTURAL SURFACE",
                confidence: "87.6%",
                tags: ["SURFACE DETECTED", "GEOMETRY UNKNOWN", "SCAN COMPLETE"]
            },
            {
                name: "UNCLASSIFIED MATERIAL",
                confidence: "76.3%",
                tags: ["MATERIAL UNKNOWN", "CLASSIFICATION PENDING", "SCAN COMPLETE"]
            }
        ];

        var sample = samples[(scanCount - 1) % samples.length];

        selectedObject = sample.name;
        confidence = sample.confidence;
        annotations = sample.tags;

        updateText("OBJECT_NAME", "OBJECT // " + selectedObject);
        updateText("OBJECT_CONFIDENCE", "CONFIDENCE // " + confidence);
        updateText(
            "ANNOTATIONS",
            "ANNOTATIONS\n" +
            annotations.map(function (item, index) {
                return "0" + (index + 1) + " // " + item;
            }).join("\n")
        );

        updateText("SCAN_ACTION", "[ 01 ]  SCAN AGAIN");
        setStatus("INSPECTION COMPLETE");
    });

    event.reset(1.2);
}

function releaseInspection() {
    if (!active) {
        return;
    }

    renderIdle();
    setStatus("RELEASED");
    updateText("SCAN_ACTION", "[ 01 ]  SIMULATE SCAN");
    updateText("ANNOTATIONS", "ANNOTATIONS\nINSPECTION CLEARED");
}

// --------------------------------------------------
// INTERFACE
// --------------------------------------------------

label("HEADER", "REDACT", -18, 22, 34, RED);
label("SUBTITLE", "OBJECT INSPECTION SYSTEM // 001", -18, 17, 13, WHITE);
label("VERSION", "BUILD 01.00", -18, 13, 11, GREY);

line("RULE_TOP", -18, 10, 35);

label("STATUS", "SYSTEM // INITIALIZING", -18, 6, 15, RED);
label("MODE", "MODE // LOCAL PREVIEW", -18, 2, 12, GREY);

line("RULE_MIDDLE", -18, -2, 35);

label("SECTION_OBJECT", "01 / OBJECT RECORD", -18, -6, 13, RED);
label("OBJECT_NAME", "OBJECT // NO DATA", -18, -11, 15, WHITE);
label("OBJECT_CONFIDENCE", "CONFIDENCE // --", -18, -15, 12, GREY);

line("RULE_LOWER", -18, -18, 35);

label("SECTION_ANNOTATIONS", "02 / ANNOTATIONS", -18, -22, 13, RED);
label("ANNOTATIONS", "ANNOTATIONS\nAWAITING SCAN", -18, -27, 11, WHITE);

label("SCAN_ACTION", "[ 01 ]  SIMULATE SCAN", -18, -37, 14, RED);
label("RELEASE_ACTION", "[ 02 ]  RELEASE", -18, -42, 14, WHITE);

line("RULE_FOOTER", -18, -46, 35);

label("FOOTER", "REDACT // LOCAL TEST ENVIRONMENT", -18, -50, 10, GREY);

setStatus("READY");

script.api.simulateScan = simulateScan;
script.api.releaseInspection = releaseInspection;
script.api.getStatus = function () {
    return {
        state: currentState,
        scanCount: scanCount,
        object: selectedObject,
        confidence: confidence,
        annotations: annotations
    };
};

print("[REDACT] Interface created.");
print("[REDACT] Call script.api.simulateScan() to test.");
