/**
 * Maps getUserMedia failures to friendly, recoverable copy. The camera stage
 * renders these inline (never a modal) with a Retry action — the instrument
 * reports its own status instead of looking broken.
 */
export interface CameraErrorCopy {
  title: string;
  body: string;
}

export function cameraErrorCopy(err: unknown): CameraErrorCopy {
  const name = err instanceof DOMException ? err.name : '';
  switch (name) {
    case 'NotAllowedError':
    case 'PermissionDeniedError':
      return {
        title: 'Camera access was blocked',
        body: "Click the camera icon in your browser's address bar to allow access, then try again. Nothing is recorded or uploaded.",
      };
    case 'NotFoundError':
    case 'DevicesNotFoundError':
      return {
        title: 'No camera found',
        body: 'Connect a webcam or switch to a device with a camera. You can still type in the transcript and browse your phrasebook.',
      };
    case 'NotReadableError':
    case 'TrackStartError':
      return {
        title: 'Your camera is in use by another app',
        body: 'Close other apps that may be using the camera (Zoom, Teams…) and press Retry.',
      };
    default:
      return {
        title: "Couldn't start the camera",
        body: 'Press Retry, or reload the page if it keeps happening.',
      };
  }
}
