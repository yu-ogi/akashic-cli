import {observable, action} from "mobx";
import * as queryString from "query-string";
import {Player} from "../../common/types/Player";
import {SandboxConfig} from "../../common/types/SandboxConfig";
import {ClientContentLocator} from "../common/ClientContentLocator";
import {PlayEntity} from "./PlayEntity";
import {PlayStore} from "./PlayStore";
import {LocalInstanceEntity} from "./LocalInstanceEntity";
import {DevtoolUiStore} from "./DevtoolUiStore";
import {ToolBarUiStore} from "./ToolBarUiStore";
import {NotificationUiStore} from "./NotificationUiStore";
import {storage} from "./storage";
import {StartupScreenUiStore} from "./StartupScreenUiStore";

export class Store {
	@observable playStore: PlayStore;
	@observable toolBarUiStore: ToolBarUiStore;
	@observable devtoolUiStore: DevtoolUiStore;
	@observable notificationUiStore: NotificationUiStore;
	@observable startupScreenUiStore: StartupScreenUiStore;
	@observable player: Player | null;
	@observable contentLocator: ClientContentLocator; // 多分storage辺りに置く方がよさそうだが一旦動かすこと優先でここに置いておく

	@observable currentPlay: PlayEntity | null;
	@observable currentLocalInstance: LocalInstanceEntity | null;

	@observable sandboxConfig: SandboxConfig;
	@observable argumentsTable: { [name: string]: string };

	constructor() {
		const query = queryString.parse(window.location.search);
		const queryId = query.id as string;
		this.contentLocator = new ClientContentLocator({ contentId: (queryId != null) ? queryId : "0" }); // TODO xnv bootstrapから渡す方が自然では？
		this.playStore = new PlayStore();
		this.toolBarUiStore = new ToolBarUiStore();
		this.devtoolUiStore = new DevtoolUiStore();
		this.notificationUiStore = new NotificationUiStore();
		this.startupScreenUiStore = new StartupScreenUiStore();
		this.player = { id: storage.data.playerId, name: storage.data.playerName };
		this.currentPlay = null;
		this.currentLocalInstance = null;
		this.sandboxConfig = null;
		this.argumentsTable = {};
	}

	@action
	setCurrentLocalInstance(instance: LocalInstanceEntity): void {
		this.currentLocalInstance = instance;
	}

	@action
	setCurrentPlay(play: PlayEntity): void {
		this.currentPlay = play;
	}

	@action
	setSandboxConfig(cfg: SandboxConfig): void {
		this.sandboxConfig = cfg;

		// mobx の reaction として書くべき？
		if (cfg.arguments) {
			const args = cfg.arguments;
			this.argumentsTable = Object.keys(args).reduce((acc, key) => {
				acc[key.replace(/^\</, "\\<")] = JSON.stringify(args[key], null, 2);
				return acc;
			}, {} as { [name: string]: string });
		}
	}
}
