import { useEffect, useRef, useState } from "react";
import { LabelCheck } from "./ui/LabelCheck.jsx";
import { resultSubline } from "../domain/search.js";
import { lookupBarcode as lookupFoodBarcode } from "../usda.js";
export default function BarcodeScanner({ onAdd, onClose }) {
  const [barcode, setBarcode] = useState("");
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(false);
  const [cameraActive, setCameraActive] = useState(false);
  const [capturedImage, setCapturedImage] = useState("");
  const [error, setError] = useState("");
  // Camera problems show under the camera buttons, lookup problems under
  // the barcode field (6.15).
  const [cameraError, setCameraError] = useState("");
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const detectorRef = useRef(null);
  const scanTimerRef = useRef(null);
  const cameraRunningRef = useRef(false);
  const decodingRef = useRef(false);
  const lookupRef = useRef(null);

  function stopCamera() {
    cameraRunningRef.current = false;
    window.clearTimeout(scanTimerRef.current);
    scanTimerRef.current = null;
    const stream = streamRef.current || videoRef.current?.srcObject;
    if (stream?.getTracks) stream.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    setCameraActive(false);
  }

  useEffect(
    () => () => {
      lookupRef.current?.abort();
      cameraRunningRef.current = false;
      window.clearTimeout(scanTimerRef.current);
      const stream = streamRef.current || videoRef.current?.srcObject;
      if (stream?.getTracks)
        stream.getTracks().forEach((track) => track.stop());
    },
    [],
  );

  async function getDetector() {
    if (!detectorRef.current) {
      const { BarcodeDetector } = await import("barcode-detector/ponyfill");
      detectorRef.current = new BarcodeDetector({
        formats: ["ean_8", "ean_13", "upc_a", "upc_e", "code_128"],
      });
    }
    return detectorRef.current;
  }

  async function scanCameraFrame() {
    if (
      !cameraRunningRef.current ||
      decodingRef.current ||
      !videoRef.current?.videoWidth
    )
      return;
    decodingRef.current = true;
    try {
      const results = await (await getDetector()).detect(videoRef.current);
      const detectedBarcode = results.find((result) =>
        /^\d{8,14}$/.test(result.rawValue),
      )?.rawValue;
      if (detectedBarcode) {
        stopCamera();
        await lookupBarcode(detectedBarcode);
        return;
      }
    } catch {
      // A frame without a readable barcode is expected while the camera is moving.
    } finally {
      decodingRef.current = false;
    }
    if (cameraRunningRef.current) {
      scanTimerRef.current = window.setTimeout(scanCameraFrame, 220);
    }
  }

  async function lookupBarcode(value) {
    lookupRef.current?.abort();
    const controller = new AbortController();
    lookupRef.current = controller;
    const cleanBarcode = String(value).replace(/\D/g, "");
    if (cleanBarcode.length < 8 || cleanBarcode.length > 14) {
      setError("Enter a valid 8–14 digit product barcode.");
      return;
    }

    setBarcode(cleanBarcode);
    setProduct(null);
    setError("");
    setLoading(true);
    try {
      const next = await lookupFoodBarcode(cleanBarcode, controller.signal);
      if (!controller.signal.aborted) setProduct(next);
    } catch (lookupError) {
      if (!controller.signal.aborted)
        setError(lookupError.message || "We could not look up that barcode.");
    } finally {
      if (!controller.signal.aborted) setLoading(false);
    }
  }

  async function startCamera() {
    setError("");
    setCameraError("");
    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraError("Camera is off. Type the barcode number instead.");
      return;
    }

    try {
      setCapturedImage("");
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: "environment" },
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
        audio: false,
      });
      streamRef.current = stream;
      stream.getTracks().forEach((track) => {
        track.onended = stopCamera;
      });
      videoRef.current.srcObject = stream;
      await videoRef.current.play();
      cameraRunningRef.current = true;
      setCameraActive(true);
      scanTimerRef.current = window.setTimeout(scanCameraFrame, 100);
    } catch {
      stopCamera();
      setCameraError("Camera is off. Type the barcode number instead.");
    }
  }

  async function capturePhoto() {
    const video = videoRef.current;
    if (!cameraActive || !video?.videoWidth || !video?.videoHeight) {
      setError(
        "Start the camera and wait for the preview before taking a photo.",
      );
      return;
    }

    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext("2d").drawImage(video, 0, 0, canvas.width, canvas.height);
    setCapturedImage(canvas.toDataURL("image/jpeg", 0.92));
    stopCamera();
    setProduct(null);
    setError("");
    setLoading(true);
    try {
      const results = await (await getDetector()).detect(canvas);
      const detectedBarcode = results.find((result) =>
        /^\d{8,14}$/.test(result.rawValue),
      )?.rawValue;
      if (!detectedBarcode) throw new Error("No retail barcode found.");
      await lookupBarcode(detectedBarcode);
    } catch {
      setError(
        "No product barcode was found in the captured frame. Keep the full barcode sharp, level, and inside the guide.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="scanner-card">
      <h3>Scan or enter a barcode</h3>
      {/* The frame shows only with a live camera or a captured photo. */}
      <div
        className={`camera-frame${cameraActive ? " active" : ""}${capturedImage ? " has-capture" : ""}`}
      >
        <video ref={videoRef} muted playsInline />
        {cameraActive && (
          <div className="scan-guide" aria-hidden="true">
            <span />
          </div>
        )}
        {capturedImage && (
          <img
            className="captured-frame"
            src={capturedImage}
            alt="Captured barcode frame"
          />
        )}
      </div>
      <div className="button-row">
        <button onClick={cameraActive ? stopCamera : startCamera}>
          {cameraActive ? "Stop camera" : "Use camera"}
        </button>
        <button onClick={capturePhoto} disabled={!cameraActive || loading}>
          Take photo
        </button>
      </div>
      {cameraError && (
        <p className="inline-error" role="alert">
          <span>{cameraError}</span>
        </p>
      )}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          lookupBarcode(barcode);
        }}
      >
        <label>
          Barcode number
          <input
            inputMode="numeric"
            maxLength={14}
            value={barcode}
            onChange={(e) => {
              lookupRef.current?.abort();
              setLoading(false);
              setBarcode(e.target.value.replace(/\D/g, ""));
              setProduct(null);
            }}
          />
        </label>
        <button disabled={loading}>Look up product</button>
      </form>
      {error && (
        <p className="inline-error" role="alert">
          <span>{error}</span>
        </p>
      )}
      {loading && <p role="status">Looking up product…</p>}
      {product && (
        <div className="product-result">
          <h3>{product.name}</h3>
          <p>{resultSubline(product)}</p>
          <LabelCheck food={product} />
          <button
            className="primary"
            onClick={() => {
              stopCamera();
              onAdd(product);
            }}
          >
            Use this food
          </button>
        </div>
      )}
      <p className="muted">
        Open Food Facts is community-maintained. Check the package. Camera use
        is optional; no image is uploaded.
      </p>
      <button
        onClick={() => {
          stopCamera();
          onClose();
        }}
      >
        Back to search
      </button>
    </section>
  );
}
