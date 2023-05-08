import { Event, Logger } from '@skyway-sdk/common';

import {
  createError,
  createWarnPayload,
  DataStreamOptions,
  LocalDataStream,
  LocalMediaStreamOptions,
} from '..';
import { errors } from '../errors';
import { LocalAudioStream } from './stream/local/audio';
import { LocalVideoStream } from './stream/local/video';

const log = new Logger('packages/core/src/media/factory.ts');

export class StreamFactory {
  /**
   * @description [japanese] 一度参照した種類のデバイスの状態が変化した時に発火するイベント
   */
  readonly onDeviceChange = new Event<{
    device: MediaDevice;
    state: 'added' | 'removed';
  }>();

  private _devices: MediaDevice[] = [];

  /**@private */
  constructor() {
    if (!navigator?.mediaDevices) {
      throw createError({
        operationName: 'StreamFactory.constructor',
        info: errors.mediaDevicesNotFound,
        path: log.prefix,
      });
    }
    navigator.mediaDevices.addEventListener('devicechange', async () => {
      const devices = await this._enumerateDevicesArray();

      const removed: MediaDevice[] = [];
      this._devices.forEach((prev) => {
        if (!devices.map((d) => d.id).includes(prev.id)) {
          removed.push(prev);
        }
      });

      const added: MediaDevice[] = [];
      devices
        .map((d) => d.id)
        .forEach((next) => {
          if (!this._devices.map((d) => d.id).includes(next)) {
            added.push(devices.find((d) => d.id === next)!);
          }
        });

      log.debug('device changed', { added, removed });

      removed.forEach((device) => {
        this.onDeviceChange.emit({ state: 'removed', device });
      });
      added.forEach((device) => {
        this.onDeviceChange.emit({ state: 'added', device });
      });

      this._devices = devices;
    });
  }

  private async _enumerateDevicesArray() {
    const devices = await navigator.mediaDevices.enumerateDevices();
    return devices
      .map((d) => new MediaDevice(d))
      .filter((d) => d.id.length > 0);
  }

  private async _enumerateDevicesWithAuth(
    { video, audio }: { video?: boolean; audio?: boolean } = {
      audio: true,
      video: true,
    }
  ) {
    let tracks: MediaStreamTrack[] = [];
    if (video || audio) {
      const stream = await navigator.mediaDevices.getUserMedia({
        video,
        audio,
      });
      tracks = stream.getTracks();
    }

    this._devices = await this._enumerateDevicesArray();
    tracks.forEach((t) => t.stop());

    return this._devices;
  }

  /**
   * @description [japanese] デバイスの一覧を取得する
   */
  async enumerateDevices() {
    const devices = await this._enumerateDevicesWithAuth();
    return devices;
  }

  /**
   * @description [japanese] 映像入力デバイスの一覧を取得する
   */
  async enumerateInputVideoDevices() {
    const devices = await this._enumerateDevicesWithAuth({ video: true });
    return devices.filter((d) => d.kind === 'videoinput');
  }

  /**
   * @description [japanese] 音声入力デバイスの一覧を取得する
   */
  async enumerateInputAudioDevices() {
    const devices = await this._enumerateDevicesWithAuth({ audio: true });
    return devices.filter((d) => d.kind === 'audioinput');
  }

  /**
   * @description [japanese] 音声出力デバイスの一覧を取得する
   */
  async enumerateOutputAudioDevices() {
    const devices = await this._enumerateDevicesWithAuth({ audio: true });
    return devices.filter((d) => d.kind === 'audiooutput');
  }

  /**
   * @description [japanese] CameraのVideoStreamを作成する
   */
  async createCameraVideoStream(
    options: VideoMediaTrackConstraints & Partial<LocalMediaStreamOptions> = {}
  ) {
    options.stopTrackWhenDisabled = options.stopTrackWhenDisabled ?? true;

    const [track] = (
      await navigator.mediaDevices.getUserMedia({ video: options })
    ).getTracks();

    const stream = new LocalVideoStream(track, options);
    stream._setLabel('camera');
    return stream;
  }

  /**
   * @description [japanese] マイクのAudioStreamを作成する
   */
  async createMicrophoneAudioStream(
    options: AudioMediaTrackConstraints & Partial<LocalMediaStreamOptions> = {}
  ) {
    options.stopTrackWhenDisabled = options.stopTrackWhenDisabled ?? true;

    const [track] = (
      await navigator.mediaDevices.getUserMedia({ audio: options })
    ).getTracks();

    const stream = new LocalAudioStream(track, options);
    stream._setLabel('microphone');
    return stream;
  }

  /**
   * @description [japanese]
   * PCブラウザでのみ利用可能なAPI。
   * ディスプレイのVideoStreamとオプションとしてAudioStreamを作成する。
   * AudioStreamはWindowsのChromeでしか取得できない。
   */
  async createDisplayStreams(options: {
    audio?:
      | boolean
      | (AudioMediaTrackConstraints & Partial<LocalMediaStreamOptions>);
    /**default enable */
    video?: DisplayMediaTrackConstraints &
      VideoMediaTrackConstraints &
      Partial<LocalMediaStreamOptions>;
  }) {
    const videoOption = options.video ?? {};
    videoOption.stopTrackWhenDisabled =
      videoOption.stopTrackWhenDisabled ?? true;

    let audioOption = options.audio;
    if (audioOption) {
      audioOption = {};
      audioOption.stopTrackWhenDisabled =
        audioOption.stopTrackWhenDisabled ?? true;
    }

    options = { audio: audioOption, video: videoOption };

    const stream = await navigator.mediaDevices.getDisplayMedia(options);
    const [video] = stream.getVideoTracks();
    const [audio] = stream.getAudioTracks();

    if (options.audio && !audio) {
      log.warn(
        createWarnPayload({
          operationName: 'StreamFactory.createDisplayStreams',
          detail: 'This client does not support device audio capture',
        })
      );
    }

    const videoStream = new LocalVideoStream(video, {
      ...options.video,
      isDisplayMedia: true,
    });
    videoStream._setLabel('displayVideo');
    const audioStream = audio
      ? new LocalAudioStream(audio, {
          ...(typeof options.audio === 'boolean' ? {} : options.audio),
          isDisplayMedia: true,
        })
      : undefined;
    if (audioStream) {
      audioStream._setLabel('displayAudio');
    }

    return {
      video: videoStream,
      audio: audioStream,
    };
  }

  /**
   * @description [japanese] DataStreamを作成する
   */
  async createDataStream(options: DataStreamOptions = {}) {
    return new LocalDataStream(options);
  }

  /**
   * @description [japanese] CameraのVideoStreamとマイクのAudioStreamを作成する
   */
  async createMicrophoneAudioAndCameraStream({
    audio,
    video,
  }: {
    audio?: AudioMediaTrackConstraints & Partial<LocalMediaStreamOptions>;
    video?: VideoMediaTrackConstraints & Partial<LocalMediaStreamOptions>;
  } = {}) {
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: audio ?? true,
      video: video ?? true,
    });
    const [audioTrack] = stream.getAudioTracks();
    const [videoTrack] = stream.getVideoTracks();

    audio = audio ?? {};
    audio.stopTrackWhenDisabled = audio.stopTrackWhenDisabled ?? true;
    const audioStream = new LocalAudioStream(audioTrack, audio);
    audioStream._setLabel('microphone');

    video = video ?? {};
    video.stopTrackWhenDisabled = video.stopTrackWhenDisabled ?? true;
    const videoStream = new LocalVideoStream(videoTrack, video);
    videoStream._setLabel('camera');

    return {
      audio: audioStream,
      video: videoStream,
    };
  }
}

export const SkyWayStreamFactory = new StreamFactory();

/**@internal */
export class MediaDevice {
  id: string;
  label: string;
  kind: MediaDeviceKind;

  /**@private */
  constructor(info: MediaDeviceInfo) {
    this.id = info.deviceId;
    this.label = info.label;
    this.kind = info.kind;
  }
}

/**
 * @description [japanese] ブラウザによって対応しているパラメータが異なるので、必要に応じて確認してください
 */
export type VideoMediaTrackConstraints = {
  aspectRatio?: ConstrainDouble;
  facingMode?: ConstrainDOMString;
  frameRate?: ConstrainDouble;
  height?: ConstrainULong;
  width?: ConstrainULong;
  deviceId?: ConstrainDOMString;
};

/**
 * @description [japanese] ブラウザによって対応しているパラメータが異なるので、必要に応じて確認してください
 */
export type AudioMediaTrackConstraints = {
  autoGainControl?: ConstrainBoolean;
  channelCount?: ConstrainULong;
  echoCancellation?: ConstrainBoolean;
  latency?: ConstrainDouble;
  noiseSuppression?: ConstrainBoolean;
  sampleRate?: ConstrainULong;
  sampleSize?: ConstrainULong;
  suppressLocalAudioPlayback?: ConstrainBoolean;
  deviceId?: ConstrainDOMString;
  /**
   * @description [english] Non-standard. Check browser support before using.
   */
  volume?: number;
};

export type DisplayMediaTrackConstraints = VideoMediaTrackConstraints & {
  /** @description [japanese] 選択画面で最初に表示するキャプチャー対象の指定*/
  displaySurface?: 'monitor' | 'window' | 'browser';
  /**
   * @description [english]
   * 	As a setting, a value of true indicates capture of a logical display surface, whereas a value of false indicates a capture of a visible display surface. As a capability, this same value MUST be the lone value present, rendering this property immutable from the application viewpoint.
   * A logical display surface is the surface that an operating system makes available to an application for the purposes of rendering.
   * a visible display surface is the portion of a logical display surface that is rendered to a monitor
   * https://w3c.github.io/mediacapture-screen-share/#dfn-logicalsurface
   */
  // logicalSurface?: boolean;
  /** @description [japanese] マウスカーソルのキャプチャー方法の指定 */
  // cursor?: CursorNever | CursorAlways | CursorMotion;
};

/** @description [japanese] キャプチャーしたディスプレイからカーソルを含まない。 */
// export type CursorNever = 'never';
/** @description [japanese] キャプチャーしたディスプレイからカーソルを含む。 */
// export type CursorAlways = 'always';
/** @description [japanese] カーソル／ポインタが動かされたとき、画面内のカーソルを含む。カーソルは、ある期間カーソルの更なる動きがないときに削除される。 */
// export type CursorMotion = 'motion';
