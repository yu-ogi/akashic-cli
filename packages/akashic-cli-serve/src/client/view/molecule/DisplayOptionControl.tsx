import { observer } from "mobx-react";
import * as React from "react";
import { Popover } from "../atom/Popover";
import { ToolIconButton } from "../atom/ToolIconButton";
import * as styles from "./DisplayOptionControl.css";

export interface DisplayOptionControlPropsData {
	showsDisplayOptionPopover: boolean;
	fitsToScreen: boolean;
	showsBackgroundImage: boolean;
	showsBackgroundColor: boolean;
	showsGrid: boolean;
	showsProfiler: boolean;
	showsDesignGuideline: boolean;
	onClickDisplayOptionPopover: (show: boolean) => void;
	onChangeFitsToScreen: (fits: boolean) => void;
	onChangeShowBackgroundImage: (show: boolean) => void;
	onChangeShowBackgroundColor: (show: boolean) => void;
	onChangeShowGrid: (show: boolean) => void;
	onChangeShowProfiler: (show: boolean) => void;
	onChangeShowDesignGuideline: (show: boolean) => void;
}

export interface DisplayOptionControlProps {
	makeProps: () => DisplayOptionControlPropsData;
}

export const DisplayOptionControl = observer(function (props: DisplayOptionControlProps) {
	const {
		showsDisplayOptionPopover,
		fitsToScreen,
		showsBackgroundImage,
		showsBackgroundColor,
		showsGrid,
		showsProfiler,
		showsDesignGuideline,
		onClickDisplayOptionPopover,
		onChangeFitsToScreen,
		onChangeShowBackgroundImage,
		onChangeShowBackgroundColor,
		onChangeShowGrid,
		onChangeShowProfiler,
		onChangeShowDesignGuideline
	} = props.makeProps();
	const ref = React.useRef();

	return <div ref={ref} style={{position: "relative"}}>
		<ToolIconButton
			className="external-ref_button_display-option"
			icon="image"
			title={"表示オプション"}
			pushed={showsDisplayOptionPopover}
			onClick={onClickDisplayOptionPopover} />
		<Popover
			className={styles.popover}
			shows={showsDisplayOptionPopover}
			caption={"Display Options"}
			onChangeShows={onClickDisplayOptionPopover}
			outsideRef={ref}
		>
			<div className={styles.label}>
				<label>
					<input
						className={styles.checkbox + " external-ref_checkbox_fits-to-screen"}
						type="checkbox"
						checked={fitsToScreen ?? false}
						onChange={() => onChangeFitsToScreen(!fitsToScreen)}
					/>
					Fit to screen
				</label>
			</div>
			<div className={styles.label}>
				<label>
					<input
						className={styles.checkbox + " external-ref_checkbox_shows-background-image"}
						type="checkbox"
						checked={showsBackgroundImage ?? false}
						onChange={() => onChangeShowBackgroundImage(!showsBackgroundImage)}
					/>
					Show background image
				</label>
			</div>
			<div className={styles.label}>
				<label>
					<input
						className={styles.checkbox + " external-ref_checkbox_shows-background-color"}
						type="checkbox"
						checked={showsBackgroundColor ?? false}
						onChange={() => onChangeShowBackgroundColor(!showsBackgroundColor)}
					/>
					Show background color
				</label>
			</div>
			<div className={styles.label}>
				<label>
					<input
						className={styles.checkbox + " external-ref_checkbox_shows-grid"}
						type="checkbox"
						checked={showsGrid ?? false}
						onChange={() => onChangeShowGrid(!showsGrid)}
					/>
					Show grid
				</label>
			</div>
			<div className={styles.label}>
				<label>
					<input
						className={styles.checkbox + " external-ref_checkbox_shows-profiler"}
						type="checkbox"
						checked={showsProfiler ?? false}
						onChange={() => onChangeShowProfiler(!showsProfiler)}
					/>
					Show profiler
				</label>
			</div>
			<div className={styles.label}>
				<label>
					<span className={styles["design-guideline"]}>
						<input
							className={styles.checkbox + " external-ref_checkbox_shows-design-guideline"}
							type="checkbox"
							checked={showsDesignGuideline ?? false}
							onChange={() => onChangeShowDesignGuideline(!showsDesignGuideline)}
						/>
						Show Design Guidelines
						<a href="https://akashic-games.github.io/shin-ichiba/design-guidelines.html" target="_blank" rel="noreferrer">
							<i className={"material-icons " + styles["help-link-icon"]}>help</i>
						</a>
					</span>
				</label>
			</div>
		</Popover>
	</div>;
});
