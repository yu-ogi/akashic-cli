import * as React from "react";
import { observer } from "mobx-react";
import { ToolLabelButton } from "../atom/ToolLabelButton";

export interface MiscDevtoolProps {
	showProfiler: boolean;
	downloadPlaylog: () => void;
	setShowProfiler: (show: boolean) => void;
}

@observer
// 現状のUIでカテゴリ分けが難しいものを暫定的に置くためのタグ
export class MiscDevtool extends React.Component<MiscDevtoolProps, {}> {
	render(): React.ReactNode {
		return <div>
			<ToolLabelButton
				className="external-ref_button_download-playlog"
				title="今までのリプレイ情報を保存"
				onClick={this.props.downloadPlaylog}
			>
				今までのリプレイ情報を保存
			</ToolLabelButton>
			<div>
				<input
					className="external-ref_checkbox_show-profiler"
					type="checkbox"
					checked={this.props.showProfiler}
					onChange={this._onShowProfilerCheckboxChange} />
				セッションパラメータを送る(要新規プレイ)
			</div>
		</div>;
	}

	private _onShowProfilerCheckboxChange = (): void => {
		this.props.setShowProfiler(!this.props.showProfiler);
	}
}
