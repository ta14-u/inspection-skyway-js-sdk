import { Event } from '@skyway-sdk/common';

import {
  AudioMediaTrackConstraints,
  DisplayMediaTrackConstraints,
  VideoMediaTrackConstraints,
} from '../../factory';
import { ContentType } from '..';
import { attachElement, detachElement } from '../share';
import { LocalStreamBase } from './base';

export abstract class LocalMediaStreamBase extends LocalStreamBase {
  /**@description [japanese] PublicationのDisable/EnableなどでStreamのtrackが更新された時に発火するイベント */
  onTrackUpdated = new Event<MediaStreamTrack>();
  private _element?: HTMLVideoElement | HTMLAudioElement;
  private _track: MediaStreamTrack;
  /**@internal */
  protected _oldTrack?: MediaStreamTrack;
  private _trackConstraints: MediaTrackConstraints = {};
  /**@internal */
  protected get trackConstraints() {
    return this._trackConstraints;
  }

  abstract isEnabled: boolean;
  /**@internal */
  _onEnableChanged = new Event<MediaStreamTrack | null>();
  /**@internal */
  protected _options: Partial<LocalMediaStreamOptions>;

  toJSON() {
    const base = super.toJSON();
    return {
      ...base,
      trackConstraints: this.trackConstraints,
      isEnabled: this.isEnabled,
      _options: this._options,
    };
  }

  constructor(
    track: MediaStreamTrack,
    contentType: ContentType,
    /**@internal */
    options: (
      | VideoMediaTrackConstraints
      | DisplayMediaTrackConstraints
      | AudioMediaTrackConstraints
    ) &
      Partial<LocalMediaStreamOptions> = {}
  ) {
    super(contentType);

    this._track = track;
    this._options = options;

    // iOS safari 15はgetConstraintsがバグってるのでここで入れておく
    this._trackConstraints = { ...options };
  }

  /**@internal */
  abstract setEnabled(b: boolean): Promise<void>;

  get track() {
    return this._track;
  }

  /**
   * @description [english] Attach the stream to the element.
   * @description [japanese] streamをelementに適用する.
   */
  attach(element: HTMLVideoElement | HTMLAudioElement) {
    this._element = element;
    attachElement(element, this._track);
  }

  /**
   * @description [english] Detach the stream from the element.
   * @description [japanese] elementからstreamを取り除く.
   */
  detach() {
    if (this._element) {
      detachElement(this._element, this._track);
      this._element = undefined;
    }
  }

  /**@internal */
  protected _disable(kind: 'video' | 'audio') {
    if (this._options.stopTrackWhenDisabled) {
      this._trackConstraints = {
        ...this.trackConstraints,
        ...this.track.getConstraints(),
      };
      this.track.stop();
    } else {
      this._oldTrack = this.track;
    }

    const track = kind === 'video' ? emptyVideoTrack : emptyAudioTrack;
    track.enabled = false;
    this._onEnableChanged.emit(track);
    this._updateTrack(track);
  }

  /**@internal */
  protected _updateTrack(track: MediaStreamTrack) {
    this._track = track;
    if (this._element) {
      this.attach(this._element);
    }
    this.onTrackUpdated.emit(track);
  }

  /**
   * @description [japanese] Streamを解放します。
   * カメラやマイクなどのデバイスを解放するためにはそのデバイスに関連するすべてのStreamを解放する必要があります
   */
  release() {
    this._track.stop();
  }
}

export type LocalMediaStreamOptions = {
  /**
   * @description [japanese]
   * このStreamのPublicationがDisableされた時にStreamのTrackをStopします。
   * Publicationが再度Enableされた時にデバイスを再取得します。
   * (trackプロパティの中身が更新されonTrackUpdatedイベントが発火します)
   * SkyWayStreamFactory経由でLocalMediaを作成する場合はデフォルトで有効。
   * mediaDevice以外から作ったStream（例えばCanvasをキャプチャするなど）であれば必ずFalseを入れてください。
   *  */
  stopTrackWhenDisabled: boolean;
  /**
   * @description [japanese]
   * このStreamがDisplayの映像や音声をキャプチャしたものであれば必ずTrueを入れてください。
   * デフォルトで無効。
   *  */
  isDisplayMedia: boolean;
};

const createEmptyTrack = new RTCPeerConnection();
/**@internal */
export const emptyAudioTrack =
  createEmptyTrack.addTransceiver('audio').receiver.track;
/**@internal */
export const emptyVideoTrack =
  createEmptyTrack.addTransceiver('video').receiver.track;
