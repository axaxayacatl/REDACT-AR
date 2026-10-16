"use strict";

// REDACT // OBJECT INSPECTION SYSTEM
// Lens Studio / Snap Spectacles

// @input Asset.ScanModule scanModule
// @input Asset.Texture targetTexture
// @input Component.Text statusText
// @input Component.Text resultText
// @input Component.Text confidenceText
// @input SceneObject inspectionPanel

var REDACT = {
    version: "1.0.0",
    state: "INITIALIZING",
    busy: false,
    requestId: 0,
    scanCount: 0,
    results: [],
    inspection: null,
    lastError: null
};

function log(event, data) {
    var message = "[REDACT] " + event;
    if (data !== undefined) {
        try {
            message += " " + JSON.stringify(data);
        } catch (e) {
            message += " " + String(data);
        }
    }
    print(message);
}

function setText(component, value) {
    if (component) {
        try {
            component.text = String(value);
        } catch (e) {
            log("UI_ERROR", String(e));
        }
    }
}

function showPanel(visible) {
    if (script.inspectionPanel) {
        script.inspectionPanel.enabled = visible;
    }
}

function render() {
    setText(script.statusText, "REDACT // " + REDACT.state);

    if (REDACT.inspection) {
        var item = REDACT.inspection;
        var lines = [];

        for (var i = 0; i < item.annotations.length; i++) {
            var annotation = item.annotations[i];
            var line = (i + 1) + ". " + annotation.name;

            if (annotation.confidence !== null) {
                line += " // " + confidenceText(annotation.confidence);
            }

            lines.push(line);
        }

        setText(
            script.resultText,
            "OBJECT INSPECTION\n" +
            item.name +
            "\n\nANNOTATIONS\n" +
            lines.join("\n")
        );

        setText(
            script.confidenceText,
            "CONFIDENCE // " +
            (item.confidence === null
                ? "UNAVAILABLE"
                : confidenceText(item.confidence))
        );

        showPanel(true);
        return;
    }

    var messages = {
        INITIALIZING: "INITIALIZING SYSTEM",
        CONFIGURATION_REQUIRED: "SCAN MODULE UNAVAILABLE",
        READY: "SYSTEM READY\n\nLONG PRESS TO SCAN",
        SCANNING: "SCANNING OBJECTS",
        NO_RESULTS: "NO OBJECTS RECOGNIZED\n\nREPOSITION AND RETRY",
        SCAN_FAILED: "SCAN FAILED\n\nRETRY WHEN READY",
        ERROR: "SYSTEM ERROR",
        RELEASED: "INSPECTION RELEASED\n\nSYSTEM READY"
    };

    setText(
        script.resultText,
        messages[REDACT.state] || "SYSTEM READY"
    );

    setText(script.confidenceText, "CONFIDENCE // --");
    showPanel(false);
}

function setState(state) {
    REDACT.state = state;
    render();
    log("STATE", state);
}

function confidenceText(value) {
    if (typeof value !== "number" || !isFinite(value)) {
        return "UNAVAILABLE";
    }

    var percentage = value <= 1 ? value * 100 : value;
    return (Math.round(percentage * 10) / 10) + "%";
}

function fail(message, requestId) {
    if (
        requestId !== undefined &&
        requestId !== REDACT.requestId
    ) {
        return;
    }

    REDACT.busy = false;
    REDACT.lastError = String(message);
    setState("SCAN_FAILED");
    log("ERROR", REDACT.lastError);
}

function scan() {
    if (REDACT.busy) {
        return;
    }

    if (!script.scanModule) {
        REDACT.lastError = "ScanModule is not assigned.";
        setState("CONFIGURATION_REQUIRED");
        return;
    }

    var id = ++REDACT.requestId;

    REDACT.busy = true;
    REDACT.lastError = null;
    REDACT.results = [];
    REDACT.inspection = null;

    setState("SCANNING");
    log("SCAN_STARTED", id);

    try {
        if (script.targetTexture) {
            script.scanModule.scanTarget = script.targetTexture;
        }

        script.scanModule.scan(
            [ScanModule.Contexts.Objects],

            function (response) {
                if (id !== REDACT.requestId) {
                    return;
                }

                var data;

                try {
                    data = typeof response === "string"
                        ? JSON.parse(response)
                        : response;
                } catch (error) {
                    fail("Invalid scan response: " + error, id);
                    return;
                }

                var context = data &&
                    data.annotations &&
                    data.annotations[ScanModule.Contexts.Objects];

                var annotations = context && context.annotations;

                REDACT.busy = false;

                if (!Array.isArray(annotations) || !annotations.length) {
                    REDACT.results = [];
                    REDACT.inspection = null;
                    setState("NO_RESULTS");
                    return;
                }

                REDACT.results = annotations.map(function (item) {
                    return {
                        name: item && typeof item.name === "string"
                            ? item.name
                            : "Unknown object",

                        confidence: item &&
                            typeof item.confidence === "number" &&
                            isFinite(item.confidence)
                                ? item.confidence
                                : null
                    };
                });

                REDACT.results.sort(function (a, b) {
                    if (a.confidence === null) return 1;
                    if (b.confidence === null) return -1;
                    return b.confidence - a.confidence;
                });

                REDACT.scanCount++;

                REDACT.inspection = {
                    id: "REDACT-" + REDACT.scanCount,
                    name: REDACT.results[0].name,
                    confidence: REDACT.results[0].confidence,
                    annotations: REDACT.results,
                    timestamp: new Date().toISOString()
                };

                setState("INSPECTING");
                log("INSPECTION", REDACT.inspection);
            },

            function (reason) {
                fail(reason || "Scan failed.", id);
            }
        );
    } catch (error) {
        fail(error, id);
    }
}

function inspect() {
    if (REDACT.busy || !REDACT.inspection) {
        return null;
    }

    render();
    return REDACT.inspection;
}

function release() {
    REDACT.requestId++;
    REDACT.busy = false;
    REDACT.results = [];
    REDACT.inspection = null;
    REDACT.lastError = null;

    setState("RELEASED");
    log("INSPECTION_RELEASED");
}

function reset() {
    REDACT.requestId++;
    REDACT.busy = false;
    REDACT.results = [];
    REDACT.inspection = null;
    REDACT.lastError = null;

    setState(script.scanModule ? "READY" : "CONFIGURATION_REQUIRED");
}

function getStatus() {
    return {
        version: REDACT.version,
        state: REDACT.state,
        busy: REDACT.busy,
        scanCount: REDACT.scanCount,
        results: REDACT.results,
        inspection: REDACT.inspection,
        lastError: REDACT.lastError
    };
}

script.api.scan = scan;
script.api.inspect = inspect;
script.api.release = release;
script.api.clearInspection = release;
script.api.reset = reset;
script.api.getStatus = getStatus;

var startEvent = script.createEvent("OnStartEvent");

startEvent.bind(function () {
    if (!script.scanModule) {
        setState("CONFIGURATION_REQUIRED");
        return;
    }

    setState("READY");
    log("READY", REDACT.version);
});

var scanEvent = script.createEvent("LongPressStartEvent");

scanEvent.bind(function () {
    scan();
});
