/**
 * --target-serviceの引数として使用される
 * nicolive: ニコ生互換の環境として起動する
 * atsumaru: RPGアツマール互換の環境として起動する
 * none: 通常起動(--target-serviceオプションなしの状態)
 */

export enum ServiceType {
	NicoLive = "nicolive",
	Atsumaru = "atsumaru",
	None = "none"
}
