import * as fs from "fs";
import * as fsx from "fs-extra";
import * as path from "path";
import * as cmn from "@akashic/akashic-cli-commons";
import * as browserify from "browserify";
import readdir = require("fs-readdir-recursive");
import * as gcu from "./GameConfigurationUtil";
import * as UglifyJS from "uglify-js";
import * as babel from "@babel/core";
import * as presetEnv from "@babel/preset-env";

export interface ConvertGameParameterObject {
	bundle?: boolean;
	babel?: boolean;
	minify?: boolean;
	strip?: boolean;
	source?: string;
	hashLength?: number;
	dest: string;
	omitEmptyJs?: boolean;
	/**
	 * コマンドの出力を受け取るロガー。
	 * 省略された場合、akashic-cli-commons の `new ConsoleLogger()` 。
	 */
	logger?: cmn.Logger;
	exportInfo?: cmn.ExportZipInfo;
	omitUnbundledJs?: boolean;
	targetService?: cmn.ServiceType;
}

export function _completeConvertGameParameterObject(param: ConvertGameParameterObject): void {
	param.bundle = !!param.bundle;
	param.babel = !!param.babel;
	param.minify = !!param.minify;
	param.strip = !!param.strip;
	param.source = param.source || process.cwd();
	param.hashLength = param.hashLength || 0;
	param.logger = param.logger || new cmn.ConsoleLogger();
	param.omitEmptyJs = !!param.omitEmptyJs;
	param.exportInfo = param.exportInfo;
	param.omitUnbundledJs = !!param.omitUnbundledJs;
	param.targetService = param.targetService || "none";
}

export interface BundleResult {
	bundle: string;
	filePaths: string[];
}

export function bundleScripts(entryPoint: string, basedir: string): Promise<BundleResult> {
	const b = browserify({
		entries: entryPoint,
		basedir,
		builtins: false,
		standalone: "aez_bundle_main"
	});
	b.external("g");
	const filePaths: string[] = [];
	b.on("dep", (row: any) => {
		filePaths.push(cmn.Util.makeUnixPath(path.relative(basedir, row.file)));
	});
	return new Promise<BundleResult>((resolve, reject) => {
		b.bundle((err: any, buf: Buffer) => {
			if (err)
				return reject(err);
			resolve({ bundle: buf.toString(), filePaths });
		});
	});
}

export function convertGame(param: ConvertGameParameterObject): Promise<void> {
	_completeConvertGameParameterObject(param);
	let gamejson: cmn.GameConfiguration;

	cmn.Util.mkdirpSync(path.dirname(path.resolve(param.dest)));
	return Promise.resolve()
		.then(() => cmn.ConfigurationFile.read(path.join(param.source, "game.json"), param.logger))
		.then((result: cmn.GameConfiguration) => {
			gamejson = result;
			// export-zip実行時のバージョンとオプションを追記
			if (param.exportInfo) {
				gamejson.exportZipInfo = {
					version: param.exportInfo.version,
					option: param.exportInfo.option
				};
			}
			// 全スクリプトがES5構文になっていることを確認する
			let errorMessages: string[] = [];
			gcu.extractScriptAssetFilePaths(gamejson).forEach(filePath => {
				const code = fs.readFileSync(path.resolve(param.source, filePath)).toString();
				if (!param.babel) {
					errorMessages = errorMessages.concat(
						cmn.LintUtil.validateEs5Code(code).map(info => `${filePath}(${info.line}:${info.column}): ${info.message}`)
					);
				}
			});
			if (errorMessages.length > 0) {
				param.logger.warn("Non-ES5 syntax found.\n" + errorMessages.join("\n"));
			}
			if (!param.bundle)
				return null;
			return bundleScripts(gamejson.main || gamejson.assets.mainScene.path, param.source);
		})
		.then(async (bundleResult) => {
			// NOTE: ディレクトリ下のファイルすべて取得するためとはいえ、ここで関数定義していいのか？(commons等で新たに関数定義すべきかもしれない)
			const listFiles = (dir: string): string[] => {
				let filePaths: string[] = [];
				fs.readdirSync(dir, { withFileTypes: true }).forEach(dirent => {
					const targetPath = `${dir}/${dirent.name}`;
					if (dirent.isFile()) {
						filePaths.push(targetPath);
					} else {
						filePaths = filePaths.concat(listFiles(targetPath));
					}
				});
				return filePaths;
			};
			let files: string[];
			if (param.strip) {
				files = gcu.extractFilePaths(gamejson, param.source);
				files.push("game.json"); // game.jsonは必須だがgame.json中にこのファイルの記述は無いのでべた書きで指定する必要がある
			} else {
				files = listFiles(param.source).map(p => p.replace(`${param.source}/`, ""));
			}
			const preservingFilePathSet = new Set<string>(files);
			if (bundleResult) {
				let excludedFilePaths = bundleResult.filePaths;
				if (param.omitUnbundledJs) {
					excludedFilePaths = excludedFilePaths.concat(files.filter(p =>
						gcu.isScriptJsFile(p) || (gamejson.globalScripts || []).indexOf(p) !== -1
					));
				}
				excludedFilePaths.forEach(p => preservingFilePathSet.delete(p));
			}

			// operation plugin に登録されているスクリプトファイルは bundle されていても残しておく必要がある
			const operationPluginScripts = (gamejson.operationPlugins ?? []).map(plugin => plugin.script.replace(/^\.\//g, ""));
			for (let script of operationPluginScripts) {
				const scriptPath = path.join(param.source, script);
				// NOTE: Promiseのコールバックの中でasync/awaitというよく分からないことをしてしまっている
				const operationFiles = await cmn.NodeModules.listScriptFiles(
					path.dirname(scriptPath),
					"./" + path.basename(scriptPath),
					param.logger,
					true
				);
				operationFiles.forEach(file => {
					const realPath = path.join(path.dirname(scriptPath), file).replace(`${param.source}/`, "");
					if (files.indexOf(realPath) !== -1) {
						preservingFilePathSet.add(realPath);
					}
				});
			}

			const babelOption = {
				presets: [
					babel.createConfigItem([presetEnv, {
						modules: false,
						targets: {
							"ie": 10
						}
					}],
					{ type: "preset" })
				]
			};
			const noPreservingFilePaths: string[] = [];

			files.forEach(p => {
				if (preservingFilePathSet.has(p)) {
					let buff = fs.readFileSync(path.resolve(param.source, p));
					if (param.omitEmptyJs && gcu.isScriptJsFile(p) && gcu.isEmptyScriptJs(buff.toString().trim())) {
						Object.keys(gamejson.assets).some((key) => {
							if (gamejson.assets[key].type === "script" && gamejson.assets[key].path === p) {
								gamejson.assets[key].global = false;
								return true;
							}
							return false;
						});
					}
					cmn.Util.mkdirpSync(path.dirname(path.resolve(param.dest, p)));
					const value: string | Buffer =
						(param.babel && gcu.isScriptJsFile(p)) ? babel.transform(buff.toString().trim(), babelOption).code : buff;
					fs.writeFileSync(path.resolve(param.dest, p), value);
				} else {
					noPreservingFilePaths.push(p);
				}
			});
			gcu.removeScriptFromFilePaths(gamejson, noPreservingFilePaths);

			if (param.targetService === "nicolive") {
				addUntaintedToImageAssets(gamejson);
			}

			if (bundleResult === null) {
				return;
			}
			let entryPointPath: string;
			if (!!gamejson.main) {
				entryPointPath = gcu.addScriptAsset(gamejson, "aez_bundle_main");
				gamejson.main = "./" + entryPointPath;
			} else {
				entryPointPath = gcu.makeUniqueAssetPath(gamejson, "script/mainScene.js");
				gamejson.assets["mainScene"] = {
					type: "script",
					global: true,
					path: entryPointPath
				};
			}
			const entryPointAbsPath = path.resolve(param.dest, entryPointPath);
			cmn.Util.mkdirpSync(path.dirname(entryPointAbsPath));
			const code = param.babel ? babel.transform(bundleResult.bundle, babelOption).code : bundleResult.bundle;
			fs.writeFileSync(entryPointAbsPath, code);
		})
		.then(() => {
			if (param.hashLength > 0) {
				const hashLength = Math.ceil(param.hashLength);
				try {
					cmn.Renamer.renameAssetFilenames(gamejson, param.dest, hashLength);
				} catch (error) {
					// ファイル名のハッシュ化に失敗した場合、throwして作業中のコピー先ファイルを削除する
					fsx.removeSync(path.resolve(param.dest));
					if (error.message === cmn.Renamer.ERROR_FILENAME_CONFLICT) {
						throw new Error("Hashed filename conflict. Use larger hash-filename param on command line.");
					}
					throw error;
				}
			}
			return cmn.ConfigurationFile.write(gamejson, path.resolve(param.dest, "game.json"), param.logger);
		})
		.then(() => {
			if (!param.minify)
				return;
			const scriptAssetPaths = gcu.extractScriptAssetFilePaths(gamejson).map(p => path.resolve(param.dest, p));
			scriptAssetPaths.forEach(p => {
				const code = fs.readFileSync(p).toString();
				fs.writeFileSync(p, UglifyJS.minify(code).code);
			});
		});
}


/**
 * 指定のgameJson中の全てのImageAssetに untainted:true を付与する
 */
function addUntaintedToImageAssets(gameJson: cmn.GameConfiguration): void {
	Object.keys(gameJson.assets).forEach(key => {
		if (gameJson.assets[key].type === "image") {
			if (!gameJson.assets[key].hint) {
				gameJson.assets[key].hint = {};
			}
			gameJson.assets[key].hint.untainted = true;
		}
	});
}
