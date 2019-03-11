$(function() {
  $('#btn_start_recording').on('click', function(){
    startRecording();
  });

  $('#btn_stop_recording').on('click', function(){
    endRecording();
  })
})
 // ///////////////////////////////////////////
 // �^���֌W
 // ///////////////////////////////////////////

 // �ϐ���`
 let localMediaStream = null;
 let localScriptProcessor = null;
 let audioSampleRate = null;
 let audioContext = null;
 let bufferSize = 1024;
 let audioData = []; // �^���f�[�^
 let recordingFlg = false;

 // �^���o�b�t�@�쐬�i�^���������ŌJ��Ԃ��Ăяo�����j
 function onAudioProcess(e) {
     if (!recordingFlg) return;
     console.log('onAudioProcess');

     // �����̃o�b�t�@���쐬
     let input = e.inputBuffer.getChannelData(0);
     let bufferData = new Float32Array(bufferSize);
     for (let i = 0; i < bufferSize; i++) {
         bufferData[i] = input[i];
     }
     audioData.push(bufferData);
 }

 // ��͊J�n
 function startRecording(evt_stream) {
     // ��ʃA�N�Z�X���Ƀ}�C�N���擾
     console.log('startRecording');
     recordingFlg = true;

     // �擾����Ă��鉹���X�g���[���̘^�����J�n
     localMediaStream = evt_stream;

     if (!navigator || !navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
       alert('Missing support for navigator.mediaDevices.getUserMedia') // temp: helps when testing for strange issues on ios/safari
       return
     }

     audioContext = new (window.AudioContext || window.webkitAudioContext)();
     // �T���v�����[�g��ێ����Ă���
     audioSampleRate = audioContext.sampleRate;

     let scriptProcessor = audioContext.createScriptProcessor(bufferSize, 1, 1);
     localScriptProcessor = scriptProcessor;

     if (audioContext.createMediaStreamDestination) {
       destinationNode = audioContext.createMediaStreamDestination()
     }
     else {
       destinationNode = audioContext.destination
     }

     // safari�� Web Audio API�𓮂������߁A���audioContext�𐶐����AUserMedia�𐶐�����
     return navigator.mediaDevices.getUserMedia({audio: true})
       .then((stream) => {
         this._startRecordingWithStream(stream, destinationNode, scriptProcessor)
       })
       .catch((error) => {
         alert('Error with getUserMedia: ' + error.message) // temp: helps when testing for strange issues on ios/safari
         console.log(error)
       })
   }

   function _startRecordingWithStream(stream, destinationNode, scriptProcessor) {
     // ���[�v�����̃Z�b�g
     let mediastreamsource = audioContext.createMediaStreamSource(stream);
     mediastreamsource.connect(scriptProcessor);
     scriptProcessor.onaudioprocess = onAudioProcess;
     console.log('startRecording scriptProcessor.connect(audioContext.destination)');
     scriptProcessor.connect(destinationNode);
   }

 // ��͏I��
 function endRecording() {
     console.log('endRecording');
     recordingFlg = false;
     // console.log('audioData');
     // console.log(audioData);

     // console.log('blob = exportWAV(audioData)');
     // �^���ł����̂Ř^���f�[�^��wav�ɂ���input�ɔz�u���Đ��{�^���ɓo�^
     let blob = exportWAV(audioData);
     // �f�[�^���M�p��input�^�O���擾
     let wave_tag = document.getElementById('demo_speaking_wave_file');

     // base64���H
     let reader = new FileReader();
     reader.readAsDataURL(blob);
     reader.onloadend = function() {
         base64data = reader.result;
         // console.log('base64data');
         // console.log(base64data);
        wave_tag.value = base64data;
     };

     let myURL = window.URL || window.webkitURL;
     let url = myURL.createObjectURL(blob);

     // console.log('wavefile');
     // console.log(url);

     // audio�^�O�ɘ^���f�[�^���Z�b�g
     let player = document.getElementById('player');
     player.src =  url;
     player.load();

     // audioData���N���A
     localMediaStream = null;
     localScriptProcessor = null;
     audioContext.close()
     audioContext = null;
     audioData = []; // �^���f�[�^
 }

 // ///////////////////////////////////////////
 // wave�t�@�C���쐬����
 // ///////////////////////////////////////////

 function exportWAV(audioData) {

     let encodeWAV = function(samples, sampleRate) {
         let buffer = new ArrayBuffer(44 + samples.length * 2);
         let view = new DataView(buffer);

         let writeString = function(view, offset, string) {
             for (let i = 0; i < string.length; i++){
                 view.setUint8(offset + i, string.charCodeAt(i));
             }
         };

         let floatTo16BitPCM = function(output, offset, input) {
             for (let i = 0; i < input.length; i++, offset += 2){
                 let s = Math.max(-1, Math.min(1, input[i]));
                 output.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
             }
         };

         writeString(view, 0, 'RIFF');  // RIFF�w�b�_
         view.setUint32(4, 32 + samples.length * 2, true); // ����ȍ~�̃t�@�C���T�C�Y
         writeString(view, 8, 'WAVE'); // WAVE�w�b�_
         writeString(view, 12, 'fmt '); // fmt�`�����N
         view.setUint32(16, 16, true); // fmt�`�����N�̃o�C�g��
         view.setUint16(20, 1, true); // �t�H�[�}�b�gID
         view.setUint16(22, 1, true); // �`�����l����
         view.setUint32(24, sampleRate, true); // �T���v�����O���[�g
         view.setUint32(28, sampleRate * 2, true); // �f�[�^���x
         view.setUint16(32, 2, true); // �u���b�N�T�C�Y
         view.setUint16(34, 16, true); // �T���v��������̃r�b�g��
         writeString(view, 36, 'data'); // data�`�����N
         view.setUint32(40, samples.length * 2, true); // �g�`�f�[�^�̃o�C�g��
         floatTo16BitPCM(view, 44, samples); // �g�`�f�[�^

         return view;
     };

     let mergeBuffers = function(audioData) {
         let sampleLength = 0;
         for (let i = 0; i < audioData.length; i++) {
             sampleLength += audioData[i].length;
         }
         let samples = new Float32Array(sampleLength);
         let sampleIdx = 0;
         for (let i = 0; i < audioData.length; i++) {
             for (let j = 0; j < audioData[i].length; j++) {
                 samples[sampleIdx] = audioData[i][j];
                 sampleIdx++;
             }
         }
         return samples;
     };

     let dataview = encodeWAV(mergeBuffers(audioData), audioSampleRate);
     let audioBlob = new Blob([dataview], { type: 'audio/wav' });

     return audioBlob;

     // let myURL = window.URL || window.webkitURL;
     // let url = myURL.createObjectURL(audioBlob);
     // return url;
 }

 function audioPlay() {
     let play_button = document.getElementById("btn_play_pause");
     play_button.onclick = new Function("audioPause();");
     play_button.innerText = "��~";
     document.getElementById("player").play();
 }

 function audioPause() {
     let play_button = document.getElementById("btn_play_pause");
     play_button.onclick = new Function("audioPlay();");
     play_button.innerText = "�Đ�";
     document.getElementById("player").pause();
 }