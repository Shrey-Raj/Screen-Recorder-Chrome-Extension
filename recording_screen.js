const fetchBlob = async (url) => {
    const response = await fetch(url);
    const blob = await response.blob();
    const base64 = await convertBlobToBase64(blob);
  
    return base64;
  };
  
  const convertBlobToBase64 = (blob) => {
    return new Promise(resolve => {
      const reader = new FileReader();
      reader.readAsDataURL(blob);
      reader.onloadend = () => {
        const base64data = reader.result;
  
        resolve(base64data);
      };
    });
  };
  
  chrome.runtime.onMessage.addListener((message) => {
    if (message.name !== 'startRecordingOnBackground') {
      return;
    }
  
    // Prompt user to choose screen or window
    chrome.desktopCapture.chooseDesktopMedia(
      ['screen', 'window'],
      function (streamId) {
        if (streamId == null) {
          return;
        }
  
        // Once user has chosen screen or window, create a stream from it and start recording
        navigator.mediaDevices.getUserMedia({
          audio: false,
          video: {
            mandatory: {
              chromeMediaSource: 'desktop',
              chromeMediaSourceId: streamId,
              minWidth: 1280,
              minHeight: 720,
              minFrameRate: 30,
              maxFrameRate: 60,
            },
            mediaSource : 'screen',
          }
        }).then(stream => {
          const mediaRecorder = new MediaRecorder(stream);
  
          const chunks = [];
  
          mediaRecorder.ondataavailable = function(e) {
            chunks.push(e.data);
          };
  
          mediaRecorder.onstop = async function(e) {
            const blobFile = new Blob(chunks, { type: "video/mp4" });
            const base64 = await fetchBlob(URL.createObjectURL(blobFile));
  
            // Save the recording as a file
            const downloadAnchor = document.createElement('a');
            downloadAnchor.href = base64;
            const timestamp = new Date().toISOString().replace(/[-:.]/g, '');
            downloadAnchor.download = `Screen_recording_${timestamp}.mp4`;
            downloadAnchor.click();
  
            // Stop all tracks of stream
            stream.getTracks().forEach(track => track.stop());
          }
  
          mediaRecorder.start();
        }).finally(async () => {
          // After all setup, focus on previous tab (where the recording was requested)
          await chrome.tabs.update(message.body.currentTab.id, { active: true, selected: true })
        });
      })
  });