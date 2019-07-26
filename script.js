$(document).ready(function() {
  run1();
});
async function run1() {
  await faceapi.loadSsdMobilenetv1Model("/models");
  await faceapi.loadFaceLandmarkModel("/models");
  await faceapi.loadFaceRecognitionModel("/models");

  // try to access users webcam and stream the images
  // to the video element
  const videoEl = document.getElementById("inputVideo");
  navigator.getUserMedia(
    { video: {} },
    stream => (videoEl.srcObject = stream),
    err => console.error(err)
  );
}

async function run2() {
  const mtcnnResults = await faceapi.ssdMobilenetv1(
    document.getElementById("inputVideo")
  );

  overlay.width = 500;
  overlay.height = 400;
  const detectionsForSize = mtcnnResults.map(det => det.forSize(500, 400));
  faceapi.draw.drawDetections(overlay, detectionsForSize, { withScore: true });

  const input = document.getElementById("inputVideo");
  const fullFaceDescriptions = await faceapi
    .detectAllFaces(input)
    .withFaceLandmarks()
    .withFaceDescriptors();

  const labels = ["Nguyen"];

  const labeledFaceDescriptors = await Promise.all(
    labels.map(async label => {
      // fetch image data from urls and convert blob to HTMLImage element
      const imgUrl = `http://localhost:8000/images/${label}.jpg`;
      const img = await faceapi.fetchImage(imgUrl);

      // detect the face with the highest score in the image and compute it's landmarks and face descriptor
      const fullFaceDescription = await faceapi
        .detectSingleFace(img)
        .withFaceLandmarks()
        .withFaceDescriptor();

      if (!fullFaceDescription) {
        throw new Error(`no faces detected for ${label}`);
      }

      const faceDescriptors = [fullFaceDescription.descriptor];
      console.log(label);
      return new faceapi.LabeledFaceDescriptors(label, faceDescriptors);
    })
  );

  // 0.6 is a good distance threshold value to judge
  // whether the descriptors match or not
  const maxDescriptorDistance = 0.6;
  const faceMatcher = new faceapi.FaceMatcher(
    labeledFaceDescriptors,
    maxDescriptorDistance
  );
  //console.log("face matcher"+faceMatcher)
  const results = fullFaceDescriptions.map(fd =>
    faceMatcher.findBestMatch(fd.descriptor)
  );

  const boxesWithText = results.map((bestMatch, i) => {
    const box = fullFaceDescriptions[i].detection.box;
    const text = bestMatch.toString();
    const boxWithText = new faceapi.BoxWithText(box, text);
    return boxWithText;
  });

  faceapi.drawDetection(overlay, boxesWithText);
}

async function onPlay(videoEl) {
  run2();
  setTimeout(() => onPlay(videoEl));
}
